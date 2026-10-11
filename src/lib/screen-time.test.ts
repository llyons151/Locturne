/// <reference types="node" />

/**
 * The wrapper against a fake react-native-device-activity, so it runs without a phone.
 * Needs `--experimental-test-module-mocks` (set in the npm test script).
 */
import assert from 'node:assert/strict';
import { beforeEach, mock, test } from 'node:test';

import { assertPlist } from './fake-device-activity.ts';

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
const metaOf = (picks: string[]) => ({
  applicationCount: picks.filter((p) => !p.includes('.')).length,
  categoryCount: 0,
  webdomainCount: picks.filter((p) => p.includes('.')).length,
  includeEntireCategory: false,
});
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
    // The real Swift spells it `webdomainCount`, unlike the library's own types. A pick
    // with a dot (`reddit.com`) is a website.
    activitySelectionMetadata: ({ activitySelectionId }: { activitySelectionId: string }) => {
      const token = ids()[activitySelectionId];
      if (token?.startsWith('apps:')) return metaOf(appsOf(token));
      return token
        ? { applicationCount: 3, categoryCount: 1, webdomainCount: 2, includeEntireCategory: false }
        : { applicationCount: 0, categoryCount: 0, webdomainCount: 0, includeEntireCategory: false };
    },
    // Like the real one: metadata of the picks both share, sites under `webdomainCount`.
    intersection: (a: { activitySelectionId: string }, b: { activitySelectionId: string }) => {
      const other = appsOf(named(b));
      return metaOf(appsOf(named(a)).filter((pick) => other.includes(pick)));
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
    updateShieldWithId: (...args: unknown[]) => calls.push(['updateShieldWithId', ...args]),
    setWebContentFilterPolicy: (...args: unknown[]) => calls.push(['setWebContentFilterPolicy', ...args]),
    clearWebContentFilterPolicy: (...args: unknown[]) => calls.push(['clearWebContentFilterPolicy', ...args]),
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
    userDefaultsGet: (key: string) => (key === 'familyActivitySelectionIds' ? ids() : (store[key] ?? null)),
    userDefaultsSet: (key: string, value: unknown) => {
      assertPlist(value, key); // iOS throws on NSNull, as the real UserDefaults does
      store[key] = value;
    },
    userDefaultsRemove: (key: string) => {
      delete store[key];
    },
  },
});

const st = await import('./screen-time.ts');
const sites = await import('./websites.ts');
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
  assert.deepEqual(calls.filter(([name]) => !name.includes('WebContent')), [
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
    actions: [{ type: 'blockSelection', familyActivitySelectionId: 'night', shieldId: 'locturne-night' }],
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

test('re-arming keeps the record of the night armed while iOS registers the new windows', async () => {
  // Found by the simulation (lock-controller.sim.test.ts, seed 543): a sync in that gap read
  // the morning as free, or stood everything down under the arm.
  await st.armNight(planNightWindows(TIMES.bedtime, TIMES.morningStart), 'night', TIMES);
  const before = st.getArmedNight();
  const rearming = st.armNight(planNightWindows(22 * 60, 6 * 60), 'night', { bedtime: 22 * 60, morningStart: 6 * 60 });
  assert.deepEqual(st.getArmedNight(), before, 'still armed while the bridge calls run');
  await rearming;
  assert.equal(st.getArmedNight()?.bedtime, 22 * 60);
});

test('a refused re-arm after everything stood down hands nothing back', async () => {
  await st.armNight(planNightWindows(TIMES.bedtime, TIMES.morningStart), 'night', TIMES);
  failOnStart = 'night-3';
  const rearming = st.armNight(planNightWindows(22 * 60, 8 * 60), 'night', { bedtime: 22 * 60, morningStart: 8 * 60 });
  st.disarmNight(); // standing down, while iOS was still registering
  await assert.rejects(rearming);
  assert.equal(st.getArmedNight(), null);
  assert.deepEqual(st.armedWindowNames(), []);
});

test('if iOS refuses a window, nothing stays half-armed', async () => {
  failOnStart = 'night-3';
  await assert.rejects(st.armNight(planNightWindows(TIMES.bedtime, TIMES.morningStart), 'night', TIMES), /intervalTooShort/);
  assert.deepEqual(st.armedWindowNames(), []);
  assert.equal(st.getArmedNight(), null);
});

test('if iOS refuses a re-arm, the night armed before is handed back, not left unarmed', async () => {
  await st.armNight(planNightWindows(TIMES.bedtime, TIMES.morningStart), 'night', TIMES);
  const before = st.getArmedNight();
  failOnStart = 'night-12'; // the new night has 14 windows, the old one 10
  await assert.rejects(st.armNight(planNightWindows(22 * 60, 8 * 60), 'night', { bedtime: 22 * 60, morningStart: 8 * 60 }));
  // The edit was refused, but tonight still locks on the old times and the morning stays locked.
  assert.deepEqual(st.getArmedNight(), before);
  assert.equal(st.armedWindowNames().length, before!.windows);
  const restarted = calls.filter(([n, name]) => n === 'startMonitoring' && name === 'night-0').at(-1)!;
  assert.deepEqual((restarted[2] as { intervalStart: unknown }).intervalStart, { hour: 23, minute: 30 });
});

test('if iOS refuses the old windows too, the record stays so the next sync retries', async () => {
  await st.armNight(planNightWindows(TIMES.bedtime, TIMES.morningStart), 'night', TIMES);
  const before = st.getArmedNight();
  failOnStart = 'night-0';
  await assert.rejects(st.armNight(planNightWindows(22 * 60, 8 * 60), 'night', { bedtime: 22 * 60, morningStart: 8 * 60 }));
  assert.deepEqual(st.getArmedNight(), before);
  // Nothing is monitored, which `getProtection` reports honestly.
  status = 2;
  assert.equal(st.getProtection(), 'off');
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

test('a nap under 15 minutes is refused before iOS sees it (intervalTooShort)', async () => {
  status = 2;
  saved = { always: 't', night: 't' };
  calls.length = 0;
  for (const minutes of [5, 10]) await assert.rejects(st.startNap('night', minutes), /at least 15 minutes/);
  assert.equal(calls.some(([n]) => n === 'startMonitoring'), false);
  assert.equal(st.getNap(), null);
  const nap = await st.startNap('night', st.NAP_SHORTEST);
  assert.equal(nap.end - nap.start, 15 * 60_000);
  st.endNap();
});

test('a nap window is pinned to the zone it started in, so a flight cannot move its end', async () => {
  status = 2;
  saved = { always: 't', night: 't' };
  calls.length = 0;
  await st.startNap('block', 120);
  const [, , schedule] = calls.find(([n, name]) => n === 'startMonitoring' && name === 'locturne-nap')!;
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const { intervalStart, intervalEnd } = schedule as { intervalStart: { timeZoneIdentifier?: string }; intervalEnd: { timeZoneIdentifier?: string } };
  assert.equal(intervalStart.timeZoneIdentifier, zone);
  assert.equal(intervalEnd.timeZoneIdentifier, zone);
  st.endNap();
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

test('a limit removal waiting for bedtime survives the App Group, which has no null', async () => {
  status = 2;
  store.familyActivitySelectionIds = { 'limit-0': 'a' };
  // Saved by the Apps tab: on iOS a null here would crash the app.
  st.saveLimits([{ id: 'limit-0', minutes: 30, pending: { minutes: null, from: 0 } }]);
  assert.deepEqual(st.getLimits(), [{ id: 'limit-0', minutes: 30, pending: { minutes: null, from: 0 } }]);
  await st.settleLimitChanges();
  assert.deepEqual(st.getLimits(), []);
  assert.ok(calls.some(([n, names]) => n === 'stopMonitoring' && (names as string[]).includes('limit-0')));
  assert.ok(!calls.some(([n]) => n === 'startMonitoring'));
});

test('shared records drop null fields instead of crashing iOS', () => {
  st.sharedSet('locturne.test', [{ a: 1, b: null, c: { d: null, e: [null, 2] } }]);
  assert.deepEqual(st.sharedGet('locturne.test'), [{ a: 1, c: { e: [2] } }]);
  st.sharedSet('locturne.test', null);
  assert.equal(st.sharedGet('locturne.test'), undefined);
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

test('removing only a website waits for bedtime too (the library’s isSubsetOf ignores sites)', () => {
  saved = { always: 'apps:tiktok,reddit.com' };
  pick(st.beginListEdit('always'), 'tiktok');
  assert.equal(st.finishListEdit('always', BEDTIME), 'bedtime');
  assert.deepEqual(st.listChangeStarts('always'), BEDTIME);
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

test('a draft saved empty settles as no picks, not an empty list', () => {
  saved = { night: 'apps:tiktok' };
  st.beginListEdit('night');
  ids()['night-next'] = 'apps:';
  assert.equal(st.finishListEdit('night', BEDTIME), 'bedtime');
  assert.deepEqual(st.settleListChanges(BEDTIME), ['night']);
  assert.equal(ids().night, undefined);
  assert.equal(st.hasSelection('night'), false);
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

test('protection is off when even one bedtime window is missing', async () => {
  status = 2;
  await st.armNight(planNightWindows(TIMES.bedtime, TIMES.morningStart), 'night', TIMES);
  activities.pop();
  assert.equal(st.getProtection(), 'off');
});

test('obsolete native windows cannot stand in for the committed bedtime generation', async () => {
  status = 2;
  const windows = planNightWindows(TIMES.bedtime, TIMES.morningStart);
  await st.armNight(windows, 'night', TIMES);
  st.sharedSet('locturne.armedNight', { ...st.getArmedNight(), nativeWindowPrefix: 'night-native-current-' });
  activities = windows.map((_, i) => `night-native-old-${i}`);
  assert.deepEqual(st.currentNightWindowNames(), []);
  assert.equal(st.getProtection(), 'off');
  activities = windows.map((_, i) => `night-native-current-${i}`);
  assert.equal(st.currentNightWindowNames().length, windows.length);
  assert.equal(st.getProtection(), 'on');
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

/** The domains the last web filter call held, or null when it cleared the filter. */
const filtered = () => {
  const last = calls.filter(([name]) => name.includes('WebContent')).at(-1);
  if (!last) return undefined;
  return last[0] === 'clearWebContentFilterPolicy' ? null : [...(last[1] as { domains: string[] }).domains].sort();
};

test('a typed website is cut down to its domain, and nonsense is refused', () => {
  assert.equal(sites.normalizeSite('https://www.Reddit.com/r/all?x=1'), 'reddit.com');
  assert.equal(sites.normalizeSite('  m.youtube.com  '), 'm.youtube.com');
  assert.equal(sites.normalizeSite('news.ycombinator.com:443/item'), 'news.ycombinator.com');
  assert.equal(sites.normalizeSite('bbc.co.uk'), 'bbc.co.uk');
  for (const bad of ['', 'reddit', 'not a site.com', 'http://', '-x.com', 'x.c0m', 'a..com']) {
    assert.equal(sites.normalizeSite(bad), null, bad);
  }
});

test('always-list websites sleep at once; bedtime ones only while the night holds them', () => {
  status = 2;
  assert.deepEqual(sites.addSite('always', 'reddit.com'), { ok: true, site: 'reddit.com' });
  assert.deepEqual(sites.addSite('night', 'youtube.com'), { ok: true, site: 'youtube.com' });
  st.reapplyStandingBlocks();
  assert.deepEqual(filtered(), ['reddit.com']);
  st.sleepApps('night');
  assert.deepEqual(filtered(), ['reddit.com', 'youtube.com']);
  st.wakeApps('night');
  assert.deepEqual(filtered(), ['reddit.com']);
});

test('nothing is filtered without a subscription, and the filter clears when empty', () => {
  status = 2;
  sites.addSite('always', 'reddit.com');
  st.sharedSet('locturne.stoodDown', true);
  st.reapplyStandingBlocks();
  assert.equal(filtered(), null);
});

test('the same site twice is refused, and the filter cap is shared by both lists', () => {
  sites.addSite('always', 'reddit.com');
  assert.deepEqual(sites.addSite('always', 'www.reddit.com'), { ok: false, reason: 'duplicate' });
  // The same site on the other list takes no extra room.
  assert.equal(sites.addSite('night', 'reddit.com').ok, true);
  for (let i = 1; i < sites.MAX_SITES; i++) sites.addSite('night', `site${i}.com`);
  assert.deepEqual(sites.addSite('always', 'one-too-many.com'), { ok: false, reason: 'full' });
  assert.equal(sites.addSite('always', 'site1.com').ok, true);
});

test('a removed website keeps sleeping until bedtime, then wakes', () => {
  status = 2;
  sites.addSite('always', 'reddit.com');
  sites.addSite('always', 'x.com');
  const bedtime = new Date(2026, 9, 10, 23);
  sites.removeSite('always', 'reddit.com', bedtime);
  assert.deepEqual(sites.getSites('always'), ['x.com']);
  assert.deepEqual(sites.sitesWaking('always'), ['reddit.com']);
  st.reapplyStandingBlocks();
  assert.deepEqual(filtered(), ['reddit.com', 'x.com']);
  // Added while the removal waits: sleeps now, and stays after the swap.
  sites.addSite('always', 'tiktok.com');
  assert.equal(sites.settleSites(new Date(2026, 9, 10, 22)), false);
  assert.equal(sites.settleSites(bedtime), true);
  st.reapplyStandingBlocks();
  assert.deepEqual(filtered(), ['tiktok.com', 'x.com']);
  assert.equal(sites.sitesChangeAt('always'), null);
});

test('a second removal never pulls a waiting one forward', () => {
  sites.addSite('night', 'a.com');
  sites.addSite('night', 'b.com');
  sites.removeSite('night', 'a.com', new Date(2026, 9, 11, 23));
  sites.removeSite('night', 'b.com', new Date(2026, 9, 10, 23));
  assert.deepEqual(sites.sitesChangeAt('night'), new Date(2026, 9, 11, 23));
  assert.deepEqual(sites.getSites('night'), []);
});

test('a waiting website removal keeps when it was made, and moves only later unless told it may come earlier', () => {
  sites.addSite('always', 'a.com');
  sites.addSite('always', 'b.com');
  const made = new Date(2026, 9, 10, 10);
  sites.removeSite('always', 'a.com', new Date(2026, 9, 10, 23), made);
  // A second removal joins the first, dated as it was.
  sites.removeSite('always', 'b.com', new Date(2026, 9, 10, 22), new Date(2026, 9, 10, 11));
  const dated: number[] = [];
  const later = new Date(2026, 9, 11, 23);
  const due = sites.delaySiteChanges((_list, when) => {
    dated.push(when.getTime());
    return { at: later };
  }, made);
  assert.deepEqual(dated, [made.getTime()]);
  assert.deepEqual(due, []);
  assert.deepEqual(sites.sitesChangeAt('always'), later);
  // Never earlier on its own.
  sites.delaySiteChanges(() => ({ at: new Date(2026, 9, 10, 23) }), made);
  assert.deepEqual(sites.sitesChangeAt('always'), later);
  // Earlier only when the rule says so, and never before now: then it's due.
  const now = new Date(2026, 9, 11, 12);
  assert.deepEqual(sites.delaySiteChanges(() => ({ at: new Date(2026, 9, 11, 9), earlier: true }), now), ['always']);
  assert.deepEqual(sites.sitesChangeAt('always'), now);
  assert.equal(sites.settleSites(now), true);
  assert.deepEqual(sites.getSites('always'), []);
});

test('a website removal saved by an older build (no date) is left where it is', () => {
  const from = new Date(2026, 9, 12, 23);
  st.sharedSet(st.SITES_PENDING_KEY, { night: { sites: [], from: from.getTime() } });
  sites.delaySiteChanges(() => ({ at: new Date(2026, 9, 13, 23) }), new Date(2026, 9, 12, 9));
  assert.deepEqual(sites.sitesChangeAt('night'), from);
});
