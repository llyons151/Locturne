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
mock.module('react-native-device-activity', {
  namedExports: {
    ...fake.exports,
    startMonitoring: async (name: string) => {
      if (refuse) throw new Error('iOS refused');
      return fake.exports.startMonitoring(name);
    },
  },
});

const st = await import('./screen-time.ts');
const { dateKey } = await import('./lock-state.ts');

beforeEach(() => {
  fake.reset();
  refuse = false;
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

test('a looser limit iOS refuses stays pending, and the next open retries it', async () => {
  const pending = { minutes: 60, from: Date.now() - 1000 };
  st.saveLimits([{ id: 'limit-0', minutes: 30, pending }]);
  refuse = true;
  await assert.rejects(st.settleLimitChanges());
  assert.deepEqual(st.getLimits(), [{ id: 'limit-0', minutes: 30, pending }], 'still what iOS enforces');
  refuse = false;
  await st.settleLimitChanges();
  assert.deepEqual(st.getLimits(), [{ id: 'limit-0', minutes: 60 }]);
  assert.ok(fake.state.activities.includes('limit-0'));
});
