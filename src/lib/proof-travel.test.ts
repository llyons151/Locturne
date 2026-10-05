/// <reference types="node" />

/**
 * A morning proven, then a flight west, against the simulated phone (sim-device.ts). A proof
 * is judged once, when it's saved: 07:30 in New York is 04:30 in LA, before 07:00 there, and
 * re-reading it against LA's morning start used to lock a proven morning again mid-afternoon.
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
const { getProof } = await import('./morning-proof.ts');

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

/** Local time in whatever zone the phone is in now. */
const at = (day: number, hh: number, mm = 0) => new Date(2026, 9, day, hh, mm).getTime();

async function provenInNewYork() {
  process.env.TZ = 'America/New_York';
  mock.timers.enable({ apis: ['Date'], now: at(5, 12) });
  device.exports.setFamilyActivitySelectionId({ id: 'night', familyActivitySelection: token(['tiktok']) });
  lc.settleSubscription(true);
  rt.saveRoutine(rt.DEFAULT_ROUTINE); // 23:00 to 07:00 every night
  assert.equal((await armTonight()).status, 'armed');
  advance(at(6, 7, 30));
  assert.equal(lc.proveMorning('downstairs')?.phase, 'day');
  assert.deepEqual([...device.state.shielded], []);
}

test('a morning proven at 07:30 in New York stays proven after a same-day flight to LA', async () => {
  await provenInNewYork();
  advance(at(6, 15)); // lands 12:00 in LA
  process.env.TZ = 'America/Los_Angeles';
  advance(at(6, 12, 0));
  const state = lc.syncLock();
  assert.equal(state.phase, 'day');
  assert.equal(state.morningKey, '2026-10-06');
  assert.deepEqual([...device.state.shielded], [], 'the bedtime apps stay awake');
  assert.equal(getProof('2026-10-06')?.kind, 'downstairs', 'Home sees the walk');
  assert.equal(lc.proveMorning('steps'), null, 'nothing asks for a second wake-up');
});

test('a one-hour move west (New York to Chicago) also keeps the proven morning', async () => {
  await provenInNewYork();
  advance(at(6, 10));
  process.env.TZ = 'America/Chicago';
  advance(at(6, 10, 30));
  assert.equal(lc.syncLock().phase, 'day');
  assert.deepEqual([...device.state.shielded], []);
});

test('the next night in LA still locks, and its morning needs a new proof', async () => {
  await provenInNewYork();
  advance(at(6, 15));
  process.env.TZ = 'America/Los_Angeles';
  advance(at(6, 12));
  lc.syncLock();
  advance(at(6, 23, 30));
  assert.equal(lc.syncLock().phase, 'night');
  advance(at(7, 7, 30));
  assert.equal(lc.syncLock().phase, 'morning');
  assert.deepEqual([...device.state.shielded], ['tiktok']);
});
