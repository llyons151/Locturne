/// <reference types="node" />
/** Home's middle fades between states, not on every tick of a countdown. */
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { sceneKey } from './hero-swap.ts';
import type { HomeLook } from './home-look.ts';

const middle = (title: string, label = 'Edit schedule', look: HomeLook = 'day') => ({
  hero: { title, body: '' },
  heroKey: 0,
  action: { label, onPress: () => {} },
  look,
});

describe('sceneKey', () => {
  test('a ticking countdown or a climbing count stays the same state', () => {
    assert.equal(sceneKey(middle('Bedtime in 2h 13m')), sceneKey(middle('Bedtime in 45m')));
    assert.equal(sceneKey(middle('64 of 200 steps')), sceneKey(middle('120 of 200 steps')));
  });

  test('a unit or plural changing inside one state stays the same state', () => {
    assert.equal(sceneKey(middle('1.2 km to Gym')), sceneKey(middle('990 m to Gym')));
    assert.equal(sceneKey(middle('2 mi to Gym')), sceneKey(middle('800 ft to Gym')));
    assert.equal(sceneKey(middle('Hold for 2 more seconds')), sceneKey(middle('Hold for 1 more second')));
    assert.equal(sceneKey(middle('1 step to go')), sceneKey(middle('12 steps to go')));
  });

  test('turning Screen Time on is a new state', () => {
    assert.notEqual(sceneKey(middle("Screen Time isn't on", 'Turn on Screen Time')), sceneKey(middle('No bedtime scheduled', 'Pick bedtime apps')));
  });

  test('the last hour before bedtime is its own look', () => {
    assert.notEqual(sceneKey(middle('Bedtime in 1h 5m')), sceneKey(middle('Bedtime in 55m', 'Edit schedule', 'evening')));
  });
});
