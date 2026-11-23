/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { judgeGrass, judgeSun, labelScore, type PhotoReading } from './photo.ts';

const base: PhotoReading = { labels: [], green: 0, sky: 0, blob: 0, blobFill: 0, mean: 0.4, brightness: null };
const read = (r: Partial<PhotoReading>): PhotoReading => ({ ...base, ...r });

describe('labelScore', () => {
  test('matches whole words in snake-case ids, not substrings', () => {
    assert.equal(labelScore([{ id: 'blue_sky', confidence: 0.6 }], ['sky']), 0.6);
    assert.equal(labelScore([{ id: 'skyscraper', confidence: 0.9 }], ['sky']), 0);
    assert.equal(labelScore([{ id: 'grasshopper', confidence: 0.9 }], ['grass']), 0);
  });
});

describe('Touch grass', () => {
  test('a grass label outdoors passes', () => {
    assert.equal(judgeGrass(read({ labels: [{ id: 'grass', confidence: 0.7 }], green: 0.5, brightness: 6 })).ok, true);
  });
  test('a plant label needs the photo to be mostly green', () => {
    assert.equal(judgeGrass(read({ labels: [{ id: 'plant', confidence: 0.5 }], green: 0.45, brightness: 5 })).ok, true);
    assert.deepEqual(judgeGrass(read({ labels: [{ id: 'plant', confidence: 0.5 }], green: 0.1, brightness: 5 })), { ok: false, miss: 'notGrass' });
  });
  test('green alone (a green towel) is not grass', () => {
    assert.deepEqual(judgeGrass(read({ labels: [{ id: 'textile', confidence: 0.8 }], green: 0.9, brightness: 3 })), { ok: false, miss: 'notGrass' });
  });
  test('grass outside in the dark (before sunrise) still passes', () => {
    assert.equal(judgeGrass(read({ labels: [{ id: 'grass', confidence: 0.6 }], green: 0.5, brightness: -3 })).ok, true);
  });
  test('grass on a screen is refused', () => {
    const labels = [{ id: 'computer_monitor', confidence: 0.8 }, { id: 'grass', confidence: 0.5 }];
    assert.deepEqual(judgeGrass(read({ labels, green: 0.6, brightness: 4 })), { ok: false, miss: 'screen' });
  });
  test('a covered lens is too dark', () => {
    assert.deepEqual(judgeGrass(read({ mean: 0.01 })), { ok: false, miss: 'tooDark' });
  });
  test('no light reading: the labels decide', () => {
    assert.equal(judgeGrass(read({ labels: [{ id: 'lawn', confidence: 0.4 }], brightness: null })).ok, true);
  });
});

describe('Sunlight', () => {
  const sunny = { sky: 0.5, blob: 0.01, blobFill: 0.7, brightness: 11 };
  test('the sun disc in a blue sky passes', () => {
    assert.equal(judgeSun(read({ ...sunny, labels: [{ id: 'blue_sky', confidence: 0.8 }] })).ok, true);
  });
  test('a sun label in the sky passes without a clean disc', () => {
    assert.equal(judgeSun(read({ sky: 0.3, blob: 0.4, blobFill: 0.3, brightness: 10, labels: [{ id: 'sunset_sunrise', confidence: 0.6 }] })).ok, true);
  });
  test('a lamp in a room is indoors', () => {
    assert.deepEqual(judgeSun(read({ sky: 0.02, blob: 0.01, blobFill: 0.8, brightness: 2 })), { ok: false, miss: 'indoors' });
  });
  test('a light bulb on a white ceiling is not the sun, even with a daylight-looking reading', () => {
    // The camera meters on the bulb (bright reading); the ceiling counts as pale sky pixels.
    assert.deepEqual(judgeSun(read({ sky: 0.6, blob: 0.01, blobFill: 0.8, brightness: 7 })), { ok: false, miss: 'noSun' });
    const labels = [{ id: 'lamp', confidence: 0.6 }, { id: 'sky', confidence: 0.3 }];
    assert.deepEqual(judgeSun(read({ sky: 0.6, blob: 0.01, blobFill: 0.8, brightness: 7, labels })), { ok: false, miss: 'indoors' });
  });
  test('a bright disc with no sky around it is not the sun', () => {
    assert.deepEqual(judgeSun(read({ sky: 0.02, blob: 0.01, blobFill: 0.8, brightness: 6 })), { ok: false, miss: 'noSun' });
  });
  test('a blown-out frame (all white) is not a disc', () => {
    assert.deepEqual(judgeSun(read({ sky: 0.1, blob: 0.9, blobFill: 0.95, brightness: 5 })), { ok: false, miss: 'noSun' });
  });
  test('an overcast daylight sky counts', () => {
    assert.equal(judgeSun(read({ sky: 0.7, brightness: 8, labels: [{ id: 'cloudy', confidence: 0.6 }] })).ok, true);
  });
  test('a pale wall indoors is not an overcast sky', () => {
    assert.deepEqual(judgeSun(read({ sky: 0.7, brightness: 3 })), { ok: false, miss: 'noSun' });
    assert.deepEqual(judgeSun(read({ sky: 0.7, brightness: 8 })), { ok: false, miss: 'noSun' });
  });
  test('with no light reading, a ceiling light in pale pixels is not the sun', () => {
    assert.deepEqual(judgeSun(read({ sky: 0.5, blob: 0.01, blobFill: 0.8, brightness: null })), { ok: false, miss: 'noSun' });
  });
  test('with no light reading, the sun in a sky the classifier calls sky still passes', () => {
    assert.equal(judgeSun(read({ ...sunny, brightness: null, labels: [{ id: 'blue_sky', confidence: 0.7 }] })).ok, true);
  });
  test('a sky photo on a screen is refused', () => {
    const labels = [{ id: 'screen', confidence: 0.7 }, { id: 'sky', confidence: 0.6 }];
    assert.deepEqual(judgeSun(read({ ...sunny, labels })), { ok: false, miss: 'screen' });
  });
});
