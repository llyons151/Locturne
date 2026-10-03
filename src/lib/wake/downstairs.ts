/**
 * "Go downstairs": did the phone change floors? Fed barometer samples, it says when the
 * height has moved far enough, for long enough, to count (docs/DOWNSTAIRS_METHOD.md §2).
 *
 * iOS's `CMAltimeter` (expo-sensors `Barometer`, `relativeAltitude`) reports height in metres
 * relative to when the session started. A floor is about 2.6–3.3 m. The rules:
 * - **Threshold:** a change of at least 2.5 m from the starting height, up or down. Someone
 *   who sleeps downstairs and walks up has left bed too.
 * - **Held about 5 s.** Door slams and air conditioning nudge the pressure for a moment;
 *   a brief spike never lasts five seconds.
 * - **Smoothed:** each reading is the median of the last 2 s, so one bad sample can't start
 *   or break a hold.
 * - **Hysteresis:** once past 2.5 m, the hold only breaks below 2.1 m, so a 2.6 m staircase
 *   with ±0.3 m of sensor noise still finishes.
 * - **Up to 5 minutes,** then start again. That also bounds weather drift, which is about
 *   0.2 m over two minutes in normal weather and 0.5 m in a storm: far below a floor.
 * - **No signal or a flat line** (no readings, or readings that never move by even a
 *   millimetre, which a working sensor always does) is reported, so the screen can say so
 *   and offer steps instead (GAME_PLAN: never leave someone stuck).
 *
 * Pure: times are ms, heights metres. The screen feeds it samples and clock ticks.
 */

export const DOWNSTAIRS = {
  threshold: 2.5,
  /** The hold breaks only below this, once it has started. */
  release: 2.1,
  holdMs: 5_000,
  timeoutMs: 5 * 60_000,
  /** Median window for smoothing. */
  smoothMs: 2_000,
  /** The starting height is the median of the readings in this first stretch. */
  baselineMs: 1_000,
  /** No reading at all for this long after Start means the sensor isn't answering. */
  noSignalMs: 6_000,
  /** A sensor that hasn't moved by `flatRange` metres in this long is stuck. */
  flatMs: 30_000,
  flatRange: 0.001,
  /** Readings needed before calling it flat, so a slow sensor isn't judged on three. */
  flatSamples: 10,
} as const;

export type Sample = { at: number; altitude: number };

export type DownstairsStatus =
  /** Started; the height hasn't moved much yet. */
  | 'waiting'
  /** On the way: some height change, not enough yet. */
  | 'moving'
  /** Past the threshold, holding for the 5 seconds. */
  | 'holding'
  | 'met'
  | 'timedOut'
  /** No readings arrived. */
  | 'noSignal'
  /** Readings arrive but never change: a stuck sensor. */
  | 'flat';

export type DownstairsSession = {
  startedAt: number;
  now: number;
  /** Recent readings, newest last, enough for the smoothing window. */
  recent: Sample[];
  /** Readings in the baseline stretch, until the baseline is fixed. */
  opening: number[];
  baseline: number | null;
  /** Current smoothed change from the baseline, in metres (negative is down). */
  change: number;
  /** The largest smoothed change so far, either direction, in metres. */
  peak: number;
  /** When the current hold began, and which way it went. */
  heldSince: number | null;
  direction: 1 | -1 | 0;
  count: number;
  min: number;
  max: number;
  metAt: number | null;
  status: DownstairsStatus;
};

export function startDownstairs(at: number): DownstairsSession {
  return {
    startedAt: at,
    now: at,
    recent: [],
    opening: [],
    baseline: null,
    change: 0,
    peak: 0,
    heldSince: null,
    direction: 0,
    count: 0,
    min: Infinity,
    max: -Infinity,
    metAt: null,
    status: 'waiting',
  };
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Works out the status from the session's facts at `s.now`. */
function judge(s: DownstairsSession): DownstairsStatus {
  if (s.metAt !== null) return 'met';
  const elapsed = s.now - s.startedAt;
  if (s.count === 0) return elapsed >= DOWNSTAIRS.noSignalMs ? 'noSignal' : 'waiting';
  if (
    elapsed >= DOWNSTAIRS.flatMs &&
    s.count >= DOWNSTAIRS.flatSamples &&
    s.max - s.min < DOWNSTAIRS.flatRange
  )
    return 'flat';
  if (s.heldSince !== null) return 'holding';
  if (elapsed >= DOWNSTAIRS.timeoutMs) return 'timedOut';
  return Math.abs(s.change) >= DOWNSTAIRS.threshold * 0.2 ? 'moving' : 'waiting';
}

/** A barometer reading. Readings after the session has ended are ignored. */
export function addSample(session: DownstairsSession, sample: Sample): DownstairsSession {
  if (isOver(session) || !Number.isFinite(sample.altitude)) return tick(session, sample.at);
  const at = Math.max(sample.at, session.now);
  const s: DownstairsSession = {
    ...session,
    now: at,
    count: session.count + 1,
    min: Math.min(session.min, sample.altitude),
    max: Math.max(session.max, sample.altitude),
    recent: [...session.recent, { at, altitude: sample.altitude }].filter(
      (r) => r.at > at - DOWNSTAIRS.smoothMs,
    ),
  };

  // Fix the starting height from the first second of readings.
  if (s.baseline === null) {
    s.opening = [...session.opening, sample.altitude];
    if (at - session.startedAt >= DOWNSTAIRS.baselineMs || s.opening.length >= 3) {
      s.baseline = median(s.opening);
    }
    s.status = judge(s);
    return s;
  }

  s.change = median(s.recent.map((r) => r.altitude)) - s.baseline;
  s.peak = Math.max(session.peak, Math.abs(s.change));
  const size = Math.abs(s.change);
  const sign = s.change >= 0 ? 1 : -1;

  if (s.heldSince === null) {
    if (size >= DOWNSTAIRS.threshold && at - s.startedAt < DOWNSTAIRS.timeoutMs) {
      s.heldSince = at;
      s.direction = sign;
    }
  } else if (size < DOWNSTAIRS.release || sign !== s.direction) {
    s.heldSince = null;
    s.direction = 0;
  } else if (at - s.heldSince >= DOWNSTAIRS.holdMs) {
    s.metAt = at;
  }

  s.status = judge(s);
  return s;
}

/**
 * The clock moved without a reading: for timeouts and a silent sensor. Only a reading can
 * finish a hold, so a sensor that stops mid-hold never counts as met.
 */
export function tick(session: DownstairsSession, now: number): DownstairsSession {
  const s = { ...session, now: Math.max(now, session.now) };
  s.status = judge(s);
  return s;
}

/** True once nothing more can happen in this session (met, timed out, or no usable sensor). */
export function isOver(session: DownstairsSession): boolean {
  return session.status === 'met' || session.status === 'timedOut' || session.status === 'flat';
}

/** 0–1: how far towards the threshold the height has moved, for the meter. */
export function heightProgress(session: DownstairsSession): number {
  return Math.min(1, Math.abs(session.change) / DOWNSTAIRS.threshold);
}

/** 0–1: how much of the five-second hold is done. */
export function holdProgress(session: DownstairsSession): number {
  if (session.metAt !== null) return 1;
  if (session.heldSince === null) return 0;
  return Math.min(1, (session.now - session.heldSince) / DOWNSTAIRS.holdMs);
}
