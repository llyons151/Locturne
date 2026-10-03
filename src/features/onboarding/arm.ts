/**
 * Hands tonight to iOS at the end of onboarding, only after purchase (GAME_PLAN: "the lock
 * arms only after purchase"). "Armed" is shown only when this resolves to `armed`, which
 * means iOS accepted every night window and reports them as monitored.
 *
 * TODO(after merge): switch to lock-controller's `armRoutine()` once it lands. This calls
 * `planNightWindows` + `armNight` directly from the saved routine only so the two branches
 * don't collide in lock-controller.ts.
 */
import { readLock } from '@/lib/lock-controller';
import { planNightWindows } from '@/lib/night-plan';
import { getRoutine } from '@/lib/routine';
import {
  armedWindowNames,
  armNight,
  getAccess,
  getArmedNight,
  isScreenTimeAvailable,
  selectionSize,
  sleepApps,
} from '@/lib/screen-time';

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
    await armNight(windows, 'night', { bedtime: routine.bedtime, morningStart: routine.morningStart });
  } catch {
    return { status: 'failed', reason: 'refused' };
  }
  // Trust what iOS reports, not that the calls returned.
  if (!getArmedNight() || armedWindowNames().length !== windows.length) return { status: 'failed', reason: 'refused' };

  // Onboarding finished after bedtime: a window that already started may not fire its
  // start until tomorrow, so put the apps to sleep now. Only ever tightens.
  const now = readLock().phase === 'night';
  if (now) sleepApps('night');
  return { status: 'armed', now };
}
