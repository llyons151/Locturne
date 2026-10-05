/// <reference types="node" />

/**
 * The emergency unlock against a fake Screen Time, with the default routine (bedtime 23:00,
 * morning 07:00, every night). Needs `--experimental-test-module-mocks`.
 */
import assert from 'node:assert/strict';
import { beforeEach, mock, test } from 'node:test';

import { fakeDeviceActivity } from './fake-device-activity.ts';

const fake = fakeDeviceActivity();
mock.module('react-native-device-activity', { namedExports: fake.exports });

const { planEmergency, pausedUntil, withUse, emergencyUnlock, getEmergencyLog, getNightPause, heldPhase, previewEmergency } = await import(
  './emergency.ts'
);
const { getProof, recordProof } = await import('./morning-proof.ts');
const { readLock } = await import('./lock-controller.ts');
const rt = await import('./routine.ts');
const st = await import('./screen-time.ts');

const at = (month: number, day: number, hour: number, minute = 0) => new Date(2026, month - 1, day, hour, minute);
const BEDTIME = at(10, 6, 23);

beforeEach(() => {
  fake.reset();
  fake.arm();
  fake.ids().night = 'night-picks';
  fake.ids().always = 'always-picks';
});

/** This morning was already proven, so it's daytime until bedtime. */
const awake = () => recordProof({ morningKey: '2026-10-06', kind: 'steps', at: at(10, 6, 7, 30).getTime() });

/** An earlier bedtime's windows armed at once, as `armRoutine` does (it only tightens). */
const armEarlier = () => {
  fake.state.store['locturne.armedNight'] = { ...fake.armedNight(), bedtime: 21 * 60 + 30 };
};

/** Bedtime has run: the monitor extension shielded the night list and marked it held. */
function asleep() {
  st.sleepApps('night');
  fake.state.calls.length = 0;
}

test('plan: night pauses tonight and unlocks the morning; morning unlocks; day lifts only Block now', () => {
  assert.deepEqual(planEmergency('night', false, BEDTIME), {
    pauseNight: true,
    unlockMorning: true,
    endBlockNow: false,
    resumesAt: BEDTIME.getTime(),
  });
  assert.deepEqual(planEmergency('morning', true, BEDTIME), {
    pauseNight: false,
    unlockMorning: true,
    endBlockNow: true,
    resumesAt: null,
  });
  assert.deepEqual(planEmergency('day', true, BEDTIME), {
    pauseNight: false,
    unlockMorning: false,
    endBlockNow: true,
    resumesAt: null,
  });
  assert.equal(planEmergency('day', false, BEDTIME), null);
  assert.equal(planEmergency('off', false, BEDTIME), null);
});

test('pausedUntil: only the latest night pause, and only until it ends', () => {
  const use = { ...planEmergency('night', false, BEDTIME)!, at: 0, phase: 'night' as const, morningKey: '2026-10-06' };
  const log = withUse([], use);
  assert.deepEqual(pausedUntil(log, at(10, 6, 3)), BEDTIME);
  assert.equal(pausedUntil(log, at(10, 6, 23, 1)), null);
  assert.equal(pausedUntil([], at(10, 6, 3)), null);
});

test('at 03:00: the bedtime apps wake for the rest of tonight, the always list stays', () => {
  asleep();
  const use = emergencyUnlock(at(10, 6, 3));
  assert.ok(use);
  assert.equal(use.phase, 'night');
  assert.equal(use.resumesAt, BEDTIME.getTime());

  // The picks are parked until bedtime; the live list is empty so tonight's windows shield nothing.
  assert.equal(fake.ids().night, undefined);
  assert.equal(fake.ids()['night-next'], 'night-picks');
  assert.equal(st.listChangeStarts('night')?.getTime(), BEDTIME.getTime());
  assert.equal(st.isNightHeld(), false);
  assert.ok(fake.shielded('unblockSelection').includes('night'));
  assert.ok(!fake.shielded('unblockSelection').includes('always'), 'never lifts the always list');
  assert.ok(fake.shielded('blockSelection').includes('always'));

  // This coming morning counts as unlocked, and the use is logged.
  assert.equal(getProof('2026-10-06')?.kind, 'emergency');
  assert.equal(getEmergencyLog().length, 1);
  assert.deepEqual(getNightPause(at(10, 6, 12)), BEDTIME);
});

test('the next bedtime brings the picks back with nobody opening the app', () => {
  asleep();
  emergencyUnlock(at(10, 6, 3));
  // A window start before bedtime (the extension runs the same settle rule) changes nothing.
  assert.deepEqual(st.settleListChanges(at(10, 6, 4)), []);
  assert.equal(fake.ids().night, undefined);
  // The first window at bedtime swaps the picks back before it shields them.
  assert.deepEqual(st.settleListChanges(BEDTIME), ['night']);
  assert.equal(fake.ids().night, 'night-picks');
  assert.equal(fake.ids()['night-next'], undefined);
  assert.equal(st.listChangeStarts('night'), null);
});

test('a waiting edit to the bedtime list keeps its draft', () => {
  fake.ids().night = 'old-and-new';
  fake.ids()['night-next'] = 'new-picks';
  fake.state.store['locturne.pendingLists'] = { night: { from: BEDTIME.getTime() } };
  asleep();
  emergencyUnlock(at(10, 6, 3));
  assert.equal(fake.ids()['night-next'], 'new-picks');
  assert.equal(fake.ids().night, undefined);
  assert.equal(st.listChangeStarts('night')?.getTime(), BEDTIME.getTime());
});

test('a waiting edit due inside the paused night never ends the pause early', () => {
  // Found by the simulation (lock-controller.sim.test.ts, seed 714): an edit made with nothing
  // armed starts at midnight, and a pause from 23:30 took that start, re-shielding at 00:00.
  fake.ids().night = 'old-and-new';
  fake.ids()['night-next'] = 'new-picks';
  const midnight = at(10, 7, 0);
  fake.state.store['locturne.pendingLists'] = { night: { from: midnight.getTime() } };
  asleep();
  emergencyUnlock(at(10, 6, 23, 30));
  assert.equal(st.listChangeStarts('night')?.getTime(), at(10, 7, 23).getTime(), 'back at the next bedtime');
  assert.deepEqual(st.settleListChanges(at(10, 7, 0, 30)), [], 'nothing comes back in the paused night');
  assert.equal(fake.ids().night, undefined);
  // Nor does a picker edit made in the paused night with an earlier start.
  st.beginListEdit('night');
  st.finishListEdit('night', at(10, 7, 1));
  assert.equal(st.listChangeStarts('night')?.getTime(), at(10, 7, 23).getTime());
});

test('in the morning: records the proof and wakes the bedtime apps', () => {
  asleep();
  const use = emergencyUnlock(at(10, 6, 8));
  assert.equal(use?.phase, 'morning');
  assert.equal(use?.pauseNight, false);
  assert.equal(getProof('2026-10-06')?.kind, 'emergency');
  assert.equal(fake.ids().night, 'night-picks', 'nothing parked in the morning');
  assert.equal(st.isNightHeld(), false);
  assert.ok(fake.shielded('unblockSelection').includes('night'));
  assert.equal(getNightPause(at(10, 6, 9)), null);
});

test('in the day: ends a running Block now session, and nothing else', async () => {
  awake();
  fake.ids().block = 'nap-picks';
  const realNow = Date.now;
  Date.now = () => at(10, 6, 14).getTime();
  try {
    await st.startNap('block', 30);
    fake.state.calls.length = 0;
    const use = emergencyUnlock(at(10, 6, 14, 5));
    assert.equal(use?.endBlockNow, true);
    assert.equal(use?.unlockMorning, false);
    assert.equal(st.getNap(), null);
    assert.ok(fake.shielded('unblockSelection').includes('block'));
    assert.ok(!fake.shielded('unblockSelection').includes('always'));
  } finally {
    Date.now = realNow;
  }
});

test('in the day with nothing asleep: nothing to lift, nothing logged', () => {
  awake();
  assert.equal(emergencyUnlock(at(10, 6, 14)), null);
  assert.equal(getEmergencyLog().length, 0);
});

test('in an earlier bedtime\'s first night: pauses until its next bedtime and unlocks its morning (#137)', () => {
  // Saved in the day with the night armed: 21:30 waits for tonight's 23:00, but its windows
  // are armed at once (it only tightens), so from 21:30 the night is the edit's.
  rt.saveRoutine(rt.DEFAULT_ROUTINE, at(10, 1, 12));
  awake();
  rt.saveRoutine({ ...rt.DEFAULT_ROUTINE, bedtime: 21 * 60 + 30 }, at(10, 6, 14));
  armEarlier();
  asleep();
  assert.equal(readLock(at(10, 6, 21, 45)).phase, 'night');
  const use = emergencyUnlock(at(10, 6, 21, 45));
  assert.ok(use?.pauseNight, 'the apps the early window put to sleep can be woken');
  assert.equal(use.morningKey, '2026-10-07');
  assert.equal(use.resumesAt, at(10, 7, 21, 30).getTime(), 'back at the edit\'s next bedtime, not 23:00 tonight');
  assert.equal(st.isNightHeld(), false);
  assert.equal(getProof('2026-10-07')?.kind, 'emergency');
  assert.equal(readLock(at(10, 7, 7, 30)).phase, 'day', 'the morning it leads into counts as unlocked');
});

/*
 * The phase comes from the clock: after bedtime it says night whatever is armed. The unlock
 * goes by what's really asleep, so a night with no lock, or one already paused, is daytime.
 */

test('stood down at 23:30: nothing to lift, no proof, the bedtime picks stay put', () => {
  st.standDown();
  const now = at(10, 6, 23, 30);
  assert.equal(readLock(now).phase, 'night', 'the clock says night');
  assert.equal(previewEmergency(now), null, 'the exits screen says "Nothing asleep"');
  assert.equal(emergencyUnlock(now), null);
  assert.equal(getProof('2026-10-07'), null, 'no proof, so no morning_unlocked for a non-subscriber');
  assert.equal(getEmergencyLog().length, 0);
  // Not parked: resubscribing tonight arms with the bedtime picks and locks the morning.
  assert.equal(fake.ids().night, 'night-picks');
  assert.equal(fake.ids()['night-next'], undefined);
  assert.equal(st.listChangeStarts('night'), null);
});

test('never armed (never bought, or arming failed) at 23:30: nothing to lift', () => {
  fake.reset();
  fake.ids().night = 'night-picks';
  assert.equal(st.getArmedNight(), null);
  assert.equal(previewEmergency(at(10, 6, 23, 30)), null);
  assert.equal(emergencyUnlock(at(10, 6, 23, 30)), null);
  assert.equal(getEmergencyLog().length, 0);
});

test('an unheld night with Block now running: ends it, nothing else', async () => {
  fake.reset();
  fake.ids().night = 'night-picks';
  fake.ids().block = 'nap-picks';
  const realNow = Date.now;
  Date.now = () => at(10, 6, 23, 30).getTime();
  try {
    await st.startNap('block', 30);
    const plan = previewEmergency(at(10, 6, 23, 35));
    assert.deepEqual(plan, { pauseNight: false, unlockMorning: false, endBlockNow: true, resumesAt: null });
  } finally {
    Date.now = realNow;
  }
});

test('a second emergency in a night already paused: nothing to lift, logged once', () => {
  asleep();
  assert.ok(emergencyUnlock(at(10, 6, 1))?.pauseNight);
  assert.equal(heldPhase('night', at(10, 6, 2)), 'day');
  assert.equal(previewEmergency(at(10, 6, 2)), null);
  assert.equal(emergencyUnlock(at(10, 6, 2)), null);
  assert.equal(getEmergencyLog().length, 1);
  // The next night is held again.
  assert.equal(heldPhase('night', at(10, 6, 23, 30)), 'night');
});

test('a second emergency in an earlier bedtime\'s paused first night (#137): nothing to lift', () => {
  rt.saveRoutine(rt.DEFAULT_ROUTINE, at(10, 1, 12));
  awake();
  rt.saveRoutine({ ...rt.DEFAULT_ROUTINE, bedtime: 21 * 60 + 30 }, at(10, 6, 14));
  armEarlier();
  asleep();
  assert.ok(emergencyUnlock(at(10, 6, 21, 45))?.pauseNight);
  assert.equal(previewEmergency(at(10, 6, 23, 30)), null, 'still paused past the old 23:00 bedtime');
  assert.equal(getEmergencyLog().length, 1);
});

test('pauseNightUntil while stood down parks nothing', () => {
  st.standDown();
  st.pauseNightUntil(at(10, 7, 23), at(10, 6, 23, 30));
  assert.equal(fake.ids().night, 'night-picks');
  assert.equal(st.listChangeStarts('night'), null);
});
