import { useEffect } from 'react';

import { useStepCount } from '@/hooks/use-step-count';
import { currentMorning } from '@/lib/lock-state';
import { toLockSettings, type Routine } from '@/lib/routine';

import { useProveMorning } from '../wake/use-prove-morning';

export type MorningWalk =
  | { kind: 'counting'; steps: number | null; goal: number }
  | { kind: 'denied' | 'unavailable' };

/**
 * Home's morning when the wake-up is a walk (docs/HOME_INTERACTIVE.md): the live step count
 * since morning start, read from the motion chip's history plus live updates, so steps taken
 * before opening the app already count and leaving Home loses nothing. At the goal it proves
 * the morning in place and Home turns to day. Null while `enabled` is false.
 */
export function useMorningWalk(enabled: boolean, routine: Routine): MorningWalk | null {
  const goal = routine.stepGoal;
  const morningStart = currentMorning(new Date(), toLockSettings(routine)).start;
  const { status, steps } = useStepCount(enabled, morningStart, goal);
  const prove = useProveMorning();
  const walked = enabled && status === 'counting' && steps >= goal;

  useEffect(() => {
    if (walked) prove('steps');
  }, [walked, prove]);

  if (!enabled) return null;
  if (status === 'denied' || status === 'unavailable') return { kind: status };
  return {
    kind: 'counting',
    steps: status === 'starting' ? null : Math.min(steps, goal),
    goal,
  };
}
