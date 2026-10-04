/// <reference types="node" />

/**
 * Reading the monitor extension's heartbeat log out of the App Group, merging in the
 * library's own event log, and the self-check on the result. `checkNights` itself is tested in
 * health.test.ts. Needs `--experimental-test-module-mocks` (set in the npm test script).
 */
import assert from 'node:assert/strict';
import { beforeEach, mock, test } from 'node:test';

import { fakeDeviceActivity } from './fake-device-activity.ts';

/** The library's event log: the last call of each callback, per activity. */
let events: { activityName: string; callbackName: string; lastCalledAt: Date }[] = [];
const fake = fakeDeviceActivity();
mock.module('react-native-device-activity', { namedExports: { ...fake.exports, getEvents: () => events } });

const { getAllHeartbeats, getHeartbeats, HEARTBEAT_KEEP, readNightChecks } = await import('./heartbeat.ts');
const { saveRoutine, DEFAULT_ROUTINE } = await import('./routine.ts');

type Entry = { activity: string; callback: string; at: number; shielded?: unknown; nightPicked?: unknown };
const MINUTE = 60_000;
/** Local time, so `npm run test:tz` passes in every zone. Oct 3, 2026 is a Saturday. */
const at = (day: number, hour: number, minute = 0) => new Date(2026, 9, day, hour, minute);
const start = (window: string, when: Date, more: Partial<Entry> = {}): Entry => ({
  activity: window,
  callback: 'intervalDidStart',
  at: +when,
  shielded: true,
  nightPicked: true,
  ...more,
});
const writeLog = (log: unknown) => {
  fake.state.store['locturne.heartbeat'] = log;
};
const libraryStart = (window: string, when: Date) => ({
  activityName: window,
  callbackName: 'intervalDidStart',
  lastCalledAt: when,
});

beforeEach(() => {
  fake.reset();
  fake.state.available = true;
  events = [];
});

test('the log is read newest first, and malformed entries are skipped', () => {
  writeLog([
    start('night-0', at(2, 23)),
    { activity: 'night-1', callback: 'intervalDidStart' },
    null,
    'night-2',
    { activity: 3, callback: 'intervalDidStart', at: +at(3, 0) },
    start('night-1', at(3, 0)),
  ]);
  assert.deepEqual(
    getHeartbeats().map((h) => h.activity),
    ['night-1', 'night-0'],
  );
});

test('anything but a list reads as an empty log', () => {
  for (const log of [undefined, {}, 'oops', 3]) {
    writeLog(log);
    assert.deepEqual(getHeartbeats(), []);
  }
});

test('a Swift Bool that crossed as 0 or 1 reads as a boolean; anything else as unknown', () => {
  writeLog([
    start('night-0', at(2, 23), { shielded: 1, nightPicked: 0 }),
    start('night-1', at(2, 23, 30), { shielded: 'yes', nightPicked: undefined }),
  ]);
  const [later, earlier] = getHeartbeats();
  assert.equal(earlier.shielded, true);
  assert.equal(earlier.nightPicked, false);
  assert.equal(later.shielded, null);
  assert.equal(later.nightPicked, null);
});

test('a window start in both logs within a minute is listed once', () => {
  writeLog([start('night-0', at(2, 23))]);
  events = [libraryStart('night-0', new Date(+at(2, 23) + 59_000))];
  const all = getAllHeartbeats();
  assert.equal(all.length, 1);
  assert.equal(all[0].shielded, true, 'the heartbeat entry wins: it knows the shield');
});

test('library starts a minute or more apart, or for another window, are kept', () => {
  writeLog([start('night-0', at(2, 23))]);
  events = [
    libraryStart('night-0', new Date(+at(2, 23) + MINUTE)),
    libraryStart('night-0', new Date(+at(2, 23) - MINUTE)),
    libraryStart('night-1', at(2, 23)),
  ];
  const all = getAllHeartbeats();
  assert.equal(all.length, 4);
  assert.deepEqual(
    all.map((h) => [h.activity, h.shielded]),
    [
      ['night-0', null],
      ['night-0', true],
      ['night-1', null],
      ['night-0', null],
    ],
  );
  assert.ok(all.every((h, i) => i === 0 || all[i - 1].at >= h.at), 'newest first');
});

test('a library end is never mistaken for a start; other activities are left out', () => {
  events = [
    { activityName: 'night-0', callbackName: 'intervalDidEnd', lastCalledAt: at(3, 7) },
    libraryStart('limit-0', at(3, 9)),
  ];
  assert.deepEqual(getAllHeartbeats([]), []);
});

test('off iPhone the library log isn’t read', () => {
  fake.state.available = false;
  events = [libraryStart('night-0', at(2, 23))];
  assert.deepEqual(getAllHeartbeats([]), []);
});

/* The self-check on the stored logs */

const arm = (since: Date) => {
  fake.arm(since);
  saveRoutine(DEFAULT_ROUTINE, since);
};

test('a night in the log is on time; a night missing from a complete log was missed', () => {
  arm(at(1, 12));
  writeLog([start('night-0', at(2, 23))]);
  const checks = readNightChecks(at(3, 12));
  assert.deepEqual(
    checks.map((c) => [c.morningKey, c.verdict]),
    [
      ['2026-10-03', 'onTime'],
      ['2026-10-02', 'missed'],
    ],
  );
});

test('a full log doesn’t reach back far enough to call older nights missed', () => {
  arm(at(1, 12));
  // HEARTBEAT_KEEP entries, all from last night: the log has dropped anything older.
  writeLog(
    Array.from({ length: HEARTBEAT_KEEP }, (_, i) =>
      start(`night-${i % 16}`, new Date(+at(2, 23) + i * 20_000)),
    ),
  );
  const checks = readNightChecks(at(3, 12));
  assert.deepEqual(
    checks.map((c) => [c.morningKey, c.verdict]),
    [
      ['2026-10-03', 'onTime'],
      ['2026-10-02', 'unknown'],
    ],
  );
});

test('one entry short of full, the log still covers everything', () => {
  arm(at(1, 12));
  writeLog(
    Array.from({ length: HEARTBEAT_KEEP - 1 }, (_, i) =>
      start(`night-${i % 16}`, new Date(+at(2, 23) + i * 20_000)),
    ),
  );
  assert.equal(readNightChecks(at(3, 12))[1].verdict, 'missed');
});

test('an extension older than the heartbeat: library starts count, and absence proves nothing', () => {
  arm(at(1, 12));
  events = [libraryStart('night-0', at(2, 23, 1))];
  const checks = readNightChecks(at(3, 12));
  assert.deepEqual(
    checks.map((c) => [c.morningKey, c.verdict]),
    [
      ['2026-10-03', 'onTime'],
      ['2026-10-02', 'unknown'],
    ],
  );
});

test('nothing armed, nothing to check', () => {
  writeLog([start('night-0', at(2, 23))]);
  assert.deepEqual(readNightChecks(at(3, 12)), []);
});
