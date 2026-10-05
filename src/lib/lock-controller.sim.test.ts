/// <reference types="node" />

/**
 * A multi-day randomized simulation of the whole lock: the app's entry points (launch and
 * foreground, the wake screen, exits, Block now, the Routine and Apps tabs, the paywall)
 * against a simulated iPhone (sim-device.ts), which keeps iOS's one blocklist, fires the
 * monitored windows on the clock, and runs a port of the monitor extension with the app
 * closed. Every run comes from a seed, so a failure replays exactly.
 *
 * What's shielded is read from the simulated device, never from the controller's answers,
 * and checked against an oracle built from the product rules (GAME_PLAN, BUG_SWEEP
 * 2026-10-03) and the facts the harness itself caused (purchases, proofs, edits, naps).
 * The oracle uses lock-state.ts's pure rules for "which phase is it", which the sweep test
 * checks against a reference of its own.
 *
 * On a failure the run is shrunk to the fewest actions that still fail the same check, and
 * the message carries the seed and that list. Replay one seed with LOCK_SIM_SEED=<n>; run a
 * heavier sweep with LOCK_SIM_SEEDS=<count> (and LOCK_SIM_DAYS=<max days>).
 *
 * Needs `--experimental-test-module-mocks` (set in the npm test script).
 */
import assert from 'node:assert/strict';
import { mock, test } from 'node:test';

import { dayKey, hash01, prng, simDevice, token, type Callback } from './sim-device.ts';

const device = simDevice();
mock.module('react-native-device-activity', { namedExports: device.exports });

const st = await import('./screen-time.ts');
const lc = await import('./lock-controller.ts');
const ls = await import('./lock-state.ts');
const rt = await import('./routine.ts');
const em = await import('./emergency.ts');
const ps = await import('./passes.ts');
const { armTonight } = await import('./arm.ts');
const dl = await import('./daily-limits.ts');

type Routine = import('./routine.ts').Routine;
type LimitId = import('./daily-limits.ts').LimitId;

const MIN = 60_000;
const DAY = 24 * 60 * MIN;
const BASE_TZ = process.env.TZ;
/** Back to the zone the suite runs in (`npm run test:tz` sets one; plain `npm test` may not). */
function restoreZone() {
  if (BASE_TZ === undefined) delete process.env.TZ;
  else process.env.TZ = BASE_TZ;
}

/* ---------- Scenarios ---------- */

const NIGHT_POOL = ['tiktok', 'insta', 'yt', 'x', 'snap'];
const ALWAYS_POOL = ['reddit', 'x', 'news'];
const BLOCK_POOL = ['games', 'tiktok', 'mail'];
const LIMIT_POOL = ['fb', 'yt', 'reddit', 'netflix'];
const UNIVERSE = [...new Set([...NIGHT_POOL, ...ALWAYS_POOL, ...BLOCK_POOL, ...LIMIT_POOL])];
const ZONES = ['UTC', 'America/New_York', 'Europe/London', 'Pacific/Chatham', 'America/Santiago', 'Asia/Tokyo', 'America/Los_Angeles'];

const BEDTIMES = [21 * 60, 22 * 60 + 30, 23 * 60, 23 * 60 + 30, 0, 30, 60, 90, 150];
const MORNINGS = [180, 330, 360, 420, 450, 480, 540];
const nightLength = (b: number, m: number) => (((m - b) % 1440) + 1440) % 1440;
const TIME_PAIRS = BEDTIMES.flatMap((b) => MORNINGS.map((m) => [b, m] as const)).filter(
  ([b, m]) => nightLength(b, m) >= 30 && nightLength(b, m) <= 12 * 60,
);

type Action =
  | { kind: 'open' }
  | { kind: 'proof'; method: 'downstairs' | 'steps' | 'scan' }
  | { kind: 'emergency' }
  | { kind: 'pass' }
  | { kind: 'nap'; list: 'night' | 'block'; minutes: number }
  | { kind: 'wakeNap' }
  | { kind: 'routine'; patch: Partial<Routine> }
  | { kind: 'list'; list: 'night' | 'always'; apps: string[] }
  | { kind: 'limitAdd'; apps: string[] }
  | { kind: 'limitMinutes'; slot: number; minutes: number | null }
  | { kind: 'use'; slot: number; minutes: number }
  | { kind: 'lapse' }
  | { kind: 'renew' }
  | { kind: 'buy' }
  | { kind: 'travel'; zone: string };

type Timed = Action & { at: number };

type Scenario = {
  seed: number;
  /** Run in this zone instead of the suite's (a hand-written reproduction). */
  zone?: string;
  start: number;
  end: number;
  routine: Routine;
  night: string[];
  always: string[];
  block: string[];
  buys: boolean;
  startsOnRegister: boolean;
  dropRate: number;
  dst: boolean;
  actions: Timed[];
};

/** Every instant in `year` (local time) where the UTC offset changes. */
function dstChanges(year: number): number[] {
  const out: number[] = [];
  let prev = new Date(year, 0, 1).getTimezoneOffset();
  for (let t = new Date(year, 0, 1).getTime(); t < new Date(year + 1, 0, 1).getTime(); t += 60 * MIN) {
    const off = new Date(t).getTimezoneOffset();
    if (off !== prev) out.push(t);
    prev = off;
  }
  return out;
}
const DST_2026 = dstChanges(2026);

function randomRoutine(r: ReturnType<typeof prng>): Routine {
  const [bedtime, morningStart] = r.pick(TIME_PAIRS);
  return {
    bedtime,
    morningStart,
    activeNights: r.chance(0.5) ? [0, 1, 2, 3, 4, 5, 6] : r.subset([0, 1, 2, 3, 4, 5, 6], 1).sort(),
    method: r.pick(['downstairs', 'steps', 'scan'] as const),
    stepGoal: r.pick([100, 200, 300]),
  };
}

function scenario(seed: number, maxDays: number): Scenario {
  const r = prng(seed);
  const dst = DST_2026.length > 0 && r.chance(0.35);
  const anchor = dst ? r.pick(DST_2026) - r.int(1, 5) * DAY : new Date(2026, 0, 5).getTime() + r.int(0, 340) * DAY;
  const day0 = new Date(anchor);
  const midnight = (d: number) => new Date(day0.getFullYear(), day0.getMonth(), day0.getDate() + d).getTime();
  const days = r.int(7, maxDays);
  const start = midnight(0) + r.int(8 * 60, 23 * 60) * MIN;
  const end = midnight(days + 1);
  const routine = randomRoutine(r);
  const actions: Timed[] = [];
  const add = (at: number, action: Action) => {
    if (at > start && at < end) actions.push({ ...action, at });
  };
  let { bedtime, morningStart } = routine;

  for (let d = 0; d <= days; d++) {
    const base = midnight(d);
    const minute = (m: number) => base + m * MIN + r.int(0, 59) * 1000;
    for (let i = r.int(0, 3); i > 0; i--) add(minute(r.int(0, 1439)), { kind: 'open' });
    if (r.chance(0.85)) add(minute(morningStart + r.int(-30, 180)), { kind: 'proof', method: r.pick(['downstairs', 'steps', 'scan'] as const) });
    if (r.chance(0.1)) add(minute(bedtime + r.int(5, 120)), { kind: 'proof', method: 'steps' });
    if (r.chance(0.3)) add(minute(bedtime + r.int(-20, 60)), { kind: 'open' });
    if (r.chance(0.08)) add(minute(r.int(0, 1439)), { kind: 'emergency' });
    if (r.chance(0.06)) add(minute(bedtime + r.int(10, 200)), { kind: 'emergency' });
    if (r.chance(0.1)) add(minute(morningStart + r.int(0, 150)), { kind: 'pass' });
    if (r.chance(0.2)) add(minute(r.int(0, 1439)), { kind: 'nap', list: r.pick(['night', 'block'] as const), minutes: r.pick([15, 30, 60, 120, 240]) });
    if (r.chance(0.05)) add(minute(r.int(0, 1439)), { kind: 'wakeNap' });
    if (r.chance(0.25)) {
      const which = r.int(0, 4);
      let patch: Partial<Routine>;
      if (which <= 1) {
        const [b, m] = r.pick(TIME_PAIRS);
        patch = { bedtime: b, morningStart: m };
        bedtime = b;
        morningStart = m;
      } else if (which === 2) patch = { activeNights: r.subset([0, 1, 2, 3, 4, 5, 6], 1).sort() };
      else if (which === 3) patch = { method: r.pick(['downstairs', 'steps', 'scan'] as const) };
      else patch = { stepGoal: r.pick([100, 200, 300, 500]) };
      add(minute(r.chance(0.5) ? bedtime + r.int(-90, 240) : r.int(0, 1439)), { kind: 'routine', patch });
    }
    if (r.chance(0.12)) add(minute(r.int(0, 1439)), { kind: 'list', list: 'night', apps: r.subset(NIGHT_POOL, 1) });
    if (r.chance(0.1)) add(minute(r.int(0, 1439)), { kind: 'list', list: 'always', apps: r.subset(ALWAYS_POOL) });
    if (r.chance(0.15)) add(minute(r.int(0, 1439)), { kind: 'limitAdd', apps: r.subset(LIMIT_POOL, 1).slice(0, 2) });
    if (r.chance(0.15)) add(minute(r.int(0, 1439)), { kind: 'limitMinutes', slot: r.int(0, 2), minutes: r.chance(0.2) ? null : r.pick(dl.LIMIT_CHOICES) });
    for (let i = r.int(0, 4); i > 0; i--) add(minute(r.int(0, 1439)), { kind: 'use', slot: r.int(0, 2), minutes: r.int(5, 45) });
  }
  const buys = !r.chance(0.2);
  if (!buys && r.chance(0.6)) add(start + r.int(1, days) * DAY - r.int(0, 600) * MIN, { kind: 'buy' });
  if (buys && r.chance(0.35)) {
    const lapse = start + r.int(60, (days - 1) * 1440) * MIN;
    add(lapse, { kind: 'lapse' });
    if (r.chance(0.5)) {
      const back = lapse + r.int(60, 3 * 1440) * MIN;
      add(back, r.chance(0.5) ? { kind: 'renew' } : { kind: 'buy' });
    }
  }
  if (r.chance(0.2)) add(start + r.int(60, days * 1440) * MIN, { kind: 'travel', zone: r.pick(ZONES) });
  actions.sort((a, b) => a.at - b.at);

  return {
    seed,
    start,
    end,
    routine,
    night: r.subset(NIGHT_POOL, 1),
    always: r.subset(ALWAYS_POOL),
    block: r.subset(BLOCK_POOL, 1),
    buys,
    startsOnRegister: r.chance(0.7),
    dropRate: r.chance(0.3) ? 0.15 : 0,
    dst,
    actions,
  };
}

/* ---------- The oracle ---------- */

class SimFailure extends Error {
  readonly check: string;
  readonly at: number;
  constructor(check: string, at: number, detail: string) {
    super(`[${check}] at ${new Date(at).toString()}: ${detail}`);
    this.check = check;
    this.at = at;
  }
}

type Proof = { key: string; kind: string; at: number };
type LimitSpec = { strict: number; loosen?: { minutes: number | null; from: number } };
type ListName = 'always' | 'night' | 'block' | LimitId;
const LISTS: ListName[] = ['always', 'night', 'block', 'limit-0', 'limit-1', 'limit-2'];

const coverage: Record<string, number> = {};
const count = (what: string) => (coverage[what] = (coverage[what] ?? 0) + 1);

async function flush() {
  for (let i = 0; i < 4; i++) await new Promise((resolve) => setImmediate(resolve));
}

/** Runs one scenario (or a subset of its actions) and returns the first failed check, or null. */
async function run(sc: Scenario, actions: Timed[] = sc.actions): Promise<SimFailure | null> {
  device.reset();
  device.state.startsOnRegister = sc.startsOnRegister;
  if (sc.zone) process.env.TZ = sc.zone;
  else restoreZone();
  let t = sc.start;
  mock.timers.setTime(t);

  /* What the harness knows happened, and what the rules make of it. */
  const spec = {
    paid: sc.buys,
    everPaid: false,
    stoodDown: false,
    armedSince: null as number | null,
    lapse: null as { underWayKey: string | null } | null,
    routines: [] as { routine: Routine; from: number }[],
    proofs: [] as Proof[],
    passes: [] as string[],
    pausedKey: null as string | null,
    /** When the emergency pause ends: the next bedtime as it stood at the unlock. */
    pausedUntil: null as number | null,
    /** A flight since the last app action: the calendar day may have gone backwards. */
    travelled: false,
    /** Any flight this run: a calendar day can come round twice, so "used up today" is ambiguous. */
    flown: false,
    nap: null as { list: 'night' | 'block'; end: number } | null,
    /** The lock period (morning key, routine in force) a window or a sync has shielded. */
    established: null as string | null,
    limits: new Map<LimitId, LimitSpec>(),
    removals: [] as { list: 'night' | 'always'; apps: string[]; from: number }[],
    allowedFlag: Object.fromEntries(LISTS.map((l) => [l, false])) as Record<ListName, boolean>,
  };

  /** The routine in force: the last edit whose bedtime has passed. Edits wait for its next bedtime. */
  const inForceAt = (at: number) => {
    let current = spec.routines[0]?.routine ?? rt.DEFAULT_ROUTINE;
    for (const r of spec.routines) if (r.from <= at) current = r.routine;
    return current;
  };
  /**
   * The routine the lock runs on: the one in force, except inside a waiting edit's own first
   * night, which starts early for an earlier bedtime (armed at once, it only tightens:
   * arming.ts). From that night's start the edit governs (`routineAt` in lock-controller.ts).
   * Only where iOS can hold it early: the routine in force has that evening on (the extension
   * skips the early windows of an evening it has off, so arming waits). Once a lapse was
   * noticed, only if that night was the one under way then: only it finishes.
   */
  const routineAt = (at: number) => {
    const next = spec.routines.find((r) => r.from > at);
    if (next) {
      const { latest } = ls.nightsAround(new Date(at), rt.toLockSettings(next.routine));
      const inside = at >= latest.start.getTime() && at < latest.end.getTime() && latest.end.getTime() > next.from;
      const evening = new Date(latest.end.getFullYear(), latest.end.getMonth(), latest.end.getDate() - 1).getDay();
      const held = inForceAt(at).activeNights.includes(evening);
      if (inside && held && (!spec.lapse || spec.lapse.underWayKey === ls.dateKey(latest.end))) return next.routine;
    }
    return inForceAt(at);
  };
  const routineFrom = (at: number) => {
    let from = -Infinity;
    for (const r of spec.routines) if (r.from <= at) from = r.from;
    return from;
  };
  /**
   * The lock period: a routine taking over re-reads the morning, so it starts a new one. So
   * does a waiting edit's early first night, and an edit that replaces that edit (its night
   * may start at another time, and the apps wake in between).
   */
  const period = (at: number) => {
    const r = routineAt(at);
    const early = r === inForceAt(at) ? '' : `|early ${r.bedtime}-${r.morningStart}`;
    return `${phaseAt(at).morningKey}|${routineFrom(at)}${early}`;
  };
  /** Inside the emergency pause, by its end time or by its morning (they differ only after a flight). */
  const pausedAbs = (at: number) => spec.pausedUntil !== null && at < spec.pausedUntil;
  const latestRoutine = () => spec.routines[spec.routines.length - 1]?.routine ?? rt.DEFAULT_ROUTINE;
  const settingsAt = (at: number) => rt.toLockSettings(routineAt(at));

  function phaseAt(at: number) {
    const settings = settingsAt(at);
    const now = new Date(at);
    const morning = ls.currentMorning(now, settings);
    const proven = spec.proofs.some(
      (p) => p.key === morning.key && (p.kind === 'pass' || p.kind === 'emergency' || p.at >= morning.start.getTime()),
    );
    const free = spec.armedSince === null || !ls.armedInTime(now, settings, new Date(spec.armedSince));
    return ls.getLockState(now, settings, { steps: 0, unlockedMorning: proven || free ? morning.key : null });
  }
  const locked = (at: number) => {
    const { phase } = phaseAt(at);
    return phase === 'night' || phase === 'morning';
  };
  const standing = () => spec.everPaid && !spec.stoodDown;
  const inUnderWay = (at: number) => !!spec.lapse?.underWayKey && locked(at) && phaseAt(at).morningKey === spec.lapse.underWayKey;
  const napRunning = (at: number) => !!spec.nap && at < spec.nap.end;

  /** The next bedtime under the routine in force or the one waiting, whichever comes first. */
  function nextBedtime(at: number): number {
    const now = new Date(at);
    if (spec.armedSince === null) return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
    // Limits and lists judge by the routine in force (or iOS's armed times), not the early night.
    const times = [ls.settingsTakeEffectAt(now, rt.toLockSettings(inForceAt(at))).getTime()];
    const waiting = spec.routines.filter((r) => r.from > at);
    for (const w of waiting) times.push(ls.settingsTakeEffectAt(now, rt.toLockSettings(w.routine)).getTime());
    return Math.min(...times);
  }

  /**
   * Inside a night of an edit still waiting, which runs past the moment it applies (arming.ts).
   * Only on an evening the edit has on: one that also switches tonight off never tightens.
   */
  function earlyTightening(at: number): boolean {
    return spec.routines.some((w) => {
      if (w.from <= at) return false;
      // The same on the wall clock, which differs from lock-state.ts on a spring clock change
      // (`wallClockNight` checks the evening).
      if (wallClockNight(at, w.routine)) {
        const d = new Date(at);
        const minute = d.getHours() * 60 + d.getMinutes();
        const ends = new Date(d.getFullYear(), d.getMonth(), d.getDate() + (minute >= w.routine.morningStart ? 1 : 0), 0, w.routine.morningStart);
        if (ends.getTime() > w.from) return true;
      }
      const { latest } = ls.nightsAround(new Date(at), rt.toLockSettings(w.routine));
      const evening = new Date(latest.end.getFullYear(), latest.end.getMonth(), latest.end.getDate() - 1).getDay();
      return (
        at >= latest.start.getTime() && at < latest.end.getTime() && latest.end.getTime() > w.from && w.routine.activeNights.includes(evening)
      );
    });
  }

  /**
   * Inside the night by the wall clock, the way iOS fires the windows. Only differs from
   * lock-state.ts on a clock change: a bedtime the clocks skip (02:30 in spring) moves an
   * hour later in the rules, while the window after it still fires on time. Early, never late.
   */
  function wallClockInside(at: number, r: Routine): boolean {
    const d = new Date(at);
    const minute = d.getHours() * 60 + d.getMinutes();
    return r.bedtime < r.morningStart ? minute >= r.bedtime && minute < r.morningStart : minute >= r.bedtime || minute < r.morningStart;
  }

  function wallClockNight(at: number, r: Routine = routineAt(at)): boolean {
    const d = new Date(at);
    const minute = d.getHours() * 60 + d.getMinutes();
    const inside = wallClockInside(at, r);
    const evening = minute < r.morningStart ? new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1) : d;
    return inside && r.activeNights.includes(evening.getDay()) && spec.armedSince !== null;
  }

  function rules(at: number) {
    const allowed = {} as Record<ListName, boolean>;
    const required = {} as Record<ListName, boolean>;
    const on = standing();
    const state = phaseAt(at);
    const isLocked = state.phase === 'night' || state.phase === 'morning';
    const pausedByKey = spec.pausedKey === state.morningKey;
    const paused = pausedByKey && pausedAbs(at);
    const maybePaused = pausedByKey || pausedAbs(at);
    const napNight = napRunning(at) && spec.nap?.list === 'night';
    allowed.always = required.always = on;
    allowed.night = on && ((isLocked && !paused) || (wallClockNight(at) && !paused) || earlyTightening(at) || napNight);
    // A bedtime the spring clock change skips: lock-state.ts starts the night an hour late,
    // while the windows (and an off night's skip) run on the wall clock. Not required there.
    const dstGap = wallClockInside(at, routineAt(at)) !== (state.phase === 'night' || state.phase === 'off');
    required.night =
      on &&
      ((isLocked && !maybePaused && !dstGap && spec.established === period(at) && (!spec.lapse || inUnderWay(at))) || napNight);
    allowed.block = required.block = on && napRunning(at) && spec.nap?.list === 'block';
    const today = dayKey(new Date(at));
    for (const id of ['limit-0', 'limit-1', 'limit-2'] as LimitId[]) {
      const m = device.state.monitored.get(id);
      const reached = device.get<string>(`locturne.limitReached.${id}`) === today;
      required[id] = on && !spec.travelled && !!m && m.deliveredOn === today && (reached || !spec.flown);
      allowed[id] = required[id] || (on && reached);
    }
    return { allowed, required, state };
  }

  const fail = (check: string, detail: string): never => {
    throw new SimFailure(check, t, detail);
  };

  /** Compares the device's blocklist with the rules. `released` lists were just settled by a sync or an extension event. */
  function check(released: ListName[] | 'all', tolerated: ListName[] = []) {
    const { allowed, required, state } = rules(t);
    for (const l of LISTS) {
      spec.allowedFlag[l] = released === 'all' || released.includes(l) ? allowed[l] : spec.allowedFlag[l] || allowed[l];
      if (tolerated.includes(l)) spec.allowedFlag[l] = true;
    }
    const live = Object.fromEntries(LISTS.map((l) => [l, device.appsOfId(l)])) as Record<ListName, string[]>;
    for (const app of UNIVERSE) {
      const shielded = device.state.shielded.has(app);
      const needs = LISTS.filter((l) => required[l] && live[l].includes(app));
      const may = LISTS.filter((l) => spec.allowedFlag[l] && live[l].includes(app));
      if (needs.length && !shielded) fail('held-rule-not-shielded', `${app} must be asleep (${needs.join(', ')}), phase ${state.phase}`);
      if (shielded && !may.length) fail('shielded-without-rule', `${app} is asleep but no rule holds it, phase ${state.phase}, lists ${JSON.stringify(live)}`);
    }
    if (st.isStoodDown() && device.state.shielded.size) fail('stood-down-but-shielded', [...device.state.shielded].join(','));
    // Removals from a standing list wait for bedtime.
    for (const r of spec.removals) {
      if (t >= r.from - 2 * MIN) continue;
      if (r.list === 'night' && (spec.pausedKey === state.morningKey || pausedAbs(t))) continue;
      const still = [...device.appsOfId(r.list), ...(r.list === 'night' ? device.appsOfId('night-next') : [])];
      const gone = r.apps.filter((a) => !still.includes(a));
      if (gone.length) fail('removal-before-bedtime', `${gone.join(',')} left ${r.list} before ${new Date(r.from).toString()}`);
    }
    // A looser daily limit waits for bedtime too: iOS never gets more minutes than allowed.
    for (const [id, limit] of spec.limits) {
      const m = device.state.monitored.get(id);
      if (!m) continue;
      const due = limit.loosen && t >= limit.loosen.from - 2 * MIN;
      const max = due ? Math.max(limit.strict, limit.loosen!.minutes ?? Infinity) : limit.strict;
      const minutes = m.events[0].threshold.hour * 60 + m.events[0].threshold.minute;
      if (minutes > max) fail('limit-loosened-early', `${id} at ${minutes} min, allowed ${max}`);
    }
  }

  /**
   * After every app action: first the facts only the app's own syncs change, then what iOS
   * ran straight after (registrations inside their interval, thresholds already met), then
   * the checks.
   */
  async function afterAppAction() {
    if (spec.lapse && !spec.stoodDown && !inUnderWay(t)) standDownSpec();
    spec.travelled = false;
    if (standing() && locked(t)) spec.established = period(t);
    if (spec.nap && t >= spec.nap.end) spec.nap = null;
    await drain();
    const armed = st.getArmedNight() !== null;
    if (armed !== (spec.armedSince !== null)) fail('armed-mismatch', `iOS armed: ${armed}, rules say: ${spec.armedSince !== null}`);
    if (st.isStoodDown() !== spec.stoodDown) fail('stood-down-mismatch', `stood down: ${st.isStoodDown()}, rules say: ${spec.stoodDown}`);
    if (!spec.everPaid && device.state.monitored.size) fail('armed-before-purchase', [...device.state.monitored.keys()].join(','));
    check('all');
  }

  function standDownSpec() {
    spec.stoodDown = true;
    spec.armedSince = null;
    spec.nap = null;
    count('stand-down');
  }

  function noticeSubscription(paid: boolean) {
    if (!paid) {
      if (!spec.lapse) {
        spec.lapse = { underWayKey: standing() && locked(t) ? phaseAt(t).morningKey : null };
        if (spec.everPaid) count(spec.lapse.underWayKey ? 'lapse-under-way' : 'lapse-in-day');
      }
      if (!spec.stoodDown && !inUnderWay(t)) standDownSpec();
      return;
    }
    if (spec.lapse && spec.everPaid && !spec.stoodDown) count('renewed-before-stand-down');
    spec.lapse = null;
    if (spec.stoodDown || !spec.everPaid) {
      spec.stoodDown = false;
      spec.everPaid = true;
      if (spec.armedSince === null) spec.armedSince = t;
    }
  }

  function specRoutineEdit(next: Routine) {
    // The next bedtime of the routine in force (`applyEdit` in routine.ts), even inside a waiting
    // edit's early first night: the new edit replaces that one and applies when it would have.
    const from = spec.armedSince !== null ? ls.settingsTakeEffectAt(new Date(t), rt.toLockSettings(inForceAt(t))).getTime() : t;
    spec.routines = spec.routines.filter((r) => r.from <= t);
    spec.routines.push({ routine: next, from });
  }

  /** `armIfPaid` (hooks/use-app-start.ts), which can't be imported without React. */
  async function armIfPaid() {
    if (!rt.hasRoutine()) return;
    lc.settleSubscription(spec.paid);
    await flush();
    if (!spec.paid || st.getArmedNight() || st.shownSelection('night').size === 0) return;
    await armTonight();
    await flush();
  }

  /** Launch or return to the front: `useLock`, `useStandingBlocks` and `useAppStart`, in mount order. */
  async function open() {
    lc.syncLock();
    await st.settleLimitChanges().catch(() => {});
    lc.syncLock();
    await flush();
    await armIfPaid();
    noticeSubscription(spec.paid);
    // Looser limits whose bedtime has passed are settled on open.
    for (const [id, limit] of spec.limits) {
      if (!limit.loosen || t < limit.loosen.from) continue;
      if (limit.loosen.minutes === null) spec.limits.delete(id);
      else spec.limits.set(id, { strict: limit.loosen.minutes });
    }
  }

  /** The Apps tab's limit edit (`setMinutes` in apps-list.tsx). */
  async function setLimitMinutes(id: LimitId, minutes: number | null) {
    const limits = st.getLimits();
    const next = dl.editLimit(limits, id, minutes, dl.looserEditsStart(new Date(), st.getArmedNight()));
    const after = next.find((l) => l.id === id);
    const before = limits.find((l) => l.id === id);
    if (after && after.minutes !== before?.minutes) await st.armLimit(after);
    st.saveLimits(next);
    const s = spec.limits.get(id);
    if (!s) return;
    if (minutes !== null && minutes <= s.strict) spec.limits.set(id, { strict: minutes });
    else spec.limits.set(id, { strict: s.strict, loosen: { minutes, from: nextBedtime(t) } });
  }

  /** Apple's picker on a standing list's draft, then Done (`edit` and `pickedList` in apps-list.tsx). */
  function editList(list: 'night' | 'always' | LimitId, apps: string[]) {
    const draft = st.beginListEdit(list);
    const shown = device.appsOfId(draft);
    const all = { ...device.ids() };
    if (apps.length) all[draft] = token(apps);
    else delete all[draft];
    device.exports.userDefaultsSet('familyActivitySelectionIds', all);
    st.finishListEdit(list, dl.looserEditsStart(new Date(), st.getArmedNight()));
    const removed = shown.filter((a) => !apps.includes(a));
    // During an emergency pause the bedtime list's change starts when the pause ends, which
    // only differs from the next bedtime after a flight.
    const from = list === 'night' && pausedAbs(t) ? Math.min(nextBedtime(t), spec.pausedUntil!) : nextBedtime(t);
    if (removed.length && (list === 'night' || list === 'always')) spec.removals.push({ list, apps: removed, from });
  }

  async function act(a: Timed) {
    if (debug) console.log('act', new Date(t).toString().slice(0, 24), JSON.stringify(a), [...device.state.shielded].join(','));
    switch (a.kind) {
      case 'lapse':
        spec.paid = false;
        return;
      case 'renew':
        spec.paid = true;
        return;
      case 'travel':
        process.env.TZ = a.zone;
        spec.established = null;
        spec.travelled = true;
        spec.flown = true;
        count('travel');
        check([]);
        return;
      case 'use': {
        const id = `limit-${a.slot}`;
        if (device.use(id, a.minutes)) await drain();
        return;
      }
      default:
    }

    await open();
    switch (a.kind) {
      case 'open':
        break;
      case 'proof': {
        const before = phaseAt(t);
        const state = lc.proveMorning(a.method);
        await flush();
        const expect = before.phase === 'morning';
        if (expect !== (state?.phase === 'day')) fail('proof', `phase ${before.phase}, proof ${state ? state.phase : 'refused'}`);
        if (expect) {
          spec.proofs.push({ key: before.morningKey, kind: a.method, at: t });
          count('proof');
        } else count('proof-refused');
        break;
      }
      case 'pass': {
        const before = phaseAt(t);
        const left = ps.PASSES_PER_MONTH - spec.passes.filter((k) => k.slice(0, 7) === before.morningKey.slice(0, 7)).length;
        const expect = before.phase === 'morning' && left > 0 && !spec.passes.includes(before.morningKey);
        const refusal = ps.spendPass();
        await flush();
        if (expect !== (refusal === null)) fail('pass', `phase ${before.phase}, ${left} left, refusal ${refusal}`);
        if (expect) {
          spec.passes.push(before.morningKey);
          spec.proofs.push({ key: before.morningKey, kind: 'pass', at: t });
          spec.nap = null;
          count('pass');
        }
        break;
      }
      case 'emergency': {
        const before = phaseAt(t);
        const plan = em.planEmergency(before.phase, napRunning(t), new Date(t));
        const use = em.previewEmergency() ? em.emergencyUnlock() : null;
        await flush();
        if (!!plan !== !!use || (plan && use && plan.pauseNight !== use.pauseNight)) {
          fail('emergency', `phase ${before.phase}, expected ${JSON.stringify(plan)}, got ${JSON.stringify(use)}`);
        }
        if (plan?.pauseNight) {
          spec.pausedKey = before.morningKey;
          // `nextBedtime` in emergency.ts: the routine's, armed or not.
          const now = new Date(t);
          spec.pausedUntil = Math.min(
            ...[routineAt(t), ...spec.routines.filter((r) => r.from > t).map((r) => r.routine)].map((r) =>
              ls.settingsTakeEffectAt(now, rt.toLockSettings(r)).getTime(),
            ),
          );
          count('emergency-night');
        }
        if (plan?.unlockMorning) spec.proofs.push({ key: before.morningKey, kind: 'emergency', at: t });
        if (plan?.endBlockNow) spec.nap = null;
        if (plan) count('emergency');
        break;
      }
      case 'nap': {
        // The nap screen's `blocker`, and no second nap while one runs.
        if (st.getNap() || st.isStoodDown() || !st.hasSelection(a.list) || (a.list === 'night' && st.isNightHeld())) break;
        if (a.list === 'block' && !st.hasSelection('block')) break;
        try {
          const nap = await st.startNap(a.list, a.minutes);
          spec.nap = { list: a.list, end: nap.end };
          count(`nap-${a.list}`);
        } catch (error) {
          if (!(error instanceof st.NapClockChangeError)) throw error;
          count('nap-refused-clock-change');
        }
        lc.syncLock();
        await flush();
        break;
      }
      case 'wakeNap':
        if (!st.getNap()) break;
        st.endNap();
        lc.syncLock();
        spec.nap = null;
        count('nap-woken');
        break;
      case 'routine': {
        // The Routine tab edits what's set: the waiting edit, or the routine in force.
        const next = { ...(rt.getPendingRoutine()?.routine ?? rt.getRoutine()), ...a.patch };
        const expected = { ...latestRoutine(), ...a.patch };
        assert.deepEqual(next, expected, 'harness and app agree on the routine being edited');
        rt.saveRoutine(next);
        specRoutineEdit(next);
        if (st.getArmedNight()) await lc.armRoutine().catch(() => {});
        else {
          await armIfPaid();
          noticeSubscription(spec.paid);
        }
        await flush();
        count('routine-edit');
        break;
      }
      case 'list': {
        if (a.list === 'night' && !st.hasSelection('night') && !st.hasSelection('night-next')) break;
        editList(a.list, a.apps);
        st.reapplyStandingBlocks();
        count(`list-${a.list}`);
        break;
      }
      case 'limitAdd': {
        const id = dl.freeLimitId(st.getLimits());
        if (!id) break;
        editList(id, a.apps);
        if (st.selectionSize(id) === 0) break;
        const created = { id, minutes: 30 };
        await st.armLimit(created);
        st.saveLimits([...st.getLimits(), created]);
        spec.limits.set(id, { strict: 30 });
        st.reapplyStandingBlocks();
        count('limit-add');
        break;
      }
      case 'limitMinutes': {
        const id = `limit-${a.slot}` as LimitId;
        if (!st.getLimits().some((l) => l.id === id)) break;
        await setLimitMinutes(id, a.minutes);
        count(a.minutes === null ? 'limit-remove' : 'limit-edit');
        break;
      }
      case 'buy': {
        // The paywall (resume=paywall from Home, You or Apps): `finishSetup` in onboarding-flow.tsx.
        spec.paid = true;
        lc.settleSubscription(true);
        await flush();
        const current = rt.getPendingRoutine()?.routine ?? rt.getRoutine();
        rt.saveRoutine(current);
        specRoutineEdit(current);
        await armTonight();
        await flush();
        noticeSubscription(true);
        count('buy');
        break;
      }
    }
    await afterAppAction();
  }

  /** Runs what iOS queued straight after a call (a registration inside its interval, a threshold already met). */
  async function drain() {
    if (!device.state.queue.length) return;
    const settled: Settled = { released: [], tolerated: [] };
    while (device.state.queue.length) {
      const e = device.state.queue.shift()!;
      onEvent(e.activity, e.callback, settled);
    }
    check(settled.released, settled.tolerated);
  }

  type Settled = { released: ListName[]; tolerated: ListName[] };

  /**
   * Runs one callback in the extension and notes which lists it settles. The caller checks
   * once every callback at that instant has run: iOS runs simultaneous callbacks in no fixed
   * order, and nobody can see the state between them.
   */
  function onEvent(activity: string, callback: Callback, { released, tolerated }: Settled) {
    device.fire(activity, callback);
    if (debug) console.log('event', new Date(t).toString().slice(0, 24), activity, callback, [...device.state.shielded].join(','));
    if (activity.startsWith('night-') && callback === 'intervalDidStart') {
      released.push('night');
      // Windows still armed for an older routine (re-arming waits for a phantom night to pass,
      // then for the next sync) shield at the old times: stricter than the rules, the safe
      // side, until the app opens and re-arms. Windows armed for the right routine get no slack.
      // The extension places each window by the armed times and releases only inside the
      // night in force (`locturneWindowNight`, `locturneInsideNightInForce`), so an old window
      // no longer ends a morning nobody proved (native-tests covers it). The lock still isn't
      // required here: after an edit, lock-state re-reads a morning already proven under the
      // old times and may call it locked again (open product question, seed 368), which the
      // extension can't know.
      const armed = st.getArmedNight();
      const target = latestRoutine();
      const stale = !!armed && (armed.bedtime !== target.bedtime || armed.morningStart !== target.morningStart);
      if (stale) {
        tolerated.push('night');
        count('stale-window');
      }
      // Windows armed early for a waiting edit were checked against phantom nights on the clock
      // of the zone they were armed in. After a flight they can fire in a phantom night until
      // the next sync. A travel edge, reported, not checked.
      const travelPhantom = spec.flown && spec.routines.some((r) => r.from > t);
      if (travelPhantom) {
        tolerated.push('night');
        count('travel-phantom');
      }
      if (stale || travelPhantom) spec.established = null;
      else if (standing() && locked(t) && spec.pausedKey !== phaseAt(t).morningKey && !pausedAbs(t)) spec.established = period(t);
      count('window-start');
    }
    if (activity === 'locturne-nap' && callback === 'intervalDidEnd') {
      released.push('block');
      // A nap on the bedtime apps settles them too, unless the night lock still holds them.
      if (spec.nap?.list === 'night' && !st.isNightHeld()) released.push('night');
      if (spec.nap && t >= spec.nap.end) spec.nap = null;
      count('nap-ended-by-ios');
    }
    if (activity.startsWith('limit-') && callback === 'intervalDidStart') released.push(activity as LimitId);
    if (callback === 'eventDidReachThreshold') count('limit-used-up');
  }

  async function advance(to: number) {
    const due = device.dueEvents(t, to);
    for (let i = 0; i < due.length; ) {
      t = due[i].at;
      mock.timers.setTime(t);
      const settled: Settled = { released: [], tolerated: [] };
      for (; i < due.length && due[i].at === t; i++) {
        const e = due[i];
        const droppable = e.callback !== 'eventDidReachThreshold';
        if (droppable && hash01(`${sc.seed}|${e.activity}|${e.callback}|${e.at}`) < sc.dropRate) {
          count('dropped-event');
          continue;
        }
        onEvent(e.activity, e.callback, settled);
      }
      check(settled.released, settled.tolerated);
    }
    t = to;
    mock.timers.setTime(t);
  }

  try {
    // Onboarding: Apple's picker writes the bedtime list straight in (nothing armed yet).
    device.exports.setFamilyActivitySelectionId({ id: 'night', familyActivitySelection: token(sc.night) });
    if (sc.always.length) device.exports.setFamilyActivitySelectionId({ id: 'always', familyActivitySelection: token(sc.always) });
    device.exports.setFamilyActivitySelectionId({ id: 'block', familyActivitySelection: token(sc.block) });
    if (sc.buys) {
      lc.settleSubscription(true);
      rt.saveRoutine(sc.routine);
      spec.routines.push({ routine: sc.routine, from: -Infinity });
      await armTonight();
      await flush();
      noticeSubscription(true);
    } else {
      rt.saveRoutine(sc.routine);
      spec.routines.push({ routine: sc.routine, from: -Infinity });
    }
    await afterAppAction();

    for (const a of actions) {
      await advance(a.at);
      await act(a);
    }
    await advance(sc.end);
    return null;
  } catch (error) {
    if (error instanceof SimFailure) return error;
    const e = error instanceof Error ? error : new Error(String(error));
    return new SimFailure('crash', t, e.stack ?? e.message);
  } finally {
    restoreZone();
  }
}

/** The fewest actions (by repeated halving, then one at a time) that still fail the same check. */
async function shrink(sc: Scenario, failure: SimFailure): Promise<{ actions: Timed[]; failure: SimFailure }> {
  let actions = sc.actions;
  let last = failure;
  let chunk = Math.ceil(actions.length / 2);
  let budget = 400;
  while (chunk >= 1 && budget > 0) {
    let removed = false;
    for (let i = 0; i < actions.length && budget > 0; i += chunk) {
      const fewer = [...actions.slice(0, i), ...actions.slice(i + chunk)];
      budget--;
      const result = await run(sc, fewer);
      if (result && result.check === failure.check) {
        actions = fewer;
        last = result;
        removed = true;
        i -= chunk;
      }
    }
    if (!removed) chunk = Math.floor(chunk / 2);
  }
  return { actions, failure: last };
}

function describeRun(sc: Scenario, actions: Timed[]): string {
  const at = (ms: number) => new Date(ms).toString().slice(0, 24);
  return JSON.stringify(
    {
      seed: sc.seed,
      tz: BASE_TZ,
      start: at(sc.start),
      routine: sc.routine,
      night: sc.night,
      always: sc.always,
      block: sc.block,
      buys: sc.buys,
      startsOnRegister: sc.startsOnRegister,
      dropRate: sc.dropRate,
      actions: actions.map(({ at: ms, ...rest }) => ({ at: at(ms), ...rest })),
    },
    null,
    1,
  );
}

/** Set for the replay of a shrunk failure with LOCK_SIM_DEBUG=1: logs every action and callback. */
let debug = false;
const SEEDS = Number(process.env.LOCK_SIM_SEEDS ?? 300);
const MAX_DAYS = Number(process.env.LOCK_SIM_DAYS ?? 12);
const ONLY = process.env.LOCK_SIM_SEED;
/**
 * Seeds that found a bug (or a harness mistake) at 14 days in some zone, run in every zone on
 * top of the random ones. Each bug also has a focused regression test next to its module.
 */
const FOUND = [3, 15, 24, 39, 63, 78, 119, 134, 156, 165, 177, 193, 265, 368, 486, 543, 707, 714, 852, 1065, 1080, 2615];

test(`lock simulation: ${ONLY ? `seed ${ONLY}` : `${SEEDS} seeded runs`} of 7–${MAX_DAYS} days`, async () => {
  mock.timers.enable({ apis: ['Date'], now: 0 });
  try {
    const seeds = ONLY ? [Number(ONLY)] : Array.from({ length: SEEDS }, (_, i) => i + 1);
    const runs = ONLY ? seeds.map((seed) => [seed, MAX_DAYS]) : [...seeds.map((seed) => [seed, MAX_DAYS]), ...FOUND.map((seed) => [seed, 14])];
    for (const [seed, days] of runs) {
      const sc = scenario(seed, days);
      count(sc.dst ? 'dst-run' : 'plain-run');
      const failure = await run(sc);
      if (!failure) continue;
      const small = await shrink(sc, failure);
      debug = !!process.env.LOCK_SIM_DEBUG;
      await run(sc, small.actions);
      debug = false;
      assert.fail(`${small.failure.message}\nMinimal run:\n${describeRun(sc, small.actions)}\nExtension trace:\n${device.state.trace.slice(-12).join('\n')}`);
    }
    if (process.env.LOCK_SIM_COVERAGE) console.log(JSON.stringify(coverage));
    if (!ONLY && SEEDS >= 200) {
      // Guards against a simulation that quietly stopped exercising something.
      for (const what of ['proof', 'proof-refused', 'pass', 'emergency', 'emergency-night', 'nap-block', 'nap-night', 'nap-ended-by-ios', 'routine-edit', 'list-night', 'list-always', 'limit-add', 'limit-used-up', 'stand-down', 'lapse-under-way', 'lapse-in-day', 'buy', 'travel', 'window-start']) {
        assert.ok((coverage[what] ?? 0) >= 5, `the simulation exercised ${what} only ${coverage[what] ?? 0} times`);
      }
      if (DST_2026.length) assert.ok((coverage['dst-run'] ?? 0) >= 20, 'too few runs across a clock change');
    }
  } finally {
    mock.timers.reset();
  }
});

// Seed 177: on the spring clock change a window whose start the clocks skip (here 02:15, when
// 02:00 jumps to 03:00) fires at or after morning start. The extension used to count it as
// Sunday evening's night (on) instead of Saturday's (off) and shield a free morning; now a
// window outside its night changes nothing (`locturneWindowEvening` in the monitor extension).
test('spring clock change: a window the clocks skip never shields an off night', async () => {
  mock.timers.enable({ apis: ['Date'], now: 0 });
  const zone = process.env.TZ;
  process.env.TZ = 'America/New_York';
  try {
    const sc: Scenario = {
      seed: 177,
      zone: 'America/New_York',
      start: new Date(2026, 1, 28, 18, 26).getTime(),
      end: new Date(2026, 2, 10).getTime(),
      // 00:00 to 03:00, Sunday to Wednesday evenings: Saturday night (into Sunday March 8) is off.
      routine: { bedtime: 0, morningStart: 180, activeNights: [0, 1, 2, 3], method: 'scan', stepGoal: 100 },
      night: ['yt', 'snap'],
      always: ['reddit', 'news'],
      block: ['mail'],
      buys: true,
      startsOnRegister: true,
      dropRate: 0,
      dst: true,
      actions: [],
    };
    const failure = await run(sc, sc.actions);
    assert.equal(failure, null, failure?.message ?? '');
  } finally {
    if (zone === undefined) delete process.env.TZ;
    else process.env.TZ = zone;
    mock.timers.reset();
  }
});
