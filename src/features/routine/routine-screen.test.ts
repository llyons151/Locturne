/// <reference types="node" />
/**
 * The Routine tab's Night card, rendered from routine-screen.tsx with its stores faked. Its two
 * time rows can both save before React renders again: leaving the app mid-edit flushes each
 * row in the same AppState event (`controls.ios.tsx`), with the callbacks of the last render.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

import { nightsToWeekdays, weekdaysToNights } from './nights.ts';

const require = createRequire(import.meta.url);
const babel = require('@babel/core');

type Tree = { type: unknown; props: Record<string, any>; children: unknown[] };
type Stored = { bedtime: number; morningStart: number; activeNights: number[]; method: string; stepGoal: number };

const code = babel.transformSync(readFileSync(new URL('./routine-screen.tsx', import.meta.url), 'utf8'), {
  filename: 'routine-screen.tsx',
  configFile: false,
  babelrc: false,
  presets: ['@babel/preset-typescript'],
  plugins: [['@babel/plugin-transform-react-jsx', { runtime: 'classic' }], '@babel/plugin-transform-modules-commonjs'],
}).code;

function screen(initial: Stored) {
  let stored = initial;
  const saves: Stored[] = [];
  const state: unknown[] = [];
  let index = 0;
  const react = {
    createElement: (type: unknown, props: Record<string, any>, ...children: unknown[]) => ({ type, props: props ?? {}, children }),
    useState(init: unknown) {
      const i = index++;
      if (!(i in state)) state[i] = typeof init === 'function' ? (init as () => unknown)() : init;
      return [state[i], (next: unknown) => (state[i] = typeof next === 'function' ? (next as (v: unknown) => unknown)(state[i]) : next)];
    },
    useRef: (init: unknown) => ({ current: init }),
    useCallback: (fn: unknown) => fn,
    useEffect() {},
  };
  const mocks: Record<string, unknown> = {
    react,
    'expo-router': { router: { push() {} }, useFocusEffect() {} },
    'expo-symbols': { SymbolView: 'SymbolView' },
    'react-native': {
      AccessibilityInfo: { announceForAccessibility() {} },
      AppState: { addEventListener: () => ({ remove() {} }) },
      Platform: { OS: 'ios' },
      Pressable: 'Pressable',
      useWindowDimensions: () => ({ width: 393, height: 852 }),
      StyleSheet: { create: (s: unknown) => s },
      View: 'View',
    },
    'react-native-gesture-handler': { ScrollView: 'ScrollView' },
    '@/components/text': { Text: 'Text' },
    'react-native-reanimated': {
      __esModule: true,
      default: { View: 'Animated.View' },
      FadeIn: { duration: () => ({}) },
      LayoutAnimationConfig: 'LayoutAnimationConfig',
      Easing: { bezier: () => () => 0 },
      useAnimatedStyle: () => ({}),
      useReducedMotion: () => false,
      useSharedValue: (value: unknown) => ({ value, get: () => value, set() {} }),
      withDelay: () => 0,
      withTiming: () => 0,
    },
    '@/components/night-sky': { moonSink: { set() {} } },
    '@/hooks/use-tab-selected': { useTabSelected: () => true },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) },
    '@/components/app-tabs': { useTabBarInset: () => 0 },
    '@/components/control-types': { nightsLabel: () => '' },
    '@/components/controls': { MenuRow: 'MenuRow', TimeRow: 'TimeRow' },
    '@/components/day-picker': { DayStrip: 'DayStrip' },
    '@/components/grouped-list': { Card: 'Card', ChoiceRow: 'ChoiceRow', ValueRow: 'ValueRow', sym: () => '' },
    '@/hooks/use-app-start': { armIfPaid() {} },
    '@/hooks/use-top-on-leave': { useTopOnLeave() {} },
    '@/components/glass-card': { GlassCard: 'GlassCard' },
    './apply-edit': { applyRoutineEdit: () => Promise.resolve() },
    '@/lib/haptics': { tap() {}, thud() {} },
    '@/lib/lock-controller': {
      armRoutine: async () => {},
      inPendingFirstNight: () => false,
      onLockChange: () => () => {},
      syncLock() {},
    },
    '@/lib/night-plan': { MIN_WINDOW: 15 },
    '@/lib/notifications': { rescheduleNotifications: async () => {} },
    '@/lib/routine': {
      getRoutine: () => stored,
      pushupGoalOf: (r: { pushupGoal?: number }) => r.pushupGoal ?? 10,
      getPendingRoutine: () => null,
      hasRoutine: () => true,
      saveRoutine(r: Stored) {
        stored = r;
        saves.push(r);
      },
    },
    '@/lib/screen-time': { getArmedNight: () => ({}), isScreenTimeAvailable: () => true },
    '@/lib/scan': { getScanCode: () => null, getScanEditRefusal: () => null },
    '@/lib/place': { getMorningPlace: () => null, getPlaceEditRefusal: () => null },
    '@/lib/text': { noOrphan: (s: string) => s },
    '@/theme': { DisplayFont: {}, Gap: {}, italicOverhang: () => ({}), Nocturne: {}, Radius: {}, Space: {}, Type: {}, VoiceSize: { aside: 0 } },
    './night-dial': { NightDial: 'NightDial' },
    './nights': { nightsToWeekdays, weekdaysToNights },
    './pending-line': { pendingLine: () => '' },
  };
  const exports = {} as { RoutineScreen: () => Tree };
  runInNewContext(code, { exports, require: (id: string) => mocks[id], React: react });

  index = 0;
  const tree = exports.RoutineScreen();
  const rows: Record<string, any>[] = [];
  const walk = (node: unknown) => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== 'object') return;
    const el = node as Tree;
    if (el.type === 'TimeRow') rows.push(el.props);
    el.children?.forEach(walk);
  };
  walk(tree);
  const [bedtime, morning] = rows;
  assert.equal(bedtime.title, 'Bedtime');
  assert.equal(morning.title, 'Morning start');
  return { bedtime, morning, saves, stored: () => stored };
}

const ROUTINE: Stored = { bedtime: 23 * 60, morningStart: 7 * 60, activeNights: [0, 1, 2, 3, 4, 5, 6], method: 'steps', stepGoal: 200 };

test('both time rows saving before a re-render keep both edits (leaving the app mid-edit)', () => {
  const s = screen(ROUTINE);
  // The same AppState event flushes Bedtime, then Morning start, with this render's callbacks.
  s.bedtime.onChange(22 * 60 + 30);
  s.morning.onChange(6 * 60 + 30);
  assert.equal(s.stored().bedtime, 22 * 60 + 30, 'the bedtime edit is not undone by the second save');
  assert.equal(s.stored().morningStart, 6 * 60 + 30);
  assert.deepEqual(s.saves.at(-1)?.activeNights, ROUTINE.activeNights);
});

test("a row's refusal checks the other time as saved now, not as last rendered", () => {
  const s = screen(ROUTINE);
  s.bedtime.onChange(22 * 60 + 30);
  assert.match(s.morning.invalid(22 * 60 + 30) ?? '', /can't be the same time/);
  assert.equal(s.morning.invalid(6 * 60 + 30), null);
});
