/// <reference types="node" />

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { awakeBody, morningName, savedBody } from './next-morning.ts';

// 2026-10-05 is a Monday.
const at = (day: number, h: number, m = 0) => new Date(2026, 9, day, h, m);
const weekday = (d: Date) => d.toLocaleDateString(undefined, { weekday: 'long' });

test('in the small hours before a 1 am bedtime, the next morning is this one', () => {
  assert.equal(awakeBody(at(6, 7), at(6, 0, 30)), 'Nothing to scan for until this morning.');
});

test('in the day, it’s tomorrow morning', () => {
  assert.equal(awakeBody(at(6, 7), at(5, 14)), 'Nothing to scan for until tomorrow morning.');
});

test('the next night off: the weekday of the morning that’s on', () => {
  assert.equal(morningName(at(8, 7), at(5, 14)), `${weekday(at(8, 7))} morning`);
  assert.equal(morningName(at(12, 7), at(5, 14)), `next ${weekday(at(12, 7))} morning`);
});

test('every night off', () => {
  assert.equal(awakeBody(null, at(5, 14)), 'Every night is off, so there’s nothing to scan for.');
});

test('a saved code names the morning it’s first wanted', () => {
  assert.equal(savedBody(at(6, 7), at(5, 14)), 'Tomorrow morning, scan it and your apps wake up.');
  assert.equal(savedBody(at(6, 7), at(6, 0, 30)), 'This morning, scan it and your apps wake up.');
  assert.equal(savedBody(at(8, 7), at(5, 14)), `${weekday(at(8, 7))} morning, scan it and your apps wake up.`);
  assert.equal(savedBody(null, at(5, 14)), 'Every night is off. When one’s on, scan it to wake your apps.');
});

test('nothing scheduled to sleep (never bought, Ask to Buy, stood down, unpaid): no morning is named', () => {
  for (const now of [at(5, 14), at(6, 0, 30), at(6, 7, 30)]) {
    const awake = awakeBody('unscheduled', now);
    const saved = savedBody('unscheduled', now);
    assert.equal(awake, 'Nothing is scheduled to sleep, so there’s nothing to scan for.');
    assert.equal(saved, 'Nothing is scheduled to sleep yet. When it is, scan it in the morning and your apps wake up.');
    for (const line of [awake, saved]) assert.doesNotMatch(line, /tomorrow|this morning|Every night/i);
  }
});
