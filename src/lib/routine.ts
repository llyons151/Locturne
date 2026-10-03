/**
 * The person's routine: bedtime, morning start, which nights, how they prove they're up, and
 * the step goal. Saved in the App Group so the extensions can read it with the app closed.
 *
 * Every edit waits for the next bedtime (GAME_PLAN, decided 2026-10-01): `saveRoutine` keeps
 * the edit as `pending` until then, and `getRoutine` promotes it once that bedtime passes.
 */
import { settingsTakeEffectAt, type LockSettings } from './lock-state.ts';
import { sharedGet, sharedSet } from './screen-time.ts';

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

/** Pure: records an edit. The first save (onboarding) applies at once; later ones wait. */
export function applyEdit(stored: StoredRoutine | undefined, next: Routine, now: Date): StoredRoutine {
  if (!stored) return { active: next };
  const settled = settleRoutine(stored, now);
  const from = settingsTakeEffectAt(now, toLockSettings(settled.active)).getTime();
  return { active: settled.active, pending: { routine: next, from } };
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

/** Saves an edit and returns when it takes effect. */
export function saveRoutine(next: Routine, now = new Date()): Date {
  const stored = applyEdit(read(now), next, now);
  sharedSet(KEY, stored);
  return stored.pending ? new Date(stored.pending.from) : now;
}
