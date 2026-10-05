/// <reference types="node" />

/**
 * An honest-user journey fuzzer (round 52): random but realistic weeks of use against the
 * simulated phone (sim-device.ts) and the real lib modules. Unlike bypass-fuzz.test.ts, nobody
 * here attacks the lock: edits are made by day, proofs are walked in the morning (sometimes
 * late, sometimes never), and the odd pass, emergency, Block now, flight, lapse and renewal, and
 * a week with every night off, happen as a real person would do them.
 *
 * The oracle is built from GAME_PLAN, not from the app's code:
 * - every night that's on and paid locks the bedtime apps at its bedtime (a few minutes' slack);
 * - every morning frees on a valid proof (a walk, a pass, an emergency) and not before; a
 *   morning nobody proves stays locked until the next bedtime;
 * - routine and list edits apply no later than the next bedtime after the edit, and a looser
 *   one never earlier;
 * - a bedtime warning comes 15 minutes before each night that locks, a morning note at each
 *   locked morning, and neither for a night or morning that doesn't lock;
 * - Home's status (use-home-state + home-screen's view + awake-line) never says the apps are
 *   awake while the phone shields the bedtime list, or asleep while it doesn't, and the times it
 *   names ("until 11 pm", "after 7 am", "again at 11 pm") are the ones the phone runs.
 *
 * Deterministic. HONEST_SEEDS=<count> (default 30, about 35 s), HONEST_SEED0=<first>, HONEST_SEED=<n> to
 * replay one, HONEST_DEBUG=1 for the action log. Runs each seed in America/New_York,
 * Europe/London and Australia/Sydney (HONEST_ZONES to override, comma-separated).
 *
 * Needs `--experimental-test-module-mocks` (set in the npm test script).
 */
import assert from 'node:assert/strict';
import { mock, test } from 'node:test';

const { prng, simDevice, token, dayKey } = await import('./sim-device.ts');
const device = simDevice();
mock.module('react-native-device-activity', { namedExports: device.exports });
mock.module('react-native', { namedExports: { Platform: { OS: 'web' } } });
mock.module('expo-notifications', {
  namedExports: {
    setNotificationHandler: () => undefined,
    IosAuthorizationStatus: {},
    SchedulableTriggerInputTypes: { DATE: 'date', CALENDAR: 'calendar' },
  },
});
const lc = await import('./lock-controller.ts');
const rt = await import('./routine.ts');
const st = await import('./screen-time.ts');
const dl = await import('./daily-limits.ts');
const em = await import('./emergency.ts');
const ps = await import('./passes.ts');
const nt = await import('./notifications.ts');
const mp = await import('./morning-proof.ts');
const { armTonight } = await import('./arm.ts');
const { awakeLine } = await import('../features/home/awake-line.ts');

type Routine = import('./routine.ts').Routine;
type Rng = ReturnType<typeof prng>;

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const SLACK = 3 * MIN;
const ALL = [0, 1, 2, 3, 4, 5, 6];
const ONLY = process.env.HONEST_SEED;
const SEED0 = Number(ONLY ?? process.env.HONEST_SEED0 ?? 1);
const SEEDS = ONLY ? 1 : Number(process.env.HONEST_SEEDS ?? 30);
const DEBUG = !!process.env.HONEST_DEBUG;
const TRACE = process.env.HONEST_TRACE;
const ZONES = (process.env.HONEST_ZONES ?? 'America/New_York,Europe/London,Australia/Sydney').split(',');
const BASE_TZ = process.env.TZ;

const NORMAL_PAIRS: [number, number][] = [
  [22 * 60, 6 * 60 + 30],
  [22 * 60 + 30, 7 * 60],
  [23 * 60, 7 * 60],
  [23 * 60 + 30, 7 * 60 + 30],
  [0, 8 * 60],
  [30, 8 * 60],
  [60, 9 * 60],
  [2 * 60 + 30, 9 * 60],
  [21 * 60, 5 * 60 + 30],
];
const SHIFT_PAIRS: [number, number][] = [
  [8 * 60, 16 * 60],
  [9 * 60, 17 * 60],
  [3 * 60, 11 * 60],
];
const pickTimes = (r: Rng) => (r.chance(0.15) ? r.pick(SHIFT_PAIRS) : r.pick(NORMAL_PAIRS));

/* ---------- Wall clock, worked out here rather than taken from lock-state.ts ---------- */

/** The first instant whose local wall clock reads at least y-mo-d + minutes (a skipped time: the gap's end). */
function wallInstant(y: number, mo: number, d: number, minutes: number): number {
  const wanted = Date.UTC(y, mo, d, 0, minutes);
  const wall = (t: number) => {
    const x = new Date(t);
    return Date.UTC(x.getFullYear(), x.getMonth(), x.getDate(), x.getHours(), x.getMinutes(), x.getSeconds());
  };
  const naive = new Date(y, mo, d, 0, minutes).getTime();
  if (wall(naive) === wanted) return naive;
  let lo = naive - 4 * HOUR;
  let hi = naive;
  while (hi - lo > 1000) {
    const mid = Math.floor((lo + hi) / 2);
    if (wall(mid) >= wanted) hi = mid;
    else lo = mid;
  }
  return hi;
}

type Night = { S: number; E: number; evening: number; key: string };

/** The night of `r` leading into the morning on local date y-mo-d. */
function nightInto(r: Pick<Routine, 'bedtime' | 'morningStart'>, y: number, mo: number, d: number): Night {
  const E = wallInstant(y, mo, d, r.morningStart);
  let S = r.bedtime < r.morningStart ? wallInstant(y, mo, d, r.bedtime) : wallInstant(y, mo, d - 1, r.bedtime);
  if (S > E) S = E;
  const morning = new Date(y, mo, d);
  return { S, E, evening: new Date(y, mo, d - 1).getDay(), key: dayKey(morning) };
}

/** Nights of `r` around `t` (the current zone), by start. */
function nightsNear(r: Pick<Routine, 'bedtime' | 'morningStart'>, t: number): Night[] {
  const now = new Date(t);
  const out: Night[] = [];
  for (let off = -3; off <= 3; off++) out.push(nightInto(r, now.getFullYear(), now.getMonth(), now.getDate() + off));
  return out.sort((a, b) => a.S - b.S);
}
const latestOf = (r: Routine, t: number) => [...nightsNear(r, t)].reverse().find((n) => n.S <= t) ?? null;
const nextOf = (r: Routine, t: number) => nightsNear(r, t).find((n) => n.S > t) ?? null;
const insideOf = (r: Routine, t: number) => nightsNear(r, t).some((n) => n.S <= t && t < n.E);

const hm = (t: number) => {
  const d = new Date(t);
  return `${d.toString().slice(0, 21)} ${process.env.TZ ?? ''}`;
};
const clock = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

/* ---------- The harness: the app's entry points ---------- */

async function flush() {
  for (let i = 0; i < 6; i++) await new Promise((resolve) => setImmediate(resolve));
}

function drain() {
  while (device.state.queue.length) {
    const e = device.state.queue.shift()!;
    device.fire(e.activity, e.callback);
  }
}

let paid = true;

/** `armIfPaid` (hooks/use-app-start.ts), which needs React to import. */
async function armIfPaid() {
  lc.settleSubscription(paid);
  await flush();
  drain();
  if (!paid || !rt.hasRoutine() || st.getArmedNight() || st.shownSelection('night').size === 0) return;
  await armTonight().catch(() => {});
  await flush();
  drain();
}

/* ---------- One run ---------- */

type Era = { routine: Routine; from: number; editAt: number };
type Settle = { at: number; paid: boolean };
type Unlock = { at: number; kind: string };
type Planned = { kind: string; key: string; parts: [number, number, number, number, number]; date?: number };
type Claim = { madeAt: number; at: number; what: string };
type ListChange = { at: number; inList: boolean; from: number; latest?: number };

class Fail extends Error {}

/** What the runs exercised, printed at the end. */
const coverage: Record<string, number> = {};
const count = (what: string) => (coverage[what] = (coverage[what] ?? 0) + 1);

async function run(seed: number, zone: string): Promise<string | null> {
  // Let anything the last run left running in the background (an arm) finish first.
  for (let i = 0; i < 10; i++) await flush();
  process.env.TZ = zone;
  const r = prng(seed * 7919 + [...zone].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 1000, 0));
  device.reset();
  mock.timers.reset();
  paid = true;

  // When: any day of 2026, a third of runs a few days before a clock change in this zone.
  const changes: number[] = [];
  {
    let prev = new Date(2026, 0, 1).getTimezoneOffset();
    for (let t = new Date(2026, 0, 1).getTime(); t < new Date(2026, 11, 1).getTime(); t += HOUR) {
      const off = new Date(t).getTimezoneOffset();
      if (off !== prev) changes.push(t);
      prev = off;
    }
  }
  const anchor = changes.length && r.chance(0.35) ? r.pick(changes) - r.int(1, 4) * DAY : new Date(2026, 0, 3).getTime() + r.int(0, 320) * DAY;
  const a0 = new Date(anchor);
  const onboardAt = new Date(a0.getFullYear(), a0.getMonth(), a0.getDate()).getTime() + r.int(0, 1439) * MIN + r.int(0, 59) * 1000;
  mock.timers.enable({ apis: ['Date'], now: onboardAt });

  const [b0, m0] = pickTimes(r);
  const R0: Routine = {
    bedtime: b0,
    morningStart: m0,
    activeNights: r.chance(0.7) ? ALL : r.subset(ALL, 4).sort(),
    method: r.pick(['downstairs', 'steps', 'scan'] as const),
    stepGoal: r.pick([100, 200, 300]),
  };
  const days = r.int(7, 14);
  const weekOff = r.chance(0.15);
  const totalDays = days + (weekOff ? 8 : 0);
  const end = onboardAt + totalDays * DAY;

  const log: string[] = [];
  const say = (line: string) => {
    log.push(`${hm(Date.now())} ${line}`);
    if (DEBUG) console.log(log[log.length - 1]);
  };
  const fail = (why: string): never => {
    if (DEBUG) {
      const l = lc.readLock();
      console.log('STATE', JSON.stringify({ phase: l.phase, key: l.morningKey, next: hm(l.nextChange.getTime()), routine: device.get('locturne.routine'), armed: st.getArmedNight(), free: device.get('locturne.freeMorning'), ended: device.get('locturne.subscriptionEndedMorning'), proofs: mp.getProofs().slice(0, 3), held: device.get('locturne.nightHeld'), scheduled }, null, 1));
    }
    throw new Fail(`${zone} seed ${seed}: ${why}`);
  };

  /* What the person did, as the oracle keeps it. */
  const eras: Era[] = [];
  const settles: Settle[] = [];
  const unlocks: Unlock[] = [];
  const snap: ListChange[] = [];
  const news: ListChange[] = [];
  const naps: { start: number; end: number }[] = [];
  const limitEdits: { at: number; minutes: number | null; from: number; latest?: number }[] = [];
  const opens: number[] = [];
  const reschedules: number[] = [];
  let travelledAt: number | null = null;
  let scheduled: Planned[] = [];
  const delivered: { kind: string; key: string; at: number }[] = [];
  let claims: Claim[] = [];
  const checkedNights = new Set<string>();

  const eraAt = (t: number) => {
    let i = -1;
    eras.forEach((e, j) => {
      if (e.from <= t) i = j;
    });
    return i;
  };
  const paidAt = (t: number) => {
    let p = false;
    for (const s of settles) if (s.at <= t) p = s.paid;
    return p;
  };
  const firstPaidIn = (lo: number, hi: number) => settles.find((s) => s.paid && s.at > lo && s.at < hi)?.at ?? null;
  const inList = (changes: ListChange[], t: number, initial: boolean) => {
    let v = initial;
    for (const c of changes) if (c.at <= t) v = c.inList;
    return v;
  };

  /**
   * The latest night to have started by `t` (the current zone): under the routine in force for
   * it, with when its lock may start ([lo, hi]: an earlier bedtime saved by day may sleep the
   * apps early, never later than the edit's bedtime). Null before the first one.
   */
  type Found = { night: Night; routine: Routine; lo: number; hi: number; era: number };
  function latestNight(t: number): Found | null {
    let best: Found | null = null;
    let at = t;
    for (let k = eraAt(t); k >= 0; k--) {
      const e = eras[k];
      const n = latestOf(e.routine, at);
      if (n && (n.S >= e.from || n.E > e.from)) {
        // Onboarding inside a night locks from then; an earlier bedtime saved by day may start
        // its first night early, and must have by the edit's bedtime.
        const straddles = n.S < e.from;
        best = { night: n, routine: e.routine, lo: straddles ? (k === 0 ? e.from : n.S) : n.S, hi: straddles ? e.from : n.S, era: k };
        break;
      }
      at = e.from - 1;
    }
    // A waiting edit's own first night, started early (an earlier bedtime saved by day).
    const j = eraAt(t) + 1;
    if (j > 0 && j < eras.length) {
      const e = eras[j];
      const n = latestOf(e.routine, t);
      if (n && n.S <= t && t < n.E && n.E > e.from && n.S >= e.editAt && (!best || n.S > best.night.S)) {
        best = { night: n, routine: e.routine, lo: n.S, hi: e.from, era: j };
      }
    }
    return best;
  }

  /** The first night to start after `t`, under the routine in force for it. */
  function nextNight(t: number): Found | null {
    let best: Found | null = null;
    for (let k = Math.max(0, eraAt(t)); k < eras.length; k++) {
      const e = eras[k];
      const until = k + 1 < eras.length ? eras[k + 1].from : Infinity;
      for (const n of nightsNear(e.routine, Math.max(t, e.from))) {
        if (n.S <= t || n.S >= until || (n.S < e.from && n.E <= e.from)) continue;
        if (!best || n.S < best.night.S) best = { night: n, routine: e.routine, lo: n.S, hi: Math.max(n.S, e.from), era: k };
      }
    }
    return best;
  }

  type Expect = { state: 'asleep' | 'awake' | 'either'; why: string; found: Found | null; lockFrom?: number; unlockedAt?: number };
  /** The bedtime-only app (insta), from the product rules. */
  function expectNight(t: number): Expect {
    const f = latestNight(t);
    if (!f) return { state: 'awake', why: 'no night yet', found: null };
    const { night: N, routine } = f;
    // Close to a night starting (this one or the next): the windows' slack.
    const next = latestNight(t + SLACK);
    if (t - N.S < SLACK || (next && next.night.S !== N.S)) return { state: 'either', why: 'at a bedtime', found: f };
    // BUG_SWEEP Open ("Stale windows from a routine whose night doesn't overlap the new one"):
    // a new bedtime whose arming waited, with no open since it applied, runs on the old windows.
    if (staleFor(f) && t < N.E + 12 * HOUR) {
      const x = expectNightPlain(t, f);
      return x.state === 'awake' && routine.activeNights.includes(N.evening) ? { ...x, state: 'either' } : x.state === 'asleep' ? { ...x, state: 'either' } : x;
    }
    return expectNightPlain(t, f);
  }

  function staleFor(f: Found): boolean {
    const prev = f.era > 0 ? eras[f.era - 1].routine : null;
    return !!prev && prev.bedtime !== f.routine.bedtime && !opens.some((o) => o >= eras[f.era].from && o <= f.night.S);
  }

  function expectNightPlain(t: number, f: Found): Expect {
    const { night: N, routine } = f;
    if (!routine.activeNights.includes(N.evening)) return { state: 'awake', why: `night ${N.key} is off`, found: f };
    let lo = f.lo;
    let hi = f.hi;
    if (!paidAt(N.S)) {
      const p = firstPaidIn(N.S, N.E);
      if (p === null) return { state: 'awake', why: `night ${N.key} not paid`, found: f };
      lo = Math.max(lo, p);
      hi = Math.max(hi, p + 2 * MIN);
    }
    if (t < lo) return { state: 'awake', why: `before night ${N.key}'s lock`, found: f };
    // A proof or pass (judged when made) or an emergency: awake until the next bedtime after it.
    const u = unlocks.find((x) => x.at >= N.S && x.kind !== 'emergency-nap');
    if (u && t >= u.at) return { state: t - u.at < MIN ? 'either' : 'awake', why: `${u.kind} at ${hm(u.at)}`, found: f, lockFrom: lo, unlockedAt: u.at };
    if (t < hi + 2 * MIN) return { state: 'either', why: `night ${N.key} may start early`, found: f, lockFrom: lo };
    return { state: 'asleep', why: `night ${N.key} (${clock(routine.bedtime)}-${clock(routine.morningStart)}) locked, no proof`, found: f, lockFrom: lo };
  }

  /** The always list's optional app: added and removed by day. Removals wait for the next bedtime. */
  function expectAlwaysApp(t: number, app: 'reddit' | 'news'): 'asleep' | 'awake' | 'either' {
    if (t < onboardAt + 2 * MIN) return 'either';
    if (app === 'news') {
      const last = [...news].reverse().find((c) => c.at <= t);
      if (!last) return 'awake';
      if (last.inList) return t - last.at < MIN ? 'either' : standingPaid(t);
      // Removed: asleep until its bedtime, awake after.
      if (t < last.from - SLACK) return standingPaid(t);
      // The phone swaps the list at the first night window from then (windows are under 45 minutes).
      if (t < (last.latest ?? last.from) + 46 * MIN) return 'either';
      // After that bedtime: awake unless the list waits for an open (nothing armed).
      return (st.getArmedNight() && last.latest === undefined) || opens.some((o) => o >= (last.latest ?? last.from)) ? 'awake' : 'either';
    }
    return standingPaid(t);
  }
  /** What the standing lists do at `t`: asleep while paid; after a lapse, awake once nothing is under way. */
  function standingPaid(t: number): 'asleep' | 'awake' | 'either' {
    if (paidAt(t)) {
      const last = [...settles].reverse().find((s) => s.at <= t)!;
      return t - last.at < MIN ? 'either' : 'asleep';
    }
    const lapse = [...settles].reverse().find((s) => s.at <= t && !s.paid)!;
    // A night or morning under way when the lapse was found finishes first.
    const under = expectNight(lapse.at);
    if (under.state !== 'awake') return 'either';
    return t - lapse.at < MIN ? 'either' : 'awake';
  }

  /** The tightest and loosest daily limit (minutes) that may be in force at `t`. */
  function limitBounds(t: number): [number, number] | null {
    if (!paidAt(t) || travelledAt !== null) return null;
    let inForce = 30;
    let pending = null as { minutes: number; from: number; latest: number } | null;
    const settle = (at: number) => {
      if (pending && at >= pending.latest && opens.some((o) => o >= pending!.latest && o <= at)) {
        inForce = pending.minutes;
        pending = null;
      }
    };
    for (const e of limitEdits) {
      if (e.at > t) break;
      settle(e.at);
      const minutes = e.minutes ?? Infinity;
      if (minutes <= inForce) {
        inForce = minutes;
        pending = null;
      } else pending = { minutes, from: Math.max(e.from, pending?.from ?? 0), latest: Math.max(e.latest ?? e.from, pending?.latest ?? 0) };
    }
    settle(t);
    const p = pending as { minutes: number; from: number } | null;
    if (!p || t < p.from - SLACK) return [inForce, inForce];
    return [Math.min(inForce, p.minutes), Math.max(inForce, p.minutes)];
  }

  /** Never before the midnight after protection was (re)armed: a looser edit's floor (#214). */
  function floorAt(t: number) {
    // Armed afresh: a purchase or renewal, or nights back on after every night was off.
    const rearms = [...settles.filter((x) => x.paid).map((x) => x.at), ...eras.filter((x, i) => i > 0 && eras[i - 1].routine.activeNights.length === 0).map((x) => x.editAt)];
    const last = Math.max(...rearms.filter((x) => x <= t));
    const d = new Date(last);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime();
  }
  /** When a looser edit saved at `t` must apply, and the latest it may (nothing armed: midnight). */
  function looserDue(t: number, list: 'night' | 'always' | 'limit'): { from: number; latest?: number } {
    const F = nextBedtime(t);
    const allOff = [eras[eraAt(t)], pendingEra(t)].every((x) => !x || x.routine.activeNights.length === 0);
    const d = new Date(t);
    const nextMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime();
    if (allOff) return { from: Math.min(F, nextMidnight), latest: Math.max(F, nextMidnight) };
    if (list === 'night') return { from: F };
    return { from: Math.max(F, floorAt(t)) };
  }

  /* ---------- Notifications: iOS keeps what was scheduled last and fires it on the wall clock ---------- */

  function reschedule() {
    const now = new Date();
    const armed = st.getArmedNight();
    const stored = rt.hasRoutine();
    const plan = nt.planNotifications({
      routine: rt.getRoutine(),
      pending: stored ? rt.getPendingRoutine() : null,
      protection: st.getProtection(),
      armed: armed !== null,
      armedTimes: armed,
      routineSince: stored ? rt.getRoutineChange()?.since : null,
      armedSince: armed ? st.armedSince(armed) : null,
      proofs: mp.getProofs(),
      trialEnd: null,
      prefs: nt.DEFAULT_PREFS,
      lastPaidMorning: lc.lastPaidMorning(),
      now,
    });
    scheduled = plan
      .filter((n) => n.kind === 'bedtime' || n.kind === 'morning' || n.kind === 'revoked')
      .map((n) => {
        // What iOS was handed (`triggerFor`): wall-clock parts, or a real instant.
        const trigger = nt.triggerFor(n) as { type: string; date?: Date };
        return {
          kind: n.kind,
          key: n.id.split('.').pop()!,
          parts: [n.at.getFullYear(), n.at.getMonth(), n.at.getDate(), n.at.getHours(), n.at.getMinutes()],
          ...(trigger.type === 'date' && trigger.date ? { date: trigger.date.getTime() } : {}),
        };
      });
    reschedules.push(now.getTime());
  }

  function deliver(t0: number, t1: number) {
    const keep: Planned[] = [];
    for (const n of scheduled) {
      const at = n.date ?? wallInstant(n.parts[0], n.parts[1], n.parts[2], n.parts[3] * 60 + n.parts[4]);
      if (at > t0 && at <= t1) {
        delivered.push({ kind: n.kind, key: n.key, at });
        checkDelivered(n.kind, at);
      } else if (at > t1) keep.push(n);
    }
    scheduled = keep;
  }

  /** A delivered note must be about a night or morning that really locks. */
  function checkDelivered(kind: string, at: number) {
    if (kind === 'revoked') fail(`"Screen Time access is off" at ${hm(at)} with access on`);
    if (kind === 'bedtime') {
      const n = nextNight(at) ?? latestNight(at + 15 * MIN);
      if (n && staleFor(n)) return;
      const e = expectNight(at + 15 * MIN + 5 * MIN);
      if (e.state === 'awake') fail(`"Bedtime in 15 minutes" at ${hm(at)}, but nothing sleeps then (${e.why})`);
      if (e.found && Math.abs(e.found.night.S - (at + 15 * MIN)) > 2 * MIN && Math.abs((e.lockFrom ?? 0) - (at + 15 * MIN)) > 2 * MIN) {
        fail(`"Bedtime in 15 minutes" at ${hm(at)}, but the night starts at ${hm(e.found.night.S)}`);
      }
    } else if (kind === 'morning') {
      const e = expectNight(at + MIN);
      if (e.state === 'awake') fail(`morning note "Your apps stay asleep" at ${hm(at)}, but they're awake (${e.why})`);
    }
  }

  /** Called as the clock passes a night's start + 5 min and its morning start + 1 min. */
  function checkNotesFor(t: number) {
    const e = expectNight(t);
    const f = e.found;
    if (!f || e.state !== 'asleep') return;
    const N = f.night;
    const id = `${N.key}|${N.S}`;
    // The warning: for a night locking at its own bedtime, once Locturne had planned since arming.
    if (!checkedNights.has(`b${id}`) && t >= N.S + 5 * MIN && t < N.S + 30 * MIN && e.lockFrom === N.S && f.lo === f.hi) {
      checkedNights.add(`b${id}`);
      const planned = reschedules.some((r0) => r0 >= onboardAt && r0 < N.S - 15 * MIN);
      const got = delivered.some((d) => d.kind === 'bedtime' && Math.abs(d.at - (N.S - 15 * MIN)) <= 2 * MIN);
      if (planned) count('bedtime warning checked');
      if (planned && !got) fail(`no "Bedtime in 15 minutes" before the locked night ${N.key} at ${hm(N.S)}`);
    }
    if (!checkedNights.has(`m${id}`) && t >= N.E + MIN && t < N.E + 30 * MIN && (e.lockFrom ?? N.S) < N.E) {
      checkedNights.add(`m${id}`);
      const planned = reschedules.some((r0) => r0 >= onboardAt && r0 < N.E && r0 > (e.lockFrom ?? 0) - 12 * HOUR);
      const got = delivered.some((d) => d.kind === 'morning' && Math.abs(d.at - N.E) <= 2 * MIN);
      if (planned) count('morning note checked');
      if (planned && !got) fail(`no morning note at the locked morning ${N.key}, ${hm(N.E)}`);
    }
  }

  /* ---------- The phone's state against the oracle ---------- */

  const asleep = (app: string) => device.state.shielded.has(app);

  const traced = new Map<string, boolean>();
  function checkPhone(t: number) {
    if (TRACE) {
      for (const app of TRACE.split(',')) {
        if (traced.get(app) !== asleep(app)) say(`  [${app} ${asleep(app) ? 'asleep' : 'awake'}] pending ${JSON.stringify(device.get('locturne.pendingLists'))}`);
        traced.set(app, asleep(app));
      }
    }
    const e = expectNight(t);
    const insta = asleep('insta');
    if (e.state === 'asleep' && !insta) fail(`bedtime app awake at ${hm(t)}: ${e.why}`);
    if (e.state === 'awake' && insta) {
      const nap = naps.some((n) => n.start <= t && t < n.end + SLACK);
      if (!nap) fail(`bedtime app asleep at ${hm(t)}: ${e.why}`);
    }
    // An app removed from the bedtime list by day never sleeps from the next bedtime on; one added sleeps with it.
    const snapIn = inList(snap, (e.lockFrom ?? t) - MIN, true) && inList(snap, t, true);
    const snapExp = !snapIn
      ? snap.some((c) => !c.inList && c.at <= t && t < c.from + SLACK)
        ? 'either'
        : 'awake'
      : e.state;
    if (snapExp === 'asleep' && !asleep('snap')) fail(`bedtime app "snap" awake at ${hm(t)}: ${e.why}`);
    if (snapExp === 'awake' && asleep('snap')) fail(`"snap", taken off the bedtime list, asleep at ${hm(t)}`);
    for (const app of ['reddit', 'news'] as const) {
      const x = expectAlwaysApp(t, app);
      if (x === 'asleep' && !asleep(app)) fail(`always app "${app}" awake at ${hm(t)}`);
      if (x === 'awake' && asleep(app)) fail(`always app "${app}" asleep at ${hm(t)} (removed, or no subscription)`);
    }
    // Block now's own app sleeps for exactly the nap.
    const napNow = naps.find((n) => n.start + MIN <= t && t < n.end - MIN && !unlocks.some((u) => u.at >= n.start && u.at <= t && u.kind !== 'proof'));
    const napOver = naps.length && !naps.some((n) => n.start <= t && t < n.end + SLACK);
    if (napNow && paidAt(t) && !asleep('games')) fail(`Block now's app awake at ${hm(t)} during the nap to ${hm(napNow.end)}`);
    if (napOver && asleep('games')) fail(`Block now's app asleep at ${hm(t)} after the nap`);
    // The daily limit: asleep once today's use reaches what's in force, awake below it.
    const bounds = limitBounds(t);
    if (bounds) {
      const d = new Date(t);
      const sinceMidnight = t - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      const used = device.state.usage.get(`${dayKey(d)}|limit-0`) ?? 0;
      if (sinceMidnight > SLACK && sinceMidnight < DAY - SLACK) {
        if (used >= bounds[1] && bounds[1] < Infinity && !asleep('yt')) fail(`limit app awake at ${hm(t)} after ${used} min (limit ${bounds[1]})`);
        if (used < bounds[0] && asleep('yt')) fail(`limit app asleep at ${hm(t)} after ${used} min (limit ${bounds[0]})`);
      }
    }
    // Home's claims whose moment has come.
    claims = claims.filter((c) => {
      if (t < c.at + 5 * MIN) {
        if (c.what === 'awake-until' && t < c.at - SLACK && e.state === 'asleep') fail(`Home said "Apps awake until ${hm(c.at)}" at ${hm(c.madeAt)}, but they're asleep at ${hm(t)}`);
        return true;
      }
      if (t < c.at + 30 * MIN) {
        const x = expectNight(c.at + 5 * MIN);
        if ((c.what === 'awake-until' || c.what === 'sleeps-again') && x.state === 'awake') {
          fail(`Home said ${c.what === 'awake-until' ? '"Apps awake until' : '"They sleep again at'} ${hm(c.at)}" at ${hm(c.madeAt)}, but nothing sleeps then (${x.why})`);
        }
      }
      return false;
    });
    checkNotesFor(t);
  }

  /** Home's view, rebuilt as home-screen.tsx builds it, against what the phone shields. */
  function checkHome(t: number) {
    count('Home checked');
    const now = new Date(t);
    if (st.getProtection() !== 'on') fail(`protection reads ${st.getProtection()} with access on`);
    const lock = lc.readLock(now);
    const pause = lock.phase === 'night' ? em.getNightPause(now) : null;
    const phase = em.heldPhase(lock.phase, now);
    const view = pause ? 'paused' : phase;
    const nap = st.peekNap(now);
    const insta = asleep('insta');
    const routine = lc.routineAt(now);
    if (view === 'night' || view === 'morning') {
      if (!insta) fail(`Home shows "${view}" (apps asleep) at ${hm(t)}, but the bedtime apps are awake`);
      // "Apps asleep until you're up, after 7 am": the morning the phone holds.
      const f = expectNight(t).found;
      if (view === 'night' && f && expectNight(t).state === 'asleep') {
        const E = new Date(f.night.E);
        if (E.getHours() * 60 + E.getMinutes() !== routine.morningStart && f.night.S !== f.night.E) {
          fail(`Home says "after ${clock(routine.morningStart)}" at ${hm(t)}, but this morning starts at ${hm(f.night.E)}`);
        }
      }
      return;
    }
    if (lock.blockNowUntil && nap?.list === 'night') return;
    if (insta && !(nap && nap.list === 'night')) fail(`Home shows "${view}" (apps awake) at ${hm(t)}, but the bedtime apps are asleep`);
    if (view === 'paused' && pause) {
      const words = em.pauseWording(pause, now);
      if (words.resumes) claims.push({ madeAt: t, at: words.resumes.getTime(), what: 'sleeps-again' });
      return;
    }
    if (view !== 'day' || lock.blockNowUntil) return;
    // The day line: "Apps awake until 11 pm".
    const unpaid = lc.subscriptionEnded() && lc.lapseStillCovers(now) === null;
    const tonight = rt.nightAt(lock.nextChange, now);
    const line = awakeLine({
      armed: st.nightLockArmed(),
      stoodDown: st.isStoodDown() || unpaid,
      tonightAt: tonight.on ? 'X' : null,
      alwaysSleeps: false,
    });
    if (line === 'Apps awake until X') claims.push({ madeAt: t, at: tonight.start.getTime(), what: 'awake-until' });
    if (line === 'Apps awake. Tonight is off.') {
      const x = nextNight(t);
      if (x && x.routine.activeNights.includes(x.night.evening) && paidAt(t) && x.night.S - t < 20 * HOUR) {
        fail(`Home says "Tonight is off" at ${hm(t)}, but night ${x.night.key} (${hm(x.night.S)}) is on`);
      }
    }
  }

  /* ---------- Moving the clock ---------- */

  function runTo(to: number) {
    // Native handoff can replace schedules during a callback. Recompute after each instant.
    while (Date.now() < to) {
      const due = device.dueEvents(Date.now(), to);
      if (!due.length) break;
      const batch = due.filter((e) => e.at === due[0].at);
      for (const e of batch) {
        mock.timers.setTime(e.at);
        device.fire(e.activity, e.callback);
        drain();
      }
    }
    mock.timers.setTime(to);
  }

  /** The phone runs with Locturne closed until `to`, checked every five minutes. */
  function advance(to: number) {
    let t = Date.now();
    while (t < to) {
      const u = Math.min(to, t + 5 * MIN);
      runTo(u);
      deliver(t, u);
      checkPhone(u);
      t = u;
    }
  }

  /* ---------- What the person does ---------- */

  async function open(note = 'open') {
    const now = Date.now();
    opens.push(now);
    lc.syncLock();
    drain();
    await st.settleLimitChanges().catch(() => {});
    drain();
    lc.syncLock();
    await flush();
    drain();
    await armIfPaid();
    reschedule();
    claims = claims.filter((c) => c.what !== 'awake-until' || c.madeAt === now);
    if (note) say(TRACE ? `${note} | armed ${JSON.stringify(st.getArmedNight() && [st.getArmedNight()!.bedtime, st.getArmedNight()!.morningStart])} pending ${JSON.stringify(device.get('locturne.pendingLists'))}` : note);
    checkPhone(Date.now());
    checkHome(Date.now());
  }

  /** After any change: Home's earlier claims no longer stand. */
  const changed = () => {
    claims = [];
  };

  async function onboard() {
    device.exports.setFamilyActivitySelectionId({ id: 'night', familyActivitySelection: token(['insta', 'tiktok', 'snap']) });
    settles.push({ at: Date.now(), paid: true });
    eras.push({ routine: R0, from: Date.now(), editAt: Date.now() });
    // `finishSetup`: settle, `saveSetup`, then `runArm`.
    lc.settleSubscription(true);
    const now = new Date();
    rt.saveRoutine(R0, now, lc.inPendingFirstNight(now));
    lc.syncLock(now);
    drain();
    const armed = await armTonight();
    await flush();
    drain();
    reschedule();
    say(`onboarded ${clock(R0.bedtime)}-${clock(R0.morningStart)} nights ${R0.activeNights.join('')} (${armed.status})`);
    // The Apps tab straight after: the always list and a 30-minute limit on yt.
    listEdit('always', ['reddit']);
    device.exports.setFamilyActivitySelectionId({ id: 'limit-0', familyActivitySelection: token(['yt']) });
    const limit = { id: 'limit-0' as const, minutes: 30 };
    await st.armLimit(limit);
    st.saveLimits([limit]);
    drain();
    await open('');
  }

  function listEdit(list: 'night' | 'always', apps: string[]) {
    const draft = st.beginListEdit(list);
    const ids = { ...device.ids() };
    if (apps.length) ids[draft] = token(apps);
    else delete ids[draft];
    device.exports.userDefaultsSet('familyActivitySelectionIds', ids);
    st.finishListEdit(list, lc.looserEditsStartAt(new Date(), list));
    st.reapplyStandingBlocks();
    lc.syncLock();
    drain();
  }

  /** The Routine tab's save. */
  async function commit(next: Routine) {
    const now = new Date();
    rt.saveRoutine(next, now, lc.inPendingFirstNight(now));
    lc.syncLock();
    drain();
    if (st.getArmedNight()) await lc.armRoutine().catch(() => {});
    else await armIfPaid();
    await flush();
    drain();
    reschedule();
  }

  /** Is `t` plainly the day for this person: nothing locked, no bedtime near, under any routine in play? */
  function byDay(t: number, extra: Routine[] = []): boolean {
    const e = expectNight(t);
    if (e.state !== 'awake' || !paidAt(t)) return false;
    const i = eraAt(t);
    const rs = [...eras.slice(Math.max(0, i)).map((x) => x.routine), ...extra];
    for (const rr of rs) {
      if (insideOf(rr, t)) return false;
      const n = nextOf(rr, t);
      if (n && n.S - t < 60 * MIN) return false;
      const l = latestOf(rr, t);
      if (l && t - l.E < 20 * MIN) return false;
    }
    return true;
  }
  const pendingEra = (t: number) => eras.find((x) => x.from > t) ?? null;
  const anythingWaiting = (t: number) =>
    !!pendingEra(t) || snap.some((c) => c.from > t) || news.some((c) => c.from > t) || limitEdits.some((c) => c.from > t);

  /** The next bedtime (by the times, nights off or not) of the routine in force at `t`. */
  const nextBedtime = (t: number) => {
    const i = eraAt(t);
    return nextOf(eras[i].routine, t)!.S;
  };

  async function tryEdit(kind: 'times' | 'nights' | 'method' | 'goal' | 'off' | 'on') {
    const t = Date.now();
    const base = pendingEra(t)?.routine ?? eras[eraAt(t)].routine;
    const next: Routine = { ...base };
    if (kind === 'times') {
      const [b, m] = pickTimes(r);
      next.bedtime = b;
      next.morningStart = m;
    } else if (kind === 'nights') next.activeNights = r.subset(ALL, 3).sort();
    else if (kind === 'method') next.method = r.pick(['downstairs', 'steps', 'scan'] as const);
    else if (kind === 'goal') next.stepGoal = r.pick([100, 200, 300, 500]);
    else if (kind === 'off') next.activeNights = [];
    else next.activeNights = ALL;
    if (!byDay(t, [next])) return false;
    const F = nextBedtime(t);
    // Honest edits only: the new routine has no whole night before the edit applies.
    if (nightsNear(next, t).some((n) => n.S > t && n.E <= F)) return false;
    const pending = pendingEra(t);
    if (pending) eras.splice(eras.indexOf(pending), 1);
    // With nothing armed (every night off) there's no lock to loosen, so an edit applies at once
    // (`applyEdit`): only nights that were off are affected, and the oracle follows it.
    const nothingArmed = !st.getArmedNight() && eras[eraAt(t)].routine.activeNights.length === 0;
    eras.push({ routine: next, from: nothingArmed ? t : F, editAt: t });
    count(`routine edit (${kind})`);
    await commit(next);
    changed();
    await open(`edit ${kind}: ${clock(next.bedtime)}-${clock(next.morningStart)} nights ${next.activeNights.join('')}, from ${hm(F)}`);
    return true;
  }

  async function prove(kind: 'downstairs' | 'steps' | 'scan' | 'pass') {
    const t = Date.now();
    await open('');
    const e = expectNight(t);
    const valid = e.state === 'asleep' && !!e.found && t >= e.found.night.E;
    let accepted: boolean;
    if (kind === 'pass') accepted = ps.spendPass(new Date()) === null;
    else accepted = lc.proveMorning(kind, new Date()) !== null;
    await flush();
    drain();
    reschedule();
    say(`${kind} ${accepted ? 'accepted' : 'refused'} (oracle: ${e.state}, ${e.why})`);
    if (accepted) count(`${kind} accepted`);
    if (valid && !accepted) fail(`a ${kind} at ${hm(t)} was refused in a locked morning (${e.why})`);
    if (accepted && e.state === 'asleep' && !valid) fail(`a ${kind} at ${hm(t)} was accepted at night (${e.why})`);
    if (accepted && (valid || e.state === 'either')) unlocks.push({ at: t, kind: kind === 'pass' ? 'pass' : 'proof' });
    changed();
    checkPhone(Date.now());
    checkHome(Date.now());
  }

  async function emergency() {
    const t = Date.now();
    await open('');
    const e = expectNight(t);
    const use = em.emergencyUnlock(new Date());
    await flush();
    drain();
    reschedule();
    say(`emergency: ${use ? `pause ${use.pauseNight} morning ${use.unlockMorning} until ${use.resumesAt ? hm(use.resumesAt) : '-'}` : 'nothing to lift'} (oracle: ${e.state})`);
    if (e.state === 'asleep' && !(use && use.unlockMorning)) fail(`the emergency unlock at ${hm(t)} lifted nothing while the bedtime apps slept`);
    if (e.state === 'awake' && use && (use.pauseNight || use.unlockMorning)) fail(`the emergency unlock at ${hm(t)} paused a night or morning that wasn't locked (${e.why})`);
    if (use && e.state !== 'awake') count(`emergency ${e.found && Date.now() < e.found.night.E ? 'at night' : 'in the morning'}`);
    if (use && e.state !== 'awake') unlocks.push({ at: t, kind: 'emergency' });
    if (use?.endBlockNow) unlocks.push({ at: t, kind: 'emergency-nap' });
    changed();
    checkPhone(Date.now());
    checkHome(Date.now());
  }

  /* ---------- The weeks ---------- */

  await onboard();
  let passes = 0;
  let emergencies = 0;
  const lapseDay = r.chance(0.2) ? r.int(1, Math.max(1, days - 3)) : -1;
  const renewAfter = r.int(1, 3);
  let lapsedOn = -1;
  const travelDay = r.chance(0.2) ? r.int(1, days - 1) : -1;
  const offDay = weekOff ? r.int(1, Math.max(1, days - 2)) : -1;
  let offFrom = -1;

  try {
    for (let d = 0; d < totalDays && Date.now() < end; d++) {
      // Plan the day from the morning of the routine in force (its next morning start).
      const t = Date.now();
      const i = eraAt(t);
      const routine = (pendingEra(t) ?? eras[i]).routine;
      const coming = nightsNear(routine, t).find((n) => n.E > t + 30 * MIN) ?? nextOf(routine, t)!;
      const M = coming.E;
      const B = nextOf(routine, M)!.S;
      type Act = { at: number; what: string };
      const acts: Act[] = [];
      const add = (at: number, what: string) => acts.push({ at: Math.max(at, t + MIN), what });
      const roll = r.next();
      if (roll < 0.78) add(M + r.int(-25, 120) * MIN, 'proof');
      else if (roll < 0.86) add(M + r.int(180, 600) * MIN, 'proof');
      else if (roll < 0.9 && passes < 2) add(M + r.int(0, 90) * MIN, 'pass');
      // else: never proves this morning.
      add(M + r.int(10, 150) * MIN, 'proof-retry');
      for (let k = r.int(0, 3); k > 0; k--) add(M + r.int(0, Math.max(60, (B - M) / MIN - 30)) * MIN, 'open');
      if (r.chance(0.3)) add(B + r.int(-40, 90) * MIN, 'open');
      if (r.chance(0.03) && emergencies < 2) add(B + r.int(20, 240) * MIN, 'emergency');
      if (r.chance(0.02) && emergencies < 2) add(M + r.int(5, 60) * MIN, 'emergency');
      const dayAt = () => M + r.int(150, Math.max(160, (B - M) / MIN - 90)) * MIN;
      if (r.chance(0.12)) add(dayAt(), 'edit');
      if (r.chance(0.1)) add(dayAt(), 'snap');
      if (r.chance(0.1)) add(dayAt(), 'news');
      if (r.chance(0.06)) add(dayAt(), 'limit');
      for (let k = r.int(0, 2); k > 0; k--) add(dayAt(), 'use');
      if (r.chance(0.12)) add(dayAt(), 'nap');
      if (d === travelDay) add(dayAt(), 'travel');
      if (d === lapseDay) add(r.chance(0.3) ? M + r.int(5, 40) * MIN : dayAt(), 'lapse');
      if (lapsedOn >= 0 && d === lapsedOn + renewAfter) add(dayAt(), 'renew');
      if (d === offDay) add(dayAt(), 'off');
      if (offFrom >= 0 && d === offFrom + 7) add(dayAt(), 'on');
      acts.sort((a, b) => a.at - b.at);
      let proved = false;

      for (const act of acts) {
        advance(act.at);
        const now = Date.now();
        switch (act.what) {
          case 'proof':
          case 'proof-retry': {
            if (act.what === 'proof-retry' && (proved || r.chance(0.5))) break;
            const kind = r.chance(0.8) ? (eras[eraAt(now)].routine.method === 'scan' ? 'scan' : eras[eraAt(now)].routine.method) : 'steps';
            await prove(kind);
            proved = unlocks.some((u) => u.at === now);
            break;
          }
          case 'pass':
            passes++;
            await prove('pass');
            proved = unlocks.some((u) => u.at === now);
            break;
          case 'emergency':
            emergencies++;
            await emergency();
            break;
          case 'open':
            await open();
            break;
          case 'edit':
            await tryEdit(r.pick(['times', 'times', 'nights', 'method', 'goal'] as const));
            break;
          case 'off':
            if (await tryEdit('off')) {
              offFrom = d;
              count('week off');
            }
            else offFrom = -1;
            break;
          case 'on':
            if (!(await tryEdit('on'))) {
              // Try again tomorrow.
              offFrom++;
            }
            break;
          case 'snap':
          case 'news': {
            if (!byDay(now)) break;
            const changes = act.what === 'snap' ? snap : news;
            const was = inList(changes, now, act.what === 'snap');
            const list = act.what === 'snap' ? 'night' : 'always';
            const apps = list === 'night' ? ['insta', 'tiktok', ...(was ? [] : ['snap'])] : ['reddit', ...(was ? [] : ['news'])];
            await open('');
            const due = looserDue(now, list);
            changes.push({ at: now, inList: !was, from: was ? due.from : now, latest: was ? due.latest : undefined });
            count(`${list} list edit`);
            listEdit(list, apps);
            reschedule();
            changed();
            await open(`${list} list ${was ? 'minus' : 'plus'} ${act.what}`);
            break;
          }
          case 'limit': {
            if (!byDay(now)) break;
            const limits = st.getLimits();
            if (!limits.length) break;
            await open('');
            const minutes = r.pick([15, 60, 120, null, 30]);
            const before = limits[0];
            const nowD = new Date();
            const next = dl.editLimit(limits, before.id, minutes, lc.looserEditsStartAt(nowD), nowD);
            const after = next.find((l) => l.id === before.id);
            if (after && after.minutes !== before.minutes) await st.armLimit(after);
            st.saveLimits(next);
            drain();
            const tighter = minutes !== null && minutes <= before.minutes;
            const due = looserDue(now, 'limit');
            count('limit edit');
            limitEdits.push({ at: now, minutes, from: tighter ? now : due.from, latest: tighter ? now : due.latest });
            changed();
            await open(`limit ${minutes}`);
            break;
          }
          case 'use': {
            if (!paidAt(now)) break;
            const m = r.int(5, 40);
            if (device.use('limit-0', m)) {
              drain();
              say(`used yt ${m} min`);
            }
            checkPhone(Date.now());
            break;
          }
          case 'nap': {
            if (!byDay(now) || st.getNap()) break;
            await open('');
            device.exports.setFamilyActivitySelectionId({ id: 'block', familyActivitySelection: token(['games', 'tiktok']) });
            const minutes = r.pick([30, 60, 120]);
            try {
              const nap = await st.startNap('block', minutes);
              naps.push({ start: nap.start, end: nap.end });
              count('Block now');
              lc.syncLock();
              drain();
              changed();
              await open(`Block now ${minutes} min`);
            } catch {
              say('Block now refused');
            }
            break;
          }
          case 'travel': {
            // A real flight, not a teleport: the phone keeps the origin's zone in the air (no
            // network) and takes the destination's on landing. Only flights short enough to fit
            // in a day (New York, London, LA), by day at both ends with no bedtime in between,
            // nothing waiting for a bedtime. Long flights to Sydney cross a whole night, and the
            // date-line flights west are BUG_SWEEP Open ("Travel edges after #175").
            const hours: Record<string, number> = {
              'America/New_York|Europe/London': 7,
              'America/New_York|America/Los_Angeles': 6,
              'Europe/London|America/Los_Angeles': 11,
            };
            const from: string = process.env.TZ!;
            const to = r.pick(['America/New_York', 'Europe/London', 'America/Los_Angeles'].filter((z) => z !== from));
            const h = hours[`${from}|${to}`] ?? hours[`${to}|${from}`];
            if (h === undefined || !byDay(now) || anythingWaiting(now)) break;
            const lands = now + h * HOUR;
            const rr = eras[eraAt(now)].routine;
            if ((nextOf(rr, now)?.S ?? Infinity) < lands + 60 * MIN) break;
            process.env.TZ = to;
            const ok = (nextOf(rr, lands)?.S ?? Infinity) - lands > 60 * MIN && !insideOf(rr, lands) && byDay(lands);
            process.env.TZ = from;
            if (!ok) break;
            say(`flying ${from} -> ${to}, ${h} h`);
            advance(lands);
            process.env.TZ = to;
            if (!byDay(Date.now())) fail('harness: landed outside the day');
            travelledAt = now;
            changed();
            say(`landed in ${to}`);
            count('flight');
            if (r.chance(0.7)) await open();
            break;
          }
          case 'lapse': {
            const e = expectNight(now);
            if (!paidAt(now) || e.state === 'either' || anythingWaiting(now)) break;
            if (e.state === 'awake' && !byDay(now)) break;
            paid = false;
            settles.push({ at: now, paid: false });
            lapsedOn = d;
            count('lapse');
            changed();
            await open('lapse found');
            break;
          }
          case 'renew': {
            if (paidAt(now) || expectNight(now).state !== 'awake') {
              lapsedOn++;
              break;
            }
            // Not byDay (it needs paid): the same day test by hand.
            const i2 = eraAt(now);
            const rr = eras[i2].routine;
            const n = nextOf(rr, now);
            if (insideOf(rr, now) || (n && n.S - now < 60 * MIN)) {
              lapsedOn++;
              break;
            }
            paid = true;
            settles.push({ at: now, paid: true });
            changed();
            if (r.chance(0.5)) {
              // Re-bought through See plans: `finishSetup` saves the same setup again, then arms.
              lc.settleSubscription(true);
              const cur = rt.getPendingRoutine()?.routine ?? rt.getRoutine();
              const nowD = new Date();
              rt.saveRoutine({ ...cur }, nowD, lc.inPendingFirstNight(nowD));
              lc.syncLock(nowD);
              drain();
              await armTonight().catch(() => {});
              await flush();
              drain();
              reschedule();
              await open('re-bought');
            } else await open('renewed');
            lapsedOn = -1;
            count('renewal');
            break;
          }
        }
      }
      // On to the next morning's planning point.
      const nextDay = Math.max(Date.now() + MIN, B + r.int(30, 180) * MIN);
      advance(Math.min(nextDay, end));
    }
  } catch (error) {
    if (error instanceof Fail) {
      const tail = log.slice(-25).join('\n   ');
      return `${error.message}\n   ${tail}`;
    }
    throw error;
  }
  return null;
}

test(`honest-user journeys: ${SEEDS} seeds from ${SEED0} in ${ZONES.join(', ')}`, async () => {
  const fails: string[] = [];
  const kinds = new Map<string, number>();
  for (const zone of ZONES) {
    for (let seed = SEED0; seed < SEED0 + SEEDS; seed++) {
      const why = await run(seed, zone);
      if (why) {
        fails.push(why);
        const kind = why.split('\n')[0].replace(/^.*?seed \d+: /, '').replace(/\d/g, '#').slice(0, 60);
        kinds.set(kind, (kinds.get(kind) ?? 0) + 1);
        if (DEBUG) console.log(why);
      }
    }
  }
  mock.timers.reset();
  device.reset();
  if (BASE_TZ === undefined) delete process.env.TZ;
  else process.env.TZ = BASE_TZ;
  console.log(Object.entries(coverage).sort().map(([k, n]) => `${k}: ${n}`).join('\n'));
  if (fails.length) console.log([...kinds.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${n}× ${k}`).join('\n'));
  assert.equal(fails.length, 0, `${fails.length} of ${SEEDS * ZONES.length} runs broke a promise. First:\n${fails.slice(0, 4).join('\n\n')}`);
});
