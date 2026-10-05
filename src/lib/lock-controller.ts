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
import { armedInTime, currentMorning, dateKey, getLockState, nightsAround, type DaytimeFacts, type LockState } from './lock-state.ts';
import { getProof, recordProof, type MorningProof, type ProofKind } from './morning-proof.ts';
import { getPendingRoutine, getRoutine, holdsEarly, toLockSettings, type Routine } from './routine.ts';
import { methodInUse } from './scan-code.ts';
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
  isStoodDown,
  limitUsedUpToday,
  peekNap,
  reapplyStandingBlocks,
  selectionSize,
  setAlwaysShieldText,
  setLimitShieldText,
  setMorningShieldText,
  setNightShieldText,
  setShieldText,
  sharedGet,
  sharedRemove,
  sharedSet,
  sleepApps,
  standDown,
  standUp,
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
    limits: getLimits().map((limit) => ({ apps: [limit.id], reachedOn: limitUsedUpToday(limit.id, now) ? today : null })),
  };
}

/**
 * The state right now, without touching any shields. A morning whose night wasn't armed in
 * time (`armedInTime`: the install day, or before purchase) reads as unlocked, because
 * nothing is asleep and nothing should pretend to be.
 */
export function readLock(now = new Date()): LockState {
  const settings = toLockSettings(routineAt(now));
  const morning = currentMorning(now, settings);
  // A proof saved for this morning since its night began here (`proofUnlocks`). Its timing
  // against morning start was judged when it was saved, so a flight west or a later morning
  // start since then doesn't take the morning back; a new night since then does.
  const proof = getProof(morning);
  const armed = getArmedNight();
  const free = !armedInTime(now, settings, armed ? armedSince(armed) : null);
  // Steps reach the rules as a proof (recorded by the steps method), so pass 0 here.
  const state = getLockState(
    now,
    settings,
    { steps: 0, unlockedMorning: proof || free ? morning.key : null },
    readDaytime(now),
  );
  // A waiting edit's early first night starts before the routine in force's bedtime, and
  // `useLock` only re-syncs at `nextChange`: the open app would miss iOS shielding at 21:30.
  const pending = state.phase === 'night' || state.phase === 'morning' ? null : getPendingRoutine(now);
  if (pending) {
    const { latest, next } = nightsAround(now, toLockSettings(pending.routine));
    const start = now < latest.start ? latest.start : next.start;
    // Asked of the routines as stored now: reading them at a later time would settle the edit.
    const early = start > now && start < state.nextChange && start.getTime() < pending.from;
    if (early && governsEarly(start, pending, getRoutine(now))) state.nextChange = start;
  }
  return state;
}

/** The proof that unlocked the morning `now` belongs to (as `readLock` reads it), or null. */
export function currentProof(now = new Date()): MorningProof | null {
  return getProof(currentMorning(now, toLockSettings(routineAt(now))));
}

/**
 * The routine that governs `now`: the one in force, or a waiting edit inside its own first
 * night. An earlier bedtime is armed at once (it only tightens: `planArming`), so from 21:30
 * the windows shield while the old routine still says it's day, and an open would wake them.
 * The same night `nightAt` (routine.ts) shows and the arming plans.
 */
export function routineAt(now: Date): Routine {
  const pending = getPendingRoutine(now);
  return pending && inPendingFirstNight(now) ? pending.routine : getRoutine(now);
}

/**
 * Is `now` inside a waiting edit's own first night, which `routineAt` then governs? Only when
 * iOS holds that night early (`holdsEarly`, routine.ts): the windows armed are in their night
 * and the routine in force has its evening on. Arming can wait for a phantom night to pass
 * (wake/arming.ts), and the extension skips the early windows of an evening that's off. Once the
 * subscription was found ended, only if that night was the one under way then: a lapse lets
 * only the night or morning under way finish, and an early first night after it is a new one.
 */
export function inPendingFirstNight(now: Date): boolean {
  const pending = getPendingRoutine(now);
  return !!pending && governsEarly(now, pending, getRoutine(now));
}

/** `inPendingFirstNight` for a given waiting edit and routine in force, at `at` before it applies. */
function governsEarly(at: Date, pending: { routine: Routine; from: number }, inForce: Routine): boolean {
  const { latest } = nightsAround(at, toLockSettings(pending.routine));
  const inside = at >= latest.start && at < latest.end && latest.end.getTime() > pending.from;
  if (!inside) return false;
  const evening = new Date(latest.end.getFullYear(), latest.end.getMonth(), latest.end.getDate() - 1).getDay();
  // While iOS registers new windows, it can run one's start at once (shielding the early
  // night) before `getArmedNight()` names them: judge by the times being armed too, or a sync
  // in that gap would read day and wake the apps until `arm` sleeps them again.
  const held = holdsEarly(at, evening, inForce, getArmedNight()) || (!!armingTimes && holdsEarly(at, evening, inForce, armingTimes));
  if (!held) return false;
  return !subscriptionEnded() || underWayWhenEnded(dateKey(latest.end));
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
  if (isScreenTimeAvailable()) {
    getNap();
    if (subscriptionEnded() && !isStoodDown()) {
      const { phase } = readLock(now);
      // An armed night or morning under way finishes as promised; the next sync after it
      // (the morning's proof, or any open in the day) stands everything down. A later night
      // or morning is ended by `settleSubscription`, which asks the store first, so an open
      // after a renewal never stands down on a stale answer.
      if (!getArmedNight() || (phase !== 'night' && phase !== 'morning')) standDown();
    }
  }
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

const SUBSCRIPTION_ENDED_KEY = 'locturne.subscriptionEnded';

/**
 * The morning (`LockState.morningKey`) under way when the subscription was found ended. Only
 * it, and the night leading into it, finish without one. Kept as the morning rather than a
 * time, so a flight west (the same night starting later by the clock) never ends it early.
 */
const ENDED_MORNING_KEY = 'locturne.subscriptionEndedMorning';

/** Is `morningKey` the morning that was under way when the subscription was found ended? */
function underWayWhenEnded(morningKey: string): boolean {
  const ended = sharedGet<string>(ENDED_MORNING_KEY);
  // Recorded before this key existed: keep the old rule (finish whatever is under way).
  return ended === undefined || ended === morningKey;
}

/** No active subscription was found at the last check (never bought, or it ended). */
let paidSettles = 0;

/**
 * Bumped by every paid settle (a purchase, a restore, a store answer). A "not paid" answer
 * asked for before the latest bump is out of date (it can land after a purchase that went
 * through meanwhile) and must not stand anything down.
 */
export function paidSettleCount(): number {
  return paidSettles;
}

/**
 * The last morning a lapsed subscription still covers (the one under way when the end was
 * found), or null while subscribed. Nights after it never sleep, so nothing should promise they do.
 */
export function lastPaidMorning(): string | null {
  if (!subscriptionEnded()) return null;
  return sharedGet<string>(ENDED_MORNING_KEY) ?? null;
}

export function subscriptionEnded(): boolean {
  return sharedGet<number>(SUBSCRIPTION_ENDED_KEY) !== undefined;
}

/**
 * The answer to "is there a subscription?", checked at every app open (`useAppStart`).
 * Nothing blocks without one (GAME_PLAN). Without one, everything stands down from the next
 * bedtime: a night or morning already under way finishes first, and nothing ever unlocks
 * mid-night. With one again (renewed, restored, re-bought), the limits and the always list
 * come back; the night is re-armed by `armIfPaid`.
 */
export function settleSubscription(paid: boolean, now = new Date()): void {
  if (!isScreenTimeAvailable()) return;
  if (paid) {
    paidSettles += 1;
    sharedRemove(SUBSCRIPTION_ENDED_KEY);
    sharedRemove(ENDED_MORNING_KEY);
    standUp().catch(() => {
      // iOS refused a limit. It's saved, and the next open with a subscription tries again.
    });
    // `standUp` clears the stand-down at once: tell the screens, which may have read the
    // lapse a moment ago (a renewal found on foreground with nothing to arm).
    syncLock(now);
    return;
  }
  const { morningKey } = readLock(now);
  if (!subscriptionEnded()) {
    sharedSet(SUBSCRIPTION_ENDED_KEY, now.getTime());
    sharedSet(ENDED_MORNING_KEY, morningKey);
  }
  // Only the night or morning under way when the end was found finishes. A morning nobody
  // proves lasts until the next bedtime, so without this every night after it would lock
  // too, with no subscription.
  if (!isStoodDown() && !underWayWhenEnded(morningKey)) standDown();
  syncLock(now);
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

/**
 * When arming that waits for a phantom night to pass (`planArming`'s `defer`) can go ahead,
 * or null. Nothing re-arms at that moment by itself, so an app left open (`useLock`) syncs
 * then: the waiting edit's windows go in, and an earlier bedtime starts early as Home says.
 */
export function armRetryAt(now = new Date()): Date | null {
  if (!isScreenTimeAvailable() || !getArmedNight()) return null;
  const plan = planFor(now);
  return plan.action === 'defer' && plan.until > now ? plan.until : null;
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
/** The times `armNight` is handing iOS right now, until it returns. */
let armingTimes: { bedtime: number; morningStart: number } | null = null;
/** A call that came in while arming: its clock, so the run after this one plans for it. */
let armAgainAt: Date | null = null;

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
  // One at a time: a second call while iOS is still registering waits for the first, then
  // plans again (the first planned against the routine before the edit that made the call:
  // spin the hour, then the minutes, and tonight would lock at the old hour). Not capped by
  // count: a capped run dropped an edit that landed during its last re-run, and iOS kept the
  // edit before it. It still ends: the sync inside `arm` asks again only while
  // the plan isn't `keep`, and once a run has armed what the plan wants, that ask finds the
  // same times (break below), a deferral or a disarm (neither of which syncs and asks again).
  if (arming) {
    // The later clock wins: the sync inside `arm` asks again with the run's own, older one.
    armAgainAt = armAgainAt && armAgainAt > now ? armAgainAt : now;
    return arming;
  }
  arming = (async () => {
    let result = await arm(now);
    while (armAgainAt) {
      const at = armAgainAt;
      armAgainAt = null;
      // Only for times that changed: when iOS keeps reporting a different window count for
      // the same times, arming again doesn't help, and each try re-registers every window.
      const plan = planFor(at);
      const armed = getArmedNight();
      if (plan.action === 'arm' && armed && armed.bedtime === plan.times.bedtime && armed.morningStart === plan.times.morningStart) continue;
      result = await arm(at);
    }
    return result;
  })().finally(() => {
    arming = null;
    armAgainAt = null;
  });
  return arming;
}

const armListeners = new Set<() => void>();

/**
 * Called after `armRoutine` hands iOS new windows or stops them. Whatever was planned from
 * the windows iOS had (the notification plan: a deferred earlier bedtime starts early only
 * once its windows are armed, `holdsEarly`) re-plans here. Returns the unsubscribe.
 */
export function onArmed(listener: () => void): () => void {
  armListeners.add(listener);
  return () => armListeners.delete(listener);
}

function armChanged(): void {
  for (const listener of armListeners) listener();
}

async function arm(now: Date): Promise<ArmResult> {
  if (!isScreenTimeAvailable() || getAccess() !== 'approved') return 'unavailable';
  const plan = planFor(now);
  if (plan.action === 'keep') return 'kept';
  if (plan.action === 'defer') return 'deferred';
  if (plan.action === 'disarm') {
    disarmNight();
    syncLock(now);
    armChanged();
    return 'disarmed';
  }
  const { bedtime, morningStart } = plan.times;
  armingTimes = { bedtime, morningStart };
  try {
    await armNight(plan.windows, 'night', { bedtime, morningStart });
  } catch (error) {
    // iOS refused a window. It may have run an accepted one's start at once (an earlier bedtime
    // saved inside its own night: shielded and `nightHeld`), and `armNight` put the old windows
    // back without waking anything. Settle the shields by the old windows, now the record
    // again: the old routine's day wakes the held night. Not a loop: this sync's re-arm finds
    // `arming` still set and only asks for one more run, which `armRoutine` drops on this throw.
    armingTimes = null;
    syncLock(now);
    throw error;
  } finally {
    armingTimes = null;
  }
  // The subscription was found ended while iOS registered the windows, and everything stood
  // down: nothing stays armed without one.
  if (isStoodDown()) {
    disarmNight();
    armChanged();
    return 'disarmed';
  }
  if (readLock(now).phase === 'night' && selectionSize('night') > 0) sleepApps('night');
  syncLock(now);
  armChanged();
  return 'armed';
}

/**
 * How long after morning start the last window's end still copies the morning words: the
 * monitor extension accepts it up to 30 whole minutes late (`showLocturneMorningShield`).
 */
const MORNING_COPY_SLACK_MS = 31 * 60_000;

/**
 * Puts the right words on the block screen for `state` (shield-copy.ts), with a tap that
 * sends the open-Locturne notification in the morning, and refreshes the bedtime words the
 * monitor extension shows at the next window with the app closed.
 */
function applyShieldText(state: LockState, now: Date): void {
  // The shield names the method the wake screen will really ask for, under the routine that
  // governs now (a waiting edit inside its early first night: `routineAt`).
  const saved = routineAt(now);
  const routine = { ...saved, method: methodInUse(saved.method) };
  const limitReached = getLimits().some((limit) => limitUsedUpToday(limit.id));
  setShieldText(shieldTextFor(state, routine, now, limitReached), shieldTap(state.phase));
  // The words for the next window and the next morning start: a waiting edit's, unless it's
  // night (an edit made in bed waits for the next bedtime, and tonight's later windows and this
  // coming morning still run on the routine in force). From morning start on, the night words
  // are next night's; the morning words stay this morning's while the last window's end
  // (accepted up to 30 minutes late) can still copy them. After that, a morning nobody proves
  // runs until bedtime, and the next copy is tomorrow's: the waiting edit's words.
  const pending = getPendingRoutine(now)?.routine;
  const next = pending && state.phase !== 'night' ? { ...pending, method: methodInUse(pending.method) } : routine;
  const morningStart = currentMorning(now, toLockSettings(saved)).start.getTime();
  const thisMorning =
    state.phase === 'night' || (state.phase === 'morning' && now.getTime() < morningStart + MORNING_COPY_SLACK_MS);
  setNightShieldText(shieldCopy('night', next));
  setMorningShieldText(shieldCopy('morning', thisMorning ? routine : next), shieldTap('morning'));
  setAlwaysShieldText(shieldCopy('always', routine));
  setLimitShieldText(shieldCopy('limit', routine));
}
