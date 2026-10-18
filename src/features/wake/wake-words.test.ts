/// <reference types="node" />

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { dayStatus } from './wake-words.ts';

test('a Block now running is what the day line says', () => {
  const until = new Date(2026, 9, 5, 9, 30);
  assert.equal(dayStatus(until, 'Apps awake until 11 pm'), 'Block now: apps asleep until 9:30 am.');
});

test('otherwise the awake line, with a full stop', () => {
  assert.equal(dayStatus(null, 'Apps awake until 11 pm'), 'Apps awake until 11 pm.');
  assert.equal(dayStatus(null, 'Apps awake. Tonight is off.'), 'Apps awake. Tonight is off.');
});
