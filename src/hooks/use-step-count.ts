import { Pedometer } from 'expo-sensors';
import { useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';

import { fakePedometer } from '@/features/dev/wake-lab/fake-sensors';
import { useWakePreview } from '@/features/dev/wake-lab/wake-preview';
import { watchSteps, type StepStatus } from '@/lib/wake/step-watch';
import { stepsOf, type StepCount } from '@/lib/wake/steps';

export type { StepStatus };

const onAppState = (listener: (state: string) => void) => AppState.addEventListener('change', listener);

/**
 * Steps since `morningStart`, live (wake/steps.ts has the rules, wake/step-watch.ts the
 * wiring). History from the motion chip covers steps walked before the screen opened, and
 * while the app was in the background; `watchStepCount` moves the number while they walk.
 * Never HealthKit: it lags and can't be read while the phone is locked (GAME_PLAN,
 * "Reliability is a feature"). Used by the wake-up screen and onboarding's practice walk.
 *
 * The wake preview (/wake-preview, dev only) can swap the pedometer for a FAKE one.
 */
export function useStepCount(enabled: boolean, morningStart: Date, goal: number) {
  const [status, setStatus] = useState<StepStatus>('starting');
  const [count, setCount] = useState<StepCount | null>(null);
  const startMs = morningStart.getTime();
  const fake = useWakePreview().steps;
  const [source, setSource] = useState({ enabled, startMs, goal, fake });
  // Reset during render: an effect reset would leave one committed render in which a
  // new morning (or a lower goal) could be proved with the old watcher's steps.
  if (source.enabled !== enabled || source.startMs !== startMs || source.goal !== goal || source.fake !== fake) {
    setSource({ enabled, startMs, goal, fake });
    setStatus('starting');
    setCount(null);
  }

  useEffect(() => {
    if (!enabled) return;
    const sensor = fake === 'real' ? { pedometer: Pedometer, isIOS: Platform.OS === 'ios' } : { pedometer: fakePedometer(fake, goal), isIOS: true };
    return watchSteps({ ...sensor, onAppState }, { morningStart: startMs, goal, onStatus: setStatus, onCount: setCount });
  }, [enabled, startMs, goal, fake]);

  return { status, steps: count ? stepsOf(count) : 0, count };
}
