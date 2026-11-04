/// <reference types="node" />

/**
 * A pass wakes a used-up daily limit until midnight (user 2026-11-03: "it's not unlocking my
 * limited apps when I use a pass, it's just saying you're already awake"), against the simulated
 * phone (sim-device.ts): the app and the extension both keep it awake for the rest of the day,
 * and the next day counts afresh.
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
const ps = await import('./passes.ts');

/** October 2026 (the 5th is a Monday), local time. */
const at = (d: number, h: number, m = 0) => new Date(2026, 9, d, h, m).getTime();
const asleep = (app: string) => device.state.shielded.has(app);
const SOCIAL = { id: 'limit-0' as const, name: 'Social', minutes: 30 };

afterEach(() => {
  mock.timers.reset();
  device.reset();
});

async function flush() {
  for (let i = 0; i < 8; i++) await new Promise((resolve) => setImmediate(resolve));
}

function drain() {
  while (device.state.queue.length) {
    const e = device.state.queue.shift()!;
    device.fire(e.activity, e.callback);
  }
}

/** The phone runs with Locturne closed until `to`. */
function runTo(to: number) {
  for (const e of device.dueEvents(Date.now(), to)) {
    mock.timers.setTime(e.at);
    device.fire(e.activity, e.callback);
    drain();
  }
  mock.timers.setTime(to);
}

async function open() {
  lc.syncLock();
  drain();
  await st.settleLimitChanges().catch(() => {});
  drain();
  lc.syncLock();
  await flush();
  drain();
}

/** Armed for tonight at 8am; by noon this morning's lock is long over, so the phase is day. */
async function setup() {
  device.reset();
  device.state.cap = 20;
  device.state.asyncRegistration = true;
  mock.timers.enable({ apis: ['Date'], now: at(5, 8) });
  device.exports.setFamilyActivitySelectionId({ id: 'night', familyActivitySelection: token(['tiktok']) });
  device.exports.setFamilyActivitySelectionId({ id: 'always', familyActivitySelection: token(['reddit']) });
  lc.settleSubscription(true);
  rt.saveRoutine(rt.DEFAULT_ROUTINE);
  assert.equal((await armTonight()).status, 'armed');
  await flush();
  drain();
  mock.timers.setTime(at(5, 12));
  await open();
  device.exports.setFamilyActivitySelectionId({ id: SOCIAL.id, familyActivitySelection: token(['instagram']) });
  await st.armLimit(SOCIAL);
  st.saveLimits([SOCIAL]);
  await flush();
  drain();
}

test('a used-up limit alone is something for a pass to wake, and it stays awake until midnight', async () => {
  await setup();
  assert.equal(lc.readLock().phase, 'day');
  // Nothing asleep yet: a pass has nothing to wake.
  assert.equal(ps.getPassRefusal(), 'nothingAsleep');

  assert.ok(device.use(SOCIAL.id, 30));
  drain();
  await open();
  assert.ok(asleep('instagram'), 'used up: asleep');
  assert.deepEqual(
    st.heldLimits().map((l) => [l.id, l.name, l.until]),
    [['limit-0', 'Social', at(6, 0)]],
  );
  assert.equal(ps.getPassRefusal(), null, 'not "You’re already awake"');
  assert.equal(ps.previewPass()?.limits.length, 1);

  const left = ps.getPassesLeft();
  assert.equal(ps.redeemPass().refusal, null);
  drain();
  assert.ok(!asleep('instagram'), 'awake after the pass');
  assert.ok(asleep('reddit'), 'the always list stays asleep');
  assert.equal(ps.getPassesLeft(), left - 1, 'it cost a pass');
  assert.deepEqual(st.heldLimits(), [], 'nothing left for a second pass to wake');

  // Later opens, a re-arm that re-delivers the threshold, and the extension's own reapply all keep it awake.
  await open();
  assert.ok(!asleep('instagram'), 'still awake after opening Locturne');
  await st.armLimit(SOCIAL);
  await flush();
  drain();
  assert.ok(!asleep('instagram'), 'a repeated threshold doesn’t put it back to sleep');
  runTo(at(5, 21));
  assert.ok(!asleep('instagram'), 'awake all evening');

  // Tomorrow counts afresh.
  runTo(at(6, 12));
  await open();
  assert.ok(!asleep('instagram'), 'a new day starts awake');
  assert.ok(device.use(SOCIAL.id, 30));
  drain();
  await open();
  assert.ok(asleep('instagram'), 'used up again the next day: asleep');
});

test('a morning pass wakes a used-up limit too', async () => {
  await setup();
  assert.ok(device.use(SOCIAL.id, 30));
  drain();
  await open();
  assert.ok(asleep('instagram'));
  // The next morning, still under its lock (the morning starts at 7): a new day resets the limit,
  // so it's used up again before the morning is done.
  runTo(at(6, 7, 30));
  await open();
  assert.equal(lc.readLock().phase, 'morning');
  assert.ok(device.use(SOCIAL.id, 30));
  drain();
  await open();
  assert.ok(asleep('instagram'), 'used up this morning');
  assert.equal(ps.redeemPass().refusal, null);
  drain();
  assert.ok(!asleep('instagram'), 'the morning pass woke the limit as well');
});
