/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { getLockState, type LockSettings } from '../../lib/lock-state.ts';
import { fromWeekday, nightsToWeekdays, toWeekday, weekdaysToNights } from './nights.ts';

const MONDAY_FIRST = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

describe('night numbering', () => {
  test('each Monday-first night maps to the getDay() of its evening', () => {
    // 2026-10-05 is a Monday; the screen's night i starts on that date + i.
    MONDAY_FIRST.forEach((name, i) => {
      const evening = new Date(2026, 9, 5 + i, 22);
      assert.equal(evening.toLocaleDateString('en-US', { weekday: 'long' }), name);
      assert.equal(toWeekday(i), evening.getDay(), name);
    });
  });

  test('the two directions undo each other', () => {
    for (let i = 0; i < 7; i++) {
      assert.equal(fromWeekday(toWeekday(i)), i);
      assert.equal(toWeekday(fromWeekday(i)), i);
    }
  });

  test('lists come back sorted and without repeats', () => {
    assert.deepEqual(nightsToWeekdays([6, 0, 4]), [0, 1, 5]);
    assert.deepEqual(weekdaysToNights([0, 1, 5, 1]), [0, 4, 6]);
    assert.deepEqual(nightsToWeekdays([0, 1, 2, 3, 4, 5, 6]), [0, 1, 2, 3, 4, 5, 6]);
    assert.deepEqual(nightsToWeekdays([]), []);
  });
});

describe('the mapping drives the lock', () => {
  /** Only Sunday night picked on the Routine screen. */
  const settings: LockSettings = {
    bedtime: 23 * 60,
    morningStart: 7 * 60,
    stepGoal: 200,
    activeNights: nightsToWeekdays([6]),
    nightApps: ['night'],
    alwaysApps: [],
  };
  const facts = { steps: 0, unlockedMorning: null };

  test('Sunday night locks Sunday evening and Monday morning', () => {
    assert.equal(getLockState(new Date(2026, 9, 4, 23, 30), settings, facts).phase, 'night');
    assert.equal(getLockState(new Date(2026, 9, 5, 8), settings, facts).phase, 'morning');
  });

  test('Monday night is off, so Tuesday morning is free', () => {
    assert.equal(getLockState(new Date(2026, 9, 5, 23, 30), settings, facts).phase, 'off');
    assert.equal(getLockState(new Date(2026, 9, 6, 8), settings, facts).phase, 'day');
  });
});
