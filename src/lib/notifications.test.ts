/// <reference types="node" />

/**
 * The notification plan. The native modules are faked, so this runs without a phone.
 * Needs `--experimental-test-module-mocks` (set in the npm test script).
 */
import assert from 'node:assert/strict';
import { mock, test } from 'node:test';

const noop = () => undefined;
mock.module('react-native', { namedExports: { Platform: { OS: 'web' } } });
mock.module('expo-notifications', {
  namedExports: {
    setNotificationHandler: noop,
    IosAuthorizationStatus: { NOT_DETERMINED: 0, DENIED: 1, AUTHORIZED: 2 },
    SchedulableTriggerInputTypes: { DATE: 'date', CALENDAR: 'calendar' },
  },
});
// Off iOS the Screen Time wrapper keeps the App Group in memory; only the names must exist.
mock.module('react-native-device-activity', {
  namedExports: Object.fromEntries(
    [
      'activitySelectionMetadata',
      'blockSelection',
      'cleanUpAfterActivity',
      'configureActions',
      'getActivities',
      'getAuthorizationStatus',
      'getEvents',
      'getFamilyActivitySelectionId',
      'isShieldActive',
      'intersection',
      'onAuthorizationStatusChange',
      'pollAuthorizationStatus',
      'requestAuthorization',
      'setFamilyActivitySelectionId',
      'startMonitoring',
      'stopMonitoring',
      'unblockSelection',
      'union',
      'updateShield',
      'updateShieldWithId',
      'userDefaultsGet',
      'userDefaultsRemove',
      'userDefaultsSet',
    ]
      .map((name) => [name, noop] as [string, unknown])
      .concat([
        ['isAvailable', () => false],
        ['AuthorizationStatus', { notDetermined: 0, denied: 1, approved: 2 }],
      ]),
  ),
});

const {
  BEDTIME_WARNING,
  isGoodMomentToAsk,
  opensWakeScreen,
  planNotifications,
  planTrialReminder,
  shieldTapNotification,
  setupScanShowing,
  wakeScreenShowing,
} =
  await import('./notifications.ts');
const { DEFAULT_ROUTINE } = await import('./routine.ts');

type Facts = Parameters<typeof planNotifications>[0];
const H = 60;
/** Local time, so the tests pass in every zone `npm run test:tz` runs. Oct 3, 2026 is a Saturday. */
const at = (day: number, hour: number, minute = 0) => new Date(2026, 9, day, hour, minute);
const plan = (more: Partial<Facts> = {}) =>
  planNotifications({ routine: DEFAULT_ROUTINE, protection: 'on', armed: true, now: at(3, 12), days: 2, ...more });
const summary = (p: ReturnType<typeof plan>) => p.map((n) => `${n.kind} ${n.at.getDate()} ${n.at.getHours()}:${n.at.getMinutes()}`);

test('empty bedtime picks schedule no false sleep claims; pending removals and parked restorations follow their actual handoff', () => {
  assert.deepEqual(plan({ nightSelection: { hasApps: false } }), []);
  assert.deepEqual(plan({ nightSelection: { hasApps: true, change: { at: at(3, 23), hasApps: false } } }), []);
  const restored = plan({ now: at(4, 2), nightSelection: { hasApps: false, change: { at: at(4, 23), hasApps: true } } });
  assert.equal(restored.some((n) => n.kind === 'morning' && n.at.getDate() === 4), false);
  assert.equal(restored.some((n) => n.kind === 'bedtime' && n.at.getDate() === 4), true);
  assert.equal(restored.some((n) => n.kind === 'morning' && n.at.getDate() === 5), true);
});

test('each night: a bedtime warning 15 minutes before, and a note at morning start', () => {
  // Default routine is 23:00 to 07:00. From Saturday noon, two days ahead.
  assert.deepEqual(summary(plan()), ['bedtime 3 22:45', 'morning 4 7:0', 'bedtime 4 22:45', 'morning 5 7:0']);
  assert.equal(BEDTIME_WARNING, 15);
  assert.ok(plan().every((n) => n.id.startsWith('locturne.')));
  assert.equal(new Set(plan().map((n) => n.id)).size, 4);
});

test('nothing in the past; during the night only the morning note is left', () => {
  assert.deepEqual(summary(plan({ now: at(4, 2), days: 0 })), ['morning 4 7:0']);
});

test('after a lapse, only the morning still covered gets a note; later nights get nothing', () => {
  // Found lapsed at 02:00 on the 4th: that morning finishes, nothing after it sleeps.
  assert.deepEqual(summary(plan({ now: at(4, 2), lastPaidMorning: '2026-10-04' })), ['morning 4 7:0']);
});

test('an earlier bedtime on an evening that was off starts at the edit, not early (iOS doesn\'t hold it)', () => {
  const offSaturday = { ...DEFAULT_ROUTINE, activeNights: [0, 1, 2, 3, 4, 5] };
  const pending = { routine: { ...DEFAULT_ROUTINE, bedtime: 21 * H + 30 }, from: at(3, 23).getTime() };
  const first = summary(plan({ routine: offSaturday, pending })).find((n) => n.startsWith('bedtime 3'));
  assert.equal(first, 'bedtime 3 22:45');
});

test('an earlier bedtime whose arming waits warns at the bedtime iOS still has', () => {
  // At 07:05 on the 3rd, after the walk, bedtime moves 23:00 to 22:00 and the morning 07:00
  // to 08:00. Arming waits for 08:00 (wake/arming.ts), so until a sync after it iOS has the
  // 23:00 windows: with the app left closed the apps sleep at 23:00.
  const pending = { routine: { ...DEFAULT_ROUTINE, bedtime: 22 * H, morningStart: 8 * H }, from: at(3, 23).getTime() };
  const deferred = plan({ pending, now: at(3, 7, 5), armedTimes: { bedtime: 23 * H, morningStart: 7 * H } });
  assert.equal(summary(deferred).find((n) => n.startsWith('bedtime 3')), 'bedtime 3 22:45');
  // The sync that arms the edit re-plans (`onArmed`): now 22:00 is held.
  const armed = plan({ pending, now: at(3, 8, 30), armedTimes: { bedtime: 22 * H, morningStart: 8 * H } });
  assert.equal(summary(armed).find((n) => n.startsWith('bedtime 3')), 'bedtime 3 21:45');
});

test('after the edit applies, windows still armed for the old times decide the warning', () => {
  // The later bedtime (00:00, mornings 09:00) is in force, but its arming waited and nothing
  // re-armed: iOS still has 23:00 to 07:00, and with the app closed the apps sleep at 23:00.
  const later = { ...DEFAULT_ROUTINE, bedtime: 0, morningStart: 9 * H };
  const stale = plan({ routine: later, now: at(3, 23, 10), days: 2, armedTimes: { bedtime: 23 * H, morningStart: 7 * H } });
  assert.deepEqual(summary(stale), ['morning 4 9:0', 'bedtime 4 22:45', 'morning 5 9:0']);
  // The same for an earlier bedtime: nothing sleeps before the armed 22:30.
  const earlier = { ...DEFAULT_ROUTINE, bedtime: 21 * H, morningStart: 5 * H };
  const old = plan({ routine: earlier, now: at(3, 12), days: 1, armedTimes: { bedtime: 22 * H + 30, morningStart: 5 * H } });
  assert.equal(summary(old).find((n) => n.startsWith('bedtime 3')), 'bedtime 3 22:15');
});

test('nights switched off get nothing, including their morning', () => {
  // Saturday (6) off: no warning on the 3rd and no morning note on the 4th.
  const routine = { ...DEFAULT_ROUTINE, activeNights: [0, 1, 2, 3, 4, 5] };
  assert.deepEqual(summary(plan({ routine })), ['bedtime 4 22:45', 'morning 5 7:0']);
});

test('a bedtime after midnight belongs to the evening before, and its warning can cross midnight', () => {
  const routine = { ...DEFAULT_ROUTINE, bedtime: 0, morningStart: 7 * H, activeNights: [6] };
  // Saturday's night starts at 00:00 Sunday; the warning is 23:45 Saturday.
  assert.deepEqual(summary(plan({ routine })), ['bedtime 3 23:45', 'morning 4 7:0']);
});

test('an edit waiting for bedtime applies from its first night', () => {
  const pending = { routine: { ...DEFAULT_ROUTINE, bedtime: 22 * H, morningStart: 6 * H }, from: at(4, 22).getTime() };
  assert.deepEqual(summary(plan({ pending })), ['bedtime 3 22:45', 'morning 4 7:0', 'bedtime 4 21:45', 'morning 5 6:0']);
});

test('no morning promise for a morning already unlocked, or one whose night was armed too late', () => {
  // An emergency unlock at 2am on the 4th records that morning as unlocked.
  const emergency = { morningKey: '2026-10-04', kind: 'emergency' as const, at: at(4, 2).getTime() };
  assert.deepEqual(summary(plan({ now: at(4, 2), days: 1, proofs: [emergency] })), [
    'bedtime 4 22:45',
    'morning 5 7:0',
  ]);
  // Onboarded at 7:30 on the 4th, after that morning began: it's free, the next isn't.
  assert.deepEqual(summary(plan({ now: at(4, 2), days: 1, armedSince: at(4, 7, 30) })), [
    'bedtime 4 22:45',
    'morning 5 7:0',
  ]);
  assert.deepEqual(summary(plan({ now: at(4, 2), days: 1, armedSince: at(3, 20) })), [
    'morning 4 7:0',
    'bedtime 4 22:45',
    'morning 5 7:0',
  ]);
});

test('a walk made before a morning\'s night began (the date replayed after a flight west) still gets its morning note', () => {
  // Proved 07:30 on the 4th somewhere a day ahead; here the night into the 4th ran 23:00 to 07:00 after it.
  const walk = { morningKey: '2026-10-04', kind: 'downstairs' as const, at: at(3, 7, 30).getTime() };
  assert.deepEqual(summary(plan({ now: at(3, 12), days: 1, proofs: [walk] })), ['bedtime 3 22:45', 'morning 4 7:0']);
  // A pass is tied to its morning, not to a moment after bedtime: it still frees it.
  const pass = { ...walk, kind: 'pass' as const };
  assert.deepEqual(summary(plan({ now: at(3, 12), days: 1, proofs: [pass] })), ['bedtime 3 22:45']);
});

test('access off: the warning becomes the revoked one, and no morning promise', () => {
  const off = plan({ protection: 'off' });
  assert.deepEqual(
    off.map((n) => n.kind),
    ['revoked', 'revoked'],
  );
  assert.match(off[0].body, /Settings/);
});

test('before access is set up or a night is armed, nothing about nights', () => {
  assert.deepEqual(plan({ protection: 'notSetUp' }), []);
  assert.deepEqual(plan({ protection: 'unavailable' }), []);
  assert.deepEqual(plan({ armed: false }), []);
});

test('the trial reminder is at noon, at least 2 days before the trial ends', () => {
  const DAY = 24 * 60 * 60_000;
  for (const days of [7, 14]) {
    for (const hour of [0, 8, 12, 13, 23]) {
      const start = at(3, hour, 30);
      const ends = new Date(start.getTime() + days * DAY);
      const reminder = planTrialReminder(ends, start)!;
      assert.equal(reminder.at.getHours(), 12);
      assert.ok(+ends - +reminder.at >= 2 * DAY, `${days} days, started ${hour}:30`);
      assert.ok(+ends - +reminder.at < 3 * DAY, `${days} days, started ${hour}:30`);
    }
  }
  assert.equal(planTrialReminder(at(10, 9), at(9, 9)), null);
  // An 8:00 end is reminded nearly 3 days out, so the title names the day instead of counting.
  const early = planTrialReminder(at(8, 8), at(1, 8))!;
  assert.equal(early.title, `Your free trial ends ${at(8, 8).toLocaleDateString('en-US', { weekday: 'long' })}.`);
  // It joins the plan, even with nothing armed.
  assert.deepEqual(
    plan({ armed: false, trialEnd: at(10, 9) }).map((n) => n.kind),
    ['trial'],
  );
});

test('switched-off kinds are left out, but the revoked warning always stays', () => {
  const off = { bedtime: false, morning: false, trial: false };
  assert.deepEqual(plan({ prefs: off, trialEnd: at(10, 9) }), []);
  assert.deepEqual(summary(plan({ prefs: { ...off, morning: true } })), ['morning 4 7:0', 'morning 5 7:0']);
  assert.deepEqual(
    plan({ prefs: off, protection: 'off' }).map((n) => n.kind),
    ['revoked', 'revoked'],
  );
});

test('copy stays in his voice: no exclamation marks', () => {
  const all = [...plan(), ...plan({ protection: 'off' }), planTrialReminder(at(10, 9), at(3, 9))!];
  for (const n of all) assert.ok(!/!/.test(n.title + n.body), n.title);
});

test('ask for permission only after a night held or a morning was unlocked, and only once', () => {
  const held = { morningKey: '2026-10-04', start: at(3, 23), end: at(4, 7), verdict: 'onTime' as const, firstStart: null, lateBy: 0 };
  const proof = { morningKey: '2026-10-04', kind: 'downstairs' as const, at: 0 };
  assert.equal(isGoodMomentToAsk('undetermined', { proofs: [], nights: [] }), false);
  assert.equal(isGoodMomentToAsk('undetermined', { proofs: [], nights: [{ ...held, verdict: 'missed' }] }), false);
  assert.equal(isGoodMomentToAsk('undetermined', { proofs: [], nights: [held] }), true);
  assert.equal(isGoodMomentToAsk('undetermined', { proofs: [proof], nights: [] }), true);
  assert.equal(isGoodMomentToAsk('denied', { proofs: [proof], nights: [held] }), false);
  assert.equal(isGoodMomentToAsk('granted', { proofs: [proof], nights: [held] }), false);
});

test('the shield-tap follow-up is morning only', () => {
  assert.equal(shieldTapNotification('night'), null);
  assert.equal(shieldTapNotification('day'), null);
  assert.ok(shieldTapNotification('morning')?.title);
});

test('the shield-tap and morning notifications open the wake-up screen; the rest don’t', () => {
  assert.equal(opensWakeScreen(shieldTapNotification('morning')!.identifier), true);
  assert.equal(opensWakeScreen('locturne.morning.2026-10-04'), true);
  assert.equal(opensWakeScreen('locturne.bedtime.2026-10-04'), false);
  assert.equal(opensWakeScreen('locturne.trial'), false);
  assert.equal(opensWakeScreen('someone-else'), false);
});

test('a wake-up notification tap leaves an open wake or scan screen alone, so copies don’t stack', () => {
  // A scan routine's /wake replaces itself with /scan: navigating to /wake from there pushes a
  // second one each tap. And from /wake?method=steps it would wipe the method mid-walk.
  assert.equal(wakeScreenShowing('/scan'), true);
  assert.equal(wakeScreenShowing('/wake'), true);
  assert.equal(wakeScreenShowing('/'), false);
  // Exits is a sheet over the wake or scan screen: navigating would push another copy over it.
  assert.equal(wakeScreenShowing('/exits'), true);
  assert.equal(wakeScreenShowing('/onboarding'), false);
  assert.equal(wakeScreenShowing('/scan', 'morning'), true);
});

test('a wake-up notification tap over the code setup screen opens the wake-up instead', () => {
  // Setup from bed only says "Not from bed", with no way to get up from there.
  assert.equal(wakeScreenShowing('/scan', 'setup'), false);
  assert.equal(setupScanShowing('/scan', 'setup'), true);
  assert.equal(setupScanShowing('/scan', 'morning'), false);
  assert.equal(setupScanShowing('/scan'), false);
  assert.equal(setupScanShowing('/wake', 'setup'), false);
});

test('the tone changes the bedtime and morning notes, and nothing about when they come', () => {
  const grumpy = plan();
  assert.deepEqual(plan({ tone: 'grumpy' }), grumpy, 'grumpy is the default');
  for (const tone of ['mild', 'unbearable'] as const) {
    const toned = plan({ tone });
    assert.deepEqual(summary(toned), summary(grumpy), `${tone}: same kinds, same times`);
    assert.ok(toned.some((n, i) => n.body !== grumpy[i].body), `${tone}: different words`);
    for (const n of toned) assert.ok(!/!/.test(n.title + n.body), `${tone}: no exclamation points`);
  }
});
