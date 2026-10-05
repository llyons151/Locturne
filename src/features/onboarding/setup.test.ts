import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

const require = createRequire(import.meta.url);
const babel = require('@babel/core');
const tick = () => new Promise<void>((resolve) => setImmediate(resolve));

/** Execute the complete setup and notifications modules with a deferred store and in-memory App Group. */
function harness() {
  const saved = new Map<string, unknown>();
  const shared = {
    sharedGet: (key: string) => saved.get(key),
    sharedSet: (key: string, value: unknown) => saved.set(key, value),
    sharedRemove: (key: string) => saved.delete(key),
  };
  const requests: { resolve: (value: Date | null) => void; reject: (error: Error) => void }[] = [];
  const load = (path: string, dependencies: Record<string, unknown>) => {
    const code = babel.transformSync(readFileSync(new URL(path, import.meta.url), 'utf8'), {
      filename: path, configFile: false, babelrc: false, presets: ['@babel/preset-typescript'],
      plugins: ['@babel/plugin-transform-modules-commonjs'],
    }).code;
    const exports: Record<string, any> = {};
    runInNewContext(code, { exports, require: (id: string) => dependencies[id] ?? {} });
    return exports;
  };
  const notifications = load('../../lib/notifications.ts', {
    'react-native': { Platform: { OS: 'web' } }, './screen-time.ts': shared,
  });
  const setup = load('./setup.ts', {
    '@/lib/notifications': notifications, '@/lib/screen-time': shared,
    '@/lib/purchases': { currentTrialEnd: () => new Promise<Date | null>((resolve, reject) => requests.push({ resolve, reject })) },
  });
  return { saved, notifications, setup, requests };
}

const end = (day: number) => new Date(2027, 0, day, 12);

test('a delayed trial lookup cannot restore a reminder after onboarding opts out', async () => {
  const h = harness();
  h.setup.saveTrialReminder(true);
  h.setup.saveTrialReminder(false);
  h.requests[0].resolve(end(10));
  await tick();
  assert.equal(h.saved.get(h.notifications.TRIAL_REMINDER_KEY), false);
  assert.equal(h.notifications.getTrialEnd(), null);
});

test('only the latest enabled setup can publish its trial deadline', async () => {
  const h = harness();
  h.setup.saveTrialReminder(true);
  h.setup.saveTrialReminder(true);
  h.requests[1].resolve(end(20));
  await tick();
  h.requests[0].resolve(end(10));
  await tick();
  assert.equal(h.notifications.getTrialEnd()?.getTime(), +end(20));
});

test('a delayed lookup checks the persisted preference before scheduling', async () => {
  const h = harness();
  h.setup.saveTrialReminder(true);
  h.saved.set(h.notifications.TRIAL_REMINDER_KEY, false);
  h.requests[0].resolve(end(10));
  await tick();
  assert.equal(h.notifications.getTrialEnd(), null);
});

test('a confirmed absent trial clears the previous reminder deadline', async () => {
  const h = harness();
  await h.notifications.scheduleTrialReminder(end(10));
  h.setup.saveTrialReminder(true);
  h.requests[0].resolve(null);
  await tick();
  assert.equal(h.notifications.getTrialEnd(), null);
});

test('a failed trial lookup settles safely without overwriting the saved choice', async () => {
  const h = harness();
  h.setup.saveTrialReminder(true);
  h.requests[0].reject(new Error('Store unavailable'));
  await tick();
  assert.equal(h.saved.get(h.notifications.TRIAL_REMINDER_KEY), true);
  assert.equal(h.notifications.getTrialEnd(), null);
});
