/// <reference types="node" />

/**
 * Time chaos: what real people do to the routine's times, against the simulated iPhone
 * (sim-device.ts, a port of the monitor extension, so "with the app closed" means what iOS
 * would really shield). The other fuzzers judge whole weeks and skip the mornings an edit
 * touched (lock-fuzz) or attack from bed (bypass-fuzz). This one is about the edit sequences
 * themselves: spinning bedtime and the wake-up back and forth, a night that begins in a minute,
 * a save the second before or after a boundary, nights toggled off and on, the method or step
 * goal switched, edits just after the walk, the app closed, and DST.
 *
 * Edits go through the real `applyRoutineEdit` and `sleepsAtOnce` (features/routine/
 * apply-edit.ts, compiled with Babel and wired to the real lib modules, as apply-edit.test.ts
 * does with fakes), so the 4-hour `MIN_NIGHT` refusal and the from-bed refusal are the app's own.
 *
 * Invariants:
 * - nothing throws;
 * - an edit is refused exactly when `routineEditRefusal` says so, and a refused edit changes
 *   nothing; a night iOS holds (bedtime apps shielded, `readLock` night or morning) always refuses;
 * - a night shorter than `MIN_NIGHT` is never saved;
 * - honest: once a morning is proven, the bedtime apps stay awake (app open or closed) until a
 *   night of the routine in force begins after the proof;
 * - held: a night or morning that iOS holds is never freed by any sequence of edits and opens
 *   without a proof, only by the next bedtime of a night that's off;
 * - after any open (`syncLock`), `readLock` and what iOS shields agree; with the app closed they
 *   agree away from a boundary's two-minute slack;
 * - a routine with a night on always has windows armed (`getArmedNight`, and iOS monitors them).
 *
 * Known bugs (2026-10-28) have `todo` tests below with a minimal repro each; the random runs
 * count them (`known-*` in TIME_CHAOS_STATS) rather than fail on them, and fail on anything else.
 *
 * TIME_CHAOS_SEEDS=<n> (default 300), TIME_CHAOS_SEED=<n> to replay one, TIME_CHAOS_DEBUG=1 for
 * the log, TIME_CHAOS_STATS=1 for the counts, TIME_CHAOS_GROUP=1 to group failures by invariant.
 * Run under TZ=America/New_York and TZ=Europe/London (and Australia/Sydney) for the DST days.
 * Needs `--experimental-test-module-mocks` (set in the npm test script).
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { afterEach, mock, test } from 'node:test';
import { runInNewContext } from 'node:vm';

import { prng, simDevice, token } from './sim-device.ts';

const device = simDevice();
mock.module('react-native-device-activity', { namedExports: device.exports });
mock.module('react-native', { namedExports: { Platform: { OS: 'web' }, Alert: { alert: () => undefined } } });
mock.module('expo-notifications', {
  namedExports: {
    setNotificationHandler: () => undefined,
    IosAuthorizationStatus: {},
    SchedulableTriggerInputTypes: { DATE: 'date', CALENDAR: 'calendar' },
  },
});
const lc = await import('./lock-controller.ts');
const ls = await import('./lock-state.ts');
const rt = await import('./routine.ts');
const st = await import('./screen-time.ts');
const mp = await import('./morning-proof.ts');
const em = await import('./emergency.ts');
const scan = await import('./scan.ts');
const { armTonight } = await import('./arm.ts');

type Routine = import('./routine.ts').Routine;

/* ---------- The Routine tab's save, the real one ---------- */

/** `armIfPaid`'s arm, when an edit finds nothing armed (every night was off). Awaited by `edit`. */
let armIfPaidRun: Promise<unknown> | null = null;
const require = createRequire(import.meta.url);
const babel = require('@babel/core');
const applyEditCode = babel.transformSync(readFileSync(new URL('../features/routine/apply-edit.ts', import.meta.url), 'utf8'), {
  filename: 'apply-edit.ts',
  configFile: false,
  babelrc: false,
  presets: ['@babel/preset-typescript'],
  plugins: ['@babel/plugin-transform-modules-commonjs'],
}).code;
const ae = {} as {
  routineEditRefusal: (now?: Date) => 'asleep' | null;
  sleepsAtOnce: (next: Routine, now?: Date) => 'night' | 'morning' | null;
  applyRoutineEdit: (next: Routine) => Promise<boolean>;
  getSetRoutine: (now?: Date) => Routine;
};
{
  const modules: Record<string, unknown> = {
    'react-native': { Alert: { alert: () => undefined } },
    '@/hooks/use-app-start': {
      // Paid throughout here: `isEntitled` answers yes and `armTonight` runs.
      armIfPaid: () => {
        lc.settleSubscription(true);
        armIfPaidRun = armTonight().catch(() => {});
      },
    },
    '@/lib/emergency': em,
    '@/lib/lock-controller': lc,
    '@/lib/lock-state': ls,
    '@/lib/morning-proof': mp,
    '@/lib/notifications': { rescheduleNotifications: async () => {} },
    '@/lib/routine': rt,
    '@/lib/scan': scan,
    '@/lib/screen-time': st,
  };
  // The host's `Date` as `mock.timers` has it at each call (a fresh context reads the real clock).
  const context = { exports: ae, require: (id: string) => modules[id], Promise };
  Object.defineProperty(context, 'Date', { get: () => globalThis.Date });
  runInNewContext(applyEditCode, context);
}

/* ---------- The phone ---------- */

const MIN = 60_000;
const DAY = 24 * 60 * MIN;
/** Two minutes, the extension's slack at either end of a window, and a bit. */
const SLACK = 3 * MIN;

afterEach(() => {
  mock.timers.reset();
  device.reset();
});

async function flush() {
  for (let i = 0; i < 6; i++) await new Promise((resolve) => setImmediate(resolve));
}

/** What iOS queued straight after a registration (a window registered inside its interval). */
function drain() {
  while (device.state.queue.length) {
    const e = device.state.queue.shift()!;
    device.fire(e.activity, e.callback);
  }
}

/** Runs the phone with Locturne closed until `to`, calling `check` after each instant's callbacks. */
function advance(to: number, check?: (why: string) => void) {
  const due = device.dueEvents(Date.now(), to);
  due.forEach((e, i) => {
    mock.timers.setTime(e.at);
    device.fire(e.activity, e.callback);
    drain();
    if (check && due[i + 1]?.at !== e.at) check(`after ${e.activity} ${e.callback}`);
  });
  mock.timers.setTime(to);
}

const shielded = () => device.state.shielded.has('tiktok');
const asleep = (phase: string) => phase === 'night' || phase === 'morning';
const hm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const show = (r: Routine) => `${hm(r.bedtime)}-${hm(r.morningStart)} [${r.activeNights.join('')}] ${r.method}/${r.stepGoal}`;

async function setUp(now: number, routine: Partial<Routine> = {}) {
  mock.timers.enable({ apis: ['Date'], now });
  device.exports.setFamilyActivitySelectionId({ id: 'night', familyActivitySelection: token(['tiktok']) });
  device.exports.setFamilyActivitySelectionId({ id: 'always', familyActivitySelection: token(['reddit']) });
  lc.settleSubscription(true);
  rt.saveRoutine({ ...rt.DEFAULT_ROUTINE, ...routine });
  assert.equal((await armTonight()).status, 'armed');
  drain();
}

/**
 * The Routine tab's `set`: the routine as set, with `patch`; if it would sleep the apps now
 * (`sleepsAtOnce`), "Sleep now" (or Cancel when `cancel`). Refused from bed (`commit`). Waits
 * for arming to settle and runs what iOS queued.
 */
async function edit(patch: Partial<Routine>, { cancel = false, wait = true } = {}): Promise<'applied' | 'refused' | 'short' | 'cancelled'> {
  const next = { ...ae.getSetRoutine(), ...patch };
  if (ae.sleepsAtOnce(next) && cancel) return 'cancelled';
  if (ae.routineEditRefusal()) return 'refused';
  const done = ae.applyRoutineEdit(next);
  if (!wait) return 'applied';
  const ok = await done;
  await armIfPaidRun;
  armIfPaidRun = null;
  await flush();
  drain();
  if (!ok) return rt.nightTooShort(next.bedtime, next.morningStart) ? 'short' : 'refused';
  return 'applied';
}

/** Records a walk for the morning under way, as the step watcher does at the goal. */
function walk() {
  return lc.proveMorning('steps');
}

/** Day `day` of October 2026 at hh:mm, local time (Oct 5 is a Monday). */
const at = (day: number, hh: number, mm = 0, ss = 0) => new Date(2026, 9, day, hh, mm, ss).getTime();

/** Armed on the 5th, the night of the 5th held, walked at 07:05 on the 6th. */
async function wonMorning(routine: Partial<Routine> = {}) {
  await setUp(at(5, 12), routine);
  const r = rt.getRoutine();
  advance(ls.nightInto('2026-10-06', r).end.getTime() + 2 * MIN);
  assert.equal(lc.syncLock().phase, 'morning');
  assert.ok(shielded());
  advance(Date.now() + 3 * MIN);
  assert.ok(walk(), 'the walk counts');
  assert.equal(lc.syncLock().phase, 'day');
  assert.ok(!shielded());
}

/** Asserts the bedtime apps are awake at every callback and every 10 minutes, app closed, until `to`. */
function staysAwakeTo(to: number, why: string) {
  const check = (when: string) => {
    assert.ok(!shielded(), `${why}: shielded ${when} at ${new Date(Date.now()).toString().slice(0, 24)}`);
    assert.ok(!asleep(lc.readLock().phase), `${why}: readLock asleep ${when} at ${new Date(Date.now()).toString().slice(0, 24)}`);
  };
  while (Date.now() < to) {
    advance(Math.min(to, Date.now() + 10 * MIN), check);
    check('(closed)');
  }
}

/* ---------- Scripted: spinning the times after the walk ---------- */

test('after the walk, the wake-up spun back and forth (awaited and not) never sleeps the apps again today', async () => {
  await wonMorning();
  // 07:10: the dial spun, saved at each release, a second or so apart.
  advance(at(6, 7, 10));
  for (const morningStart of [8 * 60, 7 * 60, 9 * 60 + 30, 6 * 60, 11 * 60, 7 * 60 + 6, 7 * 60 + 4, 10 * 60]) {
    assert.equal(await edit({ morningStart }), 'applied', `wake-up ${hm(morningStart)}`);
    assert.equal(lc.syncLock().phase, 'day', `wake-up ${hm(morningStart)}`);
    assert.ok(!shielded(), `wake-up ${hm(morningStart)}`);
    advance(Date.now() + 1000);
  }
  // A burst nobody awaits (each release fires its own save), then the arming settles.
  for (const morningStart of [8 * 60, 12 * 60, 7 * 60 + 30, 9 * 60]) await edit({ morningStart }, { wait: false });
  await flush();
  drain();
  assert.equal(lc.syncLock().phase, 'day');
  assert.ok(!shielded());
  staysAwakeTo(at(6, 22, 55), 'after spinning the wake-up');
  // Tonight still runs under the last edit (23:00 to 09:00) and its morning needs a walk.
  advance(at(6, 23, 5));
  assert.equal(lc.syncLock().phase, 'night');
  assert.ok(shielded());
  advance(at(7, 9, 5));
  assert.equal(lc.syncLock().phase, 'morning');
  assert.ok(shielded());
});

test('after the walk, bedtime and wake-up both dragged around this morning: awake until a night that begins after the walk', async () => {
  await wonMorning();
  advance(at(6, 7, 12));
  // Every one of these nights has the 6th as its morning and began before the walk (or is a
  // later one): none may sleep the apps now.
  const moves: Partial<Routine>[] = [
    { bedtime: 3 * 60, morningStart: 8 * 60 }, // 03:00 to 08:00, began before the walk
    { bedtime: 2 * 60, morningStart: 9 * 60 },
    { bedtime: 7 * 60, morningStart: 11 * 60 }, // 07:00 to 11:00: began 5 minutes before the walk
    { bedtime: 23 * 60, morningStart: 7 * 60 },
  ];
  for (const m of moves) {
    assert.equal(await edit(m), 'applied', JSON.stringify(m));
    assert.equal(lc.syncLock().phase, 'day', JSON.stringify(m));
    assert.ok(!shielded(), JSON.stringify(m));
  }
  // 07:00 to 11:00 again with the app closed through to noon: still awake.
  assert.equal(await edit({ bedtime: 7 * 60, morningStart: 11 * 60 }), 'applied');
  staysAwakeTo(at(6, 12), '07:00-11:00 after a 07:05 walk');
  // Its next night (07:00 tomorrow) is a new one and sleeps the apps.
  advance(at(7, 7, 1));
  assert.ok(shielded(), 'tomorrow 07:00 holds');
  assert.equal(lc.syncLock().phase, 'night');
});

test('after the walk, a night that begins in a minute sleeps the apps at its bedtime and needs its own walk', async () => {
  await wonMorning();
  advance(at(6, 7, 20));
  // 07:21 to 11:21: same morning key as the walk, but begins after it.
  assert.equal(await edit({ bedtime: 7 * 60 + 21, morningStart: 11 * 60 + 21 }), 'applied');
  assert.ok(!shielded());
  advance(at(6, 7, 21, 30));
  assert.ok(shielded(), 'closed: iOS starts the new night');
  assert.equal(lc.readLock().phase, 'night');
  assert.equal(await edit({ bedtime: 23 * 60, morningStart: 7 * 60 }), 'refused', 'from bed');
  advance(at(6, 11, 25));
  assert.equal(lc.syncLock().phase, 'morning');
  assert.ok(shielded());
  assert.ok(walk(), 'its own walk');
  assert.ok(!shielded());
});

test('a save the second before bedtime moves it later; the second after is refused', async () => {
  await setUp(at(5, 12));
  advance(at(5, 22, 59, 59));
  assert.equal(await edit({ bedtime: 23 * 60 + 30 }), 'applied');
  // Closed: the old 23:00 window is gone.
  advance(at(5, 23, 10));
  assert.ok(!shielded(), '23:00 no longer shields');
  assert.equal(lc.readLock().phase, 'day');
  advance(at(5, 23, 30, 1));
  assert.ok(shielded(), '23:30 does');
  assert.equal(await edit({ bedtime: 23 * 60 + 45 }), 'refused');
  assert.equal(await edit({ activeNights: [] }), 'refused');
  assert.ok(shielded());
});

test('a wake-up moved earlier than now while the morning is unproven is refused (asleep)', async () => {
  await setUp(at(5, 12));
  advance(at(6, 7, 30));
  assert.equal(lc.syncLock().phase, 'morning');
  for (const patch of [{ morningStart: 7 * 60 + 15 }, { morningStart: 6 * 60 }, { bedtime: 7 * 60 + 35, morningStart: 12 * 60 }, { activeNights: [] }, { stepGoal: 1 }, { method: 'pushups' as const }]) {
    assert.equal(await edit(patch), 'refused', JSON.stringify(patch));
    assert.ok(shielded(), JSON.stringify(patch));
  }
});

test('tonight switched off the second before bedtime, then back on the minute after: sleeps at once', async () => {
  await setUp(at(5, 12));
  advance(at(5, 22, 59, 59));
  const monday = 1;
  assert.equal(await edit({ activeNights: [0, 2, 3, 4, 5, 6] }), 'applied');
  advance(at(5, 23, 1));
  assert.ok(!shielded(), 'off: 23:00 skipped');
  assert.equal(lc.readLock().phase, 'off');
  assert.equal(ae.sleepsAtOnce({ ...rt.getRoutine(), activeNights: [0, 1, 2, 3, 4, 5, 6] }), 'night');
  assert.equal(await edit({ activeNights: [monday, 0, 2, 3, 4, 5, 6].sort() }), 'applied');
  assert.ok(shielded(), 'back on: asleep now');
  assert.equal(lc.syncLock().phase, 'night');
  advance(at(6, 7, 5));
  assert.equal(lc.syncLock().phase, 'morning');
  assert.ok(shielded());
});

test('every night off, then back on before bedtime: tonight is armed again', async () => {
  await setUp(at(5, 12));
  advance(at(5, 18));
  assert.equal(await edit({ activeNights: [] }), 'applied');
  assert.equal(st.getArmedNight(), null, 'disarmed');
  advance(at(5, 18, 1));
  assert.equal(await edit({ activeNights: [0, 1, 2, 3, 4, 5, 6] }), 'applied');
  assert.ok(st.getArmedNight(), 'armed again');
  advance(at(5, 23, 1));
  assert.ok(shielded(), 'tonight holds');
});

test('MIN_NIGHT: 3h59 is refused (also as a 1-minute night), 4h is saved', async () => {
  await setUp(at(5, 12));
  const before = JSON.stringify(rt.getRoutine());
  assert.equal(await edit({ bedtime: 13 * 60, morningStart: 16 * 60 + 59 }), 'short');
  assert.equal(await edit({ bedtime: 12 * 60 + 1, morningStart: 12 * 60 + 2 }), 'short');
  assert.equal(await edit({ bedtime: 12 * 60, morningStart: 12 * 60 }), 'short', 'equal times: no night');
  assert.equal(JSON.stringify(rt.getRoutine()), before, 'nothing saved');
  assert.equal(await edit({ bedtime: 13 * 60, morningStart: 17 * 60 }), 'applied');
  advance(at(5, 13, 1));
  assert.ok(shielded());
});

test('method and step goal switched just after the walk: still awake, tomorrow uses the new ones', async () => {
  await wonMorning();
  advance(at(6, 7, 6));
  for (const patch of [{ method: 'pushups' as const }, { stepGoal: 1000 }, { method: 'downstairs' as const }, { stepGoal: 50, method: 'steps' as const }]) {
    assert.equal(await edit(patch), 'applied');
    assert.equal(lc.syncLock().phase, 'day');
    assert.ok(!shielded());
  }
  staysAwakeTo(at(6, 22, 59), 'after method switches');
});

/* ---------- Scripted: probing `proven` (a morning proven before the wake-up moved later) ---------- */

test('proven: the proof frees only its own night, not the next one into the same morning key', async () => {
  // Bedtime after midnight: the night and its morning share a calendar day. Walk at 07:05.
  await wonMorning({ bedtime: 1 * 60, morningStart: 7 * 60 });
  advance(at(6, 9));
  // A second night into the 6th, beginning after the walk: 10:00 to 14:00.
  assert.equal(await edit({ bedtime: 10 * 60, morningStart: 14 * 60 }), 'applied');
  advance(at(6, 10, 1));
  assert.ok(shielded());
  assert.equal(lc.syncLock().phase, 'night');
  // From that night: the wake-up moved later is refused; the proof doesn't reach it.
  assert.equal(await edit({ morningStart: 15 * 60 }), 'refused');
  advance(at(6, 14, 5));
  assert.equal(lc.syncLock().phase, 'morning');
  assert.ok(shielded());
});

test('proven: a proof stamped by a clock set forward frees nothing once the clock is back', async () => {
  await setUp(at(5, 12));
  advance(at(5, 23, 30));
  mock.timers.setTime(at(6, 7, 5));
  mp.recordProof({ morningKey: '2026-10-06', kind: 'steps', at: Date.now() }, lc.judgedAt(new Date()));
  mock.timers.setTime(at(5, 23, 40));
  assert.equal(lc.syncLock().phase, 'night');
  assert.ok(shielded());
  assert.equal(await edit({ morningStart: 8 * 60 }), 'refused');
});

test('proven: a proof for the morning, then the wake-up moved earlier than the walk and later again, keeps tomorrow locked', async () => {
  await wonMorning();
  advance(at(6, 7, 10));
  assert.equal(await edit({ morningStart: 6 * 60 }), 'applied');
  assert.equal(await edit({ morningStart: 9 * 60 }), 'applied');
  assert.equal(await edit({ bedtime: 21 * 60, morningStart: 6 * 60 }), 'applied');
  advance(at(6, 21, 1));
  assert.ok(shielded(), 'tonight 21:00 holds');
  assert.equal(lc.syncLock().phase, 'night');
  advance(at(7, 6, 30));
  assert.equal(lc.syncLock().phase, 'morning');
  assert.ok(shielded());
});

test('proven: a night shift proven at 16:05, then its night stretched over the proof, stays awake; the next shift holds', async () => {
  await setUp(at(5, 7), { bedtime: 8 * 60, morningStart: 16 * 60 });
  advance(at(6, 16, 2));
  assert.equal(lc.syncLock().phase, 'morning');
  advance(at(6, 16, 5));
  assert.ok(walk());
  advance(at(6, 16, 10));
  assert.equal(await edit({ morningStart: 20 * 60 }), 'applied');
  assert.equal(lc.syncLock().phase, 'day');
  staysAwakeTo(at(6, 21), 'stretched shift');
  advance(at(7, 8, 1));
  assert.ok(shielded());
});

/* ---------- DST (runs as a plain night outside a DST zone) ---------- */

/** The DST change after `from` in this zone, or null. */
function dstAfter(from: number): number | null {
  let t = from;
  const off = new Date(t).getTimezoneOffset();
  for (let i = 0; i < 24 * 400; i++, t += 3_600_000) if (new Date(t).getTimezoneOffset() !== off) return t;
  return null;
}

for (const season of ['spring', 'autumn'] as const) {
  test(`DST (${season}, TZ=${process.env.TZ ?? 'unset'}): wake-up spun after the walk on the change day stays awake`, async () => {
    const change = dstAfter(season === 'spring' ? new Date(2026, 1, 1).getTime() : new Date(2026, 8, 1).getTime());
    if (change === null) return; // no DST here
    const d = new Date(change);
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1, 12).getTime();
    // A night across the change, 01:30 to 05:30, armed the noon before.
    mock.timers.enable({ apis: ['Date'], now: day });
    device.exports.setFamilyActivitySelectionId({ id: 'night', familyActivitySelection: token(['tiktok']) });
    lc.settleSubscription(true);
    rt.saveRoutine({ ...rt.DEFAULT_ROUTINE, bedtime: 90, morningStart: 330 });
    assert.equal((await armTonight()).status, 'armed');
    drain();
    const morning = ls.nightInto(ls.dateKey(d), rt.getRoutine()).end.getTime();
    advance(morning - 10 * MIN);
    assert.ok(shielded(), 'held across the change');
    advance(morning + 5 * MIN);
    assert.equal(lc.syncLock().phase, 'morning');
    assert.ok(walk());
    advance(morning + 10 * MIN);
    for (const morningStart of [7 * 60, 6 * 60, 9 * 60, 5 * 60 + 35]) {
      assert.equal(await edit({ morningStart }), 'applied');
      assert.ok(!shielded(), `after ${hm(morningStart)}`);
    }
    staysAwakeTo(morning + 8 * 60 * MIN, 'DST spun wake-up');
  });
}

/* ---------- Known bugs (todo: each asserts what should happen, and fails today) ---------- */

test('prior-never-ran (fixed 2026-10-28): a shift worker switches to nights at 07:30, then changes the step goal: the apps must not lock', {
}, async () => {
  // 08:00 to 16:00 shifts, walked at 16:05 on the 5th.
  await setUp(at(5, 7), { bedtime: 8 * 60, morningStart: 16 * 60 });
  advance(at(5, 16, 5));
  assert.ok(walk());
  // 07:30 on the 6th, before the next shift: switches to 23:00 to 07:00. Nothing ran into this
  // morning under either routine, so it's free (as designed).
  advance(at(6, 7, 30));
  assert.equal(await edit({ bedtime: 23 * 60, morningStart: 7 * 60 }), 'applied');
  assert.equal(lc.syncLock().phase, 'day');
  assert.ok(!shielded());
  // 07:35: any save at all (step goal, method, a minute on the wake-up)...
  advance(at(6, 7, 35));
  assert.equal(ae.sleepsAtOnce({ ...rt.getRoutine(), stepGoal: 500 }), null, 'no "Sleep now" question');
  assert.equal(await edit({ stepGoal: 500 }), 'applied');
  // ...must leave it free. Today: phase 'morning', the apps shielded until a walk.
  assert.equal(lc.syncLock().phase, 'day');
  assert.ok(!shielded());
});

test('prior-morning-over (fixed 2026-10-28): walked this morning, then a daytime night saved for later today locks the apps at once', {
}, async () => {
  // Armed on the 4th; the morning of the 5th never walked (asleep all day, as designed); the
  // night of the 5th held; walked at 07:05 on the 6th.
  await setUp(at(4, 12));
  advance(at(5, 23, 30));
  assert.equal(lc.syncLock().phase, 'night');
  advance(at(6, 7, 5));
  assert.ok(walk());
  assert.ok(!shielded());
  // 09:00: a nap-like night later today, 09:30 to 19:30. Under it, 09:00 is the morning keyed
  // the 5th (yesterday's), which the old routine held unproven.
  advance(at(6, 9));
  const next = { ...rt.getRoutine(), bedtime: 9 * 60 + 30, morningStart: 19 * 60 + 30 };
  assert.equal(ae.sleepsAtOnce(next), null, 'no "Sleep now" question');
  assert.equal(await edit({ bedtime: 9 * 60 + 30, morningStart: 19 * 60 + 30 }), 'applied');
  // Should be awake until 09:30. Today: 'morning' at once, shielded, needing a second walk.
  assert.equal(lc.syncLock().phase, 'day');
  assert.ok(!shielded());
  advance(at(6, 9, 31));
  assert.ok(shielded(), 'the new night holds from 09:30');
});

test('no-prompt-when-disarmed (fixed 2026-10-28): every night off, tonight switched back on inside its night sleeps the apps with no "Sleep now" question', {
}, async () => {
  await setUp(at(5, 12));
  advance(at(5, 18));
  assert.equal(await edit({ activeNights: [] }), 'applied');
  assert.equal(st.getArmedNight(), null);
  advance(at(5, 23, 30));
  const next = { ...rt.getRoutine(), activeNights: [0, 1, 2, 3, 4, 5, 6] };
  const asks = ae.sleepsAtOnce(next);
  // The save does sleep the apps now (by design, as when armed)...
  assert.equal(await edit({ activeNights: [0, 1, 2, 3, 4, 5, 6] }), 'applied');
  assert.ok(shielded());
  // ...so the Routine tab must have asked first.
  assert.equal(asks, 'night');
});

test('window-bedtime-seconds (fixed 2026-10-28): a night moved to begin in the minute of the walk shields with the app closed while the app says awake', {
}, async () => {
  await wonMorning(); // walked at 07:05 on the 6th under 23:00 to 07:00
  // Wake-up moved to 09:10 (proven today, so still awake); tomorrow's walk lands at 09:12:25.
  advance(at(6, 9));
  assert.equal(await edit({ morningStart: 9 * 60 + 10 }), 'applied');
  advance(at(7, 9, 12, 25));
  assert.equal(lc.syncLock().phase, 'morning');
  assert.ok(walk());
  advance(at(7, 9, 12, 59));
  // 09:12 to 13:12: same morning key, began 25 seconds before the walk. The app reads it proven.
  assert.equal(await edit({ bedtime: 9 * 60 + 12, morningStart: 13 * 60 + 12 }), 'applied');
  assert.equal(lc.readLock().phase, 'day');
  // iOS ran the window registered inside its interval: its bedtime 09:12:59 is after the walk.
  assert.ok(!shielded(), 'iOS shields though the app says awake');
});

test(`dst-window-bedtime (fixed 2026-10-28): after the clocks go back inside a night moved over the walk, a window re-shields it (TZ=${process.env.TZ ?? 'unset'})`, {
}, async () => {
  const change = dstAfter(new Date(2026, 8, 1).getTime());
  if (change === null) return; // no DST here
  // Only a change that goes back repeats an hour (Santiago's next one after September goes forward).
  if (new Date(change).getTimezoneOffset() <= new Date(change - 3_600_000).getTimezoneOffset()) return;
  const d = new Date(change);
  // The repeated hour starts at the wall time the change goes back to (01:00 in both zones).
  const first = new Date(change - 3_600_000);
  const repeat = first.getHours() * 60 + first.getMinutes(); // e.g. 01:00
  const bedtime = (repeat - 4 * 60 + 1440) % 1440; // a night ending in the repeated hour
  const morningStart = repeat + 30;
  await setUp(new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1, 12).getTime(), { bedtime, morningStart });
  // Morning start (first pass of the repeated hour), walk a minute later.
  const start = ls.wallClock(d, morningStart).getTime();
  advance(start + MIN);
  assert.equal(lc.syncLock().phase, 'morning');
  assert.ok(walk());
  advance(start + MIN + 12_000);
  // The night moved over the walk: repeat+30 to repeat+4h30, began before it. Proven: awake.
  assert.equal(await edit({ bedtime: morningStart, morningStart: (morningStart + 240) % 1440 }), 'applied');
  assert.equal(lc.syncLock().phase, 'day');
  // Closed through the change and on: should stay awake (it's the morning just walked).
  staysAwakeTo(start + 4 * 60 * MIN, 'after the clocks went back');
});

test('BUG stale-windows (latent): one save moving bedtime later and turning tonight on, inside the old windows\' night, sleeps the apps at once', {
  todo: 'heldUntil (wake/arming.ts:239) and asArmed (routine.ts) treat the old windows as holding tonight by the new routine\'s nights, though the old routine had tonight off and they never shielded. No Routine tab control saves times and nights together today.',
}, async () => {
  // 20:45 to 01:00, Friday only. Sunday 20:50: inside the windows, but Sunday is off: awake.
  await setUp(at(25, 14), { bedtime: 20 * 60 + 45, morningStart: 60, activeNights: [5] });
  advance(at(25, 20, 50));
  assert.equal(lc.readLock().phase, 'off');
  const next = { ...rt.getRoutine(), bedtime: 23 * 60, morningStart: 6 * 60, activeNights: [0, 2] };
  assert.equal(ae.sleepsAtOnce(next), null, 'the tab sees nothing to ask about');
  assert.equal(await edit({ bedtime: 23 * 60, morningStart: 6 * 60, activeNights: [0, 2] }), 'applied');
  // Should be awake until 23:00. Today: night at once, with the 20:45 windows kept.
  assert.equal(lc.syncLock().phase, 'off');
  assert.ok(!shielded());
});

test('tz-switch-frees-night (fixed 2026-10-28): from bed at 05:00, the zone set to London, 200 steps, the zone set back: the night is free', {
}, async () => {
  const zone = process.env.TZ;
  try {
    process.env.TZ = 'America/New_York';
    await setUp(at(5, 12));
    advance(at(6, 5));
    assert.equal(lc.syncLock().phase, 'night');
    // Settings: the time zone set to London (10:00 there, past its 07:00 morning start).
    const t = Date.now();
    process.env.TZ = 'Europe/London';
    assert.equal(lc.syncLock().phase, 'morning');
    assert.ok(walk(), 'a walk around the room counts as the London morning');
    // Back to New York: 05:01, inside the night the walk was made in.
    process.env.TZ = 'America/New_York';
    advance(t + MIN);
    assert.equal(lc.syncLock().phase, 'night', 'bedtime should still win until 07:00');
    assert.ok(shielded());
  } finally {
    if (zone === undefined) delete process.env.TZ;
    else process.env.TZ = zone;
  }
});

/* ---------- Random edit sequences ---------- */

class ChaosFailure extends Error {}

/** One seeded run: returns the counts of what happened, throws `ChaosFailure` on a broken invariant. */
async function chaos(seed: number, debug = false): Promise<Record<string, number>> {
  const r = prng(seed);
  const stats: Record<string, number> = {};
  const count = (k: string) => (stats[k] = (stats[k] ?? 0) + 1);
  const log: string[] = [];
  const note = (s: string) => {
    log.push(`${new Date(Date.now()).toString().slice(0, 24)}  ${s}`);
    if (debug) console.log(log.at(-1));
  };
  const fail = (check: string, detail: string): never => {
    throw new ChaosFailure(`seed ${seed} [${check}] at ${new Date(Date.now()).toString()}: ${detail}\n--- run ---\n${log.slice(-30).join('\n')}\n--- extension ---\n${device.state.trace.slice(-8).join('\n')}`);
  };

  device.reset();
  device.state.cap = 20;
  device.state.startsOnRegister = r.chance(0.85);
  device.state.asyncRegistration = r.chance(0.3);
  // Mostly around this year's DST changes, sometimes any week.
  // (US: Mar 8 / Nov 1; UK: Mar 29 / Oct 25; Sydney: Apr 5 / Oct 4.)
  const anchors = [new Date(2026, 2, 6), new Date(2026, 2, 27), new Date(2026, 3, 3), new Date(2026, 9, 2), new Date(2026, 9, 23), new Date(2026, 9, 30), new Date(2026, 5, 10)];
  const base = r.chance(0.8) ? r.pick(anchors).getTime() : new Date(2026, 0, 5).getTime() + r.int(0, 330) * DAY;
  const start = base + r.int(9 * 60, 21 * 60) * MIN;
  const end = start + r.int(3, 6) * DAY;
  mock.timers.setTime(start);

  const len = r.pick([4 * 60, 5 * 60, 7 * 60, 8 * 60, 9 * 60, 12 * 60]);
  const bed = r.pick([23 * 60, 22 * 60, 0, 30, 90, 21 * 60 + 30, 8 * 60, 14 * 60]);
  const first: Routine = {
    ...rt.DEFAULT_ROUTINE,
    bedtime: bed,
    morningStart: (bed + len) % 1440,
    activeNights: r.chance(0.7) ? [0, 1, 2, 3, 4, 5, 6] : r.subset([0, 1, 2, 3, 4, 5, 6], 1).sort(),
  };
  device.exports.setFamilyActivitySelectionId({ id: 'night', familyActivitySelection: token(['tiktok']) });
  device.exports.setFamilyActivitySelectionId({ id: 'always', familyActivitySelection: token(['reddit']) });
  lc.settleSubscription(true);
  rt.saveRoutine(first);
  const armed = await armTonight();
  drain();
  note(`seed ${seed}: ${show(first)} arm ${armed.status} startsOnRegister ${device.state.startsOnRegister} async ${device.state.asyncRegistration}`);

  /** The last walk the app accepted. */
  let proofAt: number | null = null;
  /** A night or morning seen held: when, and its morning. */
  let held: { at: number; key: string; known: string | null } | null = null;
  /** When the routine last changed (an applied edit), so held/honest judge the right nights. */
  let editAt = 0;
  /** Each routine that came into force, and when (`getRoutineChange().since`). */
  const tenures: { since: number; routine: Routine }[] = [{ since: rt.getRoutineChange()?.since ?? start, routine: first }];

  /**
   * Known bug (see the `nightRanUnder` todo tests): the morning reads held because the routine
   * before the last edit "ran" its night into it, when that routine never was in force during
   * that night ('never-ran'), or that morning was already over under it ('morning-over').
   */
  function knownPrior(): string | null {
    const t = new Date(Date.now());
    if (!lc.judgedAt(t).prior) return null;
    const change = rt.getRoutineChange(t);
    if (!change?.prior) return null;
    const key = lc.readLock(t).morningKey;
    const night = ls.nightInto(key, change.prior);
    const priorSince = tenures.length >= 2 ? tenures.at(-2)!.since : -Infinity;
    if (night.end.getTime() <= priorSince) return 'known-prior-never-ran';
    const [y, mo, d] = key.split('-').map(Number);
    const after = ls.nightInto(ls.dateKey(new Date(y, mo - 1, d + 1)), change.prior);
    if (after.start.getTime() <= change.since) return 'known-prior-morning-over';
    return null;
  }

  /**
   * Known bug (see the todo test on `locturneWindowNight`): a walk in the very minute a night
   * moved over it begins, so the extension's window bedtime (now less whole minutes, keeping
   * the seconds) falls after the walk while the app's (on the minute) falls before it.
   */
  function knownMinute(): boolean {
    const t = new Date(Date.now());
    const proof = lc.currentProof(t);
    if (!proof) return false;
    const { latest } = ls.nightsAround(t, rt.toLockSettings(lc.routineAt(t)));
    return proof.at >= latest.start.getTime() && proof.at < latest.start.getTime() + MIN;
  }

  /**
   * Known bugs that aren't about the proof: windows still armed for an older bedtime, kept by
   * `heldUntil` on an evening the old routine had off ('stale-windows'), and the DST fall-back
   * hour the extension's window bedtime leaves out ('dst-window-bedtime').
   */
  function knownOther(): string | null {
    const t = new Date(Date.now());
    if (lc.routineAt(t).bedtime !== rt.getRoutine(t).bedtime) return 'known-stale-windows';
    if (proofAt !== null && new Date(proofAt).getTimezoneOffset() !== t.getTimezoneOffset() && lc.readLock(t).phase === 'day') return 'known-dst-window-bedtime';
    return null;
  }

  /** Within the two-minute slack of a boundary of the routine in force or the armed times. */
  const nearBoundary = (t: number) => {
    const times = [rt.getRoutine()];
    const a = st.getArmedNight();
    if (a) times.push({ ...rt.getRoutine(), bedtime: a.bedtime, morningStart: a.morningStart });
    for (const x of times) {
      const { latest, next } = ls.nightsAround(new Date(t), rt.toLockSettings(x));
      for (const b of [latest.start, latest.end, next.start, next.end]) if (Math.abs(b.getTime() - t) <= SLACK) return true;
    }
    return false;
  };

  /** The latest night of the routine in force at `t`, and whether it's on. */
  const latestNight = (t: number) => {
    const routine = rt.getRoutine(new Date(t));
    const { latest } = ls.nightsAround(new Date(t), rt.toLockSettings(routine));
    const evening = new Date(latest.end.getFullYear(), latest.end.getMonth(), latest.end.getDate() - 1).getDay();
    return { ...latest, on: routine.activeNights.includes(evening) };
  };

  /** Every invariant that holds at any moment; `open` when the app just synced. */
  function check(open: boolean, why: string) {
    const t = Date.now();
    const lock = lc.readLock();
    const iosHolds = shielded();
    const near = nearBoundary(t);
    // Consistency: what Locturne says against what iOS shields.
    if (asleep(lock.phase) !== iosHolds && (open || !near)) {
      const kind = iosHolds ? 'ios-shields-app-says-awake' : 'app-says-asleep-ios-awake';
      const known = open ? (iosHolds && knownMinute() ? 'known-window-bedtime-seconds' : knownOther()) : null;
      if (known) {
        count(known);
        note(`KNOWN ${known}`);
      } else if (open) fail(`consistency/${kind}`, `${why}: readLock ${lock.phase}, shielded ${iosHolds}`);
      // Closed: noted (the first open puts it right); real only if it also breaks honest/held.
      count(`closed-${kind}`);
      note(`SOFT closed ${kind} ${why}: readLock ${lock.phase}, shielded ${iosHolds}`);
    }
    // Honest: after the walk, awake until a night that's on begins after it (under the routine
    // in force), or an edit put now inside a night (the Routine tab asked "Sleep now").
    if (proofAt !== null && iosHolds && !near) {
      const n = latestNight(t);
      const newNight = n.on && n.start.getTime() > proofAt;
      const sleptNow = editAt > proofAt;
      const known = !newNight && !sleptNow ? (knownPrior() ?? (knownMinute() ? 'known-window-bedtime-seconds' : null) ?? knownOther()) : null;
      if (known) {
        count(known);
        note(`KNOWN ${known}`);
        proofAt = null; // judged again from the next walk
      } else if (!newNight && !sleptNow) fail('honest', `${why}: walked ${new Date(proofAt).toString().slice(0, 24)}, shielded in night ${n.start.toString().slice(0, 21)} to ${n.end.toString().slice(16, 21)} (${lock.phase})`);
    }
    // Held: once iOS holds a night or morning, only a walk, or the next bedtime of a night
    // that's off, lets it go.
    if (iosHolds && asleep(lock.phase)) {
      if (!held) held = { at: t, key: lock.morningKey, known: knownPrior() };
    } else if (held && !iosHolds) {
      // Judged now, not after the slack: an edit straight after could move the night.
      const n = latestNight(t + SLACK);
      const offSince = !n.on && n.start.getTime() > held.at;
      // A hold that a known bug made (nothing ran into that morning) isn't one to keep.
      if (!offSince && held.known) count(`${held.known}-released`);
      else if (!offSince) fail('held', `${why}: held since ${new Date(held.at).toString().slice(0, 24)} (${held.key}), now ${lock.phase} with nothing shielded and no walk`);
      held = null;
    }
    // Armed: a routine with a night on has its windows with iOS.
    const routine = rt.getRoutine();
    if (routine.activeNights.length > 0) {
      const armedNight = st.getArmedNight();
      if (!armedNight) fail('armed', `${why}: ${show(routine)} has nights on but nothing is armed`);
      if (st.currentNightWindowNames().length === 0) fail('armed', `${why}: armed ${hm(armedNight!.bedtime)}-${hm(armedNight!.morningStart)} but iOS monitors no window`);
    }
    if (rt.nightTooShort(routine.bedtime, routine.morningStart)) fail('min-night', `${show(routine)} is shorter than MIN_NIGHT`);
  }

  /** A time of day near something that matters right now: a boundary, or a minute or so from now. */
  function aroundNow(): number {
    const now = new Date(Date.now());
    const minute = now.getHours() * 60 + now.getMinutes();
    return (((minute + r.pick([1, 1, 2, 5, 15, 60, -1, -5, -60, 0])) % 1440) + 1440) % 1440;
  }
  const snap = (m: number) => ((r.chance(0.6) ? Math.round(m / 15) * 15 : Math.round(m)) % 1440 + 1440) % 1440;

  /** A random edit, in the shapes the Routine tab and the You tab make. */
  function randomPatch(): { patch: Partial<Routine>; kind: string } {
    const set = ae.getSetRoutine();
    const k = r.int(0, 13);
    const len = (b: number, m: number) => rt.nightMinutes(b, m);
    const keepLength = (bedtime: number) => ({ bedtime, morningStart: (bedtime + len(set.bedtime, set.morningStart)) % 1440 });
    switch (k) {
      case 0: return { kind: 'bedtime±', patch: { bedtime: snap(set.bedtime + r.pick([-180, -60, -15, -5, 15, 30, 60, 120])) } };
      case 1: return { kind: 'wake±', patch: { morningStart: snap(set.morningStart + r.pick([-120, -60, -15, -1, 1, 15, 60, 180])) } };
      case 2: {
        // A night that begins in a minute (or a few).
        const b = (aroundNow() + 1440) % 1440;
        return { kind: 'begins-soon', patch: { bedtime: b, morningStart: (b + r.pick([240, 300, 480, 600])) % 1440 } };
      }
      case 3: {
        // A wake-up a minute or so from now (the morning moved over now, either way).
        const m = (aroundNow() + 1440) % 1440;
        return { kind: 'wake-near-now', patch: { morningStart: m } };
      }
      case 4: return { kind: 'shift-whole', patch: keepLength(snap(set.bedtime + r.pick([-240, -120, 120, 240, 600]))) };
      case 5: {
        // Tonight's evening toggled.
        const now = new Date(Date.now());
        const ev = latestNight(Date.now()).end > now ? new Date(latestNight(Date.now()).end.getTime() - DAY).getDay() : now.getDay();
        const nights = set.activeNights.includes(ev) ? set.activeNights.filter((d) => d !== ev) : [...set.activeNights, ev].sort();
        return { kind: 'toggle-tonight', patch: { activeNights: nights } };
      }
      case 6: return { kind: 'all-off', patch: { activeNights: [] } };
      case 7: return { kind: 'all-on', patch: { activeNights: [0, 1, 2, 3, 4, 5, 6] } };
      case 8: return { kind: 'step-goal', patch: { stepGoal: r.pick([50, 100, 200, 500, 1000]) } };
      case 9: return { kind: 'method', patch: { method: r.pick(['steps', 'downstairs', 'pushups'] as const) } };
      case 10: {
        // Tries to break MIN_NIGHT.
        const b = snap(set.bedtime);
        return { kind: 'too-short', patch: { bedtime: b, morningStart: (b + r.pick([0, 1, 15, 60, 239])) % 1440 } };
      }
      case 11: return { kind: 'exact-min', patch: { morningStart: (set.bedtime + 240) % 1440 } };
      case 12: return { kind: 'undo', patch: { bedtime: first.bedtime, morningStart: first.morningStart, activeNights: first.activeNights } };
      default: return { kind: 'both', patch: { bedtime: snap(r.int(0, 1439)), morningStart: snap(r.int(0, 1439)) } };
    }
  }

  async function doEdit(burst: boolean) {
    const { patch, kind } = randomPatch();
    const t = Date.now();
    const lockBefore = lc.readLock();
    const refusal = ae.routineEditRefusal();
    const armedBefore = !!st.getArmedNight();
    const storedBefore = JSON.stringify(device.get('locturne.routine'));
    const shieldedBefore = shielded();
    const next = { ...ae.getSetRoutine(), ...patch };
    const short = rt.nightTooShort(next.bedtime, next.morningStart);
    const asks = !refusal && !short ? ae.sleepsAtOnce(next) : null;
    const cancel = !!asks && r.chance(0.25);
    const result = await edit(patch, { cancel, wait: !burst });
    count(`edit-${result}`);
    count(`edit-kind-${kind}`);
    note(`edit ${kind} ${JSON.stringify(patch)} -> ${result}${asks ? ` (asked: ${asks})` : ''} [was ${lockBefore.phase}]`);
    // Refusal rule: a night iOS holds always refuses.
    if (shieldedBefore && asleep(lockBefore.phase) && !refusal) {
      const n = new Date(t);
      fail('refusal', `held (${lockBefore.phase}, shielded) but routineEditRefusal says null: heldPhase ${em.heldPhase(lockBefore.phase, n)} armed ${st.nightLockArmed()} pause ${em.getNightPause(n)} picks ${st.nightPickCount()}`);
    }
    if (refusal && result === 'applied') fail('refusal', 'routineEditRefusal said asleep, but the edit applied');
    if (result === 'refused' || result === 'short' || result === 'cancelled') {
      if (JSON.stringify(device.get('locturne.routine')) !== storedBefore) fail('refusal', `${result} edit changed the stored routine`);
      // (Not in a burst: the arming of the saves before it is still settling.)
      if (shieldedBefore && !shielded() && !burst) fail('refusal', `${result} edit woke the apps`);
    }
    if (result === 'applied' && asks) editAt = t;
    // The edit's own night has begun and it's on: the apps sleep now, by design. The Routine tab
    // should have asked first; with nothing armed (every night was off) it doesn't (todo test).
    const latest = ls.nightsAround(new Date(t), rt.toLockSettings(next)).latest;
    const evening = new Date(latest.end.getFullYear(), latest.end.getMonth(), latest.end.getDate() - 1).getDay();
    if (result === 'applied' && !refusal && !short && t >= latest.start.getTime() && t < latest.end.getTime() && next.activeNights.includes(evening) && (burst || asleep(lc.readLock().phase))) {
      // (In a burst the arming that sleeps them may still be under way.)
      if (!asks && !armedBefore) count('known-no-prompt-when-disarmed');
      editAt = t;
    }
    const change = rt.getRoutineChange();
    if (change && change.since !== tenures.at(-1)?.since) tenures.push({ since: change.since, routine: rt.getRoutine() });
    if (result === 'applied' && !burst) {
      // Applied while awake: the routine in force is the edit (no queued edit).
      const pending = rt.getPendingRoutine();
      if (pending) fail('queued', `an edit made awake was queued for ${new Date(pending.from).toString().slice(0, 21)}`);
      if (JSON.stringify(rt.getRoutine()) !== JSON.stringify(next)) fail('queued', `applied, but the routine in force is ${show(rt.getRoutine())}, not ${show(next)}`);
    }
  }

  try {
    while (Date.now() < end) {
      const a = r.int(0, 99);
      if (a < 30) {
        // Wait with the app closed: to near a boundary of the routine in force, or a while.
        const { latest, next } = ls.nightsAround(new Date(Date.now()), rt.toLockSettings(rt.getRoutine()));
        const targets = [latest.end, next.start, next.end].map((d) => d.getTime()).filter((x) => x > Date.now() + 2000);
        const to = r.chance(0.7) && targets.length
          ? r.pick(targets) + r.pick([-61_000, -60_000, -1000, 0, 1000, 59_000, 60_000, 121_000, 5 * MIN])
          : Date.now() + r.int(5, 360) * MIN;
        const target = Math.max(to, Date.now() + 1000);
        while (Date.now() < target) {
          advance(Math.min(target, Date.now() + 20 * MIN), (why) => {
            mock.timers.setTime(Date.now() + 1000);
            check(false, why);
          });
          check(false, 'closed');
        }
        note(`waited (closed): ${lc.readLock().phase}, shielded ${shielded()}`);
        if (process.env.TIME_CHAOS_DEBUG) note(`monitored ${[...device.state.monitored.values()].map((m) => `${m.name} ${m.schedule.intervalStart.hour}:${m.schedule.intervalStart.minute}-${m.schedule.intervalEnd.hour}:${m.schedule.intervalEnd.minute} reg ${new Date(m.registeredAt).toString().slice(4, 24)}`).join('; ')} armed ${JSON.stringify(st.getArmedNight())} stored ${JSON.stringify(device.get('locturne.routine'))}`);
        count('wait');
      } else if (a < 45) {
        lc.syncLock();
        await flush();
        drain();
        note(`open: ${lc.readLock().phase}, shielded ${shielded()}`);
        check(true, 'open');
        count('open');
      } else if (a < 58) {
        const before = lc.readLock().phase;
        const won = before === 'morning' ? walk() : null;
        if (won) {
          proofAt = Date.now();
          held = null;
          note('walk accepted');
          count('walk');
        }
        await flush();
        drain();
        check(true, 'after walk');
      } else if (a < 92) {
        // A hold an off night's bedtime let go before this edit is judged under the routine then.
        check(false, 'before edit');
        await doEdit(false);
        check(true, 'after edit');
        count('edit');
      } else {
        // A burst: the dial spun and released several times a second apart, nobody waiting.
        const n = r.int(2, 6);
        check(false, 'before burst');
        for (let i = 0; i < n; i++) {
          await doEdit(true);
          // iOS runs a window registered inside its interval soon after, not at the end.
          drain();
          advance(Date.now() + r.int(200, 1500));
        }
        await armIfPaidRun;
        armIfPaidRun = null;
        await flush();
        drain();
        lc.syncLock();
        await flush();
        drain();
        check(true, 'after burst');
        count('burst');
      }
      // Moving on a few seconds so actions don't all share one instant.
      advance(Date.now() + r.int(1, 30) * 1000);
    }
  } catch (error) {
    if (error instanceof ChaosFailure) throw error;
    fail('throws', String((error as Error)?.stack ?? error));
  }
  return stats;
}

const SEEDS = Number(process.env.TIME_CHAOS_SEEDS ?? 300);
const ONE = process.env.TIME_CHAOS_SEED;

test(`random edit sequences (${ONE ? `seed ${ONE}` : `${SEEDS} seeds`}, TZ=${process.env.TZ ?? 'unset'})`, async () => {
  mock.timers.enable({ apis: ['Date'], now: new Date(2026, 0, 1).getTime() });
  const total: Record<string, number> = {};
  const failures: string[] = [];
  const seeds = ONE ? [Number(ONE)] : Array.from({ length: SEEDS }, (_, i) => i + 1);
  for (const seed of seeds) {
    try {
      const stats = await chaos(seed, !!process.env.TIME_CHAOS_DEBUG);
      for (const [k, v] of Object.entries(stats)) total[k] = (total[k] ?? 0) + v;
    } catch (error) {
      failures.push(String((error as Error).message ?? error));
      if (ONE) break;
    }
  }
  if (process.env.TIME_CHAOS_DEBUG || process.env.TIME_CHAOS_STATS) console.log(JSON.stringify(total));
  if (process.env.TIME_CHAOS_GROUP) {
    const groups = new Map<string, string[]>();
    for (const f of failures) {
      const k = /\[([^\]]+)\]/.exec(f)?.[1] ?? '?';
      groups.set(k, [...(groups.get(k) ?? []), f]);
    }
    for (const [k, list] of groups) console.log(`=== ${k}: ${list.length} seeds (${list.map((f) => /seed (\d+)/.exec(f)?.[1]).join(',')})\n${list[0]}\n`);
  }
  assert.equal(failures.length, 0, failures.slice(0, 3).join('\n\n'));
});
