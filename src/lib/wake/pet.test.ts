/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { judgePet, type PetAnimal, type PetHand, type PetReading } from './pet.ts';
import { judgeShot } from './shot.ts';

const base: PetReading = { labels: [], green: 0, sky: 0, blob: 0, blobFill: 0, mean: 0.4, brightness: null, animals: [], hands: [] };
const read = (r: Partial<PetReading>): PetReading => ({ ...base, ...r });

const cat: PetAnimal = { label: 'cat', confidence: 0.9, box: [0.2, 0.3, 0.5, 0.5] };
/** A hand whose joints sit from (x, y), spanning `size` of the photo. */
const handAt = (x: number, y: number, n = 12, size = 0.15): PetHand => ({
  confidence: 0.8,
  points: Array.from({ length: n }, (_, i) => [x + ((i % 4) / 3) * size, y + (Math.floor(i / 4) / 3) * size, 0.8] as [number, number, number]),
});

describe('Pet your pet', () => {
  test('a hand on the cat passes', () => {
    assert.equal(judgePet(read({ animals: [cat], hands: [handAt(0.4, 0.4)] })).ok, true);
  });
  test('a hand just past the edge of the fur still counts', () => {
    assert.equal(judgePet(read({ animals: [cat], hands: [handAt(0.18, 0.4)] })).ok, true);
  });
  test('a cat with no hand in the photo is refused', () => {
    assert.deepEqual(judgePet(read({ animals: [cat], labels: [{ id: 'cat', confidence: 0.9 }] })), { ok: false, miss: 'noHand' });
  });
  test('a hand across the room from the cat is refused', () => {
    assert.deepEqual(judgePet(read({ animals: [cat], hands: [handAt(0.82, 0.02)] })), { ok: false, miss: 'notTouching' });
  });
  test('someone sitting by their dog, small hands in their lap inside its box, is not a pat (real photo, petdog-04)', () => {
    const dog: PetAnimal = { label: 'dog', confidence: 0.74, box: [0.31, 0.62, 0.18, 0.36] };
    assert.deepEqual(judgePet(read({ animals: [dog], hands: [handAt(0.33, 0.65, 12, 0.07)] })), { ok: false, miss: 'noHand' });
  });
  test('a hand with only a couple of joints seen is no hand', () => {
    assert.deepEqual(judgePet(read({ animals: [cat], hands: [handAt(0.4, 0.4, 2)] })), { ok: false, miss: 'noHand' });
  });
  test('a hand and no animal is refused', () => {
    assert.deepEqual(judgePet(read({ hands: [handAt(0.4, 0.4)], labels: [{ id: 'floor', confidence: 0.6 }] })), { ok: false, miss: 'noPet' });
  });
  test('a close-up of fur (no box, sure cat label) with a hand passes', () => {
    assert.equal(judgePet(read({ hands: [handAt(0.4, 0.4)], labels: [{ id: 'cat', confidence: 0.7 }] })).ok, true);
  });
  test('a weak cat label with no box needs the finder', () => {
    assert.deepEqual(judgePet(read({ hands: [handAt(0.4, 0.4)], labels: [{ id: 'cat', confidence: 0.35 }] })), { ok: false, miss: 'notTouching' });
  });
  test('petting the cat on the bed is refused: get up first', () => {
    const labels = [{ id: 'cat', confidence: 0.8 }, { id: 'bed', confidence: 0.5 }];
    assert.deepEqual(judgePet(read({ animals: [cat], hands: [handAt(0.4, 0.4)], labels })), { ok: false, miss: 'inBed' });
  });
  test('a teddy bear is refused, hand or not', () => {
    const labels = [{ id: 'teddy_bear', confidence: 0.8 }];
    assert.deepEqual(judgePet(read({ animals: [{ ...cat, label: 'dog', confidence: 0.6 }], hands: [handAt(0.4, 0.4)], labels })), { ok: false, miss: 'toy' });
  });
  test('a cat on a screen is refused', () => {
    const labels = [{ id: 'computer_monitor', confidence: 0.8 }, { id: 'cat', confidence: 0.5 }];
    assert.deepEqual(judgePet(read({ animals: [cat], hands: [handAt(0.4, 0.4)], labels })), { ok: false, miss: 'screen' });
  });
  test('a covered lens is too dark', () => {
    assert.deepEqual(judgePet(read({ mean: 0.01 })), { ok: false, miss: 'tooDark' });
  });
  test('judgeShot reads a pet reading from an old build (no animals or hands) as nothing seen', () => {
    const verdict = judgeShot('pet', { ...base, animals: undefined, hands: undefined } as unknown as PetReading);
    assert.equal(verdict.ok, false);
    assert.equal(!verdict.ok && verdict.miss, 'noPet');
  });
});
