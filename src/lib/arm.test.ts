/// <reference types="node" />

/**
 * `armTonight` against the shared fake library. Needs `--experimental-test-module-mocks`.
 */
import assert from 'node:assert/strict';
import { afterEach, beforeEach, mock, test } from 'node:test';

import { fakeDeviceActivity } from './fake-device-activity.ts';

const fake = fakeDeviceActivity();
mock.module('react-native-device-activity', { namedExports: fake.exports });

const { armTonight } = await import('./arm.ts');
const lc = await import('./lock-controller.ts');
const em = await import('./emergency.ts');
const rt = await import('./routine.ts');
const st = await import('./screen-time.ts');

const at = (day: number, hour: number, minute = 0) => new Date(2026, 9, day, hour, minute);

function clock(date: Date) {
  mock.timers.reset();
  mock.timers.enable({ apis: ['Date'], now: date });
}

beforeEach(() => {
  fake.reset();
  fake.ids().night = 'night-picks';
  clock(at(5, 15));
  rt.saveRoutine(rt.DEFAULT_ROUTINE); // 23:00 to 07:00, every night
});

afterEach(() => mock.timers.reset());

test('arms with the bedtime picks parked by an emergency unlock: they are still the bedtime apps', async () => {
  // Found by the simulation (lock-controller.sim.test.ts, seed 39). Subscribed, armed, and
  // an emergency unlock at 02:00 parks the picks in the draft until the next bedtime...
  lc.settleSubscription(true, at(5, 15));
  assert.equal((await armTonight()).status, 'armed');
  clock(at(7, 2));
  st.sleepApps('night');
  assert.ok(em.emergencyUnlock(at(7, 2))?.pauseNight);
  assert.equal(st.selectionSize('night'), 0);
  // ...then the subscription is found ended in the day, so everything stands down...
  clock(at(7, 10));
  lc.settleSubscription(false, at(7, 10));
  assert.ok(st.isStoodDown());
  // ...and is renewed before bedtime. Tonight must be armed again.
  clock(at(7, 15));
  lc.settleSubscription(true, at(7, 15));
  const result = await armTonight();
  assert.equal(result.status, 'armed');
  assert.ok(st.getArmedNight());
});

test('still refuses when there really are no bedtime apps', async () => {
  delete fake.ids().night;
  lc.settleSubscription(true, at(5, 15));
  assert.deepEqual(await armTonight(), { status: 'failed', reason: 'no-apps' });
});
