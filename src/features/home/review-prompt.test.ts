import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
const require = createRequire(import.meta.url);
const babel = require('@babel/core');

test('leaving Home while availability is pending cannot spend or display the review prompt', async () => {
  let timer!: () => Promise<void>;
  let cleanup!: () => void;
  let answer!: (available: boolean) => void;
  let marked = 0;
  let requested = 0;
  const mocks: Record<string, unknown> = {
    react: { useEffect: (effect: () => () => void) => { cleanup = effect(); } },
    'react-native': { AppState: { currentState: 'active' } },
    'expo-router': { useIsFocused: () => true },
    'expo-constants': { default: { expoConfig: { version: '1' } }, __esModule: true },
    'expo-store-review': { isAvailableAsync: () => new Promise((resolve) => { answer = resolve; }), requestReview: async () => { requested++; } },
    '@/lib/first-run': { getReviewAskedVersion: () => null, shouldAskForReview: () => true, markReviewAsked: () => { marked++; } },
  };
  const code = babel.transformSync(readFileSync(new URL('./review-prompt.ts', import.meta.url), 'utf8'), {
    filename: 'review-prompt.ts', configFile: false, babelrc: false, presets: ['@babel/preset-typescript'],
    plugins: ['@babel/plugin-transform-modules-commonjs'],
  }).code;
  const exports = {} as { useReviewPrompt: (lock: object, proof: object) => void };
  runInNewContext(code, { exports, require: (id: string) => mocks[id], setTimeout: (run: typeof timer) => { timer = run; }, clearTimeout() {} });
  exports.useReviewPrompt({}, {});
  const pending = timer();
  cleanup();
  answer(true);
  await pending;
  assert.equal(marked, 0);
  assert.equal(requested, 0);
});
