/// <reference types="node" />

/**
 * Asking for Screen Time again from whatever needed it (ask-access.ts): approved puts the
 * blocks back, and a paid night iOS stopped on the revoke is re-armed; refused offers Settings.
 *
 * Needs `--experimental-test-module-mocks` (set in the npm test script).
 */
import assert from 'node:assert/strict';
import { beforeEach, mock, test } from 'node:test';

const s = {
  answer: 'approved' as 'approved' | 'denied' | 'notDetermined' | 'throw',
  armed: null as { windows: number } | null,
  running: 0,
  stoodDown: false,
  reapplied: 0,
  armCalls: 0,
  alerts: [] as { title: string; buttons: { text: string }[] }[],
};

mock.module('react-native', {
  namedExports: {
    Alert: { alert: (title: string, _body: string, buttons: { text: string }[]) => s.alerts.push({ title, buttons }) },
    Linking: { openSettings: async () => {} },
  },
});
mock.module('./screen-time.ts', {
  namedExports: {
    requestAccess: async () => {
      if (s.answer === 'throw') throw new Error('authenticationMethodUnavailable');
      return s.answer;
    },
    reapplyStandingBlocks: () => { s.reapplied += 1; },
    getArmedNight: () => s.armed,
    currentNightWindowNames: () => Array.from({ length: s.running }, (_, i) => `night-${i}`),
    isStoodDown: () => s.stoodDown,
  },
});
mock.module('./arm.ts', { namedExports: { armTonight: async () => { s.armCalls += 1; return { status: 'armed', now: false }; } } });
mock.module('./notifications.ts', { namedExports: { rescheduleNotifications: async () => {} } });

const { askAccessAgain } = await import('./ask-access.ts');

beforeEach(() => {
  Object.assign(s, { answer: 'approved', armed: null, running: 0, stoodDown: false, reapplied: 0, armCalls: 0, alerts: [] });
});

test('approved: the shields go back up and the action can carry on, with no alert', async () => {
  assert.equal(await askAccessAgain(), true);
  assert.equal(s.reapplied, 1);
  assert.equal(s.alerts.length, 0);
});

test('approved after a revoke stopped tonight: a paid night is re-armed', async () => {
  Object.assign(s, { armed: { windows: 2 }, running: 0 });
  await askAccessAgain();
  assert.equal(s.armCalls, 1);
});

test('an unpaid night is never re-armed, and a whole one is left alone', async () => {
  Object.assign(s, { armed: { windows: 2 }, running: 0, stoodDown: true });
  await askAccessAgain();
  Object.assign(s, { stoodDown: false, running: 2 });
  await askAccessAgain();
  assert.equal(s.armCalls, 0);
});

for (const answer of ['denied', 'notDetermined', 'throw'] as const) {
  test(`refused again (${answer}): nothing is restored and one alert offers Settings`, async () => {
    s.answer = answer;
    assert.equal(await askAccessAgain(), false);
    assert.equal(s.reapplied, 0);
    assert.equal(s.alerts.length, 1);
    assert.deepEqual(s.alerts[0].buttons.map((b) => b.text), ['Not now', 'Open Settings']);
  });
}
