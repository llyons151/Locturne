/// <reference types="node" />

/**
 * "I'm up" on the morning shield, across both halves (native-tests/WakeFixtures.swift). The
 * real app code arms a night for each wake-up method and writes the shields (screen-time.ts,
 * lock-controller.ts) through a fake library that stores exactly what the library's JS stores.
 * Then the app "closes": the night's callbacks and a tap on the shield with a scripted
 * pedometer are written as a fixture. The Swift side replays it through the real monitor and
 * ShieldAction extensions and saves the App Group it leaves. This file then reads that App
 * Group with the app's own readers: is the morning won, does Home stop saying it's locked,
 * would the payoff open, does the next sync leave the apps awake?
 *
 * native-tests/run.sh sets NATIVE_FIXTURES (write the fixtures) and then, after the Swift run,
 * NATIVE_WAKE_RESULTS (check what it left). Without either, each scenario is only built.
 */
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, mock, test } from 'node:test';

import { fakeDeviceActivity } from './fake-device-activity.ts';

type HourMinute = { hour: number; minute: number };
type Schedule = { intervalStart: HourMinute; intervalEnd: HourMinute; repeats: boolean };

const fake = fakeDeviceActivity();
const schedules = new Map<string, Schedule>();
const apps = (id: string) => (fake.ids()[id] ? fake.ids()[id].split(',') : []);

// What the library's JS stores, as in native-handoff.test.ts.
const exports = {
  ...fake.exports,
  configureActions: ({ activityName, callbackName, actions, eventName }: {
    activityName: string;
    callbackName: string;
    actions: Record<string, unknown>[];
    eventName?: string;
  }) => {
    const key = eventName ? `actions_for_${activityName}_${callbackName}_${eventName}` : `actions_for_${activityName}_${callbackName}`;
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
  intersection: (a: { activitySelectionId: string }, b: { activitySelectionId: string }) => ({
    applicationCount: apps(a.activitySelectionId).filter((app) => apps(b.activitySelectionId).includes(app)).length,
    categoryCount: 0,
    webdomainCount: 0,
    includeEntireCategory: false,
  }),
  union: () => {},
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
const { currentProof, readLock, syncLock } = await import('./lock-controller.ts');
const { saveRoutine, DEFAULT_ROUTINE } = await import('./routine.ts');
const { heldPhase } = await import('./emergency.ts');
const { getFirstMorning, getMorningsWon } = await import('./morning-proof.ts');

const at = (month: number, day: number, hour: number, minute = 0) => new Date(2026, month - 1, day, hour, minute);

function clock(date: Date) {
  mock.timers.reset();
  mock.timers.enable({ apis: ['Date'], now: date });
}

beforeEach(() => {
  fake.reset();
  schedules.clear();
  mock.timers.reset();
});

/** The night's callbacks between `from` and `to`, as iOS makes them for the registered windows. */
function callbacks(from: Date, to: Date) {
  const out: { at: number; callback: 'start' | 'end'; activity: string }[] = [];
  for (const [activity, s] of schedules) {
    if (!s.repeats) continue;
    for (let d = new Date(from.getFullYear(), from.getMonth(), from.getDate() - 1); d <= to; d.setDate(d.getDate() + 1)) {
      const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), s.intervalStart.hour, s.intervalStart.minute);
      const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), s.intervalEnd.hour, s.intervalEnd.minute);
      if (end <= start) end.setDate(end.getDate() + 1);
      if (start > from && start <= to) out.push({ at: +start, callback: 'start', activity });
      if (end > from && end <= to) out.push({ at: +end, callback: 'end', activity });
    }
  }
  return out.sort((a, b) => a.at - b.at || (a.callback === 'end' ? -1 : 1));
}

type Method = 'steps' | 'downstairs' | 'scan' | 'place' | 'pushups';
type Scenario = {
  name: string;
  method: Method;
  pedometer: { steps: number; ascended?: number; descended?: number };
  /** What the tap should do with Locturne closed. */
  woke: false | 'steps' | 'downstairs';
  /** Whether it sends the notification that opens Locturne. */
  opens: boolean;
};

const SCENARIOS: Scenario[] = [
  { name: 'steps-at-goal', method: 'steps', pedometer: { steps: 240 }, woke: 'steps', opens: false },
  { name: 'steps-short', method: 'steps', pedometer: { steps: 120 }, woke: false, opens: false },
  { name: 'downstairs-floor', method: 'downstairs', pedometer: { steps: 30, descended: 1 }, woke: 'downstairs', opens: false },
  // 200 steps no longer wake another method's morning by themselves (user 2026-10-28).
  { name: 'downstairs-walked', method: 'downstairs', pedometer: { steps: 220 }, woke: false, opens: false },
  { name: 'downstairs-short', method: 'downstairs', pedometer: { steps: 12, descended: 1 }, woke: false, opens: false },
  // No code or place set up here, so those mornings are walks (`methodInUse`): judged on the shield.
  { name: 'scan-short', method: 'scan', pedometer: { steps: 50 }, woke: false, opens: false },
  { name: 'scan-walked', method: 'scan', pedometer: { steps: 260 }, woke: 'steps', opens: false },
  { name: 'place-short', method: 'place', pedometer: { steps: 50, descended: 2 }, woke: false, opens: false },
  { name: 'place-walked', method: 'place', pedometer: { steps: 260 }, woke: 'steps', opens: false },
  { name: 'pushups-short', method: 'pushups', pedometer: { steps: 10 }, woke: false, opens: true },
  { name: 'pushups-walked', method: 'pushups', pedometer: { steps: 300 }, woke: false, opens: true },
];

/** The tap: Tuesday 07:25, the night armed Monday afternoon and synced last at 22:00. */
const TAP = at(10, 6, 7, 25);

/** Onboarding with `method`, the app's last sync in the evening, then closed. The fixture. */
async function closedNightFor(s: Scenario) {
  clock(at(10, 5, 15));
  fake.ids().night = 'tiktok,instagram';
  fake.ids().always = 'reddit';
  saveRoutine({ ...DEFAULT_ROUTINE, method: s.method }, at(10, 5, 15));
  const result = await armTonight();
  assert.equal(result.status, 'armed');
  const evening = at(10, 5, 22);
  clock(evening);
  syncLock(evening);
  await new Promise((r) => setImmediate(r));
  // The app wrote the morning's words and its I'm up for the extension to copy at 7:00.
  const actions = fake.state.store['shieldActions_locturne-morning'] as { primary?: { type?: string } } | undefined;
  assert.equal(actions?.primary?.type, st.MORNING_CHECK, `${s.name}: the morning button checks the walk`);
  return {
    name: s.name,
    store: structuredClone(fake.state.store),
    monitored: [...fake.state.activities],
    callbacks: callbacks(evening, TAP).map((c) => ({ ...c, utcOffset: -new Date(c.at).getTimezoneOffset() * 60 })),
    tap: { at: +TAP, app: 'tiktok', ...s.pedometer, woke: s.woke || null, opens: s.opens },
  };
}

const fixtures = process.env.NATIVE_FIXTURES;
const results = process.env.NATIVE_WAKE_RESULTS;

for (const s of SCENARIOS) {
  test(`wake handoff: ${s.name} builds, and the app wrote the morning check`, async () => {
    const fixture = await closedNightFor(s);
    assert.ok(fixture.callbacks.some((c) => c.callback === 'start' && c.activity.startsWith('night-')), 'a bedtime window');
    assert.ok(fixture.callbacks.some((c) => c.callback === 'end'), 'a window ends by morning');
    if (fixtures) {
      const dir = join(fixtures, 'wake');
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, `${s.name}.json`), JSON.stringify(fixture, null, 2));
    }
  });
}

// After the Swift run: the App Group it left, read by the app's own code.
if (results && existsSync(results)) {
  for (const file of readdirSync(results).filter((f) => f.endsWith('.json')).sort()) {
    const name = file.slice(0, -5);
    const s = SCENARIOS.find((x) => x.name === name);
    test(`wake handoff: the app reads what the shield left, ${name}`, async () => {
      assert.ok(s, `a scenario for ${name}`);
      // The night as the app armed it (its picks as names), then the extension's App Group over it.
      await closedNightFor(s);
      const out = JSON.parse(readFileSync(join(results, file), 'utf8')) as { at: number; store: Record<string, unknown> };
      const picks = fake.state.store.familyActivitySelectionIds;
      fake.state.store = { ...out.store, familyActivitySelectionIds: picks };
      const now = new Date(out.at);
      clock(now);
      const proof = currentProof(now);
      const lock = readLock(now);
      if (s.woke) {
        assert.equal(proof?.kind, s.woke, 'the app sees the shield’s proof for this morning');
        assert.equal(proof?.morningKey, '2026-10-06');
        assert.equal(getMorningsWon(), 1, 'Home’s count');
        assert.equal(getFirstMorning(), '2026-10-06', 'the You tab’s since');
        assert.ok(!lock.blocked.includes('night'), 'the app’s rules have the bedtime apps awake');
        assert.equal(heldPhase(lock.phase, now), lock.phase === 'morning' ? 'morning' : lock.phase);
        assert.ok(!st.isNightHeld(), 'no hold left for the app to act on');
        // The next sync, as opening Locturne does: it must not put them back to sleep.
        fake.state.calls.length = 0;
        syncLock(now);
        await new Promise((r) => setImmediate(r));
        const reshielded = fake.state.calls.some(
          ([fn, arg]) => fn === 'blockSelection' && (arg as { activitySelectionId?: string })?.activitySelectionId === 'night',
        );
        assert.ok(!reshielded, 'opening the app keeps the bedtime apps awake');
      } else {
        assert.equal(proof, null, 'no proof');
        assert.ok(lock.blocked.includes('night'), 'still locked by the app’s rules');
        assert.ok(st.isNightHeld(), 'the hold is still there');
      }
    });
  }
}
