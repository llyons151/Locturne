/// <reference types="node" />

/** The first morning's day word (wake-day.ts). */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { wakeDayFor } from './wake-day.ts';

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
