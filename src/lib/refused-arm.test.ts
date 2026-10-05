/// <reference types="node" />

/**
 * An arm iOS refuses part-way after bedtime, on the simulated phone. Needs
 * `--experimental-test-module-mocks`.
 */
import assert from 'node:assert/strict';
import { afterEach, mock, test } from 'node:test';

import { simDevice } from './sim-device.ts';

const device = simDevice();
const realStart = device.exports.startMonitoring;
let calls = 0;
let refuseAfter = Infinity;
device.exports.startMonitoring = async (...args: Parameters<typeof realStart>) => {
  calls += 1;
  if (calls > refuseAfter) throw new Error('excessiveActivities');
  await realStart(...args);
  // iOS runs a repeating interval's start as soon as it's registered inside it.
  for (const q of device.state.queue.splice(0)) device.fire(q.activity, q.callback);
};
mock.module('react-native-device-activity', { namedExports: device.exports });

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
afterEach(() => mock.timers.reset());

test('a first arm refused after bedtime leaves nothing asleep, and a held night still wakes by emergency', async () => {
  device.state.store.familyActivitySelectionIds = { night: 'insta,tiktok' };
  clock(at(5, 15));
  rt.saveRoutine(rt.DEFAULT_ROUTINE);
  clock(at(5, 23, 30));
  lc.settleSubscription(true, at(5, 23, 30));
  // The first window registers (and starts at once), the second is refused.
  refuseAfter = 1;
  assert.deepEqual(await armTonight(), { status: 'failed', reason: 'refused' });
  assert.equal(st.getArmedNight(), null);
  assert.equal(device.state.shielded.has('insta'), false);

  // Whatever the records say, bedtime apps held asleep are a night lock the emergency lifts.
  st.sleepApps('night');
  assert.equal(em.heldPhase(lc.readLock(at(5, 23, 31)).phase, at(5, 23, 31)), 'night');
  assert.ok(em.emergencyUnlock(at(5, 23, 31)));
  assert.equal(device.state.shielded.has('insta'), false);
});
