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
