import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

import type { Fix } from '@/lib/place';

import { fakeLiveFix, startFakeWalk } from '../dev/wake-lab/stand-ins';
import { useWakePreview } from '../dev/wake-lab/wake-preview';

/** How often the fake walk moves, and the least a real fix has to move to be sent. */
const FAKE_TICK_MS = 1_000;
const MOVE_M = 5;

/**
 * Where you are, live, for the morning's map (place-screen.tsx), while `active`. Display only:
 * Check in is still the one read that counts (locate.ts `readFix`). It never asks for access:
 * with none yet it gives null until Check in has asked, so `retry` (the screen's stage) starts
 * it again after. When-In-Use only, stopped as the screen goes. The wake preview can FAKE it.
 */
export function useLiveFix(active: boolean, retry: unknown): Fix | null {
  const [fix, setFix] = useState<Fix | null>(null);
  const fake = useWakePreview().place;

  // The fake walk starts from the far end each time the screen opens, not each check-in.
  useEffect(() => startFakeWalk(), []);

  useEffect(() => {
    if (!active) return;
    if (fake !== 'real') {
      const tick = () => setFix(fakeLiveFix(fake));
      const first = setTimeout(tick, 0);
      const timer = setInterval(tick, FAKE_TICK_MS);
      return () => {
        clearTimeout(first);
        clearInterval(timer);
      };
    }
    let stopped = false;
    let watch: Location.LocationSubscription | null = null;
    (async () => {
      const permission = await Location.getForegroundPermissionsAsync();
      if (!permission.granted || stopped) return;
      const sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: MOVE_M },
        ({ coords, timestamp }) => setFix({ latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy, timestamp }),
      );
      if (stopped) sub.remove();
      else watch = sub;
    })().catch(() => {});
    return () => {
      stopped = true;
      watch?.remove();
    };
  }, [active, fake, retry]);

  return active ? fix : null;
}
