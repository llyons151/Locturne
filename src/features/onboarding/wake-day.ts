/** Which day the first locked morning falls on. Pure, so it's tested on its own (`wake-day.test.ts`). */

export type WakeDay = 'This morning' | 'Later today' | 'Tomorrow';

/**
 * "This morning" when it's already the small hours; "Later today" for afternoon wake-ups.
 * Also today when the whole night is still ahead today (bedtime 01:00 finished at 00:30, or a
 * night shift's 08:00 bedtime finished at 07:00). Minutes since midnight throughout.
 */
export function wakeDayFor({
  bedtime,
  wake,
  now,
  lateNight,
}: {
  bedtime: number;
  wake: number;
  now: number;
  /** Onboarding finished inside the bedtime window (`isInsideBedtime`). */
  lateNight: boolean;
}): WakeDay {
  const today = wake > now && (lateNight || (bedtime < wake && now < bedtime));
  if (!today) return 'Tomorrow';
  return wake >= 12 * 60 ? 'Later today' : 'This morning';
}
