import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

const require = createRequire(import.meta.url);
const babel = require('@babel/core');
type Tree = { type: string | ((...args: unknown[]) => unknown); props: Record<string, any>; children: Tree[] };

function harness() {
  let index = 0;
  const state: any[] = [];
  let lock = { phase: 'morning', morningKey: '2026-10-05', nextChange: new Date(2026, 9, 5, 23), blockNowUntil: null };
  let routine = { method: 'steps', stepGoal: 200 };
  const react = {
    createElement: (type: Tree['type'], props: Tree['props'], ...children: Tree[]) => ({ type, props, children }),
    useState(initial: any) {
      const at = index++;
      if (!(at in state)) state[at] = typeof initial === 'function' ? initial() : initial;
      return [state[at], (value: any) => { state[at] = typeof value === 'function' ? value(state[at]) : value; }];
    },
    useCallback: (callback: unknown) => callback,
  };
  const mocks: Record<string, unknown> = {
    react,
    'react-native': { StyleSheet: { create: (s: unknown) => s }, ScrollView: 'ScrollView', View: 'View', Text: 'Text', AccessibilityInfo: { announceForAccessibility() {} } },
    'expo-router': { router: {} },
    'expo-symbols': {},
    'expo-keep-awake': {},
    'react-native-reanimated': {},
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) },
    '@/components/buttons': {},
    '@/components/grouped-list': {},
    '@/features/home/awake-line': { awakeLine: () => 'Apps awake' },
    '@/hooks/use-lock': { useLock: () => lock },
    '@/lib/emergency': { heldPhase: (phase: string) => phase },
    '@/lib/haptics': { done() {}, tap() {} },
    '@/lib/lock-controller': { proveMorning: () => { lock = { ...lock, phase: 'day' }; return lock; } },
    '@/lib/notifications': { shouldAskForNotifications: async () => false },
    '@/lib/lock-state': { currentMorning: () => ({ start: new Date() }) },
    '@/lib/routine': { getRoutine: () => routine, toLockSettings: (r: unknown) => r, nightAt: () => ({ start: new Date(), on: true }) },
    '@/lib/scan': { getScanCode: () => null },
    '@/lib/screen-time': { nightLockArmed: () => true, isStoodDown: () => false, isScreenTimeAvailable: () => true, selectionSize: () => 0 },
    '@/lib/text': { formatPreset: () => '11:00 PM' },
    '@/lib/wake/lines': {},
    '@/theme': { Type: {}, Space: {}, Gap: {}, Nocturne: {} },
    './downstairs-view': { DownstairsView: 'DownstairsView' },
    './steps-view': { StepsView: 'StepsView' },
    './morning-done': {},
    './parts': { TopBar: 'TopBar' },
    './wake-words': { wakePhase: (phase: string) => phase, wakeLabel: () => '', dayStatus: () => '' },
  };
  // These store queries run inside the success announcement.
  Object.assign(mocks['@/lib/lock-controller'] as object, { subscriptionEnded: () => false });
  const code = babel.transformSync(readFileSync(new URL('./wake-screen.tsx', import.meta.url), 'utf8'), {
    filename: 'wake-screen.tsx', configFile: false, babelrc: false, presets: ['@babel/preset-typescript'],
    plugins: [['@babel/plugin-transform-react-jsx', { runtime: 'classic' }], '@babel/plugin-transform-modules-commonjs'],
  }).code;
  const exports = {} as { WakeScreen: (props: object) => Tree };
  runInNewContext(code, { exports, require: (id: string) => mocks[id], React: react });
  const render = () => { index = 0; return exports.WakeScreen({}).children.at(-1)!; };
  return {
    render,
    change(phase: string, morningKey: string, method = 'steps') { lock = { ...lock, phase, morningKey }; routine = { ...routine, method }; },
  };
}

test('wake success is replaced by bedtime and the next morning proof controls on the same mounted route', () => {
  const h = harness();
  h.render().props.onMet();
  assert.equal((h.render().type as Function).name, 'Unlocked');
  h.change('night', '2026-10-06');
  assert.equal((h.render().type as Function).name, 'NotMorning');
  h.change('morning', '2026-10-06');
  assert.equal(h.render().type, 'StepsView');
});
