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
    getFamilyActivitySelectionId: (id: string) => saved[id],
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
    userDefaultsGet: (key: string) => store[key],
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
  saved = { night: 'opaque-token' };
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
