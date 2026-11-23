/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { judgeBed, judgeBedSetup, type BedReading } from './bed.ts';
import { judgeShot } from './shot.ts';

const bed = [{ id: 'bed', confidence: 0.8 }];
const base: BedReading = {
  labels: bed,
  green: 0,
  sky: 0,
  blob: 0,
  blobFill: 0,
  mean: 0.4,
  brightness: 2,
  match: 0.3,
  texture: 0.03,
  refTexture: 0.03,
  people: 0,
};
const read = (r: Partial<BedReading>): BedReading => ({ ...base, ...r });

describe('Make your bed: the setup photo', () => {
  test('an empty bed is a setup photo', () => {
    assert.equal(judgeBedSetup(read({ match: undefined, refTexture: undefined })).ok, true);
  });
  test('no bed in it is refused', () => {
    assert.deepEqual(judgeBedSetup(read({ labels: [{ id: 'floor', confidence: 0.8 }] })), { ok: false, miss: 'noBed' });
  });
  test('someone lying in it is refused', () => {
    assert.deepEqual(judgeBedSetup(read({ people: 1 })), { ok: false, miss: 'someone' });
  });
});

describe('Make your bed: the morning', () => {
  test('the same bed, made, from the same spot passes', () => {
    assert.equal(judgeBed(read({})).ok, true);
  });
  test('another bed or room is not yours', () => {
    assert.deepEqual(judgeBed(read({ match: 0.9 })), { ok: false, miss: 'notYours' });
  });
  test('far off and no bed at all says so', () => {
    assert.deepEqual(judgeBed(read({ match: 0.95, labels: [{ id: 'ceiling', confidence: 0.7 }] })), { ok: false, miss: 'noBed' });
  });
  test('the same bed, much busier than it was made, is not made', () => {
    assert.deepEqual(judgeBed(read({ texture: 0.06 })), { ok: false, miss: 'unmade' });
  });
  test('a little busier (a crease, other light) still passes', () => {
    assert.equal(judgeBed(read({ texture: 0.036 })).ok, true);
  });
  test('a very smooth setup photo does not fail every small crease', () => {
    assert.equal(judgeBed(read({ refTexture: 0.005, texture: 0.012 })).ok, true);
  });
  test('still in it is refused', () => {
    assert.deepEqual(judgeBed(read({ people: 1 })), { ok: false, miss: 'someone' });
  });
  test('no setup photo to compare with walks', () => {
    assert.deepEqual(judgeBed(read({ refTexture: undefined, match: undefined })), { ok: false, miss: 'noSetup' });
    assert.deepEqual(judgeBed(read({ refMissing: true })), { ok: false, miss: 'noSetup' });
  });
  test('a bed on a screen is refused', () => {
    assert.deepEqual(judgeBed(read({ labels: [{ id: 'computer_monitor', confidence: 0.8 }, ...bed] })), { ok: false, miss: 'screen' });
  });
  test('judgeShot judges the setup photo with the setup rules', () => {
    const setupShot = read({ match: undefined, refTexture: undefined });
    assert.equal(judgeShot('bed', setupShot, true).ok, true);
    assert.equal(judgeShot('bed', setupShot).ok, false);
  });
});
