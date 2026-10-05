import type { Phase } from '../../lib/lock-state.ts';
import { formatPreset } from '../../lib/text.ts';

/**
 * The wake screen's top bar, as Home names the time: "Tonight" from bedtime (a night held,
 * paused or off), "This morning" while the lock waits for proof, "Today" once the apps are up.
 * Pure, so it's tested (`wake-words.test.ts`).
 */
export function wakeLabel(phase: Phase, unlocked: boolean): string {
  if (unlocked || phase === 'day') return 'Today';
  return phase === 'morning' ? 'This morning' : 'Tonight';
}

/**
 * The day's status line under the wake screen's opener: a Block now running is what's asleep,
 * so it leads, as on Home. Otherwise `awake` ("Apps awake until 11 pm."), with a full stop.
 */
export function dayStatus(blockNowUntil: Date | null, awake: string): string {
  const line = blockNowUntil
    ? `Block now: apps asleep until ${formatPreset(blockNowUntil.getHours() * 60 + blockNowUntil.getMinutes())}`
    : awake;
  return line.endsWith('.') ? line : `${line}.`;
}
