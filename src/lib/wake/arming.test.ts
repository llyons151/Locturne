/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { planNightWindows } from '../night-plan.ts';
import { planArming, type ArmTimes } from './arming.ts';

const EVERY_NIGHT = [0, 1, 2, 3, 4, 5, 6];
const routine = (bedtime: number, morningStart: number, activeNights = EVERY_NIGHT): ArmTimes => ({
  bedtime,
  morningStart,
  activeNights,
});
const H = 60;
const usual = routine(23 * H, 7 * H);

/** Thursday 2026-10-01 at hh:mm, local time. */
const at = (hh: number, mm = 0, day = 1) => new Date(2026, 9, day, hh, mm);

const armedFor = (r: ArmTimes) => {
  const n = planNightWindows(r.bedtime, r.morningStart).length;
  return { bedtime: r.bedtime, morningStart: r.morningStart, windows: n, live: n };
};

describe('planArming', () => {
  test('arms the routine when nothing is armed', () => {
    const plan = planArming(at(14), usual, null, null);
    assert.equal(plan.action, 'arm');
    if (plan.action === 'arm') assert.deepEqual(plan.windows, planNightWindows(23 * H, 7 * H));
  });

  test('keeps windows that already match', () => {
    assert.equal(planArming(at(14), usual, null, armedFor(usual)).action, 'keep');
  });

  test('re-arms when iOS dropped some windows', () => {
    const armed = { ...armedFor(usual), live: 3 };
    assert.equal(planArming(at(14), usual, null, armed).action, 'arm');
  });

  test('switching nights off only matters when none are left', () => {
    const someOff = routine(23 * H, 7 * H, [1, 2, 3]);
    assert.equal(planArming(at(14), someOff, null, armedFor(usual)).action, 'keep');
    assert.equal(planArming(at(14), routine(23 * H, 7 * H, []), null, armedFor(usual)).action, 'disarm');
    assert.equal(planArming(at(14), routine(23 * H, 7 * H, []), null, null).action, 'keep');
  });

  test('a night too short to monitor disarms', () => {
    assert.equal(planArming(at(14), routine(7 * H - 10, 7 * H), null, armedFor(usual)).action, 'disarm');
  });

  test('a pending edit is armed during the day, ahead of its bedtime', () => {
    const next = routine(22 * H, 6 * H);
    const pending = { routine: next, from: at(23).getTime() };
    const plan = planArming(at(14), usual, pending, armedFor(usual));
    assert.equal(plan.action, 'arm');
    if (plan.action === 'arm') assert.deepEqual(plan.times, next);
  });

  test('waits when a later morning would re-shield apps already woken today', () => {
    // Saved at 7:05, after the walk. 8:00 windows would fire at 7:15 and 7:45 today.
    const next = routine(23 * H, 8 * H);
    const pending = { routine: next, from: at(23).getTime() };
    const plan = planArming(at(7, 5), usual, pending, armedFor(usual));
    assert.equal(plan.action, 'defer');
    if (plan.action === 'defer') assert.deepEqual(plan.until, at(8));
    // After 8:00 it's safe.
    assert.equal(planArming(at(8, 1), usual, pending, armedFor(usual)).action, 'arm');
  });

  test('an edit made in the night arms the new times straight away when they are no looser', () => {
    // 01:00, moving bedtime earlier: the night already began, nothing phantom ahead.
    const next = routine(22 * H, 7 * H);
    const pending = { routine: next, from: at(23, 0, 2).getTime() };
    assert.equal(planArming(at(1, 0, 2), usual, pending, armedFor(usual)).action, 'arm');
  });

  test('an edit made in the night with a later morning waits for that morning to pass', () => {
    const next = routine(23 * H, 9 * H);
    const pending = { routine: next, from: at(23, 0, 2).getTime() };
    const plan = planArming(at(1, 0, 2), usual, pending, armedFor(usual));
    assert.equal(plan.action, 'defer');
    if (plan.action === 'defer') assert.deepEqual(plan.until, at(9, 0, 2));
  });

  test('a much earlier bedtime is armed even though it fires before the edit applies', () => {
    // From 23:00 tonight the new routine is in force; firing from 21:00 tonight only tightens.
    const next = routine(21 * H, 7 * H);
    const pending = { routine: next, from: at(23).getTime() };
    assert.equal(planArming(at(20), usual, pending, armedFor(usual)).action, 'arm');
    // Even inside the new night already (22:00), since that night runs past the edit.
    assert.equal(planArming(at(22), usual, pending, armedFor(usual)).action, 'arm');
  });
});
