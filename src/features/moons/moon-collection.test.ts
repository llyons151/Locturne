/// <reference types="node" />
/**
 * The moon store (moon-collection.ts) against a fake App Group, fake proofs and a fake
 * pedometer. Loaded fresh for each test, as on a cold launch, through Babel into a sandbox
 * (as home-screen.test.ts does), since it imports React Native and Expo.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

import * as ladder from './moon-ladder.ts';

const require = createRequire(import.meta.url);
const babel = require('@babel/core');
const code = babel.transformSync(readFileSync(new URL('./moon-collection.ts', import.meta.url), 'utf8'), {
  filename: 'moon-collection.ts',
  configFile: false,
  babelrc: false,
  presets: ['@babel/preset-typescript'],
  plugins: ['@babel/plugin-transform-modules-commonjs'],
}).code;

const LADDER = ['dawn', 'harvest', 'aurora', 'supermoon', 'nebula', 'midnightsun', 'blood', 'deepsea', 'prism', 'eclipse', 'bluehour', 'strawberry', 'micromoon'];

type Proof = { morningKey: string; kind: string; at: number; morningStart?: number; code?: { data: string; type: string } };

/** A cold launch: the store over `disk` (the App Group, kept between launches) and today's facts. */
function launch({
  disk = new Map<string, unknown>(),
  proofs = [] as Proof[],
  mornings = proofs.filter((p: Proof) => p.kind !== 'pass' && p.kind !== 'emergency').length,
  first = null as string | null,
  /** The scan code saved now, which the store must not read (the proof keeps that morning's). */
  scanCode = null as null | { kind: string; data: string; type: string; registeredAt: number },
} = {}) {
  const pushed: string[] = [];
  let proofListener: (() => void) | null = null;
  let subscribeFn: ((listener: () => void) => () => void) | null = null;
  const facts = { proofs, mornings, first };
  const mocks: Record<string, unknown> = {
    react: {
      useSyncExternalStore: (sub: typeof subscribeFn, get: () => unknown) => {
        subscribeFn = sub;
        return get();
      },
    },
    'expo-router': { router: { push: (href: string) => pushed.push(href) } },
    '@/lib/scan-code': { getScanCode: () => scanCode },
    '@/lib/morning-proof': {
      getProofs: () => facts.proofs,
      getMorningsWon: () => facts.mornings,
      getFirstMorning: () => facts.first,
      onProofChange: (listener: () => void) => {
        proofListener = listener;
        return () => {};
      },
    },
    '@/lib/screen-time': {
      sharedGet: (key: string) => (disk.has(key) ? structuredClone(disk.get(key)) : undefined),
      sharedSet: (key: string, value: unknown) => (value == null ? disk.delete(key) : disk.set(key, structuredClone(value))),
    },
    './moon-data': { LADDER, MOONS: [...LADDER, ...ladder.RARE_MOONS].map((id) => ({ id })) },
    './moon-ladder': ladder,
  };
  const exports: Record<string, any> = {};
  runInNewContext(code, { exports, require: (id: string) => mocks[id] ?? assert.fail(`unmocked import ${id}`), Math, Date, Promise, structuredClone });
  return {
    m: exports,
    disk,
    pushed,
    facts,
    /** Subscribes as React would, after a `useOwnedMoons()` call. */
    subscribe: (listener: () => void) => subscribeFn!(listener),
    /** A wake-up recorded while the app is open. */
    wake: (p: Proof) => {
      facts.proofs = [p, ...facts.proofs];
      if (p.kind !== 'pass' && p.kind !== 'emergency') facts.mornings++;
      facts.first ??= p.morningKey;
      proofListener?.();
    },
  };
}

const at = (key: string, h = 7, min = 10) => {
  const [y, mo, d] = key.split('-').map(Number);
  return new Date(y, mo - 1, d, h, min).getTime();
};
const walk = (key: string, extra: Partial<Proof> = {}): Proof => ({ morningKey: key, kind: 'steps', at: at(key), morningStart: at(key, 7, 0), ...extra });

test('a fresh install owns nothing and earns nothing', () => {
  const { m } = launch();
  assert.deepEqual(m.settleMoons(), []);
  assert.deepEqual({ ...m.getOwned() }, {});
});

test('the first wake-up earns the first moon, saved to the App Group, and survives a relaunch', () => {
  const app = launch({ proofs: [walk('2026-11-02')], first: '2026-11-02' });
  assert.deepEqual([...app.m.settleMoons()], ['dawn']);
  const again = launch({ disk: app.disk, proofs: [walk('2026-11-02')], first: '2026-11-02' });
  assert.equal(again.m.getOwned().dawn.morningKey, '2026-11-02');
  assert.deepEqual([...again.m.settleMoons()], [], 'not earned twice after a relaunch');
});

test('a wake-up while the app is open earns its moon straight away', () => {
  const app = launch();
  app.wake(walk('2026-11-02'));
  assert.ok(app.m.ownsMoon('dawn'));
});

test('a pass or an emergency unlock is never the morning a moon is dated to', () => {
  const proofs = [{ morningKey: '2026-11-05', kind: 'pass', at: at('2026-11-05') }, walk('2026-11-04')];
  const app = launch({ proofs, mornings: 1, first: '2026-11-04' });
  app.m.settleMoons();
  assert.equal(app.m.getOwned().dawn.morningKey, '2026-11-04');
});

test('passes alone earn nothing', () => {
  const app = launch({ proofs: [{ morningKey: '2026-11-05', kind: 'pass', at: at('2026-11-05') }], mornings: 0 });
  assert.deepEqual([...app.m.settleMoons()], []);
});

test('the rare roll is seeded once per install and kept between launches', () => {
  const app = launch({ proofs: [walk('2026-11-02')], first: '2026-11-02' });
  app.m.settleMoons();
  const seed = (app.disk.get('locturne.moons.rare') as { seed: number }).seed;
  const again = launch({ disk: app.disk, proofs: [walk('2026-11-03'), walk('2026-11-02')], first: '2026-11-02' });
  again.m.settleMoons();
  assert.equal((again.disk.get('locturne.moons.rare') as { seed: number }).seed, seed);
});

test('settling with nothing new writes nothing (the payoff settles on every render)', () => {
  const app = launch({ proofs: [walk('2026-11-03'), walk('2026-11-02')], first: '2026-11-02' });
  app.m.settleMoons();
  const writes: string[] = [];
  const set = app.disk.set.bind(app.disk);
  app.disk.set = (k: string, v: unknown) => (writes.push(k), set(k, v));
  for (let i = 0; i < 5; i++) app.m.settleMoons();
  assert.deepEqual(writes, []);
});

test('the snapshot keeps its identity until something changes (useSyncExternalStore would loop otherwise)', () => {
  const app = launch({ proofs: [walk('2026-11-02')], first: '2026-11-02' });
  app.m.settleMoons();
  const a = app.m.getOwned();
  app.m.settleMoons();
  app.m.markSeen(['nothing-owned']);
  assert.equal(app.m.getOwned(), a);
  app.m.markSeen(['dawn']);
  assert.notEqual(app.m.getOwned(), a);
  const b = app.m.getOwned();
  app.m.markSeen(['dawn']);
  assert.equal(app.m.getOwned(), b, 'marking again changes nothing');
});

test('the payoff shows each moon once: presented moons drop out, the biggest comes first', () => {
  // A long-time user's first look: four rungs at once on this morning.
  const proofs = [walk('2026-11-20')];
  const app = launch({ proofs, mornings: 14, first: '2026-10-01' });
  app.m.settleMoons();
  const shown = app.m.unpresented('2026-11-20').map((x: { id: string }) => x.id);
  assert.deepEqual([...shown], ['supermoon', 'aurora', 'harvest', 'dawn']);
  app.m.markPresented(shown);
  assert.deepEqual([...app.m.unpresented('2026-11-20')], []);
  // Another morning's moons aren't this morning's.
  assert.deepEqual([...app.m.unpresented('2026-11-21')], []);
});

test('seen and presented are separate: the collection still says New after the payoff', () => {
  const app = launch({ proofs: [walk('2026-11-02')], first: '2026-11-02' });
  app.m.settleMoons();
  app.m.markPresented(['dawn']);
  assert.equal(app.m.getOwned().dawn.seen, undefined);
  app.m.markSeen(['dawn']);
  assert.equal(app.m.getOwned().dawn.seen, true);
  assert.equal(app.m.getOwned().dawn.presented, true);
});

// ---- The secret moons ----

const scanProof = (key: string, extra: Partial<Proof> = {}): Proof => walk(key, { kind: 'scan', ...extra });
const placeProof = (key: string, extra: Partial<Proof> = {}): Proof => walk(key, { kind: 'place', ...extra });
/** A Coca-Cola 12 oz can, as the camera reads it (UPC-A written as EAN-13). */
const COKE_CAN = { kind: 'barcode', data: '0049000006346', type: 'ean13', registeredAt: 0 };
/** The same can as a scan proof keeps it. */
const COKE = { data: COKE_CAN.data, type: COKE_CAN.type };

test('early: a wake-up before 5:00 earns it, 5:00 on the dot does not', () => {
  const early = launch({ proofs: [walk('2026-11-02', { at: at('2026-11-02', 4, 59) })], first: '2026-11-02' });
  assert.deepEqual([...early.m.checkSecretMoons()], ['bluehour']);
  const five = launch({ proofs: [walk('2026-11-02', { at: at('2026-11-02', 5, 0) })], first: '2026-11-02' });
  assert.deepEqual([...five.m.checkSecretMoons()], []);
});

test('coke: a scan morning on a Coca-Cola barcode earns it; another barcode or a walk does not', () => {
  const coke = launch({ proofs: [scanProof('2026-11-02', { code: COKE })], first: '2026-11-02', scanCode: COKE_CAN });
  assert.deepEqual([...coke.m.checkSecretMoons()], ['strawberry']);
  const other = launch({ proofs: [scanProof('2026-11-02', { code: { ...COKE, data: '5012345678900' } })], first: '2026-11-02' });
  assert.deepEqual([...other.m.checkSecretMoons()], []);
  const walked = launch({ proofs: [walk('2026-11-02')], first: '2026-11-02', scanCode: COKE_CAN });
  assert.deepEqual([...walked.m.checkSecretMoons()], [], 'a Coke code saved, but the morning was a walk');
});

test('coke: a Coke can saved as the code after an ordinary scan morning earns nothing (user, 2026-11-02)', () => {
  const later = launch({ proofs: [scanProof('2026-11-02', { code: { ...COKE, data: '5012345678900' } })], first: '2026-11-02', scanCode: COKE_CAN });
  assert.deepEqual([...later.m.checkSecretMoons()], [], 'the can is the code now, but it was not what got them up');
  const old = launch({ proofs: [scanProof('2026-11-02')], first: '2026-11-02', scanCode: COKE_CAN });
  assert.deepEqual([...old.m.checkSecretMoons()], [], 'a scan proof saved before codes were kept never counts');
});

test('far: a place morning Home saw start 2 km or more away earns it, only that morning', () => {
  const app = launch({ proofs: [placeProof('2026-11-02')], first: '2026-11-02' });
  app.m.noteFarthest('2026-11-02', 800);
  app.m.noteFarthest('2026-11-02', 2400);
  app.m.noteFarthest('2026-11-02', 30);
  assert.deepEqual([...app.m.checkSecretMoons()], ['micromoon']);

  const near = launch({ proofs: [placeProof('2026-11-02')], first: '2026-11-02' });
  near.m.noteFarthest('2026-11-02', 1999);
  assert.deepEqual([...near.m.checkSecretMoons()], []);

  const stale = launch({ proofs: [placeProof('2026-11-03')], first: '2026-11-02' });
  stale.m.noteFarthest('2026-11-02', 5000);
  assert.deepEqual([...stale.m.checkSecretMoons()], [], "yesterday's trip doesn't count for today");

  const walked = launch({ proofs: [walk('2026-11-02')], first: '2026-11-02' });
  walked.m.noteFarthest('2026-11-02', 5000);
  assert.deepEqual([...walked.m.checkSecretMoons()], [], 'only on a place morning');
});

test('the secrets: a pass never counts, nor nothing at all, and each is earned once', () => {
  const pass = { morningKey: '2026-11-03', kind: 'pass', at: at('2026-11-03', 4, 0), morningStart: at('2026-11-03', 4, 0) };
  assert.deepEqual([...launch({ proofs: [pass], mornings: 0 }).m.checkSecretMoons()], []);
  assert.deepEqual([...launch().m.checkSecretMoons()], []);
  const app = launch({ proofs: [scanProof('2026-11-02', { at: at('2026-11-02', 4, 30), code: COKE })], first: '2026-11-02' });
  assert.deepEqual([...app.m.checkSecretMoons()].sort(), ['bluehour', 'strawberry'], 'one morning can earn two');
  assert.deepEqual([...app.m.checkSecretMoons()], []);
});

test('a secret is earned the moment the wake-up is recorded, dated to its morning', () => {
  const app = launch({ proofs: [], first: null });
  app.wake(walk('2026-11-04', { at: at('2026-11-04', 4, 10) }));
  assert.equal(app.m.getOwned().bluehour.morningKey, '2026-11-04');
  assert.deepEqual([...app.m.unpresented('2026-11-04')].map((m) => m.id), ['bluehour', 'dawn'], 'shown on the payoff, the secret first');
});

test('the secret moons are the ladder slots after the Eclipse, by rule', () => {
  const { m } = launch();
  assert.deepEqual(m.SECRET_MOONS.map((s: { rule: string; id: string }) => `${s.rule}:${s.id}`), ['early:bluehour', 'coke:strawberry', 'far:micromoon']);
  assert.ok(m.isSecret('micromoon') && !m.isSecret('eclipse'));
});

// ---- Opening the collection ----

test('the collection opens as a page by default, as a sheet once switched', () => {
  const app = launch();
  app.m.openMoons();
  app.m.setMoonsAsPage(false);
  app.m.openMoons();
  app.m.setMoonsAsPage(true);
  app.m.openMoons();
  assert.deepEqual(app.pushed, ['/moon-page', '/moon-sheet', '/moon-page']);
});

test('earning every moon (dev) gives the whole ladder, the secrets and the rare ones, once', () => {
  const app = launch();
  const added = app.m.devEarnAll();
  const owned = app.m.getOwned();
  assert.ok(added > 0);
  for (const id of ladder.RARE_MOONS) assert.ok(Object.keys(owned).includes(id));
  for (const id of ['eclipse', 'bluehour', 'strawberry', 'micromoon']) assert.ok(Object.keys(owned).includes(id), id);
  assert.equal(app.m.devEarnAll(), 0);
});

test('the sheet-or-page switch is kept between launches', () => {
  const app = launch();
  app.m.setMoonsAsPage(false);
  assert.equal(launch({ disk: app.disk }).m.getMoonsAsPage(), false);
});

// ---- Dev tools ----

test('dev: earn the next moon goes up the ladder in order and stops at the end', () => {
  const app = launch({ proofs: [walk('2026-11-02')], first: '2026-11-02' });
  const got: string[] = [];
  for (let i = 0; i < LADDER.length + 2; i++) got.push(app.m.devEarnNext());
  assert.deepEqual(got, [...LADDER, null, null]);
});

test('dev: forget my moons empties the collection and the rare roll', () => {
  const app = launch({ proofs: [walk('2026-11-02')], first: '2026-11-02' });
  app.m.settleMoons();
  app.m.devForgetMoons();
  assert.deepEqual({ ...app.m.getOwned() }, {});
  assert.equal(app.disk.has('locturne.moons.rare'), false);
  assert.deepEqual({ ...launch({ disk: app.disk }).m.getOwned() }, {});
});

test('subscribers hear about each change, and stop hearing once unsubscribed', () => {
  const app = launch({ proofs: [walk('2026-11-02')], first: '2026-11-02' });
  let heard = 0;
  // What React does with useOwnedMoons: subscribe, read, later unsubscribe.
  app.m.useOwnedMoons();
  const unsubscribe = app.subscribe(() => heard++);
  app.m.settleMoons();
  assert.equal(heard, 1, 'earning');
  app.m.markSeen(['dawn']);
  assert.equal(heard, 2, 'seen');
  app.m.markSeen(['dawn']);
  assert.equal(heard, 2, 'no change, no news');
  unsubscribe();
  app.m.devEarnNext();
  assert.equal(heard, 2, 'unsubscribed');
});

test('a saved moon the app no longer has (a re-bake) is dropped on load, so the payoff never shows it', () => {
  const app = launch({ proofs: [walk('2026-11-04')], first: '2026-11-04' });
  app.disk.set('locturne.moons.owned', {
    gone: { id: 'gone', morningKey: '2026-11-04', morning: 1, at: 1 },
    harvest: { id: 'harvest', morningKey: '2026-11-04', morning: 1, at: 1 },
  });
  const again = launch({ disk: app.disk, proofs: [walk('2026-11-04')], first: '2026-11-04' });
  assert.deepEqual([...Object.keys(again.m.getOwned())], ['harvest']);
  assert.deepEqual([...again.m.unpresented('2026-11-04').map((m: { id: string }) => m.id)], ['harvest']);
});
