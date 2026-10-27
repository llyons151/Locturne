/**
 * The onboarding "value number". See docs/ONBOARDING_CONVERSION.md, "The number".
 *
 * It is arithmetic on the user's own answers: time on the phone in bed, not
 * "sleep lost". Research links an hour of screens in bed to about 24 minutes
 * less sleep, not 60, so a minute-for-minute sleep claim would overstate it.
 */

import type { Pain } from './navigation.ts';

/** U.S. life expectancy at birth, rounded (CDC NCHS, 2024 data). */
export const AVERAGE_LIFESPAN = 79;

export type EstimateInput = {
  nightMinutes: number;
  morningMinutes: number;
  nightsPerWeek: number;
  /** Minutes after midnight. */
  bedtime: number;
  /** Minutes after midnight. */
  wake: number;
  /** Years. */
  age: number | undefined;
  /** Both scroll questions skipped: there's no number of theirs to show (`Estimate.skipped`). */
  skipped?: boolean;
};

export type Estimate = {
  weeklyMinutes: number;
  /** The part of weeklyMinutes spent in bed after the alarm. */
  morningWeeklyMinutes: number;
  /** The part of weeklyMinutes spent on the phone after getting into bed. */
  nightWeeklyMinutes: number;
  /** When the phone usually goes down, in minutes after midnight (may pass 24 hours). */
  phoneDown: number;
  /** When their feet usually hit the floor, in minutes after midnight. */
  feetDown: number;
  /** Weekly hours rounded down to the nearest half hour. */
  weeklyHours: number;
  yearlyHours: number;
  yearlyDays: number;
  /** Years from now until AVERAGE_LIFESPAN. 0 without an age. */
  yearsLeft: number;
  /** Whole days on the phone in bed from now until AVERAGE_LIFESPAN, at this rate. 0 without an age. */
  lifetimeDays: number;
  /** Minutes between getting into bed and the alarm. */
  timeInBed: number;
  /** Time left for sleep once scrolling and ~15 minutes to fall asleep are taken out. */
  sleepRoom: number;
  sleepNeed: number;
  showSleepRoom: boolean;
  lightUser: boolean;
  /**
   * Both scroll questions skipped, so the minutes are 0 by default, not by answer. Also a
   * `lightUser` (no hours to sell), but nothing may call them light either: the reveal says
   * what a typical half hour adds up to instead of a number of theirs.
   */
  skipped: boolean;
  scheduleLooksWrong: boolean;
};

const MINUTES_PER_DAY = 24 * 60;
const TIME_TO_FALL_ASLEEP = 15;

export function estimate(input: EstimateInput): Estimate {
  const { nightMinutes, morningMinutes, nightsPerWeek, bedtime, wake, age } = input;

  const weeklyMinutes = (nightMinutes + morningMinutes) * nightsPerWeek;
  const { weeklyHours, yearlyHours } = weekAndYear(weeklyMinutes);
  const yearlyDays = Math.floor(yearlyHours / 24);
  const yearsLeft = age === undefined ? 0 : Math.max(0, AVERAGE_LIFESPAN - age);
  const lifetimeDays = daysOver(weeklyMinutes, yearsLeft);

  let timeInBed = wake - bedtime;
  if (timeInBed <= 0) timeInBed += MINUTES_PER_DAY;

  // AASM: 7+ hours for adults, 8+ for teens. Use the floor so nobody's gap is overstated.
  const sleepNeed = age !== undefined && age < 18 ? 8 * 60 : 7 * 60;
  const sleepRoom = Math.max(0, timeInBed - nightMinutes - TIME_TO_FALL_ASLEEP);

  return {
    weeklyMinutes,
    morningWeeklyMinutes: morningMinutes * nightsPerWeek,
    nightWeeklyMinutes: nightMinutes * nightsPerWeek,
    phoneDown: bedtime + nightMinutes,
    feetDown: wake + morningMinutes,
    weeklyHours,
    yearlyHours,
    yearlyDays,
    yearsLeft,
    lifetimeDays,
    timeInBed,
    sleepRoom,
    sleepNeed,
    showSleepRoom: sleepRoom < sleepNeed,
    lightUser: weeklyMinutes < 60,
    skipped: input.skipped === true,
    scheduleLooksWrong: timeInBed < 3 * 60 || timeInBed > 14 * 60,
  };
}

/**
 * Weekly minutes as the reveal shows them: whole hours, rounded up (no halves, user 2026-10-26),
 * and the year from the week as shown, so "9 hours a week" reads as 468 a year, not 485. Under
 * an hour a week the reveal says minutes, and the year is counted from those.
 */
export function weekAndYear(weeklyMinutes: number): { weeklyHours: number; yearlyHours: number } {
  const weeklyHours = weeklyParts(weeklyMinutes).unit === 'minutes' ? 0 : Math.ceil(weeklyMinutes / 60);
  const yearlyHours = weeklyHours > 0 ? weeklyHours * 52 : Math.floor((weeklyMinutes * 52) / 60);
  return { weeklyHours, yearlyHours };
}

/** 365.25 / 7: a year is a little over 52 weeks. */
const WEEKS_PER_YEAR = 365.25 / 7;

/**
 * Whole 24-hour days that `weeklyMinutes` adds up to over `years`, from the exact minutes, not
 * the rounded-up hours `weekAndYear` shows: rounding a week up an hour, then multiplying by a
 * lifetime, overstated the reveal by up to ~125 days.
 */
export function daysOver(weeklyMinutes: number, years: number): number {
  return Math.floor((weeklyMinutes * WEEKS_PER_YEAR * years) / MINUTES_PER_DAY);
}

/** Under this many minutes a week, a branch's own end of the night is too small to lead with. */
const LEAD_FLOOR = 60;

/**
 * The number the reveal, `time-back` and the paywall lead with (ONBOARDING_BRANCHES §5.5):
 * the branch's own end of the night, even when it's the smaller one, because their problem
 * persuades where a bigger number that's mostly someone else's doesn't. Under an hour a week
 * it falls back to both ends together. `all` always uses both; `overall` leads with the end
 * they named on `worst-time`, and both for a daytime answer.
 */
export type Lead = {
  /** Weekly minutes. */
  minutes: number;
  /** Which part of the night they are: after getting into bed, before getting up, or both. */
  scope: 'night' | 'morning' | 'both';
  weeklyHours: number;
  yearlyHours: number;
};

export function leadFor(numbers: Estimate, pain: Pain | undefined, worstTime?: string): Lead {
  if (pain === 'overall' && (worstTime === 'night' || worstTime === 'morning')) pain = worstTime;
  const pick = (minutes: number, scope: Lead['scope']): Lead => ({ minutes, scope, ...weekAndYear(minutes) });
  if (pain === 'night' && numbers.nightWeeklyMinutes >= LEAD_FLOOR) return pick(numbers.nightWeeklyMinutes, 'night');
  if (pain === 'morning' && numbers.morningWeeklyMinutes >= LEAD_FLOOR) return pick(numbers.morningWeeklyMinutes, 'morning');
  return pick(numbers.weeklyMinutes, 'both');
}

/** Where the lead's minutes go, after "…a week": "on your phone after bedtime". */
export const LEAD_WHERE: Record<Lead['scope'], string> = {
  night: 'on your phone after bedtime',
  morning: 'in bed after the alarm',
  both: 'on your phone in bed',
};

/** "25 minutes", "1 hour", "8 hours": whole numbers, rounded up. */
export function weeklyAmount(weeklyMinutes: number): string {
  const { count, unit } = weeklyParts(weeklyMinutes);
  return `${count} ${unit}`;
}

/** `weeklyAmount` in its two parts, so the number can move on its own (`RollingCount`). */
export function weeklyParts(weeklyMinutes: number): { count: number; unit: 'minutes' | 'hour' | 'hours' } {
  const minutes = Math.max(5, Math.ceil(weeklyMinutes / 5) * 5);
  if (minutes < 60) return { count: minutes, unit: 'minutes' };
  const hours = Math.ceil(weeklyMinutes / 60);
  return { count: hours, unit: hours === 1 ? 'hour' : 'hours' };
}

/** "That’s 786 hours a year." / "That’s 32 days a year." Matches the reveal grid. */
export function yearSentence(count: number, unit: 'hour' | 'day'): string {
  return `That’s ${yearAmount(count, unit)}`;
}

/** "56 days a year." */
export function yearAmount(count: number, unit: 'hour' | 'day'): string {
  return `${count.toLocaleString('en-US')} ${unit}${count === 1 ? '' : 's'} a year.`;
}

/** "That’s over 5 years of your life." / nothing under a year. */
export function lifetimeSentence(lifetimeDays: number): string {
  const years = Math.floor(lifetimeDays / 365);
  if (years < 1) return '';
  return `That’s over ${years === 1 ? 'a year' : `${years} years`} of your life.`;
}

/** Minutes as whole hours, to the nearest, e.g. 390 → "7". */
export function formatHoursFromMinutes(minutes: number): string {
  return `${Math.round(minutes / 60)}`;
}

/** "Sep 29" for `days` from today. */
export function dateFromToday(days: number, today = new Date()): string {
  const date = new Date(today);
  date.setDate(date.getDate() + days);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** True when `now` falls inside the bedtime window, e.g. onboarding at 12:40 AM. */
export function isInsideBedtime(bedtime: number, wake: number, now = new Date()): boolean {
  const minutes = now.getHours() * 60 + now.getMinutes();
  if (bedtime === wake) return false;
  return bedtime < wake ? minutes >= bedtime && minutes < wake : minutes >= bedtime || minutes < wake;
}

/** For sentences: "midnight" and "noon" read better than "12:00 AM" and "12:00 PM". */
export function formatWhen(minutes: number): string {
  const normalized = ((minutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  if (normalized === 0) return 'midnight';
  if (normalized === 12 * 60) return 'noon';
  return formatClock(normalized);
}

/** 1410 → "11:30 PM", with a no-break space so the time never wraps away from AM/PM. */
export function formatClock(minutes: number): string {
  const normalized = ((minutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const hours24 = Math.floor(normalized / 60);
  const mins = normalized % 60;
  const suffix = hours24 < 12 ? 'AM' : 'PM';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${mins.toString().padStart(2, '0')}\u00A0${suffix}`;
}
