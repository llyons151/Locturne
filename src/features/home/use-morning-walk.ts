import { useEffect } from 'react';

import { useSmoothSteps } from '@/hooks/use-smooth-steps';
import { useStepCount } from '@/hooks/use-step-count';
import { currentMorning } from '@/lib/lock-state';
import { toLockSettings, type Routine } from '@/lib/routine';

import { useProveMorning } from '../wake/use-prove-morning';
import { pretendSince } from '../dev/wake-lab/wake-preview';

export type MorningWalk =
  | { kind: 'counting'; steps: number | null; goal: number }
  | { kind: 'denied' | 'unavailable' };

/**
 * Home's morning when the wake-up is a walk (docs/HOME_INTERACTIVE.md): the live step count
 * since morning start, read from the motion chip's history plus live updates, so steps taken
 * before opening the app already count and leaving Home loses nothing. At the goal it proves
 * the morning in place and Home turns to day. Null while `enabled` is false.
 */
export function useMorningWalk(enabled: boolean, routine: Routine, proves = true): MorningWalk | null {
  const goal = routine.stepGoal;
  // A pretend morning (the wake preview's tests) counts from when it began.
  const morningStart = pretendSince() ?? currentMorning(new Date(), toLockSettings(routine)).start;
  const { status, steps } = useStepCount(enabled, morningStart, goal);
  const prove = useProveMorning();
  // Counted under every method, for "Walk 200 steps instead"; it only wakes the apps when the
  // walk is the morning's way or they chose it instead (`proves`, user 2026-10-28).
  const walked = enabled && proves && status === 'counting' && steps >= goal;
  // Shown a step at a time between the pedometer's batches; proved on the raw count above.
  const shown = useSmoothSteps(enabled && status === 'counting' ? Math.min(steps, goal) : null);

  useEffect(() => {
    if (walked) prove('steps');
  }, [walked, prove]);

  if (!enabled) return null;
  if (status === 'denied' || status === 'unavailable') return { kind: status };
  return {
    kind: 'counting',
    steps: status === 'starting' ? null : (shown ?? Math.min(steps, goal)),
    goal,
  };
}
