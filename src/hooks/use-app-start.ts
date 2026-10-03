import { router } from 'expo-router';
import { useEffect } from 'react';

import { armTonight } from '@/features/onboarding/arm';
import { askForNotifications, onNotificationTap, opensWakeScreen, shouldAskForNotifications } from '@/lib/notifications';
import { isEntitled, onEntitled } from '@/lib/purchases';
import { hasRoutine } from '@/lib/routine';
import { getAccess, getArmedNight, isScreenTimeAvailable, selectionSize } from '@/lib/screen-time';

/**
 * Arms tonight for someone with a saved routine, nothing armed, and a subscription: the
 * purchase was waiting (Ask to Buy, a bank check) and has gone through since, a restore
 * found one, or the night was lost. Nothing arms before purchase. `isEntitled` falls back
 * to the cached answer offline, so a paid user is re-armed without a network.
 */
export function armIfPaid(): void {
  if (!hasRoutine() || !isScreenTimeAvailable() || getArmedNight() || getAccess() !== 'approved') return;
  if (selectionSize('night') === 0) return;
  isEntitled()
    .then((paid) => (paid ? armTonight() : null))
    .catch(() => {
      // The App Store didn't answer and nothing is cached. The next launch asks again.
    });
}

/**
 * Once per launch, from the tabs (the root navigator is mounted by then):
 * - No saved routine yet: this is a first launch, so open onboarding.
 * - Otherwise `armIfPaid`.
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

  useEffect(
    () =>
      onNotificationTap((identifier) => {
        if (opensWakeScreen(identifier) && hasRoutine()) router.push('/wake');
      }),
    [],
  );
}
