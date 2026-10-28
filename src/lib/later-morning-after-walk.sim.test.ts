/// <reference types="node" />
// A wake-up time moved later after the morning is already won (BUG_SWEEP_2026-10-28, decision 2):
// 07:05 walk under 23:00 to 07:00, then at 07:10 the morning start set to 08:00. Now sits inside the
// new routine's night, but that night was slept under the old one and this morning is proven, so
// nothing goes back to sleep: not when the app syncs, and not when iOS starts the new windows.
// Needs `--experimental-test-module-mocks` (set in the npm test script).

import assert from 'node:assert/strict';
import { afterEach, mock, test } from 'node:test';

import { simDevice, token } from './sim-device.ts';

const device = simDevice();
mock.module('react-native-device-activity', { namedExports: device.exports });
mock.module('react-native', { namedExports: { Platform: { OS: 'web' }, Alert: { alert: () => undefined } } });
mock.module('expo-notifications', {
  namedExports: {
    setNotificationHandler: () => undefined,
    IosAuthorizationStatus: {},
    SchedulableTriggerInputTypes: { DATE: 'date', CALENDAR: 'calendar' },
  },
});
const lc = await import('./lock-controller.ts');
const rt = await import('./routine.ts');
const mp = await import('./morning-proof.ts');
const { armTonight } = await import('./arm.ts');

/** Day `day` of October 2026 at hh:mm, local time. */
const at = (day: number, hh: number, mm = 0) => new Date(2026, 9, day, hh, mm).getTime();

afterEach(() => {
  mock.timers.reset();
  device.reset();
});

function advance(to: number) {
  for (const e of device.dueEvents(Date.now(), to)) {
    mock.timers.setTime(e.at);
    device.fire(e.activity, e.callback);
  }
  mock.timers.setTime(to);
}

/** Armed on the 5th, the night of the 5th held, walked at 07:05 on the 6th. */
async function wonMorning() {
  mock.timers.enable({ apis: ['Date'], now: at(5, 12) });
  device.exports.setFamilyActivitySelectionId({ id: 'night', familyActivitySelection: token(['tiktok']) });
  lc.settleSubscription(true);
  rt.saveRoutine(rt.DEFAULT_ROUTINE);
  assert.equal((await armTonight()).status, 'armed');
  advance(at(6, 7, 2));
  assert.equal(lc.syncLock().phase, 'morning');
  advance(at(6, 7, 5));
  assert.ok(mp.recordProof({ morningKey: '2026-10-06', kind: 'steps', at: Date.now() }));
  assert.equal(lc.syncLock().phase, 'day');
  assert.deepEqual([...device.state.shielded], []);
}

/** Saves `next` at once, as the Routine tab does while awake, and re-arms like `applyRoutineEdit`. */
async function edit(next: import('./routine.ts').Routine) {
  rt.saveRoutine(next, new Date(), lc.inPendingFirstNight(new Date()), true, true);
  lc.syncLock();
  await lc.armRoutine();
  return lc.syncLock();
}

for (const morningStart of [8 * 60, 7 * 60 + 30, 11 * 60]) {
  test(`walked at 07:05, wake-up moved to ${morningStart / 60}h: still awake, now and with the app closed`, async () => {
    await wonMorning();
    advance(at(6, 7, 10));
    const state = await edit({ ...rt.DEFAULT_ROUTINE, morningStart });
    assert.equal(state.phase, 'day');
    assert.deepEqual([...device.state.shielded], [], 'nothing shielded after the re-arm');
    // App closed: iOS runs the new windows through to the new morning start and past it.
    advance(at(6, 12));
    assert.deepEqual([...device.state.shielded], [], 'still awake at noon');
    assert.equal(lc.syncLock().phase, 'day');
    // Tonight runs under the new routine, and tomorrow's morning needs its own wake-up.
    advance(at(6, 23, 30));
    assert.equal(lc.syncLock().phase, 'night');
    assert.deepEqual([...device.state.shielded], ['tiktok']);
    advance(at(7, (morningStart + 5) / 60 | 0, (morningStart + 5) % 60));
    assert.equal(lc.syncLock().phase, 'morning');
    assert.deepEqual([...device.state.shielded], ['tiktok']);
  });
}

test('an unproven morning moved later still sleeps until the new start (no change)', async () => {
  mock.timers.enable({ apis: ['Date'], now: at(5, 12) });
  device.exports.setFamilyActivitySelectionId({ id: 'night', familyActivitySelection: token(['tiktok']) });
  lc.settleSubscription(true);
  rt.saveRoutine(rt.DEFAULT_ROUTINE);
  await armTonight();
  advance(at(6, 6));
  assert.equal(lc.syncLock().phase, 'night');
  // Asleep: the edit is refused by the Routine tab, so nothing here changes either.
  advance(at(6, 7, 10));
  assert.equal(lc.syncLock().phase, 'morning');
  assert.deepEqual([...device.state.shielded], ['tiktok']);
});

test('a same-day night saved after the walk still runs and needs its own wake-up', async () => {
  await wonMorning();
  advance(at(6, 9));
  // A nap-like night shift: 10:00 to 14:00 the same day. It begins after the walk, so it holds.
  await edit({ ...rt.DEFAULT_ROUTINE, bedtime: 10 * 60, morningStart: 14 * 60 });
  advance(at(6, 11));
  assert.equal(lc.syncLock().phase, 'night');
  assert.deepEqual([...device.state.shielded], ['tiktok']);
});

test('a walk with the clock set forward to the morning, then set back, frees no night', async () => {
  mock.timers.enable({ apis: ['Date'], now: at(5, 12) });
  device.exports.setFamilyActivitySelectionId({ id: 'night', familyActivitySelection: token(['tiktok']) });
  lc.settleSubscription(true);
  rt.saveRoutine(rt.DEFAULT_ROUTINE);
  await armTonight();
  advance(at(5, 23, 30));
  assert.equal(lc.syncLock().phase, 'night');
  // Settings, the clock set to 07:05 tomorrow, a walk: the proof is stamped in the future.
  mock.timers.setTime(at(6, 7, 5));
  mp.recordProof({ morningKey: '2026-10-06', kind: 'steps', at: Date.now() });
  // Clock put back: still the night.
  mock.timers.setTime(at(5, 23, 36));
  assert.equal(lc.syncLock().phase, 'night');
  assert.deepEqual([...device.state.shielded], ['tiktok']);
  device.fire([...device.state.monitored.keys()].find((n) => n.startsWith('night-')) ?? 'night-0', 'intervalDidStart');
  assert.deepEqual([...device.state.shielded], ['tiktok'], 'a window starting now still shields');
});
