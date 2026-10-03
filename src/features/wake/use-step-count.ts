import { Pedometer } from 'expo-sensors';
import { useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';

import { addHistory, addLive, restartLive, startCount, stepsOf, type StepCount } from '@/lib/wake/steps';

/**
 * - `starting`: asking for Motion & Fitness and reading this morning's history.
 * - `counting`: live.
 * - `denied`: Motion & Fitness is off for Locturne. The screen says how to turn it on.
 * - `unavailable`: no step counter (web, the simulator, a very old phone).
 */
export type StepStatus = 'starting' | 'counting' | 'denied' | 'unavailable';

/** History is read again this often while the screen is open, as a backstop for live updates. */
const HISTORY_EVERY_MS = 10_000;

/**
 * Steps since `morningStart`, live (wake/steps.ts has the rules). History from the motion
 * chip covers steps walked before the screen opened, and while the app was in the
 * background; `watchStepCount` moves the number while they walk. Never HealthKit: it lags
 * and can't be read while the phone is locked (GAME_PLAN, "Reliability is a feature").
 */
export function useStepCount(enabled: boolean, morningStart: Date, goal: number) {
  const [status, setStatus] = useState<StepStatus>('starting');
  const [count, setCount] = useState<StepCount | null>(null);
  const countRef = useRef<StepCount | null>(null);
  const startMs = morningStart.getTime();

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let watch: { remove: () => void } | null = null;
    let poll: ReturnType<typeof setInterval> | null = null;

    const update = (next: StepCount) => {
      countRef.current = next;
      if (!cancelled) setCount(next);
    };
    const readHistory = async () => {
      const now = new Date();
      if (now.getTime() <= startMs) return 0;
      return (await Pedometer.getStepCountAsync(new Date(startMs), now)).steps;
    };
    const refresh = async () => {
      const current = countRef.current;
      if (!current) return;
      try {
        const steps = await readHistory();
        // Read the ref again: live updates may have landed while waiting.
        if (countRef.current) update(addHistory(countRef.current, steps, Date.now()));
      } catch {
        // A failed read just waits for the next one; live updates carry on.
      }
    };
    const subscribe = () => {
      watch?.remove();
      if (countRef.current) update(restartLive(countRef.current));
      watch = Pedometer.watchStepCount(({ steps }) => {
        if (countRef.current) update(addLive(countRef.current, steps, Date.now()));
      });
    };

    (async () => {
      try {
        // Step history only exists on iOS (`getStepCountAsync`), which is all v1 targets.
        if (Platform.OS !== 'ios' || !(await Pedometer.isAvailableAsync())) return setStatus('unavailable');
        const permission = await Pedometer.requestPermissionsAsync();
        if (cancelled) return;
        if (!permission.granted) return setStatus('denied');
        const steps = await readHistory();
        if (cancelled) return;
        update(startCount(goal, steps, Date.now()));
        setStatus('counting');
        subscribe();
        poll = setInterval(refresh, HISTORY_EVERY_MS);
      } catch {
        if (!cancelled) setStatus('unavailable');
      }
    })();

    // Live updates stop in the background; on return, catch up from history and listen again.
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active' || !countRef.current) return;
      subscribe();
      refresh();
    });

    return () => {
      cancelled = true;
      watch?.remove();
      if (poll) clearInterval(poll);
      sub.remove();
    };
  }, [enabled, startMs, goal]);

  return { status, steps: count ? stepsOf(count) : 0, count };
}
