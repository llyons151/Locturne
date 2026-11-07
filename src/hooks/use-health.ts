import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { rollUpHealth, type Health } from '@/lib/health';
import { lapseStillCovers, onLockChange, subscriptionEnded } from '@/lib/lock-controller';
import { readNightChecks } from '@/lib/heartbeat';
import { isPurchasePending } from '@/lib/pending-purchase';
import { rescheduleNotifications } from '@/lib/notifications';
import { getRoutine } from '@/lib/routine';
import { getAccess, getArmedNight, getProtection, watchAccess } from '@/lib/screen-time';

/** Reads every fact the status needs, right now. */
export function readHealth(now = new Date()): Health {
  return rollUpHealth({
    protection: getProtection(),
    access: getAccess(),
    armed: getArmedNight(),
    routine: getRoutine(now),
    nights: readNightChecks(now),
    purchasePending: isPurchasePending(now.getTime()),
    unsubscribed: subscriptionEnded(),
    lapseCovers: lapseStillCovers(now),
    now,
  });
}

/**
 * While Apple's Screen Time prompt is being answered and the blocks put back (`holdHealthWhile`),
 * the status isn't re-read: access reads approved before the shields are up again, and the
 * screen flashed "access looks off" for a moment (user 2026-11-07). Read once it's over.
 */
let held = 0;
const releases = new Set<() => void>();

export async function holdHealthWhile<T>(work: Promise<T>): Promise<T> {
  held += 1;
  try {
    return await work;
  } finally {
    held -= 1;
    if (held === 0) releases.forEach((recheck) => recheck());
  }
}

/**
 * Locturne's honest status (`rollUpHealth`): whether protection is really on and whether
 * last night's block started, with his words for it. Kept fresh like `useProtection`: on
 * every visit to the screen, when the app returns to the foreground, and when iOS reports
 * a new Screen Time status. Show `title` and `detail` as they are; never soften them.
 *
 * It also keeps the notifications in line: once on mount (rolling the schedule forward),
 * and whenever protection changes, so the bedtime warning turns into the revoked-access
 * warning while access is off. Returns the status and a function to check again.
 */
export function useHealth(): [Health, () => void] {
  const [health, setHealth] = useState<Health>(() => readHealth());
  const recheck = useCallback(() => {
    if (held === 0) setHealth(readHealth());
  }, []);
  useEffect(() => {
    releases.add(recheck);
    return () => {
      releases.delete(recheck);
    };
  }, [recheck]);

  useFocusEffect(recheck);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => state === 'active' && recheck());
    const stopWatching = watchAccess(recheck);
    // Every sync too: the store's answer lands after the foreground read (a lapse found then
    // stands down), and a bedtime or morning passes while the screen stays open.
    const stopSyncing = onLockChange(recheck);
    return () => {
      stopSyncing();
      sub.remove();
      stopWatching();
    };
  }, [recheck]);

  useEffect(() => {
    rescheduleNotifications().catch(() => {});
  }, [health.protection]);

  return [health, recheck];
}
