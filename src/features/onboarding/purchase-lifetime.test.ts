import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
const require = createRequire(import.meta.url);
const babel = require('@babel/core');

function completion(saved: boolean) {
  const source = readFileSync(new URL('./onboarding-flow.tsx', import.meta.url), 'utf8');
  const handler = source.slice(source.indexOf('  const finishSetup ='), source.indexOf('  // When the trial bought'));
  let overwritten = 0;
  let redirected = 0;
  let armed = 0;
  let paid = false;
  const reminders: boolean[] = [];
  const context = {
    flowActive: new Set<string>(),
    hasRoutine: () => saved,
    restored: false,
    answers: { bedtime: 1380, remindTrial: true }, history: ['plans'],
    takePendingApproval() {},
    settleSubscription: (value: boolean) => { paid = value; },
    saveSetup: () => { overwritten++; },
    saveTrialReminder: (on: boolean) => { reminders.push(on); }, track() {}, setFinished() {}, setEntitled() {}, setTrialEnds() {},
    currentTrialEnd: async () => null,
    dispatch: () => { redirected++; },
    runArm: () => { armed++; }, armIfPaid: () => { armed++; },
    invoke: undefined as unknown as () => void,
  };
  const code = babel.transformSync(`${handler}\nglobalThis.invoke = finishSetup;`, {
    filename: 'handler.ts', configFile: false, babelrc: false, presets: ['@babel/preset-typescript'],
  }).code;
  runInNewContext(code, context);
  context.invoke();
  return { overwritten, redirected, armed, paid, reminders };
}

test('late purchase success after closing onboarding keeps newer saved Routine edits', () => {
  const result = completion(true);
  assert.equal(result.paid, true);
  assert.equal(result.overwritten, 0);
  assert.equal(result.redirected, 0);
  assert.equal(result.armed, 1);
  // Closing the paywall mid-purchase already saved the setup: the reminder must still be kept.
  assert.deepEqual(result.reminders, [true]);
});

test('late purchase success still keeps a complete first setup when no routine was ever saved', () => {
  const result = completion(false);
  assert.equal(result.paid, true);
  assert.equal(result.overwritten, 1);
  assert.equal(result.redirected, 0);
  assert.equal(result.armed, 1);
  assert.deepEqual(result.reminders, [true]);
});

test('Ask to Buy resolving after exit records approval state without overwriting a newer routine or reopening UI', async () => {
  const source = readFileSync(new URL('./onboarding-flow.tsx', import.meta.url), 'utf8');
  const handler = source.slice(source.indexOf('  const buy ='), source.indexOf('  const restorePurchases ='));
  let resolve!: (result: { status: string }) => void;
  let pending = false;
  let saved = 0;
  let messages = 0;
  const reminders: boolean[] = [];
  const context = {
    busy: false, isPurchasing: () => false, setBusy() {}, track() {},
    step: 'plans', purchase: () => new Promise((done) => { resolve = done; }),
    flowActive: new Set(['active']), hasRoutine: () => true,
    answers: { bedtime: 1380, remindTrial: true },
    latestAnswers: new Map([['value', { bedtime: 1380, remindTrial: true }]]),
    saveSetup: () => { saved++; }, saveTrialReminder: (on: boolean) => { reminders.push(on); },
    markPurchasePending: () => { pending = true; }, setNoMoreExitOffer() {},
    say: () => { messages++; },
    invoke: undefined as unknown as (target: string) => Promise<void>,
  };
  const code = babel.transformSync(`${handler}\nglobalThis.invoke = buy;`, {
    filename: 'handler.ts', configFile: false, babelrc: false, presets: ['@babel/preset-typescript'],
  }).code;
  runInNewContext(code, context);
  const buying = context.invoke('annual');
  context.flowActive.delete('active');
  resolve({ status: 'pending' });
  await buying;
  assert.equal(pending, true);
  assert.equal(saved, 0);
  assert.equal(messages, 0);
  assert.deepEqual(reminders, [true]);
});

test('Ask to Buy resolving while an edited flow remains open saves its latest committed answers', async () => {
  const source = readFileSync(new URL('./onboarding-flow.tsx', import.meta.url), 'utf8');
  const handler = source.slice(source.indexOf('  const buy ='), source.indexOf('  const restorePurchases ='));
  let resolve!: (result: { status: string }) => void;
  let saved: unknown;
  const oldAnswers = { bedtime: 1380, remindTrial: true };
  const newerAnswers = { bedtime: 1320, remindTrial: false };
  const context = {
    busy: false, isPurchasing: () => false, setBusy() {}, track() {},
    step: 'plans', purchase: () => new Promise((done) => { resolve = done; }),
    flowActive: new Set(['active']), latestAnswers: new Map([['value', oldAnswers]]), hasRoutine: () => true,
    answers: oldAnswers,
    saveSetup: (answers: unknown) => { saved = answers; }, saveTrialReminder() {},
    markPurchasePending() {}, setNoMoreExitOffer() {}, say() {},
    invoke: undefined as unknown as (target: string) => Promise<void>,
  };
  const code = babel.transformSync(`${handler}\nglobalThis.invoke = buy;`, {
    filename: 'handler.ts', configFile: false, babelrc: false, presets: ['@babel/preset-typescript'],
  }).code;
  runInNewContext(code, context);
  const buying = context.invoke('annual');
  context.latestAnswers.set('value', newerAnswers);
  resolve({ status: 'pending' });
  await buying;
  assert.deepEqual(saved, newerAnswers);
});
