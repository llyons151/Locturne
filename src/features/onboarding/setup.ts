/**
 * What onboarding keeps once it's done, paid or not (ONBOARDING_CONVERSION, "Declined":
 * keep the setup saved and arm nothing). Saving never blocks anything: only `armTonight`
 * does, and only after purchase.
 */
import { inPendingFirstNight, syncLock } from '@/lib/lock-controller';
import { cancelTrialReminder, rescheduleNotifications, syncTrialEnd, TRIAL_REMINDER_KEY } from '@/lib/notifications';
import { ATTRIBUTES, currentTrialEnd, setAttributes } from '@/lib/purchases';
import { DEFAULT_ROUTINE, getPendingRoutine, getRoutine, hasRoutine, saveRoutine } from '@/lib/routine';
import { sharedGet, sharedSet } from '@/lib/screen-time';
import { setTone } from '@/lib/tone';

import type { Answers } from './content';

/** Read by the notifications work: whether to send the trial reminder (noon, at least two days before the end). */
/**
 * "How'd you find me?", kept here for the analytics purchase event (TODO §4) and sent to
 * RevenueCat as the `found` attribute. Never shown back.
 */
export const ATTRIBUTION_KEY = 'locturne.attribution';
/**
 * The quiz answers the paywall's words are built from, kept on the phone (never sent) so
 * someone who comes back through "See plans" gets their own headline, not the light-user one
 * (B5 in docs/ONBOARDING_OPTIMIZATION.md).
 */
const QUIZ_KEY = 'locturne.quizAnswers';
const QUIZ_FIELDS = [
  'nights',
  'nightMinutes',
  'nightsPerWeek',
  'scrollDays',
  'morningMinutes',
  'timeBack',
  'shift',
] as const satisfies readonly (keyof Answers)[];
type QuizAnswers = Pick<Answers, (typeof QUIZ_FIELDS)[number]>;

/** The exit offer is shown once per Apple ID's install, so it can't be farmed by rerunning onboarding. */
const EXIT_OFFER_SHOWN_KEY = 'locturne.exitOfferShown';

/**
 * Saves the schedule and wake-up method. With nothing armed (a first run, or after declining)
 * it applies at once; with a night armed it waits for the next bedtime, like every other
 * settings change. Called once, when the setup is final: on purchase, or when leaving after
 * the paywall.
 */
export function saveSetup(answers: Answers): void {
  // Onboarding only asks for these three, so a rerun (or the paywall reopened from You) keeps
  // the nights off and step goal set on the Routine tab.
  const current = hasRoutine() ? (getPendingRoutine()?.routine ?? getRoutine()) : DEFAULT_ROUTINE;
  const now = new Date();
  // His words, not a rule: saved before the sync below so the shield says it his way tonight.
  setTone(answers.tone);
  // A rerun inside a waiting edit's early first night: that edit governs tonight, so this one
  // waits for its next bedtime (`applyEdit`).
  saveRoutine(
    {
      ...current,
      bedtime: answers.bedtime,
      morningStart: answers.wake,
      method: answers.method ?? DEFAULT_ROUTINE.method,
    },
    now,
    inPendingFirstNight(now),
  );
  // Home has been reading the default routine under onboarding; arming syncs, but an arm that
  // fails before it gets that far (no access, no picks) wouldn't, so tell the screens now.
  syncLock(now);
  rescheduleNotifications().catch(() => {});
  sharedSet(QUIZ_KEY, pickQuiz(answers));
  if (answers.found) saveAttribution(answers.found);
}

/** "How'd you find me?": kept for the purchase event and sent to RevenueCat as `found`. */
export function saveAttribution(found: string): void {
  sharedSet(ATTRIBUTION_KEY, { found, at: Date.now() });
  setAttributes({ [ATTRIBUTES.found]: found });
}

/** Pure: the quiz answers worth keeping, without the ones they skipped. */
export function pickQuiz(answers: Partial<Answers>): QuizAnswers {
  const out: Partial<Record<keyof QuizAnswers, unknown>> = {};
  for (const field of QUIZ_FIELDS) if (answers[field] !== undefined) out[field] = answers[field];
  return out as QuizAnswers;
}

/** The quiz answers from the last finished setup, for reopening the paywall. Empty before one. */
export function savedQuizAnswers(): QuizAnswers {
  return pickQuiz(sharedGet<Partial<Answers>>(QUIZ_KEY) ?? {});
}

let trialReminderRequest = 0;

/** Called after purchase. Schedules the trial reminder (it lands once notifications are allowed). */
export function saveTrialReminder(on: boolean): void {
  const request = ++trialReminderRequest;
  sharedSet(TRIAL_REMINDER_KEY, on);
  const scheduled = on
    ? currentTrialEnd().then((end) => {
        // A store lookup can finish after another setup or an opt-out. Only the latest
        // choice may publish its deadline; a confirmed absent trial clears an old one.
        if (request !== trialReminderRequest || sharedGet<boolean>(TRIAL_REMINDER_KEY) !== true) return;
        return syncTrialEnd(end);
      })
    : cancelTrialReminder();
  scheduled.catch(() => {});
}

export function wasExitOfferShown(): boolean {
  return sharedGet<boolean>(EXIT_OFFER_SHOWN_KEY) === true;
}

export function markExitOfferShown(): void {
  sharedSet(EXIT_OFFER_SHOWN_KEY, true);
  setAttributes({ [ATTRIBUTES.exitOfferShown]: 'true' });
}
