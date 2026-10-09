/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { settingsTakeEffectAt, type LockSettings } from '../../lib/lock-state.ts';
import { clock, pauseNote, removalNote, startsLabel } from './pending-note.ts';

// 2026-10-05 is a Monday.
const at = (day: number, h: number, m = 0) => new Date(2026, 9, day, h, m);

describe('removalNote', () => {
  test('made in the day: tonight at bedtime', () => {
    const line = removalNote(at(5, 23), at(5, 14));
    assert.equal(line, `Apps you removed stay asleep. Your change starts at ${clock(at(5, 23))}.`);
  });

  test('made after bedtime: names tomorrow, not a time already passed', () => {
    const line = removalNote(at(6, 23), at(5, 23, 30));
    assert.equal(line, `Apps you removed stay asleep. Your change starts tomorrow at ${clock(at(6, 23))}.`);
  });

  test('the bedtime list in the day is awake: it just won’t sleep from bedtime', () => {
    const line = removalNote(at(5, 23), at(5, 14), { asleep: false });
    assert.equal(line, `Apps you removed won’t sleep from ${clock(at(5, 23))}.`);
    assert.doesNotMatch(line, /stay asleep/);
  });

  test('awake, with the change tomorrow evening', () => {
    const line = removalNote(at(6, 23), at(5, 23, 30), { asleep: false });
    assert.equal(line, `Apps you removed won’t sleep from tomorrow at ${clock(at(6, 23))}.`);
  });

  test('nothing armed: it waits for the next open', () => {
    const line = removalNote(at(6, 0), at(5, 20), { waitsForOpen: true });
    assert.equal(line, `Apps you removed stay asleep. Your change starts at ${clock(at(6, 0))}, when you next open Locturne.`);
  });

  test('an after-midnight bedtime reads as tonight', () => {
    assert.equal(startsLabel(at(6, 1), at(5, 14)), `at ${clock(at(6, 1))}`);
    assert.equal(startsLabel(at(6, 1), at(6, 0, 30)), `at ${clock(at(6, 1))}`);
  });

  test('made from bed, the next bedtime is tomorrow', () => {
    assert.equal(startsLabel(at(7, 1), at(6, 2)), `tomorrow at ${clock(at(7, 1))}`);
    // A night shift (8 am to 4 pm) edited at 9 am.
    assert.equal(startsLabel(at(7, 8), at(6, 9)), `tomorrow at ${clock(at(7, 8))}`);
  });

  test('a limit’s midnight in the day is tonight', () => {
    assert.equal(startsLabel(at(6, 0), at(5, 9)), `at ${clock(at(6, 0))}`);
  });
});

describe('pauseNote', () => {
  test('the night of the unlock names tonight and the morning', () => {
    const line = pauseNote({ morning: 'tomorrow morning', resumes: at(6, 23), weekday: null }, true);
    assert.equal(line, `Awake tonight and tomorrow morning after an emergency unlock. They sleep again at ${clock(at(6, 23))}.`);
  });

  test('the next day drops "tonight"', () => {
    const line = pauseNote({ morning: 'this morning', resumes: at(6, 23), weekday: null }, false);
    assert.equal(line, `Awake after an emergency unlock. They sleep again at ${clock(at(6, 23))}.`);
    assert.doesNotMatch(line, /tonight/);
  });

  test('the next night off: names the night that is on, with its weekday', () => {
    const line = pauseNote({ morning: 'tomorrow morning', resumes: at(8, 23), weekday: 'Thursday' }, true);
    assert.match(line, new RegExp(`They sleep again at ${clock(at(8, 23))} on Thursday\\.$`));
  });

  test('every night off: they stay awake', () => {
    const line = pauseNote({ morning: 'tomorrow morning', resumes: null, weekday: null }, true);
    assert.match(line, /Every night is switched off, so they stay awake\.$/);
    assert.doesNotMatch(line, /sleep again/);
  });

  test('after a lapse: nothing sleeps after this, and no night switched off', () => {
    const line = pauseNote({ morning: 'tomorrow morning', resumes: null, weekday: null, ended: true }, true);
    assert.match(line, /no subscription, so nothing sleeps after that\.$/);
    assert.doesNotMatch(line, /switched off|sleep again/);
  });
});

// Every bedtime and morning start on a 30-minute grid, edited every 15 minutes of a day: never
// "tomorrow" for later today, and always for tomorrow when it's a day off.
test('startsLabel names tomorrow when it is, and only then', () => {
  const settings = (bedtime: number, morningStart: number): LockSettings => ({
    bedtime,
    morningStart,
    stepGoal: 200,
    activeNights: [0, 1, 2, 3, 4, 5, 6],
    nightApps: [],
    alwaysApps: [],
  });
  const bad: string[] = [];
  for (let b = 0; b < 1440; b += 30)
    for (let m = 0; m < 1440; m += 30) {
      if ((m - b + 1440) % 1440 < 30) continue;
      const s = settings(b, m);
      for (let n = 0; n < 1440; n += 15) {
        const now = at(6, 0, n);
        const from = settingsTakeEffectAt(now, s);
        const label = startsLabel(from, now);
        const tomorrow = from.getDate() !== now.getDate();
        const away = (from.getTime() - now.getTime()) / 3_600_000;
        const ok = label.startsWith('tomorrow')
          ? tomorrow
          : !tomorrow || (from.getHours() < 6 && away < 18);
        if (!ok) bad.push(`${b}-${m} at ${n}: ${from.toString().slice(0, 21)} → "${label}"`);
      }
    }
  assert.deepEqual(bad.slice(0, 10), []);
});
