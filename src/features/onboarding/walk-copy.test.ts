/// <reference types="node" />

/** The first morning's day word and the `walk` step's copy that follows it (walk-copy.ts). */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { wakeDayFor, walkCopy, type WakeDay } from './walk-copy.ts';

const H = 60;

test('the day word: tomorrow, this morning, later today', () => {
  // An evening install before a 23:00 bedtime.
  assert.equal(wakeDayFor({ bedtime: 23 * H, wake: 7 * H, now: 20 * H, lateNight: false }), 'Tomorrow');
  // Inside the night, small hours.
  assert.equal(wakeDayFor({ bedtime: 23 * H, wake: 7 * H, now: 2 * H, lateNight: true }), 'This morning');
  // 00:30 before a 01:00 bedtime, 09:00 wake: the whole night is still ahead today.
  assert.equal(wakeDayFor({ bedtime: 1 * H, wake: 9 * H, now: 30, lateNight: false }), 'This morning');
  // 07:00 before a night shift's 08:00 bedtime, 15:00 wake.
  assert.equal(wakeDayFor({ bedtime: 8 * H, wake: 15 * H, now: 7 * H, lateNight: false }), 'Later today');
  // After today's night-shift wake, it's tomorrow's.
  assert.equal(wakeDayFor({ bedtime: 8 * H, wake: 15 * H, now: 16 * H, lateNight: false }), 'Tomorrow');
});

test('walk copy names the day it’s for', () => {
  assert.deepEqual(walkCopy('downstairs', 'Tomorrow'), {
    intro: 'Tomorrow it’s a trip downstairs. Tonight, 20 steps anywhere will do.',
    done: 'That’s tomorrow morning, with real stairs instead of 20 steps. Then your apps wake up.',
  });
  assert.deepEqual(walkCopy('downstairs', 'Later today'), {
    intro: 'Later today it’s a trip downstairs. For now, 20 steps anywhere will do.',
    done: 'That’s later today, with real stairs instead of 20 steps. Then your apps wake up.',
  });
  assert.equal(walkCopy('steps', 'This morning').intro, 'This morning it’s 200 steps. For now, 20 will do. Walk around the room.');
  assert.equal(walkCopy('steps', 'This morning').done, 'Same this morning, just 200 instead of 20. Then your apps wake up.');
  assert.equal(walkCopy('scan', 'Later today').done, 'That’s later today: up, a short walk, then your apps wake up.');
});

test('no "tomorrow" or "tonight" when the first morning is today', () => {
  for (const day of ['This morning', 'Later today'] as WakeDay[]) {
    for (const method of ['downstairs', 'steps', 'scan'] as const) {
      const { intro, done } = walkCopy(method, day);
      assert.doesNotMatch(`${intro} ${done}`, /tomorrow|tonight/i, `${method}, ${day}`);
    }
  }
});
