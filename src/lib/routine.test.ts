/// <reference types="node" />

/** The routine store's edit rules. Pure, apart from the fake App Group the module imports. */
import assert from 'node:assert/strict';
import { mock, test } from 'node:test';

import { fakeDeviceActivity } from './fake-device-activity.ts';

const fake = fakeDeviceActivity({ available: false });
mock.module('react-native-device-activity', { namedExports: fake.exports });

const { applyEdit, settleRoutine, DEFAULT_ROUTINE } = await import('./routine.ts');

/** Thursday 2026-10-01 at hh:mm, local time. Default routine: 23:00 to 07:00. */
const at = (hh: number, mm = 0, day = 1) => new Date(2026, 9, day, hh, mm);
const later = { ...DEFAULT_ROUTINE, bedtime: 23 * 60 + 30 };

test('the first save applies at once', () => {
  assert.deepEqual(applyEdit(undefined, later, at(15)), { active: later });
});

test('with a night armed, an edit waits for the next bedtime', () => {
  const stored = applyEdit({ active: DEFAULT_ROUTINE }, later, at(15), true);
  assert.deepEqual(stored.active, DEFAULT_ROUTINE);
  assert.equal(stored.pending?.from, at(23).getTime());
  assert.deepEqual(settleRoutine(stored, at(23)).active, later);
});

test('with nothing armed, an edit applies at once and drops a waiting one', () => {
  const waiting = { active: DEFAULT_ROUTINE, pending: { routine: later, from: at(23).getTime() } };
  const earlier = { ...DEFAULT_ROUTINE, bedtime: 22 * 60 };
  assert.deepEqual(applyEdit(waiting, earlier, at(15), false), { active: earlier });
});
