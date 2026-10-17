/**
 * App schedules (docs/LOCK_V2.md): apps that sleep at set times of day, on set days. "Work,
 * 9 am to 5 pm, weekdays." The always list is the one that sleeps all day, every day; these are
 * the rest, each with its own picks (a Screen Time selection named by its id).
 *
 * Which schedules are blocking is worked out from the clock, here and in the monitor extension
 * (`locturneScheduleBlocking` in DeviceActivityMonitorExtension.swift; keep the two in step).
 * iOS's start and end callbacks for each schedule's activity only nudge: any callback or app
 * open puts up what's due and takes down what isn't.
 *
 * Edits (user, 2026-10-14): a stricter one applies at once; a looser one (a shorter or moved
 * block, fewer days, deleting it) applies at once too unless the schedule is blocking right now,
 * when it waits until this block ends. The picks follow the same rule (`scheduleRemovalsAt`).
 *
 * Pure: the caller passes the clock in. screen-time.ts stores them and hands them to iOS.
 */

export type ScheduleId = `sched-${number}`;

export type Schedule = {
  id: ScheduleId;
  /** What the person called it ("Work"). */
  name: string;
  /** Minutes since midnight. With `end` at or before `start` the block runs past midnight. */
  start: number;
  end: number;
  /** All day: from midnight to midnight on each of `days`. `start` and `end` are kept for when it's switched off. */
  allDay?: boolean;
  /** `Date.getDay()` numbers of the days a block starts on. 0 is Sunday. */
  days: number[];
  /** A looser edit waiting for this block to end: the schedule as it will be, or null to delete it. */
  pending?: { schedule: Omit<Schedule, 'pending'> | null; from: number };
};

/**
 * iOS monitors about 20 activities per app: seven night windows (night-plan.ts), Block now,
 * five daily limits, a one-off settle and these: 18, with two to spare for the monitor
 * extension's re-arming handoff. Four schedules under Sleep at bedtime and five limits, so each
 * tab holds five tiles (user, 2026-10-14).
 */
export const MAX_SCHEDULES = 4;

const IDS: ScheduleId[] = Array.from({ length: MAX_SCHEDULES }, (_, i) => `sched-${i}` as ScheduleId);
export const SCHEDULE_IDS: readonly ScheduleId[] = IDS;

export const SCHEDULE_PREFIX = 'sched-';

export function isScheduleId(id: string): id is ScheduleId {
  return (IDS as string[]).includes(id);
}

/** The first unused slot, or null when every schedule is taken. */
export function freeScheduleId(schedules: Schedule[]): ScheduleId | null {
  return IDS.find((id) => !schedules.some((s) => s.id === id)) ?? null;
}

const DAY = 24 * 60;
const MIN = 60_000;
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const WEEKDAYS = [1, 2, 3, 4, 5];

/** Ready-made schedules for "New schedule" (user's pick, 2026-10-14): each opens the sheet filled in. */
export const PRESETS: { key: string; name: string; start: number; end: number; allDay?: boolean; days: number[]; about: string }[] = [
  { key: 'work', name: 'Work', start: 9 * 60, end: 17 * 60, days: WEEKDAYS, about: '9 am to 5 pm, weekdays' },
  { key: 'study', name: 'Study', start: 18 * 60, end: 21 * 60, days: [0, 1, 2, 3, 4], about: '6 pm to 9 pm, Sunday to Thursday' },
  { key: 'mornings', name: 'Mornings', start: 7 * 60, end: 10 * 60, days: ALL_DAYS, about: '7 am to 10 am, every day' },
  { key: 'custom', name: '', start: 12 * 60, end: 13 * 60, days: ALL_DAYS, about: 'Your own times' },
];

/** The block's start and end as minutes, all day being midnight to midnight. */
function span(s: Pick<Schedule, 'start' | 'end' | 'allDay'>): { start: number; length: number } {
  if (s.allDay) return { start: 0, length: DAY };
  const length = (((s.end - s.start) % DAY) + DAY) % DAY;
  // Equal times are a whole day: no one sets a block of nothing.
  return { start: s.start, length: length === 0 ? DAY : length };
}

/** Midnight at the start of `date`'s day, `offset` days on, on the wall clock. */
const dayOf = (date: Date, offset = 0) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + offset);
const atMinute = (day: Date, minute: number) => new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, minute);

/**
 * The block under way at `now`, or null: it started on a day in `days`, at `start`, and hasn't
 * reached its end. A block past midnight belongs to the day it started on.
 */
export function blockAt(s: Pick<Schedule, 'start' | 'end' | 'allDay' | 'days'>, now: Date): { start: Date; end: Date } | null {
  const { start, length } = span(s);
  for (const offset of [0, -1]) {
    const day = dayOf(now, offset);
    if (!s.days.includes(day.getDay())) continue;
    const from = atMinute(day, start);
    const to = atMinute(day, start + length);
    if (now >= from && now < to) return { start: from, end: to };
  }
  return null;
}

/** Is the schedule blocking at `now`? */
export const isBlocking = (s: Pick<Schedule, 'start' | 'end' | 'allDay' | 'days'>, now: Date) => blockAt(s, now) !== null;

/**
 * When the block under way ends, following blocks that run straight on (all day on Monday and
 * Tuesday is one block to Wednesday). Null when it isn't blocking.
 */
export function blockEnds(s: Pick<Schedule, 'start' | 'end' | 'allDay' | 'days'>, now: Date): Date | null {
  let block = blockAt(s, now);
  if (!block) return null;
  for (let i = 0; i < 8; i++) {
    const next = blockAt(s, block.end);
    if (!next || next.end <= block.end) break;
    block = next;
  }
  return block.end;
}

/** The next block's start after `now` (this week and next), or null with no days. */
export function nextBlock(s: Pick<Schedule, 'start' | 'end' | 'allDay' | 'days'>, now: Date): Date | null {
  const { start } = span(s);
  for (let offset = 0; offset <= 7; offset++) {
    const day = dayOf(now, offset);
    if (!s.days.includes(day.getDay())) continue;
    const at = atMinute(day, start);
    if (at > now) return at;
  }
  return null;
}

/**
 * Does `next` block everything `prev` blocks from `now` until `prev`'s block ends? Checked minute
 * by minute: a block is at most a few days long. Picks aren't compared here (`scheduleRemovalsAt`).
 */
function keepsBlock(prev: Schedule, next: Omit<Schedule, 'pending'> | null, now: Date): boolean {
  const ends = blockEnds(prev, now);
  if (!ends) return true;
  if (!next) return false;
  for (let t = now.getTime(); t < ends.getTime(); t += MIN) if (!isBlocking(next, new Date(t))) return false;
  return true;
}

/**
 * Applies an edit to the schedule `id` (`next` null deletes it): added, or saved over the one in
 * force at once unless that's blocking and the edit would lift any of the block under way, when
 * it waits for the block's end. A later edit replaces a waiting one; one that keeps the block
 * applies now and drops the waiting one, so nothing lands later than it was asked for.
 */
export function editSchedule(schedules: Schedule[], id: ScheduleId, next: Omit<Schedule, 'pending'> | null, now: Date): Schedule[] {
  const prev = schedules.find((s) => s.id === id);
  const rest = schedules.filter((s) => s.id !== id);
  if (!prev) return next ? [...rest, { ...next, id }] : rest;
  if (keepsBlock(prev, next, now)) return next ? [...rest, { ...next, id }] : rest;
  const { pending: _waiting, ...inForce } = prev;
  return [...rest, { ...inForce, pending: { schedule: next ? { ...next, id } : null, from: blockEnds(prev, now)!.getTime() } }];
}

/** Waiting edits whose block has ended are in force. */
export function settleSchedules(schedules: Schedule[], now: Date): Schedule[] {
  const out: Schedule[] = [];
  for (const s of schedules) {
    if (!s.pending || s.pending.from > now.getTime()) out.push(s);
    else if (s.pending.schedule) out.push({ ...s.pending.schedule, id: s.id });
  }
  return out;
}

/** The schedule as last set: a waiting edit, or the one in force. Null once deleting waits. */
export function asSet(s: Schedule): Omit<Schedule, 'pending'> | null {
  if (!s.pending) {
    const { pending: _none, ...rest } = s;
    return rest;
  }
  return s.pending.schedule;
}

/** When a removal of picks saved now lands: the end of the block under way, or now. */
export function scheduleRemovalsAt(s: Schedule, now: Date): Date {
  return blockEnds(s, now) ?? now;
}

/** iOS's daily interval for a schedule's activity. All day is the whole day, as a limit's is. */
export function scheduleInterval(s: Pick<Schedule, 'start' | 'end' | 'allDay'>): { start: number; end: number } {
  if (s.allDay) return { start: 0, end: DAY - 1 };
  // iOS refuses an interval of nothing: a whole day runs to a minute before it starts again.
  return s.start === s.end ? { start: s.start, end: (s.start + DAY - 1) % DAY } : { start: s.start, end: s.end };
}
