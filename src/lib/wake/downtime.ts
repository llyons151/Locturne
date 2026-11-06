/**
 * "Step away" (method `downtime`, 2026-11-05): a few steps to show you're out of bed, then a
 * stretch with the apps still asleep, timed from the moment those steps were reached. When the
 * timer ends the apps wake, with Locturne closed too (the end is a one-off DeviceActivity
 * window, `armDowntimeEnd` in screen-time.ts, judged in the monitor extension).
 *
 * The steps count as Walk it off's do (GAME_PLAN, "Core loop"): from the morning start, steps
 * before opening the app included, a fresh count each morning, and reopening never resets it.
 * Once the timer has started it's saved for the morning (`DowntimeRecord`), so nothing later
 * (a reopen, a restart, a pedometer that reads less) moves it.
 *
 * **When the timer starts.** The motion chip keeps a history, so the moment the steps were
 * reached can be found after the fact: steps from the morning start to a time only grow with
 * the time, and a binary search over `CMPedometer` interval queries finds the first minute at
 * which they reached the goal (`findThresholdTime`). When the history can't say (it reads
 * fewer steps than the live count, after a restart, or a query fails), the earliest time known
 * to be reliable is used: the moment the check ran. That's only ever later than the truth, so
 * the apps never wake early.
 *
 * Pure: the caller passes the clock, the pedometer and the store. The same rules run in Swift
 * (`locturneJudgeDowntime`, `locturneFindThreshold` in targets/…/Locturne.swift).
 */

/**
 * The routine's two numbers: a short walk first, counted from the morning start like Walk it
 * off, then the timer in quarter hours (user 2026-11-05: "an hour without your phone in the
 * morning from the time you actually get out of bed"). The steps are fixed, not a setting
 * (user 2026-11-05): 30 is a trip out of the bedroom and back, past what shaking the phone in
 * bed or the pedometer's slow start can reach, and over in seconds so the timer is the point.
 */
export const DOWNTIME_STEPS = 30;
/** The fixed count, under its old name (onboarding and the method options read it). */
export const DEFAULT_DOWNTIME_STEPS = DOWNTIME_STEPS;
export const DOWNTIME_MINUTES_RANGE = { min: 15, max: 120, by: 15 };
export const DEFAULT_DOWNTIME_MINUTES = 60;

/** A saved number outside its wheel (or not a number) reads as the nearest on it, or the default; never 0. */
const onWheel = (value: number | undefined, range: { min: number; max: number }, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value) ? Math.min(range.max, Math.max(range.min, Math.round(value))) : fallback;

/** Always `DOWNTIME_STEPS`: a count saved while it was a setting is ignored. */
export const downtimeStepsOf = (_routine: { downtimeSteps?: number }) => DOWNTIME_STEPS;

export const downtimeMinutesOf = (routine: { downtimeMinutes?: number }) =>
  onWheel(routine.downtimeMinutes, DOWNTIME_MINUTES_RANGE, DEFAULT_DOWNTIME_MINUTES);

/** How finely the search places the moment the steps were reached. */
export const THRESHOLD_RESOLUTION_MS = 60_000;
/** Enough queries for a 16-hour morning at a minute's resolution, with room to spare. */
const MAX_QUERIES = 16;
/** iOS can end a window a little early, as with the nap: the extension accepts its end up to this early. */
export const DOWNTIME_SLACK_MS = 120_000;

/** This morning's timer, saved in the App Group (`locturne.downtime`) for the extensions. */
export type DowntimeRecord = {
  /** `LockState.morningKey` of the morning it belongs to. */
  morningKey: string;
  /** That morning's start, in ms, when the timer was started (for diagnostics). */
  start: number;
  /** When the steps were reached, in ms. The timer runs from here. */
  reachedAt: number;
  /** When the apps wake, in ms: `reachedAt` plus `minutes`. */
  endsAt: number;
  minutes: number;
  /** The step goal it was started under. */
  steps: number;
};

/**
 * Finds the first moment, to `resolution`, at which the steps from `from` reached `goal`, given
 * that they had by `to` (the live count says so). `stepsBetween` is a pedometer query (null when
 * it fails). Never earlier than the truth: the answer is the end of the minute it was found in.
 * If the history doesn't hold the goal by `to` (live steps not saved yet, or lost to a restart),
 * or a query fails, the earliest reliable moment is `to` itself, or the last moment the search
 * had confirmed.
 */
export async function findThresholdTime(
  from: number,
  to: number,
  goal: number,
  stepsBetween: (from: number, to: number) => Promise<number | null>,
  resolution = THRESHOLD_RESOLUTION_MS,
): Promise<number> {
  if (to <= from) return to;
  const total = await safely(stepsBetween, from, to);
  if (total === null || total < goal) return to;
  let lo = from;
  let hi = to;
  for (let asked = 0; hi - lo > resolution && asked < MAX_QUERIES; asked++) {
    const mid = Math.floor((lo + hi) / 2);
    const steps = await safely(stepsBetween, from, mid);
    if (steps === null) break;
    if (steps >= goal) hi = mid;
    else lo = mid;
  }
  return hi;
}

async function safely(query: (from: number, to: number) => Promise<number | null>, from: number, to: number) {
  try {
    const steps = await query(from, to);
    return typeof steps === 'number' && Number.isFinite(steps) ? steps : null;
  } catch {
    return null;
  }
}

/**
 * Pure: the timer for a morning whose steps were reached at `reachedAt`. Clamped into the
 * morning: never before its start (steps before it don't count) nor after `now`.
 */
export function planDowntime(
  morning: { key: string; start: Date },
  reachedAt: number,
  now: number,
  { steps, minutes }: { steps: number; minutes: number },
): DowntimeRecord {
  const reached = Math.min(now, Math.max(morning.start.getTime(), reachedAt));
  return { morningKey: morning.key, start: morning.start.getTime(), reachedAt: reached, endsAt: reached + minutes * 60_000, minutes, steps };
}

/**
 * Pure: the saved timer if it's this morning's, else null. This morning's means its key and a
 * start at or after this morning's start: a morning start moved later since (an edit) or the
 * same date replayed after a flight starts a fresh count, as Walk it off's does. Anything
 * malformed is no timer.
 */
export function downtimeFor(record: DowntimeRecord | null | undefined, morning: { key: string; start: Date }): DowntimeRecord | null {
  if (!record || record.morningKey !== morning.key) return null;
  const { reachedAt, endsAt } = record;
  if (![reachedAt, endsAt].every(Number.isFinite) || endsAt < reachedAt) return null;
  return reachedAt >= morning.start.getTime() ? record : null;
}

/**
 * Where this morning's Step away is:
 * - `walking`: the steps aren't reached yet (or the timer isn't started yet).
 * - `running`: the timer is on. `left` in ms.
 * - `over`: the timer has ended: the apps wake (the next sync, or the extension).
 * - `bedtime`: it would end at or after the next bedtime. Bedtime wins, so they sleep on into
 *   the night, as on any morning that's never proven.
 */
export type DowntimePhase =
  | { kind: 'walking' }
  | { kind: 'running'; endsAt: number; left: number; progress: number }
  | { kind: 'over'; endsAt: number }
  | { kind: 'bedtime'; endsAt: number };

export function downtimePhase(record: DowntimeRecord | null, now: number, nextBedtime: Date | null): DowntimePhase {
  if (!record) return { kind: 'walking' };
  const { endsAt, reachedAt } = record;
  if (nextBedtime && endsAt >= nextBedtime.getTime()) return { kind: 'bedtime', endsAt };
  if (now >= endsAt) return { kind: 'over', endsAt };
  const total = Math.max(1, endsAt - reachedAt);
  return { kind: 'running', endsAt, left: endsAt - now, progress: Math.min(1, Math.max(0, (now - reachedAt) / total)) };
}

/** Is the timer over at `now`, allowing iOS's early end (`DOWNTIME_SLACK_MS`)? */
export const downtimeDue = (record: DowntimeRecord, now: number, slack = 0) => now + slack >= record.endsAt;

/** Whole minutes left, rounded up: "1 min" until it's really over, never "0 min" before. */
export const minutesLeft = (ms: number) => Math.max(0, Math.ceil(ms / 60_000));

/** "1 h 5 min", "45 min", "1 h": the timer's length or what's left, in words. */
export function minutesLabel(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  if (m < 60) return `${m} min`;
  return m % 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m / 60} h`;
}

/** The interval iOS gets for the timer's end: at least 15 minutes long, so it starts in the past when the end is close. */
export function downtimeWindow(endsAt: number, now: number): { start: number; end: number } {
  return { start: Math.min(now, endsAt - 15 * 60_000), end: endsAt };
}
