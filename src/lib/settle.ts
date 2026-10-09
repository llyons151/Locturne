/**
 * Holds the latest value until input stops for `delay` ms, then hands only that one on.
 *
 * iOS's compact time picker reports a new date each time one of its wheels settles, so
 * setting 9:45 PM from 11:00 PM by spinning the hour first reports 9:00 PM on the way. Saved
 * as an edit, that in-between bedtime could already govern tonight by the time the minutes
 * land, pushing the time actually picked to tomorrow. Only the final time is saved.
 */
export type Settler<T> = {
  /** A new value: restarts the wait. */
  push: (value: T) => void;
  /** Hands on a held value now (the row is leaving), if there is one. */
  flush: () => void;
};

export const SETTLE_MS = 800;

export function settler<T>(onSettle: (value: T) => void, delay = SETTLE_MS): Settler<T> {
  let held: { value: T } | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const flush = () => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
    if (!held) return;
    const { value } = held;
    held = null;
    onSettle(value);
  };
  return {
    push(value) {
      held = { value };
      if (timer !== null) clearTimeout(timer);
      timer = setTimeout(flush, delay);
    },
    flush,
  };
}
