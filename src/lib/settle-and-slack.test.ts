/// <reference types="node" />

/**
 * Round 53's findings, against the simulated phone (sim-device.ts) with iOS's cap of 20
 * monitored activities and registrations that finish after a turn of the event loop.
 *
 * - The extension reads a waiting edit as in force two minutes before it applies
 *   (`locturneRoutineInForce`), so an open in that slack must not wake a night the edit's
 *   windows have just shielded (`holdsEarly`, routine.ts).
 * - The one-off `locturne-settle` activity never takes a slot a night window, Block now or a
 *   daily limit needs (`scheduleListSettle`, screen-time.ts), and its interval reads right on
 *   the wall clock across the autumn change (`settleInterval`).
 *
 * Needs `--experimental-test-module-mocks` (set in the npm test script).
 */
import assert from 'node:assert/strict';
import { afterEach, mock, test } from 'node:test';

const { simDevice, token } = await import('./sim-device.ts');
const device = simDevice();

const refused: string[] = [];
/** iOS runs a window's start right after its own registration, before the app's next call. */
let fireOnRegister = false;
const realStart = device.exports.startMonitoring;
device.exports.startMonitoring = async (...args: Parameters<typeof realStart>) => {
  try {
    await realStart(...args);
  } catch (error) {
    refused.push(args[0]);
    throw error;
  }
  if (fireOnRegister) for (const q of device.state.queue.splice(0)) device.fire(q.activity, q.callback);
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
const { armTonight } = await import('./arm.ts');
const np = await import('../features/onboarding/night-picker.ts');

type Routine = import('./routine.ts').Routine;
type StandingList = import('./screen-time.ts').StandingList;

const MIN = 60_000;
/** October 2026 (the 5th is a Monday), local time. */
const at = (d: number, h: number, m = 0, sec = 0) => new Date(2026, 9, d, h, m, sec).getTime();
const asleep = (app: string) => device.state.shielded.has(app);

afterEach(() => {
  mock.timers.reset();
  device.reset();
  refused.length = 0;
  fireOnRegister = false;
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

/** Launch or return to the front (`useLock`, `useStandingBlocks`). */
async function open() {
  lc.syncLock();
  drain();
  await st.settleLimitChanges().catch(() => {});
  drain();
  lc.syncLock();
  await flush();
  drain();
}

async function setup(start: number, routine: Routine) {
  device.reset();
  device.state.cap = 20;
  device.state.asyncRegistration = true;
  mock.timers.enable({ apis: ['Date'], now: start });
  device.exports.setFamilyActivitySelectionId({ id: 'night', familyActivitySelection: token(['tiktok', 'insta']) });
  device.exports.setFamilyActivitySelectionId({ id: 'always', familyActivitySelection: token(['reddit']) });
  lc.settleSubscription(true);
  rt.saveRoutine(routine);
  assert.equal((await armTonight()).status, 'armed');
  await flush();
  drain();
}

/** The Routine tab's save. */
async function commit(next: Routine) {
  const now = new Date();
  rt.saveRoutine(next, now, lc.inPendingFirstNight(now));
  lc.syncLock();
  drain();
  await lc.armRoutine().catch(() => {});
  await flush();
  drain();
}

/** The Apps tab's save of a standing list. */
function listEdit(list: StandingList, apps: string[]) {
  const draft = st.beginListEdit(list);
  const ids = { ...device.ids() };
  if (apps.length) ids[draft] = token(apps);
  else delete ids[draft];
  device.exports.userDefaultsSet('familyActivitySelectionIds', ids);
  st.finishListEdit(list, lc.looserEditsStartAt(new Date(), list));
  st.reapplyStandingBlocks();
  drain();
}

async function addLimits(count: number) {
  for (const [id, app] of ([['limit-0', 'yt'], ['limit-1', 'fb'], ['limit-2', 'x']] as const).slice(0, count)) {
    device.exports.setFamilyActivitySelectionId({ id, familyActivitySelection: token([app]) });
    const limit = { id, minutes: 30 } as const;
    await st.armLimit(limit);
    st.saveLimits([...st.getLimits(), limit]);
  }
  drain();
}

for (const before of [90, 60, 30]) {
  test(`F1: an open ${before}s before an edit applies, inside the extension's slack, keeps the night it shields`, async () => {
    // 03:00 to 11:00 with Monday evening off, then a Monday-evening save of 22:00 to 06:30 every
    // night: it applies at 03:00, and from 02:58 the extension reads it as in force.
    await setup(at(2, 12), { ...rt.DEFAULT_ROUTINE, bedtime: 180, morningStart: 660, activeNights: [0, 2, 3, 4, 5, 6] });
    runTo(at(5, 21, 45));
    await open();
    await commit({ ...rt.getRoutine(), bedtime: 1320, morningStart: 390, activeNights: [0, 1, 2, 3, 4, 5, 6] });
    const from = rt.getPendingRoutine()!.from;
    assert.equal(from, at(6, 3));
    runTo(from - before * 1000);
    await open();
    assert.equal(lc.readLock().phase, 'night');
    assert.ok(asleep('tiktok'), 'the edit is about to apply: its night stays asleep');
    for (const m of [0, 1, 10, 30, 44]) {
      runTo(from + m * MIN);
      assert.ok(asleep('tiktok'), `asleep at +${m} min`);
    }
  });
}

test('F2: a waiting settle never takes the slot a 16-window re-arm, Block now or a third limit needs', async () => {
  // 19:00 to 07:00: 16 windows.
  await setup(at(5, 12), { ...rt.DEFAULT_ROUTINE, bedtime: 19 * 60, morningStart: 7 * 60 });
  await addLimits(3);
  runTo(at(6, 12));
  await open();
  await st.startNap('night', 240);
  lc.syncLock();
  drain();
  // An always-list removal waits for bedtime.
  listEdit('always', []);
  await open();
  assert.ok(!device.state.monitored.has('locturne-settle'), 'no room for the settle next to 16 windows, Block now and three limits');
  // A later 16-window bedtime by day: windows again, all 16 of them.
  mock.timers.setTime(Date.now() + 30 * MIN);
  await commit({ ...rt.getRoutine(), bedtime: 20 * 60, morningStart: 8 * 60 });
  await open();
  assert.deepEqual(refused, []);
  assert.equal(st.armedWindowNames().length, 16);
  assert.equal(st.getArmedNight()?.bedtime, 20 * 60);
});

test('F2: the settle gives way when a re-arm needs its slot, and the change still lands when the Apps tab says', async () => {
  // 23:00 to 07:00: 11 windows. An always-list removal by day waits for 23:00; a later bedtime
  // (23:50) leaves no window then, so the settle is registered for it.
  await setup(at(5, 12), { ...rt.DEFAULT_ROUTINE });
  runTo(at(6, 12));
  await open();
  listEdit('always', []);
  await open();
  await commit({ ...rt.getRoutine(), bedtime: 23 * 60 + 50 });
  await open();
  assert.ok(device.state.monitored.has('locturne-settle'), 'room for it next to 11 windows');
  // Then 19:00 to 07:00 (16 windows): the settle steps aside, and three limits and Block now fit.
  await commit({ ...rt.getRoutine(), bedtime: 19 * 60 });
  await open();
  await addLimits(3);
  await st.startNap('block', 30).catch(() => {});
  await open();
  assert.deepEqual(refused, []);
  assert.ok(!device.state.monitored.has('locturne-settle'));
  assert.equal(st.getArmedNight()?.bedtime, 19 * 60);
  // Whatever the Apps tab says now comes true.
  const lands = st.listChangeLandsAt('always');
  assert.ok(lands && !lands.waitsForOpen);
  runTo(lands.at.getTime() - MIN);
  assert.ok(asleep('reddit'), 'still asleep just before');
  runTo(lands.at.getTime() + MIN);
  assert.ok(!asleep('reddit'), `awake from ${lands.at.toString()}`);
});

test('F2: a settle iOS dropped is registered again', async () => {
  await setup(at(5, 12), { ...rt.DEFAULT_ROUTINE });
  runTo(at(6, 12));
  await open();
  listEdit('always', []);
  await open();
  await commit({ ...rt.getRoutine(), bedtime: 23 * 60 + 50 });
  await open();
  assert.ok(device.state.monitored.has('locturne-settle'));
  device.exports.stopMonitoring(['locturne-settle']);
  await open();
  assert.ok(device.state.monitored.has('locturne-settle'));
  runTo(at(6, 23, 1));
  assert.ok(!asleep('reddit'), 'the removal landed at 23:00');
});

test("F2: the settle's interval names one moment and ends after it on the wall clock, across both clock changes", async () => {
  const wall = (p: { year?: number; month?: number; day?: number; hour: number; minute: number; second?: number }) =>
    Date.UTC(p.year!, p.month! - 1, p.day!, p.hour, p.minute, p.second ?? 0);
  const named = (p: { year?: number; month?: number; day?: number; hour: number; minute: number; second?: number }) =>
    new Date(p.year!, p.month! - 1, p.day!, p.hour, p.minute, p.second ?? 0).getTime();
  // Every five minutes of 2026 near a clock change in this zone (none in UTC: then a quiet day).
  const changes: number[] = [];
  for (let t = Date.UTC(2026, 0, 1); t < Date.UTC(2027, 0, 1); t += 3_600_000) {
    if (new Date(t).getTimezoneOffset() !== new Date(t + 3_600_000).getTimezoneOffset()) changes.push(t);
  }
  if (!changes.length) changes.push(Date.UTC(2026, 9, 5));
  for (const change of changes) {
    for (let want = change - 3 * 3_600_000; want < change + 3 * 3_600_000; want += 5 * MIN) {
      const { at: start, intervalStart, intervalEnd } = st.settleInterval(want);
      assert.ok(start >= want && start - want <= 2 * 3_600_000, `starts at or soon after ${new Date(want).toString()}`);
      assert.equal(named(intervalStart), start, `its start names ${new Date(start).toString()}`);
      const end = named(intervalEnd);
      assert.ok(end - start >= 15 * MIN, `ends 15 min or more after ${new Date(start).toString()}`);
      assert.ok(wall(intervalEnd) - wall(intervalStart) >= 15 * MIN, `ends after it on the wall clock, ${new Date(start).toString()}`);
    }
  }
});

test('a removal moved to now when protection is armed again lands now, as the Apps tab says (bypass fuzz seed 4384)', async () => {
  // 23:00 to 07:00, lapsed at noon on Saturday the 10th (everything stands down).
  await setup(at(9, 12), { ...rt.DEFAULT_ROUTINE });
  device.state.asyncRegistration = false;
  fireOnRegister = true;
  runTo(at(10, 12));
  lc.proveMorning('downstairs', new Date());
  lc.settleSubscription(false);
  drain();
  await open();
  assert.ok(st.isStoodDown());
  // By day with nothing armed: every bedtime app removed, then bedtime 20:28 with Saturday off.
  runTo(at(10, 18, 49));
  listEdit('night', []);
  await open();
  runTo(at(10, 19, 28));
  await commit({ ...rt.getRoutine(), bedtime: 20 * 60 + 28, activeNights: [0, 1, 2, 3, 4, 5] });
  // Onboarding's bedtime picker, closed with nothing picked.
  runTo(at(10, 20, 1));
  const picker = np.openNightPicker(new Date());
  np.closeNightPicker(picker, new Date());
  drain();
  await open();
  // Renewed at 21:52, the moment a window of 20:28's starts, and armed: the removal's night
  // began at 20:28, so it's due now, and that window's start has run already.
  runTo(at(10, 21, 52));
  lc.settleSubscription(true);
  drain();
  await open();
  // `armIfPaid` (hooks/use-app-start.ts) last, and nothing after it until 22:30.
  assert.equal((await armTonight()).status, 'armed');
  await flush();
  drain();
  const lands = st.listChangeLandsAt('night');
  if (lands) {
    runTo(lands.at.getTime() + MIN);
    assert.equal(st.listChangeStarts('night'), null, `the Apps tab said it lands at ${lands.at.toString()}`);
  }
  runTo(at(10, 22, 30));
  assert.equal(st.listChangeStarts('night'), null, 'landed by 22:30');
  assert.equal(st.selectionSize('night'), 0);
});
