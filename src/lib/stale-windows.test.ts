/// <reference types="node" />

/**
 * Windows still armed for an older routine, against the simulated phone (sim-device.ts). An
 * edit saved after the walk can wait out a phantom night before its windows go in
 * (`planArming`'s defer), and with Locturne closed nothing re-arms: iOS runs the old windows
 * after the edit applies. The lock, Home's line and the bedtime warning follow those windows
 * (`asArmed`, routine.ts) until the app re-arms, and re-arming waits while they hold a night
 * the edit's own bedtime hasn't reached. A switch from a night shift names a morning no night
 * ran into, which is free (`nightRanUnder`).
 * Needs `--experimental-test-module-mocks` (set in the npm test script).
 */
import assert from 'node:assert/strict';
import { afterEach, mock, test } from 'node:test';
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
const rt = await import('./routine.ts');
const st = await import('./screen-time.ts');
const nt = await import('./notifications.ts');
const { armTonight } = await import('./arm.ts');

/** Thursday 2026-10-01 at hh:mm, local time (Oct 3 is a Saturday). */
const at = (hh: number, mm = 0, day = 1) => new Date(2026, 9, day, hh, mm).getTime();
const hm = (date: Date) => date.toTimeString().slice(0, 5);

afterEach(() => {
  mock.timers.reset();
  device.reset();
});

function advance(to: number) {
  // Native handoff can replace schedules during a callback. Recompute after each instant.
  while (Date.now() < to) {
    const due = device.dueEvents(Date.now(), to);
    if (!due.length) break;
    const batch = due.filter((e) => e.at === due[0].at);
    for (const e of batch) {
      mock.timers.setTime(e.at);
      device.fire(e.activity, e.callback);
    }
  }
  mock.timers.setTime(to);
}

/** Lets the arming a sync started in the background finish. */
async function flush() {
  for (let i = 0; i < 6; i++) await new Promise((resolve) => setImmediate(resolve));
}

async function setUp(routine: import('./routine.ts').Routine, now: number) {
  mock.timers.enable({ apis: ['Date'], now });
  device.exports.setFamilyActivitySelectionId({ id: 'night', familyActivitySelection: token(['tiktok']) });
  lc.settleSubscription(true);
  rt.saveRoutine(routine);
  assert.equal((await armTonight()).status, 'armed');
}

/** The Routine tab's save: the edit, a sync, then arming. */
async function save(routine: import('./routine.ts').Routine) {
  const now = new Date();
  rt.saveRoutine(routine, now, lc.inPendingFirstNight(now));
  lc.syncLock();
  const result = await lc.armRoutine();
  await flush();
  return result;
}

function warnings() {
  const armed = st.getArmedNight();
  return nt
    .planNotifications({
      routine: rt.getRoutine(),
      pending: rt.getPendingRoutine(),
      protection: 'on',
      armed: true,
      armedTimes: armed,
      armedSince: armed ? st.armedSince(armed) : null,
      proofs: [],
      now: new Date(),
      days: 1,
    })
    .filter((n) => n.kind === 'bedtime')
    .map((n) => hm(n.at));
}

test('a later bedtime saved after the walk, app closed: the old windows sleep the apps at 23:00, and the app says so', async () => {
  await setUp(rt.DEFAULT_ROUTINE, at(12, 0, 0)); // 23:00 to 07:00
  advance(at(7, 5));
  assert.ok(lc.proveMorning('steps'));
  // 07:10: bedtime 00:00 and mornings from 09:00. A 07:15 window would shield a phantom night,
  // so arming waits for 09:00; the edit applies at 23:00.
  advance(at(7, 10));
  await save({ ...rt.DEFAULT_ROUTINE, bedtime: 0 });
  assert.equal(await save({ ...rt.DEFAULT_ROUTINE, bedtime: 0, morningStart: 9 * 60 }), 'deferred');
  const day = lc.readLock();
  assert.equal(day.phase, 'day');
  assert.equal(hm(rt.nightAt(day.nextChange).start), '23:00', 'Home: awake until 11 pm, when the armed windows start');
  assert.deepEqual(warnings(), ['22:45']);

  // Nobody opens Locturne. The old windows run at 23:00.
  advance(at(23, 5));
  assert.deepEqual([...device.state.shielded], ['tiktok']);
  assert.equal(lc.readLock().phase, 'night');

  // An open from bed at 23:30 keeps them asleep, and re-arming waits for the edit's own 00:00.
  advance(at(23, 30));
  assert.equal(lc.syncLock().phase, 'night');
  assert.equal(await lc.armRoutine(), 'deferred');
  assert.deepEqual([...device.state.shielded], ['tiktok']);
  assert.equal(lc.armRetryAt()?.getTime(), at(0, 0, 2));
  // The open app re-arms at 00:00 (`useLock`); the night goes on under the edit's windows.
  advance(at(0, 0, 2));
  lc.syncLock();
  await flush();
  assert.deepEqual(st.getArmedNight() && [st.getArmedNight()!.bedtime, st.getArmedNight()!.morningStart], [0, 9 * 60]);
  assert.equal(lc.readLock().phase, 'night');
  assert.deepEqual([...device.state.shielded], ['tiktok']);
  // Its morning is 09:00, the edit's.
  advance(at(8, 30, 2));
  assert.equal(lc.readLock().phase, 'night');
  advance(at(9, 5, 2));
  assert.equal(lc.readLock().phase, 'morning');
});

test('an emergency in that night pauses it until the next night iOS runs', async () => {
  await setUp(rt.DEFAULT_ROUTINE, at(12, 0, 0));
  advance(at(7, 5));
  assert.ok(lc.proveMorning('steps'));
  advance(at(7, 10));
  assert.equal(await save({ ...rt.DEFAULT_ROUTINE, bedtime: 0, morningStart: 9 * 60 }), 'deferred');
  advance(at(23, 30));
  const { emergencyUnlock } = await import('./emergency.ts');
  const use = emergencyUnlock();
  await flush();
  assert.ok(use?.pauseNight);
  assert.deepEqual([...device.state.shielded], []);
  assert.ok(use.resumesAt !== null && use.resumesAt > at(9, 0, 2), 'not back at 00:00: tonight is paused');
});

/** Weeknights (Monday to Friday evenings), 22:30 to 05:00, then bedtime 21:00 saved from bed on Friday night. */
async function earlierFromBedOnFriday() {
  const weeknights = { ...rt.DEFAULT_ROUTINE, bedtime: 22 * 60 + 30, morningStart: 5 * 60, activeNights: [1, 2, 3, 4, 5] };
  await setUp(weeknights, at(12, 0, 2));
  // Saturday 01:00: it applies at Saturday 22:30, an evening that's off, so arming waits for then.
  advance(at(1, 0, 3));
  assert.equal(await save({ ...weeknights, bedtime: 21 * 60 }), 'deferred');
  advance(at(5, 5, 3));
  assert.ok(lc.proveMorning('steps'));
  await flush();
  assert.equal(lc.armRetryAt()?.getTime(), at(22, 30, 3));
}

test('an earlier bedtime saved from bed, app closed until Tuesday: Monday sleeps at the armed 22:30, as the app says', async () => {
  await earlierFromBedOnFriday();
  // Nobody opens Locturne after Saturday morning. Monday noon: Home's line and the warning
  // name the 22:30 the old windows will really run.
  advance(at(12, 0, 5));
  assert.equal(hm(rt.nightAt(lc.readLock().nextChange).start), '22:30');
  assert.deepEqual(warnings(), ['22:15']);
  advance(at(21, 15, 5));
  assert.deepEqual([...device.state.shielded], []);
  assert.equal(lc.readLock().phase, 'day');
  advance(at(22, 35, 5));
  assert.deepEqual([...device.state.shielded], ['tiktok']);
  assert.equal(lc.readLock().phase, 'night');
});

test('an earlier bedtime with old windows: an open after it applies re-arms, and its night starts at once', async () => {
  await earlierFromBedOnFriday();
  advance(at(21, 15, 5));
  assert.equal(lc.readLock().phase, 'day', 'until iOS has the 21:00 windows');
  lc.syncLock();
  await flush();
  assert.equal(st.getArmedNight()?.bedtime, 21 * 60);
  assert.equal(lc.readLock().phase, 'night');
  assert.deepEqual([...device.state.shielded], ['tiktok']);
});

for (const [hh, mm] of [
  [7, 30],
  [6, 0],
] as const) {
  test(`a switch from a night shift saved at ${hh}:${String(mm).padStart(2, '0')}: the morning it names again is free`, async () => {
    // 08:00 to 16:00 (sleeping after a night shift); 23:00 to 07:00 saved before the shift's
    // bedtime. It applies at 08:00, and names Thursday's morning, whose night (Wednesday 23:00
    // to 07:00) nobody slept under either routine.
    await setUp({ ...rt.DEFAULT_ROUTINE, bedtime: 8 * 60, morningStart: 16 * 60 }, at(17, 0, 0));
    advance(at(hh, mm));
    await save(rt.DEFAULT_ROUTINE);
    advance(at(8, 5));
    assert.equal(lc.readLock().phase, 'day');
    assert.deepEqual([...device.state.shielded], []);
    // Saved at 06:00, arming waited for 07:00 (a phantom night), so the shift's 08:00 windows
    // still run with the app closed; the first open wakes them and re-arms.
    assert.equal(lc.syncLock().phase, 'day');
    await flush();
    assert.deepEqual([...device.state.shielded], []);
    assert.equal(st.getArmedNight()?.bedtime, 23 * 60);
    // Tonight is the new routine's first real night, and its morning locks.
    advance(at(23, 30));
    assert.equal(lc.readLock().phase, 'night');
    assert.deepEqual([...device.state.shielded], ['tiktok']);
    advance(at(7, 30, 2));
    assert.equal(lc.readLock().phase, 'morning');
  });
}
