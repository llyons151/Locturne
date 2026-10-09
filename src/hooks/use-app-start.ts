import { router, usePathname } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { track } from '@/lib/analytics';
import { armTonight } from '@/lib/arm';
import { paidSettleCount, settleSubscription } from '@/lib/lock-controller';
import { onProofChange } from '@/lib/morning-proof';
import {
  askForNotifications,
  onNotificationTap,
  opensWakeScreen,
  rescheduleNotifications,
  shouldAskForNotifications,
  syncTrialEnd,
  wakeScreenShowing,
} from '@/lib/notifications';
import { takePendingApproval } from '@/lib/pending-purchase';
import { currentTrialEnd, isEntitled, isPurchasing, onEntitled } from '@/lib/purchases';
import { hasRoutine } from '@/lib/routine';
import { getAccess, getArmedNight, isScreenTimeAvailable, shownSelection } from '@/lib/screen-time';

/**
 * Asks whether there's a subscription and acts on it (`settleSubscription`): without one,
 * everything stands down from the next bedtime; with one, anything stood down comes back,
 * and tonight is armed if nothing is: the purchase was waiting (Ask to Buy, a bank check)
 * and has gone through since, a restore found one, or the night was lost. Nothing arms
 * before purchase. `isEntitled` falls back to the cached answer offline, so a paid user
 * keeps (and gets back) their lock without a network.
 */
export function armIfPaid(): void {
  if (!isScreenTimeAvailable()) return;
  // Settled even before a routine exists: the always list, limits and Block now are gated on
  // the stand-down too, and someone who left onboarding early has Screen Time access.
  // An unpaid answer is dropped if a purchase or restore settled as paid while it was asked
  // (Apple's sheets bring the app back to the front mid-purchase), or one is still running.
  const asked = paidSettleCount();
  const stale = () => paidSettleCount() !== asked || isPurchasing();
  isEntitled().then(
    (paid) => {
      if (!paid && stale()) return;
      // An Ask to Buy approval that landed after the paywall closed (onboarding reports the
      // one it sees itself): the funnels start from `purchase_result = purchased`.
      if (paid && !isPurchasing() && takePendingApproval()) {
        track('purchase_result', { target: 'approved', page: 'later', status: 'purchased' });
      }
      settleSubscription(paid);
      // A stand-down took the armed night away, and Health still reads "on": replan, or
      // "Bedtime in 15 minutes" keeps coming with nothing to block.
      rescheduleNotifications().catch(() => {});
      followTrial();
      if (!paid || !hasRoutine() || getArmedNight() || getAccess() !== 'approved' || shownSelection('night').size === 0) return;
      // The bedtime and morning notes only plan for an armed night.
      armTonight()
        .then(() => rescheduleNotifications())
        .catch(() => {});
    },
    // Only the store's answer lands here (not a failed arm or reschedule): it didn't answer and
    // nothing is cached, so never bought here (a reinstall has no lock to lose either). Nothing
    // paid runs until it does; the next open asks again.
    () => {
      if (!getArmedNight() && !stale()) settleSubscription(false);
    },
  );
}

/**
 * The trial reminder and Home's "Then the annual plan starts" follow the store: gone once
 * the trial is cancelled in Apple's sheet or refunded, back if auto-renew is turned on again.
 * Runs only after the store or the cache answered, so an offline open doesn't lose it.
 */
let trialRequest = 0;
function followTrial(): void {
  const request = ++trialRequest;
  currentTrialEnd()
    .then((end) => request === trialRequest ? syncTrialEnd(end) : undefined)
    .catch(() => {});
}

/**
 * Once per launch, from the tabs (the root navigator is mounted by then):
 * - No saved routine yet: this is a first launch, so open onboarding.
 * - Otherwise `armIfPaid`, and again each time the app comes back to the front, so a
 *   subscription that ended is noticed (and one renewed or restored elsewhere too).
 *
 * - The first night has held or a morning was proven, and iOS hasn't asked yet: show iOS's
 *   notification prompt (GAME_PLAN: "Asked for after the first successful night").
 *
 * And for as long as the app runs:
 * - A subscription that turns on outside a purchase (a parent approves Ask to Buy while the
 *   app is open) arms tonight the same way.
 * - A tap on the shield-tap or morning notification opens the wake-up screen (a shield
 *   button can't open the app; its notification can).
 */
export function useAppStart(): void {
  // At launch: where a cold deep link put the app. After that: what's in front, for a tap.
  const pathname = usePathname();
  const shown = useRef(pathname);
  useEffect(() => {
    shown.current = pathname;
  }, [pathname]);
  useEffect(() => {
    if (!hasRoutine()) {
      // Not when a link already opened it (`/onboarding?…` on a fresh install): a second copy
      // would be pushed on top, and finishing one would land on the other.
      if (pathname !== '/onboarding') router.push('/onboarding');
      armIfPaid();
      return;
    }
    shouldAskForNotifications()
      .then((ask) => (ask ? askForNotifications() : false))
      .catch(() => {});
    armIfPaid();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per launch, where it started
  }, []);

  useEffect(() => onEntitled(armIfPaid), []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => state === 'active' && armIfPaid());
    return () => sub.remove();
  }, []);

  // A morning just unlocked (wake-up, pass, emergency unlock): its "apps stay asleep"
  // notification must not fire.
  // (By the proof itself: the list is capped, so its length stops changing after a month.)
  useEffect(
    () =>
      onProofChange(() => {
        rescheduleNotifications().catch(() => {});
      }),
    [],
  );

  useEffect(
    () =>
      onNotificationTap((identifier) => {
        // Not while a wake or scan screen is already open: `/wake` becomes `/scan` for a scan
        // routine, so navigating would stack another copy (and drop a walk's `?method=steps`).
        if (opensWakeScreen(identifier) && hasRoutine() && !wakeScreenShowing(shown.current)) router.navigate('/wake');
      }),
    [],
  );
}
