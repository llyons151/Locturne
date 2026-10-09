/// <reference types="node" />

/**
 * Mornings after the last one a lapsed subscription covers, against the simulated phone
 * (sim-device.ts). GAME_PLAN: nothing sleeps without a subscription beyond the night or morning
 * under way when the end was found. The monitor extension skips later nights, so:
 * - opened offline in such a morning, a pass, a scan or a walk proves nothing: no pass spent,
 *   no `morning_unlocked` (a proof) for a non-subscriber;
 * - the self-check doesn't list those nights (they'd read on time from the skipped windows);
 * - a renewal found in such a morning doesn't put the apps to sleep, since iOS held nothing
 *   overnight; a renewal at night still re-shields at once.
 * Also: a re-arm with the same times inside a night doesn't drop it from the self-check.
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
const ps = await import('./passes.ts');
const sc = await import('./scan.ts');
const mp = await import('./morning-proof.ts');
const { planNightWindows } = await import('./night-plan.ts');
const { readNightChecks } = await import('./heartbeat.ts');
const { armTonight } = await import('./arm.ts');

/** Day `day` of October 2026 at hh:mm, local time (Oct 5 is a Monday). */
const at = (day: number, hh: number, mm = 0) => new Date(2026, 9, day, hh, mm).getTime();
const asleep = () => device.state.shielded.has('tiktok');

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

async function setUp(now: number, routine: Partial<import('./routine.ts').Routine> = {}) {
  mock.timers.enable({ apis: ['Date'], now });
  device.exports.setFamilyActivitySelectionId({ id: 'night', familyActivitySelection: token(['tiktok']) });
  lc.settleSubscription(true);
  rt.saveRoutine({ ...rt.DEFAULT_ROUTINE, ...routine });
  assert.equal((await armTonight()).status, 'armed');
}

test('offline in a morning after the last paid one: a pass, a scan and a walk prove nothing', async () => {
  await setUp(at(5, 12), { method: 'scan' });
  assert.equal(sc.registerScanCode({ kind: 'qr', type: 'qr', data: 'LOCTURNE-ABCDEFGH' }), null);
  advance(at(5, 23, 30));
  // Lapse found Monday night: Monday's night and Tuesday's morning finish.
  lc.settleSubscription(false);
  assert.ok(asleep(), 'the night under way finishes');
  // Tuesday night skipped by the extension; opened offline Wednesday 07:30 (no store answer).
  advance(at(7, 7, 30));
  assert.ok(!asleep(), 'the extension skipped the night after the last paid morning');
  lc.syncLock();
  const state = lc.readLock();
  assert.equal(state.phase, 'morning', 'the clock still says morning');
  assert.ok(lc.pastLastPaid(state.morningKey));
  assert.equal(em.heldPhase('morning'), 'day');
  assert.equal(em.heldPhase('night'), 'day');

  let proofs = 0;
  const off = mp.onProofChange(() => proofs++);
  try {
    assert.equal(ps.getPassRefusal(), 'notMorning');
    assert.equal(ps.spendPass(), 'notMorning');
    assert.equal(ps.getPassesLeft(), ps.PASSES_PER_MONTH, 'no pass spent');
    assert.equal(sc.submitScan('LOCTURNE-ABCDEFGH'), 'notMorning');
    assert.equal(lc.proveMorning('steps'), null);
    assert.equal(lc.proveMorning('downstairs'), null);
    assert.equal(em.previewEmergency(), null, 'nothing for an emergency to lift');
  } finally {
    off();
  }
  assert.equal(proofs, 0, 'no proof recorded, so no morning_unlocked');
  assert.equal(lc.currentProof(), null);
  assert.ok(!asleep());
});

test('the last paid morning itself can still be proved', async () => {
  await setUp(at(5, 12));
  advance(at(5, 23, 30));
  lc.settleSubscription(false);
  advance(at(6, 7, 30));
  assert.equal(lc.readLock().phase, 'morning');
  assert.ok(!lc.pastLastPaid(lc.readLock().morningKey));
  assert.equal(ps.getPassRefusal(), null);
  assert.equal(lc.proveMorning('steps')?.phase, 'day');
});

test('an emergency unlock in the last paid night promises no bedtime after it', async () => {
  await setUp(at(5, 12));
  advance(at(5, 23, 30));
  // Lapse found Monday 23:30: Monday night and Tuesday morning finish, Tuesday night doesn't.
  lc.settleSubscription(false);
  const use = em.emergencyUnlock();
  assert.equal(use?.pauseNight, true);
  const words = em.pauseWording(new Date(use!.resumesAt!));
  assert.equal(words.resumes, null, 'Tuesday 23:00 never sleeps, so nothing names it');
  assert.equal(words.ended, true);
  assert.equal(words.weekday, null);
  advance(at(6, 23, 30));
  lc.syncLock();
  assert.ok(!asleep(), 'and indeed nothing sleeps Tuesday night');
});

test('an emergency unlock while subscribed still names the next bedtime', async () => {
  await setUp(at(5, 12));
  advance(at(5, 23, 30));
  const use = em.emergencyUnlock();
  const words = em.pauseWording(new Date(use!.resumesAt!));
  assert.equal(words.resumes?.getTime(), at(6, 23));
  assert.equal(words.ended, false);
});

test('the self-check skips nights after the last paid morning', async () => {
  await setUp(at(5, 12));
  advance(at(5, 23, 30));
  lc.settleSubscription(false);
  advance(at(7, 7, 30));
  const keys = readNightChecks().map((c) => c.morningKey);
  assert.ok(keys.includes('2026-10-06'), 'the last paid night is judged');
  assert.ok(!keys.includes('2026-10-07'), 'the skipped night is not reported (it read onTime before)');
});

test('a renewal in a morning whose night the lapse skipped keeps it free', async () => {
  await setUp(at(4, 12));
  advance(at(5, 3));
  assert.ok(asleep());
  // Lapse found inside Sunday night: it and Monday's morning finish. Monday is never proved.
  lc.settleSubscription(false);
  assert.ok(asleep(), 'the night under way holds');
  advance(at(6, 7, 30));
  assert.ok(!asleep(), 'Monday night skipped, so nothing holds Tuesday morning');
  // Billing retry renewed it; the store says so on this open.
  lc.settleSubscription(true);
  lc.syncLock();
  assert.ok(!asleep(), 'a renewal must not put the apps to sleep for a night iOS never held');
  assert.equal(lc.readLock().phase, 'day');
  // The next night locks as usual.
  advance(at(6, 23, 30));
  lc.syncLock();
  assert.ok(asleep());
  assert.equal(lc.readLock().phase, 'night');
});

test('a renewal at night after a skipped bedtime re-shields at once', async () => {
  await setUp(at(4, 12));
  advance(at(5, 3));
  lc.settleSubscription(false);
  advance(at(5, 23, 30));
  assert.ok(!asleep(), 'the extension skipped Monday night');
  lc.settleSubscription(true);
  assert.ok(asleep(), 'renewed inside the night: the bedtime apps sleep now');
});

test('a re-arm with the same times inside a night keeps that night in the self-check', async () => {
  await setUp(at(5, 12));
  const first = st.getArmedNight()!;
  advance(at(6, 1));
  // A same-times re-arm (a window iOS lost, put back).
  await st.armNight(planNightWindows(first.bedtime, first.morningStart), 'night', first);
  const again = st.getArmedNight()!;
  assert.notEqual(again.armedAt, first.armedAt);
  assert.equal(again.timesSince, first.timesSince ?? first.armedAt, 'the times were first armed Monday');
  advance(at(6, 7, 30));
  const night = readNightChecks().find((c) => c.morningKey === '2026-10-06');
  assert.equal(night?.verdict, 'onTime', 'the night under way at the re-arm is still judged');
  // New times start a new record of when they were armed.
  advance(at(6, 12));
  await st.armNight(planNightWindows(22 * 60, 7 * 60), 'night', { bedtime: 22 * 60, morningStart: 7 * 60 });
  assert.equal(st.getArmedNight()!.timesSince, st.getArmedNight()!.armedAt);
});
