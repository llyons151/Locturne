/// <reference types="node" />

/**
 * Developer → Set mornings and streak and the counted test wake-ups (`devSeedRun`,
 * `devWinMorning`, `devPutBackProofs`) against a fake Screen Time, with the default routine
 * (bedtime 23:00, morning 07:00). Needs `--experimental-test-module-mocks`.
 */
import assert from 'node:assert/strict';
import { beforeEach, mock, test } from 'node:test';

import { fakeDeviceActivity } from './fake-device-activity.ts';

const fake = fakeDeviceActivity();
mock.module('react-native-device-activity', { namedExports: fake.exports });

const { devPutBackProofs, devSeedRun, devWinMorning, getMorningsWon, getProofs, recordProof } = await import('./morning-proof.ts');
const { getStreak } = await import('./streak.ts');

const at = (month: number, day: number, hour: number, minute = 0) => new Date(2026, month - 1, day, hour, minute);
const TODAY = '2026-11-25';

beforeEach(() => fake.reset());

test('40 mornings with a 12 run: the run ends yesterday, one missed morning before it', () => {
  const now = at(11, 25, 6, 30);
  const { keys } = devSeedRun(40, 12, TODAY, true, now);
  assert.equal(keys.length, 40);
  assert.equal(keys[39], '2026-11-24');
  assert.equal(keys[28], '2026-11-13');
  // 11-12 missed, the rest before it.
  assert.equal(keys[27], '2026-11-11');
  assert.equal(getMorningsWon(), 40);
  assert.equal(getStreak(TODAY), 12);
});

test('a counted test: 6 mornings, streak 6, then the win is morning 7 and streak 7', () => {
  devSeedRun(6, 6, TODAY, false, at(11, 25, 15));
  devWinMorning(TODAY, 'dance', at(11, 25, 7, 4).getTime());
  assert.equal(getMorningsWon(), 7);
  assert.equal(getStreak(TODAY), 7);
});

test('streak 0: yesterday missed, and the test win starts it again at 1', () => {
  devSeedRun(9, 0, TODAY, false, at(11, 25, 15));
  assert.equal(getStreak(TODAY), 0);
  devWinMorning(TODAY, 'steps', at(11, 25, 7, 4).getTime());
  assert.equal(getMorningsWon(), 10);
  assert.equal(getStreak(TODAY), 1);
});

test("a counted test takes out today's real wake-up and puts it back when left unwon", () => {
  assert.equal(recordProof({ morningKey: TODAY, kind: 'steps', at: at(11, 25, 7, 5).getTime() }), true);
  const { held } = devSeedRun(3, 3, TODAY, false, at(11, 25, 15));
  assert.equal(held.length, 1);
  assert.equal(getMorningsWon(), 3);
  assert.ok(!getProofs().some((p) => p.morningKey === TODAY));
  devPutBackProofs(held);
  assert.equal(getMorningsWon(), 4);
  assert.equal(getStreak(TODAY), 4);
});

test('reset: none', () => {
  devSeedRun(5, 5, TODAY, true, at(11, 25, 15));
  devSeedRun(0, 0, TODAY, true, at(11, 25, 15));
  assert.equal(getMorningsWon(), 0);
  assert.equal(getStreak(TODAY), 0);
  assert.equal(getProofs().length, 0);
});
