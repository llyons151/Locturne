import { router } from 'expo-router';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { armTonight } from '@/features/onboarding/arm';
import { askForNotifications, onNotificationTap, opensWakeScreen, shouldAskForNotifications } from '@/lib/notifications';
import { settleSubscription } from '@/lib/lock-controller';
import { isEntitled, onEntitled } from '@/lib/purchases';
import { hasRoutine } from '@/lib/routine';
import { getAccess, getArmedNight, isScreenTimeAvailable, selectionSize } from '@/lib/screen-time';

/**
 * Asks whether there's a subscription and acts on it (`settleSubscription`): without one,
 * everything stands down from the next bedtime; with one, anything stood down comes back,
 * and tonight is armed if nothing is: the purchase was waiting (Ask to Buy, a bank check)
 * and has gone through since, a restore found one, or the night was lost. Nothing arms
 * before purchase. `isEntitled` falls back to the cached answer offline, so a paid user
 * keeps (and gets back) their lock without a network.
 */
export function armIfPaid(): void {
  if (!hasRoutine() || !isScreenTimeAvailable()) return;
  isEntitled()
    .then((paid) => {
      settleSubscription(paid);
      if (!paid || getArmedNight() || getAccess() !== 'approved' || selectionSize('night') === 0) return;
      return armTonight();
    })
    .catch(() => {
      // The App Store didn't answer and nothing is cached. The next open asks again.
    });
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
  useEffect(() => {
    if (!hasRoutine()) {
      router.push('/onboarding');
      return;
    }
    shouldAskForNotifications()
      .then((ask) => (ask ? askForNotifications() : false))
      .catch(() => {});
    armIfPaid();
  }, []);

  useEffect(() => onEntitled(armIfPaid), []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => state === 'active' && armIfPaid());
    return () => sub.remove();
  }, []);

  useEffect(
    () =>
      onNotificationTap((identifier) => {
        if (opensWakeScreen(identifier) && hasRoutine()) router.push('/wake');
      }),
    [],
  );
}
