/**
 * The Apps tab's words for changes that wait: removals, and the bedtime list parked by an
 * emergency unlock. Pure, so they're tested (`pending-note.test.ts`).
 */

export const clock = (date: Date) => date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

/**
 * "at 11:00 PM", or "tomorrow at 11:00 PM" when that's tomorrow evening (a change made after
 * tonight's bedtime waits for the next night). Midnight, or an after-midnight bedtime, is
 * tomorrow by the date but tonight to a person, so it reads as plain "at 1:00 AM".
 */
export function startsLabel(from: Date, now: Date): string {
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const tomorrowEvening = from.toDateString() === tomorrow.toDateString() && from.getHours() >= 12;
  return tomorrowEvening ? `tomorrow at ${clock(from)}` : `at ${clock(from)}`;
}

/** Removals wait for bedtime (GAME_PLAN): say they're still asleep, and when that ends. */
export function removalNote(starts: Date, now: Date): string {
  return `Apps you removed stay asleep. Your change starts ${startsLabel(starts, now)}.`;
}

/**
 * The bedtime list during an emergency pause, from `pauseWording`: the next night that's on
 * (with its weekday when it isn't the next evening), or none when every night is off. "Tonight"
 * only while it's still the night the unlock was used; after that they're just awake.
 */
export function pauseNote(
  words: { morning: string; resumes: Date | null; weekday: string | null },
  night: boolean,
): string {
  const awake = night
    ? `Awake tonight and ${words.morning} after an emergency unlock.`
    : 'Awake after an emergency unlock.';
  if (!words.resumes) return `${awake} Every night is switched off, so they stay awake.`;
  const at = clock(words.resumes);
  return `${awake} They sleep again at ${words.weekday ? `${at} on ${words.weekday}` : at}.`;
}
