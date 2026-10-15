/// <reference types="node" />

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  asSet,
  blockAt,
  blockEnds,
  editSchedule,
  freeScheduleId,
  isBlocking,
  nextBlock,
  scheduleInterval,
  scheduleRemovalsAt,
  settleSchedules,
  type Schedule,
} from './schedules.ts';

/** Thursday 2026-10-01 at hh:mm, local time (`day` moves the date). */
const at = (hh: number, mm = 0, day = 1) => new Date(2026, 9, day, hh, mm);
const WEEKDAYS = [1, 2, 3, 4, 5];
const work: Schedule = { id: 'sched-0', name: 'Work', start: 9 * 60, end: 17 * 60, days: WEEKDAYS };
const late: Schedule = { id: 'sched-1', name: 'Late', start: 22 * 60, end: 2 * 60, days: [4] };

test('a 9 to 5 on weekdays blocks then, and not on Saturday', () => {
  assert.ok(isBlocking(work, at(9)));
  assert.ok(isBlocking(work, at(16, 59)));
  assert.ok(!isBlocking(work, at(17)));
  assert.ok(!isBlocking(work, at(8, 59)));
  assert.ok(!isBlocking(work, at(12, 0, 3)), 'Saturday the 3rd');
});

test('a block past midnight belongs to the day it starts', () => {
  // Thursday 22:00 to Friday 02:00, Thursdays only.
  assert.ok(isBlocking(late, at(23)));
  assert.ok(isBlocking(late, at(1, 30, 2)), 'Friday 01:30 is still Thursday night');
  assert.ok(!isBlocking(late, at(1, 30, 1)), 'Thursday 01:30 belongs to Wednesday, which is off');
  assert.deepEqual(blockAt(late, at(23)), { start: at(22), end: at(2, 0, 2) });
});

test('all day runs midnight to midnight, and back-to-back days are one block', () => {
  const weekdays: Schedule = { ...work, allDay: true };
  assert.ok(isBlocking(weekdays, at(0)));
  assert.ok(isBlocking(weekdays, at(23, 59)));
  // Thursday and Friday run on into Saturday's midnight.
  assert.equal(blockEnds(weekdays, at(10))?.getTime(), at(0, 0, 3).getTime());
  assert.deepEqual(scheduleInterval(weekdays), { start: 0, end: 1439 });
});

test('the next block skips days off', () => {
  // Friday 17:30: next is Monday 09:00.
  assert.equal(nextBlock(work, at(17, 30, 2))?.getTime(), at(9, 0, 5).getTime());
  assert.equal(nextBlock({ ...work, days: [] }, at(12)), null);
});

test('edits outside a block apply at once, stricter or looser', () => {
  const shorter = { ...work, end: 12 * 60 };
  assert.deepEqual(editSchedule([work], 'sched-0', shorter, at(18)), [shorter]);
  assert.deepEqual(editSchedule([work], 'sched-0', null, at(18)), []);
});

test('inside a block, a stricter edit applies at once', () => {
  const longer = { ...work, end: 19 * 60 };
  assert.deepEqual(editSchedule([work], 'sched-0', longer, at(10)), [longer]);
  // Moving the end later or adding days keeps every minute of the block under way.
  const everyDay = { ...work, days: [0, 1, 2, 3, 4, 5, 6] };
  assert.deepEqual(editSchedule([work], 'sched-0', everyDay, at(10)), [everyDay]);
});

test('inside a block, a looser edit waits for the block to end, then lands', () => {
  const shorter = { ...work, end: 12 * 60 };
  const saved = editSchedule([work], 'sched-0', shorter, at(10));
  assert.equal(saved[0].end, 17 * 60, 'still 5 pm today');
  assert.equal(saved[0].pending?.from, at(17).getTime());
  assert.deepEqual(asSet(saved[0]), shorter);
  assert.ok(isBlocking(saved[0], at(16)), 'the block under way holds');
  assert.deepEqual(settleSchedules(saved, at(16, 59)), saved);
  assert.deepEqual(settleSchedules(saved, at(17)), [shorter]);
  // Deleting waits the same way.
  const deleted = editSchedule([work], 'sched-0', null, at(10));
  assert.equal(asSet(deleted[0]), null);
  assert.deepEqual(settleSchedules(deleted, at(17)), []);
  // Taking a day off today counts as lifting the block too.
  const noThursday = { ...work, days: [1, 2, 3, 5] };
  assert.ok(editSchedule([work], 'sched-0', noThursday, at(10))[0].pending);
});

test('a later edit that keeps the block replaces a waiting one at once', () => {
  const waiting = editSchedule([work], 'sched-0', { ...work, end: 12 * 60 }, at(10));
  const back = editSchedule(waiting, 'sched-0', work, at(11));
  assert.deepEqual(back, [work]);
});

test('removed picks land at the block\'s end, or now outside one', () => {
  assert.equal(scheduleRemovalsAt(work, at(10)).getTime(), at(17).getTime());
  assert.equal(scheduleRemovalsAt(work, at(18)).getTime(), at(18).getTime());
});

test('slots: the first free id', () => {
  assert.equal(freeScheduleId([work]), 'sched-1');
  assert.equal(freeScheduleId([work, late]), 'sched-2');
});
