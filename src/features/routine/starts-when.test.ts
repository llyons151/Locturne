/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { nightsAround, settingsTakeEffectAt, type LockSettings } from '../../lib/lock-state.ts';
import { startsWhen } from './starts-when.ts';

// 2026-10-05 is a Monday.
const at = (day: number, h: number, m = 0) => new Date(2026, 9, day, h, m);

const settings = (bedtime: number, morningStart: number): LockSettings => ({
  bedtime,
  morningStart,
  stepGoal: 200,
  activeNights: [0, 1, 2, 3, 4, 5, 6],
  nightApps: [],
  alwaysApps: [],
});

/** The banner's words for an edit made at `now`, as the screen works them out. */
const label = (bedtime: number, morningStart: number, now: Date) => {
  const s = settings(bedtime, morningStart);
  return startsWhen(settingsTakeEffectAt(now, s), now, nightsAround(now, s).latest);
};

describe('startsWhen', () => {
  test('in the day: tonight’s bedtime', () => {
    assert.equal(label(23 * 60, 7 * 60, at(5, 14)), 'from tonight’s bedtime, 11 pm');
    assert.equal(label(60, 7 * 60, at(5, 14)), 'from tonight’s bedtime, 1 am');
  });

  test('before an after-midnight bedtime: still tonight', () => {
    assert.equal(label(60, 7 * 60, at(6, 0, 30)), 'from tonight’s bedtime, 1 am');
  });

  test('from bed after an after-midnight bedtime: tomorrow night', () => {
    assert.equal(label(60, 7 * 60, at(6, 2)), 'from tomorrow night at 1 am');
  });

  test('from bed after midnight, 11 pm bedtime: tomorrow night', () => {
    assert.equal(label(23 * 60, 7 * 60, at(6, 0)), 'from tomorrow night at 11 pm');
    assert.equal(label(23 * 60, 7 * 60, at(6, 6, 59)), 'from tomorrow night at 11 pm');
    assert.equal(label(23 * 60, 7 * 60, at(5, 23, 30)), 'from tomorrow night at 11 pm');
  });

  test('after the night: tonight again', () => {
    assert.equal(label(60, 7 * 60, at(6, 8)), 'from tonight’s bedtime, 1 am');
    assert.equal(label(23 * 60, 7 * 60, at(6, 7)), 'from tonight’s bedtime, 11 pm');
  });

  test('a night shift names the day', () => {
    assert.equal(label(8 * 60, 16 * 60, at(6, 7)), 'from today at 8 am');
    assert.equal(label(8 * 60, 16 * 60, at(6, 9)), 'from tomorrow at 8 am');
    assert.equal(label(8 * 60, 16 * 60, at(6, 20)), 'from tomorrow at 8 am');
  });

  test('further out: the weekday', () => {
    const night = nightsAround(at(5, 14), settings(23 * 60, 7 * 60)).latest;
    assert.equal(startsWhen(at(8, 23), at(5, 14), night), `from ${at(8, 23).toLocaleDateString(undefined, { weekday: 'long' })} at 11 pm`);
  });
});

// Every bedtime and morning start on a 30-minute grid, edited every 15 minutes of a day: the
// words must name the real day of the bedtime the edit waits for.
test('startsWhen names the real day for every routine and time of day', () => {
  const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = (a: Date, b: Date) => Math.round((day(b) - day(a)) / 86_400_000);
  const bad: string[] = [];
  for (let b = 0; b < 1440; b += 30)
    for (let m = 0; m < 1440; m += 30) {
      if ((m - b + 1440) % 1440 < 30) continue;
      const s = settings(b, m);
      for (let n = 0; n < 1440; n += 15) {
        const now = new Date(2026, 9, 6, 0, n);
        const { latest } = nightsAround(now, s);
        const inNight = now >= latest.start && now < latest.end;
        const from = settingsTakeEffectAt(now, s);
        const words = startsWhen(from, now, latest);
        const ahead = days(now, from);
        const small = from.getHours() < 6;
        const ok = words.includes('tonight')
          ? !inNight && (ahead === 0 || (ahead === 1 && small))
          : words.includes('today')
            ? ahead === 0
            : words.includes('tomorrow night')
              ? (inNight && (ahead === 0 || (ahead === 1 && small))) || ahead === (small ? 2 : 1)
              : words.includes('tomorrow')
                ? ahead === 1
                : words.includes(from.toLocaleDateString(undefined, { weekday: 'long' }));
        if (!ok || from <= now) bad.push(`${b}-${m} at ${n}: ${from.toString().slice(0, 21)} → "${words}"`);
      }
    }
  assert.deepEqual(bad.slice(0, 10), []);
});
