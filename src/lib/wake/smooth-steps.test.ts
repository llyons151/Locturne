/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { addReading, FIRST_GAP_MS, JUMP, nextTick, startSmooth, step, type Smooth } from './smooth-steps.ts';

/** Shows steps until caught up, returning how long it took. */
function walkOut(s: Smooth): { s: Smooth; ms: number } {
  let ms = 0;
  for (let delay = nextTick(s); delay !== null; delay = nextTick(s)) {
    ms += delay;
    s = step(s);
  }
  return { s, ms };
}

describe('smooth steps', () => {
  test('a batch is walked out one step at a time, over about the gap between batches', () => {
    let s = addReading(startSmooth(30), 40, 1000);
    s = walkOut(s).s;
    s = addReading(s, 52, 3500);
    assert.equal(s.shown, 40);
    const { s: after, ms } = walkOut(s);
    assert.equal(after.shown, 52);
    assert.ok(Math.abs(ms - 2500) < 50, `took ${ms} ms`);
  });

  test('the first batch assumes the usual gap', () => {
    const s = addReading(startSmooth(0), 10, 400);
    assert.equal(s.tick * 10, FIRST_GAP_MS);
  });

  test('it never shows more than was counted', () => {
    let s = startSmooth(0);
    s = addReading(s, 8, 2000);
    for (let i = 0; i < 100; i++) s = step(s);
    assert.equal(s.shown, 8);
    assert.equal(nextTick(s), null);
  });

  test('a batch landing mid-catch-up speeds up to fit the next gap', () => {
    let s = addReading(startSmooth(0), 10, 2000);
    for (let i = 0; i < 5; i++) s = step(s);
    s = addReading(s, 20, 4000);
    assert.equal(s.shown, 5);
    assert.equal(s.tick, 2000 / 15);
  });

  test('a big jump or a lower count lands at once', () => {
    const jumped = addReading(startSmooth(10), 10 + JUMP + 1, 2000);
    assert.equal(jumped.shown, 10 + JUMP + 1);
    const lower = addReading(startSmooth(80), 3, 2000);
    assert.equal(lower.shown, 3);
  });

  test('a long stop does not make the next batch crawl', () => {
    const s = addReading(addReading(startSmooth(100), 101, 1000), 104, 60_000);
    assert.ok(walkOut(s).ms <= 3000);
  });
});
