/// <reference types="node" />

/**
 * App schedules (schedules.ts, docs/LOCK_V2.md) against the simulated phone (sim-device.ts):
 * Locturne registers each schedule's daily activity, and the extension puts its apps to sleep
 * and wakes them with the app closed. Loosening while a block is under way waits for its end.
 *
 * Needs `--experimental-test-module-mocks` (set in the npm test script).
 */
import assert from 'node:assert/strict';
import { afterEach, mock, test } from 'node:test';

const { simDevice, token } = await import('./sim-device.ts');
const device = simDevice();

const refused: string[] = [];
const realStart = device.exports.startMonitoring;
device.exports.startMonitoring = async (...args: Parameters<typeof realStart>) => {
  try {
    await realStart(...args);
  } catch (error) {
    refused.push(args[0]);
    throw error;
  }
};

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
const sc = await import('./schedules.ts');
const { armTonight } = await import('./arm.ts');

type Draft = Omit<import('./schedules.ts').Schedule, 'pending'>;

/** October 2026 (the 5th is a Monday), local time. */
const at = (d: number, h: number, m = 0) => new Date(2026, 9, d, h, m).getTime();
const asleep = (app: string) => device.state.shielded.has(app);
const WORK: Draft = { id: 'sched-0', name: 'Work', start: 9 * 60, end: 17 * 60, days: [1, 2, 3, 4, 5] };

afterEach(() => {
  mock.timers.reset();
  device.reset();
  refused.length = 0;
});

async function flush() {
  for (let i = 0; i < 8; i++) await new Promise((resolve) => setImmediate(resolve));
}

function drain() {
  while (device.state.queue.length) {
    const e = device.state.queue.shift()!;
    device.fire(e.activity, e.callback);
  }
}

/** The phone runs with Locturne closed until `to`. */
function runTo(to: number) {
  for (const e of device.dueEvents(Date.now(), to)) {
    mock.timers.setTime(e.at);
    device.fire(e.activity, e.callback);
    drain();
  }
  mock.timers.setTime(to);
}

async function open() {
  lc.syncLock();
  drain();
  await st.settleLimitChanges().catch(() => {});
  drain();
  lc.syncLock();
  await flush();
  drain();
}

async function setup(start: number) {
  device.reset();
  device.state.cap = 20;
  device.state.asyncRegistration = true;
  mock.timers.enable({ apis: ['Date'], now: start });
  device.exports.setFamilyActivitySelectionId({ id: 'night', familyActivitySelection: token(['tiktok']) });
  device.exports.setFamilyActivitySelectionId({ id: 'always', familyActivitySelection: token(['reddit']) });
  lc.settleSubscription(true);
  rt.saveRoutine(rt.DEFAULT_ROUTINE);
  assert.equal((await armTonight()).status, 'armed');
  await flush();
  drain();
}

/** `saveSchedule` (features/apps/schedule-actions.ts), without the shield words. */
async function save(id: Draft['id'], next: Draft | null) {
  st.saveSchedules(sc.editSchedule(st.getSchedules(), id, next, new Date()));
  await open();
}

function pick(id: string, apps: string[]) {
  device.exports.setFamilyActivitySelectionId({ id, familyActivitySelection: token(apps) });
}

test('a 9 to 5 sleeps its apps on weekdays with Locturne closed, and the always list stays asleep', async () => {
  await setup(at(5, 8));
  pick('sched-0', ['youtube']);
  await save('sched-0', WORK);
  assert.ok(device.state.monitored.has('sched-0'), 'its daily activity is registered');
  assert.ok(!asleep('youtube'));
  runTo(at(5, 9, 1));
  assert.ok(asleep('youtube'), 'asleep from 9');
  assert.ok(asleep('reddit'));
  runTo(at(5, 17, 1));
  assert.ok(!asleep('youtube'), 'awake from 5');
  assert.ok(asleep('reddit'));
  // Saturday: the activity still starts at 9, and nothing sleeps.
  runTo(at(10, 9, 30));
  assert.ok(!asleep('youtube'), 'off on Saturday');
  runTo(at(12, 9, 30));
  assert.ok(asleep('youtube'), 'Monday again');
});

test('opening Locturne puts up a block whose start was missed, and lifts one whose end was', async () => {
  await setup(at(5, 8));
  pick('sched-0', ['youtube']);
  await save('sched-0', WORK);
  // iOS never ran the start: the app's open does it.
  mock.timers.setTime(at(5, 10));
  await open();
  assert.ok(asleep('youtube'));
  // And never ran the end.
  mock.timers.setTime(at(5, 18));
  await open();
  assert.ok(!asleep('youtube'));
  assert.ok(asleep('reddit'));
});

test('a looser edit inside a block waits for its end; a stricter one is in force at once', async () => {
  await setup(at(5, 8));
  pick('sched-0', ['youtube']);
  await save('sched-0', WORK);
  runTo(at(5, 10));
  await save('sched-0', { ...WORK, end: 12 * 60 });
  runTo(at(5, 12, 30));
  assert.ok(asleep('youtube'), 'still asleep after the new, earlier end');
  runTo(at(5, 17, 1));
  assert.ok(!asleep('youtube'));
  assert.equal(st.getSchedules()[0].end, 12 * 60, 'the shorter block is in force');
  runTo(at(6, 12, 1));
  await open();
  assert.ok(!asleep('youtube'), 'Tuesday ends at noon');
  // Deleting inside Tuesday's block... none at 12:01, so it goes at once.
  await save('sched-0', null);
  assert.deepEqual(st.getSchedules(), []);
  assert.ok(!device.state.monitored.has('sched-0'), 'its activity stops');
});

test('apps removed from a schedule inside its block wake when it ends, not before', async () => {
  await setup(at(5, 8));
  pick('sched-0', ['youtube', 'x']);
  await save('sched-0', WORK);
  runTo(at(5, 10));
  st.beginListEdit('sched-0');
  device.exports.setFamilyActivitySelectionId({ id: st.draftId('sched-0'), familyActivitySelection: token(['youtube']) });
  st.finishListEdit('sched-0', sc.scheduleRemovalsAt(st.getSchedules()[0], new Date()));
  await open();
  assert.ok(asleep('x'), 'x stays asleep until 5');
  runTo(at(5, 17, 1));
  assert.ok(!asleep('x'));
  runTo(at(6, 9, 1));
  assert.ok(asleep('youtube'));
  assert.ok(!asleep('x'), 'x is out of the schedule');
});

test('a schedule ending while the night holds the same app leaves it asleep', async () => {
  await setup(at(5, 20));
  pick('sched-0', ['tiktok', 'youtube']);
  await save('sched-0', { ...WORK, start: 21 * 60, end: 23 * 60 + 30 });
  runTo(at(5, 23, 31));
  assert.ok(asleep('tiktok'), 'the night holds tiktok');
  assert.ok(!asleep('youtube'));
});

test('the longest night, five limits, Block now and four schedules all fit in iOS\'s 20', async () => {
  // 19:00 to 07:00, saved by day: in force at once, seven windows.
  await setup(at(5, 8));
  rt.saveRoutine({ ...rt.DEFAULT_ROUTINE, bedtime: 19 * 60, morningStart: 7 * 60 }, new Date(), false, true);
  await lc.armRoutine().catch(() => {});
  await flush();
  drain();
  for (const [id, app] of [['limit-0', 'yt'], ['limit-1', 'fb'], ['limit-2', 'ig'], ['limit-3', 'sc'], ['limit-4', 'tw']] as const) {
    pick(id, [app]);
    const limit = { id, minutes: 30 } as const;
    await st.armLimit(limit);
    st.saveLimits([...st.getLimits(), limit]);
  }
  await st.startNap('night', 30);
  for (let i = 0; i < sc.MAX_SCHEDULES; i++) {
    const id = `sched-${i}` as Draft['id'];
    pick(id, [`app${i}`]);
    st.saveSchedules(sc.editSchedule(st.getSchedules(), id, { ...WORK, id, start: (8 + i) * 60 }, new Date()));
  }
  await open();
  assert.deepEqual(refused, []);
  assert.equal(st.armedWindowNames().length, 7);
  assert.equal([...device.state.monitored.keys()].filter((name) => name.startsWith('sched-')).length, sc.MAX_SCHEDULES);
  assert.ok(device.state.monitored.size <= 20);
});
