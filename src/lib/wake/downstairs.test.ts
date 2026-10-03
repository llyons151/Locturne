/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  addSample,
  DOWNSTAIRS,
  heightProgress,
  holdProgress,
  startDownstairs,
  tick,
  type DownstairsSession,
} from './downstairs.ts';

/** Feeds one reading a second from `altitude(t)` (t in seconds) until `seconds`. */
function run(altitude: (t: number) => number, seconds: number, hz = 1, from?: DownstairsSession) {
  let s = from ?? startDownstairs(0);
  const start = from ? s.now : 0;
  for (let i = 1; i <= seconds * hz; i++) {
    const t = start / 1000 + i / hz;
    s = addSample(s, { at: t * 1000, altitude: altitude(t) });
  }
  return s;
}

/** Deterministic sensor noise, ±amp metres. */
const noise = (t: number, amp: number) => amp * Math.sin(t * 7.3) * Math.cos(t * 2.1);

/** A walk down one flight: still for `wait` s, `height` m over 15 s, then standing. */
const flight = (height: number, wait = 5) => (t: number) =>
  t < wait ? 0 : t < wait + 15 ? (-height * (t - wait)) / 15 : -height;

describe('downstairs', () => {
  test('a full flight held for 5 s counts', () => {
    const s = run(flight(3), 30);
    assert.equal(s.status, 'met');
    assert.ok(s.metAt !== null);
  });

  test('a low 2.6 m flight with sensor noise still counts', () => {
    const s = run((t) => flight(2.6)(t) + noise(t, 0.3), 40, 2);
    assert.equal(s.status, 'met');
  });

  test('going up counts too', () => {
    const s = run((t) => -flight(3)(t), 30);
    assert.equal(s.status, 'met');
  });

  test('lying in bed with noise never counts', () => {
    const s = run((t) => noise(t, 0.3), 290, 2);
    assert.notEqual(s.status, 'met');
    assert.equal(s.heldSince, null);
  });

  test('storm-level weather drift over the whole session never counts', () => {
    // 0.5 m over five minutes, the docs' storm figure, doubled for margin.
    const s = run((t) => -t * (1 / 300) + noise(t, 0.2), 299);
    assert.notEqual(s.status, 'met');
  });

  test('a brief spike does not count', () => {
    // A door slam: 4 m for 1.5 s, then back.
    const s = run((t) => (t > 10 && t < 11.5 ? -4 : 0), 30, 2);
    assert.equal(s.metAt, null);
  });

  test('going down and straight back up within 5 s does not count', () => {
    const s = run((t) => (t > 10 && t < 13 ? -3 : 0), 30);
    assert.equal(s.metAt, null);
  });

  test('standing on the bed (1 m) does not count', () => {
    const s = run((t) => (t > 5 ? 1 : 0), 60);
    assert.equal(s.metAt, null);
  });

  test('a split-level half floor (1.5 m) does not count', () => {
    const s = run(flight(1.5), 60);
    assert.equal(s.metAt, null);
  });

  test('the hold is measured from when the threshold was reached', () => {
    // Crosses 2.5 m at 17.5 s (flight from 5 s to 20 s, 3 m).
    const s = run(flight(3), 21);
    assert.equal(s.status, 'holding');
    assert.ok(holdProgress(s) > 0 && holdProgress(s) < 1);
    assert.equal(heightProgress(s), 1);
  });

  test('progress shows how far the height has moved', () => {
    const s = run(flight(3), 12); // 7 s into a 15 s, 3 m flight: about 1.4 m
    assert.ok(heightProgress(s) > 0.4 && heightProgress(s) < 0.7);
    assert.equal(s.status, 'moving');
  });

  test('times out after five minutes without stairs', () => {
    const s = run((t) => noise(t, 0.02), 301);
    assert.equal(s.status, 'timedOut');
    // A late flight no longer counts in this session.
    const after = run(flight(3, 0), 30, 1, s);
    assert.equal(after.metAt, null);
  });

  test('a hold that started before the timeout may finish', () => {
    // Flight from 280 s to 295 s; crosses 2.5 m at 292.5 s.
    const s = run((t) => flight(3, 280)(t) + noise(t, 0.05), 305);
    assert.equal(s.status, 'met');
  });

  test('no readings at all is reported', () => {
    let s = startDownstairs(0);
    s = tick(s, 3000);
    assert.equal(s.status, 'waiting');
    s = tick(s, DOWNSTAIRS.noSignalMs);
    assert.equal(s.status, 'noSignal');
  });

  test('a sensor stuck on one value is reported as flat', () => {
    const s = run(() => 0, 31);
    assert.equal(s.status, 'flat');
  });

  test('a working sensor held still is not called flat', () => {
    const s = run((t) => noise(t, 0.05), 60);
    assert.notEqual(s.status, 'flat');
  });

  test('a bad reading is ignored', () => {
    let s = run(flight(3), 10);
    s = addSample(s, { at: 10_500, altitude: Number.NaN });
    s = run(flight(3), 20, 1, s);
    assert.equal(s.status, 'met');
  });
});
