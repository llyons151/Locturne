/// <reference types="node" />

/**
 * Loc's firsts and the rating prompt. The storage runs on the in-memory fallback, which
 * `screen-time.ts` uses whenever Screen Time isn't available (needs
 * `--experimental-test-module-mocks`).
 */
import assert from 'node:assert/strict';
import { describe, mock, test } from 'node:test';

const noop = () => {};
mock.module('react-native-device-activity', {
  namedExports: {
    AuthorizationStatus: { notDetermined: 0, denied: 1, approved: 2 },
    isAvailable: () => false,
    getAuthorizationStatus: () => 0,
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
    pollAuthorizationStatus: async () => 0,
    requestAuthorization: async () => {},
    setFamilyActivitySelectionId: noop,
    startMonitoring: async () => {},
    stopMonitoring: noop,
    unblockSelection: noop,
    union: noop,
    updateShield: noop,
    updateShieldWithId: noop,
    setWebContentFilterPolicy: noop,
    clearWebContentFilterPolicy: noop,
    userDefaultsGet: () => null,
    userDefaultsSet: noop,
    userDefaultsRemove: noop,
  },
});

const fr = await import('./first-run.ts');

const night = { phase: 'night' as const, morningKey: '2026-10-04' };
const morning = { phase: 'morning' as const, morningKey: '2026-10-04' };
const day = { phase: 'day' as const, morningKey: '2026-10-04' };
const walked = { kind: 'dance' as const, morningKey: '2026-10-04' };

describe('which first shows', () => {
  test('a first shows until it has been seen on another morning', () => {
    assert.equal(fr.firstMoment(night, null, {}), 'night');
    assert.equal(fr.firstMoment(night, null, { night: '2026-10-04' }), 'night');
    assert.equal(fr.firstMoment(night, null, { night: '2026-10-03' }), null);
    assert.equal(fr.firstMoment(morning, null, {}), 'morning');
    assert.equal(fr.firstMoment(morning, null, { morning: '2026-10-01' }), null);
  });

  test('"up" needs a real wake-up proof for this morning', () => {
    assert.equal(fr.firstMoment(day, walked, {}), 'up');
    assert.equal(fr.firstMoment(day, null, {}), null, 'an afternoon install');
    assert.equal(fr.firstMoment(day, { ...walked, morningKey: '2026-10-03' }, {}), null, 'yesterday');
    assert.equal(fr.firstMoment(day, { ...walked, kind: 'pass' }, {}), null);
    assert.equal(fr.firstMoment(day, { ...walked, kind: 'emergency' }, {}), null);
    assert.equal(fr.firstMoment(day, { ...walked, kind: 'steps' }, { up: '2026-10-02' }), null);
  });

  test('a night that is off has no first', () => {
    assert.equal(fr.firstMoment({ phase: 'off', morningKey: '2026-10-04' }, null, {}), null);
  });
});

describe('the script', () => {
  const routine = { method: 'dance' as const, stepGoal: 200 };

  test('every first has a short line and no exclamation points', () => {
    for (const moment of ['night', 'morning', 'up'] as const) {
      const { line, note } = fr.firstLine(moment, routine);
      assert.ok(line.split(' ').length <= 8, line);
      assert.ok(!`${line}${note}`.includes('!'));
    }
  });

  test('the notes use the routine', () => {
    assert.match(fr.firstLine('night', routine).note, /until you get up and dance/);
    assert.match(fr.firstLine('night', { method: 'scan', stepGoal: 200 }).note, /scan your code/);
    assert.match(fr.firstLine('morning', routine).note, /Walk 200 steps instead/);
    assert.match(fr.firstLine('morning', { method: 'steps', stepGoal: 300 }).note, /never resets/);
  });
});

describe('seen flags', () => {
  test('the first morning a first is seen is kept', () => {
    fr.markFirstSeen('night', '2026-10-04');
    fr.markFirstSeen('night', '2026-10-05');
    assert.deepEqual(fr.getFirstRunSeen(), { night: '2026-10-04' });
  });
});

describe('the rating prompt', () => {
  const now = new Date('2026-12-01T09:00:00Z');
  const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000).toISOString();

  test('first on the 3rd morning won, not before', () => {
    assert.equal(fr.shouldAskForReview(walked, day, 1, [], now), false);
    assert.equal(fr.shouldAskForReview(walked, day, 2, [], now), false);
    assert.equal(fr.shouldAskForReview(walked, day, 3, [], now), true);
    assert.equal(fr.shouldAskForReview(walked, day, 7, [], now), true, 'a late install of this rule still asks');
  });

  test('then on the 30th, and only 60 days after the last ask', () => {
    const first = [{ at: daysAgo(70), wins: 3 }];
    assert.equal(fr.shouldAskForReview(walked, day, 29, first, now), false);
    assert.equal(fr.shouldAskForReview(walked, day, 30, first, now), true);
    const recent = [{ at: daysAgo(59), wins: 3 }];
    assert.equal(fr.shouldAskForReview(walked, day, 45, recent, now), false, '30 won but too soon');
  });

  test('then the 100th, then once a year with a new morning won', () => {
    const two = [{ at: daysAgo(200), wins: 3 }, { at: daysAgo(61), wins: 30 }];
    assert.equal(fr.shouldAskForReview(walked, day, 99, two, now), false);
    assert.equal(fr.shouldAskForReview(walked, day, 100, two, now), true);
    const three = [...two, { at: daysAgo(364), wins: 100 }];
    assert.equal(fr.shouldAskForReview(walked, day, 150, three, now), false, 'under a year');
    const yearOld = [...two, { at: daysAgo(365), wins: 100 }];
    assert.equal(fr.shouldAskForReview(walked, day, 150, yearOld, now), true);
    assert.equal(fr.shouldAskForReview(walked, day, 100, yearOld, now), false, 'no morning won since');
  });

  test('never for a pass, an emergency, another morning or outside the day', () => {
    assert.equal(fr.shouldAskForReview({ ...walked, kind: 'pass' }, day, 3, [], now), false);
    assert.equal(fr.shouldAskForReview({ ...walked, kind: 'emergency' }, day, 3, [], now), false);
    assert.equal(fr.shouldAskForReview({ ...walked, morningKey: '2026-10-03' }, day, 3, [], now), false);
    assert.equal(fr.shouldAskForReview(walked, morning, 3, [], now), false);
    assert.equal(fr.shouldAskForReview(walked, { ...day, phase: 'night' as const }, 3, [], now), false);
    assert.equal(fr.shouldAskForReview(null, day, 3, [], now), false);
  });

  test('remembers each ask', () => {
    assert.deepEqual(fr.getReviewAsks(), []);
    fr.markReviewAsked(now, 3);
    fr.markReviewAsked(new Date('2027-02-01T09:00:00Z'), 30);
    assert.deepEqual(fr.getReviewAsks(), [
      { at: '2026-12-01T09:00:00.000Z', wins: 3 },
      { at: '2027-02-01T09:00:00.000Z', wins: 30 },
    ]);
  });
});
