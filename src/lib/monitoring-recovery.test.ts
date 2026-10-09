/// <reference types="node" />

import assert from 'node:assert/strict';
import { afterEach, beforeEach, mock, test } from 'node:test';
import { fakeDeviceActivity } from './fake-device-activity.ts';

const fake = fakeDeviceActivity();
const schedules: Record<string, unknown> = {};
mock.module('react-native-device-activity', {
  namedExports: {
    ...fake.exports,
    startMonitoring: async (name: string, schedule: unknown) => {
      schedules[name] = schedule;
      return fake.exports.startMonitoring(name);
    },
  },
});
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

test('a running Block now whose end iOS dropped gets its end registered again', async () => {
  fake.ids().block = 'block-picks';
  const nap = await st.startNap('block', 30);
  fake.state.activities = [];
  fake.state.calls.length = 0;
  const later = new Date(now.getTime() + 5 * 60_000);
  mock.timers.setTime(later.getTime());
  lc.syncLock(later);
  await new Promise((resolve) => setImmediate(resolve));
  assert.ok(fake.shielded('blockSelection').includes('block'), 'the sync puts the shield back');
  assert.ok(fake.state.activities.includes('locturne-nap'), 'so iOS must still end it');
  const configured = fake.state.calls.find(([name, input]) => name === 'configureActions' && (input as { activityName: string }).activityName === 'locturne-nap');
  assert.deepEqual((configured?.[1] as { actions: unknown[] }).actions, [{ type: 'unblockSelection', familyActivitySelectionId: 'block' }]);
  assert.equal(st.getNap()?.end, nap.end);
});

test('a dropped Block now with under 15 minutes left is registered for 15 minutes ending on time', async () => {
  fake.ids().block = 'block-picks';
  const nap = await st.startNap('block', 30);
  fake.state.activities = [];
  const later = new Date(nap.end - 5 * 60_000);
  mock.timers.setTime(later.getTime());
  await st.rearmNap(later);
  assert.ok(fake.state.activities.includes('locturne-nap'));
  type Clock = { hour: number; minute: number };
  const schedule = schedules['locturne-nap'] as { intervalStart: Clock; intervalEnd: Clock };
  const mins = (c: Clock) => c.hour * 60 + c.minute;
  assert.equal((mins(schedule.intervalEnd) - mins(schedule.intervalStart) + 1440) % 1440, st.NAP_SHORTEST);
  assert.equal(mins(schedule.intervalEnd), new Date(nap.end).getHours() * 60 + new Date(nap.end).getMinutes());
});
