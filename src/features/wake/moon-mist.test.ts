/// <reference types="node" />

/** The payoff moon's mist (moon-mist.ts): it pours off the rim and falls, never fills the moon, and stays in range. */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { MoonMist } from './moon-mist.ts';

const moon = { x: 33, y: 38, r: 18, vx: 0, vy: 0 };

function run(seconds: number, m = new MoonMist(66, 141), at = moon) {
  for (let t = 0; t < seconds; t += 1 / 60) m.step(1 / 60, at);
  return m;
}

/** Total mist in rows from `j0` to `j1`. */
function rows(m: MoonMist, j0: number, j1: number) {
  let sum = 0;
  for (let j = j0; j < j1; j++) for (let i = 0; i < m.nx; i++) sum += m.density[j * m.nx + i];
  return sum;
}

test('mist falls off the bottom more than it climbs off the top', () => {
  const m = run(4);
  const above = rows(m, 0, moon.y - moon.r - 4);
  const below = rows(m, moon.y + moon.r + 4, m.ny);
  assert.ok(below > above * 3, `below ${below.toFixed(1)} vs above ${above.toFixed(1)}`);
});

test('no mist inside the moon, and every cell stays between 0 and 1', () => {
  const m = run(3);
  for (let j = 0; j < m.ny; j++) {
    for (let i = 0; i < m.nx; i++) {
      const d = m.density[j * m.nx + i];
      assert.ok(d >= 0 && d <= 1 && Number.isFinite(d));
      if (Math.hypot(i + 0.5 - moon.x, j + 0.5 - moon.y) < moon.r - 1) assert.equal(d, 0);
    }
  }
});

test('it fades: far below the moon stays thin', () => {
  const m = run(6);
  const far = rows(m, moon.y + moon.r * 4, m.ny) / (m.nx * (m.ny - (moon.y + moon.r * 4)));
  assert.ok(far < 0.02, `far mean ${far.toFixed(3)}`);
});

test('a rising moon leaves its trail behind it, not piled on top', () => {
  const m = new MoonMist(66, 141);
  let y = 120;
  for (let t = 0; t < 1.2; t += 1 / 60) {
    y -= 70 / 60;
    m.step(1 / 60, { x: 33, y, r: 18, vx: 0, vy: -70 });
  }
  const ahead = rows(m, 0, Math.floor(y - 18 - 2));
  const behind = rows(m, Math.ceil(y + 18 + 2), m.ny);
  assert.ok(behind > ahead * 3, `behind ${behind.toFixed(1)} vs ahead ${ahead.toFixed(1)}`);
});
