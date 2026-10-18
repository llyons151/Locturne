/**
 * The morning payoff's words (payoff-screen.tsx): what a won morning says about itself. Pure,
 * so the copy is tested without a screen (`payoff.test.ts`).
 */
import type { WakeMethod } from '../../lib/routine.ts';

/** What got them up, said first in the line under "Up at". */
export const PAYOFF_METHOD: Record<WakeMethod, string> = {
  // Down or up: whichever floor the coffee is on.
  downstairs: 'Took the stairs',
  steps: 'Steps walked',
  scan: 'Code scanned',
  place: 'Out the door',
  pushups: 'Push-ups done',
};

/** The mornings that get their own word in the kicker. */
const MILESTONES: Record<number, string> = { 1: 'Your first morning', 7: 'A week of mornings', 30: 'Thirty mornings', 100: 'One hundred mornings' };

/** Over the big time: "Morning 12", or a milestone's own name. */
export function payoffKicker(mornings: number): string {
  return MILESTONES[mornings] ?? `Morning ${mornings}`;
}

/** "7:06", without the am/pm the big number sets apart. */
export function clockParts(minutes: number): { value: string; unit: string } {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return { value: `${h % 12 || 12}:${String(m).padStart(2, '0')}`, unit: h < 12 ? 'am' : 'pm' };
}

/** "7:00 am", kept on one line. */
const clock = (minutes: number) => {
  const { value, unit } = clockParts(minutes);
  return `${value}\u00a0${unit}`;
};

/**
 * How long after the morning start they were up, in words: "Right at 7:00 am", "6 min after
 * 7:00 am", "1 h 12 min after 7:00 am". A proof never comes before the start (`proofCounts`).
 */
export function lateWords(upAt: number, start: number): string {
  // Past midnight the start can be yesterday's clock (a 23:30 morning, up at 00:10).
  const late = (upAt - start + 1440) % 1440;
  if (late <= 1) return `Right at ${clock(start)}`;
  const h = Math.floor(late / 60);
  const m = late % 60;
  const span = h ? (m ? `${h} h ${m} min` : `${h} h`) : `${m} min`;
  return `${span} after ${clock(start)}`;
}

/** The line under "Up at": the method, then how it went against the morning start. */
export function payoffLine(method: WakeMethod, upAt: number, start: number): string {
  return `${PAYOFF_METHOD[method]}, ${lateWords(upAt, start).replace(/^Right/, 'right')}. Your apps are awake.`;
}

/** What the Share button sends: the morning in one line, no stats a stranger can't read. */
export function shareText(mornings: number, upAt: number): string {
  return `Up at ${clock(upAt)}. ${mornings === 1 ? 'My first morning' : `Morning ${mornings}`} out of bed with Locturne.`;
}
