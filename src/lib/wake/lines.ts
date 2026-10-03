/**
 * Loc's lines on the wake-up screens (docs/VOICE.md: short, deadpan, no exclamation marks,
 * the joke on him). `*word*` is set upright for emphasis. Serious states (a sensor that
 * doesn't work, a permission that's off) say the problem and the fix plainly first.
 *
 * Pure, so the thresholds are tested.
 */
import type { DownstairsStatus } from './downstairs.ts';

/** The steps lines, from VOICE.md's line bank (0, 80, 160 and 200 of 200). */
export function stepsLine(steps: number, goal: number): string {
  if (steps >= goal) return "I'm up. Don't talk to me yet.";
  const done = goal > 0 ? steps / goal : 0;
  if (done >= 0.8) return 'Fine. *Fine.*';
  if (done >= 0.4) return "I can hear you walking. I'm ignoring it.";
  return 'No.';
}

/** Downstairs, before Start and while it runs. `progress` is 0–1 of the height needed. */
export function downstairsLine(status: DownstairsStatus | 'idle', progress: number): string {
  switch (status) {
    case 'idle':
      return 'Downstairs first. Then your apps.';
    case 'waiting':
      return 'Fine. Carry me down.';
    case 'moving':
      return progress >= 0.5 ? 'Almost. Keep going.' : 'Stairs. Wonderful.';
    case 'holding':
      return "Stay there. Don't go back up.";
    case 'met':
      return "I'm up. Don't talk to me yet.";
    case 'timedOut':
      return 'Five minutes and no stairs. Start again.';
    case 'noSignal':
    case 'flat':
      return "Your barometer isn't reading, so I can't tell you went downstairs.";
  }
}

/** Not the morning: nothing to prove yet, or nothing left to prove. */
export const PHASE_LINES = {
  night: 'Shh. Not yet.',
  day: "I'm awake. Technically.",
  off: 'Night off. Nothing to prove.',
} as const;
