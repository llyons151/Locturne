import { useEffect } from 'react';
import { AppState } from 'react-native';

import { requestSyncLock } from '@/lib/lock-controller';
import { isScreenTimeAvailable, settleLimitChanges } from '@/lib/screen-time';

/**
 * Each time the app opens, wherever it opens: apply list removals and looser daily limits
 * whose bedtime has passed, then `syncLock`, which wakes or re-shields the bedtime apps and
 * re-shields every other rule still in force. A backstop for the monitor extension, which
 * does the same after each Screen Time event while the app is closed. Screens that show the
 * state use `useLock`, which syncs too; both ask through `requestSyncLock`, so a return to the
 * front syncs once, after the settle.
 */
export function useStandingBlocks(): void {
  useEffect(() => {
    if (!isScreenTimeAvailable()) return;
    const sync = () => {
      settleLimitChanges()
        .catch(() => {
          // iOS refused a re-arm. The stricter limit stays in place, and the next open retries.
        })
        .finally(() => requestSyncLock());
    };
    sync();
    const sub = AppState.addEventListener('change', (state) => state === 'active' && sync());
    return () => sub.remove();
  }, []);
}
