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
    '@/components/text': { Text: 'text', TextInput: 'input' },
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
      isStoodDown: () => false, hasSelection: () => true, selectionSize: () => 2, isNightHeld: () => false,
      startNap: async () => nap,
    },
    '@/lib/text': { formatPreset: () => '3:00 PM' },
    '@/theme': { Type: {}, Space: {}, Gap: {}, Nocturne: {}, VoiceSize: {}, italicOverhang: () => ({}) },
    './use-sideways': { useSideways: () => false },
    './nap-line': { shownLine: (line: string) => line }, './nap-clock': { NapClock: 'NapClock' },
    './sleep-sheet': { closeSleepSheet() {}, SHEET_PADDING: 18 },
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
  await nodes(render()).find((n) => n.props?.label === 'Hold to tuck him in').props.onComplete();
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

const compile = (file: string) => babel.transformSync(readFileSync(new URL(file, import.meta.url), 'utf8'), {
  filename: file, configFile: false, babelrc: false, presets: ['@babel/preset-typescript'],
  plugins: [['@babel/plugin-transform-react-jsx', { runtime: 'classic' }], '@babel/plugin-transform-modules-commonjs'],
}).code;

test('VoiceOver hears the nap length and when the apps wake on the ruler', () => {
  let index = 0;
  const state: any[] = [];
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
    '@/components/text': { Text: 'text' },
    'react-native': { StyleSheet: { create: (s: any) => s }, View: 'View' },
    'react-native-reanimated': { __esModule: true, default: { View: 'Animated' }, FadeIn: { duration() {} } },
    '@/hooks/use-protection': { useProtection: () => ['on', () => {}] },
    '@/components/grouped-list': { sym: (s: string) => s },
    '@/lib/screen-time': { isScreenTimeAvailable: () => true },
    '@/lib/text': { formatPreset: (m: number) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}` },
    '@/theme': { Type: {}, Space: {}, Nocturne: {}, VoiceSize: {}, italicOverhang: () => ({}) },
    '@/lib/haptics': { tap() {} },
    './length-ruler': { LengthRuler: 'LengthRuler' },
    './use-sideways': { useSideways: () => false },
    './nap-line': { shownLine: (line: string) => line },
  };
  const exports: any = {};
  runInNewContext(compile('./nap-screen.tsx'), { exports, require: (id: string) => mocks[id] ?? {}, React: react });
  const nodes = (tree: any): any[] => !tree || typeof tree !== 'object' ? [] : Array.isArray(tree)
    ? tree.flatMap(nodes) : [tree, ...nodes(tree.children)];
  const render = () => { index = 0; return nodes(exports.NapScreen()).find((n) => n.type === 'LengthRuler'); };
  const at = (minutes: number) => {
    const d = new Date(state[6] + minutes * 60_000);
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  };
  const ruler = render();
  assert.equal(ruler.props.valueText, `30 min, apps asleep until ${at(30)}`);
  ruler.props.onChange(75);
  assert.equal(render().props.valueText, `1 hr 15 min, apps asleep until ${at(75)}`);
});

test('the ruler is an adjustable control with that value, and two quick swipes move two ticks', () => {
  const shared = (v: any) => ({ value: v, get() { return this.value; }, set(n: any) { this.value = n; } });
  let hooks = 0;
  const values: any[] = [];
  const pan: any = new Proxy({}, { get: () => () => pan });
  const mocks: Record<string, any> = {
    react: { useState: (v: any) => [v, () => {}] },
    'react-native': { StyleSheet: { create: (s: any) => s }, View: 'View' },
    'react-native-gesture-handler': { Gesture: { Pan: () => pan }, GestureDetector: 'GestureDetector' },
    'react-native-reanimated': {
      __esModule: true, default: { View: 'Animated' }, cancelAnimation() {}, interpolate() {},
      useAnimatedReaction() {}, useAnimatedStyle: () => ({}), withSpring: (v: number) => v,
      useSharedValue: (v: any) => (values[hooks++] ??= shared(v)),
    },
    'react-native-worklets': { scheduleOnRN() {} },
    '@/theme': { Nocturne: {} },
  };
  const react = { createElement: (type: any, props: any, ...children: any[]) => ({ type, props, children }) };
  const exports: any = {};
  runInNewContext(compile('./length-ruler.tsx'), { exports, require: (id: string) => mocks[id] ?? {}, React: react });
  const view = exports.LengthRuler({ value: 30, onChange() {}, valueText: '30 min, apps asleep until 3:12' });
  assert.equal(view.props.accessibilityRole, 'adjustable');
  assert.equal(view.props.accessibilityValue.text, '30 min, apps asleep until 3:12');
  // Two swipes up before the new length has come back through onChange: `value` still says 30.
  view.props.onAccessibilityAction({ nativeEvent: { actionName: 'increment' } });
  view.props.onAccessibilityAction({ nativeEvent: { actionName: 'increment' } });
  const offset = values[0];
  assert.equal(offset.get() / 12, (40 - exports.NAP_MIN) / exports.NAP_STEP);
});
