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

function approval(step: string) {
  const source = readFileSync(new URL('./onboarding-flow.tsx', import.meta.url), 'utf8');
  const start = source.indexOf('  const approvedLater = useEffectEvent(');
  const handler = source.slice(start, source.indexOf('  useEffect(() => onEntitled(approvedLater)', start))
    .replace('useEffectEvent(', '(');
  const calls = { entitled: [] as boolean[], noOffer: [] as boolean[], finished: [] as string[] };
  const context = {
    step, PAYWALL: ['offer', 'plans'], track() {},
    setEntitled: (value: boolean) => { calls.entitled.push(value); },
    setNoMoreExitOffer: (value: boolean) => { calls.noOffer.push(value); },
    finishSetup: (via: string) => { calls.finished.push(via); },
    invoke: undefined as unknown as () => void,
  };
  const code = babel.transformSync(`${handler}\nglobalThis.invoke = approvedLater;`, {
    filename: 'handler.ts', configFile: false, babelrc: false, presets: ['@babel/preset-typescript'],
  }).code;
  runInNewContext(code, context);
  context.invoke();
  return calls;
}

test('Ask to Buy approved while off the paywall marks the flow entitled so commit finishes instead of re-selling', () => {
  for (const step of ['commit', 'hello']) {
    const calls = approval(step);
    assert.deepEqual(calls.entitled, [true]);
    assert.deepEqual(calls.noOffer, [true]);
    assert.deepEqual(calls.finished, []);
  }
});

test('Ask to Buy approved on the paywall still finishes setup', () => {
  const calls = approval('plans');
  assert.deepEqual(calls.entitled, [true]);
  assert.deepEqual(calls.finished, ['purchase']);
});

function restoreHarness(startStep: string) {
  const source = readFileSync(new URL('./onboarding-flow.tsx', import.meta.url), 'utf8');
  const handler = source.slice(source.indexOf('  const restorePurchases ='), source.indexOf('  // A purchase waiting for Ask to Buy'));
  const answers: ((result: { entitled: boolean }) => void)[] = [];
  const alerts: (() => void)[] = [];
  const went: string[] = [];
  let restoring = 0;
  const context = {
    busy: false, setBusy() {}, track() {}, setEntitled() {}, setRestored() {},
    isPurchasing: () => restoring > 0,
    restore: () => {
      restoring++;
      return new Promise<{ entitled: boolean }>((done) => answers.push(done)).finally(() => { restoring--; });
    },
    step: startStep, PAYWALL: ['plans', 'trial'], latestStep: new Map([['value', startStep]]),
    flowActive: new Set(['active']),
    say: (_title: string, _message: string, then?: () => void) => { if (then) alerts.push(then); },
    go: (to: string) => { went.push(to); },
    invoke: undefined as unknown as () => Promise<void>,
  };
  const code = babel.transformSync(`${handler}\nglobalThis.invoke = restorePurchases;`, {
    filename: 'handler.ts', configFile: false, babelrc: false, presets: ['@babel/preset-typescript'],
  }).code;
  runInNewContext(code, context);
  return { context, answers, alerts, went };
}

test('Restore from hello that answers after they tapped on leaves them where they are', async () => {
  const { context, answers, alerts, went } = restoreHarness('hello');
  const restoring = context.invoke();
  context.latestStep.set('value', 'voice');
  answers[0]({ entitled: true });
  await restoring;
  assert.equal(alerts.length, 1);
  alerts[0]();
  assert.deepEqual(went, []);
});

test('Restore from hello still goes to bedtime when they are still on hello', async () => {
  const { context, answers, alerts, went } = restoreHarness('hello');
  const restoring = context.invoke();
  answers[0]({ entitled: true });
  await restoring;
  alerts[0]();
  assert.deepEqual(went, ['bedtime']);
});

test('a same-frame double tap on Restore starts one restore and shows one alert', async () => {
  const { context, answers, alerts, went } = restoreHarness('hello');
  const first = context.invoke();
  const second = context.invoke();
  assert.equal(answers.length, 1);
  answers[0]({ entitled: true });
  await Promise.all([first, second]);
  assert.equal(alerts.length, 1);
  alerts[0]();
  assert.deepEqual(went, ['bedtime']);
});
