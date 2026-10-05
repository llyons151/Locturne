/// <reference types="node" />

/**
 * A waiting purchase (Ask to Buy) is reported once when it turns out paid
 * (`purchase_result`, page `later`, docs/ANALYTICS.md). Runs with Screen Time unavailable, so
 * the App Group falls back to memory.
 */
import assert from 'node:assert/strict';
import { beforeEach, mock, test } from 'node:test';

import { fakeDeviceActivity } from './fake-device-activity.ts';

const fake = fakeDeviceActivity({ available: false });
mock.module('react-native-device-activity', { namedExports: fake.exports });

const { clearPurchasePending, isPurchasePending, markPurchasePending, PENDING_FOR_MS, takePendingApproval } = await import(
  './pending-purchase.ts'
);
const { sharedRemove } = await import('./screen-time.ts');

const T = 1_800_000_000_000;

beforeEach(() => {
  clearPurchasePending();
  sharedRemove('locturne.purchasePendingReported');
});

test('nothing waiting: nothing to report', () => {
  assert.equal(takePendingApproval(T), false);
});

test('a waiting purchase is reported once, and leaves the waiting note to arming', () => {
  markPurchasePending(T);
  assert.equal(takePendingApproval(T + 1000), true);
  assert.equal(takePendingApproval(T + 2000), false);
  assert.equal(isPurchasePending(T + 2000), true);
});

test('a later waiting purchase is reported again', () => {
  markPurchasePending(T);
  assert.equal(takePendingApproval(T + 1000), true);
  markPurchasePending(T + 5000);
  assert.equal(takePendingApproval(T + 6000), true);
});

test('an expired request is never reported', () => {
  markPurchasePending(T);
  assert.equal(takePendingApproval(T + PENDING_FOR_MS), false);
});
