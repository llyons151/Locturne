/// <reference types="node" />

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  checkNights,
  hadSuccessfulNight,
  heartbeatCoverage,
  nextNightIsOn,
  rollUpHealth,
  type NightCheck,
} from './health.ts';
import type { Heartbeat } from './heartbeat.ts';
import type { ArmedNight } from './screen-time.ts';

const H = 60;
const EVERY = [0, 1, 2, 3, 4, 5, 6];
/** Local time, so the tests pass in every zone `npm run test:tz` runs. */
const at = (day: number, hour: number, minute = 0) => new Date(2026, 9, day, hour, minute);
const armed = (bedtime = 23 * H, morningStart = 7 * H, armedAt = at(1, 12)): ArmedNight => ({
  bedtime,
  morningStart,
  windows: 11,
  armedAt: armedAt.toISOString(),
});
const start = (when: Date, shielded: boolean | null = true, activity = 'night-0'): Heartbeat => ({
  activity,
  callback: 'intervalDidStart',
  at: when.getTime(),
  shielded,
});
const check = (heartbeats: Heartbeat[], now: Date, more: Partial<Parameters<typeof checkNights>[0]> = {}) =>
  checkNights({ armed: armed(), routine: { activeNights: EVERY }, heartbeats, coverageStart: null, now, ...more });

test('a window at bedtime is on time; nights are newest first and start after arming', () => {
  // Armed Oct 1 at noon. Now Oct 4, 08:00: the nights into Oct 2, 3 and 4.
  const nights = check([start(at(1, 23)), start(at(2, 23, 1)), start(at(3, 23))], at(4, 8));
  assert.deepEqual(
    nights.map((n) => [n.morningKey, n.verdict]),
    [
      ['2026-10-04', 'onTime'],
      ['2026-10-03', 'onTime'],
      ['2026-10-02', 'onTime'],
    ],
  );
  assert.equal(nights[1].lateBy, 1);
});

test('no window at all is a missed night; only a later one is late', () => {
  const nights = check([start(at(2, 23, 45), true, 'night-1')], at(4, 8));
  assert.equal(nights[0].verdict, 'missed');
  assert.equal(nights[1].verdict, 'late');
  assert.equal(nights[1].lateBy, 45);
});

test('windows that ran with no shield up are flagged', () => {
  const nights = check([start(at(3, 23), false), start(at(3, 23, 45), false, 'night-1')], at(4, 8));
  assert.equal(nights[0].verdict, 'noShield');
});

test('an empty bedtime list is flagged even while the always list keeps a shield up', () => {
  const empty = (when: Date): Heartbeat => ({ ...start(when, true), nightPicked: false });
  assert.equal(check([empty(at(3, 23))], at(4, 8))[0].verdict, 'noShield');
  const picked = (when: Date): Heartbeat => ({ ...start(when, true), nightPicked: true });
  assert.equal(check([picked(at(3, 23))], at(4, 8))[0].verdict, 'onTime');
});

test('entries from the library log (shield unknown) still count as ran', () => {
  assert.equal(check([start(at(3, 23), null)], at(4, 8))[0].verdict, 'onTime');
});

test('tonight is only judged once bedtime plus the grace has passed', () => {
  assert.equal(check([], at(3, 23, 3))[0].morningKey, '2026-10-03');
  assert.equal(check([], at(3, 23, 6))[0].morningKey, '2026-10-04');
  assert.equal(check([], at(3, 23, 6))[0].verdict, 'missed');
});

test('nights switched off are not checked', () => {
  // Oct 3, 2026 is a Saturday (6). Its evening leads into Oct 4.
  const nights = check([], at(4, 8), { routine: { activeNights: [0, 1, 2, 3, 4, 5] } });
  assert.ok(!nights.some((n) => n.morningKey === '2026-10-04'));
});

test('a bedtime after midnight belongs to the evening before', () => {
  // 01:00 to 07:00. The night into Sunday Oct 4 starts 01:00 Oct 4 and is Saturday's.
  const late = armed(1 * H, 7 * H);
  const nights = checkNights({
    armed: late,
    routine: { activeNights: [6] },
    heartbeats: [start(at(4, 1))],
    coverageStart: null,
    now: at(4, 9),
  });
  assert.deepEqual(
    nights.map((n) => [n.morningKey, n.verdict]),
    [['2026-10-04', 'onTime']],
  );
});

test('nights before the log is complete are unknown, never missed or on time', () => {
  const nights = check([start(at(3, 23))], at(4, 8), { coverageStart: at(3, 12).getTime() });
  assert.deepEqual(
    nights.map((n) => n.verdict),
    ['onTime', 'unknown', 'unknown'],
  );
});

test('heartbeatCoverage', () => {
  const now = at(4, 8);
  const full = Array.from({ length: 3 }, (_, i) => start(at(3, 20 + i)));
  assert.equal(heartbeatCoverage(full, [], 3, now), at(3, 20).getTime());
  assert.equal(heartbeatCoverage([], [start(at(3, 23))], 3, now), now.getTime());
  assert.equal(heartbeatCoverage([], [], 3, now), null);
  assert.equal(heartbeatCoverage(full.slice(1), [], 3, now), null);
});

test('nothing armed, or equal times, means no nights to check', () => {
  assert.deepEqual(check([], at(4, 8), { armed: null }), []);
  assert.deepEqual(check([], at(4, 8), { armed: armed(7 * H, 7 * H) }), []);
});

test('nextNightIsOn looks at the night in progress, else the next one', () => {
  const times = { bedtime: 23 * H, morningStart: 7 * H };
  // Saturday Oct 3. At 02:00 the night belongs to Friday's evening (5).
  assert.equal(nextNightIsOn(at(3, 2), times, [5]), true);
  assert.equal(nextNightIsOn(at(3, 2), times, [6]), false);
  // At noon Saturday, the next night is Saturday's.
  assert.equal(nextNightIsOn(at(3, 12), times, [6]), true);
});

const night = (verdict: NightCheck['verdict']): NightCheck => ({
  morningKey: '2026-10-04',
  start: at(3, 23),
  end: at(4, 7),
  verdict,
  firstStart: null,
  lateBy: verdict === 'late' ? 30 : null,
});
const roll = (more: Partial<Parameters<typeof rollUpHealth>[0]> = {}) =>
  rollUpHealth({
    protection: 'on',
    access: 'approved',
    armed: armed(),
    routine: { activeNights: EVERY },
    nights: [night('onTime')],
    now: at(4, 12),
    ...more,
  });

test('rollUpHealth never says ok unless protection is on and tonight is armed', () => {
  assert.equal(roll().level, 'ok');
  assert.equal(roll({ protection: 'off', access: 'denied' }).level, 'off');
  assert.match(roll({ protection: 'off', access: 'denied' }).detail, /Settings.*just a raccoon/);
  assert.equal(roll({ protection: 'off' }).level, 'off');
  assert.equal(roll({ protection: 'notSetUp', access: 'notDetermined' }).level, 'setup');
  assert.equal(roll({ protection: 'unavailable' }).level, 'off');
  assert.equal(roll({ armed: null }).level, 'attention');
  assert.equal(roll({ routine: { activeNights: [] } }).level, 'idle');
});

test('rollUpHealth explains a purchase waiting for approval, and never says ok for it', () => {
  const waiting = roll({ armed: null, purchasePending: true });
  assert.equal(waiting.title, 'Waiting for approval.');
  assert.notEqual(waiting.level, 'ok');
  assert.equal(roll({ armed: null }).title, 'Bedtime isn’t scheduled.');
  // Once armed, the note is gone even if the flag lingers.
  assert.notEqual(roll({ purchasePending: true }).title, 'Waiting for approval.');
});

test('rollUpHealth says when nothing sleeps for want of a subscription, and offers the plans', () => {
  const lapsed = roll({ armed: null, unsubscribed: true });
  assert.equal(lapsed.title, 'No subscription, so nothing sleeps.');
  assert.equal(lapsed.needsSubscription, true);
  assert.notEqual(lapsed.level, 'ok');
  // Tonight still armed (it ends after the coming morning): the normal status until then.
  assert.equal(roll({ unsubscribed: true }).needsSubscription, undefined);
});

test('rollUpHealth flags the newest judged night, skipping unknown ones', () => {
  assert.equal(roll({ nights: [night('missed')] }).level, 'attention');
  assert.equal(roll({ nights: [night('noShield')] }).level, 'attention');
  assert.equal(roll({ nights: [night('unknown'), night('missed')] }).level, 'attention');
  assert.equal(roll({ nights: [night('onTime'), night('missed')] }).level, 'ok');
  assert.match(roll({ nights: [night('late')] }).detail, /30 minutes late/);
  assert.match(roll({ routine: { activeNights: [0, 1, 2, 3, 4, 5] }, now: at(3, 12) }).detail, /Tonight is off/);
});

test('hadSuccessfulNight', () => {
  assert.equal(hadSuccessfulNight([night('missed'), night('unknown')]), false);
  assert.equal(hadSuccessfulNight([night('late')]), true);
});
