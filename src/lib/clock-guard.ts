/**
 * Catches the phone's clock being wound back (Settings → General → Date & Time, Set
 * Automatically off). Without it, setting the date back to yesterday and opening Locturne
 * reads as daytime and wakes the bedtime apps with no wake-up (BUG_SWEEP_2026-10-28).
 *
 * The phone's boot time, worked out as the wall clock minus the time since boot (a clock that
 * runs through sleep and that the person can't set), stays put while the clock runs normally.
 * Winding the wall clock back moves it earlier; a restart only moves it later; time zones and
 * DST never touch it (epoch time doesn't change). So a boot time well earlier than the last one
 * seen means the clock was wound back, and the lock only tightens until it's put right.
 *
 * Pure apart from the reader, which the app sets at start (`setClockReader`): off iPhone and
 * in tests there is none, and nothing is ever judged wound.
 */

/** The wall clock and the time since boot, read together, in ms. */
export type ClockReading = { wall: number; monotonic: number };

/** What's kept between reads. */
export type ClockSeen = {
  /** The boot time last trusted (wall − monotonic), ms. */
  boot: number;
  /** Monotonic time when a wound clock was first seen, while it stays wound. */
  woundSince?: number;
};

/** NTP corrections and drift move the boot time by seconds; only more than this is a wound clock. */
export const WOUND_SLACK_MS = 10 * 60_000;
/**
 * A clock left wound back this long is taken as the new normal: someone who corrected a clock
 * that ran fast must not stay locked out. Long enough that winding back for a morning gains nothing.
 */
export const WOUND_TRUST_AFTER_MS = 12 * 60 * 60_000;

/** Pure: is the clock wound back, and what to keep. */
export function judgeClock(seen: ClockSeen | null, reading: ClockReading): { wound: boolean; seen: ClockSeen } {
  const boot = reading.wall - reading.monotonic;
  if (!Number.isFinite(boot)) return { wound: false, seen: seen ?? { boot: 0 } };
  if (!seen || !Number.isFinite(seen.boot) || boot >= seen.boot - WOUND_SLACK_MS) return { wound: false, seen: { boot } };
  // A restart while wound starts the monotonic clock again: count from here.
  const since = seen.woundSince !== undefined && seen.woundSince <= reading.monotonic ? seen.woundSince : reading.monotonic;
  if (reading.monotonic - since >= WOUND_TRUST_AFTER_MS) return { wound: false, seen: { boot } };
  return { wound: true, seen: { boot: seen.boot, woundSince: since } };
}

let reader: (() => ClockReading | null) | null = null;

/** Set once at app start with the native reading. */
export function setClockReader(read: (() => ClockReading | null) | null): void {
  reader = read;
}

export function readClock(): ClockReading | null {
  try {
    return reader?.() ?? null;
  } catch {
    return null;
  }
}
