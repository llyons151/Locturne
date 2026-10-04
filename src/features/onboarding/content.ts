/**
 * Onboarding copy and choices. Voice rules: docs/VOICE.md (brief, deadpan, no
 * exclamation points, no guilt, no statistics in Loc's mouth).
 * Flow and evidence: docs/ONBOARDING_CONVERSION.md.
 */

import { getPendingRoutine, getRoutine, hasRoutine, type WakeMethod } from '@/lib/routine';
import { getScanCode } from '@/lib/scan-code';

import type { StepId } from './navigation';

export type Choice<T> = { label: string; value: T };

export type Answers = {
  nights?: string;
  nightMinutes?: number;
  nightsPerWeek?: number;
  /** The nights picked on the day circles, Monday = 0. Their count is `nightsPerWeek`. */
  scrollDays?: number[];
  bedtime: number;
  wake: number;
  morningMinutes?: number;
  /** Years. */
  age?: number;
  /** What they've tried before. Only feeds his reply on the next screen. */
  tried?: string;
  timeBack?: string;
  /**
   * "How'd you find me?" Attribution only: never shown back or used in the number. The one
   * exception to "every answer feeds the number or a setting" (docs/sub-club/APPLIED_TO_LOCTURNE.md, O1).
   */
  found?: string;
  /**
   * Stand-in app names for the web preview. On iOS the picks never reach JS: Apple's picker
   * saves opaque tokens in the App Group, so no copy may name an app.
   */
  apps: string[];
  /** How they prove they're up, from the stairs question after `wake`. */
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
export { STEPS, type StepId } from './navigation';

/**
 * Steps that show the progress bar: the quiz and setup only. Welcome, offer and
 * post-purchase screens hide it, so the paywall never reads as one more step.
 */
export const PROGRESS_STEPS: StepId[] = [
  'nights',
  'night-minutes',
  'nights-per-week',
  'morning-minutes',
  'found',
  'age',
  'tried',
  'tried-echo',
  'time-back',
  'math',
  'reveal',
  'bedtime',
  'wake',
  'method',
  'tomorrow',
  'walk',
  'screen-time',
  'apps',
  'commit',
];

// Values are deliberately at or below each bucket's midpoint, so the number never overstates.
export const NIGHTS: Choice<string>[] = [
  { label: 'One more video. Then twelve more.', value: 'one-more' },
  { label: "I can't sleep, so I scroll.", value: 'cant-sleep' },
  { label: 'I lose track of time.', value: 'lose-track' },
  { label: 'Honestly, all of it.', value: 'all' },
];

export const NIGHT_MINUTES: Choice<number>[] = [
  { label: 'Under 10 minutes', value: 5 },
  { label: '10–30 minutes', value: 20 },
  { label: '30–60 minutes', value: 45 },
  { label: '1–2 hours', value: 90 },
  { label: '2+ hours', value: 150 },
];

/**
 * His line on the math loader, echoing "What happens most nights?". Deadpan, and never
 * a health claim: "can't sleep" gets sympathy, not advice.
 */
export const NIGHTS_ECHO: Record<string, string> = {
  'one-more': '“One more video.” Counting all of them.',
  'cant-sleep': 'Can’t sleep, you said. Same. Counting anyway.',
  'lose-track': 'You lose track of time. I don’t. Counting.',
  all: 'All of it, you said. Counting all of it.',
};

export const MORNING_MINUTES: Choice<number>[] = [
  { label: 'Under 5 minutes', value: 3 },
  { label: '5–15 minutes', value: 10 },
  { label: '15–30 minutes', value: 20 },
  { label: '30–60 minutes', value: 45 },
  { label: '1+ hour', value: 75 },
];

/** The age wheel's range and starting point. Under 13 leads to the age gate. */
export const AGE_MIN = 10;
export const AGE_MAX = 99;
export const AGE_DEFAULT = 22;

// Single choice, so the question asks for the one that lasted longest.
export const TRIED: Choice<string>[] = [
  { label: 'Screen Time limits', value: 'screen-time' },
  { label: 'Another blocker app', value: 'blocker' },
  { label: 'Willpower', value: 'willpower' },
  { label: 'Phone in another room', value: 'other-room' },
  { label: 'Nothing yet', value: 'nothing' },
];

/**
 * His reply to "what have you tried?": the objection, then how Locturne differs. The
 * body stays literal, and never claims there's no way out (emergency unlock exists).
 * Temporary copy (2026-10-03): method-neutral because the stairs question comes later.
 * The founder will rewrite these in his voice.
 */
export const TRIED_ECHO: Record<string, { line: string; body: string }> = {
  'screen-time': {
    line: 'Screen Time has an Ignore button. I don’t.',
    body: 'Its limits end with one tap. Mine end when you’re out of bed. There’s an emergency unlock, but it takes more than a tap.',
  },
  blocker: {
    line: 'Clocks don’t check if you’re up. I do.',
    body: 'Most blockers switch off at a set time, even if you’re still in bed. Your apps stay asleep until you’ve actually got up.',
  },
  willpower: {
    line: 'Willpower goes to bed before you do.',
    body: 'So I don’t ask for any. The apps stay asleep until you’ve got out of bed and proved it.',
  },
  'other-room': {
    line: 'And the alarm’s in there with it.',
    body: 'Keep the phone by the bed. The apps stay asleep either way, until you’re up and moving.',
  },
  nothing: {
    line: 'I’m your first, then. Be gentle.',
    body: 'The apps you pick sleep at bedtime. Getting out of bed wakes them up.',
  },
};

export const TIME_BACK: Choice<string>[] = [
  { label: 'Sleep more', value: 'sleep' },
  { label: 'Read', value: 'read' },
  { label: 'Work out', value: 'workout' },
  { label: 'Slow mornings', value: 'mornings' },
  { label: 'Something else', value: 'else' },
];

/**
 * Where they heard about Locturne. Payers per 1K views needs to know which channel an
 * install came from, and Opal calls this question its most reliable attribution.
 */
export const FOUND: Choice<string>[] = [
  { label: 'TikTok', value: 'tiktok' },
  { label: 'Instagram', value: 'instagram' },
  { label: 'YouTube', value: 'youtube' },
  { label: 'A friend', value: 'friend' },
  { label: 'App Store', value: 'app-store' },
  { label: 'Somewhere else', value: 'else' },
];

/** Paywall headline, echoing the answer to "what would you do with them?" */
export const OFFER_HEADLINES: Record<string, string> = {
  sleep: 'Earlier nights. For both of us.',
  read: 'Reading, then. Books don’t autoplay.',
  workout: 'Workouts, then. I’ll supervise from the couch.',
  mornings: 'Slow mornings. My favorite kind.',
  else: 'Your nights back. Mine too.',
};

/** For people who barely use their phone in bed: the pitch is mornings, not a cost. */
export const LIGHT_OFFER_HEADLINE = 'Mornings, then. Mine too.';

/**
 * His aside on `math` as the mornings line ticks, echoing "how long are you on your phone
 * before you get up?". Under ten minutes gets none: there's nothing to say nothing about.
 */
export const MORNING_ECHO: Record<number, string> = {
  10: 'You said ten minutes. I said nothing.',
  20: 'You said twenty minutes. I said nothing.',
  45: 'You said forty-five minutes. I said nothing.',
  75: 'You said an hour. I said nothing. Loudly.',
};

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
 * "Are there stairs between your bed and your coffee?" (GAME_PLAN, "Wake-up methods"),
 * right after `wake`. Yes picks the hero method, no picks steps, and a link shows the rest.
 */
export const METHOD_CHOICES: Choice<WakeMethod>[] = [
  { label: 'Yes, there are stairs', value: 'downstairs' },
  { label: 'No, it’s all one floor', value: 'steps' },
];
export const MORE_METHODS: Choice<WakeMethod>[] = [{ label: 'Scan a code in another room', value: 'scan' }];

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
      { when: 'Start', what: 'Open me and tap Start. Then go downstairs.' },
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
};

/**
 * `walk`: a 20-step taste of tomorrow before the paywall (MORNING_ANGLE.md #2, TODO §4).
 * The count is live and real, and it's where iOS asks for Motion & Fitness, framed as
 * "that's how I count". Always skippable: nobody has to walk to see the price. It comes right
 * after the `tomorrow` demo (see it, then try it), and late at night it's skipped altogether.
 */
export const WALK_GOAL = 20;

export const WALK_COPY: Record<WakeMethod, { intro: string; done: string }> = {
  downstairs: {
    intro: 'Tomorrow it’s a trip downstairs. Tonight, 20 steps anywhere will do.',
    done: 'That’s tomorrow morning, with real stairs instead of 20 steps. Then your apps wake up.',
  },
  steps: {
    intro: 'Tomorrow it’s 200 steps. Tonight, 20 will do. Walk around the room.',
    done: 'Same tomorrow, just 200 instead of 20. Then your apps wake up.',
  },
  scan: {
    intro: 'Tomorrow you walk to your code. Tonight, 20 steps anywhere will do.',
    done: 'That’s tomorrow morning: up, a short walk, then your apps wake up.',
  },
};

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
export function methodCopy(method: WakeMethod): MethodCopy {
  const saved = METHOD_COPY[method];
  // A returning scan user already has a code: no "set up your code" today.
  const copy: MethodCopy =
    method === 'scan' && getScanCode()
      ? { ...saved, morning: [{ when: 'Morning', what: 'Walk to your code and scan it. That wakes them.' }] }
      : saved;
  // The routine tomorrow runs on: a Routine edit waiting for bedtime included (`saveSetup`).
  const goal = hasRoutine() ? (getPendingRoutine()?.routine ?? getRoutine()).stepGoal : 200;
  if (goal === 200) return copy;
  const swap = <T,>(value: T): T => {
    if (typeof value === 'string') return value.replace(/\b200\b/g, String(goal)) as T;
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

export const NEW_YEAR = {
  hello: { head: 'New year. Same bed.', sub: 'I’m Loc. I don’t do resolutions. I do locks.' },
  /** Ends `deal`'s body: beats "I'll start Monday". */
  deal: 'Starts tonight. Not Monday.',
  commit: 'The deal for',
  plans: 'No sale. I’m too tired for a sale.',
  armed: 'Armed. First night of the year. Don’t make it weird.',
};
