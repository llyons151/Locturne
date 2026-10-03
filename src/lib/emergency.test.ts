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

const { planEmergency, pausedUntil, withUse, emergencyUnlock, getEmergencyLog, getNightPause } = await import(
  './emergency.ts'
);
const { getProof, recordProof } = await import('./morning-proof.ts');
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
