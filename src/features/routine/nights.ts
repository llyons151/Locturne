/**
 * Two ways of numbering nights. The Routine screen (like onboarding's day picker) lists
 * them Monday first, so 0 is Monday night and 6 is Sunday night. The stored routine and the
 * lock rules use `Date.getDay()`, where 0 is Sunday. A night is named after its evening in
 * both: Monday night starts on Monday evening, so its `getDay()` number is Monday's, 1.
 *
 * Pure, so the mapping is tested (`nights.test.ts`).
 */

/** Monday-first night (0 = Monday) to `Date.getDay()` (0 = Sunday). */
export const toWeekday = (night: number): number => (night + 1) % 7;

/** `Date.getDay()` (0 = Sunday) to Monday-first night (0 = Monday). */
export const fromWeekday = (day: number): number => (day + 6) % 7;

const sorted = (list: number[]) => [...new Set(list)].sort((a, b) => a - b);

export const nightsToWeekdays = (nights: number[]): number[] => sorted(nights.map(toWeekday));

export const weekdaysToNights = (days: number[]): number[] => sorted(days.map(fromWeekday));
