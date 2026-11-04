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
 * one keeping count. While it goes well he's himself (loc-lines.ts, from docs/locs-lore, kept to
 * a bubble's length), a different line every rep, the same one for the same rep every time.
 */
const DURING = [
  'One. Gerald is watching. Allegedly.',
  'Down. Up. Very bear of you.',
  'Each one wakes an app.',
  'Good behaviour. I’m counting.',
  'Bears do these. Probably.',
  'Lower than I fish. Low bar.',
  'The grizzly does these. I assume.',
  'Push like you’re getting out early.',
  'I did these in the zoo. Briefly.',
  'I would help but I came out small.',
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
      if (miss === 'quick') return 'Slower. Bears count slow.';
      if (reps === 0) return 'Arms straight. Now go down.';
      if (goal - reps <= 2) return 'Almost. I’m *furious* about it.';
      return DURING[(reps - 1) % DURING.length];
    case 'met':
      return "I'm up. Don't talk to me yet.";
    case 'timedOut':
      return reps > 0 ? `Ten quiet minutes. ${Math.max(0, goal - reps)} left. Keep going.` : 'Ten minutes and no push-ups. Start again.';
  }
}

/** Squats, the same way (wake/squats.ts): standing, not on the floor. */
const DURING_SQUATS = [
  'One. Gerald is watching. Allegedly.',
  'Sit. Stand. Very bear of you.',
  'Each one wakes an app.',
  'I squat to fish. You squat for apps.',
  'Bears sit like this. Probably.',
  'Knees out. I read that somewhere.',
  'Good behaviour. I’m counting.',
  'The grizzly does these. I assume.',
  'I did these in the zoo. For snacks.',
  'Up like you’re getting out early.',
] as const;

export function squatsLine(
  status: PushupsStatus | 'idle',
  reps: number,
  goal: number,
  miss: Miss | null,
  hint: Hint | null = null,
): string {
  switch (status) {
    case 'idle':
      return 'Squats. Then your apps.';
    case 'finding':
      if (hint === 'notStanding') return "Stand up. I don't count lying down.";
      return reps > 0 ? 'Where did you go. Come back.' : "I can't see your legs. Back up.";
    case 'counting':
      if (miss === 'shallow') return 'That was a curtsy. Lower.';
      if (miss === 'quick') return 'Slower. Bears squat slow.';
      if (reps === 0) return 'Stand tall. Now sit back.';
      if (goal - reps <= 2) return 'Almost. I’m *furious* about it.';
      return DURING_SQUATS[(reps - 1) % DURING_SQUATS.length];
    case 'met':
      return "I'm up. Don't talk to me yet.";
    case 'timedOut':
      return reps > 0 ? `Ten quiet minutes. ${Math.max(0, goal - reps)} left. Keep going.` : 'Ten minutes and no squats. Start again.';
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
