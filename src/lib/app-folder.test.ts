/// <reference types="node" />
/**
 * Every file under src/app is a screen to Expo Router, and Metro bundles it: a test there
 * imports node:test and the whole app fails to load (2026-11-01, the moon tests). Tests live
 * beside the code they test, outside src/app.
 */
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { test } from 'node:test';

test('no test files in src/app, where Expo Router would make them screens', () => {
  const root = new URL('../app/', import.meta.url);
  const files = readdirSync(root, { recursive: true }).map(String);
  assert.deepEqual(files.filter((f) => /\.(test|spec)\.[jt]sx?$/.test(f)), []);
});
