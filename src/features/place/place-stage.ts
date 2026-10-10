/**
 * The place screen's stages and Loc's words for each. Pure, so it's tested
 * (`place-stage.test.ts`); the screen passes in what it read from the lock.
 */
import type { Phase } from '../../lib/lock-state.ts';
import { PLACE_RADIUS_M } from '../../lib/place-spot.ts';
import { morningName, type NextMorning } from '../scan/next-morning.ts';
import type { Candidate, NoFix } from './locate.ts';

export type Stage =
  /** Morning: get there, then check in. */
  | { kind: 'morning' }
  | { kind: 'checking' }
  | { kind: 'notThere'; distance: number }
  | { kind: 'unsure' }
  | { kind: 'noFix'; why: NoFix }
  | { kind: 'unlocked'; morningKey: string }
  | { kind: 'notYet' | 'awake' | 'noPlace' | 'asleep' | 'saved' }
  /** Setup: search, or use where they're standing. */
  | { kind: 'pick' }
  | { kind: 'confirm'; candidate: Candidate; source: 'here' | 'search' };

/** The morning's own stages, which only make sense while the morning still wants a check. */
const MORNING_KINDS = new Set<Stage['kind']>(['morning', 'checking', 'notThere', 'unsure', 'noFix']);

/**
 * Reconcile an open place flow with the live lock, as `liveScanStage` does: a setup draft is
 * refused from bed, a saved place stays saved, and a morning stage lasts only while the
 * morning does.
 */
export function livePlaceStage(
  stored: Stage,
  initial: Stage,
  lock: { phase: Phase; morningKey: string },
  editRefused: boolean,
): Stage {
  if (stored.kind === 'unlocked') {
    return lock.phase === 'day' && lock.morningKey === stored.morningKey ? stored : initial;
  }
  if (MORNING_KINDS.has(stored.kind)) return initial.kind === 'morning' ? stored : initial;
  if (stored.kind === 'saved') return stored;
  if (stored.kind === 'pick' || stored.kind === 'confirm') return editRefused ? { kind: 'asleep' } : stored;
  return initial;
}

/** "350 m", "1.2 km", or "400 ft", "1.3 mi" where miles are the norm. */
export function formatDistance(meters: number, imperial: boolean): string {
  if (imperial) {
    const feet = meters * 3.28084;
    if (feet < 1000) return `${Math.max(50, Math.round(feet / 50) * 50)} ft`;
    const miles = meters / 1609.344;
    return `${miles < 10 ? miles.toFixed(1) : Math.round(miles)} mi`;
  }
  if (meters < 1000) return `${Math.max(10, Math.round(meters / 10) * 10)} m`;
  const km = meters / 1000;
  return `${km < 10 ? km.toFixed(1) : Math.round(km)} km`;
}

export type WordsContext = {
  /** The saved place's name, or null with none. */
  place: string | null;
  /** `awakeStatus` of the live lock, for the unlocked stage. */
  awake: string;
  /** The next morning the lock holds (`nextLockedMorning`). */
  next: NextMorning;
  /** "7:00", the morning start. */
  morningStart: string;
  stepGoal: number;
  imperial: boolean;
  now: Date;
};

/** Loc's line and the plain sentence under it, per stage. */
export function placeWords(stage: Stage, ctx: WordsContext): { line: string; body: string } {
  const place = ctx.place ?? 'your place';
  switch (stage.kind) {
    case 'morning':
      return { line: 'Go on then. Out.', body: `Get to ${place}, then tap Check in. Only there counts.` };
    case 'checking':
      return { line: 'Hold on. Looking.', body: 'Checking where you are. Just this once.' };
    case 'notThere':
      return {
        line: 'This isn’t it.',
        body: `You’re about ${formatDistance(stage.distance, ctx.imperial)} from ${place}. Keep going.`,
      };
    case 'unsure':
      return {
        line: 'Can’t tell yet.',
        body: 'Your location is too fuzzy to count. Step outside or near a window and try again.',
      };
    case 'noFix':
      if (stage.why === 'denied')
        return {
          line: 'I can’t see where you are.',
          body: `Locturne needs location While Using the App to check you’re there. Turn it on in Settings, or walk ${ctx.stepGoal} steps instead.`,
        };
      if (stage.why === 'off')
        return {
          line: 'Location is off.',
          body: `Location Services are off on this phone. Turn them on in Settings, or walk ${ctx.stepGoal} steps instead.`,
        };
      return { line: 'Nothing yet.', body: 'Your phone didn’t find you in time. Try again, ideally outside.' };
    case 'unlocked':
      return { line: 'I’m up. Don’t talk to me yet.', body: ctx.awake };
    case 'notYet':
      return { line: 'Shh. Still bedtime.', body: `Checking in works from ${ctx.morningStart}. Bedtime wins until then.` };
    case 'awake':
      return { line: 'They’re already up.', body: awakeBody(ctx.next, ctx.now) };
    case 'noPlace':
      return {
        line: 'There is no place.',
        body: 'You can pick one in the day, once you’re up. Until then, your usual way still works.',
      };
    case 'asleep':
      return {
        line: 'Not from bed.',
        body: 'You can pick or change your place in the day, once you’re up. Otherwise I’d let you pick your pillow.',
      };
    case 'pick':
      return {
        line: 'Where are we going?',
        body: 'Somewhere that isn’t home: the gym, campus, the café. In the morning your apps wake once you’re there.',
      };
    case 'confirm': {
      const radius = formatDistance(PLACE_RADIUS_M, ctx.imperial);
      const where = stage.candidate.address ? `${stage.candidate.address}. ` : '';
      return stage.source === 'here'
        ? { line: 'Here? Fine.', body: `${where}Anywhere within about ${radius} counts. Only pick this if you’re at your place now, not at home.` }
        : { line: 'That one?', body: `${where}Anywhere within about ${radius} counts.` };
    }
    case 'saved':
      return { line: 'Fine. That’s the place.', body: savedBody(ctx.next, ctx.now) };
  }
}

/** With the apps already up: which morning wants a check-in next. */
export function awakeBody(morning: NextMorning, now: Date): string {
  if (morning === 'unscheduled') return 'Nothing is scheduled to sleep, so there’s nowhere to be.';
  if (!morning) return 'Every night is off, so there’s nowhere to be.';
  return `Nowhere to be until ${morningName(morning, now)}.`;
}

/** Setup's last words once a place is saved: the morning it's first wanted. */
export function savedBody(morning: NextMorning, now: Date): string {
  if (morning === 'unscheduled') return 'Nothing is scheduled to sleep yet. When it is, get there in the morning and your apps wake up.';
  if (!morning) return 'Every night is off. When one’s on, get there to wake your apps.';
  const name = morningName(morning, now);
  return `${name[0].toUpperCase()}${name.slice(1)}, get there and check in. Your apps wake up.`;
}
