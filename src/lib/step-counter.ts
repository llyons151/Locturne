import { sharedGet, sharedRemove, sharedSet } from './screen-time.ts';

/**
 * Devices with no step counter (an iPad running the iPhone app, where App Review sometimes
 * tests; the simulator). Walk and Go downstairs could never be finished there, so their
 * mornings run as Step away with no steps: its timer from the morning start (`morningMethod`,
 * `startDowntime`; user 2026-11-07).
 *
 * Saved in the App Group so the extensions read the same answer (`locturneMethodInUse`).
 * Only ever set by the hardware check itself, never by a failed query or Motion & Fitness
 * being off: turning a setting off must not skip the walk.
 */
export const NO_STEP_COUNTER_KEY = 'locturne.noStepCounter';

export function noStepCounter(): boolean {
  return sharedGet<boolean>(NO_STEP_COUNTER_KEY) === true;
}

/** Asks the hardware once at launch (`Pedometer.isAvailableAsync`, CMPedometer.isStepCountingAvailable on iOS). */
export async function checkStepCounter(deps: { isIOS: boolean; isAvailable: () => Promise<boolean> }): Promise<void> {
  if (!deps.isIOS) return;
  let available: boolean;
  try {
    available = await deps.isAvailable();
  } catch {
    // An error says nothing about the hardware: keep the last answer.
    return;
  }
  if (available) sharedRemove(NO_STEP_COUNTER_KEY);
  else sharedSet(NO_STEP_COUNTER_KEY, true);
}
