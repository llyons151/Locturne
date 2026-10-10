/// <reference types="node" />

/**
 * Edits made from bed, against the simulated phone (sim-device.ts). GAME_PLAN: an edit waits for
 * the next bedtime, and an open from bed never wakes a night iOS holds.
 * - Windows still armed for an older routine (a deferred arming, the app closed) hold tonight
 *   from their bedtime (`asArmed`). A save from inside that night (an Undo, a step goal, a night
 *   switched off) must not read day, re-arm the windows away, or apply later tonight (`runsAs`).
 * - An emergency unlock after a later bedtime saved from bed pauses until the next bedtime, not
 *   the edit's bedtime later tonight; its parked list isn't "Bedtime ran, but nothing slept".
 * - A morning the old routine held stays locked when the edit turns that evening off.
 * Needs `--experimental-test-module-mocks` (set in the npm test script).
 */
import assert from 'node:assert/strict';
import { afterEach, mock, test } from 'node:test';
const { simDevice, token } = await import('./sim-device.ts');
const device = simDevice();
const fallback: string[] = [];
mock.module('react-native-device-activity', {
  namedExports: {
    ...device.exports,
    updateShield: (config: { title: string }) => {
      fallback.push(config.title);
    },
  },
});
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
const nt = await import('./notifications.ts');
const { readNightChecks } = await import('./heartbeat.ts');
const { armTonight } = await import('./arm.ts');
const { pendingLine, waitingNote } = await import('../features/routine/pending-line.ts');

type Routine = import('./routine.ts').Routine;

/** Day `day` of October 2026 at hh:mm, local time (Oct 1 is a Thursday, Oct 5 a Monday). */
const at = (day: number, hh: number, mm = 0) => new Date(2026, 9, day, hh, mm).getTime();
const hm = (date: Date) => date.toTimeString().slice(0, 5);

afterEach(() => {
  mock.timers.reset();
  device.reset();
  fallback.length = 0;
});

function advance(to: number) {
  for (const e of device.dueEvents(Date.now(), to)) {
    mock.timers.setTime(e.at);
    device.fire(e.activity, e.callback);
  }
  mock.timers.setTime(to);
}

async function flush() {
  for (let i = 0; i < 6; i++) await new Promise((resolve) => setImmediate(resolve));
}

async function setUp(now: number, routine: Partial<Routine> = {}) {
  mock.timers.enable({ apis: ['Date'], now });
  device.exports.setFamilyActivitySelectionId({ id: 'night', familyActivitySelection: token(['tiktok']) });
  device.exports.setFamilyActivitySelectionId({ id: 'always', familyActivitySelection: token(['reddit']) });
  lc.settleSubscription(true);
  rt.saveRoutine({ ...rt.DEFAULT_ROUTINE, ...routine });
  assert.equal((await armTonight()).status, 'armed');
}

/** The Routine tab's save of what's set (the waiting edit, or the routine in force) with `patch`. */
async function edit(patch: Partial<Routine>) {
  const now = new Date();
  const set = rt.getPendingRoutine(now)?.routine ?? rt.getRoutine(now);
  rt.saveRoutine({ ...set, ...patch }, now, lc.inPendingFirstNight(now));
  lc.syncLock();
  const result = await lc.armRoutine().catch(() => 'threw');
  await flush();
  return result;
}

const asleep = () => device.state.shielded.has('tiktok');

/**
 * Sweep #196's state: 23:00 to 07:00, Thursday's walk at 07:05, then 00:00 to 09:00 saved at
 * 07:10. Arming waits out the phantom night, the app stays closed, and at 23:00 the old windows
 * shield while the edit is in force.
 */
async function staleHeldNight() {
  await setUp(at(0, 12));
  advance(at(1, 7, 5));
  assert.ok(lc.proveMorning('steps'));
  advance(at(1, 7, 10));
  assert.equal(await edit({ bedtime: 0, morningStart: 9 * 60 }), 'deferred');
  advance(at(1, 23, 30));
  assert.ok(asleep(), 'the old windows shield at 23:00');
  assert.equal(lc.syncLock().phase, 'night');
}

const variants: [string, (r: Routine) => Partial<Routine>][] = [
  ['the same routine saved again', () => ({})],
  ['a step goal', (r) => ({ stepGoal: r.stepGoal + 100 })],
  ['tonight switched off', (r) => ({ activeNights: r.activeNights.filter((d) => d !== 4) })],
  ['an Undo back to the old times', () => ({ bedtime: 23 * 60, morningStart: 7 * 60 })],
  ['a later bedtime', () => ({ bedtime: 60 })],
];

for (const [name, patch] of variants) {
  test(`a save from inside a night the old windows hold (${name}) waits for the next bedtime`, async () => {
    await staleHeldNight();
    await edit(patch(rt.getRoutine()));
    const pending = rt.getPendingRoutine();
    assert.ok(pending);
    // Not tonight's 00:00 by the routine's own bedtime: Friday's, after the held night.
    assert.ok(pending.from >= at(2, 23), new Date(pending.from).toString());
    assert.equal(lc.readLock().phase, 'night', 'still the held night');
    assert.ok(asleep(), 'the save woke nothing');
    // Re-arming waits out the night the old windows hold, and the night runs to morning.
    advance(at(2, 0, 30));
    lc.syncLock();
    await flush();
    assert.equal(lc.readLock().phase, 'night');
    assert.ok(asleep(), 'still asleep at 00:30');
    advance(at(2, 9, 30));
    lc.syncLock();
    await flush();
    assert.equal(lc.readLock().phase, 'morning', 'the morning still needs a wake-up');
    assert.ok(asleep());
  });
}

test('the bedtime warning follows the old windows while an edit waits, unless they are the edit’s', () => {
  // In force 00:00 to 09:00 since Wednesday; iOS still runs 23:00 to 07:00 windows armed before
  // it; a step goal waits for Friday's bedtime. Thursday 22:00: the apps sleep at 23:00.
  const inForce = { ...rt.DEFAULT_ROUTINE, bedtime: 0, morningStart: 9 * 60 };
  const facts = (armed: { bedtime: number; morningStart: number; armedAt: string }, pending: Routine) =>
    nt.planNotifications({
      routine: inForce,
      pending: { routine: pending, from: at(2, 23) },
      protection: 'on',
      armed: true,
      armedTimes: armed,
      routineSince: at(0, 23),
      armedSince: new Date(at(0, 12)),
      proofs: [],
      now: new Date(at(1, 22)),
      days: 1,
    })
      .filter((n) => n.kind === 'bedtime')
      .map((n) => hm(n.at));
  const stale = { bedtime: 23 * 60, morningStart: 7 * 60, armedAt: new Date(at(0, 12)).toISOString() };
  assert.deepEqual(facts(stale, { ...inForce, stepGoal: 300 }).slice(0, 1), ['22:45']);
  // An Undo back to the old times: still the old windows (armed before the routine in force).
  assert.deepEqual(facts(stale, { ...inForce, bedtime: 23 * 60, morningStart: 7 * 60 }).slice(0, 1), ['22:45']);
  // Windows armed early for a waiting 23:30 edit are judged by `holdsEarly`, not moved onto
  // the routine in force: tonight is still the routine in force's 00:00.
  const early = { bedtime: 23 * 60 + 30, morningStart: 9 * 60, armedAt: new Date(at(1, 15)).toISOString() };
  assert.deepEqual(facts(early, { ...inForce, bedtime: 23 * 60 + 30 }).slice(0, 1), ['23:45']);
});

test('an earlier bedtime saved in the day still starts early, armed for the edit itself', async () => {
  await setUp(at(4, 12));
  advance(at(5, 7, 30));
  assert.ok(lc.proveMorning('steps'));
  advance(at(5, 15));
  await edit({ bedtime: 22 * 60 });
  assert.equal(st.getArmedNight()?.bedtime, 22 * 60, 'tightening is armed at once');
  assert.equal(lc.readLock().phase, 'day');
  advance(at(5, 22, 10));
  assert.ok(asleep());
  assert.equal(lc.syncLock().phase, 'night', 'the edit governs its early first night');
  // A save in bed from inside it waits for the next bedtime (#179) and keeps the night.
  await edit({ stepGoal: 300 });
  assert.equal(lc.readLock().phase, 'night');
  assert.ok(asleep());
});

test('an earlier bedtime whose night has begun is announced as started, as the banner says', async () => {
  await setUp(at(4, 12));
  advance(at(5, 7, 30));
  assert.ok(lc.proveMorning('steps'));
  advance(at(5, 21, 20));
  // The Routine tab's save. Its sync starts arming the 21:00 windows, but iOS hasn't named them
  // yet: the bare waiting note (what VoiceOver used to hear) still names the old 23:00 start.
  const now = new Date();
  rt.saveRoutine({ ...rt.getRoutine(now), bedtime: 21 * 60 }, now, lc.inPendingFirstNight(now));
  lc.syncLock();
  const from = new Date(rt.getPendingRoutine(now)!.from);
  assert.match(waitingNote(from, new Date()), /bedtime, 11\u00a0?pm|11 pm/);
  const started = 'Your changes started at tonight’s new bedtime, 9\u00a0pm.';
  assert.equal(pendingLine(from, 21 * 60, new Date()), started);
  await lc.armRoutine();
  await flush();
  assert.ok(asleep(), 'the 21:00 windows shield at once');
  assert.equal(pendingLine(from, 21 * 60, new Date()), started, 'and once arming settles');
});

test('an emergency after a later bedtime saved from bed pauses until the next bedtime', async () => {
  await setUp(at(5, 12));
  advance(at(6, 23, 20));
  await edit({ bedtime: 23 * 60 + 45 });
  assert.equal(lc.readLock().phase, 'night', 'the edit waits for the next bedtime');
  advance(at(6, 23, 30));
  const use = em.emergencyUnlock();
  assert.ok(use?.pauseNight);
  // Not 23:45 tonight: the edit applies tomorrow at the old bedtime.
  assert.equal(use.resumesAt, at(7, 23));
  assert.equal(asleep(), false);
  advance(at(7, 0, 30)); // the 23:45 window ran with the app closed
  assert.equal(asleep(), false, 'the paused night stays awake');
  lc.syncLock();
  assert.equal(asleep(), false);
  // The window that ran during the pause found the bedtime list parked: not a broken bedtime.
  assert.ok(readNightChecks().every((n) => n.verdict !== 'noShield'), JSON.stringify(readNightChecks()));
});

test("the emergency wait screen's wording never applies an earlier morning saved from bed", async () => {
  // Proved Tuesday 07:30. At 23:30, held: morning start 23:45 (waits for Wednesday 23:00).
  // Exits renders the pause wording, then "Go back to sleep": nothing unlocked.
  await setUp(at(5, 12));
  advance(at(6, 7, 30));
  lc.syncLock();
  assert.ok(lc.proveMorning('steps'));
  advance(at(6, 23, 30));
  lc.syncLock();
  assert.ok(asleep());
  await edit({ morningStart: 23 * 60 + 45 });
  const plan = em.previewEmergency();
  assert.ok(plan?.resumesAt);
  em.pauseWording(new Date(plan.resumesAt));
  assert.ok(rt.getPendingRoutine(), 'the edit still waits');
  advance(at(6, 23, 50));
  lc.syncLock();
  assert.equal(lc.readLock().phase, 'night');
  assert.ok(st.isNightHeld());
  assert.ok(asleep());
  assert.equal(em.getEmergencyLog().length, 0);
});

test("the emergency wait screen's wording never applies tonight switched off from bed", async () => {
  // Monday 23:10, held: Monday night off (waits for Tuesday 23:00). Exits renders the wording.
  await setUp(at(5, 12));
  advance(at(5, 23, 10));
  lc.syncLock();
  assert.ok(asleep());
  await edit({ activeNights: [0, 2, 3, 4, 5, 6] });
  const plan = em.previewEmergency();
  assert.ok(plan?.resumesAt);
  em.pauseWording(new Date(plan.resumesAt));
  assert.ok(rt.getPendingRoutine(), 'the edit still waits');
  advance(at(5, 23, 50));
  assert.ok(asleep(), 'the next window keeps the night');
  advance(at(6, 7, 30));
  assert.ok(asleep(), 'and the morning');
});

test('the shield fallback during a paused night is the always list’s, not the bedtime words', async () => {
  await setUp(at(5, 12));
  advance(at(5, 23, 30));
  assert.ok(em.emergencyUnlock()?.pauseNight);
  assert.equal(lc.readLock().phase, 'night');
  assert.ok(device.state.shielded.has('reddit'), 'the always list stays asleep');
  assert.doesNotMatch(fallback.at(-1) ?? '', /sleeping/i);
  assert.equal(fallback.at(-1), 'Shh. It’s asleep.');
});

test('the shield fallback on a night with an empty bedtime list is the always list’s, not the bedtime words', async () => {
  await setUp(at(5, 12));
  // Every bedtime app swiped away by day: the removal waits for bedtime, then lands.
  st.beginListEdit('night');
  st.clearSelection('night-next');
  assert.equal(st.finishListEdit('night', new Date(at(5, 23))), 'bedtime');
  advance(at(5, 23, 30));
  assert.equal(st.selectionSize('night'), 0, 'the removal landed at bedtime');
  fallback.length = 0;
  assert.equal(lc.syncLock().phase, 'night');
  assert.ok(device.state.shielded.has('reddit'), 'the always list stays asleep');
  assert.doesNotMatch(fallback.at(-1) ?? '', /sleeping/i);
  assert.equal(fallback.at(-1), 'Shh. It’s asleep.');
  advance(at(6, 2));
  fallback.length = 0;
  lc.syncLock();
  assert.doesNotMatch(fallback.at(-1) ?? '', /awake/i);
  assert.equal(fallback.at(-1), 'Shh. It’s asleep.');
});

test('a morning the old routine held stays locked when the edit switches that evening off', async () => {
  await setUp(at(4, 12));
  advance(at(5, 10));
  lc.syncLock();
  assert.equal(lc.readLock().phase, 'morning', 'Monday morning, not proven');
  // A night shift with Sunday evening off, applying at Monday 23:00.
  await edit({ bedtime: 8 * 60, morningStart: 16 * 60, activeNights: [1, 2, 3, 4, 5, 6] });
  advance(at(5, 23, 10));
  lc.syncLock();
  await flush();
  assert.equal(lc.readLock().phase, 'morning', 'Sunday night really ran: its morning stays locked');
  assert.ok(asleep());
  // And the wake-up still lifts it.
  assert.ok(lc.proveMorning('steps'));
  assert.equal(lc.readLock().phase, 'day');
  assert.equal(asleep(), false);
});
