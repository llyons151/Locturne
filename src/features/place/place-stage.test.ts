/// <reference types="node" />

import assert from 'node:assert/strict';
import { mock, test } from 'node:test';

import { fakeDeviceActivity } from '../../lib/fake-device-activity.ts';
import type { Stage, WordsContext } from './place-stage.ts';

// place-spot.ts reads the App Group store; Screen Time is unavailable here.
mock.module('react-native-device-activity', { namedExports: fakeDeviceActivity({ available: false }).exports });
const { formatDistance, hereFailedWords, livePlaceStage, placeWords, settingsCanFix } = await import('./place-stage.ts');

const morning = { phase: 'morning' as const, morningKey: '2026-10-06' };
const day = { phase: 'day' as const, morningKey: '2026-10-06' };
const night = { phase: 'night' as const, morningKey: '2026-10-07' };

test('distances read naturally in metres and miles', () => {
  assert.equal(formatDistance(4, false), '10 m');
  assert.equal(formatDistance(347, false), '350 m');
  assert.equal(formatDistance(1_240, false), '1.2 km');
  assert.equal(formatDistance(23_400, false), '23 km');
  assert.equal(formatDistance(120, true), '400 ft');
  assert.equal(formatDistance(2_100, true), '1.3 mi');
});

test('a morning stage lasts only while the morning does', () => {
  const notThere: Stage = { kind: 'notThere', distance: 400 };
  assert.deepEqual(livePlaceStage(notThere, { kind: 'morning' }, morning, true), notThere);
  // Checked in somewhere else and the bedtime came round: the screen says so instead.
  assert.deepEqual(livePlaceStage(notThere, { kind: 'notYet' }, night, true), { kind: 'notYet' });
});

test('an unlock shows until the next morning, a setup draft is refused from bed', () => {
  const unlocked: Stage = { kind: 'unlocked', morningKey: '2026-10-06' };
  assert.deepEqual(livePlaceStage(unlocked, { kind: 'awake' }, day, false), unlocked);
  assert.deepEqual(livePlaceStage(unlocked, { kind: 'notYet' }, night, true), { kind: 'notYet' });
  const confirm: Stage = {
    kind: 'confirm',
    source: 'search',
    candidate: { name: 'Gym', address: '1 Mill Rd, Leeds', latitude: 53.8, longitude: -1.55 },
  };
  assert.deepEqual(livePlaceStage(confirm, { kind: 'pick' }, day, false), confirm);
  assert.deepEqual(livePlaceStage(confirm, { kind: 'asleep' }, night, true), { kind: 'asleep' });
  assert.deepEqual(livePlaceStage({ kind: 'saved' }, { kind: 'asleep' }, night, true), { kind: 'saved' });
});

const ctx: WordsContext = {
  place: 'the gym',
  awake: '',
  next: new Date(2026, 9, 7, 7),
  morningStart: '7:00',
  stepGoal: 200,
  imperial: false,
  now: new Date(2026, 9, 6, 14),
};

test('his words name the place, the distance and the way out', () => {
  assert.match(placeWords({ kind: 'morning' }, ctx).body, /the gym/);
  assert.match(placeWords({ kind: 'notThere', distance: 1_240 }, ctx).body, /1\.2 km from the gym/);
  assert.match(placeWords({ kind: 'noFix', why: 'denied' }, ctx).body, /walk 200 steps instead/);
  assert.match(placeWords({ kind: 'saved' }, ctx).body, /^Tomorrow morning, get there/);
  assert.match(placeWords({ kind: 'awake' }, { ...ctx, next: null }).body, /Every night is off/);
  // "Use where I am" warns against picking home.
  const here = placeWords({ kind: 'confirm', source: 'here', candidate: { name: '', address: '', latitude: 1, longitude: 1 } }, ctx);
  assert.match(here.body, /not at home/);
});

test('no location: Settings is offered only where it can help', () => {
  assert.match(placeWords({ kind: 'noFix', why: 'imprecise' }, ctx).body, /Precise Location/);
  assert.match(placeWords({ kind: 'noFix', why: 'imprecise' }, ctx).body, /walk 200 steps instead/);
  // A restriction isn't theirs to lift: no "turn it on".
  const restricted = placeWords({ kind: 'noFix', why: 'restricted' }, ctx).body;
  assert.match(restricted, /restricted/);
  assert.doesNotMatch(restricted, /Turn|turn/);
  assert.equal(settingsCanFix('denied'), true);
  assert.equal(settingsCanFix('imprecise'), true);
  assert.equal(settingsCanFix('restricted'), false);
  assert.equal(settingsCanFix('off'), false, "the app's Settings page can't turn Location Services on");
  assert.equal(settingsCanFix('failed'), false);
  assert.match(hereFailedWords('vague'), /too fuzzy/);
  assert.match(hereFailedWords('imprecise'), /Precise Location/);
  assert.doesNotMatch(hereFailedWords('restricted'), /turn/i);
});
