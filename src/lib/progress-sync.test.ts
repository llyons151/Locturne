/// <reference types="node" />
/**
 * The progress backup's merge and its order (progress-sync.ts) against a fake App Group and fake
 * iCloud and Keychain copies: a reinstall gets everything back, nothing a copy holds is ever
 * taken away, and a fresh install never saves its empty progress over a real copy.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createProgressSync, EMPTY, mergeProgress, parseProgress, serializeProgress, type Progress } from './progress-sync.ts';

const proof = (morningKey: string, kind = 'steps', hour = 7) => ({ morningKey, kind, at: new Date(`${morningKey}T0${hour}:10:00`).getTime() }) as Progress['proofs'][number];
const moon = (id: string, morningKey: string, extra = {}) => ({ id, morningKey, morning: 1, at: new Date(`${morningKey}T07:10:00`).getTime(), ...extra });

const lived: Progress = {
  won: 40,
  first: '2026-09-01',
  proofs: [proof('2026-10-10'), proof('2026-10-09'), proof('2026-10-08', 'pass')],
  owned: { dawn: moon('dawn', '2026-09-01', { presented: true, seen: true }), harvest: moon('harvest', '2026-09-03') },
  rare: { due: [], rolled: '2026-10-10', seed: 1234 },
};

/** A phone: its App Group, both copies, and a counter of saves. */
function phone(local: Progress, cloud: string | null = null, keychain: string | null = null) {
  const state = { local, cloud, keychain, writes: 0, applied: 0 };
  const sync = createProgressSync({
    readLocal: () => state.local,
    applyLocal: (p) => {
      state.local = p;
      state.applied++;
    },
    readStores: () => ({ cloud: state.cloud, keychain: state.keychain }),
    writeStores: (json) => {
      state.cloud = json;
      state.keychain = json;
      state.writes++;
    },
    now: () => 1_800_000_000_000,
  });
  return { state, sync };
}

test('a reinstall gets the count, first morning, proofs and moons back', () => {
  const saved = serializeProgress(lived, 1);
  const { state, sync } = phone(EMPTY, saved, saved);
  const back = sync.restore();
  assert.equal(state.local.won, 40);
  assert.equal(state.local.first, '2026-09-01');
  assert.equal(state.local.proofs.length, 3);
  assert.deepEqual(Object.keys(state.local.owned).sort(), ['dawn', 'harvest']);
  assert.equal(state.local.owned.dawn.seen, true, 'a moon seen before stays seen, no "New" again');
  assert.equal(state.local.rare?.seed, 1234, 'the same rare seed, so mornings are not rerolled');
  assert.deepEqual(back, { won: 40, moons: 2, proofs: 3 });
});

test('the Keychain alone is enough (iCloud off)', () => {
  const { state, sync } = phone(EMPTY, null, serializeProgress(lived, 1));
  sync.restore();
  assert.equal(state.local.won, 40);
  assert.ok(parseProgress(state.cloud), 'and the iCloud copy is written from it');
});

test('iCloud alone is enough (a new phone)', () => {
  const { state, sync } = phone(EMPTY, serializeProgress(lived, 1), null);
  sync.restore();
  assert.equal(state.local.won, 40);
  assert.equal(parseProgress(state.keychain)?.won, 40);
});

test('a fresh install with no copies changes nothing and saves its empty start once', () => {
  const { state, sync } = phone(EMPTY);
  assert.deepEqual(sync.restore(), { won: 0, moons: 0, proofs: 0 });
  assert.equal(state.applied, 0);
  assert.equal(state.writes, 1);
  sync.restore();
  assert.equal(state.writes, 1, 'nothing new, nothing written');
});

test('nothing is saved before the first restore, so an empty start never covers a real copy', () => {
  const saved = serializeProgress(lived, 1);
  const { state, sync } = phone(EMPTY, saved, saved);
  sync.save();
  assert.equal(state.writes, 0);
  assert.equal(parseProgress(state.cloud)?.won, 40);
});

test('iCloud arriving late (after an empty first launch) is still merged in, not overwritten', () => {
  const { state, sync } = phone(EMPTY);
  sync.restore();
  // Launch saved an empty copy; then iCloud hands over the real one and its change event restores.
  state.cloud = serializeProgress(lived, 1);
  sync.restore();
  assert.equal(state.local.won, 40);
  assert.equal(parseProgress(state.keychain)?.won, 40);
});

test('a phone ahead of its copies is never pulled back', () => {
  const ahead: Progress = { ...lived, won: 41, proofs: [proof('2026-10-11'), ...lived.proofs] };
  const { state, sync } = phone(ahead, serializeProgress(lived, 1), serializeProgress(lived, 1));
  sync.restore();
  assert.equal(state.applied, 0, 'the phone already has everything');
  assert.equal(parseProgress(state.cloud)?.won, 41, 'and the copies catch up');
});

test('a new morning after launch is saved', () => {
  const { state, sync } = phone(lived);
  sync.restore();
  state.local = { ...lived, won: 41, proofs: [proof('2026-10-11'), ...lived.proofs] };
  sync.save();
  assert.equal(parseProgress(state.cloud)?.won, 41);
  assert.equal(parseProgress(state.cloud)?.proofs.length, 4);
});

test('a save merges with the copies: one copy ahead of the phone keeps its extra', () => {
  const other: Progress = { ...lived, owned: { ...lived.owned, aurora: moon('aurora', '2026-09-07') } };
  const { state, sync } = phone(lived, serializeProgress(other, 1), serializeProgress(other, 1));
  sync.restore();
  assert.ok(state.local.owned.aurora);
  state.local = { ...state.local, owned: { harvest: lived.owned.harvest } };
  sync.save();
  assert.ok(parseProgress(state.cloud)?.owned.aurora, 'a save never takes a moon out of the copies');
});

test('replace (dev resets) makes the copies exactly the phone, and a relaunch keeps it so', () => {
  const saved = serializeProgress(lived, 1);
  const { state, sync } = phone(lived, saved, saved);
  sync.restore();
  state.local = { ...lived, owned: {}, rare: null };
  sync.replace();
  assert.deepEqual(parseProgress(state.cloud)?.owned, {});
  const relaunch = phone(state.local, state.cloud, state.keychain);
  relaunch.sync.restore();
  assert.deepEqual(relaunch.state.local.owned, {}, 'forgotten moons stay forgotten');
});

test('merge: counts take the larger, the first morning the earlier, proofs once each and newest first', () => {
  const a: Progress = { ...EMPTY, won: 3, first: '2026-10-02', proofs: [proof('2026-10-03'), proof('2026-10-02')] };
  const b: Progress = { ...EMPTY, won: 5, first: '2026-09-30', proofs: [proof('2026-10-02'), proof('2026-10-04')] };
  const m = mergeProgress(a, b);
  assert.equal(m.won, 5);
  assert.equal(m.first, '2026-09-30');
  assert.deepEqual(m.proofs.map((p) => p.morningKey), ['2026-10-04', '2026-10-03', '2026-10-02']);
});

test('merge: the count is never below the real wake-ups the proofs show', () => {
  const m = mergeProgress({ ...EMPTY, won: 1, proofs: [proof('2026-10-01'), proof('2026-10-02'), proof('2026-10-03', 'emergency')] }, EMPTY);
  assert.equal(m.won, 2);
  assert.equal(m.first, '2026-10-01');
});

test('merge: proofs keep the latest 30', () => {
  const many = Array.from({ length: 40 }, (_, i) => proof(`2026-08-${String(i % 28 + 1).padStart(2, '0')}`, 'steps', i < 28 ? 7 : 8));
  const m = mergeProgress({ ...EMPTY, proofs: many.slice(0, 20) }, { ...EMPTY, proofs: many.slice(20) });
  assert.equal(m.proofs.length, 30);
  assert.ok(m.proofs.every((p, i) => i === 0 || m.proofs[i - 1].at >= p.at));
});

test('merge: a moon on both keeps when it was first earned, and shown or seen on either', () => {
  const early = moon('dawn', '2026-09-01');
  const late = { ...moon('dawn', '2026-09-05'), presented: true, seen: true };
  const m = mergeProgress({ ...EMPTY, owned: { dawn: late } }, { ...EMPTY, owned: { dawn: early } });
  assert.equal(m.owned.dawn.morningKey, '2026-09-01');
  assert.equal(m.owned.dawn.presented, true);
  assert.equal(m.owned.dawn.seen, true);
});

test('merge: the rare roll keeps the copy that rolled furthest, so a fresh seed cannot reroll', () => {
  const fresh = { due: [], rolled: null, seed: 99 };
  const old = { due: ['bloodmoon'], rolled: '2026-10-10', seed: 1234 };
  assert.equal(mergeProgress({ ...EMPTY, rare: fresh }, { ...EMPTY, rare: old }).rare?.seed, 1234);
  assert.equal(mergeProgress({ ...EMPTY, rare: old }, { ...EMPTY, rare: fresh }).rare?.seed, 1234);
});

test('parse: garbage, other versions and broken entries are dropped, never thrown', () => {
  assert.equal(parseProgress('not json'), null);
  assert.equal(parseProgress(JSON.stringify({ v: 2, won: 9 })), null);
  assert.equal(parseProgress(null), null);
  const p = parseProgress(JSON.stringify({ v: 1, won: -4, proofs: [{ morningKey: 1 }, proof('2026-10-01')], owned: { x: null, dawn: moon('dawn', '2026-10-01') }, rare: { seed: 'no' } }));
  assert.equal(p?.won, 0);
  assert.equal(p?.proofs.length, 1);
  assert.deepEqual(Object.keys(p?.owned ?? {}), ['dawn']);
  assert.equal(p?.rare, null);
});

test('a broken copy beside a good one: the good one wins', () => {
  const { state, sync } = phone(EMPTY, '{"v":1,', serializeProgress(lived, 1));
  sync.restore();
  assert.equal(state.local.won, 40);
  assert.equal(parseProgress(state.cloud)?.won, 40, 'and the broken copy is rewritten');
});
