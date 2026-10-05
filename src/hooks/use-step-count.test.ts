import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import { startCount, stepsOf } from '../lib/wake/steps.ts';

const require = createRequire(import.meta.url);
const babel = require('@babel/core');

/** Execute the real hook with deterministic state/effect scheduling and a held sensor read. */
function harness() {
  const state: unknown[] = [];
  const effects: { deps: unknown[]; cleanup?: () => void }[] = [];
  let stateIndex = 0;
  let effectIndex = 0;
  let changed = false;
  let pending: (() => void)[] = [];
  let watcher: { onCount: (count: ReturnType<typeof startCount>) => void; onStatus: (status: string) => void };
  const react = {
    useState(initial: unknown) {
      const index = stateIndex++;
      if (!(index in state)) state[index] = typeof initial === 'function' ? initial() : initial;
      return [state[index], (next: unknown) => {
        state[index] = typeof next === 'function' ? next(state[index]) : next;
        changed = true;
      }];
    },
    useEffect(effect: () => (() => void) | undefined, deps: unknown[]) {
      const index = effectIndex++;
      if (effects[index]?.deps.every((v, i) => Object.is(v, deps[i]))) return;
      pending.push(() => {
        effects[index]?.cleanup?.();
        effects[index] = { deps, cleanup: effect() };
      });
    },
  };
  const mocks: Record<string, unknown> = {
    react,
    'react-native': { AppState: {}, Platform: { OS: 'ios' } },
    'expo-sensors': { Pedometer: {} },
    '@/lib/wake/steps': { stepsOf },
    '@/lib/wake/step-watch': { watchSteps: (_deps: unknown, options: typeof watcher) => {
      watcher = options;
      return () => {};
    } },
  };
  const code = babel.transformSync(readFileSync(new URL('./use-step-count.ts', import.meta.url), 'utf8'), {
    filename: 'use-step-count.ts', configFile: false, babelrc: false,
    presets: ['@babel/preset-typescript'], plugins: ['@babel/plugin-transform-modules-commonjs'],
  }).code;
  const exports: { useStepCount?: (enabled: boolean, start: Date, goal: number) => { steps: number; status: string } } = {};
  runInNewContext(code, { exports, require: (id: string) => mocks[id] });
  return {
    render(enabled: boolean, start: number, goal: number) {
      let result;
      do {
        changed = false;
        stateIndex = effectIndex = 0;
        pending = [];
        result = exports.useStepCount!(enabled, new Date(start), goal);
      } while (changed);
      pending.forEach((effect) => effect());
      return result;
    },
    counted(goal: number, steps: number) {
      watcher.onCount(startCount(goal, steps, 0));
      watcher.onStatus('counting');
    },
  };
}

test('new morning and goal never expose the previous sensor result while history is pending', () => {
  for (const [start, goal] of [[2000, 200], [1000, 100]]) {
    const h = harness();
    h.render(true, 1000, 200);
    h.counted(200, 150);
    assert.equal(h.render(true, 1000, 200).steps, 150);
    const changed = h.render(true, start, goal);
    assert.equal(changed.steps, 0);
    assert.equal(changed.status, 'starting');
  }
});

test('disabled and restarted practice walks do not reuse completed steps', () => {
  const h = harness();
  h.render(true, 1000, 10);
  h.counted(10, 10);
  assert.equal(h.render(true, 1000, 10).steps, 10);
  assert.equal(h.render(false, 1000, 10).steps, 0);
  assert.equal(h.render(true, 1000, 10).steps, 0);
});
