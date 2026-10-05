/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { shownLine } from './nap-line.ts';

describe('shownLine', () => {
  test('a nap ended by a pass, an emergency or a lapse stops saying "tucked in"', () => {
    assert.equal(shownLine('napping', false), 'ended');
  });

  test('a running nap reads as napping, even one found on focus', () => {
    assert.equal(shownLine('idle', true), 'napping');
    assert.equal(shownLine('napping', true), 'napping');
  });

  test('the tab’s own endings keep their lines', () => {
    assert.equal(shownLine('woken', false), 'woken');
    assert.equal(shownLine('ended', false), 'ended');
    assert.equal(shownLine('idle', false), 'idle');
  });
});
