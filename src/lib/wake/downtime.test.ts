/// <reference types="node" />

/**
 * Step away's rules (downtime.ts): when the timer starts, whose it is, when it's over, and the
 * lock rules it meets (bedtime wins; a proof only counts in its morning). The whole morning on the
 * simulated phone is in wake-methods.sim.test.ts; the shield's half in native-tests/DowntimeTests.swift.
 */
import assert from 'node:assert/strict';
import { describe, mock, test } from 'node:test';

import { fakeDeviceActivity } from '../fake-device-activity.ts';
import { currentMorning, getLockState, type LockSettings } from '../lock-state.ts';
import {
  DEFAULT_DOWNTIME_MINUTES,
  DEFAULT_DOWNTIME_STEPS,
  downtimeDue,
  downtimeFor,
  downtimeMinutesOf,
  downtimePhase,
  downtimeStepsOf,
  findThresholdTime,
  minutesLabel,
  minutesLeft,
  planDowntime,
  THRESHOLD_RESOLUTION_MS,
} from './downtime.ts';
import { downtimeLine } from './lines.ts';

// morning-proof.ts reads the App Group through screen-time.ts; its rules here are pure.
mock.module('react-native-device-activity', { namedExports: fakeDeviceActivity({ available: false }).exports });
const { proofCounts } = await import('../morning-proof.ts');

const MIN = 60_000;
/** Tuesday 2026-10-06 at hh:mm, local time. */
const at = (h: number, m = 0, s = 0, day = 6) => new Date(2026, 9, day, h, m, s).getTime();

const settings: LockSettings = {
  bedtime: 23 * 60,
  morningStart: 7 * 60,
  stepGoal: 200,
  activeNights: [0, 1, 2, 3, 4, 5, 6],
  nightApps: ['night'],
  alwaysApps: ['always'],
};
const morning = currentMorning(new Date(at(7, 30)), settings);

/** A pedometer history: one step at each of these times; a query counts those in [from, to). */
function history(steps: number[]) {
  const asked: [number, number][] = [];
  const query = async (from: number, to: number) => {
    asked.push([from, to]);
    return steps.filter((t) => t >= from && t < to).length;
  };
  return { query, asked };
}
/** `n` steps a second apart from `from`. */
const walk = (from: number, n: number) => Array.from({ length: n }, (_, i) => from + i * 1000);

describe('the numbers', () => {
  test('defaults: 30 steps (fixed) and an hour', () => {
    assert.equal(DEFAULT_DOWNTIME_STEPS, 30);
    assert.equal(DEFAULT_DOWNTIME_MINUTES, 60);
    assert.equal(downtimeStepsOf({}), 30);
    assert.equal(downtimeMinutesOf({}), 60);
  });

  test('the steps are fixed: a count saved while it was a setting is ignored; minutes stay on their wheel', () => {
    assert.equal(downtimeStepsOf({ downtimeSteps: 0 }), 30);
    assert.equal(downtimeStepsOf({ downtimeSteps: 200 }), 30);
    assert.equal(downtimeStepsOf({ downtimeSteps: Number.NaN }), 30);
    assert.equal(downtimeMinutesOf({ downtimeMinutes: 1 }), 15);
    assert.equal(downtimeMinutesOf({ downtimeMinutes: 600 }), 120);
    assert.equal(downtimeMinutesOf({ downtimeMinutes: 90 }), 90);
  });

  test('minutes in words', () => {
    assert.equal(minutesLabel(15), '15 min');
    assert.equal(minutesLabel(60), '1 h');
    assert.equal(minutesLabel(90), '1 h 30 min');
    assert.equal(minutesLabel(120), '2 h');
    assert.equal(minutesLeft(1), 1, 'a second left is still a minute, never "0 min" before the end');
    assert.equal(minutesLeft(0), 0);
    assert.equal(minutesLeft(59 * MIN + 1), 60);
  });
});

describe('when the timer starts: the moment the steps were reached', () => {
  test('steps walked before the app opened: the timer starts from then, not from the open', async () => {
    // 50 steps from 7:10, opened at 7:45.
    const { query } = history(walk(at(7, 10), 60));
    const reached = await findThresholdTime(at(7), at(7, 45), 50, query);
    const fiftieth = at(7, 10, 49);
    assert.ok(reached >= fiftieth, 'never before the 50th step');
    assert.ok(reached - fiftieth <= THRESHOLD_RESOLUTION_MS, 'within a minute of it');
  });

  test('a handful of queries, even over a long morning', async () => {
    const { query, asked } = history(walk(at(11, 3), 60));
    await findThresholdTime(at(7), at(16), 50, query);
    assert.ok(asked.length <= 12, `${asked.length} queries`);
    assert.ok(asked.every(([from]) => from === at(7)), 'always counted from the morning start');
  });

  test('steps before the morning start never count', async () => {
    // 300 steps at 6:30, then 40 after 7:00: the goal of 50 is never met from 7:00, so the open is the answer.
    const { query } = history([...walk(at(6, 30), 300), ...walk(at(7, 20), 40)]);
    assert.equal(await findThresholdTime(at(7), at(7, 45), 50, query), at(7, 45));
  });

  test('the phone restarted and the history lost them (it reads fewer than the live count): the open, the safe side', async () => {
    const { query } = history(walk(at(7, 40), 10));
    assert.equal(await findThresholdTime(at(7), at(7, 45), 50, query), at(7, 45));
  });

  test('no history at all, or a query that throws: the open', async () => {
    assert.equal(await findThresholdTime(at(7), at(7, 45), 50, async () => null), at(7, 45));
    assert.equal(
      await findThresholdTime(at(7), at(7, 45), 50, async () => {
        throw new Error('pedometer');
      }),
      at(7, 45),
    );
  });

  test('a query failing halfway: the last moment it had confirmed, never earlier than the truth', async () => {
    const steps = walk(at(7, 10), 60);
    let calls = 0;
    const flaky = async (from: number, to: number) => (++calls > 3 ? null : steps.filter((t) => t >= from && t < to).length);
    const reached = await findThresholdTime(at(7), at(9), 50, flaky);
    assert.ok(reached >= at(7, 10, 49) && reached <= at(9));
  });

  test('a time before the start, or no time at all', async () => {
    assert.equal(await findThresholdTime(at(7), at(7), 50, async () => 99), at(7));
    assert.equal(await findThresholdTime(at(7), at(6), 50, async () => 99), at(6));
  });
});

describe('the saved timer', () => {
  test('planned from the steps, an hour on, clamped into the morning', () => {
    const r = planDowntime(morning, at(7, 10), at(7, 45), { steps: 50, minutes: 60 });
    assert.deepEqual(r, { morningKey: '2026-10-06', start: at(7), reachedAt: at(7, 10), endsAt: at(8, 10), minutes: 60, steps: 50 });
    assert.equal(planDowntime(morning, at(6, 30), at(7, 45), { steps: 50, minutes: 60 }).reachedAt, at(7), 'never before the morning start');
    assert.equal(planDowntime(morning, at(9), at(7, 45), { steps: 50, minutes: 60 }).reachedAt, at(7, 45), 'never after now');
  });

  test('this morning’s only: another day’s, or one from before a later morning start, is no timer', () => {
    const r = planDowntime(morning, at(7, 10), at(7, 45), { steps: 50, minutes: 60 });
    assert.equal(downtimeFor(r, morning), r);
    const tomorrow = currentMorning(new Date(at(7, 30, 0, 7)), settings);
    assert.equal(downtimeFor(r, tomorrow), null, 'the count resets each morning');
    // The morning start moved to 7:30 (an edit from the day before applying): a 7:10 timer predates it.
    const later = currentMorning(new Date(at(8)), { ...settings, morningStart: 7 * 60 + 30 });
    assert.equal(later.key, morning.key);
    assert.equal(downtimeFor(r, later), null, 'a later morning start counts afresh');
    assert.equal(downtimeFor(null, morning), null);
    assert.equal(downtimeFor({ ...r, endsAt: Number.NaN }, morning), null, 'malformed is no timer');
  });

  test('walking, running with what’s left, over, or into bedtime', () => {
    const bedtime = new Date(at(23));
    assert.equal(downtimePhase(null, at(7, 30), bedtime).kind, 'walking');
    const r = planDowntime(morning, at(7, 10), at(7, 45), { steps: 50, minutes: 60 });
    const running = downtimePhase(r, at(7, 40), bedtime);
    assert.equal(running.kind, 'running');
    if (running.kind === 'running') {
      assert.equal(running.left, 30 * MIN);
      assert.equal(running.progress, 0.5);
    }
    assert.equal(downtimePhase(r, at(8, 10), bedtime).kind, 'over', 'over at its end exactly');
    const late = planDowntime(morning, at(22, 30), at(22, 40), { steps: 50, minutes: 60 });
    assert.equal(downtimePhase(late, at(22, 40), bedtime).kind, 'bedtime', 'a timer ending after bedtime never wakes them');
    const edge = planDowntime(morning, at(22), at(22, 5), { steps: 50, minutes: 60 });
    assert.equal(downtimePhase(edge, at(22, 5), bedtime).kind, 'bedtime', 'ending at bedtime exactly is bedtime too');
  });

  test('due at its end, or two minutes before with iOS’s slack', () => {
    const r = planDowntime(morning, at(7, 10), at(7, 45), { steps: 50, minutes: 60 });
    assert.equal(downtimeDue(r, at(8, 9)), false);
    assert.equal(downtimeDue(r, at(8, 10)), true);
    assert.equal(downtimeDue(r, at(8, 8, 30), 120_000), true);
    assert.equal(downtimeDue(r, at(8, 7), 120_000), false);
  });
});

describe('the lock rules it meets', () => {
  test('a timer’s proof counts in its morning, and the day follows', () => {
    const proof = { morningKey: morning.key, kind: 'downtime' as const, at: at(8, 10) };
    assert.equal(proofCounts(proof, morning), true);
    const state = getLockState(new Date(at(8, 10)), settings, { steps: 0, unlockedMorning: morning.key });
    assert.equal(state.phase, 'day');
    assert.ok(state.blocked.includes('always'), 'the always list stays asleep');
    assert.ok(!state.blocked.includes('night'));
  });

  test('bedtime wins: a timer ending in the night proves nothing, and the night holds', () => {
    const next = currentMorning(new Date(at(23, 30)), settings);
    assert.equal(next.key, '2026-10-07', '23:30 belongs to tomorrow’s morning');
    assert.equal(proofCounts({ morningKey: next.key, kind: 'downtime', at: at(23, 30) }, next), false);
    const state = getLockState(new Date(at(23, 30)), settings, { steps: 0, unlockedMorning: null });
    assert.equal(state.phase, 'night');
  });

  test('a night that’s off has no morning lock, timer or not', () => {
    const off = { ...settings, activeNights: [0, 2, 3, 4, 5, 6] }; // Monday evening off: Tuesday's morning is free
    assert.equal(getLockState(new Date(at(7, 30)), off, { steps: 0, unlockedMorning: null }).phase, 'day');
  });
});

describe('his lines', () => {
  test('waiting, running, done, and bedtime: short, no exclamation points', () => {
    const lines = [
      downtimeLine('walking'),
      downtimeLine('walking', { steps: 20, goal: 50 }),
      downtimeLine('walking', { steps: 45, goal: 50 }),
      downtimeLine('running', { minutesLeft: 42 }),
      downtimeLine('running', { minutesLeft: 8 }),
      downtimeLine('running', { minutesLeft: 1 }),
      downtimeLine('over'),
      downtimeLine('bedtime'),
    ];
    for (const line of lines) {
      assert.ok(!line.includes('!'), line);
      assert.ok(line.split(' ').length <= 8, `under eight words: ${line}`);
      assert.match(line, /[.]$/, `ends with a period: ${line}`);
    }
    assert.equal(new Set(lines).size, lines.length, 'each moment its own line');
  });
});
