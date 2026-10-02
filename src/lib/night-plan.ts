/**
 * Splits a night into the short repeating windows iOS monitors. Each window re-applies the
 * night block when it starts, so if iOS misses one start, the next one (at most 45 minutes
 * later) catches it. GAME_PLAN: "Chain DeviceActivity schedules in short intervals".
 *
 * Pure: times are minutes since midnight, like lock-state.ts.
 */

export type NightWindow = {
  /** The DeviceActivity name. Contains the list id so the library picks that list's shield. */
  name: string;
  start: number;
  end: number;
};

/** iOS refuses DeviceActivity intervals shorter than 15 minutes. */
export const MIN_WINDOW = 15;
/** GAME_PLAN's ceiling for one window. */
export const MAX_WINDOW = 45;
/**
 * iOS allows about 20 monitored activities per app. 16 covers a 12-hour night at 45 minutes
 * and leaves one for a nap and three for daily limits (`MAX_LIMITS` in daily-limits.ts).
 */
export const MAX_WINDOWS = 16;

export const WINDOW_PREFIX = 'night-';

const DAY = 24 * 60;

/**
 * Equal windows from bedtime to morning start. A window may cross midnight. Nights longer
 * than MAX_WINDOWS × maxWindow get longer windows rather than more of them. Returns none
 * for a night shorter than MIN_WINDOW.
 */
export function planNightWindows(
  bedtime: number,
  morningStart: number,
  maxWindow: number = MAX_WINDOW,
): NightWindow[] {
  const length = (((morningStart - bedtime) % DAY) + DAY) % DAY;
  if (length < MIN_WINDOW) return [];

  const count = Math.min(MAX_WINDOWS, Math.max(1, Math.floor(length / MIN_WINDOW)), Math.ceil(length / maxWindow));
  const edge = (i: number) => (bedtime + Math.round((i * length) / count)) % DAY;

  return Array.from({ length: count }, (_, i) => ({
    name: `${WINDOW_PREFIX}${i}`,
    start: edge(i),
    end: edge(i + 1),
  }));
}

export function formatMinutes(minutes: number): string {
  const m = ((minutes % DAY) + DAY) % DAY;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}
