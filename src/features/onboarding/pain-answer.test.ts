/// <reference types="node" />

/** A new pain answer drops a mornings answer its branch doesn't offer (content.ts `painAnswer`). */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

const require = createRequire(import.meta.url);
const babel = require('@babel/core');

// content.ts needs the app's `@/` paths, so it's compiled here with those stubbed.
const load = (file: string, require: (id: string) => unknown) => {
  const code = babel.transformSync(readFileSync(new URL(file, import.meta.url), 'utf8'), {
    filename: file, configFile: false, babelrc: false, presets: ['@babel/preset-typescript'],
    plugins: ['@babel/plugin-transform-modules-commonjs'],
  }).code;
  const exports: any = {};
  runInNewContext(code, { exports, require });
  return exports;
};
const stub = new Proxy({}, { get: () => () => undefined });
const navigation = load('./navigation.ts', () => stub);
const { painAnswer } = load('./content.ts', (id) => (id === './navigation' ? navigation : stub));

test('snooze, only offered in the morning branch, is dropped on leaving it', () => {
  assert.deepEqual({ ...painAnswer({ mornings: 'snooze' }, 'all') }, { pain: 'all', mornings: undefined });
});

test('behind, not offered in the morning branch, is dropped on entering it', () => {
  assert.deepEqual({ ...painAnswer({ mornings: 'behind' }, 'morning') }, { pain: 'morning', mornings: undefined });
});

test('an answer both branches offer is kept', () => {
  assert.deepEqual({ ...painAnswer({ mornings: 'tired' }, 'morning') }, { pain: 'morning' });
  assert.deepEqual({ ...painAnswer({}, 'all') }, { pain: 'all' });
});
