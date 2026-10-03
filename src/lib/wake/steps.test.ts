/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { addHistory, addLive, isWalked, restartLive, startCount, stepsLeft, stepsOf } from './steps.ts';

const s = (seconds: number) => seconds * 1000;

describe('step count', () => {
  test('steps walked before the screen opened count', () => {
    const count = startCount(200, 140, 0);
    assert.equal(stepsOf(count), 140);
    assert.equal(stepsLeft(count), 60);
  });

  test('live steps add to the history read on open', () => {
    let count = startCount(200, 140, 0);
    count = addLive(count, 10, s(5));
    count = addLive(count, 25, s(12));
    assert.equal(stepsOf(count), 165);
  });

  test('a later history read never double-counts the live steps', () => {
    let count = startCount(200, 100, 0);
    count = addLive(count, 40, s(20));
    // History since morning start now includes those 40 live steps.
    count = addHistory(count, 140, s(20));
    assert.equal(stepsOf(count), 140);
  });

  test('history can catch up steps the live watcher missed', () => {
    let count = startCount(200, 100, 0);
    count = addLive(count, 20, s(10));
    count = addHistory(count, 150, s(30)); // walked in the background
    assert.equal(stepsOf(count), 150);
  });

  test('reaching the goal', () => {
    let count = startCount(200, 190, 0);
    assert.equal(isWalked(count), false);
    count = addLive(count, 10, s(6));
    assert.equal(isWalked(count), true);
    assert.equal(stepsLeft(count), 0);
  });

  test('an honest brisk walk is never trimmed', () => {
    // 2.2 steps a second, in batches every 2.5 s, for two minutes.
    let count = startCount(200, 0, 0);
    let raw = 0;
    for (let t = 2.5; t <= 120; t += 2.5) {
      raw += 5.5;
      count = addLive(count, Math.floor(raw), s(t));
    }
    assert.equal(stepsOf(count), 264);
    assert.equal(count.refused, 0);
  });

  test('a counter that jumps faster than anyone walks is capped', () => {
    let count = startCount(200, 0, 0);
    count = addLive(count, 200, s(10)); // 20 a second
    assert.ok(stepsOf(count) <= 4 * 10 + 8);
    assert.ok(count.refused > 0);
    assert.equal(isWalked(count), false);
  });

  test('history jumps are capped the same way', () => {
    let count = startCount(200, 20, 0);
    count = addHistory(count, 500, s(5));
    assert.ok(stepsOf(count) <= 20 + 4 * 5 + 8);
  });

  test('history from before the screen opened is trusted as is', () => {
    // A long walk earlier this morning: the pedometer already counted it.
    assert.equal(stepsOf(startCount(200, 3000, 0)), 3000);
  });

  test('a restarted watcher counts on from what was credited', () => {
    let count = startCount(200, 0, 0);
    count = addLive(count, 50, s(30));
    count = restartLive(count);
    count = addLive(count, 10, s(40));
    assert.equal(stepsOf(count), 60);
  });

  test('a smaller history read never lowers the count', () => {
    let count = startCount(200, 120, 0);
    count = addHistory(count, 80, s(10));
    assert.equal(stepsOf(count), 120);
  });
});
