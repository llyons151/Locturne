/// <reference types="node" />

/**
 * Scan your code, with Screen Time unavailable (records in memory) and the default routine
 * (bedtime 23:00, morning 07:00). Needs `--experimental-test-module-mocks`.
 */
import assert from 'node:assert/strict';
import { beforeEach, mock, test } from 'node:test';

import { fakeDeviceActivity } from './fake-device-activity.ts';

const fake = fakeDeviceActivity({ available: false });
mock.module('react-native-device-activity', { namedExports: fake.exports });

const scan = await import('./scan.ts');
const { getProof, recordProof } = await import('./morning-proof.ts');
const { sharedRemove } = await import('./screen-time.ts');

const at = (month: number, day: number, hour: number, minute = 0) => new Date(2026, month - 1, day, hour, minute);

beforeEach(() => {
  sharedRemove('locturne.scanCode');
  sharedRemove('locturne.morningProofs');
});

test('generated codes carry the prefix and differ', () => {
  const a = scan.generateQrData();
  const b = scan.generateQrData();
  assert.match(a, /^LOCTURNE-[A-Z2-9]{12}$/);
  assert.notEqual(a, b);
  // Deterministic with a fixed source, for the record.
  assert.equal(scan.generateQrData(() => 0), 'LOCTURNE-AAAAAAAAAAAA');
});

test('barcodes match across the UPC-A / EAN-13 shapes iOS reports', () => {
  const code = { kind: 'barcode' as const, data: '012345678905', type: 'upc_a', registeredAt: 0 };
  assert.ok(scan.matches(code, '0012345678905'));
  assert.ok(scan.matches(code, ' 012345678905 '));
  assert.ok(!scan.matches(code, '012345678906'));
  assert.ok(!scan.matches(null, '012345678905'));
});

test('QR codes match exactly', () => {
  const code = { kind: 'qr' as const, data: 'LOCTURNE-ABCDEFGHJKMN', type: 'qr', registeredAt: 0 };
  assert.ok(scan.matches(code, 'LOCTURNE-ABCDEFGHJKMN'));
  assert.ok(!scan.matches(code, 'locturne-abcdefghjkmn'));
  assert.ok(!scan.matches(code, 'LOCTURNE-ABCDEFGHJKMP'));
});

test('URLs and scraps are not registrable', () => {
  assert.ok(!scan.registrable('https://menu.example.com'));
  assert.ok(!scan.registrable('ab'));
  assert.ok(scan.registrable('5000112637922'));
});

const CODE = { kind: 'qr' as const, data: 'LOCTURNE-ABCDEFGHJKMN', type: 'qr' };

/** Registers the code on the afternoon of October 5, once that morning was proven. */
function registerYesterday() {
  recordProof({ morningKey: '2026-10-05', kind: 'steps', at: at(10, 5, 7, 30).getTime() });
  assert.equal(scan.registerScanCode(CODE, at(10, 5, 14)), null);
}

test('the code can only change while the apps are awake', () => {
  assert.equal(scan.registerScanCode(CODE, at(10, 6, 3)), 'asleep', 'night');
  assert.equal(scan.registerScanCode(CODE, at(10, 6, 8)), 'asleep', 'morning, not yet up');
  assert.equal(scan.getScanCode(), null);
  registerYesterday();
  assert.equal(scan.getScanCode()?.data, CODE.data);
  assert.equal(scan.registerScanCode({ ...CODE, data: 'https://x.example' }, at(10, 5, 15)), 'unusable');
});

test('morning: only the registered code unlocks, and only after morning start', () => {
  assert.equal(scan.submitScan(CODE.data, at(10, 6, 8)), 'noCode');
  registerYesterday();
  assert.equal(scan.submitScan(CODE.data, at(10, 6, 3)), 'notMorning', 'bedtime wins');
  assert.equal(scan.submitScan('LOCTURNE-SOMEONEELSES', at(10, 6, 8)), 'wrongCode');
  assert.equal(getProof('2026-10-06'), null);
  assert.equal(scan.submitScan(CODE.data, at(10, 6, 8)), 'unlocked');
  assert.equal(getProof('2026-10-06')?.kind, 'scan');
});
