/// <reference types="node" />

/** The routine store's edit rules. Pure, apart from the fake App Group the module imports. */
import assert from 'node:assert/strict';
import { mock, test } from 'node:test';

import { fakeDeviceActivity } from './fake-device-activity.ts';

const fake = fakeDeviceActivity({ available: false });
mock.module('react-native-device-activity', { namedExports: fake.exports });

const { applyEdit, settleRoutine, DEFAULT_ROUTINE, nextNightOn, nightAt, saveRoutine } = await import('./routine.ts');
const { sharedSet } = await import('./screen-time.ts');

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

test('nextNightOn skips nights off, at that night’s bedtime, and is null with every night off', () => {
  // Thursday Oct 1 and Friday Oct 2 off (getDay 4 and 5).
  saveRoutine({ ...DEFAULT_ROUTINE, bedtime: 22 * 60, activeNights: [0, 1, 2, 3, 6] }, at(12));
  const next = nextNightOn(at(23), at(12))!;
  assert.equal(next.getDate(), 3);
  assert.equal(next.getHours(), 22);
  assert.equal(+nextNightOn(at(22, 0, 3), at(12))!, +at(22, 0, 3));
  saveRoutine({ ...DEFAULT_ROUTINE, activeNights: [] }, at(12));
  assert.equal(nextNightOn(at(23), at(12)), null);
});

test('nightAt works the night out under its own routine, even when bedtime crossed midnight', () => {
  // 00:30 bedtime with Wednesday's evening off. Thursday 23:00 (the old 23:00 routine's
  // bedtime) leads into Friday 00:30, which is Thursday's evening: on.
  saveRoutine({ ...DEFAULT_ROUTINE, bedtime: 30, activeNights: [0, 1, 2, 4, 5, 6] }, at(12));
  const night = nightAt(at(23), at(12));
  assert.equal(night.on, true);
  assert.equal(+night.start, +at(0, 30, 2));
  assert.equal(+nextNightOn(at(23), at(12))!, +at(0, 30, 2));
});

test('a waiting edit to an earlier bedtime governs its first night, which starts before `from`', () => {
  // Saved during Wednesday's night: 22:00 waits for Thursday's 23:00. Thursday's night is the
  // edit's, and it starts at 22:00 (the windows only tighten, so they're armed early).
  const earlier = { ...DEFAULT_ROUTINE, bedtime: 22 * 60 };
  sharedSet('locturne.routine', { active: DEFAULT_ROUTINE, pending: { routine: earlier, from: +at(23) } });
  const night = nightAt(at(22), at(23, 45, 0));
  assert.equal(night.routine.bedtime, 22 * 60);
  assert.equal(+nextNightOn(at(22), at(23, 45, 0))!, +at(22));
  // Wednesday's own night, before the edit's, stays on the old routine.
  assert.equal(nightAt(at(23, 0, 0), at(23, 45, 0)).routine.bedtime, 23 * 60);
});
