/// <reference types="node" />
/** Home's middle fades between states, not on every tick of a countdown. */
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { sceneKey } from './hero-swap.ts';

const middle = (title: string, label = 'Edit schedule') => ({ hero: { title, body: '' }, heroKey: 0, action: { label, onPress: () => {} } });

describe('sceneKey', () => {
  test('a ticking countdown or a climbing count stays the same state', () => {
    assert.equal(sceneKey(middle('Bedtime in 2h 13m')), sceneKey(middle('Bedtime in 45m')));
    assert.equal(sceneKey(middle('64 of 200 steps')), sceneKey(middle('120 of 200 steps')));
  });

  test('turning Screen Time on is a new state', () => {
    assert.notEqual(sceneKey(middle("Screen Time isn't on", 'Turn on Screen Time')), sceneKey(middle('No bedtime scheduled', 'Pick bedtime apps')));
  });
});
