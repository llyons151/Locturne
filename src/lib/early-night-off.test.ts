/// <reference types="node" />

/**
 * An earlier bedtime saved in the day, against the simulated phone (sim-device.ts): iOS runs
 * the windows with Locturne closed, and the extension judges them by the routine in force.
 * Needs `--experimental-test-module-mocks` (set in the npm test script).
 */
import assert from 'node:assert/strict';
import { mock, test } from 'node:test';
const { simDevice, token } = await import('./sim-device.ts');
const device = simDevice();
mock.module('react-native-device-activity', { namedExports: device.exports });
const lc = await import('./lock-controller.ts');
const rt = await import('./routine.ts');
const { recordProof } = await import('./morning-proof.ts');
const { armTonight } = await import('./arm.ts');

/** Thursday 2026-10-01 at hh:mm, local time. */
const at = (hh: number, mm = 0, day = 1) => new Date(2026, 9, day, hh, mm).getTime();

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
  assert.equal(lc.readLock().phase, 'off');
});
