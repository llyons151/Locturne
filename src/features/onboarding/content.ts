/**
 * Onboarding copy and choices. Voice rules: docs/VOICE.md (brief, deadpan, no
 * exclamation points, no guilt, no statistics in Loc's mouth).
 * Flow and evidence: docs/ONBOARDING_CONVERSION.md.
 */

import type { WakeMethod } from '@/lib/routine';

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
  alarm?: string;
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
  'tomorrow',
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
 * Steps that show the progress bar: the quiz and setup only. Welcome, offer and
 * post-purchase screens hide it, so the paywall never reads as one more step.
 */
export const PROGRESS_STEPS: StepId[] = [
  'nights',
  'night-minutes',
  'nights-per-week',
  'morning-minutes',
  'stat',
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
  'tomorrow',
  'screen-time',
  'apps',
  'ready',
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

export const ALARM: Choice<string>[] = [
  { label: 'Wrecked', value: 'wrecked' },
  { label: 'Groggy', value: 'groggy' },
  { label: "Fine (I'm lying)", value: 'lying' },
  { label: 'Fine (really)', value: 'fine' },
];

/** His reply to the alarm answer, on the page before the paywall. Deadpan, never a health claim. */
export const ALARM_ECHO: Record<string, string> = {
  wrecked: 'Wrecked, you said. Same. We walk anyway.',
  groggy: 'Groggy, you said. So am I. We walk anyway.',
  lying: '“Fine,” you said. Sure. We walk anyway.',
  fine: 'Fine mornings, you said. Let’s keep them.',
};

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
 */
export const TRIED_ECHO: Record<string, { line: string; body: string }> = {
  'screen-time': {
    line: 'Screen Time has an Ignore button. I don’t.',
    body: 'Its limits end with one tap. Mine end after 200 steps. There’s an emergency unlock, but it takes more than a tap.',
  },
  blocker: {
    line: 'Clocks don’t check if you’re up. I do.',
    body: 'Most blockers switch off at a set time, even if you’re still in bed. Your apps stay asleep until you’ve walked 200 steps.',
  },
  willpower: {
    line: 'Willpower goes to bed before you do.',
    body: 'So I don’t ask for any. The apps are asleep until you’ve walked 200 steps.',
  },
  'other-room': {
    line: 'And the alarm’s in there with it.',
    body: 'Keep the phone by the bed. The apps stay asleep either way, until you’ve walked 200 steps.',
  },
  nothing: {
    line: 'I’m your first, then. Be gentle.',
    body: 'The apps you pick sleep at bedtime. 200 steps in the morning wakes them up.',
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
  workout: 'Workouts, then. I’ll count the first 200.',
  mornings: 'Slow mornings. My favorite kind.',
  else: 'Your nights back. Mine too.',
};

/** For people who barely use their phone in bed: the pitch is mornings, not a cost. */
export const LIGHT_OFFER_HEADLINE = 'Mornings, then. Mine too.';

/** His reaction on the statistic screen, echoing "how long are you on your phone before you get up?" */
export const MORNING_ECHO: Record<number, string> = {
  3: 'Under five? We’ll see tomorrow.',
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
 * The arm comes from remote config; preview one with `?exit=<arm>`.
 */
export {
  DEFAULT_EXIT_ARM as DEFAULT_EXIT_OFFER,
  EXIT_ARMS as EXIT_OFFERS,
  type ExitArm as ExitOffer,
} from '@/lib/purchases';

/** His line under "Try Locturne free", from the trial length the store reports. */
export function trialVoice(days: number): string {
  return `${days === 7 ? 'Seven' : days} nights free. I’ll sleep through most of them.`;
}

/** The `longer-trial` exit offer's headline. "Two free weeks" reads better than "14 days". */
export function longerTrialVoice(days: number): string {
  return days === 14 ? 'Fair. Two free weeks, then.' : `Fair. ${days} free days, then.`;
}

/**
 * The fine-print links. PLACEHOLDERS: no live pages exist yet. Apple requires working Terms
 * (EULA) and Privacy links on the paywall and in App Store Connect before review.
 */
export const LEGAL_URLS = {
  terms: 'https://locturne.app/terms',
  privacy: 'https://locturne.app/privacy',
} as const;

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
    morning: [
      { when: 'Steps', what: 'They count from your alarm. Bathroom, kitchen, it all counts.' },
      { when: 'At 200', what: 'Open a sleeping app and tap Check steps. Or just open me.' },
    ],
  },
  scan: {
    echo: 'Another room. Choose it wisely.',
    short: 'Scan',
    check: 'Awake again once you scan your code',
    until: 'you’ve scanned your code',
    commit: 'Up to scan your code.',
    morning: [
      { when: 'Today', what: 'Set up your code in Routine and leave it in another room.' },
      { when: 'Morning', what: 'Walk to it and scan it. Until it’s set up, 200 steps works.' },
    ],
  },
};
