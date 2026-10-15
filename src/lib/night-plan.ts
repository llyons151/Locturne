/**
 * Splits a night into the repeating windows iOS monitors. Each window re-applies the night block
 * when it starts, so if iOS misses one start, the next one catches it. GAME_PLAN: "Chain
 * DeviceActivity schedules in short intervals".
 *
 * Front- and back-loaded (user, 2026-10-14; docs/LOCK_V2.md): short windows just after bedtime,
 * where a missed start matters, and in the last hour, where the night hands over to the locked
 * morning and an early riser reaches for the phone; one long window through the middle, when
 * they're asleep. Shields stay up once applied, so the middle needs no re-applying, and nothing
 * else waits for a mid-night start: the emergency pause and looser edits land at the next
 * bedtime. Seven windows at most, which leaves iOS room for app schedules.
 *
 * The monitor extension re-arms nights by itself with the same partition
 * (`locturneNightEdges`); change both together.
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
/** Window edges, in minutes after bedtime. */
const AFTER_BEDTIME = [15, 30, 60, 120];
/** Window edges, in minutes before the morning starts. */
const BEFORE_MORNING = [60, 30];
/** The most windows a night takes: one more than its edges. */
export const MAX_WINDOWS = AFTER_BEDTIME.length + BEFORE_MORNING.length + 1;

export const WINDOW_PREFIX = 'night-';

const DAY = 24 * 60;

/**
 * The night from bedtime to morning start, cut at the edges above. An edge that would leave a
 * window under MIN_WINDOW is skipped, so short nights take fewer windows. A window may cross
 * midnight. None for a night shorter than MIN_WINDOW.
 *
 * `evenWindow` (the screen-time lab's short test nights only): equal windows of at most that
 * many minutes instead, up to MAX_WINDOWS of them.
 */
export function planNightWindows(bedtime: number, morningStart: number, evenWindow?: number): NightWindow[] {
  const length = (((morningStart - bedtime) % DAY) + DAY) % DAY;
  if (length < MIN_WINDOW) return [];
  const cuts = evenWindow === undefined ? loadedCuts(length) : evenCuts(length, evenWindow);
  const edges = [0, ...cuts, length];
  return edges.slice(0, -1).map((offset, i) => ({
    name: `${WINDOW_PREFIX}${i}`,
    start: (bedtime + offset) % DAY,
    end: (bedtime + edges[i + 1]) % DAY,
  }));
}

/** The edges that fit, in order, each leaving at least MIN_WINDOW on both sides. */
function loadedCuts(length: number): number[] {
  const wanted = [...AFTER_BEDTIME, ...BEFORE_MORNING.map((m) => length - m)].sort((a, b) => a - b);
  const cuts: number[] = [];
  let last = 0;
  for (const cut of wanted) {
    if (cut - last >= MIN_WINDOW && length - cut >= MIN_WINDOW) {
      cuts.push(cut);
      last = cut;
    }
  }
  return cuts;
}

function evenCuts(length: number, most: number): number[] {
  const count = Math.min(MAX_WINDOWS, Math.max(1, Math.floor(length / MIN_WINDOW)), Math.ceil(length / most));
  return Array.from({ length: count - 1 }, (_, i) => Math.round(((i + 1) * length) / count));
}

export function formatMinutes(minutes: number): string {
  const m = ((minutes % DAY) + DAY) % DAY;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}
