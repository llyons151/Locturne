/**
 * What onboarding keeps once it's done, paid or not (ONBOARDING_CONVERSION, "Declined":
 * keep the setup saved and arm nothing). Saving never blocks anything: only `armTonight`
 * does, and only after purchase.
 */
import { rescheduleNotifications } from '@/lib/notifications';
import { DEFAULT_ROUTINE, saveRoutine } from '@/lib/routine';
import { sharedGet, sharedSet } from '@/lib/screen-time';

import type { Answers } from './content';

/** Read by the notifications work: whether to send the day-5 trial reminder. */
export const TRIAL_REMINDER_KEY = 'locturne.trialReminder';
/** "How'd you find me?", kept for the analytics purchase event (TODO §4). Never shown back. */
export const ATTRIBUTION_KEY = 'locturne.attribution';
/** The exit offer is shown once per Apple ID's install, so it can't be farmed by rerunning onboarding. */
const EXIT_OFFER_SHOWN_KEY = 'locturne.exitOfferShown';

/**
 * Saves the schedule and wake-up method. With nothing armed (a first run, or after declining)
 * it applies at once; with a night armed it waits for the next bedtime, like every other
 * settings change. Called once, when the setup is final: on purchase, or when leaving after
 * the paywall.
 */
export function saveSetup(answers: Answers): void {
  saveRoutine({
    ...DEFAULT_ROUTINE,
    bedtime: answers.bedtime,
    morningStart: answers.wake,
    method: answers.method ?? DEFAULT_ROUTINE.method,
  });
  rescheduleNotifications().catch(() => {});
  if (answers.found) sharedSet(ATTRIBUTION_KEY, { found: answers.found, at: Date.now() });
}

export function saveTrialReminder(on: boolean): void {
  sharedSet(TRIAL_REMINDER_KEY, on);
}

export function wasExitOfferShown(): boolean {
  return sharedGet<boolean>(EXIT_OFFER_SHOWN_KEY) === true;
}

export function markExitOfferShown(): void {
  sharedSet(EXIT_OFFER_SHOWN_KEY, true);
}
