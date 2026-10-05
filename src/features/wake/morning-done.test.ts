/// <reference types="node" />

/**
 * "This morning's done" (wake screen) and "Your morning is done" (exits) only after today's
 * morning really happened (`morningDoneToday`). Swept over schedules and times of day.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { currentMorning, dateKey, type LockSettings } from '../../lib/lock-state.ts';
import { morningDoneToday } from './morning-done.ts';

const settings = (bedtime: number, morningStart: number): LockSettings => ({
  bedtime,
  morningStart,
  stepGoal: 200,
  activeNights: [0, 1, 2, 3, 4, 5, 6],
  nightApps: [],
  alwaysApps: [],
});

const at = (day: number, h: number, m = 0) => new Date(2026, 9, day, h, m);
/** What `currentProof` returns once the morning `now` belongs to was woken. */
const proofFor = (now: Date, s: LockSettings) => ({ morningKey: currentMorning(now, s).key });

const H = 60;
const PAIRS: [string, number, number][] = [
  ['23:00 to 07:00', 23 * H, 7 * H],
  ['22:30 to 06:00', 22 * H + 30, 6 * H],
  ['after midnight, 01:00 to 09:00', 1 * H, 9 * H],
  ['midnight to 08:00', 0, 8 * H],
  ['night shift, 08:00 to 15:00', 8 * H, 15 * H],
  ['night shift, 07:00 to 14:00', 7 * H, 14 * H],
  ['no night, 07:00 to 07:00', 7 * H, 7 * H],
];

for (const [name, bed, wake] of PAIRS) {
  test(`sweep: ${name}`, () => {
    const s = settings(bed, wake);
    for (let minute = 0; minute < 24 * H; minute += 15) {
      const now = at(5, 0, minute);
      // Today's morning started at `wake` and no bedtime has come round since.
      const expected = minute >= wake && !(bed > wake && minute >= bed);
      const label = `${name} at ${Math.floor(minute / H)}:${String(minute % H).padStart(2, '0')}`;
      assert.equal(morningDoneToday(now, s, proofFor(now, s)), expected, label);
      // Nothing proved (an install's first day, a free morning): never done.
      assert.equal(morningDoneToday(now, s, null), false, `${label}, unproved`);
      // Only yesterday's morning proved: never today's.
      assert.equal(morningDoneToday(now, s, { morningKey: dateKey(at(4, 12)) }), false, `${label}, yesterday's proof`);
    }
  });
}

test('00:33 with a 01:00 bedtime: yesterday’s proved morning isn’t this one', () => {
  const s = settings(1 * H, 9 * H);
  const now = at(5, 0, 33);
  assert.equal(morningDoneToday(now, s, proofFor(now, s)), false);
  assert.equal(morningDoneToday(at(5, 10), s, { morningKey: dateKey(at(5, 10)) }), true);
});

test('07:03 on a night shift: the 15:00 morning is later today', () => {
  const s = settings(8 * H, 15 * H);
  const now = at(5, 7, 3);
  assert.equal(morningDoneToday(now, s, proofFor(now, s)), false);
  assert.equal(morningDoneToday(at(5, 16), s, { morningKey: dateKey(at(5, 16)) }), true);
});
