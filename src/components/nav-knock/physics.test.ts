/// <reference types="node" />

/** The nav strip bouncing as Loc burrows (physics.ts), run frame by frame with no screen. */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { poseOf, startKnock, stepKnock, type KnockWorld } from './physics.ts';

// An iPhone's strip: 393 wide, four tabs and the moon in a row 14 below the panel's edge.
const homes = [46, 106, 166, 226, 347].map((x) => ({ x, y: 40 }));
const TUNE = {
  scurry: 2.2, reach: 0.43, width: 46, bounce: 2.05, jiggle: 0.5, tempo: 2.8, sway: 1, spin: 0.25,
  squash: 1, blast: 1, haptics: false,
};

/** A run with little hops: dives in the middle, runs left past every tab, back, and pops out. */
function dash() {
  const dt = 1 / 60, x: number[] = [], h: number[] = [];
  for (let t = 0; t <= 2.2; t += dt) {
    x.push(t < 0.5 ? 0 : t < 1.1 ? -0.36 * ((t - 0.5) / 0.6) : t < 1.8 ? -0.36 + 0.36 * ((t - 1.1) / 0.7) : 0);
    const hop = Math.floor(t / 0.11) % 2 ? 0.8 : 1.15;
    h.push(t < 0.4 ? 0 : t > 1.95 && t < 2.0 ? 0.5 : t >= 2.0 && t < 2.05 ? 1.8 : hop);
  }
  return { dt, x, h, pop: 2.0 };
}

function play(world: KnockWorld, seed = 1) {
  let s = seed;
  const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const k = startKnock(world.homes.length, rand);
  const peak = world.homes.map(() => 0);
  let frames = 0;
  let jolt = 0;
  let before = k.discs.map((d) => d.vy);
  while (!k.done && frames < 60 * 12) {
    for (let n = 0; n < 4; n++) stepKnock(k, world, 1 / 240);
    frames++;
    k.discs.forEach((d, i) => {
      const drawn = poseOf(d, 26, 13, world.tune);
      peak[i] = Math.max(peak[i], -drawn.y);
      assert.ok(drawn.y >= -13, `disc ${i} drawn over the panel's edge: ${drawn.y}`);
      // Smooth: no frame changes a disc's speed by a jolt.
      if (!k.done) jolt = Math.max(jolt, Math.abs(d.vy - before[i]));
      if (i > 0) {
        const gap = world.homes[i].x + d.x - (world.homes[i - 1].x + k.discs[i - 1].x) - 52;
        assert.ok(gap >= 1, `discs ${i - 1} and ${i} touch: gap ${gap}`);
      }
    });
    before = k.discs.map((d) => d.vy);
  }
  return { k, peak, jolt, seconds: frames / 60 };
}

const world = (tune = TUNE): KnockWorld => ({ homes, W: 393, R: 26, path: dash(), tune });

test('the buttons over his run bounce, and all come home', () => {
  for (const seed of [1, 7, 42, 99, 1234]) {
    const { k, peak, jolt, seconds } = play(world(), seed);
    assert.ok(jolt < 90, `seed ${seed}: a speed jolt of ${jolt} pt/s in one frame`);
    assert.ok(k.done, `seed ${seed}: still moving after ${seconds}s`);
    // He runs left from the middle: every tab bounces at least a few points.
    for (let i = 0; i < 4; i++) assert.ok(peak[i] > 3, `seed ${seed}: tab ${i} barely moved (${peak[i]})`);
    assert.ok(seconds - 2 < 2.5, `seed ${seed}: took ${seconds - 2}s after the pop to settle`);
    for (const d of k.discs) assert.deepEqual([d.x, d.y, d.vx, d.vy], [0, 0, 0, 0]);
  }
});

test('the button far from him barely moves', () => {
  const { peak } = play(world({ ...TUNE, blast: 0 }));
  // The moon, 150 pt right of where he dives and pops, while he runs left.
  assert.ok(peak[4] < 1, `the moon rose ${peak[4]}`);
});

test('the lively preset still keeps its gaps and settles', () => {
  const lively = { ...TUNE, scurry: 2.6, width: 62, bounce: 2.6, jiggle: 0.75, tempo: 3.4, sway: 1.4, squash: 1.4, blast: 1.5 };
  for (const seed of [1, 2, 3]) {
    const { k, seconds } = play(world(lively), seed);
    assert.ok(k.done && seconds < 8, `seed ${seed}: took ${seconds}s`);
  }
});
