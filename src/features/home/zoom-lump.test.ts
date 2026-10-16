/// <reference types="node" />

/** Loc's zoomies (loc-zoomies.ts): wild, never the same twice, but always edge to edge and out in the middle. */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { zoomLump } from './loc-zoomies.ts';

const seeded = (seed: number) => {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
};

test('every run reaches both edges, keeps its keys in order, and bursts out where he lives', () => {
  for (let seed = 1; seed <= 200; seed++) {
    const { pop, lump } = zoomLump(seeded(seed), 1);
    for (const [name, track] of Object.entries({ h: lump.h, x: lump.x, w: lump.w, shake: lump.shake })) {
      for (let i = 1; i < track!.length; i++) assert.ok(track![i][0] >= track![i - 1][0], `seed ${seed}: ${name} keys out of order at ${i}`);
    }
    const xs = lump.x.map(([, v]) => v as number);
    assert.ok(Math.max(...xs) >= 0.45 * 0.85 && Math.min(...xs) <= -0.45 * 0.85, `seed ${seed}: didn't reach both edges`);
    assert.ok(xs.every((v) => Math.abs(v) <= 0.45 + 1e-9), `seed ${seed}: ran off the edge`);
    assert.equal(xs.at(-1), 0, `seed ${seed}: brakes where he lives`);
    assert.ok(pop > lump.x.at(-1)![0] && pop < 9000, `seed ${seed}: pops at ${pop}`);
  }
});

test('no two runs are alike', () => {
  const runs = [1, 2, 3, 4, 5].map((seed) => JSON.stringify(zoomLump(seeded(seed)).lump.x.map(([t, v]) => [Math.round(t / 50), Math.round((v as number) * 20)])));
  assert.equal(new Set(runs).size, runs.length);
});
