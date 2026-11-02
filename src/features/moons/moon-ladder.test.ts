/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { daysBetween, ECLIPSE_DAYS, LADDER_MORNINGS, ladderNeed, RARE_FROM_MORNING, RARE_MOONS, RARE_ODDS, rollFor, settleLadder, type LadderFacts, type RareState } from './moon-ladder.ts';
import * as ladder from './moon-ladder.ts';

/** The tests' own two rare moons, so they don't change when the app's list does. */
const RARES = ['ringed', 'bluemoon'];
const RARE_MOON = RARES[0];

const LADDER = ['dawn', 'harvest', 'aurora', 'supermoon', 'nebula', 'midnightsun', 'blood', 'deepsea', 'prism', 'eclipse', 'twin-moonlet'];

const facts = (over: Partial<LadderFacts> = {}): LadderFacts => ({
  ladder: LADDER,
  mornings: 1,
  firstMorning: '2026-11-02',
  latest: '2026-11-02',
  owned: {},
  rare: { due: [], rolled: null, seed: 1 },
  limited: [],
  now: 0,
  rareMoons: [RARE_MOON],
  ...over,
});

/** A seed whose roll for `key` hits, or misses. */
function seedFor(key: string, hit: boolean): number {
  for (let seed = 0; ; seed++) if (rollFor(seed, key) < 1 / RARE_ODDS === hit) return seed;
}

test('nothing before a first morning', () => {
  assert.deepEqual(settleLadder(facts({ mornings: 0, latest: null })).earned, []);
});

test('the first morning brings the first moon, once', () => {
  const first = settleLadder(facts());
  assert.deepEqual(first.earned, ['dawn']);
  assert.equal(first.owned.dawn.morning, 1);
  const again = settleLadder(facts({ owned: first.owned, rare: first.rare }));
  assert.deepEqual(again.earned, []);
});

test('a long-time user catches up every rung, each with its own morning number', () => {
  const { earned, owned } = settleLadder(facts({ mornings: 31, latest: '2026-12-20' }));
  assert.deepEqual(earned.slice(0, 5), ['dawn', 'harvest', 'aurora', 'supermoon', 'nebula']);
  assert.equal(owned.nebula.morning, 30);
  assert.equal(owned.midnightsun, undefined);
});

test('the Eclipse comes 350 days after the first morning, not by count', () => {
  const before = settleLadder(facts({ mornings: 3, firstMorning: '2026-01-01', latest: '2026-12-16' }));
  assert.equal(before.owned.eclipse, undefined);
  const on = settleLadder(facts({ mornings: 3, firstMorning: '2026-01-01', latest: '2026-12-17' }));
  assert.ok(on.owned.eclipse);
});

test('the rare moon never lands on a ladder morning: it waits for the next', () => {
  const key = '2026-11-04';
  const hit = seedFor(key, true);
  // Morning 3 brings Harvest, and the roll hits.
  const ladderDay = settleLadder(facts({ mornings: 3, latest: key, owned: { dawn: { id: 'dawn', morningKey: '2026-11-02', morning: 1, at: 0 } }, rare: { due: false, rolled: null, seed: hit } }));
  assert.ok(ladderDay.owned.harvest);
  assert.equal(ladderDay.owned[RARE_MOON], undefined);
  assert.deepEqual(ladderDay.rare.due, [RARE_MOON]);
  // Looked at again the same morning: still waiting, not rolled twice.
  const sameDay = settleLadder(facts({ mornings: 3, latest: key, owned: ladderDay.owned, rare: ladderDay.rare }));
  assert.equal(sameDay.owned[RARE_MOON], undefined);
  // The next morning: there it is.
  const next = settleLadder(facts({ mornings: 4, latest: '2026-11-05', owned: sameDay.owned, rare: sameDay.rare }));
  assert.ok(next.owned[RARE_MOON]);
  assert.deepEqual(next.rare.due, []);
});

test('a morning rolls once: a miss stays a miss', () => {
  const key = '2026-11-05';
  const miss = seedFor(key, false);
  const owned = settleLadder(facts({ mornings: 4, latest: key })).owned;
  const once = settleLadder(facts({ mornings: 4, latest: key, owned, rare: { due: false, rolled: null, seed: miss } }));
  assert.equal(once.rare.rolled, key);
  assert.equal(once.owned[RARE_MOON], undefined);
});

test('no rare moon on the first morning', () => {
  const key = '2026-11-02';
  const out = settleLadder(facts({ rare: { due: false, rolled: null, seed: seedFor(key, true) } }));
  assert.equal(out.owned[RARE_MOON], undefined);
  assert.equal(out.rare.rolled, null);
});

test('about 1 in 365 mornings rolls the rare moon', () => {
  let hits = 0;
  const n = 365_000;
  for (let i = 0; i < n; i++) if (rollFor(7, `k${i}`) < 1 / RARE_ODDS) hits++;
  assert.ok(Math.abs(hits - n / RARE_ODDS) < 150, `hits ${hits}`);
});

test('a limited moon only on its date', () => {
  const limited = [{ id: 'long-eclipse', date: '2027-08-02' }];
  assert.equal(settleLadder(facts({ mornings: 5, latest: '2027-08-01', limited })).owned['long-eclipse'], undefined);
  assert.ok(settleLadder(facts({ mornings: 5, latest: '2027-08-02', limited })).owned['long-eclipse']);
});

test('what a locked slot says', () => {
  assert.deepEqual(ladderNeed(1, { mornings: 2, firstMorning: '2026-11-02', today: '2026-11-03' }), { left: 1, unit: 'morning', at: 'Morning 3' });
  assert.deepEqual(ladderNeed(9, { mornings: 2, firstMorning: '2026-11-02', today: '2026-11-02' }), { left: 50, unit: 'week', at: 'Week 50' });
  assert.equal(ladderNeed(10, { mornings: 2, firstMorning: null, today: '2026-11-02' }), null);
  assert.equal(daysBetween('2026-03-07', '2026-03-09'), 2);
});

// ---- Edge cases ----


test('every rung lands exactly on its count, not one before', () => {
  LADDER_MORNINGS.forEach((count, i) => {
    const before = settleLadder(facts({ mornings: count - 1, latest: '2027-01-01' }));
    const on = settleLadder(facts({ mornings: count, latest: '2027-01-01' }));
    assert.equal(before.owned[LADDER[i]], undefined, `${LADDER[i]} before ${count}`);
    assert.ok(on.owned[LADDER[i]], `${LADDER[i]} at ${count}`);
    assert.equal(on.owned[LADDER[i]].morning, count);
  });
});

test('the secret is never earned by mornings, however many', () => {
  const { owned } = settleLadder(facts({ mornings: 10_000, firstMorning: '2020-01-01', latest: '2027-01-01' }));
  assert.equal(owned['twin-moonlet'], undefined);
  assert.equal(Object.keys(owned).filter((id) => LADDER.includes(id)).length, 10);
});

test('a ladder with gaps (a rung left empty in the moon lab) skips them without shifting the others', () => {
  const gappy = ['dawn', null, 'aurora', null, null, null, null, null, null, 'eclipse', 'twin-moonlet'];
  const { owned } = settleLadder(facts({ ladder: gappy, mornings: 7, latest: '2026-11-20' }));
  assert.deepEqual(Object.keys(owned).sort(), ['aurora', 'dawn']);
  assert.equal(owned.aurora.morning, 7);
});

test('the Eclipse counts calendar days across a DST change and a leap year', () => {
  // 2028 is a leap year; March and November DST changes fall inside.
  assert.equal(daysBetween('2027-12-01', '2028-11-15'), 350);
  const on = settleLadder(facts({ mornings: 2, firstMorning: '2027-12-01', latest: '2028-11-15' }));
  assert.ok(on.owned.eclipse);
  const before = settleLadder(facts({ mornings: 2, firstMorning: '2027-12-01', latest: '2028-11-14' }));
  assert.equal(before.owned.eclipse, undefined);
  assert.equal(ECLIPSE_DAYS, 350);
});

test('the Eclipse needs a first morning on record', () => {
  assert.equal(settleLadder(facts({ mornings: 400, firstMorning: null, latest: '2027-12-01' })).owned.eclipse, undefined);
});

test('the Eclipse morning is a ladder morning: a rare hit that day waits', () => {
  const key = '2027-10-27';
  const seed = seedFor(key, true);
  const owned = settleLadder(facts({ mornings: 5, latest: '2026-11-10' })).owned;
  const out = settleLadder(facts({ mornings: 6, firstMorning: '2026-11-11', latest: key, owned, rare: { due: false, rolled: null, seed } }));
  assert.ok(out.owned.eclipse);
  assert.equal(out.owned[RARE_MOON], undefined);
  assert.deepEqual(out.rare.due, [RARE_MOON]);
});

test('a rare hit that waits survives several ladder mornings in a row, then lands', () => {
  // Morning 3 hits; mornings 3 is Harvest... then a long-time user catches up again the next day (Aurora at 7).
  let state = settleLadder(facts({ mornings: 3, latest: '2026-11-04', rare: { due: true, rolled: '2026-11-04', seed: 1 } }));
  assert.equal(state.owned[RARE_MOON], undefined);
  state = settleLadder(facts({ mornings: 7, latest: '2026-11-05', owned: state.owned, rare: state.rare }));
  assert.ok(state.owned.aurora);
  assert.equal(state.owned[RARE_MOON], undefined, 'not on a ladder morning');
  state = settleLadder(facts({ mornings: 8, latest: '2026-11-06', owned: state.owned, rare: state.rare }));
  assert.ok(state.owned[RARE_MOON]);
  assert.equal(state.owned[RARE_MOON].morningKey, '2026-11-06');
});

test('once owned, the rare moon stops rolling and never comes twice', () => {
  const owned = { [RARE_MOON]: { id: RARE_MOON, morningKey: '2026-11-04', morning: 3, at: 0 } };
  const out = settleLadder(facts({ mornings: 9, latest: '2026-11-20', owned, rare: { due: true, rolled: '2026-11-04', seed: 1 } }));
  assert.equal(out.rare.rolled, '2026-11-04');
  assert.deepEqual(out.earned.filter((id) => id === RARE_MOON), []);
});

test('the same seed and morning always roll the same, and other seeds differ', () => {
  assert.equal(rollFor(42, '2026-11-04'), rollFor(42, '2026-11-04'));
  assert.notEqual(rollFor(42, '2026-11-04'), rollFor(43, '2026-11-04'));
  assert.notEqual(rollFor(42, '2026-11-04'), rollFor(42, '2026-11-05'));
  for (let i = 0; i < 1000; i++) {
    const r = rollFor(i, `2026-11-${i}`);
    assert.ok(r >= 0 && r < 1);
  }
});

test('settling never changes a moon already owned (its morning, date or flags)', () => {
  const dawn = { id: 'dawn', morningKey: '2026-01-01', morning: 1, at: 5, presented: true, seen: true };
  const out = settleLadder(facts({ mornings: 50, latest: '2026-12-01', owned: { dawn } }));
  assert.deepEqual(out.owned.dawn, dawn);
  assert.ok(!out.earned.includes('dawn'));
});

test('settling does not mutate what it was given', () => {
  const owned = {};
  const rare = { due: false, rolled: null, seed: 3 };
  settleLadder(facts({ mornings: 7, latest: '2026-11-08', owned, rare }));
  assert.deepEqual(owned, {});
  assert.deepEqual(rare, { due: false, rolled: null, seed: 3 });
});

test('a limited moon and a ladder moon can both come on one morning', () => {
  const out = settleLadder(facts({ mornings: 3, latest: '2027-08-02', limited: [{ id: 'long-eclipse', date: '2027-08-02' }] }));
  assert.ok(out.owned.harvest);
  assert.ok(out.owned['long-eclipse']);
});

test('ladderNeed: the next rung counts down to 0 and never below', () => {
  assert.deepEqual(ladderNeed(0, { mornings: 0, firstMorning: null, today: '2026-11-01' }), { left: 1, unit: 'morning', at: 'Morning 1' });
  assert.equal(ladderNeed(2, { mornings: 50, firstMorning: null, today: '2026-11-01' })?.left, 0);
  // The Eclipse, a week past due, says 0 weeks.
  assert.equal(ladderNeed(9, { mornings: 5, firstMorning: '2025-01-01', today: '2026-11-01' })?.left, 0);
  // 349 days in: one week left (rounded up, never "0 weeks" early).
  assert.equal(ladderNeed(9, { mornings: 5, firstMorning: '2026-01-01', today: daysAfter('2026-01-01', 349) })?.left, 1);
});

function daysAfter(key: string, n: number): string {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

// ---- A simulated two years of real use ----

test('two years of random mornings, many installs: the rules always hold', () => {
  let rareInstalls = 0;
  for (let install = 0; install < 400; install++) {
    // A pseudo-random habit per install: some get up most days, some rarely.
    let r = install * 9973 + 17;
    const rand = () => ((r = (r * 1103515245 + 12345) >>> 0) / 0x1_0000_0000);
    const habit = 0.3 + rand() * 0.7;
    const start = '2026-11-02';
    let owned = {} as LadderFacts['owned'];
    let rare: RareState = { due: [], rolled: null, seed: install };
    let mornings = 0;
    let first: string | null = null;
    const earnedOn = new Map<string, string[]>();
    for (let day = 0; day < 730; day++) {
      if (rand() > habit) continue;
      const key = daysAfter(start, day);
      mornings++;
      first ??= key;
      // Sometimes the app is opened several times that morning; sometimes not at all (a shield wake-up).
      const looks = rand() < 0.15 ? 0 : 1 + Math.floor(rand() * 3);
      for (let look = 0; look < looks; look++) {
        const out = settleLadder({ ladder: LADDER, mornings, firstMorning: first, latest: key, owned, rare, limited: [], now: day, rareMoons: [RARE_MOON] });
        for (const id of out.earned) {
          assert.ok(!owned[id], `${id} earned twice`);
          earnedOn.set(key, [...(earnedOn.get(key) ?? []), id]);
        }
        owned = out.owned;
        rare = out.rare;
      }
      // Every rung due is owned once the app has been opened on a morning at that count or later.
      LADDER_MORNINGS.forEach((count, i) => {
        if (mornings >= count && looks > 0) assert.ok(owned[LADDER[i]], `${LADDER[i]} missing at ${mornings}`);
        if (mornings < count) assert.equal(owned[LADDER[i]], undefined, `${LADDER[i]} early at ${mornings}`);
      });
    }
    const rareMoon = owned[RARE_MOON];
    if (rareMoon) {
      rareInstalls++;
      const sameDay = earnedOn.get(rareMoon.morningKey) ?? [];
      const ladderSameDay = sameDay.filter((id) => LADDER.slice(0, 10).includes(id));
      assert.deepEqual(ladderSameDay, [], `rare moon came with ${ladderSameDay} on ${rareMoon.morningKey}`);
      assert.ok(rareMoon.morning >= RARE_FROM_MORNING);
    }
    assert.equal(owned['twin-moonlet'], undefined);
  }
  // At ~0.65 mornings a day for two years, well over half of installs should have seen it; never all.
  assert.ok(rareInstalls > 150 && rareInstalls < 400, `rare in ${rareInstalls}/400`);
});

// ——— More than one rare moon (Blue Moon added, user 2026-11-02). ———
const BLUE = RARES[1];
/** A seed whose rolls for `key` hit the second rare moon, and the first too or not. */
function seedForBoth(key: string, first: boolean): number {
  for (let seed = 0; ; seed++) {
    const a = rollFor(seed, key) < 1 / RARE_ODDS, b = rollFor(seed, `${key}:${BLUE}`) < 1 / RARE_ODDS;
    if (b && a === first) return seed;
  }
}
/** The first two rungs owned on earlier mornings, so morning 4 isn't a ladder morning. */
const earlier = () => ({
  dawn: { id: 'dawn', morningKey: '2026-11-02', morning: 1, at: 0 },
  harvest: { id: 'harvest', morningKey: '2026-11-04', morning: 3, at: 0 },
});

test('each rare moon rolls on its own: the second can come alone', () => {
  const key = '2026-11-06';
  const out = settleLadder(facts({ mornings: 4, latest: key, owned: earlier(), rareMoons: RARES, rare: { due: [], rolled: null, seed: seedForBoth(key, false) } }));
  assert.deepEqual(out.earned, [BLUE]);
});

test('two rare hits the same morning: one now, the other on the next non-ladder morning', () => {
  const key = '2026-11-06';
  const first = settleLadder(facts({ mornings: 4, latest: key, owned: earlier(), rareMoons: RARES, rare: { due: [], rolled: null, seed: seedForBoth(key, true) } }));
  assert.deepEqual(first.earned, [RARE_MOON]);
  assert.deepEqual(first.rare.due, [BLUE]);
  const next = settleLadder(facts({ mornings: 5, latest: '2026-11-07', owned: first.owned, rareMoons: RARES, rare: first.rare }));
  assert.deepEqual(next.earned, [BLUE]);
  assert.deepEqual(next.rare.due, []);
});

test('an older install’s saved `due: true` still gives the first rare moon', () => {
  const out = settleLadder(facts({ mornings: 4, latest: '2026-11-06', owned: earlier(), rareMoons: RARES, rare: { due: true, rolled: '2026-11-06', seed: 1 } }));
  assert.deepEqual(out.earned, [RARE_MOON]);
  assert.deepEqual(out.rare.due, []);
});

test('with one rare moon owned the others still roll; with all owned, mornings stop rolling', () => {
  const one = settleLadder(facts({ mornings: 4, latest: '2026-11-06', owned: { ...earlier(), [RARE_MOON]: { id: RARE_MOON, morningKey: '2026-11-05', morning: 3, at: 0 } }, rareMoons: RARES, rare: { due: [], rolled: '2026-11-05', seed: 1 } }));
  assert.equal(one.rare.rolled, '2026-11-06');
  const owned = { ...earlier(), ...Object.fromEntries(RARES.map((id) => [id, { id, morningKey: '2026-11-05', morning: 3, at: 0 }])) };
  const all = settleLadder(facts({ mornings: 4, latest: '2026-11-06', owned, rareMoons: RARES, rare: { due: [], rolled: '2026-11-05', seed: 1 } }));
  assert.equal(all.rare.rolled, '2026-11-05');
  assert.deepEqual(all.earned, []);
});

test('the app’s rare list is used when none is given', () => {
  assert.ok(RARE_MOONS.length >= 1);
});

test('Coca-Cola barcodes: US cans and bottles in every form the camera reports, Europe, the UK; nothing else', () => {
  assert.ok(ladder.isCokeBarcode('049000006346', 'upc_a'), 'a 12 oz can, UPC-A');
  assert.ok(ladder.isCokeBarcode('0049000006346', 'ean13'), 'the same, as EAN-13 (how iOS reports UPC-A)');
  assert.ok(ladder.isCokeBarcode('04963406', 'upc_e'), 'the same can, as its short UPC-E');
  assert.ok(ladder.isCokeBarcode('5449000000996', 'ean13'), 'a European Coke');
  assert.ok(ladder.isCokeBarcode('5000112637922', 'ean13'), 'a UK Coke');
  assert.ok(!ladder.isCokeBarcode('012000001291', 'upc_a'), 'a Pepsi');
  assert.ok(!ladder.isCokeBarcode('5012345678900', 'ean13'));
  assert.ok(!ladder.isCokeBarcode('locturne:abc123', 'qr'), 'a QR');
  assert.ok(!ladder.isCokeBarcode('', ''));
});

test('the secret rules: early before 5, coke only on a scan morning, far only on a place morning from 2 km', () => {
  const base = { kind: 'steps', hour: 7, scanned: null, farthest: null };
  assert.deepEqual(ladder.secretsMet(base), []);
  assert.deepEqual(ladder.secretsMet({ ...base, hour: 4 }), ['early']);
  assert.deepEqual(ladder.secretsMet({ ...base, hour: 5 }), []);
  const coke = { data: '0049000006346', type: 'ean13' };
  assert.deepEqual(ladder.secretsMet({ ...base, kind: 'scan', scanned: coke }), ['coke']);
  assert.deepEqual(ladder.secretsMet({ ...base, scanned: coke }), []);
  assert.deepEqual(ladder.secretsMet({ ...base, kind: 'place', farthest: 2000 }), ['far']);
  assert.deepEqual(ladder.secretsMet({ ...base, kind: 'place', farthest: 1999 }), []);
  assert.deepEqual(ladder.secretsMet({ ...base, farthest: 9000 }), []);
  assert.ok(Math.abs(ladder.metresBetween({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 1 }) - 111_195) < 10);
});
