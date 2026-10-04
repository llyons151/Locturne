/// <reference types="node" />

/**
 * Bedtime list edits around an emergency pause, and the app and the monitor extension
 * settling the same edit at once. Against the shared fake library.
 * Needs `--experimental-test-module-mocks`.
 */
import assert from 'node:assert/strict';
import { beforeEach, mock, test } from 'node:test';

import { fakeDeviceActivity } from './fake-device-activity.ts';

const fake = fakeDeviceActivity();
mock.module('react-native-device-activity', { namedExports: fake.exports });

const st = await import('./screen-time.ts');
const lc = await import('./lock-controller.ts');
const em = await import('./emergency.ts');

beforeEach(() => {
  fake.reset();
  fake.arm();
  fake.ids().night = 'night-picks';
});

test('opening and closing the bedtime picker in a paused night keeps the apps awake', () => {
  const night = new Date(2026, 9, 7, 2, 0); // 02:00, inside 23:00–07:00
  st.sleepApps('night');
  assert.ok(em.emergencyUnlock(night)?.pauseNight);
  fake.state.calls.length = 0;

  st.beginListEdit('night');
  assert.equal(st.finishListEdit('night', new Date(2026, 9, 7, 23, 0)), 'bedtime');
  lc.syncLock(night);
  assert.ok(!fake.shielded('blockSelection').includes('night'));
  assert.equal(st.isNightHeld(), false);
  // The picks are still the bedtime apps, from the next bedtime.
  assert.equal(st.shownSelection('night').size, 2);
});

test('a settle that finds its draft already gone leaves the list alone', () => {
  // A removal edit waiting for bedtime...
  fake.ids()['night-next'] = 'fewer-picks';
  fake.state.store['locturne.pendingLists'] = { night: { from: Date.now() - 1000 } };
  // ...that the extension settled a moment ago from its own read, removing the draft.
  fake.ids().night = 'fewer-picks';
  delete fake.ids()['night-next'];

  assert.deepEqual(st.settleListChanges(), ['night']);
  assert.equal(fake.ids().night, 'fewer-picks', 'not emptied');
});

test('an edit that removes every app does empty the list at bedtime', () => {
  st.beginListEdit('night');
  delete fake.ids()['night-next']; // Apple's picker left with nothing picked
  assert.equal(st.finishListEdit('night', new Date(Date.now() + 1000)), 'bedtime');
  st.settleListChanges(new Date(Date.now() + 2000));
  assert.equal(fake.ids().night, undefined);
});
