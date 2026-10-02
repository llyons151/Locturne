/// <reference types="node" />

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { MAX_WINDOWS, MIN_WINDOW, formatMinutes, planNightWindows } from './night-plan.ts';

const H = 60;
const DAY = 24 * H;
const len = (w: { start: number; end: number }) => (w.end - w.start + DAY) % DAY;

test('23:30 to 07:00 is ten 45-minute windows that cross midnight', () => {
  const windows = planNightWindows(23 * H + 30, 7 * H);
  assert.equal(windows.length, 10);
  assert.ok(windows.every((w) => len(w) === 45));
  assert.equal(formatMinutes(windows[0].start), '23:30');
  assert.equal(formatMinutes(windows[1].start), '00:15');
  assert.equal(formatMinutes(windows.at(-1)!.end), '07:00');
  assert.deepEqual(
    windows.map((w) => w.name),
    Array.from({ length: 10 }, (_, i) => `night-${i}`),
  );
});

test('every night length: contiguous, covers bedtime to morning, sizes within limits', () => {
  for (let bedtime = 0; bedtime < DAY; bedtime += 5) {
    for (let morning = 0; morning < DAY; morning += 5) {
      const total = (morning - bedtime + DAY) % DAY;
      const windows = planNightWindows(bedtime, morning);
      if (total < MIN_WINDOW) {
        assert.equal(windows.length, 0);
        continue;
      }
      assert.ok(windows.length >= 1 && windows.length <= MAX_WINDOWS);
      assert.equal(windows[0].start, bedtime);
      assert.equal(windows.at(-1)!.end, morning);
      for (let i = 1; i < windows.length; i++) assert.equal(windows[i].start, windows[i - 1].end);
      assert.equal(windows.reduce((sum, w) => sum + len(w), 0), total);
      for (const w of windows) {
        assert.ok(len(w) >= MIN_WINDOW, `${bedtime}->${morning}: ${len(w)} too short`);
        if (total <= MAX_WINDOWS * 45) assert.ok(len(w) <= 45, `${bedtime}->${morning}: ${len(w)} too long`);
      }
    }
  }
});

test('a 30-minute test night with 15-minute windows chains two of them', () => {
  const windows = planNightWindows(14 * H, 14 * H + 30, 15);
  assert.equal(windows.length, 2);
  assert.deepEqual(windows.map(len), [15, 15]);
});

test('a night under 15 minutes cannot be monitored', () => {
  assert.deepEqual(planNightWindows(7 * H, 7 * H + 10), []);
  assert.deepEqual(planNightWindows(7 * H, 7 * H), []);
});
