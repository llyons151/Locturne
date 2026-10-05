/// <reference types="node" />

/**
 * A lapse found in an unproven morning, against the simulated phone (sim-device.ts). GAME_PLAN:
 * nothing sleeps after a lapse beyond the night or morning under way. The monitor extension
 * skips the next night's windows; a sync with the app left open (or offline, before the store
 * answers) must not shield them again, and nothing may say that night still counts.
 * Needs `--experimental-test-module-mocks` (set in the npm test script).
 */
import assert from 'node:assert/strict';
import { afterEach, mock, test } from 'node:test';
const { simDevice, token } = await import('./sim-device.ts');
const device = simDevice();
const fallback: { title: string }[] = [];
mock.module('react-native-device-activity', {
  namedExports: {
    ...device.exports,
    updateShield: (config: { title: string }) => {
      fallback.push(config);
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
const { rollUpHealth } = await import('./health.ts');
const { armTonight } = await import('./arm.ts');
const { lapseLine } = await import('../features/you/lapse-line.ts');

/** Day `day` of October 2026 at hh:mm, local time (Oct 5 is a Monday). */
const at = (day: number, hh: number, mm = 0) => new Date(2026, 9, day, hh, mm).getTime();

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

async function setUp(now: number) {
  mock.timers.enable({ apis: ['Date'], now });
  device.exports.setFamilyActivitySelectionId({ id: 'night', familyActivitySelection: token(['tiktok']) });
  device.exports.setFamilyActivitySelectionId({ id: 'always', familyActivitySelection: token(['reddit']) });
  lc.settleSubscription(true);
  rt.saveRoutine(rt.DEFAULT_ROUTINE);
  assert.equal((await armTonight()).status, 'armed');
}

function health() {
  const now = new Date();
  return rollUpHealth({
    protection: 'on',
    access: 'approved',
    armed: st.getArmedNight(),
    routine: rt.getRoutine(now),
    nights: [],
    unsubscribed: lc.subscriptionEnded(),
    lapseCovers: lc.lapseStillCovers(now),
    now,
  });
}

test('a lapse found in an unproven morning: that morning counts, the next night sleeps nothing', async () => {
  await setUp(at(5, 12));
  advance(at(6, 7, 30));
  lc.settleSubscription(false); // the store: no subscription, in Tuesday's locked morning
  assert.equal(lc.readLock().phase, 'morning');
  assert.ok(device.state.shielded.has('tiktok'), 'the morning under way finishes');
  assert.equal(lc.lapseStillCovers(), 'morning');
  assert.match(health().detail, /This morning still counts/);
  assert.match(lapseLine(lc.lapseStillCovers()), /This morning still counts/);

  // Nobody proves it. At 23:00 the extension skips the window; the app is still open.
  advance(at(6, 23, 0) + 1000);
  assert.ok(!device.state.shielded.has('tiktok'), 'the extension skipped the night');
  lc.syncLock(); // useLock's timer at the next change, before the store answers again
  assert.ok(!device.state.shielded.has('tiktok'), 'the sync puts nothing back to sleep');
  assert.ok(device.state.shielded.has('reddit'), 'the always list waits for the store as before');
  assert.equal(lc.lapseStillCovers(), null);
  assert.equal(em.heldPhase(lc.readLock().phase), 'day', 'nothing asleep for an emergency to lift');
  assert.equal(em.previewEmergency(), null);
  assert.doesNotMatch(health().detail, /still counts/);
  assert.match(health().title, /nothing sleeps/);
  assert.doesNotMatch(lapseLine(lc.lapseStillCovers()), /still counts/);
  // The shield fallback isn't the bedtime words over apps that won't sleep.
  assert.doesNotMatch(fallback.at(-1)?.title ?? '', /sleeping/i);

  advance(at(7, 9));
  lc.syncLock();
  assert.deepEqual([...device.state.shielded].sort(), ['reddit'], 'Wednesday morning is free');
  assert.equal(em.heldPhase(lc.readLock().phase), 'day');
});

test('a lapse found mid-night: tonight still counts, and says so', async () => {
  await setUp(at(5, 12));
  advance(at(5, 23, 30));
  lc.settleSubscription(false);
  assert.equal(lc.lapseStillCovers(), 'night');
  assert.match(health().detail, /Tonight still counts/);
  advance(at(6, 0, 30));
  lc.syncLock();
  assert.ok(device.state.shielded.has('tiktok'), 'the night under way finishes');
  assert.equal(em.heldPhase(lc.readLock().phase), 'night');
});
