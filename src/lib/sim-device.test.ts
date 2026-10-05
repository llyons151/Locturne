/// <reference types="node" />
/**
 * The simulated phone's port of the monitor extension against the Swift rules it mirrors
 * (targets/ActivityMonitorExtension/DeviceActivityMonitorExtension.swift). The lock simulation
 * trusts this port, so drift here hides real bugs there.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { simDevice } from './sim-device.ts';

const LIMIT = 'limit-0';
const HOUR = 60 * 60_000;

function phone() {
  const d = simDevice();
  d.state.store['locturne.limits'] = [{ id: LIMIT, minutes: 30 }];
  d.state.store.familyActivitySelectionIds = { [LIMIT]: 'insta' };
  const schedule = { intervalStart: { hour: 0, minute: 0 }, intervalEnd: { hour: 23, minute: 59 }, repeats: true };
  d.state.monitored.set(LIMIT, { name: LIMIT, schedule, events: [], registeredAt: 0 });
  return d;
}

/** Runs `fn` with the clock at `t`. */
function at<T>(t: number, fn: () => T): T {
  const real = Date.now;
  Date.now = () => t;
  try {
    return fn();
  } finally {
    Date.now = real;
  }
}

test('a limit used up stores the day and the moment (#124)', () => {
  const d = phone();
  const t = new Date(2026, 9, 6, 15, 0).getTime();
  at(t, () => d.fire(LIMIT, 'eventDidReachThreshold'));
  assert.equal(d.state.store[`locturne.limitReached.${LIMIT}`], '2026-10-06');
  assert.equal(d.state.store[`locturne.limitReachedAt.${LIMIT}`], t);
});

test('a threshold delivered while stood down leaves no mark for renewal', () => {
  const d = phone();
  d.state.store['locturne.stoodDown'] = true;
  at(new Date(2026, 9, 6, 15).getTime(), () => d.fire(LIMIT, 'eventDidReachThreshold'));
  assert.equal(d.state.store[`locturne.limitReached.${LIMIT}`], undefined);
  assert.equal(d.state.store[`locturne.limitReachedAt.${LIMIT}`], undefined);
  delete d.state.store['locturne.stoodDown'];
  at(new Date(2026, 9, 6, 15, 1).getTime(), () => d.fire(LIMIT, 'intervalDidEnd'));
  assert.equal(d.state.shielded.has('insta'), false);
});

test('a removed limit cannot leave a threshold mark for the next use of its slot', () => {
  const d = phone();
  d.state.store['locturne.limits'] = [];
  at(new Date(2026, 9, 6, 15).getTime(), () => d.fire(LIMIT, 'eventDidReachThreshold'));
  assert.equal(d.state.store[`locturne.limitReached.${LIMIT}`], undefined);
  d.state.store['locturne.limits'] = [{ id: LIMIT, minutes: 60 }];
  at(new Date(2026, 9, 6, 15, 1).getTime(), () => d.fire(LIMIT, 'intervalDidEnd'));
  assert.equal(d.state.shielded.has('insta'), false);
});

test("the re-apply goes by the moment: a mark from a clock set forward isn't today's (#127)", () => {
  const d = phone();
  const t = new Date(2026, 9, 6, 15, 0).getTime();
  d.state.store[`locturne.limitReached.${LIMIT}`] = '2026-10-06';
  d.state.store[`locturne.limitReachedAt.${LIMIT}`] = t + 27 * HOUR;
  at(t, () => d.fire(LIMIT, 'intervalDidEnd'));
  assert.equal(d.state.shielded.has('insta'), false);
  // Within the limit's minutes of midnight it can't be today's either (#126).
  d.state.store[`locturne.limitReachedAt.${LIMIT}`] = new Date(2026, 9, 6, 0, 10).getTime();
  at(t, () => d.fire(LIMIT, 'intervalDidEnd'));
  assert.equal(d.state.shielded.has('insta'), false);
  // An honest mark holds.
  d.state.store[`locturne.limitReachedAt.${LIMIT}`] = t - HOUR;
  at(t, () => d.fire(LIMIT, 'intervalDidEnd'));
  assert.equal(d.state.shielded.has('insta'), true);
});

test("a limit's start a little before midnight forgets the day's mark; a mid-day arm keeps it (#128)", () => {
  const d = phone();
  const used = new Date(2026, 9, 5, 15, 0).getTime();
  d.state.store[`locturne.limitReached.${LIMIT}`] = '2026-10-05';
  d.state.store[`locturne.limitReachedAt.${LIMIT}`] = used;
  at(new Date(2026, 9, 5, 16, 0).getTime(), () => d.fire(LIMIT, 'intervalDidStart'));
  assert.equal(d.state.store[`locturne.limitReachedAt.${LIMIT}`], used);
  assert.equal(d.state.shielded.has('insta'), true);
  at(new Date(2026, 9, 5, 23, 59, 30).getTime(), () => d.fire(LIMIT, 'intervalDidStart'));
  assert.equal(d.state.store[`locturne.limitReached.${LIMIT}`], undefined);
  assert.equal(d.state.store[`locturne.limitReachedAt.${LIMIT}`], undefined);
});

test('the last window ending with no bedtime picks lets go of the hold, held or not (#113, #114)', () => {
  const d = simDevice();
  const night = { intervalStart: { hour: 6, minute: 30 }, intervalEnd: { hour: 7, minute: 0 }, repeats: true };
  d.state.monitored.set('night-0', { name: 'night-0', schedule: night, events: [], registeredAt: 0 });
  d.state.store['locturne.armedNight'] = { bedtime: 23 * 60, morningStart: 7 * 60 };
  d.state.store['locturne.nightHeld'] = true;
  d.state.store.familyActivitySelectionIds = { always: 'news' };
  at(new Date(2026, 9, 6, 7, 0).getTime(), () => d.fire('night-0', 'intervalDidEnd'));
  assert.equal(d.state.store['locturne.nightHeld'], false);
  // With picks, a held night stays held for the morning proof.
  d.state.store['locturne.nightHeld'] = true;
  d.state.store.familyActivitySelectionIds = { always: 'news', night: 'tiktok' };
  at(new Date(2026, 9, 7, 7, 0).getTime(), () => d.fire('night-0', 'intervalDidEnd'));
  assert.equal(d.state.store['locturne.nightHeld'], true);
  assert.equal(d.state.shielded.has('tiktok'), true);
});

test('every callback is noted in the heartbeat, a stood-down window too, so a moved window sees it ran', () => {
  const d = simDevice();
  const night = { intervalStart: { hour: 23, minute: 0 }, intervalEnd: { hour: 23, minute: 30 }, repeats: true };
  d.state.monitored.set('night-0', { name: 'night-0', schedule: night, events: [], registeredAt: 0 });
  d.state.store['locturne.stoodDown'] = true;
  const t = new Date(2026, 9, 6, 23, 0).getTime();
  at(t, () => d.fire('night-0', 'intervalDidStart'));
  const log = d.state.store['locturne.heartbeat'] as { activity: string; callback: string; at: number }[];
  assert.deepEqual(
    log.map(({ activity, callback, at }) => ({ activity, callback, at })),
    [{ activity: 'night-0', callback: 'intervalDidStart', at: t }],
  );
});
