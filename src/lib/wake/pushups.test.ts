/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { pushupsLine, spokenRep } from './lines.ts';
import {
  addMotion,
  addProximity,
  addSteps,
  isFlat,
  PUSHUPS,
  repProgress,
  startPushups,
  tick,
  type PushupsSession,
} from './pushups.ts';

const FLAT = { up: 1, shake: 0.01 };

/** Walked to the floor and lying flat long enough to count, at `at` ms. */
function ready(at = 0): PushupsSession {
  let s = addSteps(startPushups(at), PUSHUPS.walkSteps, at + 10_000);
  for (let t = at + 10_000; t <= at + 10_000 + PUSHUPS.settleMs; t += 100) s = addMotion(s, { at: t, ...FLAT });
  assert.equal(s.status, 'counting');
  return s;
}

/** A rep: covered for `down` ms from `at`, with flat motion samples meanwhile. */
function rep(s: PushupsSession, at: number, down = 700, motion = FLAT) {
  s = addProximity(s, true, at);
  for (let t = at + 100; t < at + down; t += 100) s = addMotion(s, { at: t, ...motion });
  return addProximity(s, false, at + down);
}

/** `n` reps, one every `every` ms, starting at `from`. */
function reps(s: PushupsSession, n: number, from: number, every = 1_500, down = 700) {
  for (let i = 0; i < n; i++) s = rep(s, from + i * every, down);
  return s;
}

describe('push-ups', () => {
  test('ten steady push-ups on the floor count', () => {
    const s = reps(ready(), PUSHUPS.reps, 20_000);
    assert.equal(s.reps, PUSHUPS.reps);
    assert.equal(s.status, 'met');
    assert.equal(repProgress(s), 1);
  });

  test('nothing counts before the walk to the floor', () => {
    let s = startPushups(0);
    assert.equal(s.status, 'walking');
    for (let t = 0; t < 3_000; t += 100) s = addMotion(s, { at: t, ...FLAT });
    s = reps(s, 3, 4_000);
    assert.equal(s.reps, 0);
    assert.equal(s.status, 'walking');
  });

  test('a late step update never takes steps back', () => {
    let s = addSteps(startPushups(0), 12, 1_000);
    s = addSteps(s, 8, 2_000);
    assert.equal(s.steps, 12);
  });

  test('covers before the phone has settled flat are not reps', () => {
    let s = addSteps(startPushups(0), PUSHUPS.walkSteps, 1_000);
    s = addMotion(s, { at: 1_000, ...FLAT });
    s = rep(s, 1_100, 700);
    assert.equal(s.reps, 0);
    assert.equal(s.status, 'placing');
  });

  test('a quick hand wave is not a rep', () => {
    const s = rep(ready(), 20_000, 120);
    assert.equal(s.reps, 0);
    assert.equal(s.miss, 'quick');
  });

  test('lying on the phone is not a rep', () => {
    const s = rep(ready(), 20_000, PUSHUPS.maxNearMs + 500);
    assert.equal(s.reps, 0);
    assert.equal(s.miss, 'long');
  });

  test('reps faster than a push-up only count once', () => {
    const s = reps(ready(), 4, 20_000, 500, 300);
    assert.equal(s.reps, 2);
  });

  test('a phone held in the hand never counts', () => {
    let s = addSteps(startPushups(0), PUSHUPS.walkSteps, 1_000);
    // Tilted 45° and wobbling: the way a phone is held in bed.
    const held = { up: Math.SQRT1_2, shake: 0.05 };
    for (let t = 1_000; t < 10_000; t += 100) s = addMotion(s, { at: t, ...held });
    for (let i = 0; i < 5; i++) s = rep(s, 10_000 + i * 1_500, 700, held);
    assert.equal(s.reps, 0);
    assert.equal(s.status, 'placing');
  });

  test('moving the phone during a cover spoils that rep', () => {
    const s = rep(ready(), 20_000, 700, { up: 1, shake: 0.4 });
    assert.equal(s.reps, 0);
    assert.equal(s.miss, 'moved');
  });

  test('picking the phone up pauses the count, and the reps done stay', () => {
    let s = reps(ready(), 4, 20_000);
    for (let t = 27_000; t < 28_000; t += 100) s = addMotion(s, { at: t, up: 0, shake: 0.3 });
    assert.equal(s.status, 'placing');
    s = rep(s, 28_500);
    assert.equal(s.reps, 4);
    for (let t = 30_000; t <= 30_000 + PUSHUPS.settleMs; t += 100) s = addMotion(s, { at: t, ...FLAT });
    s = reps(s, 6, 32_000);
    assert.equal(s.status, 'met');
  });

  test('a bump shorter than a lift keeps counting', () => {
    let s = ready();
    s = addMotion(s, { at: 20_000, up: 1, shake: 0.3 });
    s = addMotion(s, { at: 20_100, ...FLAT });
    assert.equal(s.status, 'counting');
  });

  test('it times out, and once over nothing changes it', () => {
    let s = tick(ready(), PUSHUPS.timeoutMs);
    assert.equal(s.status, 'timedOut');
    s = reps(s, PUSHUPS.reps, PUSHUPS.timeoutMs + 1_000);
    assert.equal(s.reps, 0);
  });

  test('flat means face-up and still', () => {
    assert.ok(isFlat({ up: 0.97, shake: 0.02 }));
    assert.ok(!isFlat({ up: -1, shake: 0 }), 'face-down');
    assert.ok(!isFlat({ up: 0.8, shake: 0 }), 'tilted');
    assert.ok(!isFlat({ up: 1, shake: 0.3 }), 'moving');
  });
});

describe('push-up lines', () => {
  test('a missed rep says why before the count', () => {
    assert.equal(pushupsLine('counting', 3, 10, 'quick'), 'Too quick. That was a hand.');
    assert.equal(pushupsLine('counting', 0, 10, null), "Chest to the phone. I'll count.");
    assert.equal(pushupsLine('placing', 4, 10, null, true), 'Put me back down. I was comfortable.');
  });

  test('he says the count, and something at the end', () => {
    assert.equal(spokenRep(3, 10), '3');
    assert.equal(spokenRep(10, 10), "10. Fine. I'm up.");
  });

  test('never shouts', () => {
    const all = (['idle', 'walking', 'placing', 'counting', 'met', 'timedOut'] as const).flatMap((s) =>
      [null, 'quick', 'long', 'moved'].map((m) => pushupsLine(s, 5, 10, m as never)),
    );
    for (const line of all) assert.ok(!line.includes('!'), line);
  });
});

describe('push-up target', () => {
  test('a session of 15 needs 15', () => {
    let s = addSteps(startPushups(0, 15), PUSHUPS.walkSteps, 1_000);
    for (let t = 1_000; t <= 1_000 + PUSHUPS.settleMs; t += 100) s = addMotion(s, { at: t, ...FLAT });
    s = reps(s, 10, 5_000);
    assert.equal(s.status, 'counting');
    s = reps(s, 5, 30_000);
    assert.equal(s.status, 'met');
    assert.equal(s.reps, 15);
  });
});
