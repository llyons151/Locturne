/**
 * Where you are in onboarding and how you move: next, back, editing a choice and returning,
 * and the answers collected on the way. Pure (a reducer), so the edit paths are tested in
 * navigation.test.ts; onboarding-flow.tsx runs it with `useReducer` and does the side effects
 * (analytics, the advance timer, marking the exit offer shown).
 */
import type { Answers } from './content.ts';

/**
 * Every step (docs/ONBOARDING_10.md), in the `all` branch's order with the other branches'
 * feeling questions slotted in. A visit follows its branch (`stepsFor`), never this list
 * directly. One side step isn't in it: `declined` (the paywall exit). The times come first,
 * so every later screen can speak in them.
 */
export const STEPS = [
  'hello',
  // Which pain is theirs (docs/ONBOARDING_BRANCHES.md): the order and words from here on lean
  // toward it. Same mechanism, same setup, same length for every answer.
  'pain',
  'bedtime',
  'wake',
  // Mornings first in `all`: the hook is "no apps until you're out of bed", so the quiz starts
  // there, with how the morning feels (echoed on the reveal and the offer), then the night before.
  'morning-minutes',
  'mornings',
  'night-minutes',
  // `night`'s feeling question: what the late scrolling is, mostly.
  'night-feel',
  // `overall`'s: how it is when the phone finally goes down.
  'after-feel',
  'nights-per-week',
  'tried',
  // The bad news, then what they'd do with the time: the number first, so the dream is in it.
  'reveal',
  'time-back',
  // The chapter break: the questions are done, now they build it (user's reference, 2026-10-26).
  // Straight after the bad news, so "now let's fix it" lands while it stings (user 2026-10-26).
  'build',
  'method',
  // See it: the demo shows tomorrow morning. The 20-step walk after it was cut (2026-10-26).
  'tomorrow',
  'screen-time',
  'apps',
  // The summary and the deal in one: the editable schedule, then hold to agree.
  'commit',
  // Attribution once they've had the payoff and built it, so the stretch before is all about
  // them, and still before the paywall so conversion splits by channel for non-buyers too.
  'found',
  // Why this exists, from the person who made it, right before the price: the only social
  // proof there is before real reviews.
  'founder',
  'offer',
  'plans',
  'armed',
  'first-morning',
] as const;

export type StepId = (typeof STEPS)[number] | 'declined';

/**
 * The pain they picked on `pain`: up late, can't get up, too much phone overall, or all of it.
 * Missing (saved answers from before the branches) reads as `all`, today's flow.
 */
export type Pain = 'night' | 'morning' | 'overall' | 'all';

export const PAINS: Pain[] = ['night', 'morning', 'overall', 'all'];

/**
 * The stretch that differs between branches, from the times to the night count. Bedtime and
 * the alarm always come first, so the quiz can speak in their clock. `morning` asks the alarm
 * first (Hatch's "rise rested", Alarmy, Sleep Cycle all open on it); each branch asks its own
 * end of the night first, and its own feeling question.
 */
const BRANCH_QUIZ: Record<Pain, StepId[]> = {
  all: ['bedtime', 'wake', 'morning-minutes', 'mornings', 'night-minutes', 'nights-per-week'],
  night: ['bedtime', 'wake', 'night-minutes', 'night-feel', 'morning-minutes', 'nights-per-week'],
  morning: ['wake', 'bedtime', 'morning-minutes', 'mornings', 'night-minutes', 'nights-per-week'],
  overall: ['bedtime', 'wake', 'night-minutes', 'morning-minutes', 'after-feel', 'nights-per-week'],
};

/** Every step of one branch, in order. The same length for all four. */
export function stepsFor(pain: Pain | undefined): StepId[] {
  const quiz = BRANCH_QUIZ[pain ?? 'all'];
  const from = STEPS.indexOf('nights-per-week') + 1;
  return ['hello', 'pain', ...quiz, ...STEPS.slice(from)];
}

/** The quiz questions asked on the risen moon: everything after the times, through `tried`. */
export function moonQuizFor(pain: Pain | undefined): StepId[] {
  return [...BRANCH_QUIZ[pain ?? 'all'].slice(2), 'tried'];
}

/**
 * Steps that can be edited and then return: `bedtime`, `wake`, `method` and `apps` from the
 * schedule card on `commit`.
 */
export const EDITABLE: StepId[] = ['bedtime', 'wake', 'method', 'apps'];

/** Screens that move on by themselves. Back steps over them. None now: kept for the rule. */
export const AUTO_ADVANCE: StepId[] = [];

export type Nav = {
  /** Monotonic screen visit; stack depth alone repeats after Back/edit. */
  visit: number;
  /** Every step shown, oldest first; the last is on screen. Never empty. */
  history: StepId[];
  answers: Answers;
  /** Set while editing a choice, so Continue returns to the step it was edited from. */
  returnTo: StepId | null;
  /** The answers before that edit, so Back cancels it instead of keeping half a change. */
  beforeEdit: Answers | null;
};

export type NavAction =
  /** `skip`: steps to pass over on the way, if a flow ever needs one. */
  /**
   * `at` is the history length it was sent from: a second `next` from the same screen (a
   * double tap, a late async callback) finds the screen gone and does nothing.
   */
  | { type: 'next'; skip?: StepId[]; at?: number; visit?: number }
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

export function nextStep(step: StepId, skip: StepId[] = [], pain?: Pain): StepId {
  if (step === 'declined') return 'plans';
  const order = stepsFor(pain);
  let index = order.indexOf(step);
  // A step from another branch (a `?step=` jump, or `pain` changed after it): carry on from the
  // next step after it that this branch has.
  if (index < 0) {
    const later = STEPS.slice(STEPS.indexOf(step as (typeof STEPS)[number]) + 1).find((s) => order.includes(s));
    index = order.indexOf(later ?? order[order.length - 1]) - 1;
  }
  index += 1;
  while (index < order.length - 1 && skip.includes(order[index])) index += 1;
  return order[Math.min(index, order.length - 1)];
}

export function startNav(step: StepId, answers: Answers): Nav {
  return { visit: 0, history: [step], answers, returnTo: null, beforeEdit: null };
}

export const currentStep = (nav: Nav): StepId => nav.history[nav.history.length - 1];

/** Whether the step on screen is one being edited, so Continue saves and returns. */
export const isEditing = (nav: Nav): boolean => nav.returnTo !== null && EDITABLE.includes(currentStep(nav));

/** There's no way back to the paywall after purchase (the history is reset to `armed`). */
export const canGoBack = (nav: Nav): boolean => nav.history.length > 1;

const finishEdit = (nav: Nav): Nav => ({ ...nav, returnTo: null, beforeEdit: null });

export function navigate(nav: Nav, action: NavAction): Nav {
  switch (action.type) {
    case 'go':
      return { ...nav, visit: nav.visit + 1, history: [...nav.history, action.to] };

    case 'next': {
      if (action.at !== undefined && action.at !== nav.history.length) return nav;
      if (action.visit !== undefined && action.visit !== nav.visit) return nav;
      if (isEditing(nav)) {
        // Pop back to where the edit started instead of stacking another copy of it.
        const at = nav.history.lastIndexOf(nav.returnTo!);
        return finishEdit({ ...nav, visit: nav.visit + 1, history: nav.history.slice(0, at + 1) });
      }
      return navigate(nav, { type: 'go', to: nextStep(currentStep(nav), action.skip, nav.answers.pain) });
    }

    case 'edit':
      return {
        ...nav,
        visit: nav.visit + 1,
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
      return { ...cancelled, visit: nav.visit + 1, history: nav.history.slice(0, to) };
    }

    case 'set':
      return { ...nav, answers: { ...nav.answers, ...action.answers } };

    case 'reset':
      return finishEdit({ ...nav, visit: nav.visit + 1, history: [action.to] });
  }
}
