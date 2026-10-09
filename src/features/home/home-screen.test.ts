/// <reference types="node" />
/**
 * Home's hero and action, rendered from home-screen.tsx with its stores mocked: the status
 * Home picks for the trial's last days and for a night that's switched off.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, test } from 'node:test';
import { runInNewContext } from 'node:vm';

import { clockLabel } from '../../lib/shield-copy.ts';
import { trialNotice } from '../../lib/trial-notice.ts';
import * as awakeLine from './awake-line.ts';

const require = createRequire(import.meta.url);
const babel = require('@babel/core');
type Tree = { type: unknown; props: Record<string, any>; children: Tree[] };
type Hero = { title: string; body: string };

const code = babel.transformSync(readFileSync(new URL('./home-screen.tsx', import.meta.url), 'utf8'), {
  filename: 'home-screen.tsx',
  configFile: false,
  babelrc: false,
  presets: ['@babel/preset-typescript'],
  plugins: [['@babel/plugin-transform-react-jsx', { runtime: 'classic' }], '@babel/plugin-transform-modules-commonjs'],
}).code;

type Setup = {
  now: Date;
  phase?: string;
  trialEnd?: Date | null;
  blockNowUntil?: Date | null;
  always?: number;
  health?: Record<string, unknown>;
};

/** Renders Home once and returns what it hands HomeContent. */
function home({ now, phase = 'day', trialEnd = null, blockNowUntil = null, always = 0, health = {} }: Setup) {
  const react = {
    createElement: (type: unknown, props: Record<string, any>, ...children: Tree[]) => ({ type, props: props ?? {}, children }),
  };
  const lock = { phase, morningKey: '2026-10-09', nextChange: new Date(now.getTime() + 3_600_000), blockNowUntil };
  const mocks: Record<string, unknown> = {
    react,
    'expo-router': { router: { push() {} } },
    'react-native': {
      Linking: { openSettings() {}, openURL: async () => {} },
      StyleSheet: { create: (s: unknown) => s },
      useWindowDimensions: () => ({ width: 390 }),
      View: 'View',
    },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) },
    '@/components/app-tabs': { useTabBarInset: () => 0 },
    '@/hooks/use-health': { useHealth: () => [{ protection: 'on', level: 'ok', title: '', detail: '', ...health }] },
    '@/lib/emergency': { getNightPause: () => null, heldPhase: (p: string) => p, pauseWording: () => ({}) },
    '@/lib/lock-controller': {
      lapseStillCovers: () => null,
      nextBedtime: () => new Date(2026, 9, 9, 23),
      subscriptionEnded: () => false,
    },
    '@/lib/lock-state': { dateKey: () => '2026-10-09' },
    '@/lib/morning-proof': { getMorningsWon: () => 0, getProofs: () => [] },
    '@/lib/notifications': { getTrialEnd: () => trialEnd },
    '@/lib/purchases': { manageSubscriptions: async () => true },
    '@/lib/routine': { nextNightOn: (d: Date | null) => d },
    '@/lib/scan-code': { methodInUse: (m: string) => m },
    '@/lib/screen-time': {
      isScreenTimeAvailable: () => true,
      isStoodDown: () => false,
      nightLockArmed: () => true,
      selectionSize: (list: string) => (list === 'always' ? always : 0),
    },
    '@/lib/shield-copy': { clockLabel },
    '@/lib/trial-notice': { trialNotice },
    '@/theme': { Gap: {}, Space: {} },
    './awake-line': awakeLine,
    './home-content': { HomeContent: 'HomeContent' },
    './night-meter': { duration: (m: number) => `${m} min`, useMinute: () => now },
    './review-prompt': { useReviewPrompt() {} },
    './use-visit': { useVisit: () => 0 },
    './use-home-state': { useHomeState: () => ({ lock, routine: { method: 'steps', morningStart: 7 * 60 }, proof: null }) },
    './week': { weekDays: () => [] },
  };
  const exports = {} as { HomeScreen: () => Tree };
  runInNewContext(code, { exports, require: (id: string) => mocks[id], React: react, __DEV__: false });
  const content = exports.HomeScreen().children[0];
  return content.props as { hero: Hero; action: { label: string } };
}

describe('Home in the trial’s last days (B4)', () => {
  const trialEnd = new Date(2026, 9, 10, 12);

  test('the day before the charge, Home says the trial ends tomorrow and offers Manage subscription', () => {
    const { hero, action } = home({ now: new Date(2026, 9, 9, 14), trialEnd });
    assert.equal(hero.title, 'Your free trial ends tomorrow.');
    assert.match(hero.body, /Manage subscription/);
    assert.equal(action.label, 'Manage subscription');
  });

  test('the day of the charge, it says today', () => {
    const { hero } = home({ now: new Date(2026, 9, 10, 8), phase: 'day', trialEnd });
    assert.equal(hero.title, 'Your free trial ends today.');
  });

  test('outside the last two days, or with no trial, Home shows the day as usual', () => {
    for (const end of [new Date(2026, 9, 14, 12), null]) {
      const { hero, action } = home({ now: new Date(2026, 9, 9, 14), trialEnd: end });
      assert.match(hero.title, /^Bedtime in/);
      assert.equal(action.label, 'Edit schedule');
    }
  });

  test('a status that needs fixing still leads', () => {
    const { hero, action } = home({
      now: new Date(2026, 9, 9, 14),
      trialEnd,
      health: { level: 'attention', title: 'Arming failed', detail: 'Try again.' },
    });
    assert.equal(hero.title, 'Arming failed');
    assert.notEqual(action.label, 'Manage subscription');
  });

  test('a night that sleeps keeps its own hero and action', () => {
    const { hero, action } = home({ now: new Date(2026, 9, 10, 7, 30), phase: 'morning', trialEnd });
    assert.equal(hero.title, 'Time to get up');
    assert.equal(action.label, 'Start walking');
  });
});
