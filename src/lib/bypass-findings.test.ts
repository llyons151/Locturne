/// <reference types="node" />

/**
 * Round 52's security findings, against the simulated phone (sim-device.ts), with the bypass
 * fuzzer's harness (bypass-fuzz.test.ts found them). Windows armed since the routine in force
 * took over, for other times, are an edit's (the waiting one's, or one since abandoned: an Undo
 * iOS refused), never the routine in force's (`runsAs`, routine.ts). And a bedtime list emptied
 * by an emergency unlock while a change waits is never redated past the pause.
 *
 * Needs `--experimental-test-module-mocks` (set in the npm test script).
 */
import assert from 'node:assert/strict';
import { afterEach, mock, test } from 'node:test';

const { simDevice, token } = await import('./sim-device.ts');
const device = simDevice();

/* iOS refusing registrations: after `acceptLeft` more calls, the next `refuseLeft` are refused. */
const realStart = device.exports.startMonitoring;
let acceptLeft = Infinity;
let refuseLeft = 0;
device.exports.startMonitoring = async (...args: Parameters<typeof realStart>) => {
  if (acceptLeft <= 0 && refuseLeft > 0) {
    refuseLeft -= 1;
    throw new Error('excessiveActivities');
  }
  acceptLeft -= 1;
  await realStart(...args);
};
const noRefusals = () => {
  acceptLeft = Infinity;
  refuseLeft = 0;
};
const refuseAll = () => {
  acceptLeft = 0;
  refuseLeft = 1e9;
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
const em = await import('./emergency.ts');
const { armTonight } = await import('./arm.ts');

type Routine = import('./routine.ts').Routine;
type StandingList = import('./screen-time.ts').StandingList;

const NIGHT0 = ['tiktok', 'insta'];
/** October 2026 (the 4th is a Sunday), local time. */
const at = (d: number, h: number, m = 0, sec = 0) => new Date(2026, 9, d, h, m, sec).getTime();
const asleep = (app: string) => device.state.shielded.has(app);

afterEach(() => {
  mock.timers.reset();
  device.reset();
  noRefusals();
});

async function flush() {
  for (let i = 0; i < 6; i++) await new Promise((resolve) => setImmediate(resolve));
}

/** What iOS queued straight after a call (a registration inside its interval). */
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

let paid = true;

/** `armIfPaid` (hooks/use-app-start.ts), which can't be imported without React. */
async function armIfPaid() {
  if (!rt.hasRoutine()) return;
  lc.settleSubscription(paid);
  await flush();
  drain();
  if (!paid || st.getArmedNight() || st.shownSelection('night').size === 0) return;
  await armTonight().catch(() => {});
  await flush();
  drain();
}

/** Launch or return to the front: `useLock`, `useStandingBlocks` and `useAppStart`. */
async function open() {
  lc.syncLock();
  drain();
  await st.settleLimitChanges().catch(() => {});
  drain();
  lc.syncLock();
  await flush();
  drain();
  await armIfPaid();
}

/** Bought at `start` on `routine`, with tiktok and insta at bedtime, reddit always and a 15-minute limit. */
async function setup(start: number, routine: Routine) {
  device.reset();
  mock.timers.reset();
  noRefusals();
  paid = true;
  mock.timers.enable({ apis: ['Date'], now: start });
  device.exports.setFamilyActivitySelectionId({ id: 'night', familyActivitySelection: token(NIGHT0) });
  device.exports.setFamilyActivitySelectionId({ id: 'always', familyActivitySelection: token(['reddit']) });
  device.exports.setFamilyActivitySelectionId({ id: 'limit-0', familyActivitySelection: token(['yt', 'yt2']) });
  lc.settleSubscription(true);
  rt.saveRoutine(routine);
  const armed = await armTonight();
  drain();
  assert.equal(armed.status, 'armed');
  const limit = { id: 'limit-0' as const, minutes: 15 };
  await st.armLimit(limit);
  st.saveLimits([limit]);
  drain();
  await open();
}

/** The Routine tab's save. */
async function commit(next: Routine) {
  const now = new Date();
  rt.saveRoutine(next, now, lc.inPendingFirstNight(now));
  lc.syncLock();
  drain();
  if (st.getArmedNight()) await lc.armRoutine().catch(() => {});
  else await armIfPaid();
  await flush();
  drain();
}

/** The Apps tab's `pickedList`, after Apple's picker closed on a standing list's draft. */
async function listEdit(list: StandingList, apps: string[]) {
  const draft = st.beginListEdit(list);
  const ids = { ...device.ids() };
  if (apps.length) ids[draft] = token(apps);
  else delete ids[draft];
  device.exports.userDefaultsSet('familyActivitySelectionIds', ids);
  st.finishListEdit(list, lc.looserEditsStartAt(new Date(), list));
  st.reapplyStandingBlocks();
  drain();
}

test('F1: a refused re-arm after an edit from bed was abandoned keeps the night held', async () => {
  const R0: Routine = { ...rt.DEFAULT_ROUTINE, bedtime: 22 * 60, morningStart: 6 * 60 + 30 };
  await setup(at(4, 12), R0);
  runTo(at(5, 1, 36));
  await open();
  // From bed: bedtime 02:36, morning 04:36 (inside tonight, so armed at once).
  await commit({ ...R0, bedtime: 156, morningStart: 276 });
  assert.equal(st.getArmedNight()?.bedtime, 156);
  runTo(at(5, 1, 41));
  // Bedtime 12:00, and iOS refuses the re-arm (and keeps refusing).
  refuseAll();
  await commit({ ...R0, bedtime: 720, morningStart: 276 });
  await open();
  noRefusals();
  assert.equal(asleep('tiktok'), true, `bedtime app woke at 01:41, phase ${lc.readLock().phase}`);
});

test("F2: a refused Undo leaves a throwaway edit's windows armed: an always-list removal still waits for 23:00", async () => {
  const R0: Routine = { ...rt.DEFAULT_ROUTINE, bedtime: 23 * 60, morningStart: 7 * 60 };
  await setup(at(4, 12), R0);
  runTo(at(5, 7, 30));
  await open();
  assert.ok(lc.proveMorning('downstairs', new Date()));
  runTo(at(5, 12));
  // A throwaway: bedtime 21:00 tonight (armed at once: it only tightens).
  await commit({ ...R0, bedtime: 21 * 60 });
  runTo(at(5, 20, 58, 30));
  // Undo, which iOS refuses: the 21:00 windows stay armed.
  refuseAll();
  await commit({ ...R0 });
  noRefusals();
  // 20:59: remove reddit from the always list (Apps tab), then the next open re-arms R0.
  runTo(at(5, 20, 59));
  await listEdit('always', []);
  await open();
  assert.equal(st.getArmedNight()?.bedtime, 23 * 60, 'R0 armed again');
  runTo(at(5, 21, 30));
  await open();
  assert.equal(asleep('reddit'), true, `always app awake at 21:30, change from ${st.listChangeStarts('always')}`);
});

test('F3: a lapse found mid-night, then an earlier bedtime and Undo: the morning that still counts stays locked', async () => {
  const R0: Routine = { ...rt.DEFAULT_ROUTINE, bedtime: 22 * 60, morningStart: 6 * 60 + 30 };
  await setup(at(4, 12), R0);
  runTo(at(5, 5, 18));
  await open();
  paid = false;
  lc.settleSubscription(false);
  drain();
  runTo(at(5, 9, 30));
  await open();
  assert.equal(lc.readLock().phase, 'morning');
  await commit({ ...R0, bedtime: 9 * 60 + 5 });
  await open();
  runTo(at(5, 9, 40));
  await commit({ ...R0 });
  await open();
  assert.equal(asleep('tiktok'), true, `woke at 09:40, phase ${lc.readLock().phase}, stood down ${st.isStoodDown()}`);
});

test('F4: an emptied list, an emergency and a lapse, then renewed: the apps put back sleep at bedtime', async () => {
  const R0: Routine = { ...rt.DEFAULT_ROUTINE, bedtime: 22 * 60, morningStart: 6 * 60 + 30 };
  await setup(at(4, 12), R0);
  runTo(at(5, 1, 13));
  await open();
  await listEdit('night', []); // every bedtime app removed (waits for 22:00)
  runTo(at(5, 2, 44));
  assert.ok(em.emergencyUnlock(new Date()));
  await open();
  runTo(at(5, 9));
  paid = false;
  await open(); // lapse found in the day: everything stands down
  assert.equal(st.isStoodDown(), true);
  runTo(at(5, 21, 30));
  paid = true;
  await open(); // renewed
  await listEdit('night', NIGHT0); // the apps back for tonight
  await open();
  runTo(at(5, 22, 1));
  assert.equal(asleep('tiktok'), true, `22:01 awake; night change from ${st.listChangeStarts('night')}`);
});

test('F2b: as F2 with one registration refused, a removal at 20:30, then the app closed', async () => {
  const R0: Routine = { ...rt.DEFAULT_ROUTINE, bedtime: 23 * 60, morningStart: 7 * 60 };
  await setup(at(4, 12), R0);
  runTo(at(5, 7, 30));
  await open();
  assert.ok(lc.proveMorning('downstairs', new Date()));
  runTo(at(5, 12));
  await commit({ ...R0, bedtime: 21 * 60 });
  runTo(at(5, 20, 28));
  // iOS refuses one registration: R0's first window. The 21:00 windows go back.
  acceptLeft = 0;
  refuseLeft = 1;
  await commit({ ...R0 });
  runTo(at(5, 20, 30));
  await listEdit('always', []);
  noRefusals();
  runTo(at(5, 21, 30));
  assert.equal(asleep('reddit'), true, `always app awake at 21:30 with the app closed`);
});
