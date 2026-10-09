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
  /** Tonight's night is switched on in the routine. */
  tonightOn?: boolean;
  /** The next night that's on (`nextNightOn`), when it isn't tonight. */
  nextOn?: Date | null;
  /** A night lock is scheduled (`nightLockArmed`). */
  armed?: boolean;
  /** An emergency unlock paused the night until then (`getNightPause`). */
  pause?: Date | null;
  /** Apps on the bedtime list now (`selectionSize('night')`). */
  night?: number;
  /** A waiting bedtime-list change: when it lands and how many apps it leaves. */
  change?: { at: Date; size: number } | null;
};

/** Renders Home once and returns what it hands HomeContent. */
function home({
  now,
  phase = 'day',
  trialEnd = null,
  blockNowUntil = null,
  always = 0,
  health = {},
  tonightOn = true,
  nextOn,
  pause = null,
  armed = true,
  night = 3,
  change = null,
}: Setup) {
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
    '@/lib/emergency': {
      getNightPause: () => pause,
      heldPhase: (p: string) => (p === 'night' && pause ? 'day' : p),
      pauseWording: () => ({ morning: 'tomorrow morning', resumes: new Date(2026, 9, 10, 23), weekday: null }),
    },
    '@/lib/lock-controller': {
      lapseStillCovers: () => null,
      nextBedtime: () => new Date(2026, 9, 9, 23),
      subscriptionEnded: () => false,
    },
    '@/lib/lock-state': { dateKey: () => '2026-10-09' },
    '@/lib/morning-proof': { getMorningsWon: () => 0, getProofs: () => [] },
    '@/lib/notifications': { getTrialEnd: () => trialEnd },
    '@/lib/purchases': { manageSubscriptions: async () => true },
    '@/lib/routine': { nextNightOn: (d: Date) => (nextOn === undefined ? d : nextOn), nightAt: () => ({ on: tonightOn }) },
    '@/lib/scan-code': { methodInUse: (m: string) => m },
    '@/lib/screen-time': {
      isScreenTimeAvailable: () => true,
      isStoodDown: () => false,
      nightLockArmed: () => armed,
      selectionSize: (list: string) => (list === 'always' ? always : list === 'night' ? night : 0),
      listChangeLandsAt: () => (change ? { at: change.at, waitsForOpen: false, sleepsFirst: false } : null),
      selectionSizeAfterChange: () => (change ? change.size : night),
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

describe('Home on a night that’s switched off', () => {
  const now = new Date(2026, 9, 9, 22, 30);

  test('a Block now running leads, not "Nothing sleeps tonight"', () => {
    const { hero } = home({ now, phase: 'off', blockNowUntil: new Date(2026, 9, 9, 23, 30) });
    assert.equal(hero.title, 'Your apps are asleep');
    assert.match(hero.body, /Block now: apps asleep until 11:30 pm/);
  });

  test('apps on the always list still sleep, and Home says so', () => {
    const { hero } = home({ now, phase: 'off', always: 3 });
    assert.equal(hero.title, 'Night off');
    assert.equal(hero.body, 'Bedtime apps awake tonight. Always-asleep apps still sleep.');
  });

  test('nothing on the always list and no Block now: nothing sleeps', () => {
    const { hero } = home({ now, phase: 'off' });
    assert.match(hero.body, /Nothing sleeps tonight/);
  });

  test('a Block now that ended no longer leads', () => {
    const { hero } = home({ now, phase: 'off', blockNowUntil: new Date(2026, 9, 9, 22) });
    assert.equal(hero.title, 'Night off');
  });
});

describe('Home by day when tonight is switched off', () => {
  test('says tonight is off and names the next night, not "Bedtime in" as if it were tonight', () => {
    // Friday 10:00, Friday and Saturday nights off: the next night that sleeps is Sunday 23:00.
    const { hero } = home({ now: new Date(2026, 9, 9, 10), tonightOn: false, nextOn: new Date(2026, 9, 11, 23) });
    assert.equal(hero.title, 'Tonight is off');
    assert.equal(hero.body, `Your next bedtime is ${clockLabel(23 * 60)} on Sunday.`);
    assert.doesNotMatch(`${hero.title} ${hero.body}`, /Bedtime in/);
  });

  test('the day after an emergency unlock, a pause still pending until tonight doesn’t hide that tonight is off', () => {
    // 01:00 Friday's emergency unlock resumes at Friday 23:00 (the next calendar bedtime),
    // but Friday and Saturday nights are off: Sunday 23:00 is the next night that sleeps.
    const { hero } = home({
      now: new Date(2026, 9, 9, 10),
      pause: new Date(2026, 9, 9, 23),
      tonightOn: false,
      nextOn: new Date(2026, 9, 11, 23),
    });
    assert.equal(hero.title, 'Tonight is off');
    assert.equal(hero.body, `Your next bedtime is ${clockLabel(23 * 60)} on Sunday.`);
  });

  test('every night off with apps on the always list: Home says they still sleep', () => {
    const { hero } = home({ now: new Date(2026, 9, 9, 10), tonightOn: false, nextOn: null, always: 2 });
    assert.equal(hero.title, 'No bedtime scheduled');
    assert.equal(hero.body, 'Every night is switched off. Always-asleep apps still sleep.');
  });

  test('every night off and nothing on the always list: nothing sleeps', () => {
    const { hero } = home({ now: new Date(2026, 9, 9, 10), tonightOn: false, nextOn: null });
    assert.equal(hero.body, 'Every night is switched off, so nothing sleeps.');
  });

  test('tonight off, no night lock armed, apps on the always list: they still sleep', () => {
    const { hero } = home({ now: new Date(2026, 9, 9, 10), tonightOn: false, nextOn: new Date(2026, 9, 11, 23), armed: false, always: 2 });
    assert.equal(hero.title, 'No bedtime scheduled');
    assert.equal(hero.body, 'Bedtime apps awake. Tonight is off. Always-asleep apps still sleep.');
  });

  test('a night that’s on still counts down', () => {
    const { hero } = home({ now: new Date(2026, 9, 9, 10) });
    assert.match(hero.title, /^Bedtime in/);
  });
});

describe('Home on a night an emergency unlock paused', () => {
  const now = new Date(2026, 9, 9, 23, 45);
  const pause = new Date(2026, 9, 10, 23);

  test('a Block now started after the unlock leads, not "Awake tonight"', () => {
    const { hero } = home({ now, phase: 'night', pause, blockNowUntil: new Date(2026, 9, 10, 0, 45) });
    assert.equal(hero.title, 'Your apps are asleep');
    assert.match(hero.body, /Block now: apps asleep until 12:45 am/);
  });

  test('with no Block now, it says the apps are awake tonight', () => {
    const { hero } = home({ now, phase: 'night', pause });
    assert.equal(hero.title, 'Awake tonight');
  });
});

describe('Home with an armed night and an empty bedtime list', () => {
  test('by day, a removal waiting for bedtime: no "Bedtime in", and the action opens the Apps tab', () => {
    const { hero, action } = home({ now: new Date(2026, 9, 9, 14), change: { at: new Date(2026, 9, 9, 23), size: 0 }, always: 2 });
    assert.doesNotMatch(`${hero.title} ${hero.body}`, /Bedtime in|go to sleep/);
    assert.equal(hero.body, 'No bedtime apps picked, so nothing sleeps at bedtime. Always-asleep apps still sleep.');
    assert.equal(action.label, 'Pick bedtime apps');
  });

  test('at 23:30, after the empty list applied: not "Your apps are asleep"', () => {
    const { hero, action } = home({ now: new Date(2026, 9, 9, 23, 30), phase: 'night', night: 0 });
    assert.notEqual(hero.title, 'Your apps are asleep');
    assert.equal(hero.body, 'No bedtime apps picked, so nothing sleeps at bedtime.');
    assert.equal(action.label, 'Pick bedtime apps');
  });

  test('apps added back before bedtime: the countdown returns', () => {
    const { hero } = home({ now: new Date(2026, 9, 9, 14), night: 0, change: { at: new Date(2026, 9, 9, 23), size: 2 } });
    assert.match(hero.title, /^Bedtime in/);
  });

  test('a night with bedtime apps still says they are asleep', () => {
    const { hero } = home({ now: new Date(2026, 9, 9, 23, 30), phase: 'night' });
    assert.equal(hero.title, 'Your apps are asleep');
  });
});
