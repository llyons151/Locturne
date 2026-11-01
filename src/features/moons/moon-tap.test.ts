/// <reference types="node" />
/** Home's moon as a button (moon-tap.tsx): where it sits, and that it never covers Loc. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

const require = createRequire(import.meta.url);
const babel = require('@babel/core');
const code = babel.transformSync(readFileSync(new URL('./moon-tap.tsx', import.meta.url), 'utf8'), {
  filename: 'moon-tap.tsx',
  configFile: false,
  babelrc: false,
  presets: ['@babel/preset-typescript'],
  plugins: [['@babel/plugin-transform-react-jsx', { runtime: 'classic' }], '@babel/plugin-transform-modules-commonjs'],
}).code;

const LOC_VIEW = { x: -40, y: -200, width: 898, height: 752 };

function tap(width: number, arc = width * 0.9 * 0.36) {
  let opened = 0;
  const React = { createElement: (type: unknown, props: Record<string, any>) => ({ type, props }) };
  const mocks: Record<string, unknown> = {
    'react-native': { Pressable: 'Pressable', StyleSheet: { create: (s: unknown) => s }, useWindowDimensions: () => ({ width, height: 800 }) },
    '@/lib/haptics': { tap() {} },
    '../home/loc-rig': { LOC_VIEW },
    './moon-collection': { openMoons: () => opened++ },
  };
  const exports: Record<string, any> = {};
  runInNewContext(code, { exports, React, require: (id: string) => mocks[id] ?? assert.fail(`unmocked import ${id}`), Math });
  const el = exports.MoonTap({ floor: 0, arc });
  const box = Object.assign({}, ...el.props.style);
  return { el, box, opened: () => opened };
}

for (const width of [375, 390, 402, 430, 440]) {
  test(`at ${width}pt wide it sits on the moon, above Loc's canvas, and opens the moons`, () => {
    const { el, box, opened } = tap(width);
    const locHeight = Math.round((width * 0.27 * LOC_VIEW.height) / LOC_VIEW.width);
    assert.equal(box.position, 'absolute');
    assert.equal(box.bottom, locHeight, 'starts where Loc\'s canvas ends, so a poke still reaches him');
    assert.ok(box.height >= 44, `at least Apple's 44pt touch target (${box.height})`);
    assert.ok(box.bottom + box.height <= width * 0.9 * 0.36 + 16, 'never higher than the moon (plus a little room)');
    assert.ok(box.left > 0 && box.right > 0 && box.left === box.right, 'centred, inside the screen');
    assert.equal(el.props.accessibilityRole, 'button');
    assert.equal(el.props.accessibilityLabel, 'Your moons');
    el.props.onPress();
    assert.equal(opened(), 1);
  });
}

test('if the moon ever sits lower than Loc, the button shrinks to the little room above, never negative', () => {
  const { box } = tap(390, 10);
  assert.equal(box.height, 16);
});
