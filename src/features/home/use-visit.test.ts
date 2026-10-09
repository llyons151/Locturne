import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

const require = createRequire(import.meta.url);
const babel = require('@babel/core');

/** Run the real hook with deterministic state, ref and effect scheduling. */
function harness() {
  const state: unknown[] = [];
  const refs: { current: unknown }[] = [];
  const effects: { deps: unknown[]; cleanup?: () => void }[] = [];
  const callbacks: { deps: unknown[]; fn: unknown }[] = [];
  let stateIndex = 0, refIndex = 0, effectIndex = 0, callbackIndex = 0;
  let pending: (() => void)[] = [];
  const listeners = new Set<(state: string) => void>();
  let focus: (() => void) | undefined;
  const same = (a: unknown[] | undefined, b: unknown[]) => !!a && a.every((v, i) => Object.is(v, b[i]));
  const react = {
    useState(initial: unknown) {
      const index = stateIndex++;
      if (!(index in state)) state[index] = initial;
      return [state[index], (next: unknown) => { state[index] = typeof next === 'function' ? next(state[index]) : next; }];
    },
    useRef(initial: unknown) { const index = refIndex++; return refs[index] ??= { current: initial }; },
    useCallback(fn: unknown, deps: unknown[]) {
      const index = callbackIndex++;
      if (!same(callbacks[index]?.deps, deps)) callbacks[index] = { deps, fn };
      return callbacks[index].fn;
    },
    useEffect(effect: () => (() => void) | undefined, deps: unknown[]) {
      const index = effectIndex++;
      if (same(effects[index]?.deps, deps)) return;
      pending.push(() => { effects[index]?.cleanup?.(); effects[index] = { deps, cleanup: effect() ?? undefined }; });
    },
  };
  const mocks: Record<string, unknown> = {
    react,
    'expo-router': { useFocusEffect: (fn: () => void) => { if (fn !== focus) { focus = fn; pending.push(fn); } } },
    'react-native': { AppState: { addEventListener: (_: string, fn: (state: string) => void) => {
      listeners.add(fn);
      return { remove: () => listeners.delete(fn) };
    } } },
  };
  const code = babel.transformSync(readFileSync(new URL('./use-visit.ts', import.meta.url), 'utf8'), {
    filename: 'use-visit.ts', configFile: false, babelrc: false,
    presets: ['@babel/preset-typescript'], plugins: ['@babel/plugin-transform-modules-commonjs'],
  }).code;
  const exports: { useVisit?: (day: string) => number } = {};
  runInNewContext(code, { exports, require: (id: string) => mocks[id] });
  return {
    render(day: string) {
      stateIndex = refIndex = effectIndex = callbackIndex = 0;
      pending = [];
      exports.useVisit!(day);
      pending.forEach((run) => run());
      stateIndex = refIndex = effectIndex = callbackIndex = 0;
      return exports.useVisit!(day);
    },
    appState(next: string) { for (const fn of listeners) fn(next); },
  };
}

test("Home's screen-time revision moves when the app returns to the foreground", () => {
  const h = harness();
  const opened = h.render('2026-10-09');
  h.appState('background');
  assert.equal(h.render('2026-10-09'), opened);
  h.appState('active');
  assert.ok(h.render('2026-10-09') > opened);
});

test("Home's screen-time revision moves when the day rolls over while Home stays open", () => {
  const h = harness();
  const opened = h.render('2026-10-09');
  assert.equal(h.render('2026-10-09'), opened);
  assert.ok(h.render('2026-10-10') > opened);
});
