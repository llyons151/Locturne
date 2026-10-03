/// <reference types="node" />

/**
 * Pass accounting. Runs with Screen Time unavailable, so the App Group falls back to memory
 * and the default routine applies (bedtime 23:00, morning 07:00, every night).
 * Needs `--experimental-test-module-mocks` (set in the npm test script).
 */
import assert from 'node:assert/strict';
import { beforeEach, mock, test } from 'node:test';

import { fakeDeviceActivity } from './fake-device-activity.ts';

const fake = fakeDeviceActivity({ available: false });
mock.module('react-native-device-activity', { namedExports: fake.exports });

const passes = await import('./passes.ts');
const { currentMorning } = await import('./lock-state.ts');
const { getProof } = await import('./morning-proof.ts');
const { sharedRemove } = await import('./screen-time.ts');
const { toLockSettings, DEFAULT_ROUTINE } = await import('./routine.ts');

const { PASSES_PER_MONTH, passesLeft, passRefusal, withSpent, spendPass, getPassesLeft } = passes;

/** Local time: the tests run in several time zones (`npm run test:tz`). */
const at = (month: number, day: number, hour: number, minute = 0) => new Date(2026, month - 1, day, hour, minute);

beforeEach(() => {
  fake.arm();
  sharedRemove('locturne.passes');
  sharedRemove('locturne.morningProofs');
});

test('a month starts with the full allowance', () => {
  assert.equal(passesLeft(undefined, '2026-10-05'), PASSES_PER_MONTH);
});

test('only passes from the same month count', () => {
  let ledger = withSpent(undefined, '2026-09-30', 1);
  ledger = withSpent(ledger, '2026-10-01', 2);
  assert.equal(passesLeft(ledger, '2026-10-20'), PASSES_PER_MONTH - 1);
  assert.equal(passesLeft(ledger, '2026-11-01'), PASSES_PER_MONTH);
  // Same month number, different year: a fresh allowance.
  assert.equal(passesLeft(withSpent(undefined, '2025-10-03', 1), '2026-10-03'), PASSES_PER_MONTH);
});

test('never below zero', () => {
  let ledger = withSpent(undefined, '2026-10-01', 1);
  for (let d = 2; d <= 9; d++) ledger = withSpent(ledger, `2026-10-0${d}`, d);
  assert.equal(passesLeft(ledger, '2026-10-10'), 0);
});

test('refusals: bedtime wins, one per morning, then none left', () => {
  assert.equal(passRefusal(undefined, 'night', '2026-10-05'), 'notMorning');
  assert.equal(passRefusal(undefined, 'day', '2026-10-05'), 'notMorning');
  assert.equal(passRefusal(undefined, 'off', '2026-10-05'), 'notMorning');
  assert.equal(passRefusal(undefined, 'morning', '2026-10-05'), null);
  const once = withSpent(undefined, '2026-10-05', 1);
  assert.equal(passRefusal(once, 'morning', '2026-10-05'), 'alreadyUsed');
  let full = once;
  for (let d = 6; d < 6 + PASSES_PER_MONTH; d++) full = withSpent(full, `2026-10-${String(d).padStart(2, '0')}`, d);
  assert.equal(passRefusal(full, 'morning', '2026-10-20'), 'noneLeft');
});

test('a late bedtime: 00:30 on the 1st still spends last month', () => {
  const settings = { ...toLockSettings(DEFAULT_ROUTINE), bedtime: 60 };
  const key = currentMorning(at(11, 1, 0, 30), settings).key;
  assert.equal(key, '2026-10-31');
  assert.equal(passes.monthOf(key), '2026-10');
});

test('23:30 on the last day belongs to the next month (tonight leads into the 1st)', () => {
  const key = currentMorning(at(10, 31, 23, 30), toLockSettings(DEFAULT_ROUTINE)).key;
  assert.equal(passes.monthOf(key), '2026-11');
});

test('spendPass: only in the morning, records a pass proof, once per morning', () => {
  assert.equal(spendPass(at(10, 5, 3)), 'notMorning', 'at 03:00 bedtime wins');
  assert.equal(spendPass(at(10, 5, 7, 30)), null);
  assert.equal(getProof('2026-10-05')?.kind, 'pass');
  assert.equal(getPassesLeft(at(10, 5, 12)), PASSES_PER_MONTH - 1);
  // The morning is now unlocked, so there's nothing left for a pass to do.
  assert.equal(spendPass(at(10, 5, 8)), 'alreadyUsed');
});

test('spendPass: the allowance runs out, then comes back on the 1st', () => {
  for (let d = 1; d <= PASSES_PER_MONTH; d++) assert.equal(spendPass(at(10, 27 + d, 8)), null);
  assert.equal(spendPass(at(10, 31, 8)), 'noneLeft');
  assert.equal(getPassesLeft(at(10, 31, 12)), 0);
  assert.equal(spendPass(at(11, 1, 8)), null);
  assert.equal(getPassesLeft(at(11, 1, 12)), PASSES_PER_MONTH - 1);
});
