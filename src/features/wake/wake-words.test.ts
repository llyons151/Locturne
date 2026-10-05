/// <reference types="node" />

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { dayStatus, unheldWakeBody, wakeLabel, wakePhase } from './wake-words.ts';

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

test('a morning nothing holds (after the last paid one) is day: no method, "Today"', () => {
  assert.equal(wakePhase('morning', 'day'), 'day');
  assert.equal(wakeLabel(wakePhase('morning', 'day'), false), 'Today');
  assert.equal(wakePhase('morning', 'morning'), 'morning');
});

test('other phases go by the clock (an unheld night says why in NotMorning)', () => {
  assert.equal(wakePhase('night', 'day'), 'night');
  assert.equal(wakePhase('night', 'night'), 'night');
  assert.equal(wakePhase('day', 'day'), 'day');
  assert.equal(wakePhase('off', 'off'), 'off');
});

test('an unheld morning never says tonight', () => {
  assert.doesNotMatch(unheldWakeBody('morning'), /tonight/);
  assert.match(unheldWakeBody('night'), /tonight/);
});
