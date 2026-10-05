/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { awakeLine } from './awake-line.ts';

describe('awakeLine', () => {
  test('an armed night names its bedtime', () => {
    assert.equal(awakeLine({ armed: true, stoodDown: false, tonightAt: '11 pm', alwaysSleeps: true }), 'Apps awake until 11 pm');
  });

  test('a night off says so', () => {
    assert.equal(awakeLine({ armed: true, stoodDown: false, tonightAt: null, alwaysSleeps: true }), 'Apps awake. Tonight is off.');
  });

  test('stood down (lapsed, never bought, Ask to Buy waiting): nothing is scheduled, always list included', () => {
    for (const tonightAt of ['11 pm', null]) {
      const line = awakeLine({ armed: false, stoodDown: true, tonightAt, alwaysSleeps: true });
      assert.equal(line, 'Apps awake. Nothing is scheduled to sleep.');
      assert.doesNotMatch(line, /until|Always/);
    }
  });

  test('arming failed: no bedtime named, and the always list still sleeps', () => {
    const line = awakeLine({ armed: false, stoodDown: false, tonightAt: '11 pm', alwaysSleeps: true });
    assert.doesNotMatch(line, /until/);
    assert.match(line, /Always-asleep apps still sleep/);
  });

  test('nothing armed and no always-asleep apps picked: nothing is said to sleep', () => {
    const line = awakeLine({ armed: false, stoodDown: false, tonightAt: '11 pm', alwaysSleeps: false });
    assert.equal(line, 'Apps awake. Nothing is scheduled to sleep.');
    assert.doesNotMatch(line, /until|Always/);
  });
});
