/// <reference types="node" />

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { offBody, unheldBody } from './unheld-words.ts';

test('a night nothing holds keeps its words', () => {
  assert.equal(unheldBody('night', true), 'Nothing is asleep tonight.');
  assert.equal(
    unheldBody('night', false),
    'Your bedtime apps are awake tonight. A pass can still end a Block now session.',
  );
});

test('a morning nothing holds (after the last paid one) never says tonight or offers a pass', () => {
  for (const line of [unheldBody('morning', true), unheldBody('morning', false)]) {
    // A pass can still end a Block now, but none is offered for the morning itself.
    assert.doesNotMatch(line, /tonight|use a pass|pass wakes/i);
    assert.match(line, /this morning/);
  }
});

test('a night off says nothing is locked only when nothing sleeps', () => {
  assert.match(offBody({ alwaysSleeps: false, napUntil: null }), /^Nothing is locked tonight\./);
  for (const line of [
    offBody({ alwaysSleeps: true, napUntil: null }),
    offBody({ alwaysSleeps: false, napUntil: '12:30 AM' }),
    offBody({ alwaysSleeps: true, napUntil: '12:30 AM' }),
  ]) {
    assert.doesNotMatch(line, /Nothing is locked/);
    assert.match(line, /^Bedtime apps awake tonight\./);
  }
  assert.match(offBody({ alwaysSleeps: true, napUntil: null }), /Always-asleep apps still sleep\./);
  assert.match(offBody({ alwaysSleeps: false, napUntil: '12:30 AM' }), /Block now: apps asleep until 12:30 AM\./);
});
