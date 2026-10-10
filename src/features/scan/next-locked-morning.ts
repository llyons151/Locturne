import { bedtimeAppsAhead, getNightPause } from '@/lib/emergency';
import { lapseStillCovers, readLock, routineAt, subscriptionEnded } from '@/lib/lock-controller';
import { nightsAround } from '@/lib/lock-state';
import { nextNightOn, nightAt, toLockSettings } from '@/lib/routine';
import { isStoodDown, nightLockArmed } from '@/lib/screen-time';

import type { NextMorning } from './next-morning';

/**
 * The next morning the lock holds, or null when every night is off. A night under way here
 * holds nothing (no lock, or an emergency paused it), so its morning is free: look past it.
 * With nothing scheduled to sleep at all (no night lock, stood down, no subscription past
 * the night or morning a lapse still covers, or a bedtime list empty at the next bedtime,
 * which `readLock` reads as a free morning), no morning wants the code: 'unscheduled'.
 */
export function nextLockedMorning(now: Date): NextMorning {
  if (!nightLockArmed() || isStoodDown() || (subscriptionEnded() && lapseStillCovers(now) === null) || !bedtimeAppsAhead(now)) {
    return 'unscheduled';
  }
  const night = nightsAround(now, toLockSettings(routineAt(now))).latest;
  const from = readLock(now).phase === 'night' ? (getNightPause(now) ?? night.end) : now;
  const start = nextNightOn(from, now);
  if (!start) return null;
  // The night that starts there: a waiting edit's first night can start at `from`, after its
  // own night of that day ended (a switch to a night shift, 08:00 to 16:00, saved in the day).
  const { latest, next } = nightsAround(start, toLockSettings(nightAt(start, now).routine));
  return start < latest.end || start.getTime() === latest.start.getTime() ? latest.end : next.end;
}
