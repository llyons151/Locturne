/// <reference types="node" />
// The wound-back clock bypass (BUG_SWEEP_2026-10-28): setting the date back to yesterday and
// opening Locturne used to read as daytime and wake the bedtime apps with no wake-up.

import assert from 'node:assert/strict';
import { afterEach, describe, mock, test } from 'node:test';

import { judgeClock, WOUND_SLACK_MS, WOUND_TRUST_AFTER_MS } from './clock-guard.ts';
import { simDevice, token } from './sim-device.ts';

const device = simDevice();
mock.module('react-native-device-activity', { namedExports: device.exports });
const lc = await import('./lock-controller.ts');
const rt = await import('./routine.ts');
const guard = await import('./clock-guard.ts');
const { armTonight } = await import('./arm.ts');

const HOUR = 60 * 60_000;

describe('judgeClock', () => {
  const boot = 1_000_000;
  test('a clock running normally, a restart, or a clock set forward is never wound', () => {
    assert.equal(judgeClock(null, { wall: boot + 5_000, monotonic: 5_000 }).wound, false);
    const seen = { boot };
    assert.equal(judgeClock(seen, { wall: boot + 9 * HOUR, monotonic: 9 * HOUR }).wound, false);
    // NTP nudging the clock a few minutes back is not a wound clock.
    assert.equal(judgeClock(seen, { wall: boot + HOUR - WOUND_SLACK_MS + 1000, monotonic: HOUR }).wound, false);
    // Restart: the time since boot starts again, the boot time moves later.
    assert.deepEqual(judgeClock(seen, { wall: boot + 30 * HOUR, monotonic: 60_000 }), { wound: false, seen: { boot: boot + 30 * HOUR - 60_000 } });
  });

  test('a clock wound back a day is wound, and stays so until put right', () => {
    const first = judgeClock({ boot }, { wall: boot + 8 * HOUR - 24 * HOUR, monotonic: 8 * HOUR });
    assert.equal(first.wound, true);
    assert.equal(first.seen.boot, boot);
    const still = judgeClock(first.seen, { wall: boot + 9 * HOUR - 24 * HOUR, monotonic: 9 * HOUR });
    assert.equal(still.wound, true);
    const right = judgeClock(still.seen, { wall: boot + 9 * HOUR, monotonic: 9 * HOUR });
    assert.equal(right.wound, false);
  });

  test('a clock left wound for half a day is trusted again (a fast clock corrected)', () => {
    const first = judgeClock({ boot }, { wall: boot + HOUR - 2 * HOUR, monotonic: HOUR });
    const later = judgeClock(first.seen, { wall: boot + HOUR - 2 * HOUR + WOUND_TRUST_AFTER_MS, monotonic: HOUR + WOUND_TRUST_AFTER_MS });
    assert.equal(later.wound, false);
    assert.equal(judgeClock(later.seen, { wall: later.seen.boot + HOUR + WOUND_TRUST_AFTER_MS + 60_000, monotonic: HOUR + WOUND_TRUST_AFTER_MS + 60_000 }).wound, false);
  });

  test('nothing to read is never wound', () => {
    assert.equal(judgeClock({ boot }, { wall: Number.NaN, monotonic: 1 }).wound, false);
  });
});

describe('the lock with a wound-back clock', () => {
  const at = (day: number, hh: number, mm = 0) => new Date(2026, 9, day, hh, mm).getTime();
  // The phone booted at noon on the 5th; `real` is the true time, the wall clock is `Date.now()`.
  const BOOT = at(5, 12);
  let real = BOOT;

  afterEach(() => {
    mock.timers.reset();
    device.reset();
    guard.setClockReader(null);
  });

  function advance(to: number) {
    for (const e of device.dueEvents(Date.now(), to)) {
      mock.timers.setTime(e.at);
      device.fire(e.activity, e.callback);
    }
    mock.timers.setTime(to);
    real = to;
  }

  async function lockedMorning() {
    mock.timers.enable({ apis: ['Date'], now: BOOT });
    real = BOOT;
    guard.setClockReader(() => ({ wall: Date.now(), monotonic: real - BOOT }));
    device.exports.setFamilyActivitySelectionId({ id: 'night', familyActivitySelection: token(['tiktok']) });
    lc.settleSubscription(true);
    rt.saveRoutine(rt.DEFAULT_ROUTINE);
    assert.equal((await armTonight()).status, 'armed');
    advance(at(6, 7, 30));
    assert.equal(lc.syncLock().phase, 'morning');
    assert.deepEqual([...device.state.shielded], ['tiktok']);
  }

  test('an unproven morning: the date set back to yesterday afternoon wakes nothing', async () => {
    await lockedMorning();
    real = at(6, 7, 31);
    mock.timers.setTime(at(5, 15));
    lc.syncLock();
    assert.deepEqual([...device.state.shielded], ['tiktok']);
    // Put right, the morning is still there to win.
    real = at(6, 7, 33);
    mock.timers.setTime(real);
    assert.equal(lc.syncLock().phase, 'morning');
    assert.deepEqual([...device.state.shielded], ['tiktok']);
  });

  test('mid-night: the clock set back to 3 pm wakes nothing', async () => {
    mock.timers.enable({ apis: ['Date'], now: BOOT });
    real = BOOT;
    guard.setClockReader(() => ({ wall: Date.now(), monotonic: real - BOOT }));
    device.exports.setFamilyActivitySelectionId({ id: 'night', familyActivitySelection: token(['tiktok']) });
    lc.settleSubscription(true);
    rt.saveRoutine(rt.DEFAULT_ROUTINE);
    await armTonight();
    advance(at(5, 23, 30));
    lc.syncLock();
    real = at(5, 23, 31);
    mock.timers.setTime(at(5, 15));
    lc.syncLock();
    assert.deepEqual([...device.state.shielded], ['tiktok']);
  });

  test('without the boot clock (an older build) nothing changes', async () => {
    await lockedMorning();
    guard.setClockReader(null);
    mock.timers.setTime(at(5, 15));
    lc.syncLock();
    assert.deepEqual([...device.state.shielded], []);
  });
});
