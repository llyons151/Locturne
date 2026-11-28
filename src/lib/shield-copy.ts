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
import { t } from './i18n/core.ts';
import { clockLabel } from './i18n/format.ts';

export { clockLabel };

/**
 * `ring`: the block's start and end as minutes of the day. The shield extension draws the moon
 * ring and "Asleep for 6h 12m more." from it each time the shield appears (LocturneShieldRing.swift).
 */
export type ShieldText = {
  title: string;
  subtitle: string;
  button: string;
  ring?: { from: number; until: number };
  icon?: string;
  /** The title when iOS gives the shield no app name to put in `title` (ShieldConfigurationExtension.swift). */
  titleNoApp?: string;
};

/** Filled in by the shield extension with the blocked app's or site's name. */
const APP = '{applicationOrDomainDisplayName}';

/** Shield 100 no. 100 (user, 2026-11-28): "Shh. Instagram is asleep.", or "Shh. It's asleep." without a name. */
const asleepTitle = () => ({ title: t('shield.appAsleep', { app: APP }), titleNoApp: t('shield.alwaysTitle') });

/**
 * The SF Symbol at the top of the morning shield: the wake-up method's own icon, as on the
 * Routine tab (`sf` in features/routine/method-options.ts), so the shield says what to do at a
 * glance (user 2026-11-24). The other shields keep Apple's moon.
 */
export const METHOD_SYMBOL: Record<WakeMethod, string> = {
  steps: 'figure.walk',
  dance: 'figure.dance',
  scan: 'barcode.viewfinder',
  place: 'mappin.and.ellipse',
  pushups: 'figure.strengthtraining.functional',
  pullups: 'figure.climbing',
  bench: 'figure.strengthtraining.traditional',
  grass: 'leaf',
  sun: 'sun.max',
  pet: 'pawprint',
  bed: 'bed.double',
  downtime: 'hourglass',
};

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
 * What the morning asks for, in the order that works. Steps count from the motion
 * chip's history, so the shield's I'm up button checks them with Locturne closed
 * (`locturneMorningCheck`): walk first, then tap it. The camera and the
 * place check-in live in the app, so those open Locturne. Walking only wakes a steps morning
 * from here; walking instead of another method is chosen in Locturne (user 2026-10-28). Step
 * away's few steps start its timer from the shield too, and the timer's end wakes them by itself.
 */
type ProofRoutine = Pick<Routine, 'stepGoal' | 'downtimeSteps'>;
const PROOF: Record<WakeMethod, (routine: ProofRoutine) => string> = {
  dance: () => t('shield.proofDance'),
  steps: (r) => t('shield.proofSteps', { steps: r.stepGoal }),
  scan: () => t('shield.proofScan'),
  place: () => t('shield.proofPlace'),
  pushups: () => t('shield.proofPushups'),
  pullups: () => t('shield.proofPullups'),
  bench: () => t('shield.proofBench'),
  grass: () => t('shield.proofGrass'),
  sun: () => t('shield.proofSun'),
  pet: () => t('shield.proofPet'),
  bed: () => t('shield.proofBed'),
  downtime: (r) => t('shield.proofDowntime', { steps: downtimeStepsOf(r) }),
};

/**
 * Step away's timer, once it's running (wake/downtime.ts): when they wake, or that it runs into
 * bedtime and they don't today. Null before it starts.
 */
export type ShieldTimer = { wakesAt: Date; bedtimeFirst: boolean } | null;

function timerLine(timer: NonNullable<ShieldTimer>): string {
  if (timer.bedtimeFirst) return t('shield.timerPastBedtime');
  return t('shield.timerRunning', { clock: clockLabel(timer.wakesAt.getHours() * 60 + timer.wakesAt.getMinutes()) });
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
        ...asleepTitle(),
        subtitle: t('shield.nightSubtitle', { wake }),
        button: t('shield.fine'),
        ...nightRing(routine),
      };
    case 'lateNight':
      return {
        title: t('shield.lateTitle'),
        subtitle: t('shield.lateSubtitle', { wake }),
        button: t('shield.backToBed'),
        ...nightRing(routine),
      };
    case 'morning':
      return {
        // Step away's timer running: they're up, so not "No.", and nothing to tap.
        title: timer ? t('shield.notYet') : t('shield.no'),
        subtitle: timer ? timerLine(timer) : (PROOF[routine.method] ?? PROOF.steps)(routine),
        button: t('shield.imUp'),
        icon: METHOD_SYMBOL[routine.method] ?? METHOD_SYMBOL.steps,
      };
    case 'blockNow':
      return {
        ...asleepTitle(),
        subtitle: until
          ? t('shield.napUntil', { clock: clockLabel(until.getHours() * 60 + until.getMinutes()) })
          : t('shield.napOpen'),
        button: t('shield.fine'),
        // Minutes of the day can't tell a nap of a day or more from a short one.
        ...(until && since && until.getTime() - since.getTime() < 1440 * 60_000
          ? { ring: { from: minuteOf(since), until: minuteOf(until) } }
          : {}),
      };
    case 'limit':
      return {
        ...asleepTitle(),
        subtitle: t('shield.limitSubtitle'),
        button: t('shield.fine'),
        ring: { from: 0, until: 1440 },
      };
    case 'always':
      // Also read when the night apps fall asleep at bedtime with the app closed, until the
      // night windows switch the text themselves (docs/v1-build/v1-screens.md). So it has to
      // be true of both lists.
      return {
        ...asleepTitle(),
        subtitle: t('shield.alwaysSubtitle'),
        button: t('shield.fine'),
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
    title: t('shield.tapTitle'),
    body: t('shield.tapBody'),
    identifier: 'locturne.shieldTap',
    userInfo: { url: 'locturne://wake' },
  };
}

/**
 * You → Test the lock's shield (`startTestLock`): the real morning shield for the method under
 * test, with the person's own step goal, and its tap that opens Locturne.
 */
export function testLockShield(method: WakeMethod, routine: ShieldRoutine) {
  return { words: shieldCopy('morning', { ...routine, method }), tap: shieldTap('morning') };
}
