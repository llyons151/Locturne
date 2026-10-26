/// <reference types="node" />

/** Loc's mind (loc-mind.ts): what moves it, what doesn't, and that nothing punishes. */
import assert from 'node:assert/strict';
import { mock, test } from 'node:test';

import { fakeDeviceActivity } from './fake-device-activity.ts';

mock.module('react-native-device-activity', { namedExports: fakeDeviceActivity({ available: false }).exports });

const { attitude, decay, freshMind, NUDGE, onExit, onMorning, onSmallHours, onVisit, PROUD_AT, RESPECT, stageFor, SUSPICION } =
  await import('./loc-mind.ts');

const DAY = 86_400_000;
const T0 = Date.UTC(2026, 9, 14, 12);

test('a morning raises respect once, however often it is recorded', () => {
  let m = freshMind(T0);
  m = onMorning(m, '2026-10-14');
  m = onMorning(m, '2026-10-14');
  assert.equal(m.respect, RESPECT.start + NUDGE.morning);
  m = onMorning(m, '2026-10-15');
  assert.equal(m.respect, RESPECT.start + 2 * NUDGE.morning);
});

test('an exit raises suspicion and never takes respect', () => {
  let m = onMorning(freshMind(T0), 'a');
  const respect = m.respect;
  m = onExit(m, 'b');
  m = onExit(m, 'b');
  assert.equal(m.respect, respect);
  assert.equal(m.suspicion, SUSPICION.start + NUDGE.exit);
});

test('small hours count only between 1 and 5, and at most twice a night', () => {
  let m = freshMind(T0);
  m = onSmallHours(m, 'n', 23);
  m = onSmallHours(m, 'n', 6);
  assert.equal(m.suspicion, SUSPICION.start);
  for (const h of [1, 2, 3, 4]) m = onSmallHours(m, 'n', h);
  assert.equal(m.suspicion, SUSPICION.start + 2 * NUDGE.smallHours);
});

test('suspicion fades in days, respect over weeks, and high respect stays', () => {
  const m = { ...freshMind(T0), suspicion: 50, respect: 50 };
  const later = decay(m, T0 + 2 * DAY);
  assert.ok(Math.abs(later.suspicion - (SUSPICION.start + 20)) < 1e-9);
  assert.ok(later.respect > 45 && later.respect < 50);
  const settled = decay({ ...m, respect: PROUD_AT + 5 }, T0 + 60 * DAY);
  assert.equal(settled.respect, PROUD_AT + 5);
});

test('a missed morning (no event) never lowers respect below where it started', () => {
  const m = decay(freshMind(T0), T0 + 30 * DAY);
  assert.equal(m.respect, RESPECT.start);
});

test('three days away makes today a welcome-back day', () => {
  let m = freshMind(T0);
  m = onVisit(m, T0 + DAY, 'd1');
  assert.equal(m.back, null);
  m = onVisit(m, T0 + 5 * DAY, 'd5');
  assert.equal(m.back, 'd5');
});

test('stages follow the mornings count', () => {
  assert.equal(stageFor(0).stage, 'stranger');
  assert.equal(stageFor(7).stage, 'roommate');
  assert.equal(stageFor(29).stage, 'roommate');
  assert.equal(stageFor(30).stage, 'accomplice');
  assert.equal(stageFor(250).stage, 'rideOrDie');
});

test('high numbers make him wary and proud at once', () => {
  const m = { ...freshMind(T0), suspicion: 90, respect: 90 };
  assert.ok(attitude(m).wary > 0);
  assert.equal(attitude(m).proud, true);
});
