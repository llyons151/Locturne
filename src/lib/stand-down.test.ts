/// <reference types="node" />

/**
 * No subscription, nothing blocks: `standDown` / `standUp` in screen-time.ts, and the
 * Block now guard against the autumn clock change. Against the shared fake library.
 * Needs `--experimental-test-module-mocks` (set in the npm test script).
 */
import assert from 'node:assert/strict';
import { beforeEach, mock, test } from 'node:test';

import { fakeDeviceActivity } from './fake-device-activity.ts';

const fake = fakeDeviceActivity();
/** While set, iOS refuses to start monitoring (access turned off, say). */
let refuse = false;
const start = fake.exports.startMonitoring;
fake.exports.startMonitoring = async (...args: Parameters<typeof start>) => {
  if (refuse) throw new Error('unauthorized');
  return start(...args);
};
mock.module('react-native-device-activity', { namedExports: fake.exports });

const st = await import('./screen-time.ts');

beforeEach(() => {
  fake.reset();
  fake.ids().night = 'night-picks';
  fake.ids().always = 'always-picks';
  fake.ids()['limit-0'] = 'limit-picks';
  fake.ids().block = 'block-picks';
});

test('standing down stops every window and limit, wakes every list, and keeps the settings', async () => {
  st.saveLimits([{ id: 'limit-0', minutes: 30 }]);
  await st.armLimit({ id: 'limit-0', minutes: 30 });
  await st.startNap('block', 30);
  fake.exports.startMonitoring('night-0');
  st.sleepApps('night');
  fake.state.calls.length = 0;

  st.standDown();
  assert.ok(st.isStoodDown());
  assert.deepEqual(fake.state.activities, []);
  for (const id of ['always', 'night', 'limit-0', 'block']) assert.ok(fake.shielded('unblockSelection').includes(id), id);
  assert.deepEqual(fake.shielded('blockSelection'), [], 'nothing re-shielded on the way out');
  assert.equal(st.isNightHeld(), false);
  assert.deepEqual(st.getLimits(), [{ id: 'limit-0', minutes: 30 }]);
});

test('while stood down, nothing shields and Block now refuses', async () => {
  st.standDown();
  fake.state.calls.length = 0;
  st.reapplyStandingBlocks();
  await st.armLimit({ id: 'limit-0', minutes: 30 });
  assert.deepEqual(fake.shielded('blockSelection'), []);
  assert.deepEqual(fake.state.activities, []);
  await assert.rejects(st.startNap('block', 30));
});

test('standing up re-arms the limits and re-shields the always list', async () => {
  st.saveLimits([{ id: 'limit-0', minutes: 30 }]);
  st.standDown();
  fake.state.calls.length = 0;
  await st.standUp();
  assert.equal(st.isStoodDown(), false);
  assert.ok(fake.state.activities.includes('limit-0'));
  assert.ok(fake.shielded('blockSelection').includes('always'));
});

test('a stand-up whose limits iOS refused is retried by the next one, though no longer stood down', async () => {
  st.saveLimits([{ id: 'limit-0', minutes: 30 }]);
  st.standDown();
  refuse = true;
  await assert.rejects(st.standUp());
  refuse = false;
  assert.equal(st.isStoodDown(), false);
  assert.ok(!fake.state.activities.includes('limit-0'));
  await st.standUp(); // the next paid settle
  assert.ok(fake.state.activities.includes('limit-0'));
});

test('a Block now across the autumn clock change is refused, not handed to iOS as a day', { skip: process.env.TZ !== 'America/New_York' }, async () => {
  // 2026-11-01 01:50 EDT; 15 real minutes later the clock reads 01:05 EST.
  mock.timers.enable({ apis: ['Date'], now: new Date('2026-11-01T05:50:00Z') });
  try {
    await assert.rejects(st.startNap('block', 15), st.NapClockChangeError);
  } finally {
    mock.timers.reset();
  }
  assert.deepEqual(fake.state.activities, []);
});

/** When the clocks go back in each zone, and what the clock read just before. */
const AUTUMN: Record<string, [change: string, before: string]> = {
  'America/New_York': ['2026-11-01T06:00:00Z', '2 am'], // 02:00 EDT → 01:00 EST
  'Europe/London': ['2026-10-25T01:00:00Z', '2 am'], // 02:00 BST → 01:00 GMT
  'Europe/Berlin': ['2026-10-25T01:00:00Z', '3 am'], // 03:00 CEST → 02:00 CET
  'Europe/Helsinki': ['2026-10-25T01:00:00Z', '4 am'], // 04:00 EEST → 03:00 EET
  'Australia/Sydney': ['2026-04-04T16:00:00Z', '3 am'], // 03:00 AEDT → 02:00 AEST
  'Pacific/Chatham': ['2026-04-04T14:00:00Z', '3:45 am'], // 03:45 → 02:45
  'America/Santiago': ['2026-04-05T03:00:00Z', '12 am'], // 00:00 → 23:00 the night before
};

test("a refused Block now names this zone's clock change, not the US one", { skip: !AUTUMN[process.env.TZ ?? ''] }, async () => {
  const [change, before] = AUTUMN[process.env.TZ!];
  for (const minutesBefore of [20, 5]) {
    // A 30-minute nap starting this long before the change runs across it.
    mock.timers.enable({ apis: ['Date'], now: new Date(Date.parse(change) - minutesBefore * 60_000) });
    try {
      await assert.rejects(st.startNap('block', 30), (error: Error) => {
        assert.ok(error instanceof st.NapClockChangeError);
        assert.equal(
          error.message,
          `The clocks go back at ${before} during that nap. Pick one that ends before ${before}, or start it after the clocks change.`,
        );
        return true;
      });
    } finally {
      mock.timers.reset();
    }
  }
  // Ending before the change, or starting after it, as the message says, is allowed.
  for (const [offset, minutes] of [[-31, 30], [1, 30]]) {
    mock.timers.enable({ apis: ['Date'], now: new Date(Date.parse(change) + offset * 60_000) });
    try {
      await st.startNap('block', minutes);
    } finally {
      mock.timers.reset();
    }
    st.endNap();
  }
});

test('Block now in spring, across the hour that is skipped, is allowed', { skip: process.env.TZ !== 'America/New_York' }, async () => {
  // 2026-03-08 01:50 EST; 15 real minutes later the clock reads 03:05 EDT.
  mock.timers.enable({ apis: ['Date'], now: new Date('2026-03-08T06:50:00Z') });
  try {
    await st.startNap('block', 15);
  } finally {
    mock.timers.reset();
  }
  assert.ok(fake.state.activities.includes('locturne-nap'));
});

test('a limit iOS refuses keeps the record of the picks it still counts', async () => {
  st.saveLimits([{ id: 'limit-0', minutes: 30 }]);
  fake.state.store['locturne.limitArmedPicks.limit-0'] = 'the picks iOS counts';
  refuse = true;
  await assert.rejects(st.armLimit({ id: 'limit-0', minutes: 30 }));
  refuse = false;
  assert.equal(fake.state.store['locturne.limitArmedPicks.limit-0'], 'the picks iOS counts');
  await st.armLimit({ id: 'limit-0', minutes: 30 });
  assert.equal(fake.state.store['locturne.limitArmedPicks.limit-0'], 'limit-picks');
});
