/// <reference types="node" />

/**
 * Round 52's honest-user findings (honest-fuzz.test.ts), against the simulated phone
 * (sim-device.ts): nobody attacks the lock here, but what the app promises must happen, and no
 * later than it says.
 *
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

type Routine = import('./routine.ts').Routine;
type StandingList = import('./screen-time.ts').StandingList;

/** June 2026 (the 7th is a Sunday) at hh:mm, local time. */
const at = (d: number, h: number, m = 0) => new Date(2026, 5, d, h, m).getTime();
const asleep = (app: string) => device.state.shielded.has(app);

afterEach(() => {
  mock.timers.reset();
  device.reset();
});

async function flush() {
  for (let i = 0; i < 6; i++) await new Promise((resolve) => setImmediate(resolve));
}

function drain() {
  while (device.state.queue.length) {
    const e = device.state.queue.shift()!;
    device.fire(e.activity, e.callback);
  }
}

/** The phone runs with Locturne closed until `to`. */
function runTo(to: number) {
  drain();
  for (const e of device.dueEvents(Date.now(), to)) {
    mock.timers.setTime(e.at);
    device.fire(e.activity, e.callback);
    drain();
  }
  mock.timers.setTime(to);
}

/** Launch or return to the front: `useLock`, then `useStandingBlocks`. */
async function open() {
  lc.syncLock();
  drain();
  await st.settleLimitChanges().catch(() => {});
  drain();
  lc.syncLock();
  await flush();
  drain();
}

/** Bought at `now` on `routine`, with insta and snap at bedtime and reddit and news always. */
async function setUp(now: number, routine: Partial<Routine> = {}) {
  mock.timers.enable({ apis: ['Date'], now });
  device.exports.setFamilyActivitySelectionId({ id: 'night', familyActivitySelection: token(['insta', 'snap']) });
  device.exports.setFamilyActivitySelectionId({ id: 'always', familyActivitySelection: token(['reddit', 'news']) });
  lc.settleSubscription(true);
  rt.saveRoutine({ ...rt.DEFAULT_ROUTINE, ...routine });
  assert.equal((await armTonight()).status, 'armed');
  await flush();
  drain();
  lc.syncLock();
  drain();
}

/** The Routine tab's save. */
async function commit(next: Routine) {
  rt.saveRoutine(next, new Date(), lc.inPendingFirstNight(new Date()));
  lc.syncLock();
  drain();
  await lc.armRoutine().catch(() => {});
  await flush();
  drain();
}

/** Apple's picker on a standing list's draft, then Done (`pickedList` in apps-list.tsx). */
function editList(list: StandingList, apps: string[]) {
  const draft = st.beginListEdit(list);
  const ids = { ...device.ids() };
  if (apps.length) ids[draft] = token(apps);
  else delete ids[draft];
  device.exports.userDefaultsSet('familyActivitySelectionIds', ids);
  st.finishListEdit(list, lc.looserEditsStartAt(new Date(), list));
  st.reapplyStandingBlocks();
  lc.syncLock();
  drain();
}

test('1: an app taken off the bedtime list by day never sleeps after an earlier bedtime saved later that day', async () => {
  await setUp(at(2, 14));
  runTo(at(3, 7, 22));
  assert.ok(lc.proveMorning('steps'));
  drain();
  runTo(at(3, 18, 55));
  editList('night', ['insta']);
  assert.equal(st.listChangeStarts('night')?.getTime(), at(3, 23));
  runTo(at(3, 19, 53));
  await commit({ ...rt.getRoutine(), bedtime: 21 * 60, morningStart: 5 * 60 + 30 });
  for (const t of [at(3, 21, 5), at(3, 21, 54), at(3, 23, 10), at(4, 5, 0)]) {
    runTo(t);
    if (t === at(3, 21, 54)) await open();
    assert.ok(asleep('insta'), `insta asleep at ${new Date(t)}`);
    assert.ok(!asleep('snap'), `snap, removed by day, asleep at ${new Date(t)}`);
  }
});

test('2: an always-list removal lands at its bedtime though a later bedtime saved since left no window then', async () => {
  // 23:00 to 07:00. 10:39 remove news (due 23:00). 15:13 bedtime 02:30 to 09:00 (from 23:00):
  // its windows start at 02:30, so a one-off activity swaps the list at 23:00.
  await setUp(at(2, 14));
  runTo(at(3, 7, 22));
  assert.ok(lc.proveMorning('steps'));
  drain();
  runTo(at(3, 10, 39));
  editList('always', ['reddit']);
  assert.equal(st.listChangeStarts('always')?.getTime(), at(3, 23));
  runTo(at(3, 15, 13));
  await commit({ ...rt.getRoutine(), bedtime: 2 * 60 + 30, morningStart: 9 * 60 });
  await open();
  assert.equal(st.listChangeLandsAt('always')?.at.getTime(), at(3, 23), 'the Apps note names 23:00');
  runTo(at(3, 22, 50));
  assert.ok(asleep('news'));
  runTo(at(3, 23, 5));
  assert.ok(!asleep('news'), 'news awake from 23:00');
  assert.ok(asleep('reddit'));
});

test('3: "Bedtime in 15 minutes" in the hour the autumn clock change repeats is a real instant', () => {
  // Only where the clocks go back: find an hour this zone repeats in 2026, if any.
  for (let t = new Date(2026, 0, 1).getTime(); t < new Date(2027, 0, 1).getTime(); t += 15 * 60_000) {
    const a = new Date(t);
    const b = new Date(t + 60 * 60_000);
    if (a.getHours() !== b.getHours() || a.getMinutes() !== b.getMinutes()) continue;
    // `b` is the second pass of `a`'s wall-clock time.
    const second = nt.triggerFor({ id: 'x', kind: 'bedtime', at: b, title: '', body: '' } as never) as { type: string; date?: Date };
    assert.equal(second.type, 'date');
    assert.equal(second.date?.getTime(), b.getTime());
    const first = nt.triggerFor({ id: 'x', kind: 'bedtime', at: a, title: '', body: '' } as never) as { type: string };
    assert.equal(first.type, 'calendar', 'the first pass still floats with the zone');
    return;
  }
});

test('4: a switch to a night shift saved on install day locks nothing that evening', async () => {
  await setUp(at(10, 10));
  assert.ok(!asleep('insta'), 'install morning is free');
  runTo(at(10, 12));
  await commit({ ...rt.getRoutine(), bedtime: 9 * 60, morningStart: 17 * 60 });
  runTo(at(10, 23, 30));
  await open();
  assert.ok(!asleep('insta'), `no night ran into this "morning" (phase ${lc.readLock().phase})`);
});

test('5: Home names the next night that is on, not the edit\'s night already under way when it applies', async () => {
  // 09:00 to 17:00, Sunday to Wednesday evenings. Saturday 21:17: 03:00 to 11:00 (from Sunday
  // 09:00). At Sunday 08:21 the next night is Monday 03:00 (Sunday evening, on).
  await setUp(at(13, 10), { bedtime: 9 * 60, morningStart: 17 * 60, activeNights: [0, 1, 2, 3] });
  runTo(at(13, 21, 17));
  await open();
  await commit({ ...rt.getRoutine(), bedtime: 3 * 60, morningStart: 11 * 60 });
  runTo(at(14, 8, 21));
  await open();
  const night = rt.nightAt(lc.readLock().nextChange);
  assert.ok(night.on, `Home says tonight is off (night from ${night.start})`);
  // Monday's night (at 03:00, or the old 09:00 while those windows are still the ones armed).
  assert.equal(night.start.getDate(), 15);
});

test('6: a night switched off by day, after windows left stale by an earlier save, neither warns nor locks', async () => {
  // 22:00 to 06:30. Sunday 14:51: 21:00 to 05:30, Mon/Wed/Fri/Sat (its arming waits, and with the
  // app closed the 22:00 windows run on). Monday 09:11: Monday off too. The same save arms 21:00.
  await setUp(at(6, 12), { bedtime: 22 * 60, morningStart: 6 * 60 + 30 });
  runTo(at(7, 7));
  assert.ok(lc.proveMorning('steps'));
  drain();
  runTo(at(7, 14, 51));
  const b = { ...rt.getRoutine(), bedtime: 21 * 60, morningStart: 5 * 60 + 30, activeNights: [1, 3, 5, 6] };
  await commit(b);
  runTo(at(8, 9, 11));
  await commit({ ...b, activeNights: [0, 2, 4, 5, 6] });
  assert.equal(rt.getPendingRoutine()?.from, at(8, 21), 'the edit applies at the bedtime iOS now runs');
  const armed = st.getArmedNight()!;
  const plan = nt.planNotifications({
    routine: rt.getRoutine(),
    pending: rt.getPendingRoutine(),
    protection: 'on',
    armed: true,
    armedTimes: armed,
    routineSince: rt.getRoutineChange()?.since,
    armedSince: st.armedSince(armed),
    proofs: [],
    now: new Date(),
    days: 1,
  });
  assert.ok(!plan.some((p) => p.kind === 'bedtime' && p.at.getDate() === 8), 'no warning for a night switched off');
  for (const t of [at(8, 21, 10), at(8, 21, 50), at(8, 22, 30)]) {
    runTo(t);
    assert.ok(!asleep('insta'), `insta asleep at ${new Date(t)}`);
  }
});

test('7: a removal made with every night off never sleeps the night switched on later that day', async () => {
  // Every night off, so nothing is armed: a removal waits for midnight. 19:34: nights back on
  // (23:00), armed at once. The removed app is off the list from 23:00, not asleep until midnight.
  mock.timers.enable({ apis: ['Date'], now: at(9, 10) });
  device.exports.setFamilyActivitySelectionId({ id: 'night', familyActivitySelection: token(['insta', 'snap']) });
  lc.settleSubscription(true);
  rt.saveRoutine({ ...rt.DEFAULT_ROUTINE, activeNights: [] });
  runTo(at(9, 17, 53));
  editList('night', ['insta']);
  assert.equal(st.listChangeStarts('night')?.getTime(), at(10, 0));
  runTo(at(9, 19, 34));
  rt.saveRoutine({ ...rt.getRoutine(), activeNights: [0, 1, 2, 3, 4, 5, 6] }, new Date());
  assert.equal((await armTonight()).status, 'armed');
  await flush();
  drain();
  await open();
  for (const t of [at(9, 23, 5), at(9, 23, 40), at(10, 3)]) {
    runTo(t);
    assert.ok(asleep('insta'), `insta asleep at ${new Date(t)}`);
    assert.ok(!asleep('snap'), `snap, removed by day, asleep at ${new Date(t)}`);
  }
});
