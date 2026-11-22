import { useCallback, useEffect, useRef, useState } from 'react';

import { addPose, isOver, isTimed, retarget, startPushups, tick, type Exercise, type PoseFrame, type PushupsSession } from '@/lib/wake/pushups';
import { getRepsDone, saveRepsDone } from '@/lib/wake/pushups-done';

/**
 * What the camera screen shows of a session: if none of it changed, a new reading needn't
 * re-render it. The count and goal, the status, why a rep missed, the hint (Loc's line), and
 * which way you face; the dance's progress shows in its count.
 */
const shows = (s: PushupsSession) => `${s.exercise} ${s.status} ${s.reps}/${s.goal} ${s.miss} ${s.hint} ${s.view} ${s.metAt}`;

const TICK_MS = 1_000;

/**
 * A live push-up session (wake/pushups.ts has the rules). The camera view feeds `onPose`; a
 * clock ticks for the timeout and a stalled camera. A trip to the background keeps the session:
 * iOS pauses the camera and resumes it on the way back, the reps done stay, and he looks for you
 * again. (Ending it there left the screen open with nothing counting.) `timeoutIn` is the wake
 * lab's preview: time out after that long with nobody in view instead of PUSHUPS.timeoutMs.
 *
 * What counts is the morning's total: a missed rep only doesn't add one, and with `morning` (the
 * real morning's key, never the preview's) the reps are saved as they come, so closing the camera,
 * walking off or relaunching carries on from there. `start` is stable, so the screen starts once;
 * a new `goal` meanwhile keeps the reps done (`retarget`, on the next clock tick). `exercise`:
 * what the machine counts: push-ups, or dance, whose seconds are *straight*, so never saved or carried.
 *
 * The rules see every reading, but the screen only re-renders when something it shows changes
 * (`shows`): the count, the status, Loc's line. Re-rendering the whole camera screen fifteen times a
 * second for nothing kept the JS thread busy under the camera (2026-11-21). `keepPose`: hand back each
 * reading's joints too, and every session, for a screen that draws the tracing itself (the web
 * preview) or the wake lab's tuning readout.
 */
export function usePushups(
  goal: number,
  timeoutIn?: number,
  morning?: string,
  exercise: Exercise = 'pushups',
  { keepPose = true }: { keepPose?: boolean } = {},
) {
  const [session, setSession] = useState<PushupsSession | null>(null);
  const [pose, setPose] = useState<PoseFrame | null>(null);
  // The live session, ahead of the one on screen.
  const live = useRef<PushupsSession | null>(null);
  const keepPoseNow = useRef(keepPose);
  useEffect(() => {
    keepPoseNow.current = keepPose;
  }, [keepPose]);
  /** Moves the live session on, and the screen's with it when there's something new to show. */
  const advance = useCallback((next: PushupsSession | null) => {
    const was = live.current;
    live.current = next;
    if (next === was) return;
    if (!next || !was || keepPoseNow.current || shows(was) !== shows(next)) setSession(next);
  }, []);
  const running = !!session && !isOver(session);
  const goalNow = useRef(goal);
  const timeoutNow = useRef(timeoutIn);
  const morningNow = useRef(morning);
  const exerciseNow = useRef(exercise);

  useEffect(() => {
    goalNow.current = goal;
  }, [goal]);
  useEffect(() => {
    timeoutNow.current = timeoutIn;
  }, [timeoutIn]);
  useEffect(() => {
    morningNow.current = morning;
  }, [morning]);
  useEffect(() => {
    exerciseNow.current = exercise;
  }, [exercise]);

  const start = useCallback(() => {
    setPose(null);
    const saved = getRepsDone(morningNow.current, exerciseNow.current);
    const s = live.current;
    advance(
      startPushups(Date.now(), goalNow.current, {
        reps: Math.max(saved, s?.exercise === exerciseNow.current ? s.reps : 0),
        timeoutMs: timeoutNow.current,
        exercise: exerciseNow.current,
      }),
    );
  }, [advance]);
  const cancel = useCallback(() => {
    setPose(null);
    advance(null);
  }, [advance]);
  const onPose = useCallback(
    (frame: PoseFrame) => {
      if (keepPoseNow.current) setPose(frame);
      // Stamped here, on the same clock as `tick`: the phone's wall clock in a native frame can step.
      const at = Date.now();
      if (live.current) advance(addPose(live.current, { at, joints: frame.joints }));
    },
    [advance],
  );

  const reps = session?.reps ?? 0;
  useEffect(() => {
    if (isTimed(exercise)) return;
    if (morning !== undefined && reps > getRepsDone(morning, exercise)) saveRepsDone(morning, reps, exercise);
  }, [morning, reps, exercise]);

  useEffect(() => {
    if (!running) return;
    // A new goal lands on the next tick; retarget hands back the same session when it hasn't changed.
    const clock = setInterval(() => {
      const now = Date.now();
      if (live.current) advance(tick(retarget(live.current, goalNow.current, now), now));
    }, TICK_MS);
    return () => clearInterval(clock);
  }, [running, advance]);

  return { session, pose, start, cancel, onPose };
}
