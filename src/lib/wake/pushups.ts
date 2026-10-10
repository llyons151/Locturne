/**
 * Push-ups (GAME_PLAN, "Wake-up methods", adopted 2026-10-09): the phone lies face-up on the
 * floor and each rep is counted when the chest covers the proximity sensor and lifts off it
 * again. No camera.
 *
 * The cheat GAME_PLAN names is a hand waved over the sensor from bed. Both of its candidate
 * fixes are in, so the numbers can be tuned on a device:
 * - **Walk first.** After Start the phone has to be carried `walkSteps` steps (getting to the
 *   floor), counted by the pedometer, before anything else counts.
 * - **Flat, still, and in rhythm.** Reps only count while the phone lies face-up within
 *   `maxTiltDeg` and isn't moving, after it has settled there for `settleMs`. A cover has to
 *   last like a push-up (`minNearMs` to `maxNearMs`), and reps come no faster than `minRepMs`.
 *   A phone picked up mid-set pauses the count until it's put back down; the reps done stay.
 *
 * What's left: walk the steps, go back to bed, put the phone on the bedside table and wave
 * slowly. That's work, and it's about what the steps method already trusts.
 *
 * Pure: times are ms. The screen feeds it the step count, motion samples, proximity changes
 * and clock ticks (pushups-watch.ts).
 */

export const PUSHUPS = {
  /** The default target; the routine's `pushupGoal` sets the real one. */
  reps: 10,
  /** Steps carried after Start before the phone is put down. 0 skips the walk. */
  walkSteps: 20,
  /** Face-up within this many degrees counts as flat. */
  maxTiltDeg: 20,
  /** Movement of the phone itself, in g, above which it isn't still. */
  stillG: 0.1,
  /** Flat and still this long before reps count. */
  settleMs: 1_500,
  /** Not flat for this long while counting means it was picked up. */
  liftMs: 600,
  /** A cover shorter than this is a hand passing, not a chest. */
  minNearMs: 250,
  /** A cover longer than this is lying on the phone, not a push-up. */
  maxNearMs: 5_000,
  /** The shortest time between two reps' ends. */
  minRepMs: 900,
  timeoutMs: 10 * 60_000,
} as const;

/** One device-motion reading: `up` is the cosine of the tilt from face-up (1 is flat), `shake` the phone's own acceleration in g. */
export type Motion = { at: number; up: number; shake: number };

export type PushupsStatus =
  /** Carrying the phone to the floor. */
  | 'walking'
  /** Waiting for it to lie flat and still. */
  | 'placing'
  | 'counting'
  | 'met'
  | 'timedOut';

/** Why the last cover didn't count, so Loc can say so. */
export type Miss = 'quick' | 'long' | 'moved';

export type PushupsSession = {
  startedAt: number;
  /** Reps needed. */
  goal: number;
  now: number;
  steps: number;
  reps: number;
  /** When the phone last became flat and still, or null while it isn't. */
  flatSince: number | null;
  /** When it last stopped being flat, while counting, or null. */
  unflatSince: number | null;
  /** The sensor is covered: since when, and whether the phone moved meanwhile. */
  nearSince: number | null;
  spoiled: boolean;
  /** When the last rep counted. */
  lastRep: number | null;
  miss: Miss | null;
  metAt: number | null;
  status: PushupsStatus;
};

const FLAT = Math.cos((PUSHUPS.maxTiltDeg * Math.PI) / 180);

export function startPushups(now: number, goal: number = PUSHUPS.reps): PushupsSession {
  return {
    startedAt: now,
    goal: Math.max(1, Math.round(goal)),
    now,
    steps: 0,
    reps: 0,
    flatSince: null,
    unflatSince: null,
    nearSince: null,
    spoiled: false,
    lastRep: null,
    miss: null,
    metAt: null,
    status: PUSHUPS.walkSteps > 0 ? 'walking' : 'placing',
  };
}

export const isOver = (s: PushupsSession) => s.status === 'met' || s.status === 'timedOut';

export const isFlat = (m: Pick<Motion, 'up' | 'shake'>) => m.up >= FLAT && m.shake < PUSHUPS.stillG;

/** The pedometer's count since Start. It never goes down, whatever a late update says. */
export function addSteps(s: PushupsSession, steps: number, at: number): PushupsSession {
  if (isOver(s)) return s;
  const next = { ...s, now: Math.max(s.now, at), steps: Math.max(s.steps, steps) };
  if (next.status === 'walking' && next.steps >= PUSHUPS.walkSteps) next.status = 'placing';
  return next;
}

export function addMotion(s: PushupsSession, m: Motion): PushupsSession {
  if (isOver(s)) return s;
  const flat = isFlat(m);
  const next = { ...s, now: Math.max(s.now, m.at) };
  if (!flat) {
    next.flatSince = null;
    if (next.nearSince !== null) next.spoiled = true;
  } else if (next.flatSince === null) next.flatSince = m.at;

  if (next.status === 'placing' && next.flatSince !== null && m.at - next.flatSince >= PUSHUPS.settleMs) {
    next.status = 'counting';
    next.unflatSince = null;
    // A cover that began before it settled isn't a rep.
    next.nearSince = null;
  } else if (next.status === 'counting') {
    if (flat) next.unflatSince = null;
    else {
      next.unflatSince ??= m.at;
      if (m.at - next.unflatSince >= PUSHUPS.liftMs) {
        next.status = 'placing';
        next.unflatSince = null;
        next.nearSince = null;
      }
    }
  }
  return next;
}

/** The proximity sensor changed: `near` is covered. A rep is a cover that ends like one. */
export function addProximity(s: PushupsSession, near: boolean, at: number): PushupsSession {
  if (isOver(s)) return s;
  const next = { ...s, now: Math.max(s.now, at) };
  if (near) {
    next.nearSince = next.status === 'counting' ? at : null;
    next.spoiled = false;
    return next;
  }
  const since = next.nearSince;
  next.nearSince = null;
  if (since === null || next.status !== 'counting') return next;

  const held = at - since;
  if (next.spoiled) next.miss = 'moved';
  else if (held < PUSHUPS.minNearMs) next.miss = 'quick';
  else if (held > PUSHUPS.maxNearMs) next.miss = 'long';
  else if (next.lastRep !== null && at - next.lastRep < PUSHUPS.minRepMs) next.miss = 'quick';
  else {
    next.reps += 1;
    next.lastRep = at;
    next.miss = null;
    if (next.reps >= next.goal) {
      next.status = 'met';
      next.metAt = at;
    }
  }
  return next;
}

export function tick(s: PushupsSession, now: number): PushupsSession {
  if (isOver(s)) return s;
  const next = { ...s, now: Math.max(s.now, now) };
  if (next.now - next.startedAt >= PUSHUPS.timeoutMs) next.status = 'timedOut';
  return next;
}

/** 0–1 of the reps needed. */
export const repProgress = (s: PushupsSession) => Math.min(1, s.reps / s.goal);

/** 0–1 of the walk to the floor. */
export const walkProgress = (s: PushupsSession) =>
  PUSHUPS.walkSteps > 0 ? Math.min(1, s.steps / PUSHUPS.walkSteps) : 1;
