/// <reference types="node" />

/**
 * A shield no rule holds (user 2026-11-03: a Block now's apps still asleep the morning after it
 * ran on into bedtime, with Locturne opened) wakes at the next open (`rebuildShields`), against
 * the simulated phone (sim-device.ts).
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
const { armTonight } = await import('./arm.ts');

type Routine = import('./routine.ts').Routine;

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


test('a Block now that ran on into bedtime: its apps are awake by the morning', async () => {
  await setUp(at(2, 14), { bedtime: 22 * 60 + 30, morningStart: 7 * 60, method: 'scan' });
  device.exports.setFamilyActivitySelectionId({ id: 'block', familyActivitySelection: token(['games', 'mail']) });
  runTo(at(2, 22));
  await st.startNap('block', 120);
  drain();
  assert.ok(asleep('games'));
  runTo(at(3, 0, 5));
  assert.ok(!asleep('games'), 'the nap ended at midnight');
  assert.ok(asleep('insta'), 'the night still holds');
  runTo(at(3, 7, 10));
  await open();
  assert.ok(lc.proveMorning('scan'));
  drain();
  assert.ok(!asleep('games') && !asleep('mail') && !asleep('insta'));
  assert.ok(asleep('reddit'), 'the always list stays asleep');
});

test('a shield left behind with no rule holding it wakes at the next open', async () => {
  await setUp(at(2, 14), { bedtime: 22 * 60 + 30, morningStart: 7 * 60, method: 'scan' });
  device.exports.setFamilyActivitySelectionId({ id: 'block', familyActivitySelection: token(['games', 'mail']) });
  runTo(at(2, 22));
  await st.startNap('block', 120);
  drain();
  runTo(at(3, 0, 5));
  // However it happened on the phone: the nap is over and forgotten, its apps still on the blocklist.
  device.state.shielded.add('games');
  device.state.shielded.add('mail');
  runTo(at(3, 7, 10));
  await open();
  assert.ok(asleep('insta'), 'the morning still holds the bedtime apps');
  assert.ok(!asleep('games') && !asleep('mail'), 'nothing holds the nap apps');
  assert.ok(lc.proveMorning('scan'));
  drain();
  assert.ok(!asleep('insta') && !asleep('games'));
  assert.ok(asleep('reddit') && asleep('news'));
});
