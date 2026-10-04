/**
 * The one place that turns the rules (`lock-state.ts`) into shields. Screens and features
 * change a fact (a proof, a routine edit) and then call `syncLock`; nothing else decides
 * whether the night apps wake.
 *
 * How a night runs, end to end:
 * 1. `armRoutine` hands iOS the night windows (night-plan.ts). Each window's start shields
 *    the bedtime apps and sets `nightHeld`, with Locturne closed.
 * 2. Nothing unshields at morning start: the windows end, the shield stays, and the
 *    morning lock is simply the night lock still held.
 * 3. A wake-up method records a proof (morning-proof.ts) and calls `syncLock`, which sees
 *    the phase is now `day` and wakes the apps. Block now, used-up limits and the always
 *    list are re-shielded straight after (`wakeApps`), so a proof never lifts them.
 */
import { armedInTime, currentMorning, dateKey, getLockState, type DaytimeFacts, type LockState } from './lock-state.ts';
import { getProof, recordProof, type ProofKind } from './morning-proof.ts';
import { getPendingRoutine, getRoutine, toLockSettings } from './routine.ts';
import {
  armedSince,
  armedWindowNames,
  armNight,
  disarmNight,
  getAccess,
  getArmedNight,
  getLimits,
  getNap,
  isNightHeld,
  isScreenTimeAvailable,
  limitUsedUpToday,
  peekNap,
  reapplyStandingBlocks,
  selectionSize,
  setNightShieldText,
  setShieldText,
  sleepApps,
  wakeApps,
} from './screen-time.ts';
import { shieldCopy, shieldTap, shieldTextFor } from './shield-copy.ts';
import { planArming, type ArmPlan } from './wake/arming.ts';

/** Block now and used-up daily limits, as `getLockState` takes them. Selection ids are the apps. */
function readDaytime(now: Date): DaytimeFacts {
  const nap = peekNap(now);
  const today = dateKey(now);
  return {
    blockNow: nap ? { apps: [nap.list], end: new Date(nap.end) } : null,
    limits: getLimits().map((limit) => ({ apps: [limit.id], reachedOn: limitUsedUpToday(limit.id) ? today : null })),
  };
}

/**
 * The state right now, without touching any shields. A morning whose night wasn't armed in
 * time (`armedInTime`: the install day, or before purchase) reads as unlocked, because
 * nothing is asleep and nothing should pretend to be.
 */
export function readLock(now = new Date()): LockState {
  const settings = toLockSettings(getRoutine(now));
  const morning = currentMorning(now, settings);
  // Only a proof that counts for this morning (one made after morning start, or a pass).
  const proof = getProof(morning.key, morning);
  const armed = getArmedNight();
  const free = !armedInTime(now, settings, armed ? armedSince(armed) : null);
  // Steps reach the rules as a proof (recorded by the steps method), so pass 0 here.
  return getLockState(
    now,
    settings,
    { steps: 0, unlockedMorning: proof || free ? morning.key : null },
    readDaytime(now),
  );
}

const listeners = new Set<(state: LockState) => void>();

/** Called with the new state after every `syncLock`. Returns the unsubscribe. */
export function onLockChange(listener: (state: LockState) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Applies the state. Safe to call any time, as often as you like:
 * - `day` or `off` with the night still held: wakes the bedtime apps (a proof came in, or a
 *   window fired on a night that's switched off).
 * - `night` or `morning` with the night not held, on a night that was armed in time:
 *   shields them (a missed window, or shields lost and access restored).
 * - otherwise re-shields whatever the standing rules hold.
 * It also re-arms the windows in the background if the routine changed since they were
 * armed (only once something was armed, so nothing arms before purchase), and lifts a
 * Block now that iOS never ended (a missed `intervalDidEnd` would otherwise keep its apps
 * asleep while the app shows it as over).
 */
export function syncLock(now = new Date()): LockState {
  if (isScreenTimeAvailable()) getNap();
  const state = readLock(now);
  if (isScreenTimeAvailable()) {
    const asleep = state.phase === 'night' || state.phase === 'morning';
    if (!asleep && isNightHeld()) wakeApps('night');
    // `readLock` only reports night or morning for a night armed in time, so a missed
    // window or lost shields are put back, but a night armed after it began isn't.
    else if (asleep && !isNightHeld() && selectionSize('night') > 0 && getArmedNight()) {
      sleepApps('night');
      reapplyStandingBlocks();
    } else reapplyStandingBlocks();

    if (getArmedNight() && planFor(now).action !== 'keep') {
      armRoutine(now).catch(() => {
        // iOS refused. The old windows stay armed, and the next sync tries again.
      });
    }
    applyShieldText(state, now);
  }
  for (const listener of listeners) listener(state);
  return state;
}

/**
 * Records a proof for the morning `now` belongs to and wakes the apps. Returns the new
 * state, or null when nothing was recorded: it isn't the morning yet (bedtime wins), the
 * morning is already unlocked, or the night was off.
 */
export function proveMorning(kind: ProofKind, now = new Date()): LockState | null {
  const state = readLock(now);
  if (state.phase !== 'morning') return null;
  if (!recordProof({ morningKey: state.morningKey, kind, at: now.getTime() })) return null;
  return syncLock(now);
}

function planFor(now: Date): ArmPlan {
  const armed = getArmedNight();
  return planArming(
    now,
    getRoutine(now),
    getPendingRoutine(now) ?? null,
    armed && { ...armed, live: armedWindowNames().length },
  );
}

export type ArmResult = 'armed' | 'kept' | 'disarmed' | 'deferred' | 'unavailable';

let arming: Promise<ArmResult> | null = null;

/**
 * Hands iOS the night windows for the saved routine: the one in force at the next bedtime,
 * so a pending edit is armed as soon as that's safe (see wake/arming.ts). Onboarding calls it
 * once tonight's routine is saved and paid for; the Routine tab after each save. Uses
 * night-plan.ts's window budget (at most 16 of iOS's ~20 activities).
 *
 * Arming during the night also shields straight away, rather than waiting up to 45 minutes
 * for the next window. Throws if iOS refuses a window (nothing is left half-armed).
 */
export function armRoutine(now = new Date()): Promise<ArmResult> {
  // One at a time: a second call while iOS is still registering waits for the first.
  arming ??= arm(now).finally(() => {
    arming = null;
  });
  return arming;
}

async function arm(now: Date): Promise<ArmResult> {
  if (!isScreenTimeAvailable() || getAccess() !== 'approved') return 'unavailable';
  const plan = planFor(now);
  if (plan.action === 'keep') return 'kept';
  if (plan.action === 'defer') return 'deferred';
  if (plan.action === 'disarm') {
    disarmNight();
    syncLock(now);
    return 'disarmed';
  }
  const { bedtime, morningStart } = plan.times;
  await armNight(plan.windows, 'night', { bedtime, morningStart });
  if (readLock(now).phase === 'night' && selectionSize('night') > 0) sleepApps('night');
  syncLock(now);
  return 'armed';
}

/**
 * Puts the right words on the block screen for `state` (shield-copy.ts), with a tap that
 * sends the open-Locturne notification in the morning, and refreshes the bedtime words the
 * monitor extension shows at the next window with the app closed.
 */
function applyShieldText(state: LockState, now: Date): void {
  const routine = getRoutine(now);
  const limitReached = getLimits().some((limit) => limitUsedUpToday(limit.id));
  setShieldText(shieldTextFor(state, routine, now, limitReached), shieldTap(state.phase));
  setNightShieldText(shieldCopy('night', getPendingRoutine(now)?.routine ?? routine));
}
