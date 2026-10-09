/// <reference types="node" />

/**
 * Round 51's security findings and review repros, against the simulated phone (sim-device.ts):
 * iOS runs the windows with Locturne closed, and the monitor extension's port judges them.
 * Routine edits from bed, windows left armed by edits since replaced, and when a looser edit (a
 * list removal, a looser or removed daily limit) really starts. `bypass-fuzz.test.ts` fuzzes
 * the same class.
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
const dl = await import('./daily-limits.ts');
const em = await import('./emergency.ts');
const { armTonight } = await import('./arm.ts');

type Routine = import('./routine.ts').Routine;
type StandingList = import('./screen-time.ts').StandingList;

/** October 2026 (the 4th is a Sunday) at hh:mm, local time. */
const at = (day: number, hh: number, mm = 0) => new Date(2026, 9, day, hh, mm).getTime();
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

/** The phone runs closed to `to`; `check` is asked every five minutes on the way. */
function runChecking(to: number, check: () => void) {
  for (let t = Date.now() + 5 * 60_000; t < to; t += 5 * 60_000) {
    runTo(t);
    check();
  }
  runTo(to);
  check();
}

/** Bought at `now`, with tiktok and insta at bedtime, reddit always and a 15-minute limit on yt. */
async function setUp(now: number, routine: Partial<Routine> = {}, limit = false) {
  mock.timers.enable({ apis: ['Date'], now });
  device.exports.setFamilyActivitySelectionId({ id: 'night', familyActivitySelection: token(['tiktok', 'insta']) });
  device.exports.setFamilyActivitySelectionId({ id: 'always', familyActivitySelection: token(['reddit', 'x']) });
  lc.settleSubscription(true);
  rt.saveRoutine({ ...rt.DEFAULT_ROUTINE, ...routine });
  assert.equal((await armTonight()).status, 'armed');
  if (limit) {
    device.exports.setFamilyActivitySelectionId({ id: 'limit-0', familyActivitySelection: token(['yt']) });
    const created = { id: 'limit-0' as const, minutes: 15 };
    await st.armLimit(created);
    st.saveLimits([created]);
  }
  drain();
  await open();
}

/** Launch or return to the front: `useLock`, then `useStandingBlocks`. */
async function open() {
  lc.syncLock();
  drain();
  await st.settleLimitChanges().catch(() => {});
  lc.syncLock();
  await flush();
  drain();
}

/** The Routine tab's save of one change to what's set (the waiting edit, or the routine in force). */
async function edit(patch: Partial<Routine>) {
  const now = new Date();
  const base = rt.getPendingRoutine(now)?.routine ?? rt.getRoutine(now);
  rt.saveRoutine({ ...base, ...patch }, now, lc.inPendingFirstNight(now));
  lc.syncLock();
  if (st.getArmedNight()) await lc.armRoutine().catch(() => {});
  await flush();
  drain();
}

/** Undo: the Routine tab saves the routine in force back. */
const undo = () => edit({ ...rt.getRoutine() });

/** Apple's picker on a standing list's draft, then Done (`pickedList` in apps-list.tsx). */
function editList(list: StandingList, apps: string[]) {
  const draft = st.beginListEdit(list);
  const ids = { ...device.ids() };
  if (apps.length) ids[draft] = token(apps);
  else delete ids[draft];
  device.exports.userDefaultsSet('familyActivitySelectionIds', ids);
  st.finishListEdit(list, lc.looserEditsStartAt(new Date(), list));
  st.reapplyStandingBlocks();
  drain();
}

/** The Apps tab's limit menu (`setMinutes` in apps-list.tsx). */
async function setLimit(minutes: number | null) {
  const now = new Date();
  const limits = st.getLimits();
  const next = dl.editLimit(limits, 'limit-0', minutes, lc.looserEditsStartAt(now), now);
  const after = next.find((l) => l.id === 'limit-0');
  if (after && after.minutes !== limits.find((l) => l.id === 'limit-0')?.minutes) await st.armLimit(after);
  st.saveLimits(next);
  drain();
}

async function proveAt(time: number) {
  runTo(time);
  await open();
  assert.ok(lc.proveMorning('downstairs'));
  await flush();
  drain();
}

test('F1: one edit from bed whose long first night has tonight off never governs it', async () => {
  // Sunday 23:00 to 07:00, held. At 01:00, three saves from bed: Sunday off, bedtime 00:45,
  // morning 23:30. The edit's first night (00:45 to 23:30) is Sunday's, which it has off.
  await setUp(at(4, 12));
  runTo(at(5, 1));
  await open();
  assert.ok(asleep('tiktok'));
  await edit({ activeNights: [1, 2, 3, 4, 5, 6] });
  await edit({ bedtime: 45 });
  await edit({ morningStart: 23 * 60 + 30 });
  for (const time of [at(5, 1, 30), at(5, 3), at(5, 6, 59), at(5, 8)]) {
    runTo(time);
    await open();
    assert.notEqual(lc.readLock().phase, 'off');
    assert.ok(asleep('tiktok'), `tiktok awake at ${new Date(time).toTimeString().slice(0, 5)}`);
  }
});

for (const order of [
  ['nights', 'bedtime', 'morning'],
  ['bedtime', 'morning', 'nights'],
  ['morning', 'bedtime', 'nights'],
] as const) {
  test(`F2: an edit from bed promoted inside its own first night, then Undo (${order.join(', ')})`, async () => {
    // 01:15 from bed: Sunday off, bedtime 01:35, morning 01:25. Its windows go in at once inside
    // the night in force; from 01:35 it governs its first night, and an edit then promotes it.
    // Undo arms 23:00 to 07:00 again: those windows are filed by their 07:00 morning start under
    // Sunday evening, which the promoted routine has off, so the extension would skip them and
    // wake the night. Arming waits for that night to end.
    await setUp(at(4, 12));
    runTo(at(5, 1, 15));
    await open();
    for (const field of order) {
      if (field === 'nights') await edit({ activeNights: [1, 2, 3, 4, 5, 6] });
      if (field === 'bedtime') await edit({ bedtime: 95 });
      if (field === 'morning') await edit({ morningStart: 85 });
    }
    runTo(at(5, 1, 40));
    await open();
    await undo();
    runChecking(at(5, 6, 59), () => assert.ok(asleep('tiktok'), `tiktok awake at ${new Date().toTimeString().slice(0, 5)}`));
    await open();
    assert.ok(asleep('tiktok'));
  });
}

test('F3: windows left by an earlier bedtime that every night off replaced never pull the always list or a limit forward', async () => {
  // Proved at 07:10; a used-up limit at 09:00. At 10:00: bedtime 10:30 (armed at once), every
  // night off, bedtime back to 23:00; then the always list emptied and the limit removed; Undo.
  await setUp(at(4, 12), {}, true);
  await proveAt(at(5, 7, 10));
  runTo(at(5, 9));
  await open();
  assert.ok(device.use('limit-0', 20));
  drain();
  runTo(at(5, 10));
  await open();
  await edit({ bedtime: 10 * 60 + 30 });
  await edit({ activeNights: [] });
  await edit({ bedtime: 23 * 60 });
  editList('always', []);
  await setLimit(null);
  await undo();
  const check = () => {
    assert.ok(asleep('reddit'), `reddit awake at ${new Date().toTimeString().slice(0, 5)}`);
    assert.ok(asleep('yt'), `yt awake at ${new Date().toTimeString().slice(0, 5)}`);
  };
  runChecking(at(5, 12), check);
  await open();
  check();
  runChecking(at(5, 22, 55), check);
  await open();
  check();
});

test('F3 from bed: a throwaway bedtime, every night off and back, then removals and Undo hold the night', async () => {
  await setUp(at(4, 12));
  runTo(at(5, 1));
  await open();
  await edit({ bedtime: 65 });
  await edit({ activeNights: [] });
  await edit({ bedtime: 23 * 60 });
  editList('night', ['tiktok']);
  editList('always', []);
  await undo();
  runChecking(at(5, 6, 59), () => {
    assert.ok(asleep('tiktok') && asleep('insta'), `bedtime apps awake at ${new Date().toTimeString().slice(0, 5)}`);
    assert.ok(asleep('reddit'), `reddit awake at ${new Date().toTimeString().slice(0, 5)}`);
  });
  await open();
  assert.ok(asleep('insta') && asleep('reddit'));
});

test("a bedtime-list removal by day lands at an earlier bedtime's first night, not in the middle of it", async () => {
  // Proved at 07:10. At 15:00, bedtime 21:00 (armed at once: its first night is held early),
  // then insta off the bedtime list. It never sleeps tonight rather than sleeping at 21:00 and
  // waking at 23:15.
  await setUp(at(4, 12));
  await proveAt(at(5, 7, 10));
  runTo(at(5, 15));
  await edit({ bedtime: 21 * 60 });
  editList('night', ['tiktok']);
  assert.equal(st.listChangeStarts('night')?.getTime(), at(5, 21));
  runChecking(at(6, 6, 50), () => assert.ok(!asleep('insta'), `insta asleep at ${new Date().toTimeString().slice(0, 5)}`));
  assert.ok(asleep('tiktok'));
});

test('a removal dated by an earlier bedtime moves back to 23:00 when it is undone', async () => {
  await setUp(at(4, 12));
  await proveAt(at(5, 7, 10));
  runTo(at(5, 10));
  await edit({ bedtime: 10 * 60 + 5 });
  editList('night', ['tiktok']);
  assert.equal(st.listChangeStarts('night')?.getTime(), at(5, 10, 5));
  await undo();
  assert.equal(st.listChangeStarts('night')?.getTime(), at(5, 23));
  runTo(at(5, 10, 10));
  await open();
  assert.equal(st.listChangeStarts('night')?.getTime(), at(5, 23));
});

test('the always list and limits wait for the routine in force, never a throwaway bedtime', async () => {
  // Undo first, then the removal: still 23:00.
  await setUp(at(4, 12), {}, true);
  await proveAt(at(5, 7, 10));
  runTo(at(5, 10));
  await edit({ bedtime: 10 * 60 + 5 });
  editList('always', ['x']);
  await setLimit(60);
  assert.equal(st.listChangeStarts('always')?.getTime(), at(5, 23));
  assert.equal(st.getLimits()[0].pending?.from, at(5, 23));
  await undo();
  runTo(at(5, 10, 8));
  await open();
  assert.ok(asleep('reddit'));
  assert.equal(st.getLimits()[0].minutes, 15);
});

test('a second edit never brings a waiting change forward', async () => {
  // Every night off (nothing armed): a removal waits for midnight. A night back on for 21:00,
  // then the same list saved again: still midnight.
  await setUp(at(4, 12));
  await proveAt(at(5, 7, 10));
  runTo(at(5, 9));
  await edit({ activeNights: [] });
  runTo(at(6, 9));
  await open();
  assert.equal(st.getArmedNight(), null);
  runTo(at(6, 8, 16));
  editList('always', ['reddit']);
  assert.equal(st.listChangeStarts('always')?.getTime(), at(7, 0));
  runTo(at(6, 16, 46));
  const now = new Date();
  rt.saveRoutine({ ...rt.getRoutine(), activeNights: [0, 1, 2, 3, 4, 5, 6], bedtime: 21 * 60 }, now, lc.inPendingFirstNight(now));
  lc.syncLock();
  await lc.armRoutine();
  await flush();
  runTo(at(6, 20, 27));
  editList('always', ['reddit']);
  assert.equal(st.listChangeStarts('always')?.getTime(), at(7, 0));
  runTo(at(6, 21, 1));
  await open();
  assert.ok(asleep('x'));

  // A looser limit, twice: the first asked for midnight.
  const once = dl.editLimit([{ id: 'limit-0', minutes: 15 }], 'limit-0', 30, new Date(at(7, 0)));
  const twice = dl.editLimit(once, 'limit-0', 60, new Date(at(6, 21)));
  assert.equal(twice[0].pending?.from, at(7, 0));
  assert.equal(twice[0].pending?.minutes, 60);
});

test('every night off, a night armed for five minutes and off again: a removal waits for midnight', async () => {
  await setUp(at(4, 12));
  await proveAt(at(5, 7, 10));
  runTo(at(5, 9));
  await edit({ activeNights: [] });
  runTo(at(6, 9));
  await open();
  assert.equal(st.getArmedNight(), null);
  runTo(at(6, 10));
  const now = new Date();
  rt.saveRoutine({ ...rt.getRoutine(), activeNights: [0, 1, 2, 3, 4, 5, 6], bedtime: 10 * 60 + 5, morningStart: 11 * 60 }, now, lc.inPendingFirstNight(now));
  lc.syncLock();
  await lc.armRoutine();
  await flush();
  editList('always', ['x']);
  assert.equal(st.listChangeStarts('always')?.getTime(), at(7, 0));
  await edit({ activeNights: [] });
  for (const mm of [6, 10, 30]) {
    runTo(at(6, 10, mm));
    await open();
    assert.ok(asleep('reddit'), `reddit awake at 10:${mm}`);
  }
});

test("the Apps note names the moment the phone really swaps the list", async () => {
  // An earlier bedtime's first night (22:00) is held, so its windows run at 22:00, 22:45 and
  // 23:30: an always-list removal due at 23:00 lands at 23:30.
  await setUp(at(5, 12));
  runTo(at(6, 12));
  await open();
  await edit({ bedtime: 22 * 60 });
  runTo(at(6, 15));
  await open();
  editList('always', ['x']);
  const lands = st.listChangeLandsAt('always');
  assert.equal(lands?.at.getTime(), at(6, 23, 30));
  assert.equal(lands?.waitsForOpen, false);
  runTo(at(6, 23, 28));
  assert.ok(asleep('reddit'));
  runTo(at(6, 23, 31));
  assert.ok(!asleep('reddit'));
});

test('the Apps note after a switch to a night shift names its first window', async () => {
  await setUp(at(5, 12));
  await proveAt(at(6, 7, 5));
  runTo(at(6, 12));
  await open();
  await edit({ bedtime: 8 * 60, morningStart: 16 * 60 });
  runTo(at(6, 18));
  await open();
  editList('always', ['x']);
  assert.equal(st.listChangeLandsAt('always')?.at.getTime(), at(7, 8));
  runTo(at(7, 7, 55));
  assert.ok(asleep('reddit'));
  runTo(at(7, 8, 1));
  assert.ok(!asleep('reddit'));
});

test('on the first night, the always list waits for midnight and the bedtime list for bedtime', async () => {
  // First armed at 15:00. The always list waits for the midnight after protection was first
  // armed, and the windows (23:00, 23:44, 00:27, ...) swap it at the first one after then. The
  // bedtime list, awake in the day, goes by its first night: a removed app never sleeps, rather
  // than sleeping at 23:00 and waking at 00:27.
  await setUp(at(5, 15));
  editList('always', ['x']);
  assert.equal(st.listChangeStarts('always')?.getTime(), at(6, 0));
  const lands = st.listChangeLandsAt('always');
  assert.equal(lands?.at.getTime(), at(6, 0, 27));
  assert.equal(lands?.sleepsFirst, true);
  editList('night', ['tiktok']);
  assert.equal(st.listChangeStarts('night')?.getTime(), at(5, 23));
  assert.equal(st.listChangeLandsAt('night')?.sleepsFirst, false);
});

for (const openAt of [
  [21, 30],
  [22, 30],
] as const) {
  test(`an emergency, then an earlier bedtime from bed armed late: the pause ends with tonight (open at ${openAt.join(':')})`, async () => {
    await setUp(at(5, 12));
    runTo(at(5, 23, 30));
    await open();
    assert.ok(em.emergencyUnlock());
    await flush();
    runTo(at(5, 23, 35));
    // Earlier bedtime, later morning: arming waits out 07:00 to 08:00.
    await edit({ bedtime: 22 * 60, morningStart: 8 * 60 });
    runTo(at(6, openAt[0], openAt[1]));
    await open();
    runTo(at(6, 23, 10));
    assert.equal(em.getNightPause(), null);
    assert.equal(em.heldPhase(lc.readLock().phase), 'night');
    assert.ok(asleep('tiktok'));
  });
}

test("L1: a lapse found mid-night while an early first night's windows are armed doesn't skip the morning", async () => {
  // 00:30 to 08:00. At 06:22, from bed: bedtime 07:22, morning 06:32, Mondays only (armed at
  // once). At 06:26 the store says the subscription ended: Monday's morning still finishes.
  await setUp(at(4, 12), { bedtime: 30, morningStart: 8 * 60 });
  runTo(at(5, 6, 22));
  await open();
  await edit({ bedtime: 7 * 60 + 22, morningStart: 6 * 60 + 32, activeNights: [1] });
  runTo(at(5, 6, 26));
  lc.settleSubscription(false);
  drain();
  runChecking(at(5, 7, 59), () => assert.ok(asleep('tiktok'), `tiktok awake at ${new Date().toTimeString().slice(0, 5)}`));
});

/*
 * Round 52's review: a waiting removal is redated for the moment it was saved, and whether the
 * bedtime list was awake then is decided when it's saved (`awake`), not from the phone later.
 */

const hhmm = () => new Date().toTimeString().slice(0, 5);

test('a by-day removal stays at an early first night when Block now holds the bedtime list later', async () => {
  // 15:00: bedtime 21:00 (armed at once) and insta removed, due at 21:00. 15:30: Block now.
  await setUp(at(4, 12));
  await proveAt(at(5, 7, 10));
  runTo(at(5, 15));
  await edit({ bedtime: 21 * 60 });
  editList('night', ['tiktok']);
  assert.equal(st.listChangeStarts('night')?.getTime(), at(5, 21));
  runTo(at(5, 15, 30));
  await st.startNap('night', 15);
  lc.syncLock();
  drain();
  await open();
  assert.equal(st.listChangeStarts('night')?.getTime(), at(5, 21), `moved to ${st.listChangeStarts('night')}`);
});

test("the first day's by-day removal keeps its bedtime when Block now runs later", async () => {
  await setUp(at(5, 15));
  editList('night', ['tiktok']);
  assert.equal(st.listChangeStarts('night')?.getTime(), at(5, 23));
  runTo(at(5, 16));
  await st.startNap('night', 15);
  lc.syncLock();
  drain();
  await open();
  assert.equal(st.listChangeStarts('night')?.getTime(), at(5, 23), `moved to ${st.listChangeStarts('night')}`);
});

test('a removal made while a short Block now holds the bedtime list never sleeps the first night', async () => {
  await setUp(at(5, 15));
  runTo(at(5, 16));
  await st.startNap('night', 15);
  lc.syncLock();
  drain();
  editList('night', ['tiktok']);
  const from = st.listChangeStarts('night')?.getTime();
  runChecking(at(6, 6, 50), () => assert.ok(Date.now() < at(5, 16, 20) || !asleep('insta'), `insta asleep at ${hhmm()} (from ${new Date(from!)})`));
});

test('a by-day removal, then an earlier bedtime saved after it has passed: the removed app wakes, not a night later', async () => {
  // 12:00: insta removed (due 23:00). 21:30: bedtime 21:00, its first night held at once.
  await setUp(at(4, 12));
  await proveAt(at(5, 7, 10));
  runTo(at(5, 12));
  await open();
  editList('night', ['tiktok']);
  assert.equal(st.listChangeStarts('night')?.getTime(), at(5, 23));
  runTo(at(5, 21, 30));
  await open();
  await edit({ bedtime: 21 * 60 });
  await open();
  const from = st.listChangeStarts('night');
  assert.ok(asleep('tiktok'));
  runChecking(at(6, 7, 30), () =>
    assert.ok(Date.now() < at(5, 23, 5) || !asleep('insta'), `insta asleep at ${hhmm()} (removal now due ${from})`),
  );
});

test('a lapse found by day and renewed the same afternoon keeps a waiting removal and a looser limit at bedtime', async () => {
  await setUp(at(4, 12), {}, true);
  await proveAt(at(5, 7, 10));
  runTo(at(5, 10));
  await open();
  editList('always', ['x']);
  await setLimit(60);
  assert.equal(st.listChangeStarts('always')?.getTime(), at(5, 23));
  assert.equal(st.getLimits()[0].pending?.from, at(5, 23));
  runTo(at(5, 12));
  lc.settleSubscription(false);
  drain();
  assert.ok(st.isStoodDown());
  runTo(at(5, 15));
  lc.settleSubscription(true);
  drain();
  await armTonight();
  await flush();
  drain();
  await open();
  assert.equal(st.listChangeStarts('always')?.getTime(), at(5, 23), `always removal moved to ${st.listChangeStarts('always')}`);
  assert.equal(st.getLimits()[0].pending?.from, at(5, 23), `limit moved to ${new Date(st.getLimits()[0].pending!.from)}`);
});

test('an emergency at 23:30, then a long first night saved from bed and re-armed: the pause holds tonight', async () => {
  await setUp(at(4, 12));
  runTo(at(5, 23, 30));
  await open();
  assert.ok(em.emergencyUnlock());
  await flush();
  drain();
  runTo(at(5, 23, 35));
  await open();
  assert.ok(!asleep('tiktok'));
  await edit({ bedtime: 23 * 60 + 45, morningStart: 23 * 60 + 15 });
  runTo(at(5, 23, 50));
  await open();
  // Any re-arm inside that night (another tweak saved from bed).
  await edit({ stepGoal: 150 });
  runTo(at(5, 23, 55));
  await open();
  assert.ok(!asleep('tiktok'), `paused night re-shielded at ${hhmm()} (pause until ${em.getNightPause()})`);
});

test("a removal from bed while an earlier bedtime waits never lands inside that bedtime's early first night", async () => {
  // Armed since Monday. Wed 23:30, held: bedtime 21:00 (waits for Thu 23:00, armed at once).
  // 23:40: tiktok off the bedtime list. Thu 21:00 to Fri's proof is held early; tiktok must not
  // wake at 23:00 while insta stays asleep.
  await setUp(at(5, 12));
  await proveAt(at(6, 7, 10));
  await proveAt(at(7, 7, 10));
  runTo(at(7, 23, 30));
  await open();
  await edit({ bedtime: 21 * 60 });
  runTo(at(7, 23, 40));
  await open();
  editList('night', ['insta']);
  const from = st.listChangeStarts('night');
  await proveAt(at(8, 7, 30));
  runChecking(at(9, 6, 50), () =>
    assert.ok(!asleep('insta') || asleep('tiktok'), `tiktok awake in a held night at ${hhmm()} (removal due ${from})`),
  );
});

test('a removal from bed waiting for a bedtime an even earlier edit replaced moves past that night', async () => {
  // As above, then on Thursday the waiting 21:00 is replaced by 20:30: the removal, due Fri 21:00,
  // would land half an hour into Friday's night.
  await setUp(at(5, 12));
  await proveAt(at(6, 7, 10));
  await proveAt(at(7, 7, 10));
  runTo(at(7, 23, 30));
  await open();
  await edit({ bedtime: 21 * 60 });
  runTo(at(7, 23, 40));
  await open();
  editList('night', ['insta']);
  await proveAt(at(8, 7, 30));
  runTo(at(8, 12));
  await open();
  await edit({ bedtime: 20 * 60 + 30 });
  await open();
  const from = st.listChangeStarts('night');
  const check = () =>
    assert.ok(!asleep('insta') || asleep('tiktok'), `tiktok awake in a held night at ${hhmm()} (removal due ${from})`);
  runChecking(at(9, 7, 30), check);
  await proveAt(at(9, 7, 30));
  runChecking(at(10, 6, 50), check);
});

test('a by-day removal after an earlier bedtime and later morning saved from bed never sleeps in their first night', async () => {
  // Wed 23:30 from bed: bedtime 21:00, morning 09:00. Proved Thu 07:30; tiktok removed at 07:40
  // while the list is awake. An open after 09:00 arms the 21:00 windows: tiktok never sleeps
  // tonight rather than sleeping at 21:00 and waking at 23:15.
  await setUp(at(5, 12));
  await proveAt(at(6, 7, 10));
  await proveAt(at(7, 7, 10));
  runTo(at(7, 23, 30));
  await open();
  await edit({ bedtime: 21 * 60, morningStart: 9 * 60 });
  await proveAt(at(8, 7, 30));
  runTo(at(8, 7, 40));
  await open();
  editList('night', ['insta']);
  runTo(at(8, 9, 30));
  await open();
  await lc.armRoutine().catch(() => {});
  await flush();
  drain();
  const from = st.listChangeStarts('night');
  runChecking(at(9, 6, 50), () => assert.ok(!asleep('tiktok'), `tiktok asleep at ${hhmm()} (removal due ${from})`));
});
