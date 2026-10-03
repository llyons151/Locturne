import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import type { LockState } from '@/lib/lock-state';
import { onLockChange, readLock, syncLock } from '@/lib/lock-controller';
import { onProofChange } from '@/lib/morning-proof';

/**
 * The live lock state (phase, what's asleep, the morning key, the next change), for any
 * screen. It syncs the shields when the screen mounts, whenever the app returns to the
 * foreground, when a proof is recorded, and at the next schedule boundary (morning start
 * or bedtime) while the app stays open. Anything else that calls `syncLock` (a routine
 * save, a pass) updates it too.
 */
export function useLock(): LockState {
  // Read during render; the sync (which touches shields and tells every listener) runs after.
  const [state, setState] = useState<LockState>(() => readLock());

  useEffect(() => {
    const stopLock = onLockChange(setState);
    syncLock();
    const stopProof = onProofChange(() => syncLock());
    const sub = AppState.addEventListener('change', (next) => next === 'active' && syncLock());
    return () => {
      stopLock();
      stopProof();
      sub.remove();
    };
  }, []);

  // Wake up at the next boundary. setTimeout can't wait longer than about 24.8 days.
  const nextChange = state.nextChange.getTime();
  useEffect(() => {
    const ms = Math.min(Math.max(0, nextChange - Date.now()) + 500, 2 ** 31 - 1);
    const id = setTimeout(() => syncLock(), ms);
    return () => clearTimeout(id);
  }, [nextChange]);

  return state;
}
