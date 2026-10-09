/// <reference types="node" />
/** Home's week strip: what VoiceOver says for each morning. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

import { dateKey } from '../../lib/lock-state.ts';

const require = createRequire(import.meta.url);
const babel = require('@babel/core');
const code = babel.transformSync(readFileSync(new URL('./week.ts', import.meta.url), 'utf8'), {
  filename: 'week.ts',
  configFile: false,
  babelrc: false,
  presets: ['@babel/preset-typescript'],
  plugins: ['@babel/plugin-transform-modules-commonjs'],
}).code;
const week = {} as typeof import('./week.ts');
runInNewContext(code, { exports: week, require: (id: string) => (id === '@/lib/lock-state' ? { dateKey } : undefined), Date });

test('a past morning no night locked is not "missed"', () => {
  // Monday 2026-10-12; Friday and Saturday nights off, so Saturday and Sunday mornings were free.
  const days = week.weekDays('2026-10-12', new Set(), new Set(['2026-10-10', '2026-10-11']));
  const label = (key: string) => week.dayLabel(days.find((d) => d.key === key)!);
  assert.match(label('2026-10-11'), /: no lock$/);
  assert.match(label('2026-10-12'), /: today$/);
  assert.match(label('2026-10-13'), /: to come$/);
  // Saturday 10th is in the previous week; Sunday 11th leads this one.
  assert.equal(days[0].key, '2026-10-11');
});

test('a past morning whose night was on, with no proof, is missed; a won one got up', () => {
  const days = week.weekDays('2026-10-14', new Set(['2026-10-12']), new Set(['2026-10-11']));
  const label = (key: string) => week.dayLabel(days.find((d) => d.key === key)!);
  assert.match(label('2026-10-11'), /: no lock$/);
  assert.match(label('2026-10-12'), /: got up$/);
  assert.match(label('2026-10-13'), /: missed$/);
});
