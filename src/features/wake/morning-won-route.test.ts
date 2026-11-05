/// <reference types="node" />
/** The payoff route's moons (morning-won.tsx): this morning's new moons, earned first; the preview's made-up one. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

const require = createRequire(import.meta.url);
const babel = require('@babel/core');
const code = babel.transformSync(readFileSync(new URL('../../app/morning-won.tsx', import.meta.url), 'utf8'), {
  filename: 'morning-won.tsx',
  configFile: false,
  babelrc: false,
  presets: ['@babel/preset-typescript'],
  plugins: [['@babel/plugin-transform-react-jsx', { runtime: 'classic' }], '@babel/plugin-transform-modules-commonjs'],
}).code;

function route({ params = {} as Record<string, string>, proof = { morningKey: '2026-11-04', kind: 'steps', at: new Date(2026, 10, 4, 7, 6).getTime() } as any, owned = [] as string[] } = {}) {
  const order: string[] = [];
  let earned = false;
  const React = { createElement: (type: unknown, props: Record<string, any>) => ({ type, props }) };
  const mocks: Record<string, unknown> = {
    react: { useEffect() {} },
    'expo-router': { router: { canGoBack: () => true, replace() {}, push() {} }, useLocalSearchParams: () => params },
    '@/components/leave-route': { LeaveRoute: 'LeaveRoute' },
    '@/features/wake/payoff-screen': { PayoffScreen: 'PayoffScreen' },
    '@/lib/lock-controller': { currentProof: () => proof, routineAt: () => ({ morningStart: 420, bedtime: 1380 }) },
    '@/lib/lock-state': { dateKey: (d: Date) => d.toISOString().slice(0, 10) },
    '@/features/home/week': { weekDays: () => [] },
    '@/lib/morning-proof': { getMorningsWon: () => 3, getProofs: () => (proof ? [proof] : []) },
    '@/lib/routine': { getRoutineChange: () => null, isWakeMethod: (m: unknown) => ['steps', 'downstairs', 'scan', 'place', 'pushups', 'downtime'].includes(m as string), nightWasOn: () => true },
    '@/features/moons/moon-collection': {
      settleMoons: () => {
        order.push('settle');
        earned = true;
        return [];
      },
      unpresented: (key: string) => {
        order.push(`unpresented:${key}`);
        return earned ? owned.map((id) => ({ id })) : [];
      },
    },
    '@/features/moons/moon-data': { MOONS: [{ id: 'harvest' }, { id: 'ringed' }] },
  };
  const exports: Record<string, any> = {};
  runInNewContext(code, { exports, React, require: (id: string) => mocks[id] ?? assert.fail(`unmocked import ${id}`), Math, Date, Number, Set, process: { env: {} }, __DEV__: true, setTimeout });
  return { el: exports.default(), order };
}

test('a real morning: its moons are earned first, then read for this morning', () => {
  const { el, order } = route({ owned: ['harvest'] });
  assert.equal(el.type, 'PayoffScreen');
  assert.deepEqual([...el.props.facts.newMoons], ['harvest']);
  assert.deepEqual(order, ['settle', 'unpresented:2026-11-04']);
});

test('a real morning with no new moon shows none', () => {
  assert.deepEqual([...route().el.props.facts.newMoons], []);
});

test('a pass morning has no payoff at all, so no moon either', () => {
  const { el, order } = route({ proof: { morningKey: '2026-11-04', kind: 'pass', at: 0 } });
  assert.equal(el.type, 'LeaveRoute');
  assert.deepEqual(order, []);
});

test('the preview: newMoon=<id> shows that moon, an unknown id shows none, and nothing is earned', () => {
  const ok = route({ params: { demo: '1', over: '1', newMoon: 'ringed' } });
  assert.deepEqual([...ok.el.props.facts.newMoons], ['ringed']);
  assert.deepEqual(ok.order, []);
  assert.deepEqual([...route({ params: { demo: '1', over: '1', newMoon: 'nope' } }).el.props.facts.newMoons], []);
  // `moon` is the web's "wear this one", not a new moon.
  assert.deepEqual([...route({ params: { demo: '1', over: '1', moon: 'ringed' } }).el.props.facts.newMoons], []);
});
