import { Alert, Linking } from 'react-native';

import { armTonight } from './arm.ts';
import { rescheduleNotifications } from './notifications.ts';
import {
  currentNightWindowNames,
  getArmedNight,
  isStoodDown,
  reapplyStandingBlocks,
  rearmNap,
  requestAccess,
} from './screen-time.ts';

/**
 * Access is back: put back what a revoke took. The shields of every list a rule still holds,
 * and, for someone paid, tonight's windows, which iOS stops on a revoke while the record of
 * the armed night stays (`getProtection` reads that gap as off). A running nap's end is handed
 * back too: the revoke stopped the window that wakes its apps. Resolves once iOS has them, so
 * a caller re-reading protection doesn't still see the gap.
 */
export async function restoreBlocks(): Promise<void> {
  reapplyStandingBlocks();
  await rearmNap().catch(() => {});
  const armed = getArmedNight();
  if (!armed || isStoodDown() || currentNightWindowNames().length === armed.windows) return;
  await armTonight()
    .then(() => rescheduleNotifications())
    .catch(() => {});
}

/**
 * For anything that needs Screen Time while access is off: show Apple's prompt again rather
 * than sending people to another tab (user, 2026-10-13). FamilyControls' individual prompt
 * can be shown again after Don't Allow and after a revoke in Settings, and its cached status
 * can be stale, so it asks rather than reading the status (docs/NAV_AND_ACCESS.md). Refused
 * again, or iOS throws (no passcode, say), one alert offers Settings. Resolves to whether
 * access is on, so the caller can carry on with what was tapped.
 */
export async function askAccessAgain(): Promise<boolean> {
  try {
    if ((await requestAccess()) === 'approved') {
      await restoreBlocks();
      return true;
    }
  } catch {
    // Falls through to the alert.
  }
  Alert.alert(
    'Screen Time access is off',
    'Locturne needs it to put apps to sleep. Turn it on in Settings › Screen Time › Apps with Screen Time Access.',
    [
      { text: 'Not now', style: 'cancel' },
      { text: 'Open Settings', isPreferred: true, onPress: () => Linking.openSettings().catch(() => {}) },
    ],
  );
  return false;
}
