import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import { liveScanStage } from './scan-stage.ts';
import { dayStatus } from '../wake/wake-words.ts';
const require = createRequire(import.meta.url);
const babel = require('@babel/core');
type Tree = { type: unknown; props: Record<string, any>; children: (Tree | Tree[] | string | null)[] };

function harness(source: string) {
  let index = 0;
  const state: any[] = [];
  let lock = { phase: 'night', morningKey: '2026-10-06', blockNowUntil: null as Date | null };
  const react = {
    createElement: (type: unknown, props: Record<string, any>, ...children: Tree['children']) => ({ type, props, children }),
    useState(initial: any) {
      const at = index++;
      if (!(at in state)) state[at] = typeof initial === 'function' ? initial() : initial;
      return [state[at], (value: any) => { state[at] = value; }];
    },
  };
  const mocks: Record<string, unknown> = {
    react, 'expo-router': { useRouter: () => ({}) },
    '@/components/text': { Text: 'text', TextInput: 'input' },
    'react-native': { StyleSheet: { create: (s: unknown) => s }, ScrollView: 'ScrollView', View: 'View', Text: 'Text' },
    'react-native-reanimated': { default: { View: 'Animated' }, __esModule: true, FadeIn: { duration() {} } },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) },
    '@/components/buttons': { PrimaryButton: 'Button', TextButton: 'Button' }, '@/components/segmented': {},
    '@/hooks/use-lock': { useLock: () => lock },
    '@/lib/emergency': { heldPhase: (phase: string) => phase },
    '@/lib/haptics': { done() {} },
    '@/lib/lock-controller': { readLock: () => lock, routineAt: () => ({ morningStart: 420 }), subscriptionEnded: () => false },
    '@/lib/lock-state': { nightsAround: () => ({ latest: { end: new Date() } }) },
    '@/lib/routine': { getRoutine: () => ({ stepGoal: 200 }), nextNightOn: () => null, toLockSettings: (r: unknown) => r },
    '@/lib/scan': {
      getScanCode: () => ({ kind: 'qr', data: 'registered-code' }),
      getScanEditRefusal: () => lock.phase === 'day' ? null : 'asleep',
      submitScan: () => { lock = { ...lock, phase: 'day' }; return 'unlocked'; },
    },
    '@/lib/screen-time': { nightLockArmed: () => true, isStoodDown: () => false },
    '@/lib/text': { formatPreset: () => '7:00 AM' },
    '@/theme': { Type: {}, Space: {}, Gap: {}, Nocturne: {} },
    '../wake/wake-words': { dayStatus }, '../exits/voice': { Voice: 'Voice' }, './next-morning': { awakeBody: () => 'Awake' },
    './qr': {}, './scanner': { Scanner: 'Scanner' }, './share-code': {}, './scan-stage': { liveScanStage },
  };
  const code = babel.transformSync(source, {
    filename: 'scan-screen.tsx', configFile: false, babelrc: false, presets: ['@babel/preset-typescript'],
    plugins: [['@babel/plugin-transform-react-jsx', { runtime: 'classic' }], '@babel/plugin-transform-modules-commonjs'],
  }).code;
  const exports = {} as { ScanScreen: (props: { mode: string }) => Tree };
  runInNewContext(code, { exports, require: (id: string) => mocks[id], React: react });
  return { render() { index = 0; return exports.ScanScreen({ mode: 'morning' }); }, phase(phase: string) { lock = { ...lock, phase }; }, nap(end: Date | null) { lock = { ...lock, blockNowUntil: end }; } };
}
function find(tree: unknown, type: string): Tree | undefined {
  if (!tree || typeof tree !== 'object') return;
  if (Array.isArray(tree)) return tree.map((node) => find(node, type)).find(Boolean);
  const node = tree as Tree;
  return node.type === type ? node : find(node.children, type);
}

test('mounted morning scan becomes usable at morning start and retires stale success at bedtime', () => {
  const source = readFileSync(new URL('./scan-screen.tsx', import.meta.url), 'utf8');
  const h = harness(source);
  assert.equal(find(h.render(), 'Scanner'), undefined);
  h.phase('morning');
  const scanner = find(h.render(), 'Scanner');
  assert.ok(scanner, 'morning boundary must reveal the camera without reopening');
  scanner.props.onScan({ data: 'registered-code' });
  assert.equal(find(h.render(), 'Voice')?.props.text, "I'm up. Don't talk to me yet.");
  h.phase('night');
  assert.equal(find(h.render(), 'Voice')?.props.text, 'Shh. Still bedtime.');
});

function texts(tree: unknown): string {
  if (typeof tree === 'string') return tree;
  if (!tree || typeof tree !== 'object') return '';
  return Array.isArray(tree) ? tree.map(texts).join(' ') : texts((tree as Tree).children);
}

test('successful scan still reports an independent Block now and updates when it ends', () => {
  const h = harness(readFileSync(new URL('./scan-screen.tsx', import.meta.url), 'utf8'));
  h.phase('morning');
  h.nap(new Date(2026, 9, 6, 8));
  find(h.render(), 'Scanner')!.props.onScan({ data: 'registered-code' });
  assert.match(texts(h.render()), /Block now: apps asleep until/);
  h.nap(null);
  assert.doesNotMatch(texts(h.render()), /Block now:/);
});
