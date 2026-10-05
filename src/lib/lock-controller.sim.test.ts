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
/**
 * Shift work: sleep in the day after a night shift (08:00 to 16:00), or late after an evening
 * one (03:00 to 11:00). A switch between these and an ordinary night can name a morning again
 * that was already proven under the old routine.
 */
const SHIFT_PAIRS = [
  [8 * 60, 16 * 60],
  [7 * 60, 15 * 60],
  [9 * 60 + 30, 17 * 60],
  [6 * 60, 14 * 60],
  [10 * 60, 13 * 60],
  [14 * 60, 22 * 60],
  [19 * 60, 3 * 60],
  [3 * 60, 11 * 60],
  [4 * 60, 12 * 60],
] as const;
const pickTimes = (r: ReturnType<typeof prng>) => (r.chance(0.25) ? r.pick(SHIFT_PAIRS) : r.pick(TIME_PAIRS));

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
  const [bedtime, morningStart] = pickTimes(r);
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
        const [b, m] = pickTimes(r);
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

/** A proof the app accepted, with the bedtime and morning start of the routine it was made under. */
type Proof = { key: string; kind: string; at: number; bedtime: number; morningStart: number };
type LimitSpec = { strict: number; loosen?: { minutes: number | null; from: number; dated: number } };
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
    /** A morning a renewal found after the last paid one, whose night nothing held. */
    freeMorning: null as string | null,
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
    /** `dated`: when its start was worked out (none once an emergency pause parks it). */
    removals: [] as { list: 'night' | 'always'; apps: string[]; from: number; dated?: number; awake?: boolean }[],
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
   * Only where iOS holds it early: the windows armed are in their night (arming can wait out
   * a phantom night) and the routine in force has that evening on (the extension skips the
   * early windows of an evening it has off, so arming waits). Only if the edit has that evening
   * on too: a first night it has off would only loosen one the routine in force holds (a long
   * first night saved from bed with tonight off, round 51). Once a lapse was
   * noticed, only if that night was the one under way then: only it finishes.
   */
  const routineAt = (at: number) => routineAtAsOf(at, at);
  /**
   * `routineAt`, with the routines as they stood at `asOf` (a later moment): the app judges a past
   * moment with the routine in force and the waiting edit it has now (`looserEditsStartAt` when
   * it redates a change saved then).
   */
  const routineAtAsOf = (at: number, asOf: number) => {
    const next = spec.routines.find((r) => r.from > asOf);
    if (next) {
      const { latest } = ls.nightsAround(new Date(at), rt.toLockSettings(next.routine));
      const inside = at >= latest.start.getTime() && at < latest.end.getTime() && latest.end.getTime() > next.from;
      const evening = new Date(latest.end.getFullYear(), latest.end.getMonth(), latest.end.getDate() - 1).getDay();
      // iOS's armed windows must be in their night too: arming can wait out a phantom night
      // (an earlier bedtime saved after the walk), leaving the routine in force's later ones.
      const armed = st.getArmedNight();
      const theirs = armed && ls.nightsAround(new Date(at), { ...rt.toLockSettings(next.routine), ...armed, activeNights: [0, 1, 2, 3, 4, 5, 6] }).latest;
      const armedInside = !!theirs && at >= theirs.start.getTime() && at < theirs.end.getTime();
      // The extension reads the edit's nights from two minutes before it applies.
      const nights = at >= next.from - 2 * MIN ? next.routine.activeNights : inForceAt(asOf).activeNights;
      const held = armedInside && nights.includes(evening) && next.routine.activeNights.includes(evening);
      if (inside && held && (!spec.lapse || spec.lapse.underWayKey === ls.dateKey(latest.end))) return next.routine;
      // Otherwise the routine in force as iOS runs it, as with no edit waiting: windows still
      // armed for an older routine hold its night from their bedtime, and an edit saved from
      // inside that night doesn't hand it back. Not windows armed early for the edit itself.
      return editsArmed(asOf, next.routine) ? inForceAt(asOf) : asRun(inForceAt(asOf));
    }
    return asRun(inForceAt(asOf));
  };
  /**
   * Are the windows armed the waiting edit's own: its times, armed after the routine in force
   * took over? Ones with its times armed before then are an older routine's (an edit back to it).
   */
  const editsArmed = (at: number, edit: Routine) => {
    const armed = st.getArmedNight();
    return !!armed && armed.bedtime === edit.bedtime && armed.morningStart === edit.morningStart && Date.parse(armed.armedAt) >= routineFrom(at);
  };
  /**
   * The routine in force as iOS runs it, with no edit waiting: windows still armed for older
   * times (arming waited out a phantom night, and nothing re-armed with the app closed) shield
   * from their own bedtime, and the hold lasts until a proof, so the night into the same
   * morning runs from there to the routine's morning start. Only when the two nights into that
   * morning overlap; otherwise (a switch to or from a night shift) the routine's own night
   * stands. Worked out on real instants for a sample morning, apart from the app's minute
   * arithmetic (`armedBedtime`).
   */
  const asRun = (r: Routine): Routine => {
    const armed = st.getArmedNight();
    if (!armed || armed.bedtime === r.bedtime) return r;
    const key = '2026-01-14';
    const ours = ls.nightInto(key, r);
    const theirs = ls.nightInto(key, armed);
    const empty = (n: { start: Date; end: Date }) => n.start.getTime() === n.end.getTime();
    if (empty(ours) || empty(theirs)) return r;
    if (Math.max(+ours.start, +theirs.start) >= Math.min(+ours.end, +theirs.end)) return r;
    const moved = { ...r, bedtime: armed.bedtime };
    return +ls.nightInto(key, moved).start === +theirs.start ? moved : r;
  };
  /**
   * Which routine the night into `morning` really ran under (`nightRanUnder` in routine.ts): the
   * one governing `at` if it ended after that one took over (or it's a waiting edit's early
   * first night), else the one before if its night into that morning began before then, on an
   * evening it had on. A morning neither ran into is free.
   */
  const ranUnder = (at: number, morning: { key: string; start: Date }): 'routine' | 'prior' | 'none' => {
    if (routineAt(at) === spec.routines.find((r) => r.from > at)?.routine) return 'routine';
    let i = 0;
    spec.routines.forEach((r, j) => {
      if (r.from <= at) i = j;
    });
    const since = spec.routines[i]?.from ?? -Infinity;
    if (morning.start.getTime() > since) return 'routine';
    const prior = spec.routines[i - 1]?.routine;
    if (!prior) return 'none';
    const [y, mo, d] = morning.key.split('-').map(Number);
    const evening = new Date(y, mo - 1, d - 1).getDay();
    return prior.activeNights.includes(evening) && ls.nightInto(morning.key, prior).start.getTime() < since ? 'prior' : 'none';
  };
  /** The routine before the one in force at `at` (`getRoutineChange().prior`), or null. */
  const priorAt = (at: number): Routine | null => {
    let i = 0;
    spec.routines.forEach((r, j) => {
      if (r.from <= at) i = j;
    });
    return spec.routines[i - 1]?.routine ?? null;
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
  const timesAt = (at: number) => {
    const { bedtime, morningStart } = routineAt(at);
    return { bedtime, morningStart };
  };
  /**
   * When the night into a proof's morning began, on the clock of now, under the times the proof
   * was made under: bedtime on the morning's day if it comes before morning start, otherwise the
   * day before; none (morning start) for equal times or a bedtime the clocks skip past it.
   */
  const nightInto = (p: Proof) => {
    const [y, mo, d] = p.key.split('-').map(Number);
    const end = new Date(y, mo - 1, d, 0, p.morningStart).getTime();
    if (p.bedtime === p.morningStart) return end;
    return Math.min(end, new Date(y, mo - 1, p.bedtime < p.morningStart ? d : d - 1, 0, p.bedtime).getTime());
  };

  function phaseAt(at: number) {
    const settings = settingsAt(at);
    const now = new Date(at);
    const morning = ls.currentMorning(now, settings);
    // Only accepted proofs are pushed (judged against morning start when made). A flight west
    // or a later morning start doesn't take one back, but a new night does: a walk counts for
    // its morning only if no bedtime has begun here since (the night leading into this morning,
    // on this clock, started before it). Over the date line the same key comes round again
    // after a whole night. That night is the one under the routine the walk was made under: a
    // night shift saved since names the same morning with a night nobody slept under it. A
    // pass or an emergency unlock is tied to its morning's key.
    // A night that ran under the routine governing now and began after a walk takes the morning
    // back, whatever routine the walk was made under (a same-day night held early after it).
    const under = ranUnder(at, morning);
    // A morning the routine before held stays locked until proven, even with that evening off now.
    const [ky, km, kd] = morning.key.split('-').map(Number);
    const kEvening = new Date(ky, km - 1, kd - 1).getDay();
    const judged = under === 'prior' && !settings.activeNights.includes(kEvening) ? { ...settings, activeNights: [...settings.activeNights, kEvening] } : settings;
    const after = (p: Proof) => p.at >= (under === 'routine' ? morning.nightStart.getTime() : nightInto(p));
    const proven = spec.proofs.some((p) => p.key === morning.key && (p.kind === 'pass' || p.kind === 'emergency' || after(p)));
    // A morning the routine before held was armed in time only if its night under that routine
    // was (round 52: a lapse, a renewal by day, then a switch to other times re-read that
    // morning as locked under the new routine's later morning start).
    const prior = under === 'prior' ? priorAt(at) : null;
    const inTime =
      spec.armedSince !== null &&
      (prior ? spec.armedSince < ls.nightInto(morning.key, prior).end.getTime() : ls.armedInTime(now, settings, new Date(spec.armedSince)));
    const free = spec.armedSince === null || under === 'none' || !inTime || spec.freeMorning === morning.key;
    return ls.getLockState(now, judged, { steps: 0, unlockedMorning: proven || free ? morning.key : null });
  }
  const locked = (at: number) => {
    const { phase } = phaseAt(at);
    return phase === 'night' || phase === 'morning';
  };
  const standing = () => spec.everPaid && !spec.stoodDown;
  const inUnderWay = (at: number) => !!spec.lapse?.underWayKey && locked(at) && phaseAt(at).morningKey === spec.lapse.underWayKey;
  const napRunning = (at: number) => !!spec.nap && at < spec.nap.end;

  /**
   * When a looser edit saved at `at` starts (`looserEditsStartAt` in lock-controller.ts), from
   * the product rule: the next bedtime of the routine in force as iOS runs it, like a routine
   * edit saved then. Not a waiting edit's earlier bedtime: a throwaway edit armed at once would
   * pull every loosening forward to its first window (security audit, round 50). Never before
   * the midnight after protection was first armed (a night armed for five minutes, then switched
   * off again, round 51). Midnight with nothing armed. From bed in a waiting edit's early first
   * night (it governs), that edit's next bedtime. The bedtime list while it's awake: the first
   * night that really starts, an early first night held for a waiting edit included, so a
   * removed app never sleeps at 21:00 only to wake mid-night at 23:15; while it's asleep, not
   * inside such a night either, but the bedtime after it.
   */
  function nextBedtime(at: number, list: 'night' | 'always' | 'limit' = 'always', awake?: boolean): number {
    return looserStart(at, list, awake).at;
  }

  /**
   * `nextBedtime`, whether the bedtime list counts as awake at `at` (`awake`: recorded when the
   * change was saved, never judged again from what the phone does later), and whether that rule
   * landed on a waiting edit's early first night (`early`). The floor applies only to a change
   * saved since protection was first armed: one saved before a re-arm (a lapse, then a renewal)
   * was dated by a bedtime already. A Block now on the bedtime list counts as asleep only if it
   * runs past the removal's start.
   */
  function looserStart(at: number, list: 'night' | 'always' | 'limit', awake?: boolean): { at: number; awake: boolean; early: boolean } {
    const now = new Date(at);
    if (spec.armedSince === null) {
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
      return { at: midnight, awake: list === 'night' && (awake ?? listAwake(at, midnight)), early: false };
    }
    const first = new Date(spec.armedSince);
    const floor = spec.armedSince <= at ? new Date(first.getFullYear(), first.getMonth(), first.getDate() + 1).getTime() : -Infinity;
    // With the routines as they stand now, also for a change saved earlier (D, round 52): the app
    // has only those. With nothing armed when it was saved, midnight then, and it moves only later.
    const asOf = Math.max(at, t);
    const waiting = spec.routines.find((r) => r.from > asOf);
    if (awake !== true && waiting && routineAtAsOf(at, asOf) === waiting.routine) {
      return { at: Math.max(floor, ls.settingsTakeEffectAt(now, rt.toLockSettings(waiting.routine)).getTime()), awake: false, early: false };
    }
    const runs = waiting && editsArmed(asOf, waiting.routine) ? inForceAt(asOf) : asRun(inForceAt(asOf));
    const next = ls.settingsTakeEffectAt(now, rt.toLockSettings(runs)).getTime();
    // A waiting edit's first night that iOS holds early (the lock runs on it from its start).
    let early: { start: number; end: number } | null = null;
    if (waiting) {
      const { latest, next: after } = ls.nightsAround(now, rt.toLockSettings(waiting.routine));
      const night = at < latest.end.getTime() ? latest : after;
      const start = night.start.getTime();
      const end = night.end.getTime();
      if (start < waiting.from && end > waiting.from && routineAtAsOf(Math.max(start, at), asOf) === waiting.routine) early = { start, end };
    }
    if (list === 'night') {
      const firstNight = early && early.start < next ? early.start : next;
      if (awake ?? listAwake(at, firstNight)) return { at: firstNight, awake: true, early: firstNight !== next || spec.armedSince > at };
    }
    const from = Math.max(floor, next);
    if (list === 'night' && waiting && early && from >= early.start && from < early.end) {
      return { at: Math.max(floor, ls.settingsTakeEffectAt(new Date(early.end), rt.toLockSettings(waiting.routine)).getTime()), awake: false, early: false };
    }
    return { at: from, awake: false, early: false };
  }

  /** The bedtime list is awake at `at`, for a removal from `from`: no night or morning, nor a Block now on it past `from`. */
  const listAwake = (at: number, from: number) => !locked(at) && !(napRunning(at) && spec.nap?.list === 'night' && spec.nap.end > from);

  /**
   * After the windows are armed again or a waiting edit replaced, the rule worked out again for
   * the moment each looser edit was saved: it only moves later, so an Undo can't bring it forward.
   * Except a removal made while the bedtime list was awake, which moves earlier (never before now)
   * to an early first night that appears before it. Nothing moves while nothing is armed.
   */
  function redate() {
    if (spec.armedSince === null) return;
    for (const r of spec.removals) {
      if (r.dated === undefined || r.from <= t + 2 * MIN) continue;
      const due = looserStart(r.dated, r.list, r.awake);
      if (r.awake && due.early && due.at < r.from) r.from = Math.max(t, due.at);
      else r.from = Math.max(r.from, due.at);
    }
    for (const limit of spec.limits.values()) {
      if (!limit.loosen || limit.loosen.from <= t) continue;
      limit.loosen.from = Math.max(limit.loosen.from, nextBedtime(limit.loosen.dated, 'limit'));
    }
  }

  /**
   * Where an emergency pause ends (`nextBedtime` in lock-controller.ts): the next bedtime of the
   * routine the lock runs on, or a waiting edit's earlier one after tonight's night (a bedtime of
   * its inside tonight waits).
   */
  function pauseEndsAt(at: number): number {
    const now = new Date(at);
    const tonightEnds = ls.nightsAround(now, settingsAt(at)).latest.end.getTime();
    return Math.min(
      ls.settingsTakeEffectAt(now, settingsAt(at)).getTime(),
      ...spec.routines
        .filter((r) => r.from > at)
        .map((r) => ls.settingsTakeEffectAt(now, rt.toLockSettings(r.routine)).getTime())
        .filter((end) => end >= tonightEnds),
    );
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

  /**
   * The rule for "used up today" (sweep #124, #126, #127), from the marks the extension
   * stored: by the moment, if there is one, at least the limit's minutes after local midnight
   * and less than 26 h ahead; else by the day. After a flight the moment, not the day, says
   * which local day it belongs to (a limit used up at 22:30 in New York is today's in Tokyo).
   */
  function usedUpToday(id: LimitId, at: number, today: string): boolean {
    const moment = device.get<unknown>(`locturne.limitReachedAt.${id}`);
    if (typeof moment !== 'number') return device.get<string>(`locturne.limitReached.${id}`) === today;
    const d = new Date(at);
    const midnight = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const minutes = device.get<{ id: string; minutes: number }[]>('locturne.limits')?.find((l) => l.id === id)?.minutes ?? 0;
    return moment >= midnight + minutes * MIN && moment < at + 26 * 60 * MIN;
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
      const reached = usedUpToday(id, at, today);
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
    redate();
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
    // A renewal in a morning after the last paid one: the extension skipped its night, so it
    // stays free (`FREE_MORNING_KEY` in lock-controller.ts).
    if (spec.lapse && !spec.stoodDown && phaseAt(t).phase === 'morning' && !inUnderWay(t)) spec.freeMorning = phaseAt(t).morningKey;
    spec.lapse = null;
    if (spec.stoodDown || !spec.everPaid) {
      spec.stoodDown = false;
      spec.everPaid = true;
      if (spec.armedSince === null) spec.armedSince = t;
    }
  }

  function specRoutineEdit(next: Routine) {
    // The next bedtime of the routine in force (`applyEdit` in routine.ts). Inside a waiting
    // edit's early first night that edit already governs, so it's in force from now and the
    // new edit waits for its next bedtime: replacing it would hand tonight back to the old,
    // later bedtime and wake the apps from bed (edits made at night wait, GAME_PLAN).
    const waiting = spec.routines.findIndex((r) => r.from > t);
    if (spec.armedSince !== null && waiting >= 0 && routineAt(t) !== inForceAt(t)) {
      spec.routines[waiting] = { ...spec.routines[waiting], from: t };
    }
    // By the routine in force as iOS runs it: windows still armed for an older routine hold
    // tonight from their bedtime, and an edit saved inside that night waits for the next one.
    const still = spec.routines.find((r) => r.from > t);
    const runs = still && editsArmed(t, still.routine) ? inForceAt(t) : asRun(inForceAt(t));
    const from = spec.armedSince !== null ? ls.settingsTakeEffectAt(new Date(t), rt.toLockSettings(runs)).getTime() : t;
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
    const next = dl.editLimit(limits, id, minutes, lc.looserEditsStartAt(new Date()), new Date());
    const after = next.find((l) => l.id === id);
    const before = limits.find((l) => l.id === id);
    if (after && after.minutes !== before?.minutes) await st.armLimit(after);
    st.saveLimits(next);
    const s = spec.limits.get(id);
    if (!s) return;
    if (minutes !== null && minutes <= s.strict) spec.limits.set(id, { strict: minutes });
    else {
      // A second loosening never brings the first one forward.
      const due = nextBedtime(t, 'limit');
      const waiting = s.loosen && s.loosen.from > due ? s.loosen : null;
      spec.limits.set(id, { strict: s.strict, loosen: { minutes, from: waiting?.from ?? due, dated: waiting?.dated ?? t } });
    }
  }

  /** Apple's picker on a standing list's draft, then Done (`edit` and `pickedList` in apps-list.tsx). */
  function editList(list: 'night' | 'always' | LimitId, apps: string[]) {
    const draft = st.beginListEdit(list);
    const shown = device.appsOfId(draft);
    const all = { ...device.ids() };
    if (apps.length) all[draft] = token(apps);
    else delete all[draft];
    device.exports.userDefaultsSet('familyActivitySelectionIds', all);
    st.finishListEdit(list, lc.looserEditsStartAt(new Date(), list));
    const removed = shown.filter((a) => !apps.includes(a));
    if (removed.length && (list === 'night' || list === 'always')) {
      // During an emergency pause the bedtime list's change starts when the pause ends, which
      // only differs from the next bedtime after a flight.
      if (list === 'night' && pausedAbs(t)) spec.removals.push({ list, apps: removed, from: Math.min(nextBedtime(t, list), spec.pausedUntil!) });
      else {
        const due = looserStart(t, list);
        spec.removals.push({ list, apps: removed, from: due.at, dated: t, ...(list === 'night' ? { awake: due.awake } : {}) });
      }
    }
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
        const expect = before.phase === 'morning' && !(!!spec.lapse && !inUnderWay(t));
        if (expect !== (state?.phase === 'day')) fail('proof', `phase ${before.phase}, proof ${state ? state.phase : 'refused'}`);
        if (expect) {
          spec.proofs.push({ key: before.morningKey, kind: a.method, at: t, ...timesAt(t) });
          count('proof');
        } else count('proof-refused');
        break;
      }
      case 'pass': {
        const before = phaseAt(t);
        const left = ps.PASSES_PER_MONTH - spec.passes.filter((k) => k.slice(0, 7) === before.morningKey.slice(0, 7)).length;
        // After a lapse, a morning other than the one under way then holds nothing (`pastLastPaid`).
        const lapsed = !!spec.lapse && !inUnderWay(t);
        const expect = before.phase === 'morning' && !lapsed && left > 0 && !spec.passes.includes(before.morningKey);
        const refusal = ps.spendPass();
        await flush();
        if (expect !== (refusal === null)) fail('pass', `phase ${before.phase}, ${left} left, refusal ${refusal}`);
        if (expect) {
          spec.passes.push(before.morningKey);
          spec.proofs.push({ key: before.morningKey, kind: 'pass', at: t, ...timesAt(t) });
          spec.nap = null;
          count('pass');
        }
        break;
      }
      case 'emergency': {
        const before = phaseAt(t);
        // By what's asleep (`heldPhase`): a night with nothing armed, or already paused, is day.
        const held = spec.armedSince !== null && !spec.stoodDown && !pausedAbs(t);
        // After a lapse, a night or morning other than the one under way then holds nothing.
        const lapsed = !!spec.lapse && (before.phase === 'night' || before.phase === 'morning') && !inUnderWay(t);
        const plan = em.planEmergency(lapsed || (before.phase === 'night' && !held) ? 'day' : before.phase, napRunning(t), new Date(t));
        const use = em.previewEmergency() ? em.emergencyUnlock() : null;
        await flush();
        if (!!plan !== !!use || (plan && use && plan.pauseNight !== use.pauseNight)) {
          fail('emergency', `phase ${before.phase}, expected ${JSON.stringify(plan)}, got ${JSON.stringify(use)}`);
        }
        if (plan?.pauseNight) {
          spec.pausedKey = before.morningKey;
          // `nextBedtime` in lock-controller.ts: the routine's, armed or not.
          spec.pausedUntil = pauseEndsAt(t);
          // `pauseNightUntil` parks the bedtime picks with any removal already waiting: it starts
          // when the pause ends (the next bedtime, which can be a waiting edit's earlier one).
          for (const r of spec.removals) {
            if (r.list !== 'night' || r.from <= t) continue;
            r.from = Math.min(r.from, spec.pausedUntil);
            delete r.dated;
          }
          count('emergency-night');
        }
        if (plan?.unlockMorning) spec.proofs.push({ key: before.morningKey, kind: 'emergency', at: t, ...timesAt(t) });
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
        rt.saveRoutine(next, new Date(t), lc.inPendingFirstNight(new Date(t)));
        specRoutineEdit(next);
        if (st.getArmedNight()) {
          const result = await lc.armRoutine().catch(() => null);
          // An earlier bedtime armed during an emergency pause ends the pause there
          // (`endPauseAtNextBedtime`): it pauses only tonight. Only once its windows run then.
          const armed = st.getArmedNight();
          if (result === 'armed' && pausedAbs(t) && armed) {
            const ends = pauseEndsAt(t);
            const d = new Date(ends);
            if (ends > t && ends < spec.pausedUntil! && d.getHours() * 60 + d.getMinutes() === armed.bedtime) {
              for (const r of spec.removals) if (r.list === 'night' && r.from > ends) r.from = ends;
              spec.pausedUntil = ends;
              count('emergency-pause-ended-early');
            }
          }
        } else {
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
        rt.saveRoutine(current, new Date(t), lc.inPendingFirstNight(new Date(t)));
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
      // A window the extension ignores (an evening that's off, outside the night in force)
      // changes nothing on the bedtime list, so whatever held it before still does.
      if (device.state.lastWindow !== 'ignore') released.push('night');
      // Windows still armed for an older routine (re-arming waits for a phantom night to pass,
      // then for the next sync) shield at the old times until the app opens and re-arms. Where
      // their night overlaps the routine's, the lock follows them (`asRun` above, `asArmed` in
      // the app); where it doesn't (a switch to or from a night shift) they can shield in what
      // the routine calls day: tolerated, the first sync wakes them. Windows armed for the right
      // routine get no slack.
      // The extension places each window by the armed times and releases only inside the
      // night in force (`locturneWindowNight`, `locturneInsideNightInForce`), so an old window
      // no longer ends a morning nobody proved (native-tests covers it). The lock still isn't
      // required here: an old window can start inside what the routine now in force calls
      // day, which the extension can't know. (A proven morning no longer reads as locked
      // again after an edit: a proof's timing against morning start is judged when saved.)
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
      spec.routines.push({ routine: sc.routine, from: t });
      await armTonight();
      await flush();
      noticeSubscription(true);
    } else {
      rt.saveRoutine(sc.routine);
      spec.routines.push({ routine: sc.routine, from: t });
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
