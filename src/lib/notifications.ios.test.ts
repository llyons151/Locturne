/// <reference types="node" />

/**
 * The half of notifications.ts that talks to iOS: rescheduling, the permission answer, and
 * notification taps. Against fakes of expo-notifications and react-native-device-activity,
 * with `Platform.OS` set to `ios`. The plan itself is tested in notifications.test.ts.
 * Needs `--experimental-test-module-mocks` (set in the npm test script).
 */
import assert from 'node:assert/strict';
import { beforeEach, mock, test } from 'node:test';

import { fakeDeviceActivity } from './fake-device-activity.ts';

type Scheduled = {
  identifier: string;
  content: { title?: string; body?: string; data?: Record<string, unknown> | null };
  trigger?: { type: string; date?: Date; year?: number; month?: number; day?: number; hour?: number; minute?: number };
};
/** When a trigger fires, read as local time: a date, or calendar parts (which float with the zone). */
const fireAt = (t: Scheduled['trigger']) =>
  t?.type === 'calendar' ? new Date(t.year!, t.month! - 1, t.day!, t.hour!, t.minute!) : t!.date!;
type Response = { notification: { request: { identifier: string } } };
type Settings = { granted: boolean; status: string; ios?: { status: number } };

const IOS = { NOT_DETERMINED: 0, DENIED: 1, AUTHORIZED: 2, PROVISIONAL: 3, EPHEMERAL: 4 };

/** What iOS holds, and a log of every call in order, so interleaving shows. */
const ios = {
  scheduled: new Map<string, Scheduled>(),
  log: [] as string[],
  settings: { granted: true, status: 'granted', ios: { status: IOS.AUTHORIZED } } as Settings,
  /** What the permission prompt changes the settings to. */
  afterPrompt: null as Settings | null,
  prompts: 0,
  /** Rejects the next `getAllScheduledNotificationsAsync`, once. */
  failNextList: false,
  launched: null as Response | null,
  listeners: new Set<(r: Response) => void>(),
};

/** Lets other queued work run, the way a real bridge call would. */
const tick = () => new Promise<void>((resolve) => setImmediate(resolve));

mock.module('react-native', { namedExports: { Platform: { OS: 'ios' } } });
mock.module('expo-notifications', {
  namedExports: {
    IosAuthorizationStatus: IOS,
    SchedulableTriggerInputTypes: { DATE: 'date', CALENDAR: 'calendar' },
    setNotificationHandler: () => ios.log.push('handler'),
    getPermissionsAsync: async () => ios.settings,
    requestPermissionsAsync: async () => {
      ios.prompts++;
      if (ios.afterPrompt) ios.settings = ios.afterPrompt;
      return ios.settings;
    },
    getAllScheduledNotificationsAsync: async () => {
      await tick();
      ios.log.push('list');
      if (ios.failNextList) {
        ios.failNextList = false;
        throw new Error('bridge');
      }
      return [...ios.scheduled.values()];
    },
    cancelScheduledNotificationAsync: async (id: string) => {
      await tick();
      ios.log.push(`cancel ${id}`);
      ios.scheduled.delete(id);
    },
    scheduleNotificationAsync: async (request: Scheduled) => {
      await tick();
      ios.log.push(`schedule ${request.identifier}`);
      ios.scheduled.set(request.identifier, request);
      return request.identifier;
    },
    getLastNotificationResponse: () => ios.launched,
    clearLastNotificationResponse: () => {
      ios.launched = null;
    },
    addNotificationResponseReceivedListener: (listener: (r: Response) => void) => {
      ios.listeners.add(listener);
      return { remove: () => ios.listeners.delete(listener) };
    },
  },
});

const fake = fakeDeviceActivity();
mock.module('react-native-device-activity', { namedExports: fake.exports });

const n = await import('./notifications.ts');
const { saveRoutine, DEFAULT_ROUTINE } = await import('./routine.ts');
const { sharedSet } = await import('./screen-time.ts');

/** Oct 3, 2026 is a Saturday. Local time, so `npm run test:tz` passes in every zone. */
const NOW = new Date(2026, 9, 3, 12, 0);

const foreign = (identifier: string): Scheduled => ({ identifier, content: { title: 'Someone else' } });
const ours = () => [...ios.scheduled.keys()].filter((id) => id.startsWith(n.ID_PREFIX)).sort();
const tap = (identifier: string): Response => ({ notification: { request: { identifier } } });

beforeEach(() => {
  mock.timers.reset();
  mock.timers.enable({ apis: ['Date'], now: NOW });
  fake.reset();
  // Armed, with its windows monitored: protection reads as on.
  fake.arm(new Date(2026, 8, 1));
  fake.ids().night = 'selected-apps';
  fake.state.activities = ['night-0'];
  ios.scheduled.clear();
  ios.log.length = 0;
  ios.settings = { granted: true, status: 'granted', ios: { status: IOS.AUTHORIZED } };
  ios.afterPrompt = null;
  ios.prompts = 0;
  ios.failNextList = false;
  ios.launched = null;
  ios.listeners.clear();
});

test('native planner respects empty current picks, pending empty edits, and emergency parked picks', async () => {
  saveRoutine(DEFAULT_ROUTINE);
  delete fake.ids().night;
  await n.rescheduleNotifications();
  assert.deepEqual(ours(), []);
  fake.ids().night = 'selected-apps';
  sharedSet('locturne.pendingLists', { night: { from: new Date(2026, 9, 3, 23).getTime(), dated: NOW.getTime(), empty: true } });
  await n.rescheduleNotifications();
  assert.deepEqual(ours(), []);
  delete fake.ids().night;
  fake.ids()['night-next'] = 'parked-apps';
  sharedSet('locturne.pendingLists', { night: { from: new Date(2026, 9, 3, 23).getTime() } });
  await n.rescheduleNotifications();
  assert.ok(ours().includes('locturne.bedtime.2026-10-04'));
  assert.ok(ours().includes('locturne.morning.2026-10-04'));
});

/* The permission answer */

test('provisional and ephemeral permission count as granted', async () => {
  const cases: [number, string][] = [
    [IOS.NOT_DETERMINED, 'undetermined'],
    [IOS.DENIED, 'denied'],
    [IOS.AUTHORIZED, 'granted'],
    [IOS.PROVISIONAL, 'granted'],
    [IOS.EPHEMERAL, 'granted'],
  ];
  for (const [status, expected] of cases) {
    ios.settings = { granted: status >= IOS.AUTHORIZED, status: 'whatever', ios: { status } };
    assert.equal(await n.getNotificationPermission(), expected, `iOS status ${status}`);
  }
});

test('without an iOS status, the general answer is used', async () => {
  ios.settings = { granted: true, status: 'granted' };
  assert.equal(await n.getNotificationPermission(), 'granted');
  ios.settings = { granted: false, status: 'undetermined' };
  assert.equal(await n.getNotificationPermission(), 'undetermined');
  ios.settings = { granted: false, status: 'denied' };
  assert.equal(await n.getNotificationPermission(), 'denied');
});

/* Rescheduling */

test('rescheduling replaces our notifications and leaves everyone else’s alone', async () => {
  saveRoutine(DEFAULT_ROUTINE, NOW);
  ios.scheduled.set('locturne.bedtime.2020-01-01', foreign('locturne.bedtime.2020-01-01'));
  ios.scheduled.set('other-app.reminder', foreign('other-app.reminder'));
  ios.scheduled.set('locturnefoo', foreign('locturnefoo'));

  await n.rescheduleNotifications();

  assert.ok(!ios.scheduled.has('locturne.bedtime.2020-01-01'), 'the stale one of ours is gone');
  assert.ok(ios.scheduled.has('other-app.reminder'));
  assert.ok(ios.scheduled.has('locturnefoo'), 'only the full `locturne.` prefix is ours');
  assert.ok(!ios.log.includes('cancel other-app.reminder'));

  const expected = n
    .planNotifications({
      routine: DEFAULT_ROUTINE,
      protection: 'on',
      armed: true,
      armedSince: new Date(2026, 8, 1),
      now: NOW,
    })
    .map((p) => p.id)
    .sort();
  assert.deepEqual(ours(), expected);
  assert.ok(expected.includes('locturne.bedtime.2026-10-04'));
});

test('each notification fires on its date and carries that time for diagnostics', async () => {
  saveRoutine(DEFAULT_ROUTINE, NOW);
  await n.rescheduleNotifications();
  const warning = ios.scheduled.get('locturne.bedtime.2026-10-04');
  assert.ok(warning);
  // A clock time, not an instant: after a flight it still comes 15 minutes before bedtime.
  assert.equal(warning.trigger?.type, 'calendar');
  assert.equal(+fireAt(warning.trigger), +new Date(2026, 9, 3, 22, 45));
  assert.equal(warning.content.data?.at, +new Date(2026, 9, 3, 22, 45));
  assert.equal(warning.content.data?.kind, 'bedtime');

  const listed = await n.getScheduledNotifications();
  assert.equal(listed[0].id, 'locturne.bedtime.2026-10-04', 'soonest first');
  assert.equal(+listed[0].at!, +new Date(2026, 9, 3, 22, 45));
});

test('without permission, ours are cleared and nothing new is scheduled', async () => {
  saveRoutine(DEFAULT_ROUTINE, NOW);
  ios.scheduled.set('locturne.morning.2026-10-04', foreign('locturne.morning.2026-10-04'));
  ios.scheduled.set('other-app.reminder', foreign('other-app.reminder'));
  ios.settings = { granted: false, status: 'denied', ios: { status: IOS.DENIED } };

  await n.rescheduleNotifications();
  assert.deepEqual(ours(), []);
  assert.ok(ios.scheduled.has('other-app.reminder'));
});

test('overlapping reschedules run one after the other, never interleaved', async () => {
  saveRoutine(DEFAULT_ROUTINE, NOW);
  await Promise.all([n.rescheduleNotifications(), n.rescheduleNotifications(), n.rescheduleNotifications()]);

  // Each run is: list, its cancels, its schedules. A list in the middle of another run's
  // schedules would miss them, and the next routine's plan could leave them behind.
  const lists = ios.log.flatMap((entry, i) => (entry === 'list' ? [i] : []));
  assert.equal(lists.length, 3);
  for (const at of lists.slice(1)) {
    assert.ok(ios.log[at - 1].startsWith('schedule '), `run starting at ${at} waited for the one before`);
  }
  assert.equal(ours().length, new Set(ours()).size);
});

test('a reschedule that fails doesn’t block the next one', async () => {
  saveRoutine(DEFAULT_ROUTINE, NOW);
  ios.failNextList = true;
  const first = n.rescheduleNotifications();
  const second = n.rescheduleNotifications();
  await assert.rejects(first, /bridge/);
  await second;
  assert.ok(ours().length > 0);
});

test('before onboarding has saved a routine, the one passed in is planned', async () => {
  const late = { ...DEFAULT_ROUTINE, bedtime: 23 * 60 + 30 };
  // Whatever is armed is armed for it (windows armed for other times would decide: `asArmed`).
  fake.state.store['locturne.armedNight'] = { ...fake.armedNight(new Date(2026, 8, 1)), bedtime: late.bedtime };
  await n.rescheduleNotifications(late);
  assert.equal(+fireAt(ios.scheduled.get('locturne.bedtime.2026-10-04')!.trigger), +new Date(2026, 9, 3, 23, 15));
});

test('once a routine is saved, a routine passed in doesn’t move tonight', async () => {
  saveRoutine(DEFAULT_ROUTINE, NOW);
  await n.rescheduleNotifications({ ...DEFAULT_ROUTINE, bedtime: 23 * 60 + 30 });
  assert.equal(+fireAt(ios.scheduled.get('locturne.bedtime.2026-10-04')!.trigger), +new Date(2026, 9, 3, 22, 45));
});

test('switched-off kinds aren’t scheduled', async () => {
  saveRoutine(DEFAULT_ROUTINE, NOW);
  await n.setNotificationPrefs({ bedtime: false, morning: true, trial: true });
  assert.ok(ours().length > 0);
  assert.ok(ours().every((id) => id.startsWith('locturne.morning.')));
  assert.deepEqual(n.getNotificationPrefs(), { bedtime: false, morning: true, trial: true });
});

/* The trial reminder */

test('“Remind me” keeps the trial end without prompting; `armed` asks', async () => {
  saveRoutine(DEFAULT_ROUTINE, NOW);
  ios.settings = { granted: false, status: 'undetermined', ios: { status: IOS.NOT_DETERMINED } };
  ios.afterPrompt = { granted: true, status: 'granted', ios: { status: IOS.AUTHORIZED } };

  const ends = new Date(2026, 9, 10, 12, 0);
  await n.scheduleTrialReminder(ends);
  assert.equal(ios.prompts, 0);
  assert.equal(+n.getTrialEnd()!, +ends);
  assert.ok(!ios.scheduled.has('locturne.trial'), 'nothing lands before permission');

  // `armed` asks; once allowed, the reminder is scheduled 2 days before the end.
  assert.equal(await n.askForNotifications(), true);
  assert.equal(ios.prompts, 1);
  assert.equal(+fireAt(ios.scheduled.get('locturne.trial')!.trigger), +new Date(2026, 9, 8, 12, 0));

  await n.cancelTrialReminder();
  assert.equal(n.getTrialEnd(), null);
  assert.ok(!ios.scheduled.has('locturne.trial'));
});

test('“Remind me” with permission already answered doesn’t prompt again', async () => {
  ios.settings = { granted: false, status: 'denied', ios: { status: IOS.DENIED } };
  await n.scheduleTrialReminder(new Date(2026, 9, 10, 12, 0));
  assert.equal(ios.prompts, 0);
  assert.ok(n.getTrialEnd(), 'kept, so it schedules if permission is turned on later');
});

test('the trial reminder follows the store: cancelled drops it, renewing again brings it back', async () => {
  saveRoutine(DEFAULT_ROUTINE, NOW);
  const ends = new Date(2026, 9, 10, 12, 0);
  sharedSet(n.TRIAL_REMINDER_KEY, true);
  await n.scheduleTrialReminder(ends);
  assert.ok(ios.scheduled.has('locturne.trial'));

  await n.syncTrialEnd(null); // cancelled in Apple's sheet
  assert.equal(n.getTrialEnd(), null);
  assert.ok(!ios.scheduled.has('locturne.trial'));

  await n.syncTrialEnd(ends); // auto-renew turned back on
  assert.equal(+n.getTrialEnd()!, +ends);
  assert.ok(ios.scheduled.has('locturne.trial'));

  // Without "Remind me", a renewing trial isn't given a reminder it never asked for.
  await n.cancelTrialReminder();
  sharedSet(n.TRIAL_REMINDER_KEY, false);
  await n.syncTrialEnd(ends);
  assert.equal(n.getTrialEnd(), null);
});

/* Asking */

test('the prompt is only shown once a night has held or a morning was unlocked', async () => {
  ios.settings = { granted: false, status: 'undetermined', ios: { status: IOS.NOT_DETERMINED } };
  assert.equal(await n.shouldAskForNotifications(NOW), false);
  sharedSet('locturne.morningProofs', [{ morningKey: '2026-10-03', kind: 'steps', at: +NOW }]);
  assert.equal(await n.shouldAskForNotifications(NOW), true);
  ios.settings = { granted: false, status: 'denied', ios: { status: IOS.DENIED } };
  assert.equal(await n.shouldAskForNotifications(NOW), false, 'never after iOS has its answer');
});

/* Taps */

test('the notification that launched the app is opened once, then cleared', () => {
  ios.launched = tap('locturne.shieldTap');
  const opened: string[] = [];
  const stop = n.onNotificationTap((id) => opened.push(id));
  assert.deepEqual(opened, ['locturne.shieldTap']);
  assert.equal(ios.launched, null);
  stop();

  // The tabs remounting must not open the wake screen a second time.
  const again: string[] = [];
  n.onNotificationTap((id) => again.push(id))();
  assert.deepEqual(again, []);
});

test('taps while running are passed on until unsubscribed', () => {
  const opened: string[] = [];
  const stop = n.onNotificationTap((id) => opened.push(id));
  for (const listener of ios.listeners) listener(tap('locturne.morning.2026-10-04'));
  stop();
  assert.equal(ios.listeners.size, 0);
  for (const listener of ios.listeners) listener(tap('locturne.bedtime.2026-10-04'));
  assert.deepEqual(opened, ['locturne.morning.2026-10-04']);
});
