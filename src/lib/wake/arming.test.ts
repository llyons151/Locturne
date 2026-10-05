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

  test('turning every night off waits for bedtime: the night and morning under way stay locked', () => {
    const none = routine(23 * H, 7 * H, []);
    // Saved at 07:30, before the walk, and at 01:00 in bed.
    for (const [now, from] of [
      [at(7, 30), at(23)],
      [at(1, 0, 2), at(23, 0, 2)],
    ]) {
      const plan = planArming(now, usual, { routine: none, from: from.getTime() }, armedFor(usual));
      assert.equal(plan.action, 'defer');
      if (plan.action === 'defer') assert.deepEqual(plan.until, from);
    }
    // Once that bedtime has come, the windows go.
    assert.equal(planArming(at(23, 1), usual, { routine: none, from: at(23).getTime() }, armedFor(usual)).action, 'disarm');
  });

  test('a night made too short waits for bedtime too', () => {
    const short = routine(7 * H - 10, 7 * H);
    assert.equal(planArming(at(7, 30), usual, { routine: short, from: at(23).getTime() }, armedFor(usual)).action, 'defer');
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

  test('an earlier bedtime on an evening that is off waits: the extension would skip it and wake the apps', () => {
    // Found by the simulation (lock-controller.sim.test.ts, seed 193). Thursday evening is off,
    // and this morning was never proven, so it stays locked until the old bedtime, 00:00.
    // Windows from 22:30 would fire before the edit applies; the extension, still reading the
    // routine in force, sees Thursday evening off and unshields the bedtime apps at 22:30.
    const weekdays = [1, 3, 5];
    const active = routine(0, 7 * H, weekdays);
    const next = routine(22 * H + 30, 7 * H, weekdays);
    const from = at(0, 0, 2); // Friday 00:00, the next bedtime under the routine in force
    const pending = { routine: next, from: from.getTime() };
    const plan = planArming(at(11), active, pending, armedFor(active));
    assert.equal(plan.action, 'defer');
    if (plan.action === 'defer') assert.deepEqual(plan.until, from);
    // The same edit with Thursday evening on is armed: the early window only tightens.
    const on = routine(0, 7 * H, [1, 3, 4, 5]);
    assert.equal(planArming(at(11), on, { routine: { ...next, activeNights: [1, 3, 4, 5] }, from: from.getTime() }, armedFor(on)).action, 'arm');
    // Once the edit applies, it's armed.
    assert.equal(planArming(at(0, 1, 2), next, null, armedFor(active)).action, 'arm');
  });

  test('an earlier bedtime that also switches tonight off waits: it never tightens', () => {
    // Thursday 14:00: bedtime 21:30 and Thursday evening off, waiting for 23:00. The extension
    // judges the 21:30 to 22:58 windows by the routine in force (Thursday on) and would shield
    // them, while under both routines tonight is awake from 21:30 to 23:00.
    const next = routine(21 * H + 30, 7 * H, [0, 1, 2, 3, 5, 6]);
    const pending = { routine: next, from: at(23).getTime() };
    const plan = planArming(at(14), usual, pending, armedFor(usual));
    assert.equal(plan.action, 'defer');
    if (plan.action === 'defer') assert.deepEqual(plan.until, at(23));
  });

  test('the same in two saves: windows armed for the earlier bedtime go back to the routine in force', () => {
    // The bedtime save armed 21:30's windows; switching Thursday off keeps the same times, so
    // they look current, but they'd shield tonight from 21:30.
    const next = routine(21 * H + 30, 7 * H, [0, 1, 2, 3, 5, 6]);
    const pending = { routine: next, from: at(23).getTime() };
    const plan = planArming(at(14, 1), usual, pending, armedFor(next));
    assert.equal(plan.action, 'arm');
    if (plan.action === 'arm') assert.deepEqual(plan.times, usual);
    // Then it waits for the edit, as if saved in one go.
    assert.equal(planArming(at(14, 2), usual, pending, armedFor(usual)).action, 'defer');
    assert.equal(planArming(at(23, 1), next, null, armedFor(usual)).action, 'arm');
  });
});

describe('planArming: windows still armed for older times', () => {
  // A later bedtime saved after the walk waited out a phantom night, and nothing re-armed with
  // the app closed: at 23:00 the old windows shield, a night the lock follows (`asArmed`).
  const later = routine(0, 9 * H);
  test('waits while they hold a night the routine\'s own bedtime hasn\'t reached', () => {
    assert.deepEqual(planArming(at(23, 30), later, null, armedFor(usual)), { action: 'defer', until: at(0, 0, 2) });
  });
  test('arms once its own night is under way, or in the day', () => {
    assert.equal(planArming(at(0, 15, 2), later, null, armedFor(usual)).action, 'arm');
    assert.equal(planArming(at(14), later, null, armedFor(usual)).action, 'arm');
  });
  test('arms at once on an evening that is off: the extension skipped those windows', () => {
    const thursdayOff = routine(0, 9 * H, [0, 1, 2, 3, 5, 6]);
    assert.equal(planArming(at(23, 30), thursdayOff, null, armedFor(usual)).action, 'arm');
  });
  test('an earlier bedtime arms at once: its night starts now', () => {
    assert.equal(planArming(at(21, 15), routine(21 * H, 5 * H), null, armedFor(routine(22 * H + 30, 5 * H))).action, 'arm');
  });
});

describe('planArming: a phantom night on an evening the routine in force has off', () => {
  test('arms at once: the extension skips those windows, and waiting would leave the old ones to run', () => {
    // Weeknights 08:00 to 09:00 (Monday to Friday evenings); at 08:00 Saturday, 21:00 to 05:00
    // is saved, applying at 08:00 Sunday. Its Saturday-evening windows fall before that, in a
    // night the routine in force doesn't have, but Saturday is off under it.
    const weekdays = [1, 2, 3, 4, 5];
    const active = routine(8 * H, 9 * H, weekdays);
    const target = routine(21 * H, 5 * H, weekdays);
    const pending = { routine: target, from: at(8, 0, 4).getTime() };
    assert.equal(planArming(at(8, 0, 3), active, pending, armedFor(active)).action, 'arm');
    // Every evening on: Saturday 21:00 would shield a phantom night, so it waits for it to end.
    const daily = { routine: routine(21 * H, 5 * H), from: pending.from };
    assert.deepEqual(planArming(at(8, 0, 3), routine(8 * H, 9 * H), daily, armedFor(routine(8 * H, 9 * H))), {
      action: 'defer',
      until: at(5, 0, 4),
    });
  });
});
