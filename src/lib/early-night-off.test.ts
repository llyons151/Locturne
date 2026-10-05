/// <reference types="node" />

/**
 * An earlier bedtime saved in the day, against the simulated phone (sim-device.ts): iOS runs
 * the windows with Locturne closed, and the extension judges them by the routine in force.
 * Needs `--experimental-test-module-mocks` (set in the npm test script).
 */
import assert from 'node:assert/strict';
import { afterEach, mock, test } from 'node:test';
const { simDevice, token } = await import('./sim-device.ts');
const device = simDevice();
mock.module('react-native-device-activity', { namedExports: device.exports });
const lc = await import('./lock-controller.ts');
const rt = await import('./routine.ts');
const { recordProof } = await import('./morning-proof.ts');
const { armTonight } = await import('./arm.ts');

/** Thursday 2026-10-01 at hh:mm, local time. */
const at = (hh: number, mm = 0, day = 1) => new Date(2026, 9, day, hh, mm).getTime();

// Each test is a fresh phone.
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

test('an earlier bedtime and tonight switched off, in two saves: nothing sleeps before tonight', async () => {
  mock.timers.enable({ apis: ['Date'], now: at(12, 0, 0) });
  device.exports.setFamilyActivitySelectionId({ id: 'night', familyActivitySelection: token(['tiktok']) });
  lc.settleSubscription(true);
  rt.saveRoutine(rt.DEFAULT_ROUTINE); // 23:00 to 07:00 every night, applies at once
  assert.equal((await armTonight()).status, 'armed');
  advance(at(7, 30));
  recordProof({ morningKey: '2026-10-01', kind: 'steps', at: at(7, 30) });
  lc.syncLock();

  // 14:00, the Routine tab saves each change: bedtime 21:30 (armed at once, it only
  // tightens), then Thursday evening off. Both wait for 23:00.
  advance(at(14));
  rt.saveRoutine({ ...rt.DEFAULT_ROUTINE, bedtime: 21 * 60 + 30 });
  await lc.armRoutine();
  advance(at(14, 1));
  rt.saveRoutine({ ...rt.DEFAULT_ROUTINE, bedtime: 21 * 60 + 30, activeNights: [0, 1, 2, 3, 5, 6] });
  await lc.armRoutine();
  lc.syncLock();

  // The app stays closed. Tonight is off under the edit, and 21:30 to 23:00 is day under the
  // routine in force: no window may shield.
  advance(at(21, 45));
  assert.deepEqual([...device.state.shielded], []);
  advance(at(22, 59));
  assert.deepEqual([...device.state.shielded], []);
  // The routine in force's day (iOS holds nothing early: `holdsEarly`), then the edit's night off.
  assert.equal(lc.readLock().phase, 'day');
  advance(at(23, 30));
  assert.deepEqual([...device.state.shielded], []);
  assert.equal(lc.readLock().phase, 'off');
});

test('an earlier bedtime saved after the walk, while arming waits: the apps sleep when iOS says', async () => {
  mock.timers.enable({ apis: ['Date'], now: at(12, 0, 3) });
  device.exports.setFamilyActivitySelectionId({ id: 'night', familyActivitySelection: token(['tiktok']) });
  lc.settleSubscription(true);
  rt.saveRoutine(rt.DEFAULT_ROUTINE);
  assert.equal((await armTonight()).status, 'armed');
  advance(at(7, 2, 4));
  recordProof({ morningKey: '2026-10-04', kind: 'steps', at: at(7, 2, 4) });
  lc.syncLock();
  assert.deepEqual([...device.state.shielded], []);

  // 07:05: bedtime 23:00 to 22:00, the morning 07:00 to 08:00. A 07:15 window would shield a
  // phantom night, so arming waits for 08:00.
  advance(at(7, 5, 4));
  rt.saveRoutine({ ...rt.DEFAULT_ROUTINE, bedtime: 22 * 60, morningStart: 8 * 60 });
  assert.equal(await lc.armRoutine(), 'deferred');
  // Home's line and the warning go by what iOS has: 23:00.
  assert.equal(+rt.nightAt(new Date(at(23, 0, 4))).start, at(23, 0, 4));

  // The app stays closed: nothing sleeps at 22:00, the old windows shield at 23:00.
  advance(at(22, 30, 4));
  assert.deepEqual([...device.state.shielded], []);
  assert.equal(lc.readLock().phase, 'day');
  advance(at(23, 5, 4));
  assert.deepEqual([...device.state.shielded], ['tiktok']);
  assert.equal(lc.readLock().phase, 'night');
});

test('the same edit, with an open after 08:00: its windows go in and 22:00 holds', async () => {
  mock.timers.enable({ apis: ['Date'], now: at(12, 0, 6) });
  device.exports.setFamilyActivitySelectionId({ id: 'night', familyActivitySelection: token(['tiktok']) });
  lc.settleSubscription(true);
  rt.saveRoutine(rt.DEFAULT_ROUTINE);
  assert.equal((await armTonight()).status, 'armed');
  advance(at(7, 2, 7));
  recordProof({ morningKey: '2026-10-07', kind: 'steps', at: at(7, 2, 7) });
  lc.syncLock();
  advance(at(7, 5, 7));
  rt.saveRoutine({ ...rt.DEFAULT_ROUTINE, bedtime: 22 * 60, morningStart: 8 * 60 });
  assert.equal(await lc.armRoutine(), 'deferred');

  advance(at(8, 30, 7));
  lc.syncLock();
  await lc.armRoutine(); // waits for the background arm
  assert.equal(+rt.nightAt(new Date(at(23, 0, 7))).start, at(22, 0, 7));
  advance(at(22, 5, 7));
  assert.deepEqual([...device.state.shielded], ['tiktok']);
  assert.equal(lc.readLock().phase, 'night');
});
