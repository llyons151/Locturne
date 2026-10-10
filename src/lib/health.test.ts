/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

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

test('an unshielded bedtime callback followed by a shielded window is late, not on time', () => {
  const night = check([start(at(3, 23), false), start(at(3, 23, 45), true, 'night-1')], at(4, 8))[0];
  assert.equal(night.verdict, 'late');
  assert.equal(night.firstStart?.getTime(), at(3, 23, 45).getTime());
  assert.equal(night.lateBy, 45);
});

test('a picked bedtime list with no shield up is not a successful night', () => {
  const night = check([{ ...start(at(3, 23), false), nightPicked: true }], at(4, 8))[0];
  assert.equal(night.verdict, 'noShield');
  assert.equal(hadSuccessfulNight([night]), false);
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

test('a night turned on since is judged by the nights in force when it ran', () => {
  // Fri Oct 9 and Sat Oct 10 nights off. On Saturday, Friday is turned on, from Sat 23:00.
  // The extension still logs an unshielded start on the off nights it skips.
  const change = { since: at(10, 23).getTime(), prior: { activeNights: [0, 1, 2, 3, 4] } };
  const heartbeats = [start(at(8, 23)), start(at(9, 23), false), start(at(10, 23), false)];
  const more = { routine: { activeNights: [0, 1, 2, 3, 4, 5] }, nights: 3 };
  const before = check(heartbeats, at(11, 10), more);
  assert.equal(before[0].morningKey, '2026-10-10');
  assert.equal(before[0].verdict, 'noShield');
  const nights = check(heartbeats, at(11, 10), { ...more, change });
  assert.deepEqual(nights.map((n) => [n.morningKey, n.verdict]), [['2026-10-09', 'onTime']]);
  // A night that ends after the change is the routine in force's: Friday Oct 16 is checked.
  const later = check([...heartbeats, start(at(16, 23), false)], at(17, 10), { ...more, change, nights: 1 });
  assert.deepEqual(later.map((n) => [n.morningKey, n.verdict]), [['2026-10-17', 'noShield']]);
  // No routine before it: nights that ended before it came into force aren't checked.
  assert.deepEqual(check(heartbeats, at(11, 10), { ...more, change: { ...change, prior: null } }), []);
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

test('a night the full log cut off partway through is unknown, never late or noShield', () => {
  // The log kept only what came after 02:38 on Oct 3: that night's 23:00 to 02:38 starts are gone.
  const coverageStart = at(3, 2, 38).getTime();
  const kept = [start(at(3, 2, 38), true, 'night-5'), start(at(3, 23)), start(at(3, 23, 45), true, 'night-1')];
  const nights = check(kept, at(4, 8), { coverageStart });
  assert.deepEqual(
    nights.map((n) => [n.morningKey, n.verdict]),
    [
      ['2026-10-04', 'onTime'],
      ['2026-10-03', 'unknown'],
      ['2026-10-02', 'unknown'],
    ],
  );
  // Only unshielded windows survived: the dropped ones may have held, so not noShield either.
  assert.equal(check([start(at(3, 2, 38), false, 'night-5')], at(4, 8), { coverageStart })[1].verdict, 'unknown');
  // A cut that kept the on-time bedtime start still proves the night.
  assert.equal(check([start(at(2, 23)), ...kept], at(4, 8), { coverageStart: at(2, 23).getTime() })[1].verdict, 'onTime');
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
  // Still armed: the night or morning under way when the end was found finishes first.
  assert.equal(roll({ unsubscribed: true }).needsSubscription, true);
  // Every night off too: the subscription comes first, since unpaid nothing sleeps either way.
  assert.equal(roll({ armed: null, unsubscribed: true, routine: { activeNights: [] } }).needsSubscription, true);
  assert.equal(roll({ armed: null, routine: { activeNights: [] } }).title, 'Every night is off.');
});

test('an ended subscription found in a held night or an unproven morning: that one counts, then nothing sleeps', () => {
  // Found at 15:00 in a morning nobody proved: it lasts until they're up or bedtime.
  const morning = roll({ unsubscribed: true, now: at(2, 15) });
  assert.equal(morning.level, 'attention');
  assert.equal(morning.needsSubscription, true, 'Home offers the plans');
  assert.equal(morning.title, 'Your subscription ended.');
  assert.match(morning.detail, /This morning still counts until you’re up\. From tonight, nothing sleeps\./);
  assert.doesNotMatch(morning.detail, /sleep at 23:00/);
  // Found at 23:30 or 02:00 in the night under way: that night and its morning still hold.
  for (const now of [at(2, 23, 30), at(3, 2)]) {
    const held = roll({ unsubscribed: true, now });
    assert.equal(held.needsSubscription, true);
    assert.match(held.detail, /^Tonight still counts, and so does its morning\. After that, nothing sleeps\./);
  }
  // Ahead of a missed-night note too: the subscription is the fix that matters.
  assert.equal(roll({ unsubscribed: true, nights: [night('missed')] }).needsSubscription, true);
  // Every night off but still armed: same, the subscription first.
  assert.equal(roll({ unsubscribed: true, routine: { activeNights: [] } }).needsSubscription, true);
});

test('an ended subscription with a re-subscribe waiting on Ask to Buy: no second ask, and the same promise', () => {
  for (const now of [at(2, 23, 30), at(3, 2)]) {
    const held = roll({ unsubscribed: true, purchasePending: true, now });
    assert.equal(held.title, 'Waiting for approval.');
    assert.notEqual(held.needsSubscription, true, 'no See plans while a purchase waits');
    assert.match(held.detail, /^Tonight still counts, and so does its morning\. After that, nothing sleeps until the purchase is approved\./);
  }
  const morning = roll({ unsubscribed: true, purchasePending: true, now: at(2, 15) });
  assert.equal(morning.title, 'Waiting for approval.');
  assert.notEqual(morning.needsSubscription, true);
  assert.notEqual(morning.level, 'ok');
  assert.match(morning.detail, /^This morning still counts until you’re up\. From tonight, nothing sleeps until the purchase is approved\./);
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

test('a night still under way that iOS started late is called tonight, not last night', () => {
  // The night of Oct 3 → 4 ends at 07:00 on the 4th; at 23:10 on the 3rd it's tonight.
  assert.equal(roll({ nights: [night('missed')], now: at(3, 23, 10) }).title, 'iOS was late putting me to bed tonight.');
  assert.equal(roll({ nights: [night('missed')] }).title, 'iOS never put me to bed last night.');
  assert.match(roll({ nights: [night('late')], now: at(3, 23, 10) }).detail, /Tonight started 30 minutes late/);
});

test('nights before a time-zone change are not judged: they were logged on another clock', () => {
  const nights = check([], at(4, 8));
  assert.ok(nights.some((n) => n.verdict === 'missed'));
  const after = check([], at(4, 8), { zoneChangedAt: +at(4, 6) });
  assert.ok(after.length > 0 && after.every((n) => n.verdict === 'unknown'));
});

describe('a bad night followed by nights that are off', () => {
  // Monday to Thursday nights on (by the evening's weekday), 23:00 to 07:00. Oct 5 is a Monday.
  const MON_THU = [1, 2, 3, 4];
  const ranOnTime = [start(at(5, 23)), start(at(6, 23)), start(at(7, 23))];
  const rollAt = (now: Date, heartbeats: Heartbeat[]) => {
    const nights = check(heartbeats, now, { routine: { activeNights: MON_THU } });
    return rollUpHealth({ protection: 'on', access: 'approved', armed: armed(), routine: { activeNights: MON_THU }, nights, now });
  };

  test('the morning after a missed Thursday night: last night, and the next night (not tonight) should hold', () => {
    const health = rollAt(at(9, 12), ranOnTime);
    assert.equal(health.lastNight?.morningKey, '2026-10-09');
    assert.equal(health.level, 'attention');
    assert.equal(health.title, 'iOS never put me to bed last night.');
    assert.doesNotMatch(health.detail, /tonight is scheduled/);
    assert.match(health.detail, /your next night is scheduled/);
  });

  test('on Saturday and Sunday, Thursday’s missed night no longer leads as "last night"', () => {
    for (const day of [10, 11]) {
      const health = rollAt(at(day, 12), ranOnTime);
      assert.equal(health.lastNight?.morningKey, '2026-10-09', 'still the newest judged night');
      assert.equal(health.level, 'ok');
      assert.doesNotMatch(health.title, /last night/);
      assert.match(health.detail, /^Tonight is off\./);
    }
  });

  test('a noShield Thursday doesn’t say "nothing slept" all weekend', () => {
    const noShield = [...ranOnTime, start(at(8, 23), true, 'night-0'), start(at(8, 23, 45), true, 'night-1')].map((h) =>
      h.at >= +at(8, 22) ? { ...h, nightPicked: false } : h,
    );
    assert.equal(rollAt(at(9, 12), noShield).title, 'Bedtime ran, but nothing slept.');
    for (const day of [10, 11]) assert.equal(rollAt(at(day, 12), noShield).level, 'ok');
  });

  test('a missed night with tonight on still says tonight is scheduled', () => {
    // Wednesday night missed, checked Thursday noon: Thursday night is on.
    const health = rollAt(at(8, 12), [start(at(5, 23)), start(at(6, 23))]);
    assert.equal(health.title, 'iOS never put me to bed last night.');
    assert.match(health.detail, /tonight is scheduled/);
  });
});
