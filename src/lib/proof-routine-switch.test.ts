/// <reference types="node" />

/**
 * A morning proven, then a switch to a night-shift routine, against the simulated phone
 * (sim-device.ts). A proof unlocks its morning only if made after the night into it began
 * (`proofUnlocks`), and that night is the one under the routine the proof was made under. Once
 * an 08:00 to 16:00 routine applies at 23:00, the morning under way is Oct 6 again, with a
 * night from 08:00 Oct 6 that was never slept under it: judged by the new routine, a 07:30 walk
 * looked older than that night and the proven morning locked again.
 * Needs `--experimental-test-module-mocks` (set in the npm test script).
 */
import assert from 'node:assert/strict';
import { afterEach, mock, test } from 'node:test';
const { simDevice, token } = await import('./sim-device.ts');
const device = simDevice();
mock.module('react-native-device-activity', { namedExports: device.exports });
const lc = await import('./lock-controller.ts');
const rt = await import('./routine.ts');
const { armTonight } = await import('./arm.ts');
const { proofUnlocks } = await import('./morning-proof.ts');

const zone = process.env.TZ;
afterEach(() => {
  mock.timers.reset();
  device.reset();
  process.env.TZ = zone;
});

function advance(to: number) {
  for (const e of device.dueEvents(Date.now(), to)) {
    mock.timers.setTime(e.at);
    device.fire(e.activity, e.callback);
  }
  mock.timers.setTime(to);
}

const at = (day: number, hh: number, mm = 0) => new Date(2026, 9, day, hh, mm).getTime();

/** 23:00 to 07:00 in New York, the walk at 07:30 Oct 6, then 08:00 to 16:00 saved at 10:00. */
async function provenThenNightShift() {
  process.env.TZ = 'America/New_York';
  mock.timers.enable({ apis: ['Date'], now: at(5, 12) });
  device.exports.setFamilyActivitySelectionId({ id: 'night', familyActivitySelection: token(['tiktok']) });
  lc.settleSubscription(true);
  rt.saveRoutine(rt.DEFAULT_ROUTINE);
  assert.equal((await armTonight()).status, 'armed');
  advance(at(6, 7, 30));
  assert.equal(lc.proveMorning('downstairs')?.phase, 'day');
  advance(at(6, 10));
  // Saved in the day, it waits for tonight's 23:00.
  rt.saveRoutine({ ...rt.getRoutine(), bedtime: 8 * 60, morningStart: 16 * 60 }, new Date(), lc.inPendingFirstNight(new Date()));
  lc.syncLock();
  await lc.armRoutine().catch(() => {});
}

test('a proven morning stays proven when a night-shift routine applies', async () => {
  await provenThenNightShift();
  advance(at(6, 23, 30));
  const state = lc.syncLock();
  assert.equal(state.morningKey, '2026-10-06', 'the new routine names the same morning');
  assert.equal(state.phase, 'day', 'Oct 6 was proved at 07:30');
  assert.deepEqual([...device.state.shielded], [], 'the bedtime apps stay awake');
  assert.equal(lc.currentProof()?.kind, 'downstairs', 'Home sees the walk');
  assert.equal(lc.proveMorning('steps'), null, 'nothing asks for a second wake-up');
});

test("the night shift's own first night still locks, and its morning needs a proof", async () => {
  await provenThenNightShift();
  advance(at(6, 23, 30));
  lc.syncLock();
  advance(at(7, 9));
  assert.equal(lc.syncLock().phase, 'night');
  advance(at(7, 16, 30));
  const state = lc.syncLock();
  assert.equal(state.morningKey, '2026-10-07');
  assert.equal(state.phase, 'morning');
  assert.deepEqual([...device.state.shielded], ['tiktok']);
  assert.equal(lc.proveMorning('downstairs')?.phase, 'day');
});

test('a proof saved without its times goes by the night in the routine of now', () => {
  process.env.TZ = 'America/New_York';
  const legacy = { morningKey: '2026-10-06', kind: 'downstairs' as const, at: at(6, 7, 30) };
  const nightShift = { key: '2026-10-06', nightStart: new Date(at(6, 8)) };
  assert.equal(proofUnlocks(legacy, nightShift), false);
  assert.equal(proofUnlocks({ ...legacy, bedtime: 23 * 60, morningStart: 7 * 60 }, nightShift), true);
});
