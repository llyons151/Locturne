/// <reference types="node" />

/**
 * Brute-force checks for lock-state.ts: walk every 30 minutes of a year for many schedules
 * and compare with a slow reference built a different way (by listing every night window),
 * then check the invariants that must always hold. Run under several time zones with
 * `npm run test:tz` to cover daylight-saving changes.
 */
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  currentMorning,
  getLockState,
  settingsTakeEffectAt,
  type LockSettings,
  type MorningFacts,
  type Phase,
} from './lock-state.ts';

const H = 60;

/** Schedules worth covering: wrapping, after-midnight, early, tiny, nearly-all-day. */
const SCHEDULES: [number, number][] = [
  [23 * H + 30, 7 * H],
  [22 * H, 6 * H + 30],
  [21 * H, 9 * H],
  [0, 7 * H],
  [1 * H, 7 * H],
  [2 * H + 30, 3 * H], // inside the US spring-forward gap
  [1 * H + 30, 8 * H], // inside the US fall-back repeat
  [12 * H, 11 * H + 59],
  [7 * H, 7 * H + 1],
  [23 * H + 59, 0],
];

const NIGHT_SETS = [[0, 1, 2, 3, 4, 5, 6], [1, 2, 3, 4], [5, 6], [0], []];

function settingsFor(bedtime: number, morningStart: number, activeNights: number[]): LockSettings {
  return {
    bedtime,
    morningStart,
    stepGoal: 200,
    activeNights,
    nightApps: ['night', 'shared'],
    alwaysApps: ['always', 'shared'],
  };
}

function key(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function at(base: Date, minutes: number, days = 0) {
  return new Date(base.getFullYear(), base.getMonth(), base.getDate() + days, 0, minutes);
}

/**
 * The reference: list the night windows around `now` and find the one containing it, or
 * the last one that ended. A window that starts at or after midnight belongs to the evening
 * before, so its morning is the day it ends.
 */
function reference(now: Date, s: LockSettings, facts: MorningFacts) {
  const windows: { start: Date; end: Date }[] = [];
  for (let d = -3; d <= 2; d++) {
    if (s.bedtime === s.morningStart) {
      windows.push({ start: at(now, s.morningStart, d), end: at(now, s.morningStart, d) });
    } else {
      const start = at(now, s.bedtime, d);
      const end = s.bedtime < s.morningStart ? at(now, s.morningStart, d) : at(now, s.morningStart, d + 1);
      windows.push({ start, end });
    }
  }
  const inside = windows.find((w) => now >= w.start && now < w.end);
  const last = inside ?? windows.filter((w) => w.end <= now).sort((a, b) => +b.end - +a.end)[0];
  const morningStart = last.end;
  const morningKey = key(morningStart);
  const evening = at(morningStart, 0, -1).getDay();
  const active = s.activeNights.includes(evening);
  const unlocked = facts.unlockedMorning === morningKey || facts.steps >= s.stepGoal;

  let phase: Phase;
  if (!active) phase = inside ? 'off' : 'day';
  else if (inside) phase = 'night';
  else phase = unlocked ? 'day' : 'morning';
  return { phase, morningKey, morningStart };
}

const FACTS: MorningFacts[] = [
  { steps: 0, unlockedMorning: null },
  { steps: 199, unlockedMorning: null },
  { steps: 200, unlockedMorning: null },
];

describe(`sweep (TZ=${process.env.TZ ?? 'system'})`, () => {
  const yearStart = new Date(2026, 0, 1);
  const STEP = 30;

  for (const [bedtime, morningStart] of SCHEDULES) {
    test(`bedtime ${bedtime} / morning ${morningStart}`, () => {
      for (const nights of NIGHT_SETS) {
        const s = settingsFor(bedtime, morningStart, nights);
        for (let m = 0; m < 366 * 24 * 60; m += STEP) {
          const now = new Date(+yearStart + m * 60_000);
          for (const facts of FACTS) {
            const got = getLockState(now, s, facts);
            const want = reference(now, s, facts);
            const where = `${now.toString()} ${JSON.stringify(nights)} ${facts.steps}`;

            assert.equal(got.phase, want.phase, `phase at ${where}`);
            assert.equal(got.morningKey, want.morningKey, `morning at ${where}`);

            // Blocked: always list in every phase, night list exactly when asleep, no dupes.
            const asleep = got.phase === 'night' || got.phase === 'morning';
            assert.equal(new Set(got.blocked).size, got.blocked.length, `dupes at ${where}`);
            for (const id of s.alwaysApps) assert.ok(got.blocked.includes(id), `always at ${where}`);
            assert.equal(got.blocked.includes('night'), asleep, `night list at ${where}`);

            assert.ok(got.stepsRemaining >= 0);
            if (got.phase !== 'morning') assert.equal(got.stepsRemaining, 0);

            assert.ok(got.nextChange > now, `nextChange not in the future at ${where}`);
          }
        }
      }
    });
  }
});

/** Wall-clock minutes, or null when the clocks skipped that time on that day. */
function shiftedByDst(d: Date, minutes: number) {
  return d.getHours() * 60 + d.getMinutes() !== minutes;
}

const isNight = (d: Date, s: LockSettings) => getLockState(d, s, FACTS[0]).phase === 'night';

describe('nextChange lands on the next night boundary', () => {
  test('nothing flips before nextChange, and it flips at nextChange', () => {
    for (const [bedtime, morningStart] of SCHEDULES) {
      if (bedtime === morningStart) continue;
      const s = settingsFor(bedtime, morningStart, [0, 1, 2, 3, 4, 5, 6]);
      for (let m = 0; m < 366 * 24 * 60; m += 7 * 11) {
        const now = new Date(+new Date(2026, 0, 1) + m * 60_000);
        const night = isNight(now, s);
        const next = getLockState(now, s, FACTS[0]).nextChange;
        // A night the clocks swallowed whole (02:30 to 03:00 on spring-forward day) has a
        // boundary but no flip.
        const swallowed = !night && shiftedByDst(next, bedtime);
        if (!swallowed) assert.notEqual(isNight(next, s), night, `no flip at ${next.toString()} from ${now.toString()}`);
        for (let t = +now + 60_000; t < +next; t += 60_000 * 41) {
          assert.equal(isNight(new Date(t), s), night, `early flip between ${now.toString()} and ${next.toString()}`);
        }
      }
    }
  });

  test('a night never un-begins: once night, it stays night until morning start', () => {
    for (const [bedtime, morningStart] of SCHEDULES) {
      if (bedtime === morningStart) continue;
      const s = settingsFor(bedtime, morningStart, [0, 1, 2, 3, 4, 5, 6]);
      let wasNight = false;
      for (let m = 0; m < 366 * 24 * 60; m += 5) {
        const now = new Date(+new Date(2026, 0, 1) + m * 60_000);
        const night = isNight(now, s);
        if (wasNight && !night) {
          const mins = now.getHours() * 60 + now.getMinutes();
          assert.ok(mins >= morningStart && mins <= morningStart + 60, `night ended early at ${now.toString()}`);
        }
        wasNight = night;
      }
    }
  });
});

describe('settingsTakeEffectAt', () => {
  test('is the next bedtime after the edit, never inside the current night', () => {
    for (const [bedtime, morningStart] of SCHEDULES) {
      const s = settingsFor(bedtime, morningStart, [0, 1, 2, 3, 4, 5, 6]);
      for (let m = 0; m < 366 * 24 * 60; m += 37) {
        const edit = new Date(+new Date(2026, 0, 1) + m * 60_000);
        const at = settingsTakeEffectAt(edit, s);
        const where = `${edit.toString()} -> ${at.toString()}`;
        assert.ok(at > edit, where);
        const target = bedtime === morningStart ? morningStart : bedtime;
        if (shiftedByDst(at, target)) {
          assert.ok(+at - +new Date(at.getFullYear(), at.getMonth(), at.getDate(), 0, target) <= 60 * 60_000, where);
        } else {
          assert.equal(at.getHours() * 60 + at.getMinutes(), target, where);
        }
        assert.ok(+at - +edit <= 26 * 60 * 60_000, `more than a day away: ${where}`);
        if (bedtime !== morningStart && isNight(edit, s)) {
          assert.ok(at >= getLockState(edit, s, FACTS[0]).nextChange, `inside current night: ${where}`);
        }
      }
    }
  });
});

describe('currentMorning.start', () => {
  test('is never in the future once the morning has begun, and is the morning start time', () => {
    const s = settingsFor(23 * H + 30, 7 * H, [0, 1, 2, 3, 4, 5, 6]);
    for (let m = 0; m < 366 * 24 * 60; m += 17) {
      const now = new Date(+new Date(2026, 0, 1) + m * 60_000);
      const { start } = currentMorning(now, s);
      const state = getLockState(now, s, FACTS[0]);
      if (state.phase === 'morning') assert.ok(start <= now, `start after now at ${now.toString()}`);
      assert.equal(start.getHours() * 60 + start.getMinutes(), 7 * H);
    }
  });
});
