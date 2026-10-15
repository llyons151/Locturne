import { armIfPaid } from '@/hooks/use-app-start';
import { armRoutine, inPendingFirstNight, readLock, syncLock } from '@/lib/lock-controller';
import { rescheduleNotifications } from '@/lib/notifications';
import { getPendingRoutine, getRoutine, saveRoutine, type Routine } from '@/lib/routine';
import { getArmedNight } from '@/lib/screen-time';

/** What the person has set: the edit waiting for the next bedtime, or the routine in force. */
export function getSetRoutine(now = new Date()): Routine {
  return getPendingRoutine(now)?.routine ?? getRoutine(now);
}

/**
 * Saves an edit to the routine, from the Routine tab or the You tab's step target. Made in the
 * day it applies at once; made during a night or a locked morning it waits for the next bedtime
 * (`saveRoutine`). Either way iOS is handed the new windows. Resolves once
 * arming settles. With nothing saved yet the tabs show the default routine, so the edit is
 * saved over it as the first routine.
 */
export function applyRoutineEdit(next: Routine): Promise<unknown> {
  // Inside a waiting edit's early first night, that edit governs tonight: this one waits
  // for its next bedtime rather than handing tonight back to the old, later bedtime.
  // Before bedtime (the lock's day) it applies at once; from bedtime until the morning is
  // proven it waits for the next bedtime.
  const savedAt = new Date();
  saveRoutine(next, savedAt, inPendingFirstNight(savedAt), readLock(savedAt).phase === 'day');
  // The shield words the extension copies later (tonight's, the morning's) follow the saved
  // routine: rewrite them now, even when the windows stay as they are (`kept`).
  syncLock();
  // `armRoutine` hands iOS the windows for the routine in force at the next bedtime; if iOS
  // refuses, the old windows stay and the next sync retries. Nothing armed yet means nothing
  // was bought yet (or the night was lost): only a subscription arms it, or leaving
  // onboarding at the paywall and saving here would lock tonight for free.
  let settled: Promise<unknown>;
  if (getArmedNight()) {
    settled = armRoutine().catch(() => {});
  } else {
    armIfPaid();
    settled = Promise.resolve();
  }
  rescheduleNotifications().catch(() => {});
  return settled;
}
