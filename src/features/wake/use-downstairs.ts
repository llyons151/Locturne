import { Barometer, Pedometer } from 'expo-sensors';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';

import { addSample, isOver, startDownstairs, tick, type DownstairsSession } from '@/lib/wake/downstairs';

/**
 * - `checking`: finding out whether there's a barometer and Motion & Fitness is on.
 * - `ready`: Start can be tapped.
 * - `denied`: Motion & Fitness is off for Locturne (the barometer shares that permission).
 * - `unavailable`: no barometer, or no relative altitude (anything but an iPhone).
 */
export type BarometerAccess = 'checking' | 'ready' | 'denied' | 'unavailable';

/** CMAltimeter reports about once a second whatever we ask; ask for a little faster anyway. */
const UPDATE_MS = 500;
const TICK_MS = 1_000;

/**
 * A live "go downstairs" session on the barometer (wake/downstairs.ts has the rules). It only
 * listens between Start and the end of the session, and stops if the app leaves the
 * foreground: iOS pauses the altimeter then, so the session would be judging a gap. Coming
 * back shows Start again rather than pretending.
 */
export function useDownstairs() {
  const [access, setAccess] = useState<BarometerAccess>('checking');
  const [session, setSession] = useState<DownstairsSession | null>(null);
  const sessionRef = useRef<DownstairsSession | null>(null);
  const stopRef = useRef<() => void>(() => {});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (Platform.OS !== 'ios' || !(await Barometer.isAvailableAsync())) return setAccess('unavailable');
        // Barometer has no permission calls of its own (expo-sensors answers "granted"); the
        // altimeter needs Motion & Fitness, which Pedometer's calls really ask iOS about.
        const permission = await Pedometer.getPermissionsAsync();
        if (!cancelled) setAccess(permission.granted || permission.canAskAgain ? 'ready' : 'denied');
      } catch {
        if (!cancelled) setAccess('unavailable');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const stop = useCallback(() => stopRef.current(), []);
  // Start waits on iOS's permission answer: a second tap, or leaving the screen meanwhile,
  // must not leave a listener running.
  const starting = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const start = useCallback(async () => {
    if (starting.current) return;
    starting.current = true;
    stop();
    const permission = await Pedometer.requestPermissionsAsync().catch(() => null);
    starting.current = false;
    if (!mounted.current) return;
    if (!permission?.granted) {
      setAccess('denied');
      return;
    }
    setAccess('ready');

    const update = (next: DownstairsSession) => {
      sessionRef.current = next;
      setSession(next);
      if (isOver(next)) stopRef.current();
    };
    update(startDownstairs(Date.now()));

    Barometer.setUpdateInterval(UPDATE_MS);
    const listener = Barometer.addListener(({ relativeAltitude }) => {
      const current = sessionRef.current;
      // Off iOS there's no relative altitude: NaN makes the session report no signal.
      if (current) update(addSample(current, { at: Date.now(), altitude: relativeAltitude ?? Number.NaN }));
    });
    const clock = setInterval(() => {
      if (sessionRef.current) update(tick(sessionRef.current, Date.now()));
    }, TICK_MS);
    // Only a real trip to the background: Control Center and alerts pass through `inactive`.
    const away = AppState.addEventListener('change', (state) => {
      if (state !== 'background') return;
      stopRef.current();
      sessionRef.current = null;
      setSession(null);
    });
    stopRef.current = () => {
      listener.remove();
      clearInterval(clock);
      away.remove();
      stopRef.current = () => {};
    };
  }, [stop]);

  useEffect(() => stop, [stop]);

  return { access, session, start, stop };
}
