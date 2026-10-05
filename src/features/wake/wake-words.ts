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

/**
 * The phase the wake screen goes by. A morning nothing holds (`heldPhase` reads it as day:
 * after a lapse's last paid morning) has nothing to prove, so it's day: no stairs, no steps,
 * no "This morning". A night nothing holds stays night here; `NotMorning` says why.
 */
export function wakePhase(phase: Phase, held: Phase): Phase {
  return phase === 'morning' && held !== 'morning' ? 'day' : phase;
}

/** `NotMorning`'s sentence for a night or morning the clock names but nothing holds. */
export function unheldWakeBody(phase: 'night' | 'morning'): string {
  return phase === 'morning'
    ? "Your bedtime apps are already awake this morning, so there's nothing to lift."
    : 'Your bedtime apps are awake tonight, so there is no morning lock to lift.';
}
