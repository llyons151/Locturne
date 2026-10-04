/// <reference types="node" />

/**
 * The handoff between the app and the monitor extension. The real app code (onboarding's
 * arm, routine and list edits, limits, Block now, the emergency unlock, a lapsed
 * subscription) writes the App Group through a fake library that stores exactly what the
 * library's JS stores. Then the app "closes": each scenario lists the callbacks iOS would
 * make from the windows the app registered, and what should be shielded after each one,
 * from the app's own rules (`readLock`).
 *
 * With NATIVE_FIXTURES=<dir> set, each scenario is written there as JSON, and
 * native-tests/run.sh replays it through the real Swift extension, which must agree. Without
 * it, this checks that every scenario builds and that the app's side is self-consistent.
 * Needs `--experimental-test-module-mocks` (set in the npm test script).
 */
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, mock, test } from 'node:test';

import { fakeDeviceActivity } from './fake-device-activity.ts';

type HourMinute = { hour: number; minute: number };
type Schedule = { intervalStart: HourMinute; intervalEnd: HourMinute; repeats: boolean };

const fake = fakeDeviceActivity();
const schedules = new Map<string, Schedule>();
/** Picks are written as comma-separated app names, which the Swift side turns into tokens. */
const apps = (id: string) => (fake.ids()[id] ? fake.ids()[id].split(',') : []);

// What the library's JS (and its native `updateShield`) writes, instead of recording calls.
const exports = {
  ...fake.exports,
  configureActions: ({ activityName, callbackName, actions, eventName }: {
    activityName: string;
    callbackName: string;
    actions: Record<string, unknown>[];
    eventName?: string;
  }) => {
    const key = eventName
      ? `actions_for_${activityName}_${callbackName}_${eventName}`
      : `actions_for_${activityName}_${callbackName}`;
    fake.exports.userDefaultsSet(key, actions);
  },
  updateShieldWithId: (config: unknown, actions: unknown, id = 'default') => {
    fake.exports.userDefaultsSet(`shieldConfiguration_${id}`, config);
    fake.exports.userDefaultsSet(`shieldActions_${id}`, actions);
  },
  updateShield: (config: unknown, actions: unknown) => {
    fake.exports.userDefaultsSet('shieldConfiguration', config);
    fake.exports.userDefaultsSet('shieldActions', actions);
  },
  activitySelectionMetadata: ({ activitySelectionId }: { activitySelectionId: string }) => ({
    applicationCount: apps(activitySelectionId).length,
    categoryCount: 0,
    webdomainCount: 0,
    includeEntireCategory: false,
  }),
  // Live list ⊆ draft: true when every live app is still in the draft (nothing removed).
  isSubsetOf: (a: { activitySelectionId: string }, b: { activitySelectionId: string }) =>
    apps(a.activitySelectionId).every((app) => apps(b.activitySelectionId).includes(app)),
  // Removals only in these scenarios, so the union of live and draft is the live list.
  union: () => {},
  // The library's native `userDefaultsClearWithPrefix`, twice.
  cleanUpAfterActivity: (name: string) => {
    for (const key of Object.keys(fake.state.store)) {
      if (key.startsWith(`actions_for_${name}`) || key.startsWith(`events_${name}`)) delete fake.state.store[key];
    }
  },
  startMonitoring: async (name: string, schedule: Schedule) => {
    schedules.set(name, schedule);
    await fake.exports.startMonitoring(name);
  },
  stopMonitoring: (names: string[]) => {
    for (const name of names) schedules.delete(name);
    fake.exports.stopMonitoring(names);
  },
};
mock.module('react-native-device-activity', { namedExports: exports });

const st = await import('./screen-time.ts');
const { armTonight } = await import('./arm.ts');
const { proveMorning, readLock, syncLock, settleSubscription } = await import('./lock-controller.ts');
const { saveRoutine, DEFAULT_ROUTINE } = await import('./routine.ts');
const { emergencyUnlock, getNightPause } = await import('./emergency.ts');
const { dateKey } = await import('./lock-state.ts');
const { shieldCopy } = await import('./shield-copy.ts');

/** Local time: the tests run in several time zones (`npm run test:tz`). */
const at = (month: number, day: number, hour: number, minute = 0) => new Date(2026, month - 1, day, hour, minute);

beforeEach(() => {
  fake.reset();
  schedules.clear();
  mock.timers.reset();
});

/** Moves the app's clock (`Date.now` and `new Date()`). */
function clock(date: Date) {
  mock.timers.reset();
  mock.timers.enable({ apis: ['Date'], now: date });
}

type Callback = 'start' | 'end' | 'threshold';
type Step = { at: number; local: string; utcOffset: number; callback: Callback; activity: string; shielded: string[]; nightTitle?: string; writes?: Record<string, unknown> };

/** Every callback iOS makes for the registered windows between `from` and `to`, in order. */
function callbacks(from: Date, to: Date): { at: Date; callback: Callback; activity: string }[] {
  const out: { at: Date; callback: Callback; activity: string }[] = [];
  for (const [activity, s] of schedules) {
    let ended = false;
    for (let d = new Date(from.getFullYear(), from.getMonth(), from.getDate() - 1); d <= to; d.setDate(d.getDate() + 1)) {
      const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), s.intervalStart.hour, s.intervalStart.minute);
      const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), s.intervalEnd.hour, s.intervalEnd.minute);
      if (end <= start) end.setDate(end.getDate() + 1);
      // A one-off window (Block now) started before `from`: only its end is still to come.
      if (s.repeats && start > from && start <= to) out.push({ at: start, callback: 'start', activity });
      if ((s.repeats || !ended) && end > from && end <= to) {
        out.push({ at: end, callback: 'end', activity });
        ended = true;
      }
    }
  }
  return out.sort((a, b) => +a.at - +b.at || (a.callback === 'end' ? -1 : 1));
}

/** What the app's rules say should be shielded at `now`, as app names. */
function expected(now: Date): string[] {
  if (st.isStoodDown()) return [];
  const lists = readLock(now).blocked.filter((id) => !(id === 'night' && getNightPause(now)));
  // A bedtime edit waiting for `now` has taken effect by then: the draft is the list.
  const pending = st.listChangeStarts('night');
  const nightApps = pending && +pending <= +now ? apps('night-next') : apps('night').length ? apps('night') : apps('night-next');
  return [...new Set(lists.flatMap((id) => (id === 'night' ? nightApps : apps(id))))].sort();
}

/**
 * Snapshots the App Group as the app left it, then walks the callbacks, recording the
 * expected shields after each. `thresholds` are limit events iOS fires (usage can't be
 * derived from the schedule). Writes the fixture when NATIVE_FIXTURES is set.
 */
function handoff(name: string, from: Date, to: Date, thresholds: { at: Date; activity: string }[] = []) {
  const store = structuredClone(fake.state.store);
  const monitored = [...fake.state.activities];
  const events = [
    ...callbacks(from, to),
    ...thresholds.map((t) => ({ ...t, callback: 'threshold' as const })),
  ].sort((a, b) => +a.at - +b.at);
  const steps: Step[] = events.map((e) => {
    clock(e.at);
    // The extension records a used-up limit's day; the app's rules read it from there.
    const writes: Record<string, unknown> = {};
    if (e.callback === 'threshold') {
      fake.state.store[`locturne.limitReached.${e.activity}`] = dateKey(e.at);
      // The extension must write exactly what `limitUsedUpToday` reads.
      assert.ok(st.limitUsedUpToday(e.activity as `limit-${number}`));
      writes[`locturne.limitReached.${e.activity}`] = dateKey(e.at);
    }
    const isLastEnd = e.callback === 'end' && e.activity.startsWith('night-') && readLock(e.at).phase === 'morning';
    return {
      at: e.at.getTime(),
      local: e.at.toString(),
      // Seconds east of UTC, so the Swift side can tell it runs in the same zone.
      utcOffset: -e.at.getTimezoneOffset() * 60,
      callback: e.callback,
      activity: e.activity,
      shielded: expected(e.at),
      ...(isLastEnd ? { nightTitle: shieldCopy('morning', DEFAULT_ROUTINE).title } : {}),
      ...(Object.keys(writes).length ? { writes } : {}),
    };
  });
  assert.ok(steps.length > 0, `${name}: some callbacks`);
  const dir = process.env.NATIVE_FIXTURES;
  if (dir) {
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, `${name}.json`), JSON.stringify({ name, store, monitored, steps }, null, 2));
  }
  return steps;
}

/** Onboarding: picks, routine, paid, armed at `when`. */
async function onboard(when: Date, routine = DEFAULT_ROUTINE) {
  clock(when);
  fake.ids().night = 'tiktok,instagram';
  fake.ids().always = 'reddit';
  saveRoutine(routine, when);
  const result = await armTonight();
  assert.equal(result.status, 'armed');
}

test('handoff: armed in the afternoon, two nights with the app closed', async () => {
  await onboard(at(10, 5, 15));
  const steps = handoff('two-nights', at(10, 5, 15), at(10, 7, 12));
  const first = steps.find((s) => s.callback === 'start')!;
  assert.deepEqual(first.shielded, ['instagram', 'reddit', 'tiktok']);
});

test('handoff: Friday and Saturday off', async () => {
  await onboard(at(10, 8, 15), { ...DEFAULT_ROUTINE, activeNights: [0, 1, 2, 3, 4] });
  handoff('weekend-off', at(10, 8, 15), at(10, 12, 12));
});

test('handoff: a routine edit turns tonight off from tonight’s bedtime', async () => {
  await onboard(at(10, 5, 15));
  clock(at(10, 6, 14));
  saveRoutine({ ...DEFAULT_ROUTINE, activeNights: [0, 1, 3, 4, 5, 6] }, at(10, 6, 14)); // Tuesday off
  syncLock(at(10, 6, 14));
  await new Promise((r) => setImmediate(r));
  handoff('edit-tuesday-off', at(10, 6, 14), at(10, 8, 12));
});

test('handoff: an app removed from the bedtime list wakes from the next bedtime', async () => {
  await onboard(at(10, 5, 15));
  clock(at(10, 6, 14));
  st.beginListEdit('night');
  fake.ids()['night-next'] = 'tiktok';
  assert.equal(st.finishListEdit('night', at(10, 6, 23)), 'bedtime');
  handoff('remove-instagram', at(10, 6, 14), at(10, 7, 12));
});

test('handoff: an emergency unlock at 00:30, then the app stays closed', async () => {
  await onboard(at(10, 5, 15));
  clock(at(10, 5, 23));
  syncLock(at(10, 5, 23));
  clock(at(10, 6, 0, 30));
  assert.ok(emergencyUnlock(at(10, 6, 0, 30)));
  handoff('emergency', at(10, 6, 0, 30), at(10, 7, 12));
});

test('handoff: a daily limit and a Block now overlapping the bedtime list', async () => {
  await onboard(at(10, 5, 15));
  fake.ids()['limit-0'] = 'youtube,tiktok';
  fake.ids().block = 'youtube,x'; // youtube: when the nap ends, only the used-up limit holds it
  st.saveLimits([{ id: 'limit-0', minutes: 30 }]);
  await st.armLimit({ id: 'limit-0', minutes: 30 });
  clock(at(10, 5, 22, 30));
  await st.startNap('block', 60);
  handoff('limit-and-nap', at(10, 5, 22, 30), at(10, 6, 12), [{ at: at(10, 5, 22, 45), activity: 'limit-0' }]);
});

test('handoff: the subscription lapses in the day, and nothing is shielded at bedtime', async () => {
  await onboard(at(10, 5, 15));
  // The morning under way finishes first, so the lapse lands once it's proven.
  clock(at(10, 6, 7, 30));
  assert.ok(proveMorning('steps', at(10, 6, 7, 30)));
  clock(at(10, 6, 12));
  settleSubscription(false, at(10, 6, 12));
  assert.ok(st.isStoodDown());
  // Nothing is monitored any more, so iOS calls nothing: a stray callback is the test.
  schedules.set('night-0', { intervalStart: { hour: 23, minute: 0 }, intervalEnd: { hour: 23, minute: 45 }, repeats: true });
  const steps = handoff('lapsed', at(10, 6, 12), at(10, 7, 0));
  assert.ok(steps.every((s) => s.shielded.length === 0));
});

test('handoff: the clocks go back (Europe Oct 25, US Nov 1)', async () => {
  await onboard(at(10, 23, 15));
  handoff('autumn-clock-change', at(10, 23, 15), at(11, 2, 12));
});

test('handoff: the clocks go forward (US Mar 14, Europe Mar 28 2027)', async () => {
  clock(new Date(2027, 2, 12, 15));
  fake.ids().night = 'tiktok,instagram';
  fake.ids().always = 'reddit';
  saveRoutine(DEFAULT_ROUTINE, new Date(2027, 2, 12, 15));
  assert.equal((await armTonight()).status, 'armed');
  handoff('spring-clock-change', new Date(2027, 2, 12, 15), new Date(2027, 2, 29, 12));
});
