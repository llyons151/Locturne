/// <reference types="node" />

/**
 * Two ways an edit's bedtime moved when something else starts, against the simulated phone
 * (sim-device.ts).
 * - An emergency unlock pauses only tonight (GAME_PLAN): an earlier bedtime saved afterwards
 *   (from bed, armed at once since it only tightens) is the next bedtime, so the parked
 *   bedtime picks come back at it, with the app closed, and nothing says otherwise.
 * - Looser edits (removals from a standing list, a looser or removed daily limit) wait for the
 *   routine's next bedtime. A throwaway edit (bedtime in five minutes, armed at once) must not
 *   pull them forward to its first window, from bed or in the day, with or without an Undo
 *   (security audit, round 50).
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
const em = await import('./emergency.ts');
const dl = await import('./daily-limits.ts');
const { readNightChecks } = await import('./heartbeat.ts');
const { armTonight } = await import('./arm.ts');

type Routine = import('./routine.ts').Routine;

/** Day `day` of October 2026 at hh:mm, local time (Oct 5 is a Monday). */
const at = (day: number, hh: number, mm = 0) => new Date(2026, 9, day, hh, mm).getTime();
const asleep = (app: string) => device.state.shielded.has(app);
const flush = async () => {
  for (let i = 0; i < 6; i++) await new Promise((r) => setImmediate(r));
};

afterEach(() => {
  mock.timers.reset();
  device.reset();
});

/** The phone with the app closed until `to`. */
function advance(to: number) {
  for (const e of device.dueEvents(Date.now(), to)) {
    mock.timers.setTime(e.at);
    device.fire(e.activity, e.callback);
  }
  mock.timers.setTime(to);
}

async function setUp(now: number, night = ['tiktok'], always: string[] = []) {
  mock.timers.enable({ apis: ['Date'], now });
  device.exports.setFamilyActivitySelectionId({ id: 'night', familyActivitySelection: token(night) });
  if (always.length) device.exports.setFamilyActivitySelectionId({ id: 'always', familyActivitySelection: token(always) });
  lc.settleSubscription(true);
  rt.saveRoutine(rt.DEFAULT_ROUTINE);
  assert.equal((await armTonight()).status, 'armed');
}

/** The Routine tab's save (and its Undo, which saves the routine in force). */
async function edit(patch: Partial<Routine>) {
  const now = new Date();
  const base = rt.getPendingRoutine(now)?.routine ?? rt.getRoutine(now);
  rt.saveRoutine({ ...base, ...patch }, now, lc.inPendingFirstNight(now));
  lc.syncLock();
  if (st.getArmedNight()) await lc.armRoutine().catch(() => {});
  await flush();
}

async function open() {
  lc.syncLock();
  await st.settleLimitChanges().catch(() => {});
  lc.syncLock();
  await flush();
}

/** The Apps tab's picker on a standing list, then Done (`pickedList` in apps-list.tsx). */
function editList(list: 'night' | 'always', apps: string[]) {
  const draft = st.beginListEdit(list);
  const ids = { ...device.ids() };
  if (apps.length) ids[draft] = token(apps);
  else delete ids[draft];
  device.exports.userDefaultsSet('familyActivitySelectionIds', ids);
  st.finishListEdit(list, lc.looserEditsStartAt(new Date()));
  st.reapplyStandingBlocks();
}

const clock = (d: Date) => d.getHours() * 60 + d.getMinutes();

test('an earlier bedtime saved from bed after an emergency unlock ends the pause at that bedtime', async () => {
  await setUp(at(5, 12));
  advance(at(6, 23, 30));
  assert.ok(em.emergencyUnlock()?.pauseNight);
  assert.equal(em.getNightPause()?.getTime(), at(7, 23));
  assert.ok(!asleep('tiktok'));
  advance(at(6, 23, 36));
  await edit({ bedtime: 22 * 60 });
  assert.equal(st.getArmedNight()?.bedtime, 22 * 60, 'an earlier bedtime is armed at once');
  // Tonight stays paused; the pause now ends at the new bedtime, and the words say so.
  assert.ok(!asleep('tiktok'), 'still paused tonight');
  assert.equal(em.getNightPause()?.getTime(), at(7, 22));
  assert.equal(st.listChangeStarts('night')?.getTime(), at(7, 22), 'the parked picks come back at 22:00');
  const words = em.pauseWording(em.getNightPause()!);
  assert.equal(clock(words.resumes!), 22 * 60);
  assert.equal(words.weekday, null);
  // Wednesday, app closed: the 22:00 window puts the picks back and shields them.
  advance(at(7, 22, 10));
  assert.ok(asleep('tiktok'), 'the 22:00 night locks with the app closed');
  lc.syncLock();
  assert.equal(lc.readLock().phase, 'night');
  assert.equal(em.getNightPause(), null);
  advance(at(8, 7, 30));
  const checks = readNightChecks();
  assert.equal(checks.find((c) => c.morningKey === '2026-10-08')?.verdict, 'onTime');
  assert.notEqual(checks.find((c) => c.morningKey === '2026-10-07')?.verdict, 'noShield', 'the paused night is not a failure');
});

test('a later bedtime saved after an emergency unlock leaves the pause as it was', async () => {
  await setUp(at(5, 12));
  advance(at(6, 23, 30));
  em.emergencyUnlock();
  await edit({ bedtime: 23 * 60 + 45 });
  assert.equal(em.getNightPause()?.getTime(), at(7, 23));
  assert.ok(!asleep('tiktok'));
});

test('an earlier bedtime saved the day after an emergency unlock locks that evening', async () => {
  await setUp(at(5, 12));
  advance(at(6, 23, 30));
  em.emergencyUnlock();
  advance(at(7, 9));
  await open();
  await edit({ bedtime: 21 * 60 });
  assert.equal(em.getNightPause()?.getTime(), at(7, 21));
  advance(at(7, 21, 5));
  assert.ok(asleep('tiktok'));
});

for (const [label, day, hh, proven] of [
  ['02:00, inside the night', 6, 2, true],
  ['08:00, an unproven morning', 6, 8, false],
] as const) {
  test(`a throwaway bedtime from bed at ${label} doesn't pull list removals forward`, async () => {
    await setUp(at(4, 12), ['tiktok', 'insta'], ['reddit']);
    advance(at(5, 7, 10));
    await open();
    if (proven) lc.proveMorning('downstairs');
    advance(at(day, hh));
    await open();
    const phase = lc.readLock().phase;
    assert.ok(phase === 'night' || phase === 'morning');
    assert.ok(['tiktok', 'insta', 'reddit'].every(asleep));
    // Bedtime in five minutes (armed at once), drop an app from each list, then Undo.
    await edit({ bedtime: hh * 60 + 5 });
    editList('night', ['tiktok']);
    editList('always', []);
    assert.equal(st.listChangeStarts('night')?.getTime(), at(day, 23), 'removals wait for the real bedtime');
    assert.equal(st.listChangeStarts('always')?.getTime(), at(day, 23));
    await edit({ ...rt.getRoutine() });
    advance(at(day, hh, 6));
    await open();
    assert.equal(lc.readLock().phase, phase);
    assert.ok(asleep('insta'), 'the bedtime app stays asleep until the morning is proved');
    assert.ok(asleep('reddit'), 'the always app stays asleep until bedtime');
  });
}

test('a throwaway bedtime in the day pulls neither an always-list removal nor a limit removal forward', async () => {
  await setUp(at(4, 12), ['tiktok'], ['reddit']);
  advance(at(5, 7, 10));
  await open();
  lc.proveMorning('downstairs');
  advance(at(5, 9));
  await open();
  const id = dl.freeLimitId(st.getLimits())!;
  const draft = st.beginListEdit(id);
  device.exports.userDefaultsSet('familyActivitySelectionIds', { ...device.ids(), [draft]: token(['youtube']) });
  st.finishListEdit(id, lc.looserEditsStartAt(new Date()));
  const limit = { id, minutes: 30 };
  await st.armLimit(limit);
  st.saveLimits([limit]);
  st.reapplyStandingBlocks();
  assert.ok(device.use(id, 31));
  while (device.state.queue.length) {
    const e = device.state.queue.shift()!;
    device.fire(e.activity, e.callback);
  }
  advance(at(5, 10));
  await open();
  assert.ok(asleep('youtube') && asleep('reddit'));
  await edit({ bedtime: 10 * 60 + 5 });
  editList('always', []);
  const next = dl.editLimit(st.getLimits(), id, null, lc.looserEditsStartAt(new Date()));
  st.saveLimits(next);
  assert.equal(next[0].pending?.from, at(5, 23), 'a looser limit waits for the routine’s bedtime');
  await edit({ ...rt.getRoutine() });
  advance(at(5, 10, 7));
  await open();
  assert.ok(asleep('reddit'), 'the always-list removal waits for 23:00');
  assert.ok(asleep('youtube'), 'the used-up limit stays until 23:00');
});

test('with nothing armed, a looser edit waits for midnight', async () => {
  mock.timers.enable({ apis: ['Date'], now: at(5, 14) });
  assert.equal(lc.looserEditsStartAt().getTime(), at(6, 0));
});
