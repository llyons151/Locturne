import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import * as unheldWords from './unheld-words.ts';
const require = createRequire(import.meta.url);
const babel = require('@babel/core');

test('a nap-only confirmation cannot silently pause a bedtime that began while the dialog was open', () => {
  const source = readFileSync(new URL('./exits-screen.tsx', import.meta.url), 'utf8');
  const handler = source.slice(source.indexOf('  const unlock ='), source.indexOf('  // A night or morning by the clock'));
  const original = { pauseNight: false, unlockMorning: false, endBlockNow: true, resumesAt: null as number | null };
  const current = { ...original, pauseNight: true, unlockMorning: true, resumesAt: Date.now() + 86_400_000 };
  let applied = 0;
  let shown = original;
  const context = {
    plan: original,
    setConfirming() {},
    previewEmergency: () => current,
    setPlan: (next: typeof original) => { shown = next; },
    setPhase() {}, readLock: () => ({ phase: 'night', nextChange: new Date(Date.now() + 3600000) }), setStage() {},
    emergencyUnlock: () => { applied++; return current; },
    track() {}, haptic: { done() {} }, setLeft() {}, getPassesLeft: () => 3,
    invoke: undefined as unknown as (kind: string) => void,
  };
  const code = babel.transformSync(`${handler}\nglobalThis.invoke = unlock;`, {
    filename: 'handler.ts', configFile: false, babelrc: false, presets: ['@babel/preset-typescript'],
  }).code;
  runInNewContext(code, context);
  context.invoke('emergency');
  assert.equal(applied, 0, 'must show the broader effect before applying it');
  assert.deepEqual(shown, current);
  context.plan = current;
  context.invoke('emergency');
  assert.equal(applied, 1);
});

function screenHarness(awakeLine = 'Apps awake until 10:00 PM.', emergency: any = null, screenTime: Record<string, any> = {}) {
  let index = 0;
  const state: any[] = [];
  let now = new Date(2026, 9, 5, 22).getTime();
  let lock = { phase: 'night', nextChange: new Date(2026, 9, 6, 7) };
  const react = {
    createElement: (type: any, props: any, ...children: any[]) => ({ type, props, children }),
    useState(initial: any) {
      const at = index++;
      if (!(at in state)) state[at] = typeof initial === 'function' ? initial() : initial;
      return [state[at], (value: any) => { state[at] = typeof value === 'function' ? value(state[at]) : value; }];
    },
    useCallback: (cb: any) => cb, useEffect() {},
  };
  const mocks: Record<string, any> = {
    react, 'expo-router': { useRouter: () => ({}) },
    '@/components/text': { Text: 'text', TextInput: 'input' },
    'react-native': { StyleSheet: { create: (s: any) => s }, ScrollView: 'ScrollView', View: 'View', Text: 'Text' },
    'react-native-reanimated': { __esModule: true, default: { View: 'Animated' }, FadeIn: { duration() {} } },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ bottom: 0 }) },
    '@/components/buttons': { PrimaryButton: 'Button', TextButton: 'Button' },
    '@/components/grouped-list': { Section: 'Section', ValueRow: 'Row', sym: (s: string) => s },
    '@/hooks/use-lock': { useLock: () => lock },
    '@/lib/lock-controller': { readLock: () => lock },
    '@/lib/emergency': {
      heldPhase: (p: string) => p, previewEmergency: () => emergency, EMERGENCY_WAIT_SECONDS: 0,
      emergencyUnlock: () => { lock = { phase: 'day', nextChange: new Date(2026, 9, 6, 22) }; return emergency; },
      pauseWording: () => ({}),
    },
    '@/features/wake/awake-status': { awakeStatus: (state: any) => {
      assert.equal(state.blockNowUntil, null, 'both exits end a Block now');
      return awakeLine;
    } },
    '@/lib/passes': { getPassesLeft: () => 3, getPassRefusal: () => null, spendPass: () => {
      lock = { phase: 'day', nextChange: new Date(2026, 9, 6, 22) }; return null;
    } },
    '@/lib/scan': { getScanCode: () => true },
    '@/lib/text': { formatPreset: (m: number) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}` },
    '@/lib/screen-time': { peekNap: () => null, isStoodDown: () => false, isScreenTimeAvailable: () => true, selectionSize: () => 0, ...screenTime },
    '@/lib/haptics': { done() {} }, '@/lib/analytics': { track() {} },
    '@/theme': { Type: {}, Space: {}, Gap: {}, Nocturne: {} },
    './voice': { Voice: 'Voice' }, './confirm': { Confirm: 'Confirm' }, './unheld-words': unheldWords,
  };
  const code = babel.transformSync(readFileSync(new URL('./exits-screen.tsx', import.meta.url), 'utf8'), {
    filename: 'exits-screen.tsx', configFile: false, babelrc: false, presets: ['@babel/preset-typescript'],
    plugins: [['@babel/plugin-transform-react-jsx', { runtime: 'classic' }], '@babel/plugin-transform-modules-commonjs'],
  }).code;
  const exports: any = {};
  class Clock extends Date { static now() { return now; } }
  runInNewContext(code, { exports, require: (id: string) => mocks[id] ?? {}, React: react, Date: Clock });
  return {
    render() { index = 0; return exports.ExitsScreen(); },
    change(phase: string, at: Date) { now = +at; lock = { phase, nextChange: new Date(+at + 8 * 3600000) }; },
  };
}
function nodes(tree: any): any[] {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return [tree, ...nodes(tree.children)];
}
function textOf(tree: any): string {
  if (typeof tree === 'string') return tree;
  if (!tree || typeof tree !== 'object') return '';
  return Array.isArray(tree) ? tree.map(textOf).join(' ') : textOf(tree.children);
}

test('exit menu follows morning and a completed pass stops claiming awake at bedtime', () => {
  const h = screenHarness();
  assert.match(textOf(h.render()), /Passes wait for the morning/);
  h.change('morning', new Date(2026, 9, 6, 7));
  let tree = h.render();
  assert.equal(nodes(tree).find((n) => n.props?.title === 'Use a pass').props.value, '3 left');
  assert.doesNotMatch(textOf(tree), /Passes wait for the morning/);
  nodes(tree).find((n) => n.props?.title === 'Use a pass').props.onPress();
  tree = h.render();
  nodes(tree).find((n) => n.type === 'Confirm').props.onConfirm();
  assert.match(textOf(h.render()), /Apps awake until 10:00 PM/);
  h.change('night', new Date(2026, 9, 6, 22));
  tree = h.render();
  assert.doesNotMatch(textOf(tree), /Apps awake until 10:00 PM/);
  assert.match(textOf(tree), /Passes wait for the morning/);
  assert.ok(nodes(tree).find((n) => n.props?.title === 'Emergency unlock'));
});

test('a pass or a morning emergency unlock before a night off never promises a bedtime', () => {
  for (const exit of ['Use a pass', 'Emergency unlock']) {
    const plan = { pauseNight: false, unlockMorning: true, endBlockNow: false, resumesAt: null };
    const h = screenHarness('Apps awake. Tonight is off.', plan);
    h.change('morning', new Date(2026, 9, 10, 7, 30));
    nodes(h.render()).find((n) => n.props?.title === exit).props.onPress();
    let tree = h.render();
    const confirm = nodes(tree).find((n) => n.type === 'Confirm');
    for (const shown of [textOf(tree), confirm.props.message]) {
      assert.doesNotMatch(shown, /bedtime/, `${exit}: ${shown}`);
      assert.match(shown, /Tonight is off/, `${exit}: ${shown}`);
    }
    confirm.props.onConfirm();
    tree = h.render();
    assert.doesNotMatch(textOf(tree), /bedtime/, exit);
    assert.match(textOf(tree), /Tonight is off/, exit);
  }
});

test('a night off never says nothing is locked while the always list or a Block now sleeps', () => {
  const night = new Date(2026, 9, 9, 23, 30);
  // The always list has apps: they're still shielded on a night off.
  const always = screenHarness(undefined, null, { selectionSize: (id: string) => (id === 'always' ? 2 : 0) });
  always.change('off', night);
  let body = textOf(always.render());
  assert.doesNotMatch(body, /Nothing is locked/);
  assert.match(body, /Bedtime apps awake tonight\. Always-asleep apps still sleep\./);
  // Stood down, the always list wakes too: nothing is locked.
  const stood = screenHarness(undefined, null, { isStoodDown: () => true, selectionSize: () => 2 });
  stood.change('off', night);
  assert.match(textOf(stood.render()), /Nothing is locked tonight/);
  // A Block now started at 22:30 that night keeps its apps asleep until it ends.
  const end = new Date(2026, 9, 10, 0, 30).getTime();
  const nap = screenHarness(undefined, null, { peekNap: () => ({ list: 'always', end }) });
  nap.change('off', night);
  body = textOf(nap.render());
  assert.doesNotMatch(body, /Nothing is locked/);
  assert.match(body, /Block now: apps asleep until 0:30\./);
});
