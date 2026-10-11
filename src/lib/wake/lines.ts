/**
 * Loc's lines on the wake-up screens (docs/VOICE.md: short, deadpan, no exclamation marks,
 * the joke on him). `*word*` is set upright for emphasis. Serious states (a sensor that
 * doesn't work, a permission that's off) say the problem and the fix plainly first.
 *
 * Pure, so the thresholds are tested.
 */
import type { DownstairsStatus } from './downstairs.ts';
import type { Hint, Miss, PushupsStatus } from './pushups.ts';

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
 * Push-ups, before Start and while the camera watches. A missed rep says why first: he's the
 * one keeping count. While it goes well he's himself (loc-lines.ts's unhinged register, kept to
 * a bubble's length), a different line every rep, the same one for the same rep every time.
 */
const DURING = [
  'One. Gerald is watching.',
  'Down. Up. Feed the moon.',
  'I am doom. You are push-ups.',
  'Each one wakes an app. Grimly.',
  'Dennis does these with no arms.',
  'Push like the floor owes you money.',
  'I ate a pigeon to watch this.',
  'The possums are taking notes.',
  'Your chest has a deadline.',
  'I would help but I am small.',
] as const;

export function pushupsLine(
  status: PushupsStatus | 'idle',
  reps: number,
  goal: number,
  miss: Miss | null,
  hint: Hint | null = null,
): string {
  switch (status) {
    case 'idle':
      return 'Push-ups. Then your apps.';
    case 'finding':
      if (hint === 'notPlank') return "On the floor. I don't count standing.";
      return reps > 0 ? 'Where did you go. Come back.' : "I can't see you. Back up.";
    case 'counting':
      if (miss === 'shallow') return 'That was a nod. Lower.';
      if (miss === 'quick') return "Slower. I'm a raccoon, I count slow.";
      if (reps === 0) return 'Arms straight. Now go down.';
      if (goal - reps <= 2) return 'Almost. I’m *furious* about it.';
      return DURING[(reps - 1) % DURING.length];
    case 'met':
      return "I'm up. Don't talk to me yet.";
    case 'timedOut':
      return reps > 0 ? `Ten quiet minutes. ${Math.max(0, goal - reps)} left. Start again.` : 'Ten minutes and no push-ups. Start again.';
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
