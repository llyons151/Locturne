/**
 * The "walk it off" count: steps since morning start, from two sources.
 *
 * - **History.** `CMPedometer` keeps a week of steps on the motion chip, so steps walked
 *   with Locturne closed count (GAME_PLAN: "Steps count from the morning start time").
 *   Read when the screen opens and again every so often.
 * - **Live.** While the screen is open, `watchStepCount` reports steps since it subscribed,
 *   a batch every couple of seconds, so the number moves as they walk.
 *
 * The live steps are also in the next history read, so the two are never added: the count is
 * whichever source says more, never their sum.
 *
 * **Anti-shake, kept light on purpose.** CMPedometer is the real filter: its step detection
 * already ignores most shaking. On top of it this only refuses what no person walks: more
 * than `MAX_CADENCE` steps a second on average since the screen opened (plus a small
 * allowance for a batch arriving early). Anything faster is dropped, not banked, and counted
 * in `refused` so Loc can comment one day. Fast walking is about 2 steps a second and running
 * about 3, so honest mornings are never touched. It won't stop someone shaking the phone at a
 * walking rhythm for a minute or two; that's what downstairs is for, and it's not worth
 * punishing real walkers to chase.
 *
 * Pure: the screen passes in readings and times (ms).
 */

/** Steps a second. A sprint is about 3.5; shaking a phone by hand easily reaches 5 or more. */
export const MAX_CADENCE = 4;
/** Steps allowed above the cadence cap, for a batch that lands just ahead of the clock. */
const BURST = 8;

export type StepCount = {
  goal: number;
  /** Steps from morning start until the screen opened, from history. */
  base: number;
  /** Plausible live steps since the screen opened. */
  live: number;
  /** The live watcher's own running total at the last update. */
  lastRaw: number;
  openedAt: number;
  /** The latest history read since morning start, after the same plausibility cap. */
  history: number;
  /** Live steps dropped as implausibly fast. */
  refused: number;
  /**
   * Steps walked while the live watcher was off (the app in the background), banked from the
   * first history read after it restarted. Without them, live steps after a return wouldn't
   * move the number until they outran the history read.
   */
  away: number;
  /** The watcher restarted and the next history read should bank what it missed. */
  catchUp: boolean;
  /**
   * The history read on open succeeded, so `base` holds the steps walked before opening.
   * False after a failed read: the first history read that works sets `base` instead.
   */
  baseKnown: boolean;
};

/**
 * Starts the count from the history read on open (`steps` since morning start). `baseKnown`
 * false: that read failed, and `steps` is a stand-in 0 until one works.
 */
export function startCount(goal: number, steps: number, at: number, baseKnown = true): StepCount {
  const base = Math.max(0, Math.floor(steps));
  return { goal, base, live: 0, lastRaw: 0, openedAt: at, history: base, refused: 0, away: 0, catchUp: false, baseKnown };
}

/** Most steps a person could walk between two times, with the burst allowance. */
const plausible = (fromMs: number, toMs: number) =>
  Math.floor(MAX_CADENCE * (Math.max(0, toMs - fromMs) / 1000)) + BURST;

/** A live update: `raw` is `watchStepCount`'s total since it subscribed. */
export function addLive(count: StepCount, raw: number, at: number): StepCount {
  const delta = Math.max(0, raw - count.lastRaw);
  const room = Math.max(0, plausible(count.openedAt, at) - count.live);
  const credited = Math.min(delta, room);
  return {
    ...count,
    live: count.live + credited,
    lastRaw: Math.max(raw, count.lastRaw),
    refused: count.refused + (delta - credited),
  };
}

/**
 * A fresh history read (steps since morning start, up to `at`). It may only add what could
 * have been walked since the screen opened, so the same cadence cap applies to it.
 */
export function addHistory(count: StepCount, steps: number, at: number): StepCount {
  // The read on open failed: this is the first that worked, and it holds every step walked
  // before opening, which the cap since opening would hand back only at walking pace. The
  // live steps since opening are in it too, so they come off the base.
  if (!count.baseKnown) {
    const history = Math.max(count.history, Math.floor(steps));
    return { ...count, base: Math.max(0, history - count.live), history, catchUp: false, baseKnown: true };
  }
  const capped = Math.min(Math.floor(steps), count.base + plausible(count.openedAt, at));
  const history = Math.max(count.history, capped);
  // Only right after a restart: on ordinary reads, live steps the history already holds
  // would be counted twice.
  const away = count.catchUp ? Math.max(count.away, history - count.base - count.live) : count.away;
  return { ...count, history, away, catchUp: false };
}

export function stepsOf(count: StepCount): number {
  return Math.max(count.base + count.away + count.live, count.history);
}

export function stepsLeft(count: StepCount): number {
  return Math.max(0, count.goal - stepsOf(count));
}

export function isWalked(count: StepCount): boolean {
  return stepsOf(count) >= count.goal;
}

/** The live watcher restarted (it counts from zero again); keep what was credited. */
export function restartLive(count: StepCount): StepCount {
  return { ...count, lastRaw: 0, catchUp: true };
}
