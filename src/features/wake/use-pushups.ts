import { useCallback, useEffect, useRef, useState } from 'react';

import { addPose, isOver, PUSHUPS, retarget, startPushups, tick, type PoseFrame, type PushupsSession } from '@/lib/wake/pushups';

const TICK_MS = 1_000;

/**
 * A live push-up session (wake/pushups.ts has the rules). The camera view feeds `onPose`; a
 * clock ticks for the timeout and a stalled camera. A trip to the background keeps the session:
 * iOS pauses the camera and resumes it on the way back, the reps done stay, and he looks for you
 * again. (Ending it there left the screen open with nothing counting.) `timeoutIn` is the wake
 * lab's preview: time out after that long with nobody in view instead of PUSHUPS.timeoutMs.
 *
 * `start` is stable, so the screen starts once; a new `goal` meanwhile keeps the reps done
 * (`retarget`, on the next clock tick) rather than starting over. `start(true)` carries the reps into "Start again".
 */
export function usePushups(goal: number, timeoutIn?: number) {
  const [session, setSession] = useState<PushupsSession | null>(null);
  const [pose, setPose] = useState<PoseFrame | null>(null);
  const running = !!session && !isOver(session);
  const goalNow = useRef(goal);
  const timeoutNow = useRef(timeoutIn);

  useEffect(() => {
    goalNow.current = goal;
  }, [goal]);
  useEffect(() => {
    timeoutNow.current = timeoutIn;
  }, [timeoutIn]);

  const start = useCallback((keepReps: boolean = false) => {
    setPose(null);
    setSession((s) =>
      startPushups(Date.now(), goalNow.current, {
        reps: keepReps && s ? s.reps : 0,
        timeoutMs: timeoutNow.current ?? PUSHUPS.timeoutMs,
      }),
    );
  }, []);
  const cancel = useCallback(() => {
    setPose(null);
    setSession(null);
  }, []);
  const onPose = useCallback((frame: PoseFrame) => {
    setPose(frame);
    // Stamped here, on the same clock as `tick`: the phone's wall clock in a native frame can step.
    const at = Date.now();
    setSession((s) => (s ? addPose(s, { at, joints: frame.joints }) : s));
  }, []);

  useEffect(() => {
    if (!running) return;
    // A new goal lands on the next tick; retarget hands back the same session when it hasn't changed.
    const clock = setInterval(() => {
      const now = Date.now();
      setSession((s) => (s ? tick(retarget(s, goalNow.current, now), now) : s));
    }, TICK_MS);
    return () => clearInterval(clock);
  }, [running]);

  return { session, pose, start, cancel, onPose };
}
