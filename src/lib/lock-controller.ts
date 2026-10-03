/**
 * The one place that turns the rules (`lock-state.ts`) into shields. Screens and features
 * change a fact (a proof, a routine edit) and then call `syncLock`; nothing else decides
 * whether the night apps wake.
 */
import { currentMorning, getLockState, type LockState } from './lock-state.ts';
import { getProof } from './morning-proof.ts';
import { getRoutine, toLockSettings } from './routine.ts';
import { isNightHeld, isScreenTimeAvailable, reapplyStandingBlocks, wakeApps } from './screen-time.ts';

/** The state right now, without touching any shields. */
export function readLock(now = new Date()): LockState {
  const settings = toLockSettings(getRoutine(now));
  const morning = currentMorning(now, settings);
  const proof = getProof(morning.key);
  // Steps reach the rules as a proof (recorded by the steps method), so pass 0 here.
  return getLockState(now, settings, { steps: 0, unlockedMorning: proof ? proof.morningKey : null });
}

/**
 * Applies the state: wakes the night apps once the morning is unlocked, and re-shields every
 * rule still in force. Safe to call any time.
 */
export function syncLock(now = new Date()): LockState {
  const state = readLock(now);
  if (!isScreenTimeAvailable()) return state;
  if ((state.phase === 'day' || state.phase === 'off') && isNightHeld()) wakeApps('night');
  else reapplyStandingBlocks();
  return state;
}
