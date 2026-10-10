/**
 * Daily time limits (GAME_PLAN, "Daytime controls"): "Instagram, 30 minutes a day". Once a
 * limit is used up, its apps sleep until midnight.
 *
 * The rule from GAME_PLAN applies here too: a stricter limit starts now, a looser one (more
 * minutes, or removing it) waits for the next bedtime, so nothing can be loosened in the
 * moment of wanting the app. A looser edit is kept as `pending` until then.
 *
 * Pure: the caller passes the clock in. `screen-time.ts` hands the result to iOS.
 */
import { settingsTakeEffectAt, type LockSettings } from './lock-state.ts';

/** Each limit is its own Screen Time selection and its own monitored activity. */
export type LimitId = `limit-${number}`;

export type DailyLimit = {
  id: LimitId;
  /** The limit iOS is enforcing now. */
  minutes: number;
  /**
   * A looser edit waiting for bedtime. `minutes: null` means the limit is being removed. `dated`:
   * when `from` was worked out, so it can be worked out again if the windows or the waiting
   * routine edit change (`redateLooserEdits` in lock-controller.ts).
   */
  pending?: { minutes: number | null; from: number; dated?: number };
};

/** A few typical times, for the simulation tests. The wheels set any time, from a minute up to `LIMIT_MAX`. */
export const LIMIT_CHOICES = [15, 30, 60, 120];

/** 23 hr 59 min: Screen Time counts a day's use from midnight, so a longer one never trips. */
export const LIMIT_MAX = 24 * 60 - 1;

/**
 * iOS monitors about 20 activities per app: up to 16 night windows (`night-plan.ts`), one
 * Block now session, and these.
 */
export const MAX_LIMITS = 3;

const IDS: LimitId[] = Array.from({ length: MAX_LIMITS }, (_, i) => `limit-${i}` as LimitId);

export function isLimitId(id: string): id is LimitId {
  return (IDS as string[]).includes(id);
}

/** The first unused slot, or null when every limit is taken. */
export function freeLimitId(limits: DailyLimit[]): LimitId | null {
  return IDS.find((id) => !limits.some((l) => l.id === id)) ?? null;
}

/**
 * Applies an edit. `minutes: null` removes the limit. A new or stricter limit replaces the
 * old one at once (and cancels any loosening that was waiting); a looser one waits until
 * `takeEffectAt`, or until the loosening already waiting was due if that's later: a second
 * loosening never brings the first one forward (one that waits for midnight with nothing
 * armed, then again once a night is armed for an earlier bedtime).
 */
export function editLimit(
  limits: DailyLimit[],
  id: LimitId,
  minutes: number | null,
  takeEffectAt: Date,
  editedAt?: Date,
): DailyLimit[] {
  const current = limits.find((l) => l.id === id);
  if (!current) return minutes === null ? limits : [...limits, { id, minutes }];

  let next: DailyLimit;
  if (minutes !== null && minutes <= current.minutes) next = { id, minutes };
  else {
    const waiting = current.pending && current.pending.from > takeEffectAt.getTime() ? current.pending : null;
    const from = waiting ? waiting.from : takeEffectAt.getTime();
    const dated = waiting ? waiting.dated : editedAt?.getTime();
    next = { id, minutes: current.minutes, pending: { minutes, from, ...(dated === undefined ? {} : { dated }) } };
  }
  return limits.map((l) => (l.id === id ? next : l));
}

/**
 * Applies loosenings whose bedtime has come. Returns the new list and which limits iOS needs
 * to hear about: `rearm` with a new number of minutes, `removed` to stop entirely.
 */
export function settleLimits(limits: DailyLimit[], now: Date) {
  const rearm: DailyLimit[] = [];
  const removed: LimitId[] = [];
  const next: DailyLimit[] = [];
  for (const limit of limits) {
    if (!limit.pending || limit.pending.from > now.getTime()) next.push(limit);
    else if (limit.pending.minutes === null) removed.push(limit.id);
    else {
      const settled = { id: limit.id, minutes: limit.pending.minutes };
      next.push(settled);
      rearm.push(settled);
    }
  }
  return { limits: next, rearm, removed };
}

/**
 * When a looser edit starts: the next bedtime, worked out like every other settings change.
 * Without an armed night there's no bedtime, so it waits for midnight instead.
 */
export function looserEditsStart(now: Date, night: { bedtime: number; morningStart: number } | null): Date {
  if (!night) return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const settings: LockSettings = {
    ...night,
    stepGoal: 0,
    activeNights: [],
    nightApps: [],
    alwaysApps: [],
  };
  return settingsTakeEffectAt(now, settings);
}

/** 30 → "30 min", 60 → "1 hr", 90 → "1 hr 30 min". */
export function limitLabel(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m} min`;
  return m ? `${h} hr ${m} min` : `${h} hr`;
}
