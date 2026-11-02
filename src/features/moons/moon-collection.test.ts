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

const LADDER = ['dawn', 'harvest', 'aurora', 'supermoon', 'nebula', 'midnightsun', 'blood', 'deepsea', 'prism', 'eclipse', 'twin-moonlet'];

type Proof = { morningKey: string; kind: string; at: number; morningStart?: number };

/** A cold launch: the store over `disk` (the App Group, kept between launches) and today's facts. */
function launch({
  disk = new Map<string, unknown>(),
  proofs = [] as Proof[],
  mornings = proofs.filter((p: Proof) => p.kind !== 'pass' && p.kind !== 'emergency').length,
  first = null as string | null,
  os = 'ios',
  steps = ((_from: Date, _to: Date) => 0) as (from: Date, to: Date) => number,
  stepsFail = false,
} = {}) {
  const pushed: string[] = [];
  const asked: { from: Date; to: Date }[] = [];
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
    'react-native': { Platform: { OS: os } },
    'expo-router': { router: { push: (href: string) => pushed.push(href) } },
    'expo-sensors': {
      Pedometer: {
        getStepCountAsync: async (from: Date, to: Date) => {
          asked.push({ from, to });
          if (stepsFail) throw new Error('Motion & Fitness is off');
          return { steps: steps(from, to) };
        },
      },
    },
    '@/lib/morning-proof': {
      getProofs: () => facts.proofs,
      getMorningsWon: () => facts.mornings,
      getFirstMorning: () => facts.first,
      onProofChange: (listener: () => void) => {
        proofListener = listener;
        return () => {};
      },
      proofMorningStart: (p: Proof) => (p.morningStart === undefined ? null : new Date(p.morningStart)),
    },
    '@/lib/screen-time': {
      sharedGet: (key: string) => (disk.has(key) ? structuredClone(disk.get(key)) : undefined),
      sharedSet: (key: string, value: unknown) => (value == null ? disk.delete(key) : disk.set(key, structuredClone(value))),
    },
    './moon-data': { LADDER, MOONS: [] },
    './moon-ladder': ladder,
  };
  const exports: Record<string, any> = {};
  runInNewContext(code, { exports, require: (id: string) => mocks[id] ?? assert.fail(`unmocked import ${id}`), Math, Date, Promise, structuredClone });
  return {
    m: exports,
    disk,
    pushed,
    asked,
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
/** Lets the store's pending step check finish. */
const settle = () => new Promise((r) => setImmediate(r));

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

// ---- The secret moon ----

test('the secret: 400 steps from morning start to 20 minutes after getting up', async () => {
  const p = walk('2026-11-02');
  const app = launch({ proofs: [p], first: '2026-11-02', steps: () => 400 });
  assert.equal(await app.m.checkSecretMoon(p.at + 30 * 60_000), true);
  assert.ok(app.m.ownsMoon('twin-moonlet'));
  // Asked from morning start to exactly 20 minutes after the proof.
  assert.equal(app.asked[0].from.getTime(), p.morningStart);
  assert.equal(app.asked[0].to.getTime(), p.at + ladder.SECRET_WINDOW_MS);
});

test('the secret: 399 steps is not enough', async () => {
  const p = walk('2026-11-02');
  const app = launch({ proofs: [p], first: '2026-11-02', steps: () => 399 });
  assert.equal(await app.m.checkSecretMoon(p.at + 30 * 60_000), false);
  assert.ok(!app.m.ownsMoon('twin-moonlet'));
});

test('the secret: checked early, it only counts steps up to now', async () => {
  const p = walk('2026-11-02');
  const app = launch({ proofs: [p], first: '2026-11-02', steps: () => 0 });
  await app.m.checkSecretMoon(p.at + 5 * 60_000);
  assert.equal(app.asked[0].to.getTime(), p.at + 5 * 60_000);
});

test('the secret: never asked for on the web, without a proof, without a morning start, or once owned', async () => {
  const p = walk('2026-11-02');
  const web = launch({ proofs: [p], os: 'web', steps: () => 999 });
  assert.equal(await web.m.checkSecretMoon(p.at + 60 * 60_000), false);
  assert.equal(web.asked.length, 0);

  const none = launch({ steps: () => 999 });
  assert.equal(await none.m.checkSecretMoon(), false);
  assert.equal(none.asked.length, 0);

  const old = launch({ proofs: [walk('2026-11-02', { morningStart: undefined })], steps: () => 999 });
  assert.equal(await old.m.checkSecretMoon(), false, 'a proof saved before its times were kept');
  assert.equal(old.asked.length, 0);

  const owned = launch({ proofs: [p], first: '2026-11-02', steps: () => 999 });
  await owned.m.checkSecretMoon(p.at + 60 * 60_000);
  await owned.m.checkSecretMoon(p.at + 60 * 60_000);
  assert.equal(owned.asked.length, 1, 'not asked again once owned');
});

test('the secret: a pass is not a wake-up to count steps from', async () => {
  const pass = { morningKey: '2026-11-03', kind: 'pass', at: at('2026-11-03'), morningStart: at('2026-11-03', 7, 0) };
  const app = launch({ proofs: [pass], mornings: 0, steps: () => 999 });
  assert.equal(await app.m.checkSecretMoon(pass.at + 60 * 60_000), false);
});

test('the secret: Motion & Fitness switched off throws, and the callers swallow it', async () => {
  const p = walk('2026-11-02');
  const app = launch({ proofs: [p], first: '2026-11-02', stepsFail: true });
  await assert.rejects(app.m.checkSecretMoon(p.at + 60 * 60_000));
  // The wake-up listener's check must not become an unhandled rejection.
  let unhandled = false;
  const onUnhandled = () => (unhandled = true);
  process.on('unhandledRejection', onUnhandled);
  app.wake(walk('2026-11-03'));
  await settle();
  await settle();
  process.off('unhandledRejection', onUnhandled);
  assert.equal(unhandled, false);
});

test('the secret, once earned, is dated to the morning that earned it', async () => {
  const p = walk('2026-11-02');
  const app = launch({ proofs: [p], first: '2026-11-02', steps: () => 500 });
  await app.m.checkSecretMoon(p.at + 30 * 60_000);
  assert.equal(app.m.getOwned()['twin-moonlet'].morningKey, '2026-11-02');
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

test('earning every moon (dev) gives the whole ladder and the rare one, once', () => {
  const app = launch();
  const added = app.m.devEarnAll();
  const owned = app.m.getOwned();
  assert.ok(added > 0);
  assert.ok(Object.keys(owned).includes('ringed'));
  assert.ok(Object.keys(owned).includes('eclipse'));
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
