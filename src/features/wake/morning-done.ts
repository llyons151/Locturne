/**
 * May the day screens say the morning is done? Only when today's morning really happened:
 * it started today, it's behind us, and a proof (a method, a pass or an emergency unlock)
 * woke it. Otherwise it's a day before the first morning: 00:33 with a 01:00 bedtime (today's
 * 09:00 morning is ahead), 07:03 on a night shift (the 15:00 morning is later today), or an
 * install's first day, when no night held the morning and nothing was proved.
 *
 * Pure, so it's swept over schedules and times of day (`morning-done.test.ts`).
 */
import { currentMorning, dateKey, type LockSettings } from '../../lib/lock-state.ts';

export function morningDoneToday(
  now: Date,
  settings: LockSettings,
  /** `currentProof(now)`: the proof that woke the morning `now` belongs to, or null. */
  proof: { morningKey: string } | null,
): boolean {
  if (!proof) return false;
  const morning = currentMorning(now, settings);
  return proof.morningKey === morning.key && morning.key === dateKey(now) && now >= morning.start;
}

/** The plain sentence under his day line, before the status that follows it. */
export const DAY_OPENER = { done: "This morning's done.", notYet: 'Nothing to wake yet.' } as const;
