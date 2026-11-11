/// <reference types="node" />

/**
 * Developer → Make up mornings (`devSeedMornings`) against a fake Screen Time, with the default
 * routine (bedtime 23:00, morning 07:00). Needs `--experimental-test-module-mocks`.
 */
import assert from 'node:assert/strict';
import { beforeEach, mock, test } from 'node:test';

import { fakeDeviceActivity } from './fake-device-activity.ts';

const fake = fakeDeviceActivity();
mock.module('react-native-device-activity', { namedExports: fake.exports });

const { devSeedMornings, getFirstMorning, getMorningsWon, getProofs, recordProof } = await import('./morning-proof.ts');
const { currentProof } = await import('./lock-controller.ts');

const at = (month: number, day: number, hour: number, minute = 0) => new Date(2026, month - 1, day, hour, minute);

beforeEach(() => fake.reset());

test('31 made-up mornings: a row ending yesterday, counted past the 30 proofs kept, today left to be won', () => {
  const now = at(11, 11, 6, 30);
  const keys = devSeedMornings(31, now);
  assert.equal(keys.length, 31);
  assert.equal(keys[0], '2026-10-11');
  assert.equal(keys[30], '2026-11-10');
  assert.equal(getMorningsWon(), 31);
  assert.equal(getFirstMorning(), '2026-10-11');
  const proofs = getProofs();
  assert.equal(proofs.length, 30);
  for (const p of proofs) {
    const hour = new Date(p.at).getHours();
    assert.equal(hour, 7, `${p.morningKey} was got up at ${hour}`);
    assert.equal(new Date(p.at).getDate(), Number(p.morningKey.slice(8)));
  }
  // Today's morning isn't unlocked by any of them, and a real walk still counts as morning 32.
  assert.equal(currentProof(at(11, 11, 7, 5)), null);
  assert.equal(recordProof({ morningKey: '2026-11-11', kind: 'steps', at: at(11, 11, 7, 5).getTime() }), true);
  assert.equal(getMorningsWon(), 32);
});

test("today's real wake-up is kept and counted among the 31", () => {
  assert.equal(recordProof({ morningKey: '2026-11-11', kind: 'steps', at: at(11, 11, 7, 5).getTime() }), true);
  const keys = devSeedMornings(31, at(11, 11, 12));
  assert.equal(keys.length, 31);
  assert.equal(keys[0], '2026-10-12');
  assert.equal(keys[30], '2026-11-11');
  assert.equal(getMorningsWon(), 31);
  assert.equal(getProofs()[0].morningKey, '2026-11-11');
});
