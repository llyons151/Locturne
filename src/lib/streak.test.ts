/// <reference types="node" />

/**
 * The morning streak (lib/streak.ts): a pass pauses it, a night that was off skips, a locked
 * night nobody got up from breaks it, and a verdict once given stands. The pure rules first, then
 * against the real stores with a fake Screen Time and the default routine (bedtime 23:00, morning
 * 07:00, every night). Needs `--experimental-test-module-mocks` (npm test).
 */
import assert from 'node:assert/strict';
import { beforeEach, mock, test } from 'node:test';

import { fakeDeviceActivity } from './fake-device-activity.ts';

const fake = fakeDeviceActivity();
mock.module('react-native-device-activity', { namedExports: fake.exports });

const { getStreak, nextKey, prevKey, saveStreakNow, settleStreak, unbroken } = await import('./streak.ts');
const { mergeProgress, parseProgress, serializeProgress, EMPTY } = await import('./progress-sync.ts');
const { devSeedMornings, getSavedStreak, recordProof, restoreMornings, getSavedMornings } = await import('./morning-proof.ts');
const { beforeRoutineSave, DEFAULT_ROUTINE, getRoutine, saveRoutine } = await import('./routine.ts');

type Proofs = Parameters<typeof settleStreak>[1];
const win = (morningKey: string) => ({ morningKey, kind: 'steps', at: 0 }) as Proofs[number];
const pass = (morningKey: string) => ({ morningKey, kind: 'pass', at: 0 }) as Proofs[number];

/** Every locked night counts; only the keys listed are excused (a pass, a night off). */
const excusing = (...keys: string[]) => (key: string) => keys.includes(key);
const none = excusing();
const count = (s: { count: number } | null) => s?.count ?? 0;

// ——— The pure rules ———

test('keys step across months, years and a DST change', () => {
  assert.equal(nextKey('2026-10-31'), '2026-11-01');
  assert.equal(nextKey('2026-12-31'), '2027-01-01');
  assert.equal(prevKey('2027-01-01'), '2026-12-31');
  assert.equal(nextKey('2026-03-08'), '2026-03-09');
  assert.equal(nextKey('2026-11-01'), '2026-11-02');
  assert.equal(prevKey('2028-03-01'), '2028-02-29');
});

test('mornings in a row add up, in any proof order', () => {
  const s = settleStreak(null, [win('2026-11-03'), win('2026-11-01'), win('2026-11-02')], '2026-11-04', none);
  assert.deepEqual(s, { count: 3, key: '2026-11-03', checked: '2026-11-03' });
});

test('a missed locked morning starts it again at one', () => {
  const s = settleStreak(null, [win('2026-11-01'), win('2026-11-02'), win('2026-11-04')], '2026-11-05', none);
  assert.equal(count(s), 1);
});

test('a pass pauses it: held, not added', () => {
  const proofs = [win('2026-11-01'), win('2026-11-02'), pass('2026-11-03'), win('2026-11-04')];
  assert.equal(count(settleStreak(null, proofs, '2026-11-05', excusing('2026-11-03'))), 3);
});

test('two passes in a row still only pause it', () => {
  const proofs = [win('2026-11-01'), pass('2026-11-02'), pass('2026-11-03'), win('2026-11-04')];
  assert.equal(count(settleStreak(null, proofs, '2026-11-05', excusing('2026-11-02', '2026-11-03'))), 2);
});

test('a pass the last morning before today keeps it showing', () => {
  const s = settleStreak({ count: 4, key: '2026-11-05', checked: '2026-11-05' }, [], '2026-11-07', excusing('2026-11-06'));
  assert.equal(count(s), 4);
});

test('nights off are skipped', () => {
  const s = settleStreak({ count: 5, key: '2026-11-07', checked: '2026-11-07' }, [win('2026-11-10')], '2026-11-11', excusing('2026-11-08', '2026-11-09'));
  assert.equal(count(s), 6);
});

test('the same morning twice counts once', () => {
  assert.equal(count(settleStreak(null, [win('2026-11-01'), win('2026-11-01')], '2026-11-02', none)), 1);
  const s = { count: 4, key: '2026-11-05', checked: '2026-11-05' };
  assert.equal(count(settleStreak(s, [win('2026-11-05')], '2026-11-06', none)), 4);
});

test('a saved run keeps counting past the proofs on hand', () => {
  const s = settleStreak({ count: 40, key: '2026-11-09', checked: '2026-11-09' }, [win('2026-11-08'), win('2026-11-09'), win('2026-11-10')], '2026-11-11', none);
  assert.equal(count(s), 41);
});

test("today, still under way, never breaks it; a missed yesterday does", () => {
  const s = { count: 6, key: '2026-11-15', checked: '2026-11-15' };
  assert.equal(count(settleStreak(s, [], '2026-11-16', none)), 6);
  assert.equal(count(settleStreak(s, [], '2026-11-17', none)), 0);
  assert.equal(count(settleStreak(s, [], '2026-11-17', excusing('2026-11-16'))), 6);
  assert.equal(count(settleStreak(null, [], '2026-11-17', none)), 0);
});

test("today's own wake-up adds to it at once", () => {
  const s = { count: 6, key: '2026-11-15', checked: '2026-11-15' };
  assert.equal(count(settleStreak(s, [win('2026-11-16')], '2026-11-16', none)), 7);
});

test('a verdict stands: a miss judged once stays a miss whatever excuses it later', () => {
  const judged = settleStreak({ count: 6, key: '2026-11-15', checked: '2026-11-15' }, [], '2026-11-17', none);
  assert.deepEqual(judged, { count: 0, key: '2026-11-15', checked: '2026-11-16' });
  // Later every morning looks free (a routine edit frees the past): the miss still stands.
  assert.equal(count(settleStreak(judged, [], '2026-11-18', () => true)), 0);
  // And the next wake-up starts it at one, not 7.
  assert.equal(count(settleStreak(judged, [win('2026-11-18')], '2026-11-19', () => true)), 1);
});

test('after a break, a run builds from one again', () => {
  let s = settleStreak({ count: 6, key: '2026-11-10', checked: '2026-11-10' }, [], '2026-11-13', none);
  assert.equal(count(s), 0);
  s = settleStreak(s, [win('2026-11-13')], '2026-11-14', none);
  s = settleStreak(s, [win('2026-11-13'), win('2026-11-14')], '2026-11-15', none);
  assert.equal(count(s), 2);
});

test('a proof for a morning still to come is left for its day', () => {
  assert.equal(count(settleStreak(null, [win('2026-11-20')], '2026-11-16', none)), 0);
});

test('a long-dead run is broken, not walked forever', () => {
  assert.equal(unbroken('2020-01-01', '2026-11-16', () => true), false);
  assert.equal(count(settleStreak({ count: 9, key: '2020-01-01' }, [], '2026-11-16', () => true)), 0);
});

test('a run saved before verdicts were kept (no checked) is judged from its last wake-up', () => {
  assert.equal(count(settleStreak({ count: 3, key: '2026-11-15' }, [], '2026-11-16', none)), 3);
  assert.equal(count(settleStreak({ count: 3, key: '2026-11-14' }, [], '2026-11-16', none)), 0);
});

// ——— The backup ———

test('the backup keeps the copy judged up to the later morning', () => {
  const a = { ...EMPTY, streak: { count: 9, key: '2026-11-10', checked: '2026-11-10' } };
  const b = { ...EMPTY, streak: { count: 2, key: '2026-11-15', checked: '2026-11-15' } };
  assert.deepEqual(mergeProgress(a, b).streak, b.streak);
  assert.deepEqual(mergeProgress(a, { ...EMPTY, streak: { count: 12, key: '2026-11-10', checked: '2026-11-10' } }).streak?.count, 12);
  assert.deepEqual(mergeProgress(a, EMPTY).streak, a.streak);
});

test('a stale copy never brings back a run a miss broke since', () => {
  const broken = { ...EMPTY, streak: { count: 0, key: '2026-11-10', checked: '2026-11-12' } };
  const stale = { ...EMPTY, streak: { count: 9, key: '2026-11-10', checked: '2026-11-10' } };
  assert.equal(mergeProgress(broken, stale).streak?.count, 0);
  assert.equal(mergeProgress(stale, broken).streak?.count, 0);
});

test('a broken run (0) survives a save and a read back', () => {
  const saved = { ...EMPTY, streak: { count: 0, key: '2026-11-10', checked: '2026-11-12' } };
  assert.deepEqual(parseProgress(serializeProgress(saved, 1))?.streak, saved.streak);
  assert.equal(parseProgress(serializeProgress({ ...EMPTY, streak: { count: -3, key: 'x' } }, 1))?.streak, null);
});

// ——— Against the real stores ———

const at = (month: number, day: number, hour: number, minute = 0) => new Date(2026, month - 1, day, hour, minute);
const walk = (month: number, day: number) => recordProof({ morningKey: `2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`, kind: 'steps', at: at(month, day, 7, 5).getTime() });
const passOn = (month: number, day: number) => recordProof({ morningKey: `2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`, kind: 'pass', at: at(month, day, 6).getTime() });

beforeEach(() => {
  fake.reset();
  // Saved long before, every night on, so every morning tested here was locked.
  saveRoutine(DEFAULT_ROUTINE, at(10, 1, 12));
});

test('phone: three walks in a row, a pass, a walk', () => {
  for (const d of [10, 11, 12]) assert.equal(walk(11, d), true);
  assert.equal(passOn(11, 13), true);
  assert.equal(walk(11, 14), true);
  assert.equal(getStreak('2026-11-15'), 4);
  saveStreakNow(at(11, 15, 9));
  assert.equal(getSavedStreak()?.count, 4);
});

test('phone: a missed morning shows 0 the next day, and the walk after starts at 1', () => {
  walk(11, 10);
  walk(11, 11);
  assert.equal(getStreak('2026-11-12'), 2);
  // The 12th, nobody got up; at 23:30 the morning is already the 13th's.
  saveStreakNow(at(11, 12, 23, 30));
  assert.equal(getStreak('2026-11-13'), 0);
  walk(11, 13);
  assert.equal(getStreak('2026-11-13'), 1);
});

test('phone: before morning start, yesterday still counts and today has not broken it', () => {
  walk(11, 10);
  walk(11, 11);
  saveStreakNow(at(11, 12, 5));
  assert.equal(getStreak('2026-11-12'), 2);
});

test('phone: a routine edit after a missed morning does not bring the streak back', () => {
  beforeRoutineSave((now) => saveStreakNow(now));
  walk(11, 10);
  walk(11, 11);
  // The 12th missed. On the 13th by day, the user moves bedtime: before the fix, the edit freed
  // every morning before it and the streak came back as 2.
  saveRoutine({ ...getRoutine(at(11, 13, 10)), bedtime: 22 * 60 }, at(11, 13, 10));
  assert.equal(getStreak('2026-11-13'), 0);
  walk(11, 13);
  assert.equal(getStreak('2026-11-13'), 1);
});

test('phone: nights switched off are skipped', () => {
  // Only Tuesday to Thursday evenings on: the mornings of Wednesday 11, Thursday 12, Friday 13 lock.
  saveRoutine({ ...DEFAULT_ROUTINE, activeNights: [2, 3, 4] }, at(10, 2, 12));
  walk(11, 11);
  walk(11, 12);
  walk(11, 13);
  // Sat 14 to Tue 17: no lock. Wed 18 got up.
  walk(11, 18);
  assert.equal(getStreak('2026-11-19'), 4);
});

test('phone: 45 made-up mornings, past the 30 proofs kept', () => {
  devSeedMornings(45, at(11, 16, 6));
  assert.equal(getStreak('2026-11-16'), 45);
  walk(11, 16);
  saveStreakNow(at(11, 16, 8));
  assert.equal(getSavedStreak()?.count, 46);
});

test('phone: a reinstall brings the streak back with the mornings', () => {
  walk(11, 10);
  walk(11, 11);
  saveStreakNow(at(11, 11, 9));
  const backup = getSavedMornings();
  fake.reset();
  saveRoutine(DEFAULT_ROUTINE, at(10, 1, 12));
  assert.equal(getStreak('2026-11-12'), 0);
  restoreMornings(backup);
  assert.equal(getStreak('2026-11-12'), 2);
});

// ——— Fuzz: random months against a day-by-day model ———

/** A small seeded random, so a failure can be replayed. */
function rng(seed: number) {
  let x = seed >>> 0 || 1;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) / 2 ** 32;
  };
}

test('fuzz: 3000 random runs, settled at random moments with only 30 proofs kept, match a day-by-day count', () => {
  for (let seed = 1; seed <= 3000; seed++) {
    const r = rng(seed);
    const days = 20 + Math.floor(r() * 80);
    const outcome: Record<string, 'win' | 'pass' | 'off' | 'miss'> = {};
    let key = '2026-01-01';
    const keys: string[] = [];
    for (let i = 0; i < days; i++) {
      const roll = r();
      outcome[key] = roll < 0.6 ? 'win' : roll < 0.7 ? 'pass' : roll < 0.85 ? 'off' : 'miss';
      keys.push(key);
      key = nextKey(key);
    }
    const excused = (k: string) => outcome[k] === 'pass' || outcome[k] === 'off';
    let proofs: Proofs = [];
    let saved: ReturnType<typeof settleStreak> = null;
    let model = 0;
    for (let i = 0; i < keys.length; i++) {
      const today = keys[i];
      // Opened at some point this morning before the wake-up, or not at all.
      if (r() < 0.5) saved = settleStreak(saved, proofs, today, excused);
      assert.equal(count(settleStreak(saved, proofs, today, excused)), model, `seed ${seed} before ${today}`);
      if (outcome[today] === 'win' || outcome[today] === 'pass') {
        proofs = [outcome[today] === 'win' ? win(today) : pass(today), ...proofs].slice(0, 30);
        // Every new proof is saved into the streak at once (startStreak's listener).
        saved = settleStreak(saved, proofs, today, excused);
      }
      model = outcome[today] === 'win' ? model + 1 : outcome[today] === 'miss' ? 0 : model;
      if (outcome[today] === 'win') assert.equal(count(settleStreak(saved, proofs, today, excused)), model, `seed ${seed} after ${today}`);
    }
  }
});
