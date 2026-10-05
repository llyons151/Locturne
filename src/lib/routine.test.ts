/// <reference types="node" />

/** The routine store's edit rules. Pure, apart from the fake App Group the module imports. */
import assert from 'node:assert/strict';
import { mock, test } from 'node:test';

import { fakeDeviceActivity } from './fake-device-activity.ts';

const fake = fakeDeviceActivity({ available: false });
mock.module('react-native-device-activity', { namedExports: fake.exports });

const { applyEdit, asArmed, settleRoutine, DEFAULT_ROUTINE, nextNightOn, nightAt, nightRanUnder, saveRoutine } = await import('./routine.ts');
const { sharedSet } = await import('./screen-time.ts');

/** Thursday 2026-10-01 at hh:mm, local time. Default routine: 23:00 to 07:00. */
const at = (hh: number, mm = 0, day = 1) => new Date(2026, 9, day, hh, mm);
const later = { ...DEFAULT_ROUTINE, bedtime: 23 * 60 + 30 };

test('the first save applies at once', () => {
  assert.deepEqual(applyEdit(undefined, later, at(15)), { active: later, since: at(15).getTime() });
});

test('with a night armed, an edit waits for the next bedtime', () => {
  const stored = applyEdit({ active: DEFAULT_ROUTINE }, later, at(15), true);
  assert.deepEqual(stored.active, DEFAULT_ROUTINE);
  assert.equal(stored.pending?.from, at(23).getTime());
  assert.deepEqual(settleRoutine(stored, at(23)), { active: later, since: at(23).getTime(), prior: DEFAULT_ROUTINE });
});

test('with nothing armed, an edit applies at once and drops a waiting one', () => {
  const waiting = { active: DEFAULT_ROUTINE, pending: { routine: later, from: at(23).getTime() } };
  const earlier = { ...DEFAULT_ROUTINE, bedtime: 22 * 60 };
  assert.deepEqual(applyEdit(waiting, earlier, at(15), false), { active: earlier, since: at(15).getTime(), prior: DEFAULT_ROUTINE });
});

test('inside a waiting edit\'s early first night, that edit is in force and the new one waits for its next bedtime', () => {
  // 21:30 saved in the day waits for 23:00 but already holds tonight from 21:30 (`early`).
  const earlier = { ...DEFAULT_ROUTINE, bedtime: 21 * 60 + 30 };
  const waiting = { active: DEFAULT_ROUTINE, pending: { routine: earlier, from: at(23).getTime() } };
  const stored = applyEdit(waiting, later, at(21, 40), true, true);
  assert.deepEqual(stored.active, earlier);
  assert.equal(stored.since, at(21, 40).getTime(), 'in force from the promotion, inside its night');
  assert.deepEqual(stored.prior, DEFAULT_ROUTINE);
  assert.deepEqual(stored.pending, { routine: later, from: at(21, 30, 2).getTime() });
  // Not inside it: the new edit replaces the waiting one, from the routine in force's bedtime.
  assert.deepEqual(applyEdit(waiting, later, at(15), true, false), { active: DEFAULT_ROUTINE, pending: { routine: later, from: at(23).getTime() } });
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
  sharedSet('locturne.armedNight', { ...fake.armedNight(), bedtime: 22 * 60 });
  const night = nightAt(at(22), at(23, 45, 0));
  assert.equal(night.routine.bedtime, 22 * 60);
  assert.equal(+nextNightOn(at(22), at(23, 45, 0))!, +at(22));
  // Wednesday's own night, before the edit's, stays on the old routine.
  assert.equal(nightAt(at(23, 0, 0), at(23, 45, 0)).routine.bedtime, 23 * 60);
});

test('nightAt: an earlier bedtime whose arming waits (iOS still has 23:00) starts at the edit, not early', () => {
  // At 07:05, after the walk, bedtime moves 23:00 to 22:00 and the morning 07:00 to 08:00.
  // Arming waits for 08:00 (a 07:15 window would shield a phantom night: wake/arming.ts), so
  // with the app closed iOS sleeps the apps at 23:00, and Home must say so.
  const edit = { ...DEFAULT_ROUTINE, bedtime: 22 * 60, morningStart: 8 * 60 };
  sharedSet('locturne.routine', { active: DEFAULT_ROUTINE, pending: { routine: edit, from: +at(23) } });
  sharedSet('locturne.armedNight', fake.armedNight());
  assert.equal(+nightAt(at(23), at(7, 5)).start, +at(23));
  // Once a sync after 08:00 arms the edit's windows, iOS holds 22:00.
  sharedSet('locturne.armedNight', { ...fake.armedNight(), bedtime: 22 * 60, morningStart: 8 * 60 });
  assert.equal(+nightAt(at(23), at(8, 30)).start, +at(22));
});

test('nightAt: an earlier bedtime on an evening off in force starts at the edit, not early', () => {
  // Thursday evening (4) off in force; the edit turns it on at 21:30 from Thursday's 23:00.
  const inForce = { ...DEFAULT_ROUTINE, activeNights: [0, 1, 2, 3, 5, 6] };
  const edit = { ...DEFAULT_ROUTINE, bedtime: 21 * 60 + 30 };
  sharedSet('locturne.routine', { active: inForce, pending: { routine: edit, from: +at(23) } });
  assert.equal(+nightAt(at(23), at(14)).start, +at(23));
});

test('nightRanUnder: which routine the night into a morning really ran under', () => {
  const shift = { ...DEFAULT_ROUTINE, bedtime: 8 * 60, morningStart: 16 * 60 };
  // 23:00 to 07:00 took over at 08:00 on the 1st from a night shift: the 1st's 07:00 morning
  // had no night under either (the shift's into the 1st starts at 08:00, when it no longer ran).
  const fromShift = { since: at(8).getTime(), prior: shift };
  assert.equal(nightRanUnder({ key: '2026-10-01', start: at(7) }, fromShift), 'none');
  assert.equal(nightRanUnder({ key: '2026-10-02', start: at(7, 0, 2) }, fromShift), 'routine');
  // A later bedtime that took over at 23:00: the morning the old night led into stays its.
  const later = { since: at(23).getTime(), prior: DEFAULT_ROUTINE };
  assert.equal(nightRanUnder({ key: '2026-10-01', start: at(9) }, later), 'prior');
  // ...unless that evening was off under the old routine.
  assert.equal(nightRanUnder({ key: '2026-10-01', start: at(9) }, { ...later, prior: { ...DEFAULT_ROUTINE, activeNights: [0, 1, 2, 4, 5, 6] } }), 'none');
  assert.equal(nightRanUnder({ key: '2026-10-01', start: at(9) }, { since: at(23).getTime(), prior: null }), 'none');
  assert.equal(nightRanUnder({ key: '2026-10-01', start: at(9) }, null), 'unknown');
});

test('asArmed: a routine runs from the armed bedtime while older windows overlap its night', () => {
  const edited = { ...DEFAULT_ROUTINE, bedtime: 0, morningStart: 9 * 60 };
  assert.deepEqual(asArmed(edited, { bedtime: 23 * 60, morningStart: 7 * 60 }), { ...edited, bedtime: 23 * 60 });
  assert.equal(asArmed(edited, { bedtime: 0, morningStart: 9 * 60 }), edited);
  assert.equal(asArmed(edited, null), edited);
});
