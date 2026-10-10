/// <reference types="node" />

/**
 * The shield's words for each rule, and `applyShieldText` against a fake
 * react-native-device-activity. Needs `--experimental-test-module-mocks`.
 */
import assert from 'node:assert/strict';
import { beforeEach, describe, mock, test } from 'node:test';

let available = true;
let store: Record<string, unknown> = {};
const shields: { title: string; subtitle: string; primaryButtonLabel: string }[] = [];
const noop = () => {};

mock.module('react-native-device-activity', {
  namedExports: {
    AuthorizationStatus: { notDetermined: 0, denied: 1, approved: 2 },
    isAvailable: () => available,
    getAuthorizationStatus: () => 2,
    activitySelectionMetadata: () => null,
    blockSelection: noop,
    cleanUpAfterActivity: noop,
    configureActions: noop,
    getActivities: () => [],
    getEvents: () => [],
    getFamilyActivitySelectionId: () => undefined,
    isShieldActive: () => false,
    intersection: () => undefined,
    onAuthorizationStatusChange: () => ({ remove: noop }),
    pollAuthorizationStatus: async () => 2,
    requestAuthorization: async () => {},
    setFamilyActivitySelectionId: noop,
    startMonitoring: async () => {},
    stopMonitoring: noop,
    unblockSelection: noop,
    union: noop,
    updateShield: (config: { title: string; subtitle: string; primaryButtonLabel: string }) => shields.push(config),
    updateShieldWithId: noop,
    setWebContentFilterPolicy: noop,
    clearWebContentFilterPolicy: noop,
    userDefaultsGet: (key: string) => store[key] ?? null,
    userDefaultsSet: (key: string, value: unknown) => {
      store[key] = value;
    },
    userDefaultsRemove: (key: string) => {
      delete store[key];
    },
  },
});

const { clockLabel, shieldCopy, shieldRule, shieldTap, shieldTextFor } = await import('./shield-copy.ts');
const { DEFAULT_ROUTINE } = await import('./routine.ts');

type Rule = ReturnType<typeof shieldRule>;
const RULES: Rule[] = ['night', 'lateNight', 'morning', 'blockNow', 'limit', 'always'];

beforeEach(() => {
  available = true;
  store = {};
  shields.length = 0;
});

describe('clock labels', () => {
  test('match the Routine tab', () => {
    assert.equal(clockLabel(7 * 60), '7 am');
    assert.equal(clockLabel(7 * 60 + 30), '7:30 am');
    assert.equal(clockLabel(0), '12 am');
    assert.equal(clockLabel(12 * 60 + 5), '12:05 pm');
    assert.equal(clockLabel(23 * 60), '11 pm');
  });
});

describe('which rule the shield speaks for', () => {
  const base = { phase: 'day' as const, minuteOfDay: 14 * 60, blockNowUntil: null, limitReached: false };

  test('night, with the 2am line after midnight', () => {
    assert.equal(shieldRule({ ...base, phase: 'night', minuteOfDay: 23 * 60 }), 'night');
    assert.equal(shieldRule({ ...base, phase: 'night', minuteOfDay: 2 * 60 }), 'lateNight');
    assert.equal(shieldRule({ ...base, phase: 'night', minuteOfDay: 5 * 60 }), 'night');
  });

  test('the morning lock wins over Block now and limits', () => {
    const busy = { ...base, blockNowUntil: new Date(), limitReached: true };
    assert.equal(shieldRule({ ...busy, phase: 'morning' }), 'morning');
    assert.equal(shieldRule({ ...busy, phase: 'night', minuteOfDay: 23 * 60 }), 'night');
  });

  test('daytime: Block now, then a used-up limit, then always-asleep', () => {
    assert.equal(shieldRule({ ...base, blockNowUntil: new Date(), limitReached: true }), 'blockNow');
    assert.equal(shieldRule({ ...base, limitReached: true }), 'limit');
    assert.equal(shieldRule(base), 'always');
    assert.equal(shieldRule({ ...base, phase: 'off' }), 'always');
  });
});

describe('the words', () => {
  test('every rule has a title, subtitle and button in his voice', () => {
    for (const rule of RULES) {
      const text = shieldCopy(rule, DEFAULT_ROUTINE, new Date(2026, 9, 3, 15, 30));
      for (const part of [text.title, text.subtitle, text.button]) {
        assert.ok(part.length > 0, rule);
        // VOICE.md: no exclamation points, no emoji.
        assert.ok(!part.includes('!'), `${rule}: ${part}`);
        assert.ok(!/\p{Extended_Pictographic}/u.test(part), `${rule}: ${part}`);
      }
      // iOS truncates long shield titles; his lines are short anyway.
      assert.ok(text.title.split(' ').length <= 8, `${rule}: ${text.title}`);
    }
  });

  test('blocked-app line from the line bank at night', () => {
    assert.equal(shieldCopy('night', DEFAULT_ROUTINE).title, 'Shh. I’m sleeping. So are they.');
    assert.match(shieldCopy('night', DEFAULT_ROUTINE).subtitle, /after 7 am/);
  });

  test('the morning says what to do for the chosen method', () => {
    assert.match(shieldCopy('morning', { ...DEFAULT_ROUTINE, method: 'steps', stepGoal: 300 }).subtitle, /^Walk 300 steps/);
  });

  // The barometer only listens after Start, and the camera is in the app. A shield that says
  // "go downstairs, then open Locturne" fails the morning of anyone who does what it says.
  test('downstairs and scan start in the app, before the proof', () => {
    for (const method of ['downstairs', 'scan'] as const) {
      const { subtitle } = shieldCopy('morning', { ...DEFAULT_ROUTINE, method });
      assert.match(subtitle, /^Open Locturne/, `${method}: ${subtitle}`);
    }
    assert.match(shieldCopy('morning', { ...DEFAULT_ROUTINE, method: 'downstairs' }).subtitle, /tap Start/);
  });

  test('the tone changes his words, never the facts or the rule', () => {
    const rules = ['night', 'lateNight', 'morning', 'blockNow', 'limit', 'always'] as const;
    for (const rule of rules) {
      const grumpy = shieldCopy(rule, DEFAULT_ROUTINE, null);
      assert.deepEqual(shieldCopy(rule, DEFAULT_ROUTINE, null, 'grumpy'), grumpy, `${rule}: grumpy is the default`);
      for (const tone of ['mild', 'unbearable'] as const) {
        const text = shieldCopy(rule, DEFAULT_ROUTINE, null, tone);
        assert.equal(text.subtitle, grumpy.subtitle, `${rule}/${tone}: the subtitle stays the plain fact`);
        assert.ok(text.title.split(' ').length <= 8, `${rule}/${tone}: ${text.title}`);
        assert.ok(!/!/.test(text.title + text.button), `${rule}/${tone}: no exclamation points`);
      }
    }
    assert.equal(shieldCopy('morning', DEFAULT_ROUTINE, null, 'unbearable').title, 'No. Get up.');
  });

  test('Block now names when the nap ends', () => {
    assert.match(shieldCopy('blockNow', DEFAULT_ROUTINE, new Date(2026, 9, 3, 15, 30)).subtitle, /until 3:30 pm/);
  });

  test('shieldTextFor reads the phase and the clock', () => {
    const text = shieldTextFor({ phase: 'night', blockNowUntil: null }, DEFAULT_ROUTINE, new Date(2026, 9, 3, 1, 10), false);
    assert.equal(text.title, 'Why are we awake.');
  });
});

describe('shieldTap', () => {
  test('only in the morning, and it opens the wake-up screen', () => {
    assert.equal(shieldTap('night'), null);
    assert.equal(shieldTap('day'), null);
    assert.equal(shieldTap('off'), null);
    assert.equal(shieldTap('morning')?.userInfo.url, 'locturne://wake');
  });
});
