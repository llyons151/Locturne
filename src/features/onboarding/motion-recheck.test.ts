import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
const require = createRequire(import.meta.url);
const babel = require('@babel/core');

/** The flow's Motion handling, run with a fake AppState and Settings answer. */
function harness(motion: string | null, settingsAnswer: string | null) {
  const source = readFileSync(new URL('./onboarding-flow.tsx', import.meta.url), 'utf8');
  const start = source.indexOf('  const [motion, setMotion] =');
  const handler = source.slice(source.indexOf('\n', start) + 1, source.indexOf('  // A second tap while iOS'));
  const listeners: ((state: string) => void)[] = [];
  const context = {
    motion,
    screenTimeHere: true,
    step: 'first-morning',
    setMotion: (next: string) => { context.motion = next; },
    setNotifications() {},
    getNotificationPermission: async () => 'granted',
    checkMotion: async () => settingsAnswer,
    useState: (initial: unknown) => [initial, () => {}],
    useEffectEvent: <T,>(fn: T) => fn,
    useEffect: (effect: () => void) => { effect(); },
    AppState: {
      addEventListener: (_: string, listener: (state: string) => void) => {
        listeners.push(listener);
        return { remove() {} };
      },
    },
  };
  const code = babel.transformSync(handler, {
    filename: 'handler.tsx', configFile: false, babelrc: false, presets: ['@babel/preset-typescript'],
  }).code;
  runInNewContext(code, context);
  return {
    context,
    async foreground() {
      for (const listener of listeners) listener('active');
      await new Promise((done) => setTimeout(done, 0));
    },
  };
}

test('Motion turned on in Settings from first-morning clears the "it’s off" row on return', async () => {
  const { context, foreground } = harness('denied', 'granted');
  await foreground();
  assert.equal(context.motion, 'granted');
});

test('Motion still off after Settings stays denied', async () => {
  const { context, foreground } = harness('denied', 'denied');
  await foreground();
  assert.equal(context.motion, 'denied');
});

test('a failed Motion read on return does not hide the denied row', async () => {
  const { context, foreground } = harness('denied', 'unavailable');
  await foreground();
  assert.equal(context.motion, 'denied');
});
