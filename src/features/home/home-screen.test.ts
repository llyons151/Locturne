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
type Hero = { title: string; body: string; aside?: string };

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
  /** What the morning walk reads while it's on (`useMorningWalk`). */
  walk?: Record<string, unknown>;
  /** This morning's proof (`useHomeState`). */
  proof?: { morningKey: string; kind: string; at: number } | null;
  /** When the lock next changes (the wake-up at night); an hour from `now` when left out. */
  nextChange?: Date;
  /** The routine's wake-up method. */
  method?: string;
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
  walk = { kind: 'counting', steps: 64, goal: 200 },
  method = 'steps',
  proof = null,
  nextChange,
}: Setup) {
  const react = {
    createElement: (type: unknown, props: Record<string, any>, ...children: Tree[]) => ({ type, props: props ?? {}, children }),
  };
  const lock = { phase, morningKey: '2026-10-09', nextChange: nextChange ?? new Date(now.getTime() + 3_600_000), blockNowUntil };
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
    '@/lib/routine': { pushupGoalOf: () => 20, getRoutineChange: () => null, nightWasOn: () => true, nextNightOn: (d: Date) => (nextOn === undefined ? d : nextOn), nightAt: () => ({ on: tonightOn }) },
    '@/lib/scan-code': { methodInUse: (m: string) => m },
    '@/lib/screen-time': {
      bedtimeAppCount: () => night,
      nightPickCount: () => night,
      nightPickCountAfterChange: () => (change ? change.size : night),
      isScreenTimeAvailable: () => true,
      isStoodDown: () => false,
      nightLockArmed: () => armed,
      selectionSize: (list: string) => (list === 'always' ? always : list === 'night' ? night : 0),
      listChangeLandsAt: () => (change ? { at: change.at, waitsForOpen: false, sleepsFirst: false } : null),
      selectionSizeAfterChange: () => (change ? change.size : night),
      shownSelection: () => ({ id: 'night', size: night }),
    },
    '@/lib/websites': { getSites: () => [] },
    '@/lib/shield-copy': { clockLabel },
    '@/lib/trial-notice': { trialNotice },
    '@/theme': { Gap: {}, Space: {} },
    './awake-line': awakeLine,
    './home-content': { HomeContent: 'HomeContent' },
    './loc': { LocCue: 'LocCue' },
    './night-meter': { bigClock: (m: number) => ({ value: String(m), unit: '' }), duration: (m: number) => `${m} min`, useMinute: () => now },
    './review-prompt': { useReviewPrompt() {} },
    './use-visit': { useVisit: () => 0 },
    './use-loc-mind': { useLocMind: () => ({ proud: false, wary: 0, moment: null }) },
    '@/lib/tone': { getTone: () => 'grumpy' },
    './use-moon-sink': { useMoonSink() {} },
    './catch-up': { useCatchingUp: () => false },
    './use-morning-walk': { useMorningWalk: (on: boolean) => (on ? walk : null) },
    'expo-keep-awake': { useKeepAwake() {} },
    './morning': { scanMorning: (w: unknown) => morningOf('scan', w) },
    './use-morning-stairs': { useMorningStairs: (on: boolean, w: unknown) => (on ? morningOf('stairs', w) : null) },
    './use-morning-place': { useMorningPlace: (on: boolean, w: unknown) => (on ? morningOf('place', w) : null) },
    './use-morning-pushups': {
      useMorningPushups: (on: boolean, w: unknown) => (on ? { morning: morningOf('pushups', w), camera: null } : null),
    },
    '../dev/wake-lab/wake-preview': { pretendMethod: () => null },
    '../dev/state-lab/app-states': { useHomeMock: () => null },
    '../dev/state-lab/mock-bar': { MockBar: 'MockBar', MockSwipe: 'MockSwipe' },
    './use-home-state': { useHomeState: () => ({ lock, routine: { method, morningStart: 7 * 60, stepGoal: 200 }, proof }) },
    './week': { weekDays: () => [] },
  };
  const exports = {} as { HomeScreen: () => Tree };
  runInNewContext(code, { exports, require: (id: string) => mocks[id], React: react, __DEV__: false });
  const screen = exports.HomeScreen();
  const content = screen.children[0];
  const loc = screen.children[1];
  return {
    ...(content.props as {
      hero: Hero;
      action: { label: string };
      alt?: { label: string };
      icon?: { ios: string };
      meter?: { value: string; caption?: string; progress?: number; kicker?: string };
      look: string;
    }),
    mood: (loc.props as { mood: string }).mood,
  };
}

/** A stand-in for a method's morning hook: names the method, and whether it got the walk. */
function morningOf(name: string, walk: unknown) {
  const alt = { label: 'Other ways to wake them', onPress() {} };
  return {
    icon: { ios: `${name}.icon`, android: name },
    hero: { title: `${name} hero`, body: walk ? 'walk counted' : 'no walk' },
    meter: name === 'stairs' ? { value: '1.2', caption: 'm down of 2.5 m', progress: 0.48 } : undefined,
    action: { label: `${name} action`, onPress() {} },
    alt,
  };
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
      assert.equal(action.label, 'Tomorrow: 200 steps at 7 am');
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
    const { hero, action } = home({ now: new Date(2026, 9, 10, 7, 30), phase: 'morning', trialEnd, method: 'pushups' });
    assert.equal(hero.title, 'pushups hero');
    assert.equal(action.label, 'pushups action');
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

describe('Loc on Home', () => {
  test('sleeps through a held night, is groggy through the locked morning and up by day', () => {
    assert.equal(home({ now: new Date(2026, 9, 9, 23, 30), phase: 'night' }).mood, 'asleep');
    assert.equal(home({ now: new Date(2026, 9, 10, 7, 5), phase: 'morning' }).mood, 'groggy');
    assert.equal(home({ now: new Date(2026, 9, 9, 14), phase: 'day' }).mood, 'awake');
  });

  test('a night an emergency unlock paused is not asleep', () => {
    assert.equal(home({ now: new Date(2026, 9, 9, 23, 30), phase: 'night', pause: new Date(2026, 9, 10, 23) }).mood, 'awake');
  });
});

describe('Home during a walk morning', () => {
  const now = new Date(2026, 9, 9, 7, 10);

  test('the live count is the hero, no Loc line under it, and the button offers the other ways', () => {
    const { hero, meter, action } = home({ now, phase: 'morning' });
    // Made in Home's own context, so it's copied out before comparing.
    assert.deepEqual({ ...meter }, { value: '64', caption: 'of 200 steps', progress: 0.32 });
    assert.equal(hero.title, '64 of 200 steps');
    assert.equal(hero.body, '136 more and your apps wake up.');
    assert.equal(hero.aside, undefined);
    assert.equal(action.label, 'Other ways to wake them');
  });

  test('before the first reading it shows a dash, not zero', () => {
    const { meter } = home({ now, phase: 'morning', walk: { kind: 'counting', steps: null, goal: 200 } });
    assert.equal(meter?.value, '–');
  });

  test('Motion & Fitness off: says so and offers Settings, with no meter', () => {
    const { hero, meter, action } = home({ now, phase: 'morning', walk: { kind: 'denied' } });
    assert.equal(meter, undefined);
    assert.equal(hero.title, "I can't hear you walking");
    assert.equal(action.label, 'Open Settings');
  });

  test('by day there is no walk on Home, only the countdown to bedtime', () => {
    const { meter } = home({ now: new Date(2026, 9, 9, 13), phase: 'day' });
    assert.equal(meter?.kicker, 'Bedtime in');
  });
});

describe('Home during the other methods’ mornings', () => {
  const now = new Date(2026, 9, 9, 7, 10);

  test('downstairs runs on Home: its meter, icon, button and the quiet other ways, with steps counted under it', () => {
    const { hero, meter, icon, action, alt } = home({ now, phase: 'morning', method: 'downstairs' });
    assert.equal(hero.title, 'stairs hero');
    assert.equal(hero.body, 'walk counted');
    assert.equal(meter?.value, '1.2');
    assert.equal(icon?.ios, 'stairs.icon');
    assert.equal(action.label, 'stairs action');
    assert.equal(alt?.label, 'Other ways to wake them');
  });

  test('the place check-in and the scan are Home’s morning too', () => {
    for (const [method, name] of [['place', 'place'], ['scan', 'scan']]) {
      const { hero, action, meter } = home({ now, phase: 'morning', method });
      assert.equal(hero.title, `${name} hero`);
      assert.equal(hero.body, 'walk counted');
      assert.equal(action.label, `${name} action`);
      assert.equal(meter, undefined);
    }
  });

  test('push-ups are Home’s morning too, with the walk counted under them', () => {
    // They used to open the old wake page from Home's button (user, 2026-10-15).
    const { hero, action, alt } = home({ now, phase: 'morning', method: 'pushups' });
    assert.equal(hero.title, 'pushups hero');
    assert.equal(hero.body, 'walk counted');
    assert.equal(action.label, 'pushups action');
    assert.equal(alt?.label, 'Other ways to wake them');
  });

  test('the walk’s own meter is the walk icon, and nothing else leaks in by day', () => {
    assert.equal(home({ now, phase: 'morning' }).icon?.ios, 'figure.walk');
    const day = home({ now: new Date(2026, 9, 9, 13), phase: 'day', method: 'downstairs' });
    assert.equal(day.icon, undefined);
    assert.equal(day.alt, undefined);
  });
});

describe('Home’s looks', () => {
  test('by day the countdown to bedtime is the big number, with no track', () => {
    const { look, meter } = home({ now: new Date(2026, 9, 9, 13) });
    assert.equal(look, 'day');
    assert.deepEqual([meter?.kicker, meter?.value, meter?.progress], ['Bedtime in', '600 min', undefined]);
  });

  test('the last hour fills a track toward bedtime', () => {
    const { look, meter } = home({ now: new Date(2026, 9, 9, 22, 30) });
    assert.equal(look, 'evening');
    assert.equal(meter?.progress, 0.5);
  });

  test('at night the wake time is the big number and the button is plain text', () => {
    const { look, meter, hero, action } = home({ now: new Date(2026, 9, 9, 23, 30), phase: 'night', nextChange: new Date(2026, 9, 10, 7) });
    assert.equal(look, 'night');
    assert.equal(meter?.kicker, 'Asleep until');
    assert.equal(hero.body, 'Phone down. They wake once you’re up and moving.');
    // Before midnight the locked morning is tomorrow's.
    assert.match(action.label, /^Tomorrow: /);
  });

  test('in the last hour before wake-up the countdown leads, and the morning is this morning', () => {
    const { look, meter, hero, action } = home({ now: new Date(2026, 9, 10, 6, 34), phase: 'night', nextChange: new Date(2026, 9, 10, 7) });
    assert.equal(look, 'night');
    assert.equal(meter?.kicker, 'Wake-up in');
    assert.equal(meter?.value, '26 min');
    assert.ok(meter?.progress !== undefined && Math.abs(meter.progress - 34 / 60) < 1e-9);
    assert.match(hero.body, /^Phone down\. Your apps wake at /);
    // The line above gives the time, so the button just names the method.
    assert.match(action.label, /^This morning: /);
    assert.doesNotMatch(action.label, / at /);
  });

  test('a locked morning wears the morning look', () => {
    assert.equal(home({ now: new Date(2026, 9, 9, 7, 10), phase: 'morning', method: 'downstairs' }).look, 'morning');
  });

  test('Screen Time off takes over as a problem, even at night', () => {
    const { look } = home({ now: new Date(2026, 9, 9, 23, 30), phase: 'night', health: { protection: 'off', title: 'Off', detail: 'x' } });
    assert.equal(look, 'problem');
  });

  test('a morning won with a wake-up shows when they got up, for three hours', () => {
    const at = new Date(2026, 9, 9, 7, 6).getTime();
    const proof = { morningKey: '2026-10-09', kind: 'steps', at };
    const soon = home({ now: new Date(2026, 9, 9, 8), proof });
    assert.equal(soon.look, 'done');
    assert.equal(soon.meter?.kicker, 'Up at');
    assert.equal(home({ now: new Date(2026, 9, 9, 11), proof }).look, 'day');
  });

  test('a pass is no win: the day stays the day', () => {
    const proof = { morningKey: '2026-10-09', kind: 'pass', at: new Date(2026, 9, 9, 7).getTime() };
    assert.equal(home({ now: new Date(2026, 9, 9, 8), proof }).look, 'day');
  });

  test('a paused night stays plain, with no countdown', () => {
    const { look, meter } = home({ now: new Date(2026, 9, 9, 23, 30), phase: 'night', pause: new Date(2026, 9, 10, 23) });
    assert.equal(look, 'plain');
    assert.equal(meter, undefined);
  });
});
