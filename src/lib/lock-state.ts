/**
 * The lock's brain: given the time, the settings and this morning's facts, which phase are
 * we in and which apps are asleep?
 *
 * Everything here is pure. Nothing reads the clock, storage or the pedometer; the caller
 * passes those in. That keeps it testable on any machine, and lets the app, the shield
 * extension and the nightly self-check all ask the same question and get the same answer.
 *
 * Times of day are minutes since midnight (23:30 is 23 * 60 + 30), like onboarding's answers.
 * Weekdays are `Date.getDay()` numbers: 0 is Sunday.
 */

/**
 * - `night`: bedtime to morning start. Night apps are asleep, and steps don't count.
 * - `morning`: past morning start but not yet up. Lasts until bedtime if they never walk.
 * - `day`: woken up (steps, pass or emergency unlock). Only the always-blocked list sleeps.
 * - `off`: the night window of a night the user turned off. Nothing extra sleeps.
 */
export type Phase = 'night' | 'morning' | 'day' | 'off';

/**
 * Changes take effect from the next night (see `settingsTakeEffectAt`), so whatever the
 * caller passes here is the set that was active when tonight began.
 */
export type LockSettings = {
  bedtime: number;
  morningStart: number;
  stepGoal: number;
  /** Weekdays whose *evening* starts a locked night. Its morning belongs to the next day. */
  activeNights: number[];
  /** Asleep at night and until the morning walk. */
  nightApps: string[];
  /** Asleep in every phase. Wins over everything, including emergency unlocks. */
  alwaysApps: string[];
};

export type MorningFacts = {
  /** Steps from this morning's start until now (`currentMorning(...).start` to now). */
  steps: number;
  /**
   * The `morningKey` of the last morning unlocked by a pass, an emergency unlock, or
   * reaching the goal. Kept so the apps stay awake if a later pedometer read fails.
   */
  unlockedMorning: string | null;
};

export type LockState = {
  phase: Phase;
  /** De-duplicated app ids that should be shielded right now. */
  blocked: string[];
  /** Steps left before the apps wake. 0 outside `morning`. */
  stepsRemaining: number;
  /** The morning `now` belongs to, as YYYY-MM-DD. */
  morningKey: string;
  /** When the schedule next crosses a boundary (morning start or bedtime). */
  nextChange: Date;
};

export type Morning = {
  key: string;
  /** Morning start on that day. Count steps from here. */
  start: Date;
};

/** Local midnight `offsetDays` from `date`, plus `minutes`. Date normalizes any overflow. */
function atMinute(date: Date, minutes: number, offsetDays = 0): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + offsetDays, 0, minutes);
}

function dateKey(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

type Night = { start: Date; end: Date };

/**
 * The night leading into the morning `offsetDays` from `now`'s date. It usually starts the
 * evening before (23:30 to 07:00), but on the same day when bedtime is after midnight (01:00
 * to 07:00). Equal times mean no night: it starts and ends at morning start.
 *
 * Working in real instants, not minutes of the day, keeps daylight-saving nights honest. When
 * clocks go back after bedtime, 01:00 comes round twice, but the night has already begun and
 * stays begun. A bedtime the clocks skip (02:30 when they jump to 03:00) moves forward the way
 * JavaScript dates do.
 */
function nightBefore(now: Date, s: LockSettings, offsetDays: number): Night {
  const end = atMinute(now, s.morningStart, offsetDays);
  if (s.bedtime === s.morningStart) return { start: end, end };
  const start = atMinute(now, s.bedtime, s.bedtime < s.morningStart ? offsetDays : offsetDays - 1);
  // A skipped bedtime can land after morning start (02:30 to 03:00 on spring-forward day).
  // That night simply doesn't happen.
  return start > end ? { start: end, end } : { start, end };
}

/** Which morning `now` belongs to: the latest night that has already started. */
function locate(now: Date, s: LockSettings) {
  for (const offset of [1, 0, -1]) {
    const night = nightBefore(now, s, offset);
    if (now >= night.start) return { offset, night };
  }
  // Unreachable: yesterday's night always started before now.
  return { offset: -1, night: nightBefore(now, s, -1) };
}

/**
 * The morning that `now` belongs to. 23:45 belongs to tomorrow's morning (tonight leads into
 * it), 03:00 to today's, and with a 01:00 bedtime, 00:30 still belongs to yesterday's.
 */
export function currentMorning(now: Date, settings: LockSettings): Morning {
  const { night } = locate(now, settings);
  return { key: dateKey(night.end), start: night.end };
}

/**
 * When edited settings start applying: the start of the next night. An edit made during
 * the night waits for the following night, so nothing can be loosened from bed.
 */
export function settingsTakeEffectAt(editedAt: Date, settings: LockSettings): Date {
  return nightBefore(editedAt, settings, locate(editedAt, settings).offset + 1).start;
}

export function getLockState(now: Date, settings: LockSettings, facts: MorningFacts): LockState {
  const { offset, night: window } = locate(now, settings);
  const night = now < window.end;
  const morning = { key: dateKey(window.end), start: window.end };

  // The night that leads into this morning started the evening before it.
  const evening = atMinute(morning.start, 0, -1).getDay();
  const active = settings.activeNights.includes(evening);
  const unlocked =
    facts.unlockedMorning === morning.key || facts.steps >= settings.stepGoal;

  let phase: Phase;
  if (!active) phase = night ? 'off' : 'day';
  else if (night) phase = 'night'; // bedtime wins: walking at night never unlocks
  else if (unlocked) phase = 'day';
  else phase = 'morning';

  const asleep = phase === 'night' || phase === 'morning';
  const blocked = [...new Set([...settings.alwaysApps, ...(asleep ? settings.nightApps : [])])];

  return {
    phase,
    blocked,
    stepsRemaining: phase === 'morning' ? Math.max(0, settings.stepGoal - facts.steps) : 0,
    morningKey: morning.key,
    nextChange: night ? window.end : nightBefore(now, settings, offset + 1).start,
  };
}
