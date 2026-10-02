/// <reference types="node" />

/**
 * The wrapper against a fake react-native-device-activity, so it runs without a phone.
 * Needs `--experimental-test-module-mocks` (set in the npm test script).
 */
import assert from 'node:assert/strict';
import { beforeEach, mock, test } from 'node:test';

type Call = [string, ...unknown[]];
const calls: Call[] = [];
let status = 0;
let statusAfterPrompt = 2;
let saved: Record<string, string> = {};
let activities: string[] = [];
let failOnStart: string | null = null;
let store: Record<string, unknown> = {};
let events: { activityName: string; callbackName: string; lastCalledAt: Date }[] = [];

/*
 * Picks live in the App Group under `familyActivitySelectionIds`, as in the real library.
 * Most tests use any string as a token; tokens written `apps:a,b` name their apps, so the
 * set operations (union, subset) can be checked.
 */
const ids = (): Record<string, string> => (store.familyActivitySelectionIds ??= saved) as Record<string, string>;
const appsOf = (token: string | undefined) =>
  token?.startsWith('apps:') ? token.slice(5).split(',').filter(Boolean) : token ? ['?'] : [];
const named = (input: { activitySelectionId: string }) => ids()[input.activitySelectionId];
let authListener: (() => void) | null = null;

mock.module('react-native-device-activity', {
  namedExports: {
    AuthorizationStatus: { notDetermined: 0, denied: 1, approved: 2 },
    isAvailable: () => true,
    getAuthorizationStatus: () => status,
    requestAuthorization: async (who: string) => {
      calls.push(['requestAuthorization', who]);
      status = statusAfterPrompt;
    },
    pollAuthorizationStatus: async () => status,
    getFamilyActivitySelectionId: (id: string) => ids()[id],
    setFamilyActivitySelectionId: ({ id, familyActivitySelection }: { id: string; familyActivitySelection: string }) => {
      ids()[id] = familyActivitySelection;
    },
    // The real Swift spells it `webdomainCount`, unlike the library's own types.
    activitySelectionMetadata: ({ activitySelectionId }: { activitySelectionId: string }) => {
      const token = ids()[activitySelectionId];
      if (token?.startsWith('apps:'))
        return { applicationCount: appsOf(token).length, categoryCount: 0, webdomainCount: 0, includeEntireCategory: false };
      return token
        ? { applicationCount: 3, categoryCount: 1, webdomainCount: 2, includeEntireCategory: false }
        : { applicationCount: 0, categoryCount: 0, webdomainCount: 0, includeEntireCategory: false };
    },
    isSubsetOf: (a: { activitySelectionId: string }, b: { activitySelectionId: string }) => {
      const superset = appsOf(named(b));
      return appsOf(named(a)).every((app) => superset.includes(app));
    },
    union: (a: { activitySelectionId: string }, b: { activitySelectionId: string }, options: { persistAsActivitySelectionId?: string }) => {
      const token = `apps:${[...new Set([...appsOf(named(a)), ...appsOf(named(b))])].join(',')}`;
      if (options.persistAsActivitySelectionId) ids()[options.persistAsActivitySelectionId] = token;
      calls.push(['union', a, b]);
    },
    onAuthorizationStatusChange: (listener: () => void) => {
      authListener = listener;
      return { remove: () => (authListener = null) };
    },
    blockSelection: (...args: unknown[]) => calls.push(['blockSelection', ...args]),
    unblockSelection: (...args: unknown[]) => calls.push(['unblockSelection', ...args]),
    isShieldActive: () => calls.some(([name]) => name === 'blockSelection'),
    updateShield: (...args: unknown[]) => calls.push(['updateShield', ...args]),
    configureActions: (config: unknown) => calls.push(['configureActions', config]),
    startMonitoring: async (name: string, schedule: unknown, evts: unknown) => {
      if (name === failOnStart) throw new Error('intervalTooShort');
      calls.push(['startMonitoring', name, schedule, evts]);
      activities.push(name);
    },
    stopMonitoring: (names: string[]) => {
      calls.push(['stopMonitoring', names]);
      activities = activities.filter((a) => !names.includes(a));
    },
    cleanUpAfterActivity: (name: string) => calls.push(['cleanUpAfterActivity', name]),
    getActivities: () => [...activities],
    getEvents: () => events,
    userDefaultsGet: (key: string) => (key === 'familyActivitySelectionIds' ? ids() : store[key]),
    userDefaultsSet: (key: string, value: unknown) => {
      store[key] = value;
    },
    userDefaultsRemove: (key: string) => {
      delete store[key];
    },
  },
});

const st = await import('./screen-time.ts');
const { planNightWindows } = await import('./night-plan.ts');

beforeEach(() => {
  calls.length = 0;
  status = 0;
  statusAfterPrompt = 2;
  saved = {};
  activities = [];
  failOnStart = null;
  store = {};
  events = [];
  authListener = null;
});

test('access maps the library status to words', () => {
  status = 0;
  assert.equal(st.getAccess(), 'notDetermined');
  status = 1;
  assert.equal(st.getAccess(), 'denied');
  status = 2;
  assert.equal(st.getAccess(), 'approved');
});

test('requestAccess asks for this person only, never a child', async () => {
  assert.equal(await st.requestAccess(), 'approved');
  assert.deepEqual(calls, [['requestAuthorization', 'individual']]);
});

test('a declined prompt reports denied', async () => {
  statusAfterPrompt = 1;
  assert.equal(await st.requestAccess(), 'denied');
});

test('lists are addressed by id, and tagged as ours', () => {
  st.sleepApps('night');
  st.wakeApps('night');
  st.sleepApps('always');
  assert.deepEqual(calls, [
    ['blockSelection', { activitySelectionId: 'night' }, 'locturne'],
    ['unblockSelection', { activitySelectionId: 'night' }, 'locturne'],
    ['blockSelection', { activitySelectionId: 'always' }, 'locturne'],
  ]);
});

test('hasSelection is true only once a list has been picked', () => {
  assert.equal(st.hasSelection('night'), false);
  ids().night = 'opaque-token';
  assert.equal(st.hasSelection('night'), true);
  assert.equal(st.hasSelection('always'), false);
});

test('shield text goes into title, subtitle and the one button, and the button just closes', () => {
  st.setShieldText({ title: 'Shh.', subtitle: 'Locturne', button: 'Fine' });
  const [name, config, actions, trigger] = calls[0] as [string, Record<string, unknown>, unknown, string];
  assert.equal(name, 'updateShield');
  assert.equal(config.title, 'Shh.');
  assert.equal(config.subtitle, 'Locturne');
  assert.equal(config.primaryButtonLabel, 'Fine');
  assert.deepEqual(actions, { primary: { behavior: 'close' } });
  assert.equal(trigger, 'locturne');
});

const TIMES = { bedtime: 23 * 60 + 30, morningStart: 7 * 60 };

test('armNight: each window blocks the list at its start, repeating daily', async () => {
  const windows = planNightWindows(TIMES.bedtime, TIMES.morningStart);
  await st.armNight(windows, 'night', TIMES);

  const configured = calls.filter(([n]) => n === 'configureActions').map(([, c]) => c);
  assert.equal(configured.length, 10);
  assert.deepEqual(configured[0], {
    activityName: 'night-0',
    callbackName: 'intervalDidStart',
    actions: [{ type: 'blockSelection', familyActivitySelectionId: 'night' }],
  });

  const started = calls.filter(([n]) => n === 'startMonitoring');
  assert.deepEqual(started[0].slice(1), [
    'night-0',
    { intervalStart: { hour: 23, minute: 30 }, intervalEnd: { hour: 0, minute: 15 }, repeats: true },
    [],
  ]);
  assert.deepEqual(started.at(-1)![2], {
    intervalStart: { hour: 6, minute: 15 },
    intervalEnd: { hour: 7, minute: 0 },
    repeats: true,
  });
  // Nothing is configured to unblock at morning start: the walk does that.
  assert.ok(!JSON.stringify(configured).includes('unblock'));

  assert.equal(st.armedWindowNames().length, 10);
  assert.equal(st.getArmedNight()?.windows, 10);
  assert.equal(st.getArmedNight()?.bedtime, TIMES.bedtime);
});

test('arming again replaces the old night instead of stacking', async () => {
  await st.armNight(planNightWindows(TIMES.bedtime, TIMES.morningStart), 'night', TIMES);
  await st.armNight(planNightWindows(22 * 60, 23 * 60), 'night', { bedtime: 22 * 60, morningStart: 23 * 60 });
  assert.deepEqual(st.armedWindowNames(), ['night-0', 'night-1']);
});

test('if iOS refuses a window, nothing stays half-armed', async () => {
  failOnStart = 'night-3';
  await assert.rejects(st.armNight(planNightWindows(TIMES.bedtime, TIMES.morningStart), 'night', TIMES), /intervalTooShort/);
  assert.deepEqual(st.armedWindowNames(), []);
  assert.equal(st.getArmedNight(), null);
});

test('disarm stops only night windows and leaves other activities alone', async () => {
  activities = ['something-else'];
  await st.armNight(planNightWindows(TIMES.bedtime, TIMES.morningStart), 'night', TIMES);
  st.disarmNight();
  assert.deepEqual(activities, ['something-else']);
  assert.equal(st.getArmedNight(), null);
});

test('windowStarts lists night window starts, newest first', () => {
  events = [
    { activityName: 'night-0', callbackName: 'intervalDidStart', lastCalledAt: new Date(1000) },
    { activityName: 'night-0', callbackName: 'intervalDidEnd', lastCalledAt: new Date(4000) },
    { activityName: 'other', callbackName: 'intervalDidStart', lastCalledAt: new Date(5000) },
    { activityName: 'night-1', callbackName: 'intervalDidStart', lastCalledAt: new Date(3000) },
  ];
  assert.deepEqual(st.windowStarts(), [
    { window: 'night-1', at: new Date(3000) },
    { window: 'night-0', at: new Date(1000) },
  ]);
});

test('selectionSize counts apps, categories and sites as rows', () => {
  saved = { night: 'token' };
  assert.equal(st.selectionSize('night'), 6);
  assert.equal(st.selectionSize('always'), 0);
});

const shields = () =>
  calls
    .filter(([n]) => n === 'blockSelection' || n === 'unblockSelection')
    .map(([n, sel]) => `${n === 'blockSelection' ? '+' : '-'}${(sel as { activitySelectionId: string }).activitySelectionId}`);

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

test('reapply shields every rule still in force, and only picked lists', () => {
  status = 2;
  saved = { always: 't', night: 't', block: 't', 'limit-0': 't', 'limit-1': 't' };
  store['locturne.nightHeld'] = true;
  store['locturne.nap'] = { start: Date.now(), end: Date.now() + 60_000, list: 'block' };
  store['locturne.limits'] = [
    { id: 'limit-0', minutes: 30 },
    { id: 'limit-1', minutes: 30 },
    { id: 'limit-2', minutes: 30 },
  ];
  store['locturne.limitReached.limit-0'] = today();
  store['locturne.limitReached.limit-1'] = '2000-01-01';
  store['locturne.limitReached.limit-2'] = today(); // used up, but never picked
  st.reapplyStandingBlocks();
  assert.deepEqual(shields(), ['+always', '+night', '+block', '+limit-0']);
});

test('reapply does nothing without Screen Time access', () => {
  status = 1;
  saved = { always: 't' };
  st.reapplyStandingBlocks();
  assert.deepEqual(shields(), []);
});

test('waking the bedtime apps keeps the always list asleep', () => {
  status = 2;
  saved = { always: 't', night: 't' };
  st.sleepApps('night');
  assert.equal(st.isNightHeld(), true);
  calls.length = 0;
  st.wakeApps('night');
  assert.equal(st.isNightHeld(), false);
  assert.deepEqual(shields(), ['-night', '+always']);
});

test('ending Block now early re-shields the night lock it overlapped', async () => {
  status = 2;
  saved = { always: 't', night: 't' };
  st.sleepApps('night');
  await st.startNap('night', 30);
  calls.length = 0;
  st.endNap();
  assert.deepEqual(shields(), ['-night', '+always', '+night']);
  assert.equal(st.getNap(), null);
});

test('armLimit: a daily window that shields once the minutes are used, and wakes at midnight', async () => {
  saved = { 'limit-0': 'opaque' };
  await st.armLimit({ id: 'limit-0', minutes: 90 });
  const configured = calls.filter(([n]) => n === 'configureActions').map(([, c]) => c);
  assert.deepEqual(configured, [
    {
      activityName: 'limit-0',
      callbackName: 'intervalDidStart',
      actions: [{ type: 'unblockSelection', familyActivitySelectionId: 'limit-0' }],
    },
    {
      activityName: 'limit-0',
      callbackName: 'eventDidReachThreshold',
      eventName: 'used-up',
      actions: [{ type: 'blockSelection', familyActivitySelectionId: 'limit-0' }],
    },
  ]);
  const [, name, schedule, evts] = calls.find(([n]) => n === 'startMonitoring')!;
  assert.equal(name, 'limit-0');
  assert.deepEqual(schedule, {
    intervalStart: { hour: 0, minute: 0 },
    intervalEnd: { hour: 23, minute: 59 },
    repeats: true,
  });
  assert.deepEqual(evts, [
    { familyActivitySelection: 'opaque', threshold: { hour: 1, minute: 30 }, eventName: 'used-up', includesPastActivity: true },
  ]);
  assert.deepEqual(shields(), []);
});

test('armLimit does nothing for a limit with no apps picked', async () => {
  await st.armLimit({ id: 'limit-0', minutes: 30 });
  assert.deepEqual(calls, []);
});

test('a looser limit at bedtime re-arms fresh, and a removed one stops and forgets its picks', async () => {
  status = 2;
  store.familyActivitySelectionIds = { 'limit-0': 'a', 'limit-1': 'b', night: 'n' };
  store['locturne.limitReached.limit-0'] = today();
  store['locturne.limits'] = [
    { id: 'limit-0', minutes: 30, pending: { minutes: 60, from: 0 } },
    { id: 'limit-1', minutes: 30, pending: { minutes: null, from: 0 } },
  ];
  await st.settleLimitChanges();
  assert.deepEqual(st.getLimits(), [{ id: 'limit-0', minutes: 60 }]);
  assert.equal(store['locturne.limitReached.limit-0'], undefined);
  assert.ok(calls.some(([n, names]) => n === 'stopMonitoring' && (names as string[]).includes('limit-1')));
  assert.deepEqual(store.familyActivitySelectionIds, { 'limit-0': 'a', night: 'n' });
  const evts = calls.find(([n]) => n === 'startMonitoring')![3] as { threshold: unknown }[];
  assert.deepEqual(evts[0].threshold, { hour: 1, minute: 0 });
});

test('nothing settles before bedtime', async () => {
  const later = Date.now() + 60_000;
  store['locturne.limits'] = [{ id: 'limit-0', minutes: 30, pending: { minutes: 60, from: later } }];
  await st.settleLimitChanges();
  assert.deepEqual(calls, []);
});

/* Editing a list: added apps join now, removed ones wait for bedtime. */

/** What Apple's picker does on Done: save the new picks into the list it was given. */
const pick = (id: string, ...apps: string[]) => {
  if (apps.length) ids()[id] = `apps:${apps.join(',')}`;
  else delete ids()[id];
};
const BEDTIME = new Date(2026, 9, 1, 23, 30);

test('adding apps to a list applies at once', () => {
  saved = { always: 'apps:tiktok' };
  pick(st.beginListEdit('always'), 'tiktok', 'instagram');
  assert.equal(st.finishListEdit('always', BEDTIME), 'now');
  assert.equal(ids().always, 'apps:tiktok,instagram');
  assert.equal(ids()['always-next'], undefined);
  assert.equal(st.listChangeStarts('always'), null);
});

test('a first pick applies at once', () => {
  pick(st.beginListEdit('night'), 'tiktok');
  assert.equal(st.finishListEdit('night', BEDTIME), 'now');
  assert.equal(ids().night, 'apps:tiktok');
});

test('removing an app keeps it asleep until bedtime, while additions join now', () => {
  saved = { always: 'apps:tiktok,instagram' };
  pick(st.beginListEdit('always'), 'instagram', 'x');
  assert.equal(st.finishListEdit('always', BEDTIME), 'bedtime');
  assert.deepEqual(appsOf(ids().always).sort(), ['instagram', 'tiktok', 'x']);
  assert.deepEqual(st.listChangeStarts('always'), BEDTIME);
  // Reopening the picker shows the list as it will be, not the live one.
  assert.equal(ids()[st.beginListEdit('always')], 'apps:instagram,x');
});

test('putting the removed app back cancels the wait', () => {
  saved = { always: 'apps:tiktok,instagram' };
  pick(st.beginListEdit('always'), 'instagram');
  st.finishListEdit('always', BEDTIME);
  pick(st.beginListEdit('always'), 'instagram', 'tiktok');
  assert.equal(st.finishListEdit('always', BEDTIME), 'now');
  assert.equal(st.listChangeStarts('always'), null);
  assert.deepEqual(appsOf(ids().always).sort(), ['instagram', 'tiktok']);
});

test('nothing settles before bedtime; after it, the removed apps wake', async () => {
  status = 2;
  saved = { always: 'apps:tiktok,instagram' };
  pick(st.beginListEdit('always'), 'instagram');
  st.finishListEdit('always', BEDTIME);

  assert.deepEqual(st.settleListChanges(new Date(BEDTIME.getTime() - 1)), []);
  assert.deepEqual(shields(), []);

  await st.settleLimitChanges(BEDTIME);
  // The old list is unshielded (tiktok wakes), then the new one goes back up.
  assert.deepEqual(shields(), ['-always', '+always']);
  assert.equal(ids().always, 'apps:instagram');
  assert.equal(ids()['always-next'], undefined);
  assert.equal(st.listChangeStarts('always'), null);
});

test('emptying a list waits for bedtime too, then forgets the picks', () => {
  saved = { night: 'apps:tiktok' };
  pick(st.beginListEdit('night'));
  assert.equal(st.finishListEdit('night', BEDTIME), 'bedtime');
  assert.equal(ids().night, 'apps:tiktok');
  assert.deepEqual(st.settleListChanges(BEDTIME), ['night']);
  assert.equal(ids().night, undefined);
});

test("a limit's removed apps leave it at bedtime, and iOS gets the new picks", async () => {
  status = 2;
  saved = { 'limit-0': 'apps:tiktok,instagram' };
  store['locturne.limits'] = [{ id: 'limit-0', minutes: 30 }];
  pick(st.beginListEdit('limit-0'), 'instagram');
  st.finishListEdit('limit-0', BEDTIME);
  calls.length = 0;
  await st.settleLimitChanges(BEDTIME);
  const evts = calls.find(([n, name]) => n === 'startMonitoring' && name === 'limit-0')![3] as { familyActivitySelection: string }[];
  assert.equal(evts[0].familyActivitySelection, 'apps:instagram');
});

test('removing a limit also drops its waiting edit', () => {
  saved = { 'limit-0': 'apps:tiktok,instagram' };
  pick(st.beginListEdit('limit-0'), 'instagram');
  st.finishListEdit('limit-0', BEDTIME);
  st.removeLimit('limit-0');
  assert.equal(st.listChangeStarts('limit-0'), null);
  assert.equal(ids()['limit-0-next'], undefined);
});

/* Protection: is anything actually being blocked? */

test('protection follows the access answer', () => {
  status = 0;
  assert.equal(st.getProtection(), 'notSetUp');
  status = 1;
  assert.equal(st.getProtection(), 'off');
  status = 2;
  assert.equal(st.getProtection(), 'on');
});

test('protection is off when iOS dropped the armed schedule, even if access still says approved', async () => {
  status = 2;
  await st.armNight(planNightWindows(TIMES.bedtime, TIMES.morningStart), 'night', TIMES);
  assert.equal(st.getProtection(), 'on');
  activities = []; // what a revoke does to the monitored schedules
  assert.equal(st.getProtection(), 'off');
});

test('protection is off when a list should be asleep but no shield is up', () => {
  status = 2;
  saved = { always: 'apps:tiktok' };
  assert.equal(st.getProtection(), 'off');
  st.reapplyStandingBlocks();
  assert.equal(st.getProtection(), 'on');
});

test('watchAccess hears status changes and stops when asked', () => {
  let heard = 0;
  const stop = st.watchAccess(() => heard++);
  authListener?.();
  stop();
  assert.equal(heard, 1);
  assert.equal(authListener, null);
});
