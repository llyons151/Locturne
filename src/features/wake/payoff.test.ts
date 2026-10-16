/// <reference types="node" />

/** The morning payoff's words (payoff.ts). */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { clockParts, lateWords, payoffKicker, payoffLine, shareText } from './payoff.ts';

const nb = (s: string) => s.replace(/(\d) (am|pm)/g, '$1\u00a0$2');

test('the kicker names milestones and numbers the rest', () => {
  assert.equal(payoffKicker(1), 'Your first morning');
  assert.equal(payoffKicker(7), 'A week of mornings');
  assert.equal(payoffKicker(12), 'Morning 12');
});

test('the clock splits off am and pm', () => {
  assert.deepEqual(clockParts(7 * 60 + 6), { value: '7:06', unit: 'am' });
  assert.deepEqual(clockParts(0), { value: '12:00', unit: 'am' });
  assert.deepEqual(clockParts(12 * 60 + 30), { value: '12:30', unit: 'pm' });
});

test('how late reads in minutes, hours, or right at the start', () => {
  assert.equal(lateWords(420, 420), nb('Right at 7:00 am'));
  assert.equal(lateWords(421, 420), nb('Right at 7:00 am'));
  assert.equal(lateWords(426, 420), nb('6 min after 7:00 am'));
  assert.equal(lateWords(492, 420), nb('1 h 12 min after 7:00 am'));
  assert.equal(lateWords(480, 420), nb('1 h after 7:00 am'));
  // A 23:30 morning start, up at 00:10.
  assert.equal(lateWords(10, 23 * 60 + 30), nb('40 min after 11:30 pm'));
});

test('the line says the method, then the timing', () => {
  assert.equal(payoffLine('downstairs', 426, 420), nb('Down the stairs, 6 min after 7:00 am. Your apps are awake.'));
  assert.equal(payoffLine('steps', 420, 420), nb('Steps walked, right at 7:00 am. Your apps are awake.'));
});

test('the share text', () => {
  assert.equal(shareText(1, 426), nb('Up at 7:06 am. My first morning out of bed with Locturne.'));
  assert.equal(shareText(12, 426), nb('Up at 7:06 am. Morning 12 out of bed with Locturne.'));
});
