/// <reference types="node" />

/**
 * Daily limits when iOS lets us down: a missed midnight unblock, and a re-arm iOS refuses.
 * Against the shared fake library. Needs `--experimental-test-module-mocks`.
 */
import assert from 'node:assert/strict';
import { beforeEach, mock, test } from 'node:test';

import { fakeDeviceActivity } from './fake-device-activity.ts';

const fake = fakeDeviceActivity();
let refuse = false;
let thresholdDuringArm = false;
mock.module('react-native-device-activity', {
  namedExports: {
    ...fake.exports,
    startMonitoring: async (name: string) => {
      if (refuse) throw new Error('iOS refused');
      if (thresholdDuringArm) {
        fake.state.store[`locturne.limitReached.${name}`] = dateKey(new Date());
      }
      return fake.exports.startMonitoring(name);
    },
  },
});

const st = await import('./screen-time.ts');
const { dateKey } = await import('./lock-state.ts');

beforeEach(() => {
  fake.reset();
  refuse = false;
  thresholdDuringArm = false;
  fake.ids()['limit-0'] = 'limit-picks';
});

test("yesterday's used-up limit is lifted when the app opens (iOS missed midnight)", async () => {
  st.saveLimits([{ id: 'limit-0', minutes: 30 }]);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  fake.state.store['locturne.limitReached.limit-0'] = dateKey(yesterday);
  await st.settleLimitChanges();
  assert.ok(fake.shielded('unblockSelection').includes('limit-0'));
  assert.equal(fake.state.store['locturne.limitReached.limit-0'], undefined);
});

test("today's used-up limit stays asleep", async () => {
  st.saveLimits([{ id: 'limit-0', minutes: 30 }]);
  fake.state.store['locturne.limitReached.limit-0'] = dateKey(new Date());
  await st.settleLimitChanges();
  assert.ok(!fake.shielded('unblockSelection').includes('limit-0'));
  assert.ok(st.limitUsedUpToday('limit-0'));
});

test('setting the clock back is no way out: the real moment is after the false midnight', async () => {
  st.saveLimits([{ id: 'limit-0', minutes: 30 }]);
  // Used up at the real time, then the clock set back most of a day.
  const now = new Date();
  const later = new Date(now.getTime() + 20 * 3600_000);
  fake.state.store['locturne.limitReached.limit-0'] = dateKey(later);
  fake.state.store['locturne.limitReachedAt.limit-0'] = later.getTime();
  await st.settleLimitChanges(now);
  assert.ok(!fake.shielded('unblockSelection').includes('limit-0'));
  assert.ok(st.limitUsedUpToday('limit-0', now));
});

test('a flight that moves midnight past the moment it was used up lifts it, whatever the dates say', async () => {
  st.saveLimits([{ id: 'limit-0', minutes: 30 }]);
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  // Used up in Tokyo on what is "tomorrow" by its date, but before midnight here.
  fake.state.store['locturne.limitReached.limit-0'] = dateKey(new Date(midnight.getTime() + 36 * 3600_000));
  fake.state.store['locturne.limitReachedAt.limit-0'] = midnight.getTime() - 60_000;
  await st.settleLimitChanges(now);
  assert.ok(fake.shielded('unblockSelection').includes('limit-0'));
  assert.equal(fake.state.store['locturne.limitReached.limit-0'], undefined);
  assert.equal(fake.state.store['locturne.limitReachedAt.limit-0'], undefined);
});

test('a mark too soon after midnight for the allowance to fit is not today\'s (a flight west)', async () => {
  st.saveLimits([{ id: 'limit-0', minutes: 30 }]);
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  fake.state.store['locturne.limitReached.limit-0'] = dateKey(now);
  fake.state.store['locturne.limitReachedAt.limit-0'] = midnight.getTime() + 10 * 60_000;
  assert.equal(st.limitUsedUpToday('limit-0', new Date(midnight.getTime() + 12 * 3600_000)), false);
  fake.state.store['locturne.limitReachedAt.limit-0'] = midnight.getTime() + 40 * 60_000;
  assert.equal(st.limitUsedUpToday('limit-0', new Date(midnight.getTime() + 12 * 3600_000)), true);
});

test('a mark from a clock set days forward, then back, does not hold the limit for those days', async () => {
  st.saveLimits([{ id: 'limit-0', minutes: 30 }]);
  const now = new Date();
  const ahead = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3, 12);
  fake.state.store['locturne.limitReached.limit-0'] = dateKey(ahead);
  fake.state.store['locturne.limitReachedAt.limit-0'] = ahead.getTime();
  assert.equal(st.limitUsedUpToday('limit-0', now), false);
});

test('picks swapped at bedtime: a mark earned on the old picks goes with the re-arm', async () => {
  const now = new Date();
  now.setHours(12, 0, 0, 0);
  fake.ids()['limit-0'] = 'picks-tiktok'; // Instagram removed; an older build's extension swapped it in at bedtime
  st.saveLimits([{ id: 'limit-0', minutes: 30 }]);
  fake.state.store['locturne.limitArmedPicks.limit-0'] = 'picks-tiktok-instagram'; // what iOS counted
  const at = new Date(now);
  at.setHours(11); // 30 minutes of Instagram tripped the old monitoring
  fake.state.store['locturne.limitReached.limit-0'] = dateKey(at);
  fake.state.store['locturne.limitReachedAt.limit-0'] = at.getTime();
  await st.settleLimitChanges(now);
  assert.equal(fake.state.store['locturne.limitArmedPicks.limit-0'], 'picks-tiktok');
  assert.equal(st.limitUsedUpToday('limit-0', now), false);
  assert.ok(fake.shielded('unblockSelection').includes('limit-0'));
});

test('an emergency unlock leaves a limit\'s waiting removal to the app, which re-arms with it', () => {
  st.saveLimits([{ id: 'limit-0', minutes: 30 }]);
  fake.ids()['limit-0'] = 'picks-tiktok-instagram'; // the union iOS counts
  fake.ids()['limit-0-next'] = 'picks-tiktok';
  fake.state.store['locturne.pendingLists'] = { 'limit-0': { from: Date.now() - 60_000 } };
  st.pauseNightUntil(new Date(Date.now() + 12 * 3600_000));
  assert.equal(fake.ids()['limit-0'], 'picks-tiktok-instagram');
  assert.ok((fake.state.store['locturne.pendingLists'] as Record<string, unknown>)['limit-0']);
});

test('a looser limit iOS refuses stays pending, and the next open retries it', async () => {
  const pending = { minutes: 60, from: Date.now() - 1000 };
  st.saveLimits([{ id: 'limit-0', minutes: 30, pending }]);
  fake.state.store['locturne.limitReached.limit-0'] = dateKey(new Date());
  refuse = true;
  await assert.rejects(st.settleLimitChanges());
  assert.deepEqual(st.getLimits(), [{ id: 'limit-0', minutes: 30, pending }], 'still what iOS enforces');
  assert.ok(st.limitUsedUpToday('limit-0'), 'the stricter limit remains used up after failure');
  refuse = false;
  await st.settleLimitChanges();
  assert.deepEqual(st.getLimits(), [{ id: 'limit-0', minutes: 60 }]);
  assert.ok(fake.state.activities.includes('limit-0'));
});

test('a fresh limit whose past usage reaches its threshold during registration stays shielded', async () => {
  st.saveLimits([{ id: 'limit-0', minutes: 60 }]);
  thresholdDuringArm = true;
  await st.armLimit(st.getLimits()[0], { fresh: true });
  assert.ok(st.limitUsedUpToday('limit-0'));
  assert.ok(fake.shielded('blockSelection').includes('limit-0'), 'registration must preserve the new threshold shield');
});

test('a saved limit whose monitoring disappeared is recovered on open without clearing its reached mark', async () => {
  st.saveLimits([{ id: 'limit-0', minutes: 30 }]);
  await st.armLimit(st.getLimits()[0]);
  fake.state.activities = []; // iOS dropped monitoring, but the picks and settings survived.
  fake.state.store['locturne.limitReached.limit-0'] = dateKey(new Date());
  fake.state.calls.length = 0;
  await st.settleLimitChanges();
  assert.ok(fake.state.activities.includes('limit-0'));
  assert.ok(st.limitUsedUpToday('limit-0'));
  assert.ok(fake.shielded('blockSelection').includes('limit-0'));
});

test('a never-registered saved limit retries on open, then leaves healthy monitoring alone', async () => {
  st.saveLimits([{ id: 'limit-0', minutes: 30 }]);
  refuse = true;
  await assert.rejects(st.settleLimitChanges());
  refuse = false;
  await st.settleLimitChanges();
  assert.ok(fake.state.activities.includes('limit-0'));
  fake.state.calls.length = 0;
  await st.settleLimitChanges();
  assert.ok(!fake.state.calls.some(([call]) => call === 'startMonitoring'));
});

test('a stood-down limit is not recovered by the foreground settle', async () => {
  st.saveLimits([{ id: 'limit-0', minutes: 30 }]);
  st.standDown();
  await st.settleLimitChanges();
  assert.deepEqual(fake.state.activities, []);
});

test('a refused limit re-arm still restores overlapping standing shields after a list swap', async () => {
  fake.ids().always = 'always-picks';
  fake.ids()['always-next'] = 'new-always-picks';
  fake.state.store['locturne.pendingLists'] = { always: { from: Date.now() - 1000 } };
  st.saveLimits([{ id: 'limit-0', minutes: 30, pending: { minutes: 60, from: Date.now() - 1000 } }]);
  refuse = true;
  await assert.rejects(st.settleLimitChanges());
  assert.ok(fake.shielded('unblockSelection').includes('always'));
  assert.ok(fake.shielded('blockSelection').includes('always'), 'a failed await must not leave the swapped always list awake');
});
