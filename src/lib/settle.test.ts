/// <reference types="node" />

import assert from 'node:assert/strict';
import { mock, test } from 'node:test';

import { SETTLE_MS, settler } from './settle.ts';

test('a time picked by spinning the hour, then the minutes, saves only the final time', () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    const saved: number[] = [];
    const s = settler<number>((m) => saved.push(m), 800);
    // 11:00 PM -> 9:45 PM: the hour wheel settles on 9:00 PM first.
    s.push(21 * 60);
    mock.timers.tick(500);
    s.push(21 * 60 + 45);
    mock.timers.tick(799);
    assert.deepEqual(saved, [], 'nothing saved while the wheels are still moving');
    mock.timers.tick(1);
    assert.deepEqual(saved, [21 * 60 + 45]);
    mock.timers.tick(5000);
    assert.deepEqual(saved, [21 * 60 + 45], 'saved once');
  } finally {
    mock.timers.reset();
  }
});

test('leaving the row saves the held time at once, and only once', () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    const saved: number[] = [];
    const s = settler<number>((m) => saved.push(m), 800);
    s.push(22 * 60);
    s.flush();
    assert.deepEqual(saved, [22 * 60]);
    mock.timers.tick(2000);
    s.flush();
    assert.deepEqual(saved, [22 * 60]);
  } finally {
    mock.timers.reset();
  }
});

test('a normal pause between the hour and minute wheels still saves only the final time', () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    const saved: number[] = [];
    const s = settler<number>((m) => saved.push(m));
    // 11:00 PM -> 9:45 PM at a human pace: the hour settles, then 1.5 s to reach the minutes.
    s.push(21 * 60);
    mock.timers.tick(1500);
    assert.deepEqual(saved, [], 'the in-between 9:00 PM is not saved during the pause');
    s.push(21 * 60 + 45);
    mock.timers.tick(SETTLE_MS);
    assert.deepEqual(saved, [21 * 60 + 45]);
  } finally {
    mock.timers.reset();
  }
});
