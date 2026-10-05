import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
const require = createRequire(import.meta.url);
const babel = require('@babel/core');

test('picker reservation spans native settling, coalesces duplicate dismissals and releases after commit', () => {
  const callbacks: (() => void)[] = [];
  const exports = {} as { settlePicker: (id: string, save: () => void) => void; isPickerSettling: (id: string) => boolean };
  const code = babel.transformSync(readFileSync(new URL('./picker-settle.ts', import.meta.url), 'utf8'), {
    filename: 'picker-settle.ts', configFile: false, babelrc: false, presets: ['@babel/preset-typescript'],
    plugins: ['@babel/plugin-transform-modules-commonjs'],
  }).code;
  runInNewContext(code, { exports, setTimeout: (run: () => void, delay: number) => { assert.equal(delay, 500); callbacks.push(run); } });
  let saves = 0;
  exports.settlePicker('night', () => { assert.equal(exports.isPickerSettling('night'), true); saves++; });
  exports.settlePicker('night', () => { saves++; });
  assert.equal(exports.isPickerSettling('night'), true);
  assert.equal(exports.isPickerSettling('always'), false);
  assert.equal(callbacks.length, 1);
  callbacks[0]();
  assert.equal(saves, 1);
  assert.equal(exports.isPickerSettling('night'), false);
});
