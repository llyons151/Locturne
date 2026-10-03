import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { readLock } from '@/lib/lock-controller';
import type { LockState } from '@/lib/lock-state';
import { getProof, onProofChange, type MorningProof } from '@/lib/morning-proof';
import { getRoutine, type Routine } from '@/lib/routine';
import { applyShieldText } from '@/lib/shield-copy';

/**
 * What Home shows, read from the real state and kept fresh: on every visit, whenever the
 * app comes back to the foreground, when a morning proof lands (the wake-up screen records
 * one, then comes back here), and when the schedule crosses its next boundary while Home is
 * open. Each refresh also puts the right words on the shield.
 *
 * TODO(useLock): once `useLock()` (src/hooks/use-lock.ts) is merged, swap this for it and
 * keep only the proof and routine reads here. Calling `applyShieldText` belongs in
 * `syncLock` then, not in a screen.
 */
export type HomeData = {
  lock: LockState;
  routine: Routine;
  /** This morning's proof, if it's been unlocked. */
  proof: MorningProof | null;
};

function read(): HomeData {
  const now = new Date();
  const lock = readLock(now);
  return { lock, routine: getRoutine(now), proof: getProof(lock.morningKey) };
}

/** setTimeout's ceiling is about 24.8 days; a boundary is never further than a day away. */
const MAX_WAIT_MS = 24 * 60 * 60 * 1000;

export function useHomeState(): [HomeData, () => void] {
  const [data, setData] = useState<HomeData>(read);
  const refresh = useCallback(() => setData(read()), []);

  useFocusEffect(refresh);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => state === 'active' && refresh());
    const stop = onProofChange(refresh);
    return () => {
      sub.remove();
      stop();
    };
  }, [refresh]);

  // Bedtime or morning start passing while Home is on screen.
  const next = data.lock.nextChange.getTime();
  useEffect(() => {
    const wait = Math.min(Math.max(next - Date.now(), 0) + 1000, MAX_WAIT_MS);
    const id = setTimeout(refresh, wait);
    return () => clearTimeout(id);
  }, [next, refresh]);

  useEffect(() => {
    applyShieldText(data.lock, new Date(), data.routine);
  }, [data]);

  return [data, refresh];
}
