/**
 * The step count as shown, a step at a time. CMPedometer's live updates come in batches every
 * couple of seconds (more when the phone is in a pocket), so the raw count sits still and then
 * jumps by a dozen. Shown, each batch is walked out one step at a time over about the time the
 * next one takes to arrive, so the number keeps moving while they walk. It only ever catches
 * up: it never shows a step that hasn't been counted, and the morning is proved on the raw count.
 *
 * Pure: `useSmoothSteps` (hooks/use-smooth-steps.ts) feeds it readings and times (ms).
 */

/** The gap between batches assumed until two have arrived. */
export const FIRST_GAP_MS = 2000;
/** Gaps outside this are clamped: a long stop shouldn't make the next batch crawl. */
const MIN_GAP_MS = 500;
const MAX_GAP_MS = 3000;
/** No step shown faster than this, or slower than this. */
const MIN_TICK_MS = 35;
const MAX_TICK_MS = 600;
/** A jump bigger than this (history after the app was away, the first read) lands at once. */
export const JUMP = 40;

export type Smooth = {
  /** What's on screen. */
  shown: number;
  /** The latest raw count. */
  target: number;
  /** When the latest batch arrived; null until one has since the count started. */
  at: number | null;
  /** The expected time between batches. */
  gap: number;
  /** Time between shown steps while catching up with this batch. */
  tick: number;
};

export function startSmooth(count: number): Smooth {
  return { shown: count, target: count, at: null, gap: FIRST_GAP_MS, tick: MAX_TICK_MS };
}

/** A new raw count arrived. */
export function addReading(s: Smooth, count: number, now: number): Smooth {
  if (count === s.target) return s;
  // Lower (a new morning) or a big jump: show it as it is.
  if (count < s.shown || count - s.shown > JUMP) return { ...startSmooth(count), at: now, gap: s.gap };
  const gap = s.at === null ? s.gap : Math.min(MAX_GAP_MS, Math.max(MIN_GAP_MS, now - s.at));
  const behind = count - s.shown;
  return { ...s, target: count, at: now, gap, tick: Math.min(MAX_TICK_MS, Math.max(MIN_TICK_MS, gap / behind)) };
}

/** How long until the next shown step, or null when caught up. */
export function nextTick(s: Smooth): number | null {
  return s.shown < s.target ? s.tick : null;
}

/** One more step shown. */
export function step(s: Smooth): Smooth {
  return s.shown < s.target ? { ...s, shown: s.shown + 1 } : s;
}
