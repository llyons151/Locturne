/// <reference types="node" />

/**
 * A bedtime the spring clock change skips (02:30 on 2026-03-08 in New York, when 02:00 jumps to
 * 03:00), against the simulated phone (sim-device.ts). iOS fires a window scheduled inside the
 * gap at its end, 03:00; JavaScript dates put 02:30 at 03:30. The lock, Home's line and the
 * bedtime warning now place the bedtime where the window fires (`wallClock`, lock-state.ts), so
 * nothing sleeps while the app says day and the warning comes before the apps sleep.
 * Needs `--experimental-test-module-mocks` (set in the npm test script).
 */
import assert from 'node:assert/strict';
import { afterEach, beforeEach, mock, test } from 'node:test';
const { simDevice, token } = await import('./sim-device.ts');
const device = simDevice();
mock.module('react-native-device-activity', { namedExports: device.exports });
mock.module('react-native', { namedExports: { Platform: { OS: 'web' } } });
mock.module('expo-notifications', {
  namedExports: {
    setNotificationHandler: () => undefined,
    IosAuthorizationStatus: {},
    SchedulableTriggerInputTypes: { DATE: 'date', CALENDAR: 'calendar' },
  },
});
const lc = await import('./lock-controller.ts');
const ls = await import('./lock-state.ts');
const rt = await import('./routine.ts');
const st = await import('./screen-time.ts');
const nt = await import('./notifications.ts');
const { armTonight } = await import('./arm.ts');

const zone = process.env.TZ;
beforeEach(() => {
  process.env.TZ = 'America/New_York';
});
afterEach(() => {
  mock.timers.reset();
  device.reset();
  if (zone === undefined) delete process.env.TZ;
  else process.env.TZ = zone;
});

/** March 2026 at hh:mm, New York time (the zone is set before each test). */
const at = (day: number, hh: number, mm = 0) => new Date(2026, 2, day, hh, mm).getTime();
const hm = (date: Date) => date.toTimeString().slice(0, 5);

function advance(to: number) {
  for (const e of device.dueEvents(Date.now(), to)) {
    mock.timers.setTime(e.at);
    device.fire(e.activity, e.callback);
  }
  mock.timers.setTime(to);
}

test('wallClock: a skipped time is the end of the gap; others are as JavaScript has them', () => {
  assert.equal(ls.wallClock(new Date(at(8, 12)), 2 * 60 + 30).getTime(), at(8, 3));
  assert.equal(ls.wallClock(new Date(at(8, 12)), 2 * 60).getTime(), at(8, 3));
  assert.equal(ls.wallClock(new Date(at(8, 12)), 3 * 60).getTime(), at(8, 3));
  assert.equal(ls.wallClock(new Date(at(8, 12)), 60 + 59).getTime(), at(8, 1, 59));
  assert.equal(ls.wallClock(new Date(at(7, 12)), 2 * 60 + 30, 1).getTime(), at(8, 3));
  assert.equal(ls.wallClock(new Date(at(9, 12)), 2 * 60 + 30).getTime(), at(9, 2, 30));
});

test('a 02:30 bedtime on spring-forward night: the apps sleep at 03:00, and the app says so', async () => {
  mock.timers.enable({ apis: ['Date'], now: at(7, 12) });
  device.exports.setFamilyActivitySelectionId({ id: 'night', familyActivitySelection: token(['tiktok']) });
  lc.settleSubscription(true);
  const routine = { ...rt.DEFAULT_ROUTINE, bedtime: 2 * 60 + 30, morningStart: 7 * 60 };
  rt.saveRoutine(routine);
  assert.equal((await armTonight()).status, 'armed');
  // Saturday noon: tonight's bedtime falls in the gap. Home and the warning name 03:00.
  advance(at(7, 12));
  const day = lc.readLock();
  assert.equal(day.nextChange.getTime(), at(8, 3));
  assert.equal(hm(rt.nightAt(day.nextChange).start), '03:00');
  const armed = st.getArmedNight();
  const plan = nt.planNotifications({
    routine,
    protection: 'on',
    armed: true,
    armedTimes: armed,
    armedSince: armed ? st.armedSince(armed) : null,
    now: new Date(),
    days: 1,
  });
  const warning = plan.find((n) => n.kind === 'bedtime');
  assert.equal(warning?.at.getTime(), at(8, 3) - 15 * 60_000, 'fifteen minutes before 03:00: 01:45');

  // With Locturne closed, the window scheduled for 02:30 fires at 03:00. A minute before the
  // gap it's still the day.
  advance(at(8, 1, 59));
  assert.deepEqual([...device.state.shielded], []);
  assert.equal(lc.readLock().phase, 'day');
  advance(at(8, 3, 0));
  assert.deepEqual([...device.state.shielded], ['tiktok']);
  assert.equal(lc.readLock().phase, 'night');
  advance(at(8, 7, 30));
  assert.equal(lc.readLock().phase, 'morning');
});

test('the same evening a day later is an ordinary 02:30', async () => {
  mock.timers.enable({ apis: ['Date'], now: at(8, 12) });
  device.exports.setFamilyActivitySelectionId({ id: 'night', familyActivitySelection: token(['tiktok']) });
  lc.settleSubscription(true);
  rt.saveRoutine({ ...rt.DEFAULT_ROUTINE, bedtime: 2 * 60 + 30, morningStart: 7 * 60 });
  assert.equal((await armTonight()).status, 'armed');
  assert.equal(lc.readLock().nextChange.getTime(), at(9, 2, 30));
  advance(at(9, 2, 25));
  assert.deepEqual([...device.state.shielded], []);
  advance(at(9, 2, 35));
  assert.deepEqual([...device.state.shielded], ['tiktok']);
});
