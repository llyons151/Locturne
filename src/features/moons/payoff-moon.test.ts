/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { payoffMoon } from './payoff-moon.ts';
import type { MoonDef } from './moon-types.ts';

const moon = (id: string) => ({ id, name: id }) as MoonDef;
const MOONS = ['moonlight', 'dawn', 'harvest', 'ringed', 'twin-moonlet'].map(moon);
const base = { moons: MOONS, worn: 'moonlight' };

test('no new moon: nothing to show, nothing to wear', () => {
  assert.deepEqual(payoffMoon({ ...base, newMoons: [] }), { moon: null, more: 0, toWear: null });
});

test('an id no longer in the build (a re-baked lab) is ignored, not a crash', () => {
  assert.equal(payoffMoon({ ...base, newMoons: ['gone'] }).moon, null);
});

test('a ladder moon shows at once with Wear', () => {
  const out = payoffMoon({ ...base, newMoons: ['harvest'] });
  assert.equal(out.moon?.id, 'harvest');
  assert.equal(out.toWear?.id, 'harvest');
});

test('once worn, Wear gives way to Done', () => {
  assert.equal(payoffMoon({ ...base, newMoons: ['harvest'], worn: 'harvest' }).toWear, null);
});

test('the rare and the secret show at once with Apply, like any other', () => {
  for (const id of ['ringed', 'twin-moonlet']) {
    const out = payoffMoon({ ...base, newMoons: [id] });
    assert.equal(out.moon?.id, id);
    assert.equal(out.toWear?.id, id);
  }
});

test('several at once: the first shows, the rest are counted', () => {
  const out = payoffMoon({ ...base, newMoons: ['harvest', 'dawn'] });
  assert.equal(out.moon?.id, 'harvest');
  assert.equal(out.more, 1);
});
