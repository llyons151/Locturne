import { useCallback, useEffect, useState } from 'react';

import { addPose, isOver, PUSHUPS, startPushups, tick, type PoseFrame, type PushupsSession } from '@/lib/wake/pushups';

const TICK_MS = 1_000;

/**
 * A live push-up session (wake/pushups.ts has the rules). The camera view feeds `onPose`; a
 * clock ticks for the timeout and a stalled camera. A trip to the background keeps the session:
 * iOS pauses the camera and resumes it on the way back, the reps done stay, and he looks for you
 * again. (Ending it there left the screen open with nothing counting.) `timeoutIn` is the wake
 * lab's preview: time out that soon instead of after PUSHUPS.timeoutMs.
 */
export function usePushups(goal: number, timeoutIn?: number) {
  const [session, setSession] = useState<PushupsSession | null>(null);
  const [pose, setPose] = useState<PoseFrame | null>(null);
  const running = !!session && !isOver(session);

  const start = useCallback(() => {
    setPose(null);
    const now = Date.now();
    const session = startPushups(now, goal);
    setSession(timeoutIn === undefined ? session : { ...session, startedAt: now - PUSHUPS.timeoutMs + timeoutIn });
  }, [goal, timeoutIn]);
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
    const clock = setInterval(() => setSession((s) => (s ? tick(s, Date.now()) : s)), TICK_MS);
    return () => clearInterval(clock);
  }, [running]);

  return { session, pose, start, cancel, onPose };
}
