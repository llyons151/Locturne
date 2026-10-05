/// <reference types="node" />

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { dayStatus, wakeLabel } from './wake-words.ts';

test('the top bar names the time as Home does', () => {
  assert.equal(wakeLabel('night', false), 'Tonight');
  assert.equal(wakeLabel('off', false), 'Tonight');
  assert.equal(wakeLabel('morning', false), 'This morning');
  assert.equal(wakeLabel('day', false), 'Today');
  assert.equal(wakeLabel('morning', true), 'Today');
});

test('a Block now running is what the day line says', () => {
  const until = new Date(2026, 9, 5, 9, 30);
  assert.equal(dayStatus(until, 'Apps awake until 11 pm'), 'Block now: apps asleep until 9:30 am.');
});

test('otherwise the awake line, with a full stop', () => {
  assert.equal(dayStatus(null, 'Apps awake until 11 pm'), 'Apps awake until 11 pm.');
  assert.equal(dayStatus(null, 'Apps awake. Tonight is off.'), 'Apps awake. Tonight is off.');
});
