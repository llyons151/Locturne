import { router } from 'expo-router';
import { useEffect } from 'react';

import { armTonight } from '@/features/onboarding/arm';
import { askForNotifications, onNotificationTap, opensWakeScreen, shouldAskForNotifications } from '@/lib/notifications';
import { isEntitled } from '@/lib/purchases';
import { hasRoutine } from '@/lib/routine';
import { getAccess, getArmedNight, isScreenTimeAvailable, selectionSize } from '@/lib/screen-time';

/**
 * Once per launch, from the tabs (the root navigator is mounted by then):
 * - No saved routine yet: this is a first launch, so open onboarding.
 * - A routine but nothing armed, and now paid for: the purchase was waiting (Ask to Buy, a
 *   bank check) and has gone through since, so arm tonight. Nothing arms before purchase.
 *
 * - The first night has held or a morning was proven, and iOS hasn't asked yet: show iOS's
 *   notification prompt (GAME_PLAN: "Asked for after the first successful night").
 *
 * And for as long as the app runs: a tap on the shield-tap or morning notification opens
 * the wake-up screen (a shield button can't open the app; its notification can).
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
    if (!isScreenTimeAvailable() || getArmedNight() || getAccess() !== 'approved' || selectionSize('night') === 0) return;
    isEntitled()
      .then((paid) => (paid ? armTonight() : null))
      .catch(() => {
        // The App Store didn't answer. The next launch asks again.
      });
  }, []);

  useEffect(
    () =>
      onNotificationTap((identifier) => {
        if (opensWakeScreen(identifier) && hasRoutine()) router.push('/wake');
      }),
    [],
  );
}
