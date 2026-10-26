/**
 * Onboarding copy and choices. Voice rules: docs/VOICE.md (brief, deadpan, no
 * exclamation points, no guilt, no statistics in Loc's mouth).
 * Flow and evidence: docs/ONBOARDING_CONVERSION.md.
 */

import { DEFAULT_PUSHUP_GOAL, getPendingRoutine, getRoutine, hasRoutine, pushupGoalOf, type WakeMethod } from '@/lib/routine';
import { getMorningPlace } from '@/lib/place-spot';
import { getScanCode } from '@/lib/scan-code';

import { formatWhen } from './estimate';

import { stepsFor, type Pain, type StepId } from './navigation';

export type Choice<T> = { label: string; value: T };

/** "1 AM", "12:30 AM", "midnight": answers read like speech, so no ":00". */
const spoken = (minutes: number) => formatWhen(minutes).replace(':00', '');

export type Answers = {
  /**
   * The pain they picked first (`pain`): which end of the night the flow leads with
   * (docs/ONBOARDING_BRANCHES.md). Missing reads as `all`, today's flow.
   */
  pain?: Pain;
  /** How the morning feels (`mornings`): his reply, the reveal's second beat, the offer headline. */
  mornings?: string;
  /** `night-feel` (night branch): what the late scrolling is, mostly. Echoed like `mornings`. */
  nightFeel?: string;
  /** `after-feel` (overall branch): how it is when the phone finally goes down. Echoed like `mornings`. */
  afterFeel?: string;
  nightMinutes?: number;
  nightsPerWeek?: number;
  /** The nights picked on the day circles, Monday = 0. Their count is `nightsPerWeek`. */
  scrollDays?: number[];
  bedtime: number;
  wake: number;
  morningMinutes?: number;
  /** What they've tried before. Only feeds his reply under it. */
  tried?: string;
  timeBack?: string;
  /**
   * "How'd you find me?" Attribution only: never used in the number. The one exception to
   * "every answer feeds the number or a setting" (docs/sub-club/APPLIED_TO_LOCTURNE.md, O1).
   */
  found?: string;
  /**
   * Stand-in app names for the web preview. On iOS the picks never reach JS: Apple's picker
   * saves opaque tokens in the App Group, so no copy may name an app.
   */
  apps: string[];
  /** How they prove they're up (`method`). A skip leaves 200 steps. */
  method?: WakeMethod;
  plan: 'annual' | 'monthly';
  /** Works nights: the schedule is a block window, not a sleep window. */
  shift?: boolean;
  /** "Remind me before the trial ends" on the paywall. On by default: the reminder is a promise. */
  remindTrial: boolean;
};

export const initialAnswers: Answers = {
  bedtime: 23 * 60 + 30,
  wake: 7 * 60,
  apps: [],
  plan: 'annual',
  remindTrial: true,
};

/** The step order lives with the rules for moving through it. */
export { PAINS, STEPS, stepsFor, type Pain, type StepId } from './navigation';

/**
 * The progress bar's three chapters (Headway's split bar, docs/ONBOARDING_10.md): your
 * mornings, your nights, your setup. Welcome, offer and post-purchase screens hide the bar, so
 * the paywall never reads as one more step.
 */
export function chaptersFor(pain: Pain | undefined): StepId[][] {
  const steps = stepsFor(pain);
  const at = (step: StepId) => steps.indexOf(step);
  // The first four after `pain` are the first chapter: the times and the branch's own end of
  // the night. `pain` has no bar, like `hello`.
  const first = at('pain') + 1;
  return [
    steps.slice(first, first + 4),
    steps.slice(first + 4, at('time-back') + 1),
    steps.slice(at('method'), at('commit') + 1),
  ];
}

/** `all`'s chapters: your mornings, your nights, your setup. */
export const CHAPTERS: StepId[][] = chaptersFor('all');

/*
 * The branches (docs/ONBOARDING_BRANCHES.md). One question near the start picks which end of
 * the night the flow leads with. The mechanism is the same for everyone (apps sleep at bedtime,
 * wake when you're up), so each branch tells it from the end that hurts. Copy is DRAFT for the
 * founder's voice pass, like every Loc line.
 */

/**
 * "Which one sounds like you?" Options are things that happen to them, not confessions.
 * `night` first: it's the most common in-bed pain and the largest minutes. "All of it" last,
 * as the catch-all, and it gets today's flow.
 */
export const PAIN: Choice<Pain>[] = [
  { label: 'Bedtime turns into 1 AM.', value: 'night' },
  { label: 'I wake up and scroll in bed.', value: 'morning' },
  { label: 'Too much phone. All day.', value: 'overall' },
  { label: 'Honestly? All of it.', value: 'all' },
];

/** `night-feel`: "What's the late scrolling, mostly?" `mine` is revenge bedtime procrastination. */
export const NIGHT_FEEL: Choice<string>[] = [
  { label: 'The only time that’s mine.', value: 'mine' },
  { label: 'One more video. Then it’s 1 AM.', value: 'one-more' },
  { label: 'My hand just does it.', value: 'reflex' },
  { label: 'I can’t sleep, so I scroll.', value: 'cant-sleep' },
];

/** `after-feel`: "When you finally put it down, how is it?" */
export const AFTER_FEEL: Choice<string>[] = [
  { label: 'Where did that hour go.', value: 'vanished' },
  { label: 'I didn’t even enjoy it.', value: 'meh' },
  { label: 'Behind on everything.', value: 'behind' },
  { label: 'Tired, somehow.', value: 'tired' },
];

/**
 * "How do your mornings usually go?": the stakes in feelings, not hours. Each answer comes
 * back three times: his reply, the reveal's second beat, and the offer's headline.
 */
export const MORNINGS: Choice<string>[] = [
  { label: 'Tired before I’ve started.', value: 'tired' },
  { label: 'Late. Always rushing.', value: 'rushed' },
  { label: 'Behind before I’m out of bed.', value: 'behind' },
  { label: 'Gone before I notice.', value: 'gone' },
];

/**
 * The morning branch swaps "Behind before I'm out of bed." for the snooze loop, its own
 * words for it ("I used to set 20 alarms"). A joke about it, not a warning: snoozing itself
 * isn't clearly harmful (Sundelin 2024).
 */
export function morningsChoices(pain: Pain | undefined): Choice<string>[] {
  if (pain !== 'morning') return MORNINGS;
  return MORNINGS.map((choice) => (choice.value === 'behind' ? { label: 'Snooze. Scroll. Snooze.', value: 'snooze' } : choice));
}

/**
 * A new pain answer, plus what it undoes: a mornings answer the new branch doesn't offer
 * ("snooze" after leaving the morning branch) is dropped, so it's asked again rather than
 * carried into the reveal and the offer unseen.
 */
export function painAnswer(answers: Pick<Answers, 'mornings'>, pain: Pain): Partial<Answers> {
  const stale = answers.mornings !== undefined && !morningsChoices(pain).some((c) => c.value === answers.mornings);
  return stale ? { pain, mornings: undefined } : { pain };
}

/**
 * The reveal's second beat, from the branch's feeling answer: the bad news lands on the apps
 * (VOICE). `scope` is what the number counted (`leadFor`): a night person whose nights were too
 * light to lead with gets the combined number, so the night line would be untrue.
 */
export function revealBeat(answers: Pick<Answers, 'pain' | 'mornings' | 'nightFeel' | 'afterFeel'>, scope: 'night' | 'morning' | 'both'): string {
  if (answers.pain === 'night') {
    if (scope !== 'night') return REVEAL_SECOND_BEAT;
    return NIGHT_FEEL_BEAT[answers.nightFeel ?? ''] ?? 'Your apps had a great week. Your nights didn’t.';
  }
  if (answers.pain === 'overall') return AFTER_FEEL_BEAT[answers.afterFeel ?? ''] ?? 'And that’s only the hours in bed.';
  return MORNINGS_BEAT[answers.mornings ?? ''] ?? REVEAL_SECOND_BEAT;
}

const NIGHT_FEEL_BEAT: Record<string, string> = {
  mine: 'Your apps got your free time. And your night.',
  'one-more': 'Your apps had a great week. Your nights ran late.',
  reflex: 'Your apps had a great week. Your hand did too.',
  'cant-sleep': 'Your apps had a great week. Your nights didn’t.',
};

const AFTER_FEEL_BEAT: Record<string, string> = {
  vanished: 'Your apps had a great week. Your hours went missing.',
  meh: 'Your apps had a great week. Nobody enjoyed it.',
  behind: 'Your apps had a great week. Your to-do list didn’t.',
  tired: 'Your apps had a great week. You had a tired one.',
};

const MORNINGS_BEAT: Record<string, string> = {
  snooze: 'Your apps had a great week. Your snooze button too.',
  tired: 'Your apps had a great week. You had a tired one.',
  rushed: 'Your apps had a great week. Your mornings ran late.',
  behind: 'Your apps had a great week. Your mornings started without you.',
  gone: 'Your apps had a great week. Your mornings went missing.',
};

/** The offer's headline, from `mornings`: the morning they said they don't have. None for "fine". */
export const MORNINGS_OFFER: Record<string, string> = {
  snooze: 'Mornings with one alarm.',
  tired: 'Mornings you’re actually awake for.',
  rushed: 'Mornings with time left over.',
  behind: 'Mornings that start with you.',
  gone: 'Mornings you get to keep.',
};

/**
 * "In bed at 11:30 PM. When does the phone actually go down?" Answered in their own clock
 * (group E in docs/design-references/onboarding-library/_analysis): each choice is bedtime
 * plus the minutes in `value`, so the number is a subtraction they can see.
 */
const NIGHT_OFFSETS = [5, 30, 60, 150];

export function nightMinuteChoices(bedtime: number): Choice<number>[] {
  return NIGHT_OFFSETS.map((value, i) => ({
    value,
    label: i === 0 ? 'Pretty much straight away' : i === NIGHT_OFFSETS.length - 1 ? 'Later. Don’t ask.' : `Around ${spoken(bedtime + value)}`,
  }));
}

/** "Alarm at 7:00 AM. When do your feet hit the floor?" The alarm plus `value` minutes. */
const MORNING_OFFSETS = [3, 15, 45, 75];

export function morningMinuteChoices(wake: number): Choice<number>[] {
  return MORNING_OFFSETS.map((value, i) => ({
    value,
    label: i === 0 ? 'Straight up' : i === MORNING_OFFSETS.length - 1 ? 'Later than that' : `Around ${spoken(wake + value)}`,
  }));
}

/**
 * The offer's headline from the branch's feeling answer, before the `time-back` fallbacks.
 * `{phoneDown}` is when the phone usually goes down. None for "fine".
 */
export function feelingOffer(answers: Pick<Answers, 'pain' | 'mornings' | 'nightFeel' | 'afterFeel'>, phoneDown: string): string | undefined {
  if (answers.pain === 'night') return NIGHT_FEEL_OFFER[answers.nightFeel ?? '']?.replace('{phoneDown}', phoneDown);
  if (answers.pain === 'overall') return AFTER_FEEL_OFFER[answers.afterFeel ?? ''];
  return MORNINGS_OFFER[answers.mornings ?? ''];
}

const NIGHT_FEEL_OFFER: Record<string, string> = {
  mine: 'Your evening. Then actual sleep.',
  'one-more': 'Nights that end when you said.',
  reflex: 'Nothing to reach for at {phoneDown}.',
  'cant-sleep': 'Dark, quiet, nothing to open.',
};

const AFTER_FEEL_OFFER: Record<string, string> = {
  vanished: 'Hours you get to keep.',
  meh: 'Less of the bit you don’t enjoy.',
  behind: 'The ends of your day, back.',
  tired: 'Mornings you’re actually awake for.',
};

// Single choice, so the question asks for the one that lasted longest.
export const TRIED: Choice<string>[] = [
  { label: 'Screen Time limits', value: 'screen-time' },
  { label: 'Another blocker app', value: 'blocker' },
  { label: 'Willpower', value: 'willpower' },
  { label: 'Nothing yet', value: 'nothing' },
];

/** Each branch swaps in the thing its people most often tried for "Willpower", so every list is four. */
const TRIED_EXTRA: Partial<Record<Pain, Choice<string>>> = {
  night: { label: 'Sleep Focus or Downtime', value: 'sleep-focus' },
  morning: { label: 'An alarm across the room', value: 'alarm' },
  overall: { label: 'Deleting the apps', value: 'delete' },
};

export function triedChoices(pain: Pain | undefined): Choice<string>[] {
  const extra = TRIED_EXTRA[pain ?? 'all'];
  return extra ? TRIED.map((choice) => (choice.value === 'willpower' ? extra : choice)) : TRIED;
}

export const TIME_BACK: Choice<string>[] = [
  { label: 'Sleep more', value: 'sleep' },
  { label: 'Read', value: 'read' },
  { label: 'Work out', value: 'workout' },
  { label: 'Study', value: 'study' },
];

/** `time-back`'s choices with the branch's likeliest answer first. */
export function timeBackChoices(pain: Pain | undefined): Choice<string>[] {
  const order = TIME_BACK_ORDER[pain ?? 'all'];
  return order ? order.map((value) => TIME_BACK.find((c) => c.value === value)!) : TIME_BACK;
}

const TIME_BACK_ORDER: Partial<Record<Pain, string[]>> = {
  night: ['sleep', 'read', 'study', 'workout'],
  morning: ['workout', 'study', 'sleep', 'read'],
};

/** The reveal's second beat: the bad news lands on the apps, never on them (VOICE). */
export const REVEAL_SECOND_BEAT = 'Your apps had a great week. Your mornings didn’t.';

/** What the hours go to on the paywall, from `time-back`: "9 hours a week for reading." */
const TIME_BACK_FOR: Record<string, string> = {
  sleep: 'for sleep',
  read: 'for reading',
  workout: 'for workouts',
  study: 'for studying',
  else: 'back',
};

const upperFirst = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** `time-back`, asked after the reveal: "9 hours a week back. What would you do with them?" */
export function timeBackQuestion(amount: string): string {
  return `${upperFirst(amount)} a week back. What would you do with ${amount.endsWith('s') ? 'them' : 'it'}?`;
}

/** The paywall's headline: their weekly hours, spent on what they picked on `time-back`. */
export function plansHeadline(amount: string, timeBack: string | undefined): string {
  return `${upperFirst(amount)} a week ${TIME_BACK_FOR[timeBack ?? 'else'] ?? TIME_BACK_FOR.else}.`;
}

/**
 * Where they heard about Locturne. Payers per 1K views needs to know which channel an
 * install came from, and Opal calls this question its most reliable attribution.
 */
export const FOUND: Choice<string>[] = [
  { label: 'TikTok', value: 'tiktok' },
  { label: 'Instagram', value: 'instagram' },
  { label: 'A friend', value: 'friend' },
  { label: 'Somewhere else', value: 'else' },
];

/**
 * The quiz's buttons are the person's reply to him, not "Continue" (Gentler Streak, Focus
 * Friend, Duolingo's "I'm committed"). Shown once an answer is picked.
 */
export const REPLY_BUTTON: Partial<Record<StepId, string>> = {
  pain: 'That’s the one.',
  'night-feel': 'That’s me.',
  'after-feel': 'That’s me.',
  found: 'That’s how.',
  bedtime: 'That’s bedtime.',
  wake: 'That’s the alarm.',
  mornings: 'That’s me.',
  'night-minutes': 'Roughly.',
  'nights-per-week': 'That’s the lot.',
  'morning-minutes': 'Sounds right.',
  tried: 'Fair point.',
  'time-back': 'That’s the plan.',
  method: 'That’s my morning.',
};

/** Paywall headline, echoing the answer to "what would you do with them?" */
export const OFFER_HEADLINES: Record<string, string> = {
  sleep: 'Earlier nights. For both of us.',
  read: 'Reading, then. Books don’t autoplay.',
  workout: 'Workouts, then. I’ll supervise from the couch.',
  study: 'Studying, then. I’ll guard the snacks.',
  else: 'Your nights back. Mine too.',
};

/** For people who barely use their phone in bed: the pitch is mornings, not a cost. */
export const LIGHT_OFFER_HEADLINE = 'Mornings, then. Mine too.';

/*
 * Prices, trials and the exit-offer arm all come from the store (`getOffers` in
 * src/lib/purchases.ts), never from here: StoreKit localizes each price, and a trial only
 * exists when this Apple ID is eligible for the intro offer.
 *
 * The exit offer is an A/B test, not a decision: discounts have lost at other apps once
 * refunds were counted, and an extension beat a discount at Coconote
 * (docs/sub-club/APPLIED_TO_LOCTURNE.md, test 3). Judge the arms on net revenue after
 * refunds per install at day 35. `half-price` also shows up as a downgrade in iOS Settings.
 * Each install gets an arm at random, kept and sent to RevenueCat as the `exit_arm`
 * attribute; `exit_arm` in the current offering's metadata overrides it for everyone
 * (src/lib/revenuecat.ts). Preview one with `?exit=<arm>`.
 */
export {
  DEFAULT_EXIT_ARM as DEFAULT_EXIT_OFFER,
  EXIT_ARMS as EXIT_OFFERS,
  type ExitArm as ExitOffer,
} from '@/lib/purchases';

/**
 * His line under the paywall title, from the trial length the store reports. It says "try",
 * never "free": Apple 3.1.2 rejects trial wording bigger than the billed price, and this line
 * is set larger than the plan prices.
 */
export function trialVoice(days: number): string {
  return `Try me for ${days === 7 ? 'a week' : `${days} nights`}. I’ll sleep through most of it.`;
}

/**
 * "How will you show me you're up?": every way, 200 steps first (the default since
 * 2026-10-10). Skippable: a skip keeps 200 steps, and Routine changes it later.
 * `steps` and `reps`: the goals in use (`morningGoals`), so a rerun names Routine's.
 */
export function methodChoices(steps = 200, reps: number = DEFAULT_PUSHUP_GOAL): Choice<WakeMethod>[] {
  return [
    { label: `Walk ${steps} steps`, value: 'steps' },
    { label: 'Go downstairs', value: 'downstairs' },
    { label: 'Scan a code in another room', value: 'scan' },
    { label: 'Get to a place, like the gym', value: 'place' },
    { label: `${reps} push-ups on the floor`, value: 'pushups' },
  ];
}

/** Every line after the method question that says how they prove they're up. */
export const METHOD_COPY: Record<
  WakeMethod,
  {
    /** His reaction on the method screen once one is picked. */
    echo: string;
    /** On the schedule card, between bedtime and the alarm. */
    short: string;
    /** The paywall checklist. */
    check: string;
    /** "Your apps can't open from {bed} until …" */
    until: string;
    /** The `commit` title, after "Phone down at {bed}." */
    commit: string;
    /** His line on `offer`, under the headline. */
    offer: string;
    /** `first-morning`: what to do and what counts. */
    morning: { when: string; what: string }[];
  }
> = {
  downstairs: {
    echo: 'I hate stairs. That’s the point.',
    short: 'Downstairs',
    check: 'Awake again after one trip downstairs',
    until: 'you’ve been downstairs',
    commit: 'Downstairs to wake them.',
    offer: 'One trip downstairs. I’ll complain the whole way.',
    morning: [
      { when: 'Start', what: 'Open me. I’m already listening. Keep the screen on and take the stairs.' },
      { when: 'Bottom', what: 'They wake up. Up or down both count.' },
      { when: 'No stairs', what: 'Away from home? Walk 200 steps instead.' },
    ],
  },
  steps: {
    echo: 'About two minutes of walking. I timed it.',
    short: '200 steps',
    check: 'Awake again after 200 morning steps',
    until: 'you’ve walked 200 steps',
    commit: 'Up for 200 steps.',
    offer: '200 steps. I’ll complain about every one.',
    morning: [
      { when: 'Steps', what: 'They count from your alarm. Bathroom, kitchen, it all counts.' },
      { when: 'At 200', what: 'Open me. They wake up.' },
    ],
  },
  scan: {
    echo: 'Another room. Choose it wisely.',
    short: 'Scan',
    check: 'Awake again once you scan your code',
    until: 'you’ve scanned your code',
    commit: 'Up to scan your code.',
    offer: 'One walk to your code. I’ll complain the whole way.',
    morning: [
      { when: 'Today', what: 'Set up your code in Routine and leave it in another room.' },
      { when: 'Morning', what: 'Walk to it and scan it. Until it’s set up, 200 steps works.' },
    ],
  },
  place: {
    echo: 'Outside. In the morning. Bold.',
    short: 'Your place',
    check: 'Awake again once you reach your place',
    until: 'you’ve reached your place',
    commit: 'Out the door to wake them.',
    offer: 'One trip to your place. I’ll complain the whole way.',
    morning: [
      { when: 'Today', what: 'Pick your place in Routine: the gym, campus, the café.' },
      { when: 'Morning', what: 'Get there and check in. Until it’s picked, 200 steps works.' },
    ],
  },
  pushups: {
    echo: '10 push-ups. I’ll count. Out loud. Slowly.',
    short: 'Push-ups',
    check: 'Awake again after 10 push-ups',
    until: 'you’ve done 10 push-ups',
    commit: '10 push-ups to wake them.',
    offer: '10 push-ups. I’ll count every one, disappointed.',
    morning: [
      { when: 'Start', what: 'Open me, tap Start push-ups, and lean me on the floor two steps away, side-on to you.' },
      { when: 'Floor', what: '10 push-ups where I can see you. I count. They wake up.' },
      { when: 'Not today', what: 'Arms not working? Walk 200 steps instead.' },
    ],
  },
};

/**
 * `walk`: a 20-step taste of the first morning before the paywall (MORNING_ANGLE.md #2, TODO §4).
 * Its words follow the day that morning falls on (`walkCopy`, walk-copy.ts).
 * The count is live and real, and it's where iOS asks for Motion & Fitness, framed as
 * "that's how I count". Always skippable: nobody has to walk to see the price. It comes right
 * after the `tomorrow` demo (see it, then try it), and late at night it's skipped altogether.
 */
export const WALK_GOAL = 20;

/** His line as the count climbs. No asterisk emphasis: onboarding's Voice doesn't parse it. */
export function walkLine(steps: number, goal = WALK_GOAL): string {
  if (steps >= goal) return 'I’m up. Don’t talk to me yet.';
  if (steps >= goal * 0.6) return 'Fine. I’m awake. Mostly.';
  if (steps >= goal * 0.25) return 'I can hear you walking. I’m ignoring it.';
  return 'No.';
}

type MethodCopy = (typeof METHOD_COPY)[WakeMethod];

/**
 * `METHOD_COPY` for the step goal in use. The copy is written for onboarding's 200; a rerun
 * (See plans) keeps the goal saved in Routine, which can be 100, 300 or 500.
 */
export function methodCopy(
  method: WakeMethod,
  { codeWaits = false, wake }: { codeWaits?: boolean; wake?: number } = {},
): MethodCopy {
  const copy = methodCopyFor(method, codeWaits);
  // A night shift's wake-up is in the afternoon: its row isn't "Morning" (`wakePart`).
  const part = wake === undefined ? 'Morning' : wakePart(wake);
  if (part === 'Morning') return copy;
  return { ...copy, morning: copy.morning.map((row) => (row.when === 'Morning' ? { ...row, when: part } : row)) };
}

/**
 * The first wake-up's part of the day, from its time (minutes since midnight): "Afternoon" from
 * noon on, as `wakeDayFor` ("Later today") and the scan screen's `morningName` say it.
 */
export function wakePart(wake: number): 'Morning' | 'Afternoon' {
  return wake >= 12 * 60 ? 'Afternoon' : 'Morning';
}

/** The first morning of a returning scan or place user, whose code or place is already set. */
const SET_UP_MORNING = {
  scan: 'Walk to your code and scan it. That wakes them.',
  place: 'Get to your place and check in. That wakes them.',
};

/** Setup finished at night, with no code or place yet: it waits for the day after. */
const WAITING_MORNING = {
  scan: [
    { when: 'Morning', what: 'No code yet, so 200 steps wakes them.' },
    { when: 'Then', what: 'In the day, set up your code in Routine and leave it in another room.' },
  ],
  place: [
    { when: 'Morning', what: 'No place yet, so 200 steps wakes them.' },
    { when: 'Then', what: 'In the day, pick your place in Routine.' },
  ],
};

/**
 * The step target and push-up count the first morning runs on: the routine tomorrow runs on,
 * a Routine edit waiting for bedtime included (`saveSetup`), or the defaults on a first run.
 */
export function morningGoals(): { steps: number; reps: number } {
  const next = hasRoutine() ? (getPendingRoutine()?.routine ?? getRoutine()) : null;
  return { steps: next?.stepGoal ?? 200, reps: next ? pushupGoalOf(next) : DEFAULT_PUSHUP_GOAL };
}

function methodCopyFor(method: WakeMethod, codeWaits: boolean): MethodCopy {
  const saved = METHOD_COPY[method];
  // A returning scan user already has a code: no "set up your code" today. Without one, a
  // code can't be set while the apps are asleep (`getScanEditRefusal`), so one finishing
  // setup at night (`codeWaits`) can't do it "today": the first morning falls back to steps
  // (`methodInUse`) and the code waits for the day after it.
  // A place is the same: picked only while the apps are awake (`getPlaceEditRefusal`).
  const setUp = method === 'scan' ? getScanCode() !== null : method === 'place' ? getMorningPlace() !== null : null;
  const copy: MethodCopy =
    setUp === null
      ? saved
      : setUp
        ? { ...saved, morning: [{ when: 'Morning', what: SET_UP_MORNING[method as 'scan' | 'place'] }] }
        : codeWaits
          ? { ...saved, morning: WAITING_MORNING[method as 'scan' | 'place'] }
          : saved;
  // Written for the default 200 steps and 10 push-ups; a rerun keeps the ones set in Routine.
  const { steps: goal, reps } = morningGoals();
  if (goal === 200 && reps === DEFAULT_PUSHUP_GOAL) return copy;
  const swap = <T,>(value: T): T => {
    if (typeof value === 'string')
      return value.replace(/\b200\b/g, String(goal)).replace(/\b10 push-ups\b/g, `${reps} push-ups`) as T;
    if (Array.isArray(value)) return value.map(swap) as T;
    if (value && typeof value === 'object')
      return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, swap(v)])) as T;
    return value;
  };
  return swap(copy);
}

/**
 * New Year week, January 1–9 (D8 in docs/ONBOARDING_OPTIMIZATION.md): date-gated copy, never
 * a discount. Commitment devices sell best at a fresh start (stickK sign-ups jump 145% at New
 * Year, Dai, Milkman & Riis 2014), and January cohorts refund more, so a sale would cost
 * twice. Copy from docs/onboarding-optimization/05-audience-reviews.md §12. Preview with
 * `?newyear=1`.
 */
export function isNewYearWeek(now = new Date()): boolean {
  return now.getMonth() === 0 && now.getDate() <= 9;
}

/**
 * `founder`: why Locturne exists, in the maker's own words. Not Loc: plain, first person.
 * DRAFT (2026-10-14): written by Claude from what's known (a student, building it alone).
 * Luke rewrites the story lines in his own words before shipping; only true things go here.
 */
export const FOUNDER = {
  eyebrow: 'From the person who made this',
  lines: [
    'Hi, I’m Luke. I’m a student, and I made Locturne on my own.',
    'I kept losing the first hour of the day to my phone, still in bed. Screen Time never stopped me. The Ignore button was right there.',
    'So I made the one thing that worked: the apps stay asleep until I’m actually up.',
  ],
  sign: 'Luke',
  aside: 'He made me. I didn’t ask for this.',
};

/** The chapter break before the setup (`build`), leading with their end of the night. DRAFT copy. */
export const BUILD: Record<Pain, string> = {
  all: 'Now let’s build your mornings.',
  morning: 'Now let’s build your mornings.',
  night: 'Now let’s build your nights.',
  overall: 'Now let’s build your nights.',
};
export const BUILD_BODY = 'Three picks: how you’ll prove you’re up, how grumpy I get, and which apps sleep.';

export const NEW_YEAR = {
  hello: { head: 'New year. Same bed.', sub: 'I’m Loc. I don’t do resolutions. I do locks.' },
  commit: 'The deal for',
  plans: 'No sale. I’m too tired for a sale.',
  armed: 'Armed. First night of the year. Don’t make it weird.',
};
