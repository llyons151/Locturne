/**
 * The person's routine: bedtime, morning start, which nights, how they prove they're up, and
 * the step goal. Saved in the App Group so the extensions can read it with the app closed.
 *
 * While a night is armed, every edit waits for the next bedtime (GAME_PLAN, decided
 * 2026-10-01): `saveRoutine` keeps the edit as `pending` until then, and `getRoutine` promotes
 * it once that bedtime passes. With nothing armed there's no lock to loosen, so it applies now.
 */
import { nightsAround, settingsTakeEffectAt, type LockSettings } from './lock-state.ts';
import { getArmedNight, sharedGet, sharedSet } from './screen-time.ts';

/** The v1 wake-up methods (GAME_PLAN, "Wake-up methods"). Downstairs is the hero. */
export type WakeMethod = 'downstairs' | 'steps' | 'scan';

export type Routine = {
  bedtime: number;
  morningStart: number;
  /** `Date.getDay()` numbers of the evenings that start a locked night. 0 is Sunday. */
  activeNights: number[];
  method: WakeMethod;
  stepGoal: number;
};

export const DEFAULT_ROUTINE: Routine = {
  bedtime: 23 * 60,
  morningStart: 7 * 60,
  activeNights: [0, 1, 2, 3, 4, 5, 6],
  method: 'downstairs',
  stepGoal: 200,
};

export type StoredRoutine = {
  active: Routine;
  /** An edit waiting for bedtime. `from` is when it applies, in ms. */
  pending?: { routine: Routine; from: number };
};

const KEY = 'locturne.routine';

/** The routine's times in the shape `lock-state.ts` wants. Lists are Screen Time selection ids. */
export function toLockSettings(routine: Routine): LockSettings {
  return {
    bedtime: routine.bedtime,
    morningStart: routine.morningStart,
    stepGoal: routine.stepGoal,
    activeNights: routine.activeNights,
    nightApps: ['night'],
    alwaysApps: ['always'],
  };
}

/** Pure: promotes a pending edit whose bedtime has passed. */
export function settleRoutine(stored: StoredRoutine, now: Date): StoredRoutine {
  if (stored.pending && now.getTime() >= stored.pending.from) return { active: stored.pending.routine };
  return stored;
}

/**
 * Pure: records an edit. It waits for the next bedtime only while a night is armed: the
 * first save (onboarding), and any save while nothing is armed (they declined the paywall,
 * or every night was off), applies at once, since there's no lock to loosen.
 *
 * `early`: `now` is inside the waiting edit's own early first night, which already governs
 * (`inPendingFirstNight`, lock-controller.ts, which this file can't import). That edit is then
 * in force, and the new one waits for its next bedtime: replacing it would hand tonight back
 * to the old routine's later bedtime and wake the apps from bed.
 */
export function applyEdit(
  stored: StoredRoutine | undefined,
  next: Routine,
  now: Date,
  armed = true,
  early = false,
): StoredRoutine {
  if (!stored || !armed) return { active: next };
  const settled = settleRoutine(stored, now);
  const active = early && settled.pending ? settled.pending.routine : settled.active;
  const from = settingsTakeEffectAt(now, toLockSettings(active)).getTime();
  return { active, pending: { routine: next, from } };
}

function read(now: Date): StoredRoutine | undefined {
  const stored = sharedGet<StoredRoutine>(KEY);
  if (!stored) return undefined;
  const settled = settleRoutine(stored, now);
  if (settled !== stored) sharedSet(KEY, settled);
  return settled;
}

/** True once onboarding has saved a routine. */
export function hasRoutine(): boolean {
  return sharedGet<StoredRoutine>(KEY) !== undefined;
}

/** The routine in force now. */
export function getRoutine(now = new Date()): Routine {
  return read(now)?.active ?? DEFAULT_ROUTINE;
}

/** The edit waiting for bedtime, if any. */
export function getPendingRoutine(now = new Date()): StoredRoutine['pending'] | null {
  return read(now)?.pending ?? null;
}

/**
 * Saves an edit and returns when it takes effect. Callers pass `inPendingFirstNight(now)`
 * (lock-controller.ts) as `early`, so an edit made inside a waiting edit's early first night
 * waits for the next bedtime instead of ending tonight (`applyEdit`).
 */
export function saveRoutine(next: Routine, now = new Date(), early = false): Date {
  const stored = applyEdit(read(now), next, now, getArmedNight() !== null, early);
  sharedSet(KEY, stored);
  return stored.pending ? new Date(stored.pending.from) : now;
}

/**
 * Does iOS really hold a waiting edit's night early at `at` (before the edit applies)? The
 * monitor extension shields there only if the windows iOS has armed are in their night at
 * `at` (an earlier bedtime is armed at once, but arming can also wait for a phantom night to
 * pass, `planArming`, and then iOS still has the routine in force's later windows), and it
 * skips them on an evening the routine in force has off. `evening` is the `getDay()` of the
 * edit's night's evening. The one rule for `inPendingFirstNight` (lock-controller.ts),
 * `nightAt` and the notification planner, so the lock, Home and the warning agree.
 */
export function holdsEarly(
  at: Date,
  evening: number,
  inForce: Routine,
  armed: { bedtime: number; morningStart: number } | null,
): boolean {
  if (!armed || !inForce.activeNights.includes(evening)) return false;
  const { latest } = nightsAround(at, { ...toLockSettings(inForce), ...armed, activeNights: [0, 1, 2, 3, 4, 5, 6] });
  return at >= latest.start && at < latest.end;
}

/**
 * The night at or after `start` (a bedtime worked out under one routine, which an edit waiting
 * for bedtime may have moved, even across midnight): the routine it runs on, when it really
 * starts under that routine, and whether it's on. Its evening is the day before its morning,
 * as in lock-state.ts. For "Apps awake until …" wherever it's shown.
 */
export function nightAt(start: Date, now = new Date()): { routine: Routine; start: Date; on: boolean } {
  const pending = getPendingRoutine(now);
  const nightUnder = (r: Routine) => {
    const { latest, next } = nightsAround(start, toLockSettings(r));
    return start < latest.end ? latest : next;
  };
  // The edit governs from its first night, which can start before `from` when it moves
  // bedtime earlier (the windows only tighten, so they're armed early: `planArming`).
  const pendingNight = pending ? nightUnder(pending.routine) : null;
  const usePending = pending && pendingNight && (pending.from <= start.getTime() || pendingNight.end.getTime() > pending.from);
  const routine = usePending ? pending.routine : getRoutine(now);
  const night = usePending && pendingNight ? pendingNight : nightUnder(routine);
  const evening = new Date(night.end.getFullYear(), night.end.getMonth(), night.end.getDate() - 1).getDay();
  // An earlier start than `from` is only real if iOS holds it early (`holdsEarly`). Otherwise
  // the edit's night starts at `from`.
  const early = usePending && pending && night.start.getTime() < pending.from;
  const held = holdsEarly(night.start, evening, getRoutine(now), getArmedNight());
  const begins = early && pending && !held ? new Date(pending.from) : night.start;
  return { routine, start: begins, on: routine.activeNights.includes(evening) };
}

/** The start of the first night at or after `from` that's on, a week out at most. Null when every night is off. */
export function nextNightOn(from: Date, now = new Date()): Date | null {
  for (let days = 0; days < 7; days++) {
    const at = new Date(from);
    at.setDate(at.getDate() + days);
    const night = nightAt(at, now);
    if (night.on) return night.start;
  }
  return null;
}
