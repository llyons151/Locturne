'use no memo';
// Reads the App Group store (this morning's timer) during render, which changes outside React.

import { Pedometer } from 'expo-sensors';
import { useEffect, useRef, useState } from 'react';
import { Linking, Platform } from 'react-native';

import { useSmoothSteps } from '@/hooks/use-smooth-steps';
import { useStepCount } from '@/hooks/use-step-count';
import { readDowntime, startDowntime, syncLock } from '@/lib/lock-controller';
import { currentMorning } from '@/lib/lock-state';
import { noStepCounter } from '@/lib/step-counter';
import { downtimeMinutesOf, downtimeStepsOf, toLockSettings, type Routine } from '@/lib/routine';
import { clockLabel } from '@/lib/shield-copy';
import { downtimePhase, minutesLabel, minutesLeft, type DowntimeRecord } from '@/lib/wake/downtime';
import { downtimeLine } from '@/lib/wake/lines';

import { getPretendTimer, pretendSince, startPretendTimer, useWakePreview } from '../dev/wake-lab/wake-preview';
import { announceWoke, useProveMorning } from '../wake/use-prove-morning';
import type { HomeMorning } from './home-content';
import { duration } from './night-meter';

const ICON = { ios: 'hourglass', android: 'hourglass_empty' };
/** The wake preview's pretend timer: a minute, not an hour, so it can be watched to the end. */
const PRETEND_MINUTES = 1;

/** Steps history from the motion chip, as `findThresholdTime` asks for it. Null where there's none. */
async function stepsBetween(from: number, to: number): Promise<number | null> {
  if (Platform.OS !== 'ios') return null;
  try {
    return (await Pedometer.getStepCountAsync(new Date(from), new Date(to))).steps;
  } catch {
    return null;
  }
}

/**
 * Home's morning when the wake-up is Step away (wake/downtime.ts): the walk's count first, as
 * Walk it off's (steps since the morning start, ones walked before opening the app included),
 * then, once the steps are in, a calm countdown to when the apps wake. The timer is saved and
 * runs from when the steps were really reached (`startDowntime`), so leaving Home, closing the
 * app or restarting the phone changes nothing, and iOS wakes the apps at its end with Locturne
 * closed. When it ends with Home open, the morning is proved here. Null while `enabled` is false.
 *
 * In the wake preview's pretend morning nothing is saved: a one-minute timer runs locally.
 */
export function useMorningDowntime(enabled: boolean, routine: Routine): HomeMorning | null {
  // The real clock, not Home's minute: the end tick below re-renders exactly at the timer's end.
  const now = new Date();
  const pretending = useWakePreview().phase !== 'real';
  const goal = downtimeStepsOf(routine);
  const morning = currentMorning(now, toLockSettings(routine));
  const since = pretendSince();
  const startMs = (since ?? morning.start).getTime();
  // A pretend morning's timer lives in the wake preview, by its `since` (survives remounts).
  const pretendRun = pretending && since ? getPretendTimer(since.getTime()) : null;
  const pretend: DowntimeRecord | null = pretendRun
    ? { morningKey: morning.key, start: startMs, reachedAt: pretendRun.reachedAt, endsAt: pretendRun.endsAt, minutes: PRETEND_MINUTES, steps: goal }
    : null;
  const saved = readDowntime(now);
  const record = pretending ? pretend : saved.record;
  const phase = pretending ? downtimePhase(pretend, now.getTime(), null) : saved.phase;

  // No step counter (an iPad, step-counter.ts): nothing to count, the timer runs from the morning start.
  const noSteps = !pretending && noStepCounter();
  // Counting until the timer starts; then the count has done its job.
  const counting = enabled && !record && !noSteps;
  const { status, steps } = useStepCount(counting, new Date(startMs), goal);
  const shown = useSmoothSteps(counting && status === 'counting' ? Math.min(steps, goal) : null);
  const reached = (counting && status === 'counting' && steps >= goal) || (enabled && !record && noSteps);

  // A pretend morning's timer starts right here, in render (as useStepCount resets its count):
  // nothing is saved, and an effect would draw one frame of "Starting your timer" first. Once
  // per pretend morning: a re-render or remount reads the same one back.
  const [, redraw] = useState(0);
  if (pretending && reached && !pretend && since) {
    startPretendTimer(since.getTime(), now.getTime(), PRETEND_MINUTES);
    redraw((n) => n + 1);
  }

  // The steps are in: start the timer once (from when they were really reached, in the history).
  const starting = useRef(false);
  useEffect(() => {
    if (!reached || pretending || starting.current) return;
    starting.current = true;
    startDowntime(stepsBetween)
      .catch(() => null)
      .finally(() => {
        starting.current = false;
      });
  }, [reached, pretending, goal, morning.key, startMs]);

  // A running timer re-renders Home when it ends (and on each minute, through Home's clock).
  const tick = useEndTick(enabled && phase.kind === 'running' ? phase.endsAt : null);
  const prove = useProveMorning();
  const over = enabled && phase.kind === 'over';
  useEffect(() => {
    if (!over) return;
    // A pretend morning moves to "done"; a real one is proved by the sync, as with the app closed.
    if (pretending) prove('downtime');
    else {
      const state = syncLock();
      if (state.phase === 'day') announceWoke(state);
    }
  }, [over, pretending, prove, tick]);

  if (!enabled) return null;

  if (!record) {
    if (noSteps)
      return { icon: ICON, hero: { title: 'Starting your timer', body: 'Your apps wake when it ends.' }, action: null };
    if (status === 'denied')
      return {
        icon: ICON,
        hero: {
          title: "I can't hear you walking",
          body: 'Motion & Fitness is off for Locturne, so I can’t count your steps. Turn it on in Settings, under Privacy & Security.',
        },
        action: { label: 'Open Settings', onPress: () => Linking.openSettings().catch(() => {}) },
      };
    if (status === 'unavailable')
      return {
        icon: ICON,
        hero: {
          title: "I can't count steps on this",
          body: 'Step away needs the iPhone’s motion sensor to know you’re up, and this device doesn’t have one I can read.',
        },
        action: null,
      };
    const counted = status === 'counting' ? (shown ?? Math.min(steps, goal)) : null;
    const minutes = minutesLabel(downtimeMinutesOf(routine));
    return {
      icon: ICON,
      hero: {
        title: counted === null ? `${goal} steps` : `${counted} of ${goal} steps`,
        body:
          counted === null
            ? 'Counting your steps…'
            : counted >= goal
              ? 'That will do. Starting your timer.'
              : `${goal - counted} more, then ${minutes} with your apps asleep.`,
        aside: downtimeLine('walking', { steps: counted ?? 0, goal }),
      },
      meter: { value: counted === null ? '–' : String(counted), progress: goal > 0 ? (counted ?? 0) / goal : 1 },
      action: null,
    };
  }

  const wakesAt = clockLabel(new Date(record.endsAt).getHours() * 60 + new Date(record.endsAt).getMinutes());
  if (phase.kind === 'bedtime')
    return {
      icon: ICON,
      hero: {
        title: 'Past bedtime',
        body: `Your timer ends at ${wakesAt}, after bedtime, so your apps sleep on into the night.`,
        aside: downtimeLine('bedtime'),
      },
      action: null,
    };
  if (phase.kind === 'running') {
    const left = minutesLeft(phase.left);
    return {
      icon: ICON,
      hero: {
        // Read out for the meter, which stands in for the headline.
        title: `Apps wake in ${minutesLabel(left)}`,
        body: `They wake at ${wakesAt}. Nothing to do but leave the phone alone.`,
        aside: downtimeLine('running', { minutesLeft: left }),
      },
      meter: { kicker: 'Apps wake in', value: duration(left), progress: phase.progress, countsDown: true },
      action: null,
    };
  }
  // Over: the sync above wakes them in a moment.
  return {
    icon: ICON,
    hero: { title: 'Time’s up', body: 'Waking your apps.', aside: downtimeLine('over') },
    action: null,
  };
}

/** Re-renders at `endsAt`, so the morning is proved the moment the timer ends with Home open. */
function useEndTick(endsAt: number | null) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (endsAt === null) return;
    const wait = Math.max(0, endsAt - Date.now()) + 250;
    // Timers stop while the app is suspended; Home's own clock catches up on return.
    const t = setTimeout(() => setTick((n) => n + 1), Math.min(wait, 2 ** 31 - 1));
    return () => clearTimeout(t);
  }, [endsAt]);
  return tick;
}
