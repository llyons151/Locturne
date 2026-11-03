import { syncNapActivity } from 'blocked-apps';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { onLockChange } from '@/lib/lock-controller';
import { isScreenTimeAvailable, peekNap, sharedGet, SHIELD_MOON_KEY } from '@/lib/screen-time';

/**
 * Block now's countdown in the Dynamic Island and on the Lock Screen (user, 2026-11-02: "the
 * black bar extends a little bit and adds a timer"). Every sync puts it in step with the nap:
 * started, passed, ended early or over. Starting one, ending one and every open all sync
 * (nap-screen.tsx, passes.ts, use-standing-blocks.ts). A nap that ends with the app closed
 * leaves it reading "Apps awake" until the next open ends it.
 */
export function useNapActivity(): void {
  useEffect(() => {
    if (Platform.OS !== 'ios' || !isScreenTimeAvailable()) return;
    const sync = () => syncNapActivity(peekNap(), sharedGet<string>(SHIELD_MOON_KEY) ?? null);
    sync();
    return onLockChange(sync);
  }, []);
}
