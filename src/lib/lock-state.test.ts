/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  currentMorning,
  getLockState,
  nightsAround,
  settingsTakeEffectAt,
  type LockSettings,
  type MorningFacts,
} from './lock-state.ts';

const EVERY_NIGHT = [0, 1, 2, 3, 4, 5, 6];

const settings: LockSettings = {
  bedtime: 23 * 60 + 30,
  morningStart: 7 * 60,
  stepGoal: 200,
  activeNights: EVERY_NIGHT,
  nightApps: ['tiktok', 'instagram'],
  alwaysApps: ['reddit'],
};

const noSteps: MorningFacts = { steps: 0, unlockedMorning: null };

/** Thursday 2026-10-01 at hh:mm, local time. Friday is the 2nd. */
function at(hh: number, mm = 0, day = 1): Date {
  return new Date(2026, 9, day, hh, mm);
}

describe('phase', () => {
  test('night across midnight', () => {
    assert.equal(getLockState(at(23, 45), settings, noSteps).phase, 'night');
    assert.equal(getLockState(at(3), settings, noSteps).phase, 'night');
    assert.equal(getLockState(at(6, 59), settings, noSteps).phase, 'night');
  });

  test('morning starts at morning start', () => {
    assert.equal(getLockState(at(7), settings, noSteps).phase, 'morning');
  });

  test('bedtime wins: steps at night never unlock', () => {
    const state = getLockState(at(5), settings, { steps: 500, unlockedMorning: null });
    assert.equal(state.phase, 'night');
  });

  test('199 steps is still morning, 200 is day', () => {
    const almost = getLockState(at(8), settings, { steps: 199, unlockedMorning: null });
    assert.equal(almost.phase, 'morning');
    assert.equal(almost.stepsRemaining, 1);
    const up = getLockState(at(8), settings, { steps: 200, unlockedMorning: null });
    assert.equal(up.phase, 'day');
    assert.equal(up.stepsRemaining, 0);
  });

  test('morning lasts until bedtime if they never walk', () => {
    assert.equal(getLockState(at(15), settings, noSteps).phase, 'morning');
    assert.equal(getLockState(at(23, 29), settings, noSteps).phase, 'morning');
  });

  test('a recorded unlock keeps the day going with no steps', () => {
    const facts = { steps: 0, unlockedMorning: '2026-10-01' };
    assert.equal(getLockState(at(15), settings, facts).phase, 'day');
  });

  test("yesterday's unlock doesn't carry over: the count resets each morning", () => {
    const facts = { steps: 0, unlockedMorning: '2026-09-30' };
    assert.equal(getLockState(at(8), settings, facts).phase, 'morning');
  });

  test('bedtime after midnight does not wrap', () => {
    const late = { ...settings, bedtime: 60 };
    assert.equal(getLockState(at(23, 59), late, noSteps).phase, 'morning');
    assert.equal(getLockState(at(0, 30), late, noSteps).phase, 'morning');
    assert.equal(getLockState(at(1), late, noSteps).phase, 'night');
  });
});

describe('blocked apps', () => {
  test('night and morning block both lists', () => {
    const blocked = getLockState(at(8), settings, noSteps).blocked.sort();
    assert.deepEqual(blocked, ['instagram', 'reddit', 'tiktok']);
  });

  test('day blocks only the always list', () => {
    const facts = { steps: 300, unlockedMorning: null };
    assert.deepEqual(getLockState(at(12), settings, facts).blocked, ['reddit']);
  });

  test('an app on both lists stays blocked all day, once', () => {
    const both = { ...settings, alwaysApps: ['reddit', 'tiktok'] };
    const facts = { steps: 300, unlockedMorning: null };
    assert.deepEqual(getLockState(at(12), both, facts).blocked.sort(), ['reddit', 'tiktok']);
    assert.deepEqual(getLockState(at(2), both, noSteps).blocked.sort(), [
      'instagram',
      'reddit',
      'tiktok',
    ]);
  });
});

describe('nights off', () => {
  // Thursday (4) off: Thursday night and Friday morning are free.
  const thursdayOff = { ...settings, activeNights: [0, 1, 2, 3, 5, 6] };

  test('no night lock means no morning lock', () => {
    assert.equal(getLockState(at(23, 45, 1), thursdayOff, noSteps).phase, 'off');
    assert.equal(getLockState(at(3, 0, 2), thursdayOff, noSteps).phase, 'off');
    assert.equal(getLockState(at(8, 0, 2), thursdayOff, noSteps).phase, 'day');
  });

  test('the always list still applies on a night off', () => {
    assert.deepEqual(getLockState(at(3, 0, 2), thursdayOff, noSteps).blocked, ['reddit']);
  });

  test('the night before it is unaffected', () => {
    // Wednesday night leads into Thursday morning.
    assert.equal(getLockState(at(8, 0, 1), thursdayOff, noSteps).phase, 'morning');
  });
});

describe('which morning', () => {
  test('before midnight belongs to tomorrow, after midnight to today', () => {
    assert.equal(currentMorning(at(23, 45), settings).key, '2026-10-02');
    assert.equal(currentMorning(at(3), settings).key, '2026-10-01');
    assert.equal(currentMorning(at(15), settings).key, '2026-10-01');
  });

  test('step counting starts at morning start', () => {
    assert.deepEqual(currentMorning(at(9), settings).start, at(7));
  });
});

describe('next change', () => {
  test('at night, the next change is morning start', () => {
    assert.deepEqual(getLockState(at(23, 45), settings, noSteps).nextChange, at(7, 0, 2));
  });

  test('in the morning or day, the next change is bedtime', () => {
    assert.deepEqual(getLockState(at(9), settings, noSteps).nextChange, at(23, 30));
  });
});

describe('settings take effect next night', () => {
  test('an edit during the day applies at tonight’s bedtime', () => {
    assert.deepEqual(settingsTakeEffectAt(at(14), settings), at(23, 30));
  });

  test('an edit from bed waits for the following night', () => {
    assert.deepEqual(settingsTakeEffectAt(at(23, 45), settings), at(23, 30, 2));
    assert.deepEqual(settingsTakeEffectAt(at(2), settings), at(23, 30));
  });
});

describe('daytime controls', () => {
  const walked: MorningFacts = { steps: 200, unlockedMorning: null };
  const session = (end: Date) => ({ blockNow: { apps: ['youtube'], end }, limits: [] });

  test('Block now sleeps its apps until it ends', () => {
    const state = getLockState(at(14), settings, walked, session(at(15)));
    assert.equal(state.phase, 'day');
    assert.deepEqual(state.blocked, ['reddit', 'youtube']);
    assert.deepEqual(state.blockNowUntil, at(15));
  });

  test('a finished Block now session blocks nothing', () => {
    const state = getLockState(at(15), settings, walked, session(at(15)));
    assert.deepEqual(state.blocked, ['reddit']);
    assert.equal(state.blockNowUntil, null);
  });

  test('walking never lifts Block now', () => {
    const state = getLockState(at(8), settings, { steps: 5000, unlockedMorning: '2026-10-01' }, session(at(9)));
    assert.equal(state.phase, 'day');
    assert.ok(state.blocked.includes('youtube'));
  });

  test('a used-up limit blocks its apps for the rest of the calendar day', () => {
    const limits = { blockNow: null, limits: [{ apps: ['instagram'], reachedOn: '2026-10-01' }] };
    assert.deepEqual(getLockState(at(16), settings, walked, limits).blocked, ['reddit', 'instagram']);
    // Midnight starts a new day for the limit, even though the night lock keeps it asleep.
    const after = getLockState(at(0, 10, 2), settings, noSteps, limits);
    assert.equal(after.phase, 'night');
    assert.deepEqual(after.blocked, ['reddit', 'tiktok', 'instagram']);
    const nextDay = getLockState(at(12, 0, 2), settings, walked, limits);
    assert.deepEqual(nextDay.blocked, ['reddit']);
  });

  test('a limit not yet used up blocks nothing', () => {
    const limits = { blockNow: null, limits: [{ apps: ['instagram'], reachedOn: '2026-09-30' }] };
    assert.deepEqual(getLockState(at(16), settings, walked, limits).blocked, ['reddit']);
  });

  test('strongest rule first, with no duplicates', () => {
    const everything = {
      blockNow: { apps: ['reddit', 'youtube'], end: at(12) },
      limits: [{ apps: ['youtube', 'x'], reachedOn: '2026-10-01' }],
    };
    assert.deepEqual(getLockState(at(9), settings, noSteps, everything).blocked, [
      'reddit',
      'tiktok',
      'instagram',
      'youtube',
      'x',
    ]);
  });
});

describe('nightsAround', () => {
  test('inside a night: latest is tonight, next is tomorrow night', () => {
    const { latest, next } = nightsAround(at(2, 0, 2), settings);
    assert.deepEqual(latest, { start: at(23, 30, 1), end: at(7, 0, 2) });
    assert.deepEqual(next, { start: at(23, 30, 2), end: at(7, 0, 3) });
  });

  test('in the day: latest is last night, next is tonight', () => {
    const { latest, next } = nightsAround(at(14), settings);
    assert.deepEqual(latest, { start: at(23, 30, 0), end: at(7) });
    assert.deepEqual(next, { start: at(23, 30), end: at(7, 0, 2) });
  });
});
