/**
 * Hands tonight to iOS at the end of onboarding, only after purchase (GAME_PLAN: "the lock
 * arms only after purchase"), through lock-controller's `armRoutine`, the one place that
 * arms. "Armed" is shown only when this resolves to `armed`, which means iOS accepted every
 * night window and reports them as monitored.
 */
import { armRoutine, readLock } from '@/lib/lock-controller';
import { planNightWindows } from '@/lib/night-plan';
import { getRoutine } from '@/lib/routine';
import { armedWindowNames, getAccess, getArmedNight, isScreenTimeAvailable, selectionSize } from '@/lib/screen-time';

export type ArmFailure = 'no-access' | 'no-apps' | 'too-short' | 'refused';

export type ArmResult =
  /** iOS confirmed every window. `now` is true when bedtime has already started. */
  | { status: 'armed'; now: boolean }
  /** No Screen Time here (the web preview): nothing was handed to iOS. */
  | { status: 'preview' }
  | { status: 'failed'; reason: ArmFailure };

export async function armTonight(): Promise<ArmResult> {
  if (!isScreenTimeAvailable()) return { status: 'preview' };
  if (getAccess() !== 'approved') return { status: 'failed', reason: 'no-access' };
  if (selectionSize('night') === 0) return { status: 'failed', reason: 'no-apps' };

  // The routine in force. On a repeat run of onboarding, new times wait for bedtime.
  const routine = getRoutine();
  const windows = planNightWindows(routine.bedtime, routine.morningStart);
  if (windows.length === 0) return { status: 'failed', reason: 'too-short' };

  try {
    // Arming after bedtime also puts the apps to sleep straight away (`armRoutine`).
    await armRoutine();
  } catch {
    return { status: 'failed', reason: 'refused' };
  }
  // Trust what iOS reports, not that the calls returned.
  const armed = getArmedNight();
  if (!armed || armedWindowNames().length !== armed.windows) return { status: 'failed', reason: 'refused' };
  return { status: 'armed', now: readLock().phase === 'night' };
}
