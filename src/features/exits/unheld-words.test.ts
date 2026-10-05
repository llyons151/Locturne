/// <reference types="node" />

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { unheldBody, unheldNoCode } from './unheld-words.ts';

test('a night nothing holds keeps its words', () => {
  assert.equal(unheldBody('night', true), 'Nothing is asleep tonight.');
  assert.equal(
    unheldBody('night', false),
    'Your bedtime apps are awake tonight. The emergency unlock can still end a Block now session.',
  );
  assert.equal(unheldNoCode('night'), 'No code yet, and it can’t be set up from bed. Your bedtime apps are awake tonight anyway.');
});

test('a morning nothing holds (after the last paid one) never says tonight or offers a pass', () => {
  for (const line of [unheldBody('morning', true), unheldBody('morning', false), unheldNoCode('morning')]) {
    assert.doesNotMatch(line, /tonight|pass/i);
    assert.match(line, /this morning/);
  }
});
