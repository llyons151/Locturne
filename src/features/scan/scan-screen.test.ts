import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import { awakeBody, savedBody } from './next-morning.ts';
import { liveScanStage } from './scan-stage.ts';
import { awakeLine } from '../home/awake-line.ts';
import { dayStatus } from '../wake/wake-words.ts';
const require = createRequire(import.meta.url);
const babel = require('@babel/core');
type Tree = { type: unknown; props: Record<string, any>; children: (Tree | Tree[] | string | null)[] };

function harness(source: string) {
  let index = 0;
  const state: any[] = [];
  let lock = { phase: 'night', morningKey: '2026-10-06', blockNowUntil: null as Date | null, nextChange: new Date(2026, 9, 6, 22) };
  // What tonight and the subscription look like after the scan (the shared success line reads them).
  const world = { tonightOn: true, ended: false, lapseCovers: null as string | null, bedtimeApps: true };
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
    '@/lib/emergency': { heldPhase: (phase: string) => phase, bedtimeAppsAhead: () => world.bedtimeApps },
    '@/lib/haptics': { done() {} },
    '@/lib/lock-controller': {
      readLock: () => lock, routineAt: () => ({ morningStart: 420 }),
      subscriptionEnded: () => world.ended, lapseStillCovers: () => world.lapseCovers,
    },
    '@/lib/lock-state': { nightsAround: () => ({ latest: { end: new Date() } }) },
    '@/lib/routine': {
      getRoutine: () => ({ stepGoal: 200 }), nextNightOn: () => null, toLockSettings: (r: unknown) => r,
      nightAt: (start: Date) => ({ start, on: world.tonightOn }),
    },
    '@/lib/scan': {
      getScanCode: () => ({ kind: 'qr', data: 'registered-code' }),
      getScanEditRefusal: () => lock.phase === 'day' ? null : 'asleep',
      submitScan: () => { lock = { ...lock, phase: 'day' }; return 'unlocked'; },
    },
    '@/lib/screen-time': { nightLockArmed: () => true, isStoodDown: () => false, isScreenTimeAvailable: () => true, selectionSize: () => 0 },
    '@/lib/text': { formatPreset: () => '7:00 AM' }, '@/features/home/awake-line': { awakeLine }, './wake-words': { dayStatus },
    '@/theme': { Type: {}, Space: {}, Gap: {}, Nocturne: {} },
    '../exits/voice': { Voice: 'Voice' }, './next-morning': { awakeBody, savedBody },
    './qr': {}, './scanner': { Scanner: 'Scanner' }, './share-code': {}, './scan-stage': { liveScanStage },
  };
  const load = (text: string, filename: string) => {
    const code = babel.transformSync(text, {
      filename, configFile: false, babelrc: false, presets: ['@babel/preset-typescript'],
      plugins: [['@babel/plugin-transform-react-jsx', { runtime: 'classic' }], '@babel/plugin-transform-modules-commonjs'],
    }).code;
    const exports = {} as any;
    runInNewContext(code, { exports, require: (id: string) => mocks[id], React: react });
    return exports;
  };
  // The success line is shared with the wake screen: run the real one against the stubs above.
  mocks['../wake/awake-status'] = load(readFileSync(new URL('../wake/awake-status.ts', import.meta.url), 'utf8'), 'awake-status.ts');
  const exports = load(source, 'scan-screen.tsx') as { ScanScreen: (props: { mode: string }) => Tree };
  return {
    render() { index = 0; return exports.ScanScreen({ mode: 'morning' }); },
    phase(phase: string) { lock = { ...lock, phase }; },
    nap(end: Date | null) { lock = { ...lock, blockNowUntil: end }; },
    world(next: Partial<typeof world>) { Object.assign(world, next); },
  };
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

test('successful scan does not promise a bedtime when tonight is off or a lapse has ended', () => {
  const source = readFileSync(new URL('./scan-screen.tsx', import.meta.url), 'utf8');
  const on = harness(source);
  on.phase('morning');
  find(on.render(), 'Scanner')!.props.onScan({ data: 'registered-code' });
  assert.match(texts(on.render()), /Apps awake until 7:00 AM\./);

  const off = harness(source);
  off.phase('morning');
  off.world({ tonightOn: false });
  find(off.render(), 'Scanner')!.props.onScan({ data: 'registered-code' });
  assert.match(texts(off.render()), /Apps awake\. Tonight is off\./);
  assert.doesNotMatch(texts(off.render()), /until bedtime/);

  // The last paid morning: the scan works, but nothing is scheduled after it.
  const lapsed = harness(source);
  lapsed.phase('morning');
  lapsed.world({ ended: true, lapseCovers: null });
  find(lapsed.render(), 'Scanner')!.props.onScan({ data: 'registered-code' });
  assert.match(texts(lapsed.render()), /Apps awake\. Nothing is scheduled to sleep\./);
});

test('an emptied bedtime list: no bedtime promised after the scan, and no morning named to scan for', () => {
  // Every bedtime app removed from bed: the removal waits for the next bedtime, so this
  // morning is still held and the scan works, but nothing sleeps at the next bedtime.
  const source = readFileSync(new URL('./scan-screen.tsx', import.meta.url), 'utf8');
  const h = harness(source);
  h.phase('morning');
  h.world({ bedtimeApps: false });
  find(h.render(), 'Scanner')!.props.onScan({ data: 'registered-code' });
  assert.doesNotMatch(texts(h.render()), /until/);
  assert.match(texts(h.render()), /No bedtime apps picked, so nothing sleeps at bedtime\./);

  // Opened again later in the day: tomorrow morning is free, so it isn't named.
  const later = harness(source);
  later.phase('day');
  later.world({ bedtimeApps: false });
  assert.match(texts(later.render()), /Nothing is scheduled to sleep, so there’s nothing to scan for\./);
  assert.doesNotMatch(texts(later.render()), /tomorrow/);
});
