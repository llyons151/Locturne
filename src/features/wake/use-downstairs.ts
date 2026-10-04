import { Barometer, Pedometer } from 'expo-sensors';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';

import type { DownstairsSession } from '@/lib/wake/downstairs';
import { watchDownstairs, type BarometerAccess, type DownstairsWatch } from '@/lib/wake/downstairs-watch';

export type { BarometerAccess };

/**
 * A live "go downstairs" session on the barometer (wake/downstairs.ts has the rules,
 * wake/downstairs-watch.ts the wiring). It only listens between Start and the end of the
 * session, and stops if the app leaves the foreground.
 */
export function useDownstairs() {
  const [access, setAccess] = useState<BarometerAccess>('checking');
  const [session, setSession] = useState<DownstairsSession | null>(null);
  const watch = useRef<DownstairsWatch | null>(null);

  useEffect(() => {
    const current = watchDownstairs({
      barometer: Barometer,
      pedometer: Pedometer,
      isIOS: Platform.OS === 'ios',
      onAppState: (listener) => AppState.addEventListener('change', listener),
      onAccess: setAccess,
      onSession: setSession,
    });
    watch.current = current;
    return () => {
      current.dispose();
      if (watch.current === current) watch.current = null;
    };
  }, []);

  const start = useCallback(() => watch.current?.start() ?? Promise.resolve(), []);
  const stop = useCallback(() => watch.current?.stop(), []);

  return { access, session, start, stop };
}
