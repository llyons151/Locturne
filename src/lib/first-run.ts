/**
 * Firsts: Loc's script for the person's first ever night, first morning and first morning
 * they got up, shown on Home in place of his usual line. And the App Store rating prompt,
 * which asks once, after a morning that worked, never during onboarding.
 *
 * Each first is remembered by the morning it belongs to (`LockState.morningKey`), so it
 * stays up for that whole night or morning, however often Home opens, and never comes back.
 * The flags live in the App Group via `sharedGet`/`sharedSet`, like the rest of our records.
 */
import type { LockState } from './lock-state.ts';
import type { MorningProof } from './morning-proof.ts';
import type { WakeMethod } from './routine.ts';
import { sharedGet, sharedSet } from './screen-time.ts';

export type FirstMoment = 'night' | 'morning' | 'up';

/** The morning key each first was shown on. */
export type FirstRunSeen = Partial<Record<FirstMoment, string>>;

export type FirstLine = {
  /** His line, set big. */
  line: string;
  /** One plain sentence underneath, for the things worth explaining once. */
  note: string;
};

const SEEN_KEY = 'locturne.firstRun';
const REVIEW_KEY = 'locturne.reviewAskedVersion';

/** True when a proof came from actually getting up, not a pass or the emergency unlock. */
export function isWakeProof(proof: Pick<MorningProof, 'kind'> | null): boolean {
  return !!proof && proof.kind !== 'pass' && proof.kind !== 'emergency';
}

/**
 * Pure: which first, if any, Home shows now. A first shows if it has never been seen, or
 * was first seen on this same morning. "Up" needs a real wake-up proof for this morning, so
 * an afternoon install or a night that's off never gets "you did okay".
 */
export function firstMoment(
  state: Pick<LockState, 'phase' | 'morningKey'>,
  proof: Pick<MorningProof, 'kind' | 'morningKey'> | null,
  seen: FirstRunSeen,
): FirstMoment | null {
  const fresh = (moment: FirstMoment) => seen[moment] === undefined || seen[moment] === state.morningKey;
  if (state.phase === 'night') return fresh('night') ? 'night' : null;
  if (state.phase === 'morning') return fresh('morning') ? 'morning' : null;
  if (state.phase === 'day' && proof?.morningKey === state.morningKey && isWakeProof(proof)) {
    return fresh('up') ? 'up' : null;
  }
  return null;
}

/** What getting up means for each method. */
const VERB: Record<WakeMethod, (goal: number) => string> = {
  downstairs: () => 'get downstairs',
  steps: (goal) => `walk ${goal} steps`,
  scan: () => 'scan your code',
};

/** The safety valve for each method, said once so the first morning never feels like a trap. */
const FALLBACK: Record<WakeMethod, (goal: number) => string> = {
  downstairs: (goal) => `No stairs where you are? Walk ${goal} steps instead.`,
  steps: () => 'Steps from before you opened me count. Reopening never resets them.',
  scan: (goal) => `Can’t find the code? Walk ${goal} steps instead.`,
};

/**
 * Pure: his script for a first. Written for VOICE.md: short, flat, on your side. The note
 * adds the one thing Home's status line doesn't already say.
 */
export function firstLine(moment: FirstMoment, routine: { method: WakeMethod; stepGoal: number }): FirstLine {
  if (moment === 'night') {
    return {
      line: 'First night. Phone down. I’m not asking.',
      note: `In the morning they stay asleep until you ${VERB[routine.method](routine.stepGoal)}. Snoozing doesn’t count.`,
    };
  }
  if (moment === 'morning') {
    return {
      line: 'So this is a morning. I hate it.',
      note: FALLBACK[routine.method](routine.stepGoal),
    };
  }
  return {
    line: 'You did okay. Don’t make it weird.',
    note: 'That’s the whole routine. Bedtime, then this again.',
  };
}

export function getFirstRunSeen(): FirstRunSeen {
  return sharedGet<FirstRunSeen>(SEEN_KEY) ?? {};
}

/** Remembers that `moment` was shown on `morningKey`. The first morning seen wins. */
export function markFirstSeen(moment: FirstMoment, morningKey: string): void {
  const seen = getFirstRunSeen();
  if (seen[moment] !== undefined) return;
  sharedSet(SEEN_KEY, { ...seen, [moment]: morningKey });
}

/**
 * Pure: ask for a rating now? Only after a morning that worked (a real wake-up, not a pass
 * or emergency), and at most once per app version. Apple caps it further on its own.
 */
export function shouldAskForReview(
  proof: Pick<MorningProof, 'kind' | 'morningKey'> | null,
  state: Pick<LockState, 'phase' | 'morningKey'>,
  askedVersion: string | null,
  version: string,
): boolean {
  if (state.phase !== 'day' || !proof || proof.morningKey !== state.morningKey) return false;
  return isWakeProof(proof) && askedVersion !== version;
}

export function getReviewAskedVersion(): string | null {
  return sharedGet<string>(REVIEW_KEY) ?? null;
}

export function markReviewAsked(version: string): void {
  sharedSet(REVIEW_KEY, version);
}
