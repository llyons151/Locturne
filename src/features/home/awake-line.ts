/**
 * The day's status line, "Apps awake until 11 pm", shared by Home and the wake screen.
 *
 * The day comes from the clock, so it would name tonight's bedtime even with no night lock
 * (stood down, never bought, Ask to Buy waiting, or arming failed), right above "No
 * subscription, so nothing sleeps". Nothing is scheduled then, so say that instead. The
 * always list is stood down with the rest, so it's only mentioned while it still sleeps.
 *
 * Pure, so it's tested (`awake-line.test.ts`).
 */
export function awakeLine({
  armed,
  stoodDown,
  tonightAt,
}: {
  /** `nightLockArmed()`: a night lock is scheduled (or holding). */
  armed: boolean;
  /** `isStoodDown()`: no subscription, so nothing at all sleeps. */
  stoodDown: boolean;
  /** Tonight's bedtime as a clock label, or null when tonight is off (`nightAt`). */
  tonightAt: string | null;
}): string {
  if (stoodDown) return 'Apps awake. Nothing is scheduled to sleep.';
  if (!tonightAt) return 'Apps awake. Tonight is off.';
  if (!armed) return 'Bedtime apps awake. Nothing is scheduled to sleep. Always-asleep apps still sleep.';
  return `Apps awake until ${tonightAt}`;
}
