/**
 * Where you are in onboarding and how you move: next, back, editing a choice and returning,
 * and the answers collected on the way. Pure (a reducer), so the edit paths are tested in
 * navigation.test.ts; onboarding-flow.tsx runs it with `useReducer` and does the side effects
 * (analytics, the advance timer, marking the exit offer shown).
 */
import type { Answers } from './content.ts';

/** Every step, in order. Two side steps aren't in it: `declined` (the paywall exit) and `under-13`. */
export const STEPS = [
  'hello',
  'deal',
  'nights',
  'night-minutes',
  'nights-per-week',
  'morning-minutes',
  'stat',
  // Attribution sits mid-quiz, at the break after the statistic, so it doesn't stall the
  // build-up to the reveal.
  'found',
  'age',
  'alarm',
  'tried',
  'tried-echo',
  'time-back',
  'math',
  'reveal',
  'bedtime',
  'wake',
  'method',
  // See it, then try it: the demo shows tomorrow morning, then the walk is a 20-step taste of
  // it. Skipped late at night (`skip` on `next`), when they're in bed (ONBOARDING_OPTIMIZATION §7).
  'tomorrow',
  'walk',
  'screen-time',
  'apps',
  'ready',
  'commit',
  'offer',
  'plans',
  'armed',
  'first-morning',
] as const;

export type StepId = (typeof STEPS)[number] | 'declined' | 'under-13';

/**
 * Steps that can be edited and then return: `bedtime`, `wake` and `apps` from the "Tonight's
 * lock is ready" summary, and `method` from the walk ("Pick another way" when there's no
 * step counter).
 */
export const EDITABLE: StepId[] = ['bedtime', 'wake', 'method', 'apps'];

/** Screens that move on by themselves. Back steps over them. */
export const AUTO_ADVANCE: StepId[] = ['math'];

export type Nav = {
  /** Every step shown, oldest first; the last is on screen. Never empty. */
  history: StepId[];
  answers: Answers;
  /** Set while editing a choice, so Continue returns to the step it was edited from. */
  returnTo: StepId | null;
  /** The answers before that edit, so Back cancels it instead of keeping half a change. */
  beforeEdit: Answers | null;
};

export type NavAction =
  /** `skip`: steps to pass over on the way, such as the walk late at night. */
  /**
   * `at` is the history length it was sent from: a second `next` from the same screen (a
   * double tap, a late async callback) finds the screen gone and does nothing.
   */
  | { type: 'next'; skip?: StepId[]; at?: number }
  | { type: 'go'; to: StepId }
  /** Edit a choice from the step on screen, and come back to it on Continue. */
  | { type: 'edit'; to: StepId }
  | { type: 'back' }
  | { type: 'set'; answers: Partial<Answers> }
  /** Start the stack again at `to`, with no way back (after purchase). */
  | { type: 'reset'; to: StepId };

export function isStep(value: string | undefined): value is StepId {
  return value === 'declined' || (STEPS as readonly string[]).includes(value ?? '');
}

export function nextStep(step: StepId, skip: StepId[] = []): StepId {
  if (step === 'declined') return 'plans';
  if (step === 'under-13') return 'alarm';
  let index = STEPS.indexOf(step) + 1;
  while (index < STEPS.length - 1 && skip.includes(STEPS[index])) index += 1;
  return STEPS[Math.min(index, STEPS.length - 1)];
}

export function startNav(step: StepId, answers: Answers): Nav {
  return { history: [step], answers, returnTo: null, beforeEdit: null };
}

export const currentStep = (nav: Nav): StepId => nav.history[nav.history.length - 1];

/** Whether the step on screen is one being edited, so Continue saves and returns. */
export const isEditing = (nav: Nav): boolean => nav.returnTo !== null && EDITABLE.includes(currentStep(nav));

/** The age gate can't be re-answered with Back, and there's no way back to the paywall after purchase. */
export const canGoBack = (nav: Nav): boolean => nav.history.length > 1 && currentStep(nav) !== 'under-13';

const finishEdit = (nav: Nav): Nav => ({ ...nav, returnTo: null, beforeEdit: null });

export function navigate(nav: Nav, action: NavAction): Nav {
  switch (action.type) {
    case 'go':
      return { ...nav, history: [...nav.history, action.to] };

    case 'next': {
      if (action.at !== undefined && action.at !== nav.history.length) return nav;
      if (isEditing(nav)) {
        // Pop back to where the edit started instead of stacking another copy of it.
        const at = nav.history.lastIndexOf(nav.returnTo!);
        return finishEdit({ ...nav, history: nav.history.slice(0, at + 1) });
      }
      return navigate(nav, { type: 'go', to: nextStep(currentStep(nav), action.skip) });
    }

    case 'edit':
      return {
        ...nav,
        history: [...nav.history, action.to],
        returnTo: currentStep(nav),
        beforeEdit: nav.answers,
      };

    case 'back': {
      if (!canGoBack(nav)) return nav;
      const cancelled = isEditing(nav) ? finishEdit({ ...nav, answers: nav.beforeEdit ?? nav.answers }) : nav;
      // Skip screens that advance on their own, or Back would bounce straight forward again.
      let to = nav.history.length - 1;
      while (to > 1 && AUTO_ADVANCE.includes(nav.history[to - 1])) to -= 1;
      return { ...cancelled, history: nav.history.slice(0, to) };
    }

    case 'set':
      return { ...nav, answers: { ...nav.answers, ...action.answers } };

    case 'reset':
      return finishEdit({ ...nav, history: [action.to] });
  }
}
