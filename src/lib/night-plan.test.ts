/// <reference types="node" />

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { MAX_WINDOWS, MIN_WINDOW, formatMinutes, planNightWindows } from './night-plan.ts';

const H = 60;
const DAY = 24 * H;
const len = (w: { start: number; end: number }) => (w.end - w.start + DAY) % DAY;

test('23:30 to 07:00: short windows after bedtime and before the morning, one long one between', () => {
  const windows = planNightWindows(23 * H + 30, 7 * H);
  assert.deepEqual(windows.map(len), [15, 15, 30, 60, 270, 30, 30]);
  assert.equal(formatMinutes(windows[0].start), '23:30');
  assert.equal(formatMinutes(windows[4].start), '01:30');
  assert.equal(formatMinutes(windows[5].start), '06:00');
  assert.equal(formatMinutes(windows.at(-1)!.end), '07:00');
  assert.deepEqual(
    windows.map((w) => w.name),
    Array.from({ length: 7 }, (_, i) => `night-${i}`),
  );
});

test('short nights drop the edges that would leave a window under 15 minutes', () => {
  assert.deepEqual(planNightWindows(22 * H, 1 * H).map(len), [15, 15, 30, 60, 30, 30]);
  assert.deepEqual(planNightWindows(22 * H, 23 * H).map(len), [15, 15, 30]);
  assert.deepEqual(planNightWindows(22 * H, 22 * H + 20).map(len), [20]);
  // 12 hours still takes seven: the middle window grows.
  assert.deepEqual(planNightWindows(20 * H, 8 * H).map(len), [15, 15, 30, 60, 540, 30, 30]);
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
      // The first window starts at bedtime and the morning's last half hour has its own, once the night is long enough.
      if (total >= 3 * H) assert.equal(len(windows.at(-1)!), 30);
      for (const w of windows) {
        assert.ok(len(w) >= MIN_WINDOW, `${bedtime}->${morning}: ${len(w)} too short`);
      }
    }
  }
});

test('the lab\'s 30-minute test night with even 15-minute windows chains two of them', () => {
  const windows = planNightWindows(14 * H, 14 * H + 30, 15);
  assert.equal(windows.length, 2);
  assert.deepEqual(windows.map(len), [15, 15]);
});

test('a night under 15 minutes cannot be monitored', () => {
  assert.deepEqual(planNightWindows(7 * H, 7 * H + 10), []);
  assert.deepEqual(planNightWindows(7 * H, 7 * H), []);
});
