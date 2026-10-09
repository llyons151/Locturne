import { awakeLine } from '@/features/home/awake-line';
import { lapseStillCovers, subscriptionEnded } from '@/lib/lock-controller';
import type { LockState } from '@/lib/lock-state';
import { nightAt } from '@/lib/routine';
import { isScreenTimeAvailable, isStoodDown, nightLockArmed, selectionSize } from '@/lib/screen-time';
import { formatPreset } from '@/lib/text';

import { dayStatus } from './wake-words';

/**
 * "Apps awake until 10:00 PM", from the routine that runs tonight (a waiting edit, a night
 * off), as on Home; a Block now running leads instead (`dayStatus`). A lapsed user proving
 * the last paid morning has nothing scheduled after. Shared by both morning successes: the
 * wake screen and the scan screen.
 */
export function awakeStatus(state: LockState): string {
  const { start, on } = nightAt(state.nextChange);
  return dayStatus(
    state.blockNowUntil,
    awakeLine({
      armed: nightLockArmed(),
      // Past a lapse's last paid morning nothing is scheduled either, stood down or not yet.
      stoodDown: isStoodDown() || (subscriptionEnded() && lapseStillCovers() === null),
      tonightAt: on ? formatPreset(start.getHours() * 60 + start.getMinutes()) : null,
      alwaysSleeps: !isScreenTimeAvailable() || selectionSize('always') > 0,
    }),
  );
}
