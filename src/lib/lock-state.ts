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

/**
 * The daytime controls (GAME_PLAN, "Daytime controls"). They only ever add apps to
 * `blocked` and never change the phase, so walking 200 steps can't lift them.
 */
export type DaytimeFacts = {
  /** A Block now session ("tuck him in now"), or null when none is running. */
  blockNow: { apps: string[]; end: Date } | null;
  /** Each daily limit's apps, and the calendar day (YYYY-MM-DD) it was last used up. */
  limits: { apps: string[]; reachedOn: string | null }[];
};

const NO_DAYTIME: DaytimeFacts = { blockNow: null, limits: [] };

export type LockState = {
  phase: Phase;
  /**
   * De-duplicated app ids that should be shielded right now, strongest rule first:
   * always-blocked, the night or morning lock, Block now, then used-up daily limits.
   */
  blocked: string[];
  /** When the running Block now session ends, or null. */
  blockNowUntil: Date | null;
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
  /**
   * When the night leading into it began, in this zone and under these settings (`start`
   * itself for a night of zero length). A method proof made before it belongs to an earlier
   * night's morning (`proofUnlocks`, morning-proof.ts).
   */
  nightStart: Date;
};

/** Local midnight `offsetDays` from `date`, plus `minutes`, as `wallClock` places it. */
function atMinute(date: Date, minutes: number, offsetDays = 0): Date {
  return wallClock(date, minutes, offsetDays);
}

/**
 * The instant the clock on the wall reads `minutes` past local midnight, `offsetDays` from
 * `date`'s day. A time the spring clock change skips (02:30 when 02:00 jumps to 03:00) is the
 * first instant after the gap (03:00), where iOS fires a night window scheduled inside it, not
 * the hour later JavaScript dates move it to. A time that comes round twice in the autumn is
 * the first. Everything that works out a bedtime or a morning start goes through here, so the
 * lock, Home's line and the bedtime warning agree with the windows.
 */
export function wallClock(date: Date, minutes: number, offsetDays = 0): Date {
  const y = date.getFullYear();
  const mo = date.getMonth();
  const d = date.getDate() + offsetDays;
  const at = new Date(y, mo, d, 0, minutes);
  const wanted = Date.UTC(y, mo, d, 0, minutes);
  const wall = (t: number) => {
    const x = new Date(t);
    return Date.UTC(x.getFullYear(), x.getMonth(), x.getDate(), x.getHours(), x.getMinutes(), x.getSeconds());
  };
  if (wall(at.getTime()) === wanted) return at;
  // Skipped: step back to the gap's end (the minute before it reads earlier than wanted).
  let t = at.getTime();
  for (let i = 0; i < 24 * 60 && wall(t - 60_000) > wanted; i++) t -= 60_000;
  return new Date(t);
}

/** A calendar day as YYYY-MM-DD, in local time. Daily limits reset when this changes. */
export function dateKey(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

export type Night = { start: Date; end: Date };

/**
 * The night leading into the morning `offsetDays` from `now`'s date. It usually starts the
 * evening before (23:30 to 07:00), but on the same day when bedtime is after midnight (01:00
 * to 07:00). Equal times mean no night: it starts and ends at morning start.
 *
 * Working in real instants, not minutes of the day, keeps daylight-saving nights honest. When
 * clocks go back after bedtime, 01:00 comes round twice, but the night has already begun and
 * stays begun. A bedtime the clocks skip (02:30 when they jump to 03:00) starts at the end of
 * the gap, when iOS fires the window scheduled for it (`wallClock`).
 */
function nightBefore(now: Date, s: Pick<LockSettings, 'bedtime' | 'morningStart'>, offsetDays: number): Night {
  const end = atMinute(now, s.morningStart, offsetDays);
  if (s.bedtime === s.morningStart) return { start: end, end };
  const start = atMinute(now, s.bedtime, s.bedtime < s.morningStart ? offsetDays : offsetDays - 1);
  // A night inside the spring gap (02:30 to 03:00 when 02:00 jumps to 03:00) starts and ends at
  // 03:00: a night of no length, as its windows all fire then.
  return start > end ? { start: end, end } : { start, end };
}

/**
 * The night leading into the morning keyed `key` (YYYY-MM-DD, `dateKey`) under these times,
 * in the zone the phone is in now. `proofUnlocks` (morning-proof.ts) asks it with the times a
 * proof was judged under, so a routine saved since then can't move that night.
 */
export function nightInto(key: string, times: Pick<LockSettings, 'bedtime' | 'morningStart'>): Night {
  const [year, month, day] = key.split('-').map(Number);
  return nightBefore(new Date(year, month - 1, day), times, 0);
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
 * The nights either side of `now`, as real instants: `latest` is the last one to have started
 * (`now` may still be inside it), `next` the one after. A night of zero length (bedtime equal
 * to morning start, or skipped by the clocks) has `start` equal to `end`.
 */
export function nightsAround(now: Date, settings: LockSettings): { latest: Night; next: Night } {
  const { offset, night } = locate(now, settings);
  return { latest: night, next: nightBefore(now, settings, offset + 1) };
}

/**
 * The bedtime a night under `times` really starts at while iOS still runs night windows armed
 * for other times (`armed`): arming can wait out a phantom night (wake/arming.ts), and with
 * Locturne closed nothing re-arms, so the old windows keep running after the edit applies. The
 * monitor extension places each window by the armed times, so it shields the night into the
 * same morning from the armed bedtime: earlier than the routine says (a later bedtime saved
 * after the walk) or later (an earlier one). The morning still starts at the routine's time
 * (the hold lasts until a proof either way). Null when the two nights into a morning don't
 * overlap (a switch to or from a night shift): joining them would hold the apps through what
 * the new routine calls day (23:00 to 16:00 for an 08:00 to 16:00 shift), so the routine's own
 * night stands. Pure minutes since midnight, each night measured back from its morning's midnight.
 */
export function armedBedtime(
  times: Pick<LockSettings, 'bedtime' | 'morningStart'>,
  armed: Pick<LockSettings, 'bedtime' | 'morningStart'>,
): number | null {
  if (armed.bedtime === times.bedtime) return null;
  if (times.bedtime === times.morningStart || armed.bedtime === armed.morningStart) return null;
  const startOf = (t: Pick<LockSettings, 'bedtime' | 'morningStart'>) => (t.bedtime < t.morningStart ? t.bedtime : t.bedtime - 1440);
  const ours = startOf(times);
  const theirs = startOf(armed);
  // The armed bedtime as a night ending at our morning start must land on the same evening.
  const moved = armed.bedtime < times.morningStart ? armed.bedtime : armed.bedtime - 1440;
  if (moved !== theirs) return null;
  return Math.max(ours, theirs) < Math.min(times.morningStart, armed.morningStart) ? armed.bedtime : null;
}

/**
 * Was the lock armed in time to hold the morning `now` belongs to? Only a night armed before
 * its morning started can lock that morning. Finishing onboarding at 3 pm or 7:30 am arms
 * tonight, not the morning already under way, so that morning is simply free; arming at
 * 23:30 shields straight away, so tomorrow morning is locked. Nothing armed: nothing locked.
 */
export function armedInTime(now: Date, settings: LockSettings, armedSince: Date | null): boolean {
  return armedSince !== null && armedSince < nightsAround(now, settings).latest.end;
}

/**
 * The morning that `now` belongs to. 23:45 belongs to tomorrow's morning (tonight leads into
 * it), 03:00 to today's, and with a 01:00 bedtime, 00:30 still belongs to yesterday's.
 */
export function currentMorning(now: Date, settings: LockSettings): Morning {
  const { night } = locate(now, settings);
  return { key: dateKey(night.end), start: night.end, nightStart: night.start };
}

/**
 * When edited settings start applying: the start of the next night. An edit made during
 * the night waits for the following night, so nothing can be loosened from bed.
 */
export function settingsTakeEffectAt(editedAt: Date, settings: LockSettings): Date {
  return nightBefore(editedAt, settings, locate(editedAt, settings).offset + 1).start;
}

export function getLockState(
  now: Date,
  settings: LockSettings,
  facts: MorningFacts,
  daytime: DaytimeFacts = NO_DAYTIME,
): LockState {
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
  const session = daytime.blockNow && now < daytime.blockNow.end ? daytime.blockNow : null;
  // Limits count calendar days, like Screen Time, not mornings.
  const today = dateKey(now);
  const usedUp = daytime.limits.filter((limit) => limit.reachedOn === today);
  const blocked = [
    ...new Set([
      ...settings.alwaysApps,
      ...(asleep ? settings.nightApps : []),
      ...(session ? session.apps : []),
      ...usedUp.flatMap((limit) => limit.apps),
    ]),
  ];

  return {
    phase,
    blocked,
    blockNowUntil: session ? session.end : null,
    stepsRemaining: phase === 'morning' ? Math.max(0, settings.stepGoal - facts.steps) : 0,
    morningKey: morning.key,
    nextChange: night ? window.end : nightBefore(now, settings, offset + 1).start,
  };
}
