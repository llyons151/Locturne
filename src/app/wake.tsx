'use no memo';
// Reads the App Group stores during render (the routine, the saved code), which change outside
// React. The React Compiler would cache those reads from the first render, so it stays out here.

import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

import { leaveLab } from '@/components/leave-route';
import { readLock, routineAt } from '@/lib/lock-controller';
import { shownScanCode } from '@/features/dev/wake-lab/stand-ins';
import { askWalk } from '@/features/home/walk-request';

/**
 * The morning wake-up has no page of its own: it happens on Home (docs/HOME_INTERACTIVE.md;
 * the old wake screens went 2026-10-17, user). This route is kept for what still opens `/wake`
 * (a notification or shield tap, an old link) and sends it on: a scan routine with its code
 * saved to the camera, everything else back to the tabs already open. Not a `<Redirect>`, which
 * would stack a second Home whose morning sensors keep running unseen. `?method=steps` asks
 * Home for this morning's walk instead.
 */
export default function WakeRoute() {
  const { method } = useLocalSearchParams<{ method?: string }>();
  useEffect(() => {
    const routine = routineAt(new Date());
    if (method !== 'steps' && routine.method === 'scan' && shownScanCode()) return router.replace('/scan?mode=morning');
    // A scan routine with no code saved can only be walked.
    if (method === 'steps' || (routine.method === 'scan' && !shownScanCode())) askWalk(readLock().morningKey);
    leaveLab();
  }, [method]);
  return null;
}
