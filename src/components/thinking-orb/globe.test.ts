/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { globeFrame, LAYERS, orbTime } from './globe.ts';

const dots = (d: string) => d.split('M').length - 1;

describe('globeFrame', () => {
  for (const size of [20, 64] as const) {
    test(`size ${size}: every lattice dot is drawn once, inside the frame`, () => {
      const frame = globeFrame(size, orbTime(size, 12.3));
      assert.equal(frame.length, LAYERS);
      // latRings + 1 rings, round(|cos lat| × lonDensity) dots each, at least one at the poles.
      const [rings, density] = size === 64 ? [11, 29] : [6, 14];
      let expected = 0;
      for (let i = 0; i <= rings; i++) expected += Math.max(1, Math.round(Math.abs(Math.cos(-Math.PI / 2 + (i / rings) * Math.PI)) * density));
      assert.equal(frame.reduce((n, layer) => n + dots(layer.d), 0), expected);
      for (const { d, opacity } of frame) {
        assert.ok(opacity >= 0 && opacity <= 1);
        for (const n of d.match(/-?\d+\.\d+/g) ?? []) assert.ok(Math.abs(Number(n)) <= size);
      }
    });
  }

  test('nearer layers carry more ink, so far dots sit dim behind', () => {
    const frame = globeFrame(64, 3);
    const lit = frame.filter((layer) => layer.d);
    assert.ok(lit[lit.length - 1].opacity > lit[0].opacity);
  });

  test('it moves', () => {
    assert.notDeepEqual(globeFrame(20, 1), globeFrame(20, 1.2));
  });
});
