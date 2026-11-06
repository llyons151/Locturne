/**
 * The block screen's words (GAME_PLAN, "Look and voice"). iOS draws the shield itself: a
 * small icon, a title, a subtitle and one button. His line is the title, the subtitle says
 * plainly why the app is asleep and when it wakes, and the button is the person's grudging
 * reply. VOICE.md rules apply: short, flat, no exclamation points, no guilt.
 *
 * iOS keeps one shield text for the whole app, not one per app, so `shieldRule` picks the
 * rule the person is most likely to run into: the night or morning lock (it holds the most
 * apps), then Block now, then a used-up daily limit, then the always-asleep list.
 *
 * Everything here is pure, so it runs in tests. `syncLock` (lock-controller.ts) hands the words
 * to iOS on every sync.
 */
import type { LockState, Phase } from './lock-state.ts';
import type { Routine, WakeMethod } from './routine.ts';
import { downtimeStepsOf } from './wake/downtime.ts';

/**
 * `ring`: the block's start and end as minutes of the day. The shield extension draws the moon
 * ring and "Asleep for 6h 12m more." from it each time the shield appears (LocturneShieldRing.swift).
 */
export type ShieldText = { title: string; subtitle: string; button: string; ring?: { from: number; until: number } };

/** The onboarding demos have no bedtime: no ring. */
type ShieldRoutine = Pick<Routine, 'morningStart' | 'method' | 'stepGoal' | 'downtimeSteps'> & Partial<Pick<Routine, 'bedtime'>>;
const nightRing = (r: ShieldRoutine) => (r.bedtime === undefined ? {} : { ring: { from: r.bedtime, until: r.morningStart } });

const minuteOf = (date: Date) => date.getHours() * 60 + date.getMinutes();

/** Which rule's words the shield shows. */
export type ShieldRule = 'night' | 'lateNight' | 'morning' | 'blockNow' | 'limit' | 'always';

export type ShieldFacts = {
  phase: Phase;
  /** Local time now, in minutes since midnight. Picks the 2am line. */
  minuteOfDay: number;
  /** When a running Block now session ends, or null. */
  blockNowUntil: Date | null;
  /** True when any daily limit is used up today. */
  limitReached: boolean;
};

/** "7 am", "7:30 am", "11 pm": the same style as the Routine tab. */
export function clockLabel(minutes: number): string {
  const m = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const mins = m % 60;
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${mins ? `${hour}:${String(mins).padStart(2, '0')}` : hour} ${h < 12 ? 'am' : 'pm'}`;
}

/** Midnight to 5am: VOICE.md's "App opened at 2am" line. */
const isLate = (minuteOfDay: number) => minuteOfDay < 5 * 60;

/** Pure: which rule's words to show right now. */
export function shieldRule(facts: ShieldFacts): ShieldRule {
  if (facts.phase === 'night') return isLate(facts.minuteOfDay) ? 'lateNight' : 'night';
  if (facts.phase === 'morning') return 'morning';
  if (facts.blockNowUntil) return 'blockNow';
  if (facts.limitReached) return 'limit';
  return 'always';
}

/**
 * What the morning asks for, in the order that works. Steps and floors count from the motion
 * chip's history, so the shield's I'm up button checks them with Locturne closed
 * (`locturneMorningCheck`): walk or take the stairs first, then tap it. The camera and the
 * place check-in live in the app, so those open Locturne. Walking only wakes a steps morning
 * from here; walking instead of another method is chosen in Locturne (user 2026-10-28). Step
 * away's few steps start its timer from the shield too, and the timer's end wakes them by itself.
 */
type ProofRoutine = Pick<Routine, 'stepGoal' | 'downtimeSteps'>;
const PROOF: Record<WakeMethod, (routine: ProofRoutine) => string> = {
  downstairs: () => 'Go down a floor, then tap I’m up.',
  steps: (r) => `Walk ${r.stepGoal} steps, then tap I’m up.`,
  scan: () => 'Open Locturne and scan your code.',
  place: () => 'Go to your place and check in from Locturne.',
  pushups: () => 'Open Locturne for your push-ups.',
  downtime: (r) => `Walk ${downtimeStepsOf(r)} steps, then tap I’m up. The timer starts from your steps.`,
};

/**
 * Step away's timer, once it's running (wake/downtime.ts): when they wake, or that it runs into
 * bedtime and they don't today. Null before it starts.
 */
export type ShieldTimer = { wakesAt: Date; bedtimeFirst: boolean } | null;

function timerLine(timer: NonNullable<ShieldTimer>): string {
  if (timer.bedtimeFirst) return 'Your timer runs past bedtime, so they sleep through to tomorrow.';
  return `Timer’s running. They wake at ${clockLabel(timer.wakesAt.getHours() * 60 + timer.wakesAt.getMinutes())}.`;
}

/**
 * Pure: the words for one rule. `routine` supplies the wake-up time and method; `until` is
 * when a Block now session ends.
 */
export function shieldCopy(
  rule: ShieldRule,
  routine: ShieldRoutine,
  until: Date | null = null,
  timer: ShieldTimer = null,
  since: Date | null = null,
): ShieldText {
  const wake = clockLabel(routine.morningStart);
  switch (rule) {
    case 'night':
      return {
        title: 'Shh. I’m sleeping. So are they.',
        subtitle: `They wake up after ${wake}, once you’re out of bed.`,
        button: 'Fine',
        ...nightRing(routine),
      };
    case 'lateNight':
      return {
        title: 'Why are we awake.',
        subtitle: `Your apps are asleep until you’re up after ${wake}.`,
        button: 'Back to bed',
        ...nightRing(routine),
      };
    case 'morning':
      return {
        // Step away's timer running: they're up, so not "No.", and nothing to tap.
        title: timer ? 'Not yet.' : 'No.',
        subtitle: timer ? timerLine(timer) : (PROOF[routine.method] ?? PROOF.steps)(routine),
        button: 'I’m up',
      };
    case 'blockNow':
      return {
        title: 'Tucked in. Do not perceive me.',
        subtitle: until
          ? `Napping until ${clockLabel(until.getHours() * 60 + until.getMinutes())}.`
          : 'Napping. They wake when the nap ends.',
        button: 'Fine',
        // Minutes of the day can't tell a nap of a day or more from a short one.
        ...(until && since && until.getTime() - since.getTime() < 1440 * 60_000
          ? { ring: { from: minuteOf(since), until: minuteOf(until) } }
          : {}),
      };
    case 'limit':
      return {
        title: 'That’s today’s lot.',
        subtitle: 'Your daily limit is used up. It wakes at midnight.',
        button: 'Fine',
        ring: { from: 0, until: 1440 },
      };
    case 'always':
      // Also read when the night apps fall asleep at bedtime with the app closed, until the
      // night windows switch the text themselves (docs/v1-build/v1-screens.md). So it has to
      // be true of both lists.
      return {
        title: 'Shh. It’s asleep.',
        subtitle: 'You put this one to sleep. It stays that way for now.',
        button: 'Fine',
      };
  }
}

/** Pure: the words for a lock state. */
export function shieldTextFor(
  state: Pick<LockState, 'phase' | 'blockNowUntil'>,
  routine: ShieldRoutine,
  now: Date,
  limitReached: boolean,
  timer: ShieldTimer = null,
  napStart: Date | null = null,
): ShieldText {
  const rule = shieldRule({
    phase: state.phase,
    minuteOfDay: now.getHours() * 60 + now.getMinutes(),
    blockNowUntil: state.blockNowUntil,
    limitReached,
  });
  return shieldCopy(rule, routine, state.blockNowUntil, timer, napStart);
}

/**
 * What tapping the shield's button sends, in the shape react-native-device-activity takes
 * for a `sendNotification` action. A shield button can't open the app, but tapping this
 * notification does, straight onto the wake-up screen. Morning only: at night the answer is
 * "go to sleep", and a notification would only keep them up.
 */
export function shieldTap(phase: Phase) {
  if (phase !== 'morning') return null;
  return {
    title: 'Up already?',
    body: 'Tap here and prove it. Then they wake.',
    identifier: 'locturne.shieldTap',
    userInfo: { url: 'locturne://wake' },
  };
}
