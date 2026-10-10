/**
 * Loc's lines on the wake-up screens (docs/VOICE.md: short, deadpan, no exclamation marks,
 * the joke on him). `*word*` is set upright for emphasis. Serious states (a sensor that
 * doesn't work, a permission that's off) say the problem and the fix plainly first.
 *
 * Pure, so the thresholds are tested.
 */
import type { DownstairsStatus } from './downstairs.ts';
import type { Miss, PushupsStatus } from './pushups.ts';

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

/**
 * Push-ups, before Start and while it runs. A missed rep says why first: he's the one keeping
 * count, and a hand over the sensor should hear about it.
 */
export function pushupsLine(
  status: PushupsStatus | 'idle',
  reps: number,
  goal: number,
  miss: Miss | null,
  lifted = false,
): string {
  switch (status) {
    case 'idle':
      return 'Push-ups. Then your apps.';
    case 'walking':
      return 'Carry me somewhere with floor.';
    case 'placing':
      return lifted ? 'Put me back down. I was comfortable.' : 'Face up on the floor. Then get over me.';
    case 'counting':
      if (miss === 'quick') return 'Too quick. That was a hand.';
      if (miss === 'long') return "That's lying down. Push.";
      if (miss === 'moved') return "Don't move me. Move you.";
      if (reps === 0) return "Chest to the phone. I'll count.";
      return reps / goal >= 0.7 ? 'Fine. *Fine.*' : reps / goal >= 0.4 ? 'Halfway. I felt that one.' : 'Down. Up. Again.';
    case 'met':
      return "I'm up. Don't talk to me yet.";
    case 'timedOut':
      return 'Ten minutes and no push-ups. Start again.';
  }
}

/** What he says out loud for a rep: the count, and something at the end. */
export const spokenRep = (reps: number, goal: number) => (reps >= goal ? `${reps}. Fine. I'm up.` : String(reps));

/** Not the morning: nothing to prove yet, or nothing left to prove. */
export const PHASE_LINES = {
  night: 'Shh. Not yet.',
  day: "I'm awake. Technically.",
  off: 'Night off. Nothing to prove.',
} as const;
