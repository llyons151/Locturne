/// <reference types="node" />

/**
 * Leave the house, with Screen Time unavailable (records in memory) and the default routine
 * (bedtime 23:00, morning 07:00). Needs `--experimental-test-module-mocks`.
 */
import assert from 'node:assert/strict';
import { beforeEach, mock, test } from 'node:test';

import { fakeDeviceActivity } from './fake-device-activity.ts';

const fake = fakeDeviceActivity({ available: false });
mock.module('react-native-device-activity', { namedExports: fake.exports });

const place = await import('./place.ts');
const { recordProof } = await import('./morning-proof.ts');
const { currentProof } = await import('./lock-controller.ts');
const { methodInUse } = await import('./scan-code.ts');
const { sharedRemove, sharedSet } = await import('./screen-time.ts');

const at = (month: number, day: number, hour: number, minute = 0) => new Date(2026, month - 1, day, hour, minute);

/** A gym in Leeds, and points a known distance north of it (1e-5 degrees of latitude ≈ 1.11 m). */
const GYM = { name: 'The gym', latitude: 53.8, longitude: -1.55 };
const north = (meters: number) => ({ latitude: GYM.latitude + meters / 111_195, longitude: GYM.longitude });
const fix = (meters: number, when: Date, accuracy: number | null = 15) => ({ ...north(meters), accuracy, timestamp: when.getTime() });

beforeEach(() => {
  sharedSet('locturne.armedNight', fake.armedNight());
  sharedRemove('locturne.morningPlace');
  sharedRemove('locturne.morningProofs');
});

test('distance is great-circle metres', () => {
  assert.ok(Math.abs(place.distanceMeters(GYM, north(100)) - 100) < 0.5);
  assert.equal(place.distanceMeters(GYM, GYM), 0);
  // London to Paris is about 344 km.
  const d = place.distanceMeters({ latitude: 51.5074, longitude: -0.1278 }, { latitude: 48.8566, longitude: 2.3522 });
  assert.ok(Math.abs(d - 343_500) < 2_000, String(d));
});

test('a sharp, fresh fix inside the circle is there; outside is not', () => {
  const now = at(10, 6, 8);
  assert.equal(place.judgeFix(GYM, fix(30, now), now).kind, 'there');
  assert.equal(place.judgeFix(GYM, fix(place.PLACE_RADIUS_M - 1, now), now).kind, 'there');
  const far = place.judgeFix(GYM, fix(500, now), now);
  assert.equal(far.kind, 'notThere');
  assert.ok(far.kind === 'notThere' && Math.abs(far.distance - 500) < 1);
});

test('a vague fix never says yes, but can say clearly no', () => {
  const now = at(10, 6, 8);
  // From bed 2 km away, a cell-tower fix whose circle covers the gym must not count.
  assert.equal(place.judgeFix(GYM, fix(0, now, 2_500), now).kind, 'unsure');
  assert.equal(place.judgeFix(GYM, fix(50, now, place.MAX_ACCURACY_M + 1), now).kind, 'unsure');
  assert.equal(place.judgeFix(GYM, fix(50, now, null), now).kind, 'unsure');
  // 5 km away with a 300 m circle: even its near edge is far outside.
  assert.equal(place.judgeFix(GYM, fix(5_000, now, 300), now).kind, 'notThere');
});

test('an old or future-dated fix is unsure, and 0,0 is not a place', () => {
  const now = at(10, 6, 8);
  const old = new Date(now.getTime() - place.MAX_FIX_AGE_MS - 1);
  assert.equal(place.judgeFix(GYM, fix(10, old), now).kind, 'unsure');
  assert.equal(place.judgeFix(GYM, fix(10, new Date(now.getTime() + 60_000)), now).kind, 'unsure');
  assert.equal(place.judgeFix(GYM, fix(10, new Date(now.getTime() + 2_000)), now).kind, 'there', 'clock skew');
  assert.equal(place.judgeFix(GYM, { latitude: 0, longitude: 0, accuracy: 5, timestamp: now.getTime() }, now).kind, 'unsure');
});

/** Saves the gym on the afternoon of October 5, once that morning was proven. */
function saveYesterday() {
  recordProof({ morningKey: '2026-10-05', kind: 'steps', at: at(10, 5, 7, 30).getTime() });
  assert.equal(place.saveMorningPlace(GYM, at(10, 5, 14)), null);
}

test('the place can only change while the apps are awake', () => {
  assert.equal(place.saveMorningPlace(GYM, at(10, 6, 3)), 'asleep', 'night');
  assert.equal(place.saveMorningPlace(GYM, at(10, 6, 8)), 'asleep', 'morning, not yet up');
  assert.equal(place.getMorningPlace(), null);
  saveYesterday();
  assert.equal(place.getMorningPlace()?.name, 'The gym');
  assert.equal(place.saveMorningPlace({ ...GYM, name: '   ' }, at(10, 5, 15)), 'unusable');
  assert.equal(place.saveMorningPlace({ ...GYM, latitude: 0, longitude: 0 }, at(10, 5, 15)), 'unusable');
  assert.equal(place.getMorningPlace()?.latitude, GYM.latitude, 'a refused save keeps the old place');
});

test('morning: only a fix at the place unlocks, and only after morning start', () => {
  assert.equal(place.submitPlaceFix(fix(10, at(10, 6, 8)), at(10, 6, 8)).kind, 'noPlace');
  saveYesterday();
  assert.equal(place.submitPlaceFix(fix(10, at(10, 6, 3)), at(10, 6, 3)).kind, 'notMorning', 'bedtime wins');
  assert.equal(place.submitPlaceFix(fix(800, at(10, 6, 8)), at(10, 6, 8)).kind, 'notThere');
  assert.equal(place.submitPlaceFix(fix(10, at(10, 6, 8), 900), at(10, 6, 8)).kind, 'unsure');
  assert.equal(currentProof(at(10, 6, 8)), null);
  assert.equal(place.submitPlaceFix(fix(10, at(10, 6, 8, 5)), at(10, 6, 8, 5)).kind, 'unlocked');
  assert.equal(currentProof(at(10, 6, 8, 6))?.kind, 'place');
});

test('a place morning with nothing picked falls back to steps', () => {
  assert.equal(methodInUse('place'), 'steps');
  saveYesterday();
  assert.equal(methodInUse('place'), 'place');
});

test('names are trimmed and capped', () => {
  assert.equal(place.placeName('  The   gym  '), 'The gym');
  assert.equal(place.placeName(''), null);
  assert.equal(place.placeName('x'.repeat(80))?.length, 60);
});
