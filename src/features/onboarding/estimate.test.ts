/// <reference types="node" />

/**
 * The onboarding value number (estimate.ts). Its rule is "never overstate": every figure
 * rounds down, and odd schedules (after midnight, shift work) still give a sane night.
 */
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  estimate,
  formatClock,
  formatHalves,
  formatHoursFromMinutes,
  formatWhen,
  isInsideBedtime,
  lifetimeSentence,
  weeklyAmount,
  type EstimateInput,
} from './estimate.ts';

const input: EstimateInput = { nightMinutes: 45, morningMinutes: 20, nightsPerWeek: 7, bedtime: 23 * 60 + 30, wake: 7 * 60, age: 22 };

describe('estimate', () => {
  test('a typical week', () => {
    const e = estimate(input);
    assert.equal(e.weeklyMinutes, 455);
    assert.equal(e.morningWeeklyMinutes, 140);
    assert.equal(e.weeklyHours, 7.5); // 455 min rounds down to 7½ hours, never up
    assert.equal(e.yearlyHours, 394); // 455 × 52 / 60 = 394.3
    assert.equal(e.yearlyDays, 16);
    assert.equal(e.yearsLeft, 57);
    assert.equal(e.lifetimeDays, 935); // 394 × 57 / 24 = 935.75
    assert.equal(e.timeInBed, 450);
    assert.equal(e.sleepRoom, 450 - 45 - 15);
    assert.equal(e.lightUser, false);
    assert.equal(e.scheduleLooksWrong, false);
  });

  test('bedtime at or after midnight', () => {
    assert.equal(estimate({ ...input, bedtime: 0, wake: 7 * 60 }).timeInBed, 420);
    assert.equal(estimate({ ...input, bedtime: 60, wake: 7 * 60 }).timeInBed, 360);
  });

  test('a daytime sleeper (shift work) gets a normal night', () => {
    assert.equal(estimate({ ...input, bedtime: 8 * 60, wake: 15 * 60 }).timeInBed, 420);
  });

  test('bedtime equal to wake reads as a full day and is flagged', () => {
    const e = estimate({ ...input, bedtime: 0, wake: 0 });
    assert.equal(e.timeInBed, 24 * 60);
    assert.equal(e.scheduleLooksWrong, true);
  });

  test('scheduleLooksWrong at its 3-hour and 14-hour edges', () => {
    const night = (minutes: number) => estimate({ ...input, bedtime: 0, wake: minutes }).scheduleLooksWrong;
    assert.equal(night(3 * 60 - 1), true);
    assert.equal(night(3 * 60), false);
    assert.equal(night(14 * 60), false);
    assert.equal(night(14 * 60 + 1), true);
  });

  test('no phone time: every figure is zero, nothing negative', () => {
    const e = estimate({ ...input, nightMinutes: 0, morningMinutes: 0 });
    for (const key of ['weeklyMinutes', 'weeklyHours', 'yearlyHours', 'yearlyDays', 'lifetimeDays'] as const) {
      assert.equal(e[key], 0, key);
    }
    assert.equal(e.lightUser, true);
  });

  test('sleep room never goes negative', () => {
    assert.equal(estimate({ ...input, nightMinutes: 600, bedtime: 23 * 60, wake: 6 * 60 }).sleepRoom, 0);
  });

  test('no age, or past the average lifespan: no lifetime figure', () => {
    assert.equal(estimate({ ...input, age: undefined }).lifetimeDays, 0);
    assert.equal(estimate({ ...input, age: 79 }).lifetimeDays, 0);
    assert.equal(estimate({ ...input, age: 85 }).yearsLeft, 0);
  });

  test('teens are held to 8 hours of sleep, adults to 7', () => {
    assert.equal(estimate({ ...input, age: 17 }).sleepNeed, 8 * 60);
    assert.equal(estimate({ ...input, age: 18 }).sleepNeed, 7 * 60);
    assert.equal(estimate({ ...input, age: undefined }).sleepNeed, 7 * 60);
  });
});

describe('wording', () => {
  test('weeklyAmount agrees with weeklyHours from an hour up', () => {
    for (let minutes = 60; minutes < 2000; minutes++) {
      const hours = estimate({ ...input, nightMinutes: minutes, morningMinutes: 0, nightsPerWeek: 1 }).weeklyHours;
      assert.equal(weeklyAmount(minutes), hours === 1 ? '1 hour' : `${formatHalves(hours)} hours`, `${minutes} min`);
    }
  });

  test('weeklyAmount under an hour', () => {
    assert.equal(weeklyAmount(27), '25 minutes');
    assert.equal(weeklyAmount(30), 'half an hour');
    assert.equal(weeklyAmount(59), 'half an hour');
  });

  test('halves', () => {
    assert.equal(formatHalves(0), '0');
    assert.equal(formatHalves(0.5), '½');
    assert.equal(formatHalves(7.5), '7½');
    assert.equal(formatHoursFromMinutes(389), '6');
    assert.equal(formatHoursFromMinutes(390), '6½');
  });

  test('lifetime sentence only from a full year', () => {
    assert.equal(lifetimeSentence(364), '');
    assert.equal(lifetimeSentence(365), 'That’s over a year of your life.');
    assert.equal(lifetimeSentence(5 * 365 + 200), 'That’s over 5 years of your life.');
  });

  test('clock times', () => {
    assert.equal(formatClock(23 * 60 + 30), '11:30 PM');
    assert.equal(formatClock(0), '12:00 AM');
    assert.equal(formatClock(24 * 60 + 5), '12:05 AM');
    assert.equal(formatClock(-30), '11:30 PM');
    assert.equal(formatWhen(0), 'midnight');
    assert.equal(formatWhen(12 * 60), 'noon');
  });
});

describe('isInsideBedtime', () => {
  const at = (h: number, m = 0) => new Date(2026, 9, 3, h, m);

  test('a bedtime before midnight', () => {
    assert.equal(isInsideBedtime(23 * 60, 7 * 60, at(22, 59)), false);
    assert.equal(isInsideBedtime(23 * 60, 7 * 60, at(23, 0)), true);
    assert.equal(isInsideBedtime(23 * 60, 7 * 60, at(3)), true);
    assert.equal(isInsideBedtime(23 * 60, 7 * 60, at(7, 0)), false);
  });

  test('a bedtime at midnight', () => {
    assert.equal(isInsideBedtime(0, 7 * 60, at(23, 59)), false);
    assert.equal(isInsideBedtime(0, 7 * 60, at(0, 0)), true);
  });

  test('bedtime equal to wake is never inside', () => {
    assert.equal(isInsideBedtime(0, 0, at(0, 0)), false);
  });
});
