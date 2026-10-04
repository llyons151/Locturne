/**
 * The in-app trial notice (B4 in docs/ONBOARDING_OPTIMIZATION.md): the paywall promises a
 * reminder before the charge, and a notification can't keep that promise for someone who
 * said no to notifications. So Home says it too, in the same window as the notification.
 *
 * Pure, so it runs in tests. Home reads the trial end from `getTrialEnd()` (notifications.ts);
 * it's cleared when "Remind me" is off, so the notice follows the same switch.
 */

/** Same as notifications.ts's TRIAL_REMINDER_DAYS_BEFORE (kept apart so this stays pure). */
export const TRIAL_NOTICE_DAYS = 2;
const DAY_MS = 24 * 60 * 60 * 1000;

export type TrialNotice = { title: string; detail: string };

/** Calendar days from `now` to `ends`, by local midnight: 0 is today, 1 tomorrow. */
function daysUntil(ends: Date, now: Date): number {
  const a = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const b = new Date(ends.getFullYear(), ends.getMonth(), ends.getDate());
  return Math.round((b.getTime() - a.getTime()) / DAY_MS);
}

/** Pure: the notice to show now, or null outside the last days of the trial. */
export function trialNotice(ends: Date | null, now: Date): TrialNotice | null {
  if (!ends) return null;
  const left = ends.getTime() - now.getTime();
  if (left <= 0 || left > TRIAL_NOTICE_DAYS * DAY_MS) return null;
  const days = daysUntil(ends, now);
  const when =
    days <= 0 ? 'today' : days === 1 ? 'tomorrow' : ends.toLocaleDateString('en-US', { weekday: 'long' });
  return {
    title: `Your free trial ends ${when}.`,
    detail: 'Then the annual plan starts. To cancel, tap Manage subscription. No hard feelings. Some feelings.',
  };
}
