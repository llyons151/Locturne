import { Barometer, Pedometer } from 'expo-sensors';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';

import { fakeStairs } from '@/features/dev/wake-lab/fake-sensors';
import { useWakePreview } from '@/features/dev/wake-lab/wake-preview';
import type { DownstairsSession } from '@/lib/wake/downstairs';
import { watchDownstairs, type BarometerAccess, type DownstairsWatch } from '@/lib/wake/downstairs-watch';

export type { BarometerAccess };

/**
 * A live "go downstairs" session on the barometer (wake/downstairs.ts has the rules,
 * wake/downstairs-watch.ts the wiring). It only listens between Start and the end of the
 * session, and stops if the app leaves the foreground. The wake preview (/wake-preview, dev
 * only) can swap the barometer for a FAKE one that plays a scripted trip down the stairs.
 */
export function useDownstairs(enabled = true) {
  const [access, setAccess] = useState<BarometerAccess>('checking');
  const [session, setSession] = useState<DownstairsSession | null>(null);
  const watch = useRef<DownstairsWatch | null>(null);
  const fake = useWakePreview().stairs;

  // Home keeps this mounted all day; it only checks the barometer while it's the morning's
  // method, and a session left over from the last morning goes with it.
  const [wasEnabled, setWasEnabled] = useState(enabled);
  if (wasEnabled !== enabled) {
    setWasEnabled(enabled);
    if (!enabled) setSession(null);
  }

  useEffect(() => {
    if (!enabled) return;
    const sensors = fake === 'real' ? { barometer: Barometer, pedometer: Pedometer, isIOS: Platform.OS === 'ios' } : fakeStairs(fake);
    const current = watchDownstairs({
      ...sensors,
      onAppState: (listener) => AppState.addEventListener('change', listener),
      onAccess: setAccess,
      onSession: setSession,
    });
    watch.current = current;
    return () => {
      current.dispose();
      if (watch.current === current) watch.current = null;
    };
  }, [fake, enabled]);

  const start = useCallback(() => watch.current?.start() ?? Promise.resolve(), []);
  const stop = useCallback(() => watch.current?.stop(), []);
  /** The Stop button: stops listening and drops the session, so Start shows again. */
  const cancel = useCallback(() => {
    watch.current?.stop();
    setSession(null);
  }, []);

  return { access, session, start, stop, cancel };
}
