/// <reference types="node" />
/**
 * The Routine tab's time rows on iPhone (`controls.ios.tsx`), rendered with React's hooks
 * modelled and a stand-in for @expo/ui's DatePickerView.swift: its `.onChange(of: date)`
 * reports nothing when the wheel lands on a time equal to `selection`.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { mock, test } from 'node:test';
import { runInNewContext } from 'node:vm';

import { SETTLE_MS, settler } from '../lib/settle.ts';

const require = createRequire(import.meta.url);
const babel = require('@babel/core');

type Tree = { type: unknown; props: Record<string, any>; children: Tree[] };

const code = babel.transformSync(readFileSync(new URL('./controls.ios.tsx', import.meta.url), 'utf8'), {
  filename: 'controls.ios.tsx',
  configFile: false,
  babelrc: false,
  presets: ['@babel/preset-typescript'],
  plugins: [['@babel/plugin-transform-react-jsx', { runtime: 'classic' }], '@babel/plugin-transform-modules-commonjs'],
}).code;

const minutesOf = (d: Date) => d.getHours() * 60 + d.getMinutes();

/** DatePickerView.swift's two `onChange`s and its `onAppear`, for one mounted picker. */
class NativePicker {
  date = 0;
  selection = 0;
  key: unknown = undefined;
  props: Record<string, any> = {};

  update(props: Record<string, any>, key: unknown) {
    const selection = minutesOf(props.selection);
    // A new Host key remounts the view: `.onAppear` copies `selection`.
    if (key !== this.key || selection !== this.selection) this.date = selection;
    this.key = key;
    this.selection = selection;
    this.props = props;
  }

  /** The person turns the wheels to `minutes`. */
  spin(minutes: number) {
    if (minutes === this.date) return;
    this.date = minutes;
    if (minutes === this.selection) return;
    this.props.onDateChange(new Date(2000, 0, 1, 0, minutes));
  }
}

function harness(initial: number) {
  const state: unknown[] = [];
  const refs: { current: unknown }[] = [];
  const effects: { deps?: unknown[]; cleanup?: () => void }[] = [];
  let stateIndex = 0;
  let refIndex = 0;
  let effectIndex = 0;
  let pending: (() => void)[] = [];
  let dirty = false;
  const same = (a: unknown[] | undefined, b: unknown[] | undefined) => !!a && !!b && a.every((v, i) => Object.is(v, b[i]));
  const react = {
    createElement: (type: unknown, props: Record<string, any>, ...children: Tree[]) => ({ type, props: props ?? {}, children }),
    useState(init: unknown) {
      const index = stateIndex++;
      if (!(index in state)) state[index] = init;
      return [
        state[index],
        (next: unknown) => {
          state[index] = typeof next === 'function' ? (next as (v: unknown) => unknown)(state[index]) : next;
          dirty = true;
        },
      ];
    },
    useRef(init: unknown) {
      const index = refIndex++;
      return (refs[index] ??= { current: init });
    },
    useEffect(effect: () => (() => void) | undefined, deps?: unknown[]) {
      const index = effectIndex++;
      if (deps && same(effects[index]?.deps, deps)) return;
      pending.push(() => {
        effects[index]?.cleanup?.();
        effects[index] = { deps, cleanup: effect() ?? undefined };
      });
    },
  };
  const modifier = () => ({});
  const mocks: Record<string, unknown> = {
    react,
    '@expo/ui': { Host: 'Host' },
    '@expo/ui/swift-ui': new Proxy({}, { get: (_, name) => String(name) }),
    '@expo/ui/swift-ui/modifiers': new Proxy({}, { get: () => modifier }),
    'react-native': {
      Alert: { alert: (message: string) => alerts.push(message) },
      AppState: { addEventListener: () => ({ remove() {} }) },
    },
    '@/components/grouped-list': { ControlRow: 'ControlRow', ValueRow: 'ValueRow' },
    '@/lib/haptics': { thud() {}, tap() {} },
    '@/lib/settle': { settler },
    '@/theme': { Nocturne: {} },
    './control-types': { nightsLabel: () => '' },
  };
  const exports = {} as { TimeRow: (props: Record<string, unknown>) => Tree };
  runInNewContext(code, { exports, require: (id: string) => mocks[id], React: react });

  const alerts: string[] = [];
  const saves: number[] = [];
  let value = initial;
  let invalid: ((m: number) => string | null) | undefined;
  const picker = new NativePicker();

  const render = () => {
    do {
      dirty = false;
      stateIndex = refIndex = effectIndex = 0;
      pending = [];
      const row = exports.TimeRow({
        title: 'Bedtime',
        value,
        presets: [],
        invalid: (m: number) => invalid?.(m) ?? null,
        onChange: (m: number) => {
          saves.push(m);
          value = m;
          dirty = true;
        },
      });
      const host = row.children[0];
      picker.update(host.children[0].props, host.props.key);
      pending.forEach((run) => run());
    } while (dirty);
  };
  render();
  return {
    picker,
    saves,
    alerts,
    refuse(fn: (m: number) => string | null) {
      invalid = fn;
    },
    /** The person spins the wheels; React re-renders before the next spin. */
    spin(minutes: number) {
      picker.spin(minutes);
      render();
    },
    wait(ms: number) {
      mock.timers.tick(ms);
      render();
    },
  };
}

test('moving the bedtime wheel away and back within the settle wait saves nothing', () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    const row = harness(23 * 60);
    // The hour wheel stops on 10 PM, then goes back to 11 PM two seconds later.
    row.spin(22 * 60);
    row.wait(2000);
    row.spin(23 * 60);
    row.wait(SETTLE_MS);
    assert.deepEqual(row.saves, [], 'the in-between 10:00 PM is not saved');
    assert.equal(row.picker.date, 23 * 60, 'the wheel still shows 11:00 PM');
    row.wait(10_000);
    assert.deepEqual(row.saves, []);
  } finally {
    mock.timers.reset();
  }
});

test('a minutes nudge away and back saves nothing either', () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    const row = harness(23 * 60);
    row.spin(23 * 60 + 15);
    row.spin(23 * 60);
    row.wait(SETTLE_MS);
    assert.deepEqual(row.saves, []);
  } finally {
    mock.timers.reset();
  }
});

test('an in-between time that would be refused is not refused once the wheel is back', () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    const row = harness(23 * 60);
    row.refuse((m) => (m === 7 * 60 ? 'Bedtime and morning start can’t be the same time.' : null));
    row.spin(7 * 60);
    row.spin(23 * 60);
    row.wait(SETTLE_MS);
    assert.deepEqual(row.alerts, []);
    assert.deepEqual(row.saves, []);
  } finally {
    mock.timers.reset();
  }
});

test('a time left on the wheel still saves once, after the wait, and the wheel keeps it', () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    const row = harness(23 * 60);
    row.spin(22 * 60);
    row.wait(1500);
    row.spin(22 * 60 + 30);
    row.wait(SETTLE_MS - 1);
    assert.deepEqual(row.saves, []);
    assert.equal(row.picker.date, 22 * 60 + 30);
    row.wait(1);
    assert.deepEqual(row.saves, [22 * 60 + 30]);
    assert.equal(row.picker.date, 22 * 60 + 30);
    // Back to 11 PM after the save is an edit of its own.
    row.spin(23 * 60);
    row.wait(SETTLE_MS);
    assert.deepEqual(row.saves, [22 * 60 + 30, 23 * 60]);
  } finally {
    mock.timers.reset();
  }
});

test('a refused time puts the wheel back on the saved time', () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    const row = harness(23 * 60);
    row.refuse((m) => (m === 7 * 60 ? 'Same time.' : null));
    row.spin(7 * 60);
    row.wait(SETTLE_MS);
    assert.deepEqual(row.alerts, ['Same time.']);
    assert.deepEqual(row.saves, []);
    assert.equal(row.picker.date, 23 * 60);
  } finally {
    mock.timers.reset();
  }
});
