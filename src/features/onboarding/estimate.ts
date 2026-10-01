/**
 * The onboarding "value number". See docs/ONBOARDING_CONVERSION.md, "The number".
 *
 * It is arithmetic on the user's own answers: time on the phone in bed, not
 * "sleep lost". Research links an hour of screens in bed to about 24 minutes
 * less sleep, not 60, so a minute-for-minute sleep claim would overstate it.
 */

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
};

export type Estimate = {
  weeklyMinutes: number;
  /** The part of weeklyMinutes spent in bed after the alarm. */
  morningWeeklyMinutes: number;
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
  scheduleLooksWrong: boolean;
};

const MINUTES_PER_DAY = 24 * 60;
const TIME_TO_FALL_ASLEEP = 15;

export function estimate(input: EstimateInput): Estimate {
  const { nightMinutes, morningMinutes, nightsPerWeek, bedtime, wake, age } = input;

  const weeklyMinutes = (nightMinutes + morningMinutes) * nightsPerWeek;
  const weeklyHours = Math.floor(weeklyMinutes / 30) / 2;
  const yearlyHours = Math.floor((weeklyMinutes * 52) / 60);
  const yearlyDays = Math.floor(yearlyHours / 24);
  const yearsLeft = age === undefined ? 0 : Math.max(0, AVERAGE_LIFESPAN - age);
  const lifetimeDays = Math.floor((yearlyHours * yearsLeft) / 24);

  let timeInBed = wake - bedtime;
  if (timeInBed <= 0) timeInBed += MINUTES_PER_DAY;

  // AASM: 7+ hours for adults, 8+ for teens. Use the floor so nobody's gap is overstated.
  const sleepNeed = age !== undefined && age < 18 ? 8 * 60 : 7 * 60;
  const sleepRoom = Math.max(0, timeInBed - nightMinutes - TIME_TO_FALL_ASLEEP);

  return {
    weeklyMinutes,
    morningWeeklyMinutes: morningMinutes * nightsPerWeek,
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
    scheduleLooksWrong: timeInBed < 3 * 60 || timeInBed > 14 * 60,
  };
}

/** "About 25 minutes", "About half an hour", "About 1 hour", "About 7½ hours". */
export function weeklyAmount(weeklyMinutes: number): string {
  if (weeklyMinutes < 30) return `${Math.max(5, Math.floor(weeklyMinutes / 5) * 5)} minutes`;
  const hours = Math.floor(weeklyMinutes / 30) / 2;
  if (hours === 0.5) return 'half an hour';
  if (hours === 1) return '1 hour';
  return `${formatHalves(hours)} hours`;
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

/** 7.5 → "7½", 0.5 → "½", 8 → "8". */
export function formatHalves(value: number): string {
  const whole = Math.floor(value);
  const half = value - whole >= 0.5;
  if (whole === 0) return half ? '½' : '0';
  return half ? `${whole}½` : `${whole}`;
}

/** Rounds minutes down to half hours and formats them, e.g. 390 → "6½". */
export function formatHoursFromMinutes(minutes: number): string {
  return formatHalves(Math.floor(minutes / 30) / 2);
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
