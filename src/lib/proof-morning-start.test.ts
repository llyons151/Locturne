/// <reference types="node" />

/**
 * `morning_unlocked.after_start` counts from the morning start the proof was judged under
 * (`proofMorningStart`), not a routine edited since.
 */
import assert from 'node:assert/strict';
import { mock, test } from 'node:test';

import { fakeDeviceActivity } from './fake-device-activity.ts';

const fake = fakeDeviceActivity({ available: false });
mock.module('react-native-device-activity', { namedExports: fake.exports });

const { proofMorningStart } = await import('./morning-proof.ts');

/** Local time: the tests run in several time zones (`npm run test:tz`). */
const at = (month: number, day: number, hour: number, minute = 0) => new Date(2026, month - 1, day, hour, minute);

test('the saved times give that morning’s start', () => {
  const proof = { morningKey: '2026-10-06', kind: 'downstairs' as const, at: at(10, 6, 7, 20).getTime(), bedtime: 23 * 60, morningStart: 7 * 60 };
  assert.equal(proofMorningStart(proof)?.getTime(), at(10, 6, 7).getTime());
});

test('a night shift’s afternoon morning start', () => {
  const proof = { morningKey: '2026-10-06', kind: 'steps' as const, at: at(10, 6, 16, 30).getTime(), bedtime: 8 * 60, morningStart: 16 * 60 };
  assert.equal(proofMorningStart(proof)?.getTime(), at(10, 6, 16).getTime());
});

test('a pass made the evening before still counts from its own morning', () => {
  const proof = { morningKey: '2026-10-06', kind: 'pass' as const, at: at(10, 5, 21).getTime(), bedtime: 23 * 60, morningStart: 7 * 60 };
  assert.ok(proof.at < (proofMorningStart(proof)?.getTime() ?? 0));
});

test('a proof saved without its times has none: the caller falls back to the routine', () => {
  assert.equal(proofMorningStart({ morningKey: '2026-10-06', kind: 'scan', at: at(10, 6, 7, 5).getTime() }), null);
});
