/// <reference types="node" />

/**
 * A subscription found ended in a morning nobody proved, against the simulated phone
 * (sim-device.ts): that morning finishes, the next night never starts, and until then Home's
 * status says so and offers the plans. Needs `--experimental-test-module-mocks`.
 */
import assert from 'node:assert/strict';
import { afterEach, mock, test } from 'node:test';
const { simDevice, token } = await import('./sim-device.ts');
const device = simDevice();
mock.module('react-native-device-activity', { namedExports: device.exports });
const lc = await import('./lock-controller.ts');
const rt = await import('./routine.ts');
const st = await import('./screen-time.ts');
const { rollUpHealth } = await import('./health.ts');
const { armTonight } = await import('./arm.ts');

/** Thursday 2026-10-01 onwards, local time. */
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

/** What `readHealth` (use-health.ts) reads, without the heartbeat log. */
const health = () =>
  rollUpHealth({
    protection: st.getProtection(),
    access: 'approved',
    armed: st.getArmedNight(),
    routine: rt.getRoutine(),
    nights: [],
    unsubscribed: lc.subscriptionEnded(),
    now: new Date(),
  });

test('ended in an unproven morning: Home offers the plans that day, and that night nothing sleeps', async () => {
  mock.timers.enable({ apis: ['Date'], now: at(1, 12) });
  device.exports.setFamilyActivitySelectionId({ id: 'night', familyActivitySelection: token(['tiktok']) });
  lc.settleSubscription(true);
  rt.saveRoutine(rt.DEFAULT_ROUTINE);
  assert.equal((await armTonight()).status, 'armed');
  advance(at(2, 7, 30));
  lc.settleSubscription(false); // the store finds no subscription
  advance(at(2, 15));
  assert.equal(lc.syncLock().phase, 'morning', 'this morning still finishes');
  assert.ok(st.getArmedNight(), 'still armed until it does');
  const status = health();
  assert.equal(status.needsSubscription, true);
  assert.notEqual(status.level, 'ok');
  assert.doesNotMatch(status.detail, /Your apps sleep at/);
  assert.match(status.detail, /From tonight, nothing sleeps/);
  advance(at(2, 23, 30)); // app closed: the extension skips the night
  assert.deepEqual([...device.state.shielded], []);
});

test('ended in a held night: Home says that night counts, and offers the plans', async () => {
  mock.timers.enable({ apis: ['Date'], now: at(1, 12) });
  device.exports.setFamilyActivitySelectionId({ id: 'night', familyActivitySelection: token(['tiktok']) });
  lc.settleSubscription(true);
  rt.saveRoutine(rt.DEFAULT_ROUTINE);
  assert.equal((await armTonight()).status, 'armed');
  advance(at(1, 23, 30));
  lc.settleSubscription(false);
  assert.equal(lc.syncLock().phase, 'night');
  assert.deepEqual([...device.state.shielded], ['tiktok']);
  const status = health();
  assert.equal(status.needsSubscription, true);
  assert.match(status.detail, /^Tonight still counts/);
});
