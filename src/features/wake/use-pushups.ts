import { DeviceMotion, Pedometer } from 'expo-sensors';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';

import type { PushupsSession } from '@/lib/wake/pushups';
import { watchPushups, type PushupsAccess, type PushupsWatch } from '@/lib/wake/pushups-watch';

import { Proximity } from '../../../modules/proximity';

export type { PushupsAccess };

/**
 * A live push-up session (wake/pushups.ts has the rules, wake/pushups-watch.ts the wiring).
 * It only listens between Start and the end of the session, and stops if the app leaves the
 * foreground. `say` is Loc counting out loud, on the phone.
 */
export function usePushups() {
  const [access, setAccess] = useState<PushupsAccess>('checking');
  const [session, setSession] = useState<PushupsSession | null>(null);
  const watch = useRef<PushupsWatch | null>(null);

  useEffect(() => {
    const current = watchPushups({
      proximity: Proximity,
      motion: DeviceMotion,
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

  const start = useCallback((goal: number) => watch.current?.start(goal) ?? Promise.resolve(), []);
  const stop = useCallback(() => watch.current?.stop(), []);
  /** The Stop button: stops listening and drops the session, so Start shows again. */
  const cancel = useCallback(() => {
    watch.current?.stop();
    setSession(null);
  }, []);
  const say = useCallback((text: string) => void Proximity?.say(text).catch(() => {}), []);

  return { access, session, start, stop, cancel, say };
}
