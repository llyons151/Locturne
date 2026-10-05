/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { lapseLine } from './lapse-line.ts';

describe('lapseLine', () => {
  test('found at night: the night and its morning finish, then nothing sleeps', () => {
    const line = lapseLine('night');
    assert.match(line, /no subscription/);
    assert.match(line, /Tonight still counts\. After this morning, nothing sleeps\.$/);
    assert.doesNotMatch(line, /on schedule/);
  });

  test('found in the morning: this morning counts', () => {
    assert.match(lapseLine('morning'), /This morning still counts\. After it, nothing sleeps\.$/);
  });

  test('in the day: nothing sleeps from the next bedtime', () => {
    assert.match(lapseLine('day'), /From the next bedtime, nothing sleeps\.$/);
  });

  test('a night or morning after the last paid one: nothing sleeps now, no "still counts"', () => {
    const line = lapseLine(null);
    assert.match(line, /no subscription, so nothing sleeps\.$/);
    assert.doesNotMatch(line, /still counts|next bedtime/);
  });
});
