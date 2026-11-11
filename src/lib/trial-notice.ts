/**
 * How a trial's end is named for the reminder notification (notifications.ts). Home used to say it
 * too in the last two days (B4); that's gone (user 2026-11-11): the notification reminds, and
 * Settings → Subscription manages. Pure, so it runs in tests.
 */

/** Before this hour, an end belongs to the night before (as schedule-copy.ts says "Tonight"). */
const NIGHT_ENDS_BEFORE_HOUR = 5;

/**
 * Pure: the day a trial ends, as people count days. A trial started after midnight ends in the
 * small hours a week later: "Sunday" then would read as a day more than there is, so it's
 * "Saturday night".
 */
export function trialEndDay(ends: Date): { day: Date; night: boolean } {
  if (ends.getHours() >= NIGHT_ENDS_BEFORE_HOUR) return { day: ends, night: false };
  return { day: new Date(ends.getFullYear(), ends.getMonth(), ends.getDate() - 1, 12), night: true };
}
