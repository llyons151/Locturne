import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { getProtection, watchAccess, type Protection } from '@/lib/screen-time';

/**
 * Whether Locturne is really protecting anything (`getProtection`), kept fresh: on every
 * visit to the screen, whenever the app comes back to the foreground (access is usually
 * switched off in Settings while we're away), and when iOS reports a new status. Returns
 * the status and a function to check again, for after asking for access.
 */
export function useProtection(): [Protection, () => void] {
  const [protection, setProtection] = useState<Protection>(getProtection);
  const recheck = useCallback(() => setProtection(getProtection()), []);

  useFocusEffect(recheck);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => state === 'active' && recheck());
    const stopWatching = watchAccess(recheck);
    return () => {
      sub.remove();
      stopWatching();
    };
  }, [recheck]);

  return [protection, recheck];
}
