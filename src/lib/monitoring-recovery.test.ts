/// <reference types="node" />

import assert from 'node:assert/strict';
import { afterEach, beforeEach, mock, test } from 'node:test';
import { fakeDeviceActivity } from './fake-device-activity.ts';

const fake = fakeDeviceActivity();
mock.module('react-native-device-activity', { namedExports: fake.exports });
const st = await import('./screen-time.ts');
const lc = await import('./lock-controller.ts');
const rt = await import('./routine.ts');

const now = new Date(2026, 9, 7, 15);
beforeEach(async () => {
  fake.reset();
  mock.timers.enable({ apis: ['Date'], now });
  fake.ids().night = 'night-picks';
  rt.saveRoutine(rt.DEFAULT_ROUTINE, now);
  await lc.armRoutine(now);
});
afterEach(() => mock.timers.reset());

test('the controller restores a missing bedtime window without dropping the original armed time', async () => {
  const before = st.getArmedNight();
  fake.state.activities.pop();
  assert.equal(st.getProtection(), 'off');
  assert.equal(await lc.armRoutine(now), 'armed');
  assert.equal(st.getProtection(), 'on');
  assert.equal(st.currentNightWindowNames().length, before?.windows);
  assert.equal(st.getArmedNight()?.since, before?.since);
});

test('an obsolete generation with the right count is replaced rather than kept', async () => {
  const before = st.getArmedNight()!;
  st.sharedSet('locturne.armedNight', { ...before, nativeWindowPrefix: 'night-native-current-' });
  fake.state.activities = Array.from({ length: before.windows }, (_, i) => `night-native-old-${i}`);
  assert.equal(await lc.armRoutine(now), 'armed');
  assert.equal(st.getArmedNight()?.nativeWindowPrefix, undefined);
  assert.equal(st.getProtection(), 'on');
  assert.ok(fake.state.activities.every((name) => !name.startsWith('night-native-')));
});
