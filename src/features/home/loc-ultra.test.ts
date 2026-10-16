/// <reference types="node" />

/** The ultra zoomies (loc-ultra.ts): round the whole screen, never teleporting, home exactly where the canvas takes over. */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ultraNav, ultraRun } from './loc-ultra.ts';
import { rimMarks, rimPoint, type Rim } from './rim.ts';

const seeded = (seed: number) => {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const PHONE: Rim = { W: 393, H: 852 - 100, Rb: 44, Rt: 48 };
const SCREENS: Rim[] = [PHONE, { W: 320, H: 568 - 80, Rb: 44, Rt: 48 }, { W: 1280, H: 800 - 90, Rb: 44, Rt: 48 }];

test('the rim is one unbroken line round the panel, with the normal pointing in', () => {
  for (const rim of SCREENS) {
    const { L } = rimMarks(rim);
    let prev = rimPoint(0, rim);
    assert.deepEqual([prev[0], prev[1]], [rim.W / 2, rim.H]);
    for (let u = 0.5; u <= L + 0.01; u += 0.5) {
      const p = rimPoint(u, rim);
      assert.ok(Math.hypot(p[0] - prev[0], p[1] - prev[1]) <= 0.51, `jump at ${u}`);
      assert.ok(Math.abs(Math.hypot(p[2], p[3]) - 1) < 1e-9, `normal at ${u}`);
      // Stepping in along the normal stays on the panel.
      const ix = p[0] + p[2] * 5, iy = p[1] + p[3] * 5;
      assert.ok(ix > 0 && ix < rim.W && iy > 0 && iy < rim.H, `normal points out at ${u}`);
      prev = p;
    }
    const top = rimPoint(L / 2, rim);
    assert.ok(Math.abs(top[0] - rim.W / 2) < 1e-6 && Math.abs(top[1]) < 1e-6, 'halfway round is the top middle');
  }
});

test('every run goes all the way round and comes home, at a followable pace', () => {
  for (const rim of SCREENS) {
    const { L } = rimMarks(rim);
    for (let seed = 1; seed <= 150; seed++) {
      const { run, lump } = ultraRun(rim, seeded(seed));
      const n = run.u.length;
      assert.ok(n > 60 && [run.h, run.w, run.shake].every((a) => a.length === n), `seed ${seed}: tracks line up`);
      assert.ok(Math.max(...run.u) - Math.min(...run.u) >= L - 1, `seed ${seed}: didn't make it round`);
      const end = run.u[n - 1];
      assert.ok(Math.abs(end) >= L - 1 && Math.abs(end / L - Math.round(end / L)) < 1e-4, `seed ${seed}: ends at ${end}, not home`);
      assert.equal(run.h[n - 1], 1, `seed ${seed}: hands over at rest height`);
      assert.equal(run.w[n - 1], 1, `seed ${seed}: hands over at rest width`);
      for (let i = 1; i < n; i++) {
        assert.ok(Math.abs(run.u[i] - run.u[i - 1]) <= 2.95 * (1000 / 60), `seed ${seed}: teleports at frame ${i}`);
      }
      assert.ok(run.h.every((v) => Number.isFinite(v) && v >= 0 && v < 3), `seed ${seed}: lump height`);
      assert.ok(run.home > 1500 && run.home < 7000, `seed ${seed}: home at ${run.home}`);
      assert.ok(run.pop > run.home && run.pop < run.home + 400, `seed ${seed}: pops at ${run.pop}`);
      for (let i = 1; i < run.taps.length; i++) assert.ok(run.taps[i][0] >= run.taps[i - 1][0], `seed ${seed}: buzzes out of order`);
      assert.deepEqual(run.taps.at(-1), [run.pop, 'thud']);
      for (const track of [lump.h, lump.x, lump.w, lump.shake]) {
        for (let i = 1; i < track!.length; i++) assert.ok(track![i][0] >= track![i - 1][0], `seed ${seed}: canvas keys out of order`);
      }
    }
  }
});

test('the nav strip only feels him while he is on the bottom edge', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const { run } = ultraRun(PHONE, seeded(seed));
    const nav = ultraNav(run);
    for (let i = 0; i < run.u.length; i++) {
      const [, y] = rimPoint(run.u[i], PHONE);
      if (y < PHONE.H - PHONE.Rb) assert.equal(nav.h[i], 0, `seed ${seed}: felt up the wall at frame ${i}`);
      if (nav.h[i] > 0) assert.ok(Math.abs(nav.x[i]) <= 0.5, `seed ${seed}: off the strip at frame ${i}`);
    }
  }
});

test('no two runs are alike', () => {
  const runs = [1, 2, 3, 4, 5, 6].map((seed) => {
    const { run } = ultraRun(PHONE, seeded(seed));
    return JSON.stringify(run.u.filter((_, i) => i % 6 === 0).map((v) => Math.round(v / 20)));
  });
  assert.equal(new Set(runs).size, runs.length);
});
