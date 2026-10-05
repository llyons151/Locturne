/**
 * Hands tonight to iOS at the end of onboarding, only after purchase (GAME_PLAN: "the lock
 * arms only after purchase"), through lock-controller's `armRoutine`, the one place that
 * arms. "Armed" is shown only when this resolves to `armed`, which means iOS accepted every
 * night window and reports them as monitored.
 */
import { armRoutine, readLock } from './lock-controller.ts';
import { planNightWindows } from './night-plan.ts';
import { clearPurchasePending } from './pending-purchase.ts';
import { getPendingRoutine, getRoutine } from './routine.ts';
import { armedWindowNames, getAccess, getArmedNight, isScreenTimeAvailable, shownSelection } from './screen-time.ts';

export type ArmFailure = 'no-access' | 'no-apps' | 'too-short' | 'refused';

export type ArmResult =
  /** iOS confirmed every window. `now` is true when bedtime has already started. */
  | { status: 'armed'; now: boolean }
  /** No Screen Time here (the web preview): nothing was handed to iOS. */
  | { status: 'preview' }
  /** Every night is off in Routine, now and in any edit waiting for bedtime: nothing to hand iOS. */
  | { status: 'nights-off' }
  | { status: 'failed'; reason: ArmFailure };

export async function armTonight(): Promise<ArmResult> {
  if (!isScreenTimeAvailable()) return { status: 'preview' };
  if (getAccess() !== 'approved') return { status: 'failed', reason: 'no-access' };
  // A resubscriber who turned every night off: arming keeps nothing, which isn't a refusal.
  const pending = getPendingRoutine();
  if (getRoutine().activeNights.length === 0 && (pending?.routine.activeNights.length ?? 0) === 0) {
    clearPurchasePending();
    return { status: 'nights-off' };
  }
  // The picks as the Apps tab shows them: an emergency unlock parks them in the list's draft
  // until the next bedtime (`pauseNightUntil`), and they're still the bedtime apps.
  if (shownSelection('night').size === 0) return { status: 'failed', reason: 'no-apps' };

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
  // Only ever reached once paid, so an approval that was waiting has come through.
  clearPurchasePending();
  return { status: 'armed', now: readLock().phase === 'night' };
}
