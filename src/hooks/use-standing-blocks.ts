import { useEffect } from 'react';
import { AppState } from 'react-native';

import { isScreenTimeAvailable, reapplyStandingBlocks, settleLimitChanges } from '@/lib/screen-time';

/**
 * Each time the app opens: apply list removals and looser daily limits whose bedtime has
 * passed, then re-shield every rule still in force. A backstop for the monitor extension, which does the
 * same after each Screen Time event while the app is closed.
 */
export function useStandingBlocks(): void {
  useEffect(() => {
    if (!isScreenTimeAvailable()) return;
    const sync = () => {
      settleLimitChanges().catch(() => {
        // iOS refused a re-arm. The stricter limit stays in place, and the next open retries.
      });
      reapplyStandingBlocks();
    };
    sync();
    const sub = AppState.addEventListener('change', (state) => state === 'active' && sync());
    return () => sub.remove();
  }, []);
}
