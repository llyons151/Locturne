/// <reference types="node" />
/**
 * The Routine tab, rendered from routine-screen.tsx with its stores faked. Its controls (the
 * dial, the day strip, the method list) can each save before React renders again, with the
 * callbacks of the last render: one mustn't undo another.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

import { nightsAround, wallClock } from '../../lib/lock-state.ts';
import { fromWeekday, nightsToWeekdays, weekdaysToNights } from './nights.ts';

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

/** `now`: the screen's clock, for what it reads from `new Date()`. */
function screen(initial: Stored, now?: Date) {
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
    '@/hooks/use-tab-selected': { useTabSelected: () => true },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) },
    '@/components/app-tabs': { useTabBarInset: () => 0 },
    '@/components/control-types': { nightsLabel: () => '' },
    '@/components/controls': { MenuRow: 'MenuRow', TimeRow: 'TimeRow' },
    '@/components/day-strip': { DayStrip: 'DayStrip' },
    '@/components/grouped-list': { Card: 'Card', ChoiceRow: 'ChoiceRow', ValueRow: 'ValueRow', sym: () => '' },
    '@/hooks/use-app-start': { armIfPaid() {} },
    '@/hooks/use-top-on-leave': { useTopOnLeave() {} },
    '@/components/glass-card': { GlassCard: 'GlassCard' },
    './apply-edit': {
      applyRoutineEdit(r: Stored) {
        stored = r;
        saves.push(r);
        return Promise.resolve();
      },
    },
    '@/lib/haptics': { tap() {}, thud() {} },
    '@/lib/lock-controller': {
      armRoutine: async () => {},
      inPendingFirstNight: () => false,
      onLockChange: () => () => {},
      syncLock() {},
    },
    '@/lib/lock-state': { nightsAround, wallClock },
    '@/lib/night-plan': { MIN_WINDOW: 15 },
    '@/lib/notifications': { rescheduleNotifications: async () => {} },
    '@/lib/routine': {
      getRoutine: () => stored,
      pushupGoalOf: (r: { pushupGoal?: number }) => r.pushupGoal ?? 10,
      getPendingRoutine: () => null,
      hasRoutine: () => true,
      toLockSettings: (r: Stored) => ({ ...r, nightApps: ['night'], alwaysApps: ['always'] }),
      saveRoutine(r: Stored) {
        stored = r;
        saves.push(r);
      },
    },
    '@/lib/screen-time': { getArmedNight: () => ({}), isScreenTimeAvailable: () => true, sharedGet: () => null, sharedSet() {} },
    '@/lib/scan-code': { methodInUse: (m: string) => m },
    '@/lib/scan': { getScanCode: () => null, getScanEditRefusal: () => null },
    '@/lib/place': { getMorningPlace: () => null, getPlaceEditRefusal: () => null },
    '@/lib/text': { noOrphan: (s: string) => s, formatPreset: () => '' },
    '@/theme': { DisplayFont: {}, Gap: {}, italicOverhang: () => ({}), Nocturne: {}, Radius: {}, Space: {}, Type: {}, VoiceSize: { aside: 0 } },
    './night-dial': { NightDial: 'NightDial' },
    './nights': { fromWeekday, nightsToWeekdays, weekdaysToNights },
    './pending-line': { pendingLine: () => '' },
    './shadow-loc': { ShadowLoc: 'ShadowLoc' },
  };
  const exports = {} as { RoutineScreen: () => Tree };
  // A clock stopped at `now`: `new Date()` reads it, `new Date(ms)` still works.
  const at = now?.getTime();
  const Clock =
    at === undefined
      ? Date
      : class extends Date {
          constructor(...args: [number?]) {
            super(args.length ? args[0]! : at!);
          }
        };
  runInNewContext(code, { exports, require: (id: string) => mocks[id], React: react, Date: Clock });

  index = 0;
  const tree = exports.RoutineScreen();
  const found: Record<string, any> = {};
  const methods: Record<string, any> = {};
  const walk = (node: unknown) => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== 'object') return;
    const el = node as Tree;
    if (el.type === 'NightDial') found.dial = el.props;
    if (el.type === 'DayStrip') found.days = el.props;
    if (el.type === 'ChoiceRow') methods[el.props.title] = el.props;
    el.children?.forEach(walk);
  };
  walk(tree);
  assert.ok(found.dial, 'the night dial renders');
  assert.ok(found.days, 'the day strip renders');
  return { dial: found.dial, days: found.days, methods, saves, stored: () => stored };
}

const ROUTINE: Stored = { bedtime: 23 * 60, morningStart: 7 * 60, activeNights: [0, 1, 2, 3, 4, 5, 6], method: 'steps', stepGoal: 200 };
const TIMES = { bedtime: 22 * 60 + 30, morningStart: 6 * 60 + 30 };
const WEEKNIGHTS = [1, 2, 3, 4];

test('a dial edit then a day tap from the same render keep both', () => {
  const s = screen(ROUTINE);
  s.dial.onChange(TIMES);
  s.days.onChange(weekdaysToNights(WEEKNIGHTS));
  assert.equal(s.stored().bedtime, TIMES.bedtime, 'the day tap does not undo the new bedtime');
  assert.equal(s.stored().morningStart, TIMES.morningStart);
  assert.deepEqual(s.stored().activeNights, WEEKNIGHTS);
});

test('a day tap then a dial edit from the same render keep both', () => {
  const s = screen(ROUTINE);
  s.days.onChange(weekdaysToNights(WEEKNIGHTS));
  s.dial.onChange(TIMES);
  assert.deepEqual(s.stored().activeNights, WEEKNIGHTS, 'the dial edit does not undo the days');
  assert.equal(s.stored().bedtime, TIMES.bedtime);
});

test('picking a method after a dial edit keeps the new times', () => {
  const s = screen(ROUTINE);
  s.dial.onChange(TIMES);
  const other = Object.values(s.methods).find((m) => !m.selected && /push-ups/i.test(m.title));
  assert.ok(other, 'a push-ups row to pick');
  other.onPress();
  assert.equal(s.stored().method, 'pushups');
  assert.equal(s.stored().bedtime, TIMES.bedtime);
  assert.equal(s.stored().morningStart, TIMES.morningStart);
});

test('after midnight, "tonight" is still the night in progress', () => {
  // Tuesday October 13, 2026, 1:30 AM: inside Monday night (11 PM to 7 AM).
  const s = screen(ROUTINE, new Date(2026, 9, 13, 1, 30));
  assert.equal(s.days.tonight, 0, 'Monday night, Monday first');
});

test('in the day, "tonight" is the coming night', () => {
  // Tuesday October 13, 2026, 3 PM: tonight is Tuesday night.
  assert.equal(screen(ROUTINE, new Date(2026, 9, 13, 15)).days.tonight, 1);
  // Sunday October 11, 2026, 10 PM: Sunday night, last in a Monday-first week.
  assert.equal(screen(ROUTINE, new Date(2026, 9, 11, 22)).days.tonight, 6);
});

test('a bedtime after midnight names the night after its evening', () => {
  // 1 AM to 8 AM. Wednesday October 14, 2026, 0:30: Wednesday's 1 AM bedtime is Tuesday night.
  const late = { ...ROUTINE, bedtime: 60, morningStart: 8 * 60 };
  assert.equal(screen(late, new Date(2026, 9, 14, 0, 30)).days.tonight, 1);
});
