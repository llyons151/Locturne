import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

test('Wake him early opens the deliberate exit flow without ending the active nap', () => {
  const source = readFileSync(new URL('./nap-screen.tsx', import.meta.url), 'utf8');
  const handler = source.match(/  const wake = ([\s\S]*?);\n\n/);
  assert.ok(handler);
  const routes: string[] = [];
  let ended = false;
  runInNewContext(`const wake = ${handler[1]}; wake();`, {
    router: { push: (route: string) => routes.push(route) },
    endNap: () => { ended = true; },
    // An alert must not itself authorize a bypass of the emergency/pass path.
    Alert: { alert: (_title: string, _body: string, actions: { onPress?: () => void }[]) => actions.at(-1)?.onPress?.() },
    wakeNow: () => { ended = true; },
  });
  assert.equal(ended, false);
  assert.deepEqual(routes, ['/exits']);
});

const require = createRequire(import.meta.url);
const babel = require('@babel/core');

test('an active nap reports revoked protection and recovers its status when access returns', async () => {
  let index = 0;
  const state: any[] = [];
  let protection = 'on';
  const nap = { start: Date.now(), end: Date.now() + 1800000, list: 'night' };
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
    react, 'expo-router': { router: {}, useFocusEffect() {} }, 'expo-symbols': { SymbolView: 'Symbol' },
    'react-native': { StyleSheet: { create: (s: any) => s }, ScrollView: 'ScrollView', View: 'View', Text: 'Text' },
    'react-native-reanimated': { __esModule: true, default: { View: 'Animated' }, FadeIn: { duration() {} } },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) },
    '@/hooks/use-protection': { useProtection: () => [protection, () => {}] },
    '@/components/buttons': { PrimaryButton: 'Button', TextButton: 'Button' },
    '@/components/grouped-list': { sym: (s: string) => s },
    '@/features/apps/picker-settle': { isPickerSettling: () => false },
    '@/lib/lock-controller': { syncLock() {} },
    '@/lib/screen-time': {
      isScreenTimeAvailable: () => true, getProtection: () => protection,
      isStoodDown: () => false, hasSelection: () => true, isNightHeld: () => false,
      startNap: async () => nap,
    },
    '@/lib/text': { formatPreset: () => '3:00 PM' },
    '@/theme': { Type: {}, Space: {}, Gap: {}, Nocturne: {}, VoiceSize: {}, italicOverhang: () => ({}) },
    './use-sideways': { useSideways: () => false },
    './nap-line': { shownLine: (line: string) => line }, './nap-clock': { NapClock: 'NapClock' },
  };
  const code = babel.transformSync(readFileSync(new URL('./nap-screen.tsx', import.meta.url), 'utf8'), {
    filename: 'nap-screen.tsx', configFile: false, babelrc: false, presets: ['@babel/preset-typescript'],
    plugins: [['@babel/plugin-transform-react-jsx', { runtime: 'classic' }], '@babel/plugin-transform-modules-commonjs'],
  }).code;
  const exports: any = {};
  runInNewContext(code, { exports, require: (id: string) => mocks[id] ?? {}, React: react });
  const render = () => { index = 0; return exports.NapScreen(); };
  const nodes = (tree: any): any[] => !tree || typeof tree !== 'object' ? [] : Array.isArray(tree)
    ? tree.flatMap(nodes) : [tree, ...nodes(tree.children)];
  const texts = (tree: any): string => typeof tree === 'string' ? tree : !tree || typeof tree !== 'object' ? ''
    : Array.isArray(tree) ? tree.map(texts).join(' ') : texts(tree.children);
  await nodes(render()).find((n) => n.props?.label === 'Tuck him in').props.onPress();
  assert.match(texts(render()), /Apps asleep until/);
  protection = 'off';
  const revoked = render();
  assert.match(texts(revoked), /Screen Time protection is off/);
  assert.doesNotMatch(texts(revoked), /Apps asleep until|asleep with him/);
  const spoken = nodes(revoked).find((n) => n.props?.accessibilityLabel?.includes('minute')).props.accessibilityLabel;
  assert.match(spoken, /protection is off/);
  assert.doesNotMatch(spoken, /Apps asleep/);
  protection = 'on';
  assert.match(texts(render()), /Apps asleep until/);
});
