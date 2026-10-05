/**
 * The person's routine: bedtime, morning start, which nights, how they prove they're up, and
 * the step goal. Saved in the App Group so the extensions can read it with the app closed.
 *
 * While a night is armed, every edit waits for the next bedtime (GAME_PLAN, decided
 * 2026-10-01): `saveRoutine` keeps the edit as `pending` until then, and `getRoutine` promotes
 * it once that bedtime passes. With nothing armed there's no lock to loosen, so it applies now.
 */
import { armedBedtime, dateKey, nightInto, nightsAround, settingsTakeEffectAt, type LockSettings, type Morning } from './lock-state.ts';
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
  /**
   * When `active` came into force, in ms: the edit's `from` once it applied, or the moment of a
   * save that applied at once. A night of it that ended before then was never run under it
   * (`nightRanUnder`). Missing on routines saved before it was kept.
   */
  since?: number;
  /** The routine in force before `active`, for a night into the same morning that ran under it. */
  prior?: Routine;
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
  if (stored.pending && now.getTime() >= stored.pending.from) {
    return { active: stored.pending.routine, since: stored.pending.from, prior: stored.active };
  }
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
  armed: boolean | ArmedTimes = true,
  early = false,
): StoredRoutine {
  if (!stored) return { active: next, since: now.getTime() };
  const settled = settleRoutine(stored, now);
  if (!armed) return { active: next, since: now.getTime(), prior: settled.active };
  // Promoted from inside its own early first night: in force from now, a night already running.
  const promoted = early && settled.pending;
  const active = promoted ? settled.pending!.routine : settled.active;
  const change = promoted ? { since: now.getTime(), prior: settled.active } : { since: settled.since, prior: settled.prior };
  // The next bedtime as iOS runs the routine in force (`runsAs`): windows still armed for an
  // older routine can hold tonight from their own bedtime, and an edit made inside that night
  // is an edit from bed, which waits for the next one. By the routine's own bedtime it would
  // apply later tonight, and one switching tonight off would free the night from bed.
  const times = typeof armed === 'object' ? armed : null;
  const runs = runsAs(active, promoted ? null : (settled.pending ?? null), times, change.since);
  const from = settingsTakeEffectAt(now, toLockSettings(runs)).getTime();
  const result: StoredRoutine = { active, pending: { routine: next, from } };
  // Only defined fields: the App Group store takes property lists, which have no undefined.
  if (change.since !== undefined) result.since = change.since;
  if (change.prior !== undefined) result.prior = change.prior;
  return result;
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

/** When the routine in force came into force and the one before it, or null if not known. */
export function getRoutineChange(now = new Date()): { since: number; prior: Routine | null } | null {
  const stored = read(now);
  return stored?.since === undefined ? null : { since: stored.since, prior: stored.prior ?? null };
}

/**
 * Pure: which routine did the night into `morning` (worked out under `routine`, the one in
 * force) really run under? `routine` if that night ended after it came into force
 * (`change.since`); else the routine before it, if that one's night into the same morning began
 * before then on an evening it had on; else `none`. A morning no night ran into is free: a
 * switch from a night shift (08:00 to 16:00) saved at 07:30 applies at 08:00, when 23:00 to
 * 07:00 names this morning again with a night nobody slept under either routine. A morning the
 * old routine's night led into stays locked until proven, as before the edit. `unknown` for a
 * routine saved before the change was kept.
 */
export function nightRanUnder(
  morning: Pick<Morning, 'key' | 'start'>,
  change: { since: number; prior: Routine | null } | null,
): 'routine' | 'prior' | 'none' | 'unknown' {
  if (!change) return 'unknown';
  if (morning.start.getTime() > change.since) return 'routine';
  const { prior } = change;
  if (!prior) return 'none';
  const [year, month, day] = morning.key.split('-').map(Number);
  const evening = new Date(year, month - 1, day - 1).getDay();
  const began = nightInto(morning.key, prior).start.getTime() < change.since;
  return prior.activeNights.includes(evening) && began ? 'prior' : 'none';
}

/**
 * The routine a night under `routine` really runs on while iOS still has windows armed for
 * other times (`armed`, from `getArmedNight`): the same, starting at the armed bedtime when the
 * two nights overlap (`armedBedtime`, lock-state.ts). The one rule for `routineAt`
 * (lock-controller.ts), `nightAt` and the notification planner, so the lock, Home and the
 * warning follow the windows iOS will really run until Locturne opens and re-arms them.
 */
export function asArmed(routine: Routine, armed: { bedtime: number; morningStart: number } | null): Routine {
  const bedtime = armed ? armedBedtime(routine, armed) : null;
  return bedtime === null ? routine : { ...routine, bedtime };
}

/** The times iOS has armed (`getArmedNight`), and when, if known. */
export type ArmedTimes = { bedtime: number; morningStart: number; armedAt?: string };

/**
 * Are the windows armed the waiting edit's own: its times, armed since the routine in force
 * came into force (`since`)? An earlier bedtime is armed at once (`planArming`), and its early
 * first night is `holdsEarly`'s to judge, not `asArmed`'s. Windows with the edit's times armed
 * before then are an older routine's still running (an edit back to it from inside the night
 * they hold). Without either time, the times decide.
 */
export function armedForEdit(armed: ArmedTimes, edit: Pick<Routine, 'bedtime' | 'morningStart'>, since: number | null | undefined): boolean {
  if (armed.bedtime !== edit.bedtime || armed.morningStart !== edit.morningStart) return false;
  const at = armed.armedAt === undefined ? Number.NaN : Date.parse(armed.armedAt);
  return since === null || since === undefined || Number.isNaN(at) || at >= since;
}

/**
 * The routine in force as iOS runs it (`asArmed`), also while an edit waits: windows still armed
 * for an older routine hold a night of it from their own bedtime whether or not an edit was saved
 * since, and an edit saved from inside that night mustn't hand it back to the routine's own later
 * bedtime. Not when the windows are the waiting edit's own (`armedForEdit`). `since` is when the
 * routine in force came into force (`getRoutineChange`). The one rule for `routineAt`
 * (lock-controller.ts), `applyEdit`, `nightAt` and the notification planner.
 */
export function runsAs(
  routine: Routine,
  pending: { routine: Routine } | null | undefined,
  armed: ArmedTimes | null,
  since: number | null | undefined,
): Routine {
  if (!armed || (pending && armedForEdit(armed, pending.routine, since))) return routine;
  return asArmed(routine, armed);
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
  const stored = applyEdit(read(now), next, now, getArmedNight() ?? false, early);
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
    // A night of no length starting right at `start` (one inside the spring clock gap, whose
    // windows all fire at its end) still shields then.
    return start < latest.end || start.getTime() === latest.start.getTime() ? latest : next;
  };
  // The edit governs from its first night, which can start before `from` when it moves
  // bedtime earlier (the windows only tighten, so they're armed early: `planArming`).
  const pendingNight = pending ? nightUnder(pending.routine) : null;
  const usePending = pending && pendingNight && (pending.from <= start.getTime() || pendingNight.end.getTime() > pending.from);
  const routine = usePending ? pending.routine : getRoutine(now);
  let night = usePending && pendingNight ? pendingNight : nightUnder(routine);
  // Windows still armed for other times run until Locturne re-arms them (`asArmed`). For a
  // night of the routine in force while an edit waits, not when they're the edit's early ones
  // (`runsAs`; `holdsEarly` below judges those).
  const armed = getArmedNight();
  const runs = usePending ? asArmed(routine, armed) : runsAs(routine, pending, armed, read(now)?.since);
  if (runs !== routine) night = nightInto(dateKey(night.end), runs);
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
