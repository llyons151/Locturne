import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import * as purchases from '../lib/purchases.ts';

const require = createRequire(import.meta.url);
const babel = require('@babel/core');
const flush = async () => { for (let i = 0; i < 6; i++) await new Promise((resolve) => setImmediate(resolve)); };
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}
function harness(trials: ReturnType<typeof deferred<Date | null>>[]) {
  const settled: boolean[] = [];
  const trialEnds: (Date | null)[] = [];
  let paidCount = 0;
  const modules: Record<string, unknown> = {
    'expo-router': {}, react: {}, 'react-native': {}, '@/lib/analytics': { track() {} },
    '@/lib/arm': { armTonight: async () => ({ status: 'armed' }) },
    '@/lib/lock-controller': {
      paidSettleCount: () => paidCount,
      settleSubscription: (paid: boolean) => { settled.push(paid); if (paid) paidCount++; },
    },
    '@/lib/morning-proof': {}, '@/lib/pending-purchase': { takePendingApproval: () => false },
    '@/lib/purchases': { ...purchases, currentTrialEnd: () => trials.shift()!.promise },
    '@/lib/routine': { hasRoutine: () => true },
    '@/lib/screen-time': { isScreenTimeAvailable: () => true, getArmedNight: () => ({}) },
    '@/lib/notifications': { rescheduleNotifications: async () => {}, syncTrialEnd: (end: Date | null) => trialEnds.push(end) },
  };
  const exports: { armIfPaid?: () => void } = {};
  const code = babel.transformSync(readFileSync(new URL('./use-app-start.ts', import.meta.url), 'utf8'), {
    filename: 'use-app-start.ts', configFile: false, babelrc: false,
    presets: ['@babel/preset-typescript'], plugins: ['@babel/plugin-transform-modules-commonjs'],
  }).code;
  runInNewContext(code, { exports, require: (id: string) => modules[id] });
  return { arm: () => exports.armIfPaid!(), settled, trialEnds };
}

test('older trial response cannot restore reminder after a newer cancelled-trial response', async () => {
  const older = deferred<Date | null>();
  const newer = deferred<Date | null>();
  purchases.setPurchasesProvider({ ...purchases.createClosedPurchases(), isEntitled: async () => true });
  const h = harness([older, newer]);
  h.arm(); await flush();
  h.arm(); await flush();
  newer.resolve(null); await flush();
  older.resolve(new Date('2026-10-12T12:00:00Z')); await flush();
  assert.deepEqual(h.trialEnds, [null]);
});

test('foreground unpaid answer cannot stand down protection while Restore is still pending', async () => {
  const restoring = deferred<{ entitled: boolean }>();
  const trial = deferred<Date | null>();
  purchases.setPurchasesProvider({
    ...purchases.createClosedPurchases(), restore: () => restoring.promise, isEntitled: async () => false,
  });
  const h = harness([trial]);
  const restored = purchases.restore();
  h.arm(); await flush();
  const duringRestore = [...h.settled];
  restoring.resolve({ entitled: true }); await restored;
  trial.resolve(null); await flush();
  assert.deepEqual(duringRestore, []);
  assert.equal(purchases.isPurchasing(), false);
});
