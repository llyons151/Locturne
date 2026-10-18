/// <reference types="node" />

/**
 * A seeded random walk over the lock as the app runs it today (2026-10-17), on the simulated
 * iPhone (sim-device.ts). It complements lock-controller.sim.test.ts, which predates three
 * rules and drives edits through `saveRoutine` directly:
 * - routine edits go through the Routine tab's path (`applyRoutineEdit`): refused while the apps
 *   are asleep, at once while awake, a night already begun under the edit sleeping now;
 * - passes (2 a month) are the only way out early, at night or in the morning;
 * - app schedules hold their apps on their own clock.
 * Mornings are proved through the methods' own entry points: the step watcher on a pedometer's
 * history (`watchSteps`), `submitScan`, `submitPlaceFix`, and `proveMorning` as the stairs and
 * push-ups hooks call it once their sensors say so.
 *
 * The oracle is deliberately small: lock-state's pure rules on the routine in force, plus what
 * the harness itself did (proofs and passes the app accepted, the subscription, edits). A
 * moment it can't judge for certain (the morning an edit, a purchase, a lapse or a night pass
 * touched, a phone that just restarted, a night too short for iOS) is skipped, never guessed.
 * What's shielded is read from the simulated device.
 *
 * FUZZ_RUNS=<n> for more runs (default 1100, about a minute), FUZZ_SEED=<n> to replay one, FUZZ_DEBUG=1 to log.
 * Needs `--experimental-test-module-mocks` (set in the npm test script).
 */
import assert from 'node:assert/strict';
import { mock, test } from 'node:test';

import { prng, simDevice, token } from './sim-device.ts';

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
const ls = await import('./lock-state.ts');
const rt = await import('./routine.ts');
const st = await import('./screen-time.ts');
const sc = await import('./schedules.ts');
const mp = await import('./morning-proof.ts');
const scan = await import('./scan.ts');
const place = await import('./place.ts');
const ps = await import('./passes.ts');
const em = await import('./emergency.ts');
const { armTonight } = await import('./arm.ts');
const { watchSteps } = await import('./wake/step-watch.ts');
const { stepsOf } = await import('./wake/steps.ts');

type Routine = import('./routine.ts').Routine;
type WakeMethod = import('./routine.ts').WakeMethod;

const MIN = 60_000;
const DAY = 24 * 60 * MIN;
const CODE = 'LOCTURNE-ABCDEFGHJKMN';
const GYM = { name: 'Gym', latitude: 30.2672, longitude: -97.7431 };

const NIGHT_POOL = ['tiktok', 'insta', 'yt', 'snap'];
const ALWAYS = ['reddit'];
const BLOCK = ['games', 'tiktok'];
const SCHED_POOL = ['mail', 'yt', 'news'];
const METHODS: WakeMethod[] = ['steps', 'downstairs', 'scan', 'place', 'pushups'];

/** Ordinary nights, shift work, a just-after-midnight bedtime and iOS's 15-minute minimum (the dial snaps to 15). */
const TIMES: (readonly [number, number])[] = [
  [23 * 60, 7 * 60],
  [22 * 60 + 30, 6 * 60 + 30],
  [30, 8 * 60],
  [0, 7 * 60],
  [21 * 60, 5 * 60 + 30],
  [8 * 60, 16 * 60],
  [14 * 60, 22 * 60],
  [19 * 60, 3 * 60],
  [23 * 60, 23 * 60 + 15],
  [23 * 60 + 45, 0],
];
const nightLength = (b: number, m: number) => (((m - b) % 1440) + 1440) % 1440;

async function flush() {
  for (let i = 0; i < 3; i++) await new Promise((resolve) => setImmediate(resolve));
}

function pick(id: string, apps: string[]) {
  const all = { ...device.ids() };
  if (apps.length) all[id] = token(apps);
  else delete all[id];
  device.exports.userDefaultsSet('familyActivitySelectionIds', all);
}

/** The Routine tab's save (`applyRoutineEdit` in features/routine/apply-edit.ts, which needs React Native). */
async function applyRoutineEdit(next: Routine): Promise<boolean> {
  const savedAt = new Date();
  if (scan.editRefusal(em.heldPhase(lc.readLock(savedAt).phase, savedAt))) return false;
  rt.saveRoutine(next, savedAt, lc.inPendingFirstNight(savedAt), true, true);
  lc.syncLock();
  if (st.getArmedNight()) await lc.armRoutine().then(() => lc.syncLock()).catch(() => {});
  await flush();
  return true;
}

class FuzzFailure extends Error {}

/** Findings that don't fail a run: the bedtime apps asleep with the app closed when the rules say awake. */
const soft: string[] = [];

type Log = string[];

async function run(seed: number, debug = false): Promise<{ log: Log; stats: Record<string, number> }> {
  const r = prng(seed);
  const log: Log = [];
  const stats: Record<string, number> = {};
  const count = (k: string) => (stats[k] = (stats[k] ?? 0) + 1);
  const note = (s: string) => {
    log.push(`${new Date(Date.now()).toString().slice(0, 24)}  ${s}`);
    if (debug) console.log(log.at(-1));
  };
  const fail = (check: string, detail: string): never => {
    throw new FuzzFailure(`seed ${seed} [${check}] at ${new Date(Date.now()).toString()}: ${detail}\n--- run ---\n${log.slice(-40).join('\n')}\n--- extension ---\n${device.state.trace.slice(-10).join('\n')}`);
  };

  device.reset();
  device.state.cap = 20;
  device.state.startsOnRegister = r.chance(0.8);
  device.state.asyncRegistration = r.chance(0.3);
  const day0 = new Date(2026, 0, 5).getTime() + r.int(0, 340) * DAY;
  const start = day0 + r.int(9 * 60, 22 * 60) * MIN;
  const days = r.int(7, 14);
  const end = day0 + (days + 1) * DAY;
  mock.timers.setTime(start);

  /* ---------- What the harness knows ---------- */
  const [bedtime, morningStart] = r.pick(TIMES);
  let routine: Routine = {
    ...rt.DEFAULT_ROUTINE,
    bedtime,
    morningStart,
    activeNights: r.chance(0.6) ? [0, 1, 2, 3, 4, 5, 6] : r.subset([0, 1, 2, 3, 4, 5, 6], 1).sort(),
    method: r.pick(METHODS),
    stepGoal: r.pick([100, 200, 300]),
  };
  let night = r.subset(NIGHT_POOL, 1);
  const addedAt = new Map<string, number>(night.map((a) => [a, start]));
  const everNight = new Set(night);
  type Def = Omit<import('./schedules.ts').Schedule, 'pending'>;
  /** Each schedule as the harness set it: in force, and an edit or delete waiting for its block's end. */
  const schedules: { id: 'sched-0' | 'sched-1'; apps: string[]; def: Def | null; pending: { def: Def | null; from: number } | null }[] = [];
  /** The schedule in force at `at`, by the harness's record. */
  const defAt = (o: (typeof schedules)[number], at: number) => (o.pending && at >= o.pending.from ? o.pending.def : o.def);
  const blockingAt = (o: (typeof schedules)[number], at: number) => {
    const d = defAt(o, at);
    return !!d && sc.isBlocking(d, new Date(at));
  };
  /** Near a waiting edit's landing, or a block's edge, the two-minute slack makes either answer right. */
  const schedSettled = (o: (typeof schedules)[number], at: number) => !o.pending || Math.abs(at - o.pending.from) > 3 * MIN;
  let always = [...ALWAYS];
  /** Apps taken off the always list, and when the removal lands (the next bedtime). */
  const alwaysOff = new Map<string, number>();
  let paid = !r.chance(0.15);
  let everLapsed = false;
  let paidChanges: { at: number; paid: boolean }[] = [{ at: start, paid }];
  /** Mornings the oracle won't judge (the key an edit, purchase, lapse or night pass touched). */
  const unsure = new Set<string>();
  /** Mornings the app accepted a win for, and mornings a pass took. */
  const won = new Set<string>();
  const passed = new Set<string>();
  const passMonths: string[] = [];
  let nap: { end: number } | null = null;
  /** The phone restarted and missed callbacks until this: closed-app checks wait for an open. */
  let outageUntil = 0;
  let needsOpen = false;
  const closedStuck = new Map<string, string>();
  /** Callbacks the extension ran on a 2-minute night iOS can't register can't be expected. */
  const tooShort = () => nightLength(routine.bedtime, routine.morningStart) < 15;

  const settings = () => rt.toLockSettings(routine);
  const paidAt = (at: number) => {
    let p = paidChanges[0].paid;
    for (const c of paidChanges) if (c.at <= at) p = c.paid;
    return p;
  };
  /** The rules' view of now: the routine in force, and whatever the app accepted for this morning. */
  const expected = (at = Date.now()) => {
    const m = ls.currentMorning(new Date(at), settings());
    const free = won.has(m.key) || passed.has(m.key) || !paidAt(m.nightStart.getTime()) || m.nightStart.getTime() < start;
    const state = ls.getLockState(new Date(at), settings(), { steps: 0, unlockedMorning: free ? m.key : null });
    return { ...state, nightStart: m.nightStart.getTime(), morningAt: m.start.getTime() };
  };
  const touch = (at = Date.now()) => {
    unsure.add(expected(at).morningKey);
    // And the one after, when `at` sits close to a night's start (an edit just before bedtime).
    unsure.add(expected(at + 2 * MIN).morningKey);
    // And the next night's: a switch to a same-day night (23:00 to 23:15, or a shift) can name a
    // morning a pass or a walk already used, which then needs a wake-up of its own
    // (`proofUnlocks` in morning-proof.ts: a genuinely new night after the exit).
    const next = ls.settingsTakeEffectAt(new Date(at), settings()).getTime();
    unsure.add(ls.currentMorning(new Date(next + MIN), settings()).key);
  };
  const asleep = (app: string) => device.state.shielded.has(app);
  const others = () => {
    const held = new Set<string>(paid && !everLapsed ? always : []);
    for (const [a, from] of alwaysOff) if (Date.now() < from + 3 * MIN) held.add(a);
    if (nap && Date.now() < nap.end) BLOCK.forEach((a) => held.add(a));
    for (const o of schedules) if ([-3, 0, 3].some((m) => blockingAt(o, Date.now() + m * MIN)) || !schedSettled(o, Date.now())) o.apps.forEach((a) => held.add(a));
    return held;
  };

  /* ---------- The invariants ---------- */
  function check(open: boolean, where: string) {
    const now = Date.now();
    const e = expected(now);
    if (unsure.has(e.morningKey)) return count('skip-unsure');
    if (!open && (needsOpen || now < outageUntil)) return count('skip-outage');
    if (!open && tooShort()) return count('skip-short');
    const locked = e.phase === 'night' || e.phase === 'morning';
    if (paidChanges.every((c) => !c.paid)) {
      // Never bought: nothing sleeps, ever.
      if (open && device.state.shielded.size) fail('unpaid', `${where}: shielded ${[...device.state.shielded]}`);
      return count('check-unpaid');
    }
    if (locked && paidAt(e.nightStart)) {
      // Held: every app on the bedtime list since before this night began is asleep.
      const stable = night.filter((a) => (addedAt.get(a) ?? Infinity) < e.nightStart - 2 * MIN);
      const awake = stable.filter((a) => !asleep(a));
      if (awake.length) fail('held', `${where}: ${e.phase} ${e.morningKey}, awake ${awake}, app ${open ? 'open' : 'closed'}`);
      count(`check-${e.phase}`);
    }
    if (e.phase === 'day' || e.phase === 'off' || !paidAt(e.nightStart)) {
      // Awake: no app that only the bedtime list holds is asleep.
      const held = others();
      const stuck = [...everNight].filter((a) => !held.has(a) && asleep(a));
      if (stuck.length && open) fail('awake', `${where}: ${e.phase} ${e.morningKey}, still asleep ${stuck}`);
      // With Locturne closed the extension can't know everything the app does: noted, and the
      // next open must fix it (`awake` above).
      if (stuck.length && !open && !closedStuck.has(e.morningKey)) {
        closedStuck.set(e.morningKey, `${where}: ${e.phase} ${e.morningKey}, asleep ${stuck}`);
        soft.push(`seed ${seed} ${new Date(now).toString().slice(0, 24)} ${where}: ${e.phase} ${e.morningKey}, asleep with the app closed: ${stuck}\n    ${log.slice(-6).join('\n    ')}`);
      }
      count('check-day');
    }
    if (open) {
      // The app's own view agrees with the rules.
      const app = em.heldPhase(lc.readLock().phase);
      const want = locked && paidAt(e.nightStart) ? e.phase : 'awake';
      const got = app === 'night' || app === 'morning' ? app : 'awake';
      if (want !== got) fail('app-view', `${where}: rules ${e.phase} (${want}), app ${lc.readLock().phase} → ${app}, ${e.morningKey}`);
    }
    if (paid && !everLapsed) {
      const awakeAlways = always.filter((a) => !asleep(a));
      if (awakeAlways.length && open) fail('always', `${where}: always list awake ${awakeAlways}`);
      if (nap && now < nap.end - MIN && open && BLOCK.some((a) => !asleep(a))) fail('nap', `${where}: Block now running, ${BLOCK.filter((a) => !asleep(a))} awake`);
      for (const o of schedules) {
        if (!open || !schedSettled(o, now)) continue;
        const blocking = [now - 3 * MIN, now, now + 3 * MIN].every((x) => blockingAt(o, x));
        if (blocking && o.apps.some((a) => !asleep(a))) fail('schedule', `${where}: ${o.id} blocking, ${o.apps.filter((a) => !asleep(a))} awake`);
        const idle = [now - 3 * MIN, now, now + 3 * MIN].every((x) => !blockingAt(o, x));
        const held = new Set([...always, ...(nap && now < nap.end + MIN ? BLOCK : []), ...(locked ? night : []), ...everNight]);
        for (const [a, from] of alwaysOff) if (now < from + 3 * MIN) held.add(a);
        // Another schedule holding the app, or about to (the app and the extension judge two minutes early).
        for (const x of schedules) {
          if (x !== o && ([now - 3 * MIN, now, now + 3 * MIN].some((y) => blockingAt(x, y)) || !schedSettled(x, now))) x.apps.forEach((a) => held.add(a));
        }
        const stuck = o.apps.filter((a) => !held.has(a) && asleep(a));
        if (idle && stuck.length) fail('schedule-idle', `${where}: ${o.id} ${defAt(o, now) ? 'not blocking' : 'deleted'}, ${stuck} still asleep`);
      }
    }
    if (paid && !everLapsed && open) {
      // An app taken off the always list wakes from the next bedtime, unless something else holds it.
      const held = others();
      for (const [a, from] of alwaysOff) {
        if (now > from + 3 * MIN && !held.has(a) && !everNight.has(a) && asleep(a)) fail('always-removed', `${where}: ${a} off the always list since ${new Date(from)}, still asleep`);
      }
    }
    // Counting: a morning is won once, a pass never counts, no proof before its morning start.
    // Proofs only change through the app.
    if (!open) return count('checks');
    const proofs = mp.getProofs();
    const wins = new Set(proofs.filter((p) => p.kind !== 'pass' && p.kind !== 'emergency').map((p) => p.morningKey));
    if (mp.getMorningsWon() !== wins.size) fail('count', `${where}: morningsWon ${mp.getMorningsWon()}, distinct wins ${wins.size}`);
    for (const p of proofs) {
      if (p.kind === 'pass' || p.kind === 'emergency') continue;
      if (passed.has(p.morningKey) && !unsure.has(p.morningKey)) fail('pass-win', `${where}: ${p.morningKey} has a pass and a win`);
      const [y, mo, d] = p.morningKey.split('-').map(Number);
      const startAt = new Date(y, mo - 1, d, 0, p.morningStart ?? 0).getTime();
      if (p.morningStart !== undefined && p.at < startAt - 60 * MIN) fail('early-proof', `${where}: ${p.kind} at ${new Date(p.at)} before ${p.morningKey} ${p.morningStart}`);
    }
    count('checks');
  }

  /* ---------- The app ---------- */
  async function open() {
    lc.syncLock();
    await st.settleLimitChanges().catch(() => {});
    lc.syncLock();
    await flush();
    // `armIfPaid`
    lc.settleSubscription(paid);
    await flush();
    if (paid && !st.getArmedNight() && st.shownSelection('night').size > 0) await armTonight();
    await flush();
    drain();
    needsOpen = false;
  }
  function drain() {
    while (device.state.queue.length) {
      const e = device.state.queue.shift()!;
      device.fire(e.activity, e.callback);
    }
  }
  /** The phone runs with Locturne closed until `to`, checking at each callback and every 40 minutes. */
  function runTo(to: number) {
    const events = device.dueEvents(Date.now(), to);
    let next = Date.now() + 40 * MIN;
    for (const e of events) {
      while (next < e.at) {
        mock.timers.setTime(next);
        check(false, 'closed');
        next += 40 * MIN;
      }
      mock.timers.setTime(e.at);
      if (e.at < outageUntil) {
        // A callback the phone missed: only the next open can catch up.
        count('dropped');
        needsOpen = true;
        continue;
      }
      device.fire(e.activity, e.callback);
      drain();
      // iOS runs simultaneous callbacks in no fixed order: judge once they've all run.
      if (!events.some((x) => x.at === e.at && x !== e && events.indexOf(x) > events.indexOf(e))) {
        mock.timers.setTime(e.at + 1000);
        check(false, `after ${e.activity} ${e.callback}`);
      }
    }
    while (next < to) {
      mock.timers.setTime(next);
      check(false, 'closed');
      next += 40 * MIN;
    }
    mock.timers.setTime(to);
  }

  /** A walk on Home: the step watcher over the pedometer's history, proved at the goal as `useMorningWalk` does. */
  async function walk(before: number, after: number) {
    const now = Date.now();
    const m = ls.currentMorning(new Date(now), settings());
    const steps: number[] = [];
    for (let i = 0; i < before; i++) steps.push(m.start.getTime() - 1000 - i * 600);
    for (let i = 0; i < after; i++) steps.push(now - 1000 - i * 550);
    const between = (a: number, b: number) => steps.filter((t) => t >= a && t < b).length;
    let proved: ReturnType<typeof lc.proveMorning> | undefined;
    const stop = watchSteps(
      {
        pedometer: {
          isAvailableAsync: async () => true,
          requestPermissionsAsync: async () => ({ granted: true }),
          getPermissionsAsync: async () => ({ granted: true }),
          getStepCountAsync: async (a: Date, b: Date) => ({ steps: between(a.getTime(), b.getTime()) }),
          watchStepCount: () => ({ remove() {} }),
        },
        isIOS: true,
        onAppState: () => ({ remove() {} }),
        setInterval: () => 0,
        clearInterval: () => {},
      },
      {
        morningStart: m.start.getTime(),
        goal: routine.stepGoal,
        onStatus: () => {},
        onCount: (c) => {
          if (stepsOf(c) >= routine.stepGoal && proved === undefined) proved = lc.proveMorning('steps');
        },
      },
    );
    await flush();
    stop();
    return proved ?? null;
  }

  /** One wake-up attempt by `how`; returns whether the app accepted it. */
  async function prove(how: WakeMethod | 'walk'): Promise<boolean> {
    if (how === 'walk' || how === 'steps') {
      const after = routine.stepGoal + r.int(-40, 40);
      return (await walk(r.int(0, 400), Math.max(0, after))) !== null;
    }
    if (how === 'scan') return scan.submitScan(r.chance(0.85) ? CODE : 'LOCTURNE-SOMEONEELSES') === 'unlocked';
    if (how === 'place') {
      const far = r.chance(0.2);
      return place.submitPlaceFix({ latitude: GYM.latitude + (far ? 0.01 : 0.0001), longitude: GYM.longitude, accuracy: 10, timestamp: Date.now() - 1000 }).kind === 'unlocked';
    }
    // The stairs and push-ups hooks call this once the barometer or the counter says so.
    return lc.proveMorning(how) !== null;
  }

  /* ---------- Onboarding ---------- */
  note(`seed ${seed}: ${JSON.stringify(routine)} night ${night} paid ${paid} ${days} days`);
  pick('night', night);
  pick('always', ALWAYS);
  pick('block', BLOCK);
  rt.saveRoutine(routine);
  scan.registerScanCode({ kind: 'qr', data: CODE, type: 'qr' });
  place.saveMorningPlace(GYM);
  for (const id of ['sched-0', 'sched-1'] as const) {
    if (!r.chance(0.3)) continue;
    const apps = r.subset(SCHED_POOL, 1);
    const startMin = r.int(0, 23) * 60;
    const s = { id, name: 'Work', start: startMin, end: (startMin + r.pick([60, 180, 480])) % 1440, days: r.subset([0, 1, 2, 3, 4, 5, 6], 1).sort() };
    pick(id, apps);
    st.saveSchedules(sc.editSchedule(st.getSchedules(), id, s, new Date()));
    schedules.push({ id, apps, def: s, pending: null });
    note(`schedule ${id} ${apps} ${JSON.stringify(s)}`);
  }
  if (paid) {
    lc.settleSubscription(true);
    const armed = await armTonight();
    note(`onboarding arms: ${armed.status}`);
    if (armed.status !== 'armed') fail('arm', `onboarding couldn't arm a valid routine: ${armed.status}`);
  }
  await flush();
  drain();
  touch();
  await open();
  check(true, 'onboarding');

  /* ---------- The walk ---------- */
  let t = Date.now();
  while (t < end) {
    // The next thing the person does: mostly mornings and evenings, sometimes anywhere.
    const e = expected();
    const roll = r.next();
    const gap =
      roll < 0.35 && e.phase !== 'morning'
        ? Math.max(MIN, e.nextChange.getTime() - t + r.int(-20, 150) * MIN)
        : r.int(5, 9 * 60) * MIN;
    const at = Math.min(end, t + gap);
    runTo(at);
    t = Date.now();
    if (t >= end) break;

    const action = r.next();
    const before = expected();
    const certain = !unsure.has(before.morningKey);
    const lockedNow = (before.phase === 'night' || before.phase === 'morning') && paidAt(before.nightStart);
    if (action < 0.3) {
      // A wake-up attempt, by the routine's method or by walking instead.
      await open();
      const how = r.chance(0.7) ? routine.method : 'walk';
      const ok = await prove(how);
      await flush();
      drain();
      note(`prove ${how} (${before.phase} ${before.morningKey}): ${ok ? 'accepted' : 'refused'}`);
      count(ok ? 'proof' : 'proof-refused');
      if (ok) {
        if (certain && before.phase !== 'morning') fail('proof-out-of-morning', `${how} accepted in ${before.phase}`);
        if (certain && !lockedNow) fail('proof-unheld', `${how} accepted on a morning nothing held`);
        won.add(before.morningKey);
      }
      await open();
      check(true, `after prove ${how}`);
      if (ok) {
        const stuck = [...everNight].filter((a) => !others().has(a) && asleep(a));
        if (certain && stuck.length) fail('proof-wakes', `after ${how}: still asleep ${stuck}`);
      }
    } else if (action < 0.4) {
      await open();
      const result = ps.redeemPass();
      await flush();
      drain();
      note(`pass (${before.phase} ${before.morningKey}): ${result.refusal ?? 'used'}`);
      if (result.refusal === null) {
        count(`pass-${before.phase}`);
        passMonths.push(before.morningKey.slice(0, 7));
        if (passMonths.filter((m) => m === before.morningKey.slice(0, 7)).length > ps.PASSES_PER_MONTH) fail('passes', `more than ${ps.PASSES_PER_MONTH} passes in ${before.morningKey.slice(0, 7)}`);
        // By day a pass only ends a Block now: the morning is untouched.
        if (lockedNow || before.phase === 'night' || before.phase === 'morning') passed.add(before.morningKey);
        if (before.phase === 'night') unsure.add(before.morningKey);
        nap = null;
      } else if (certain && lockedNow && result.refusal !== 'noneLeft') {
        fail('pass-refused', `${before.phase}: ${result.refusal}`);
      }
      await open();
      check(true, 'after pass');
    } else if (action < 0.55) {
      // A routine edit from the Routine tab (or the You tab's step target).
      await open();
      const which = r.int(0, 3);
      const [b, m] = r.pick(TIMES);
      const next: Routine =
        which === 0
          ? { ...routine, bedtime: b, morningStart: m }
          : which === 1
            ? { ...routine, activeNights: r.subset([0, 1, 2, 3, 4, 5, 6], 1).sort() }
            : which === 2
              ? { ...routine, method: r.pick(METHODS) }
              : { ...routine, stepGoal: r.pick([100, 200, 300, 500]) };
      const ok = await applyRoutineEdit(next);
      drain();
      note(`edit ${JSON.stringify(next)} (${before.phase} ${before.morningKey}): ${ok ? 'saved' : 'refused'}`);
      count(ok ? 'edit' : 'edit-refused');
      if (certain && lockedNow && ok) fail('edit-asleep', `an edit was saved in a held ${before.phase}`);
      if (certain && !lockedNow && !ok) fail('edit-awake', `an edit was refused while awake (${before.phase})`);
      if (!ok && JSON.stringify(rt.getRoutine()) !== JSON.stringify(routine)) fail('edit-refused-changed', 'a refused edit changed the routine');
      if (ok) {
        touch();
        routine = next;
        touch();
      }
      await open();
      check(true, 'after edit');
      if (ok && certain && paid && st.getArmedNight()) {
        // Saved while awake, it applies at once: a night it has already begun sleeps the apps
        // now (`sleepsAtOnce`), and one it ends wakes them.
        const after = expected();
        const fresh = !won.has(after.morningKey) && !passed.has(after.morningKey) && paidAt(after.nightStart);
        const stable = night.filter((a) => (addedAt.get(a) ?? Infinity) < Date.now() - 2 * MIN);
        if (after.phase === 'night' && fresh && !tooShort() && stable.some((a) => !asleep(a))) {
          fail('sleeps-at-once', `edit began a night (${after.morningKey}); awake ${stable.filter((a) => !asleep(a))}`);
        }
        if (after.phase === 'night') count('edit-sleeps-now');
        if (after.phase === 'day' || after.phase === 'off') {
          const held = others();
          const stuck = [...everNight].filter((a) => !held.has(a) && asleep(a));
          if (stuck.length) fail('edit-awake-stuck', `edit left it ${after.phase} (${after.morningKey}); asleep ${stuck}`);
        }
      }
    } else if (action < 0.63) {
      // The bedtime list: add an app any time; take one off only while awake (it stays asleep till bedtime otherwise).
      await open();
      const add = r.chance(0.6) || night.length === 1;
      const app = add ? r.pick(NIGHT_POOL.filter((a) => !night.includes(a)).concat(['tiktok'])) : r.pick(night);
      if (add && !night.includes(app)) {
        const draft = st.beginListEdit('night');
        pick(draft, [...night, app]);
        st.finishListEdit('night', lc.looserEditsStartAt(new Date(), 'night'));
        night = [...night, app];
        addedAt.set(app, Date.now());
        everNight.add(app);
        note(`add ${app} to bedtime list`);
        count('list-add');
      } else if (!add && !lockedNow) {
        const draft = st.beginListEdit('night');
        pick(draft, night.filter((a) => a !== app));
        st.finishListEdit('night', lc.looserEditsStartAt(new Date(), 'night'));
        night = night.filter((a) => a !== app);
        addedAt.delete(app);
        // Removal lands at the next bedtime: that night's checks don't count it either way.
        touch(lc.looserEditsStartAt(new Date(), 'night').getTime() + MIN);
        note(`remove ${app} from bedtime list`);
        count('list-remove');
      }
      st.reapplyStandingBlocks();
      await open();
      check(true, 'after list edit');
    } else if (action < 0.7) {
      await open();
      if (paid && !st.getNap() && !st.isStoodDown()) {
        try {
          const n = await st.startNap('block', r.pick([15, 30, 60, 120]));
          nap = { end: n.end };
          note(`Block now until ${new Date(n.end).toTimeString().slice(0, 5)}`);
          count('nap');
        } catch {
          count('nap-refused');
        }
        lc.syncLock();
        await flush();
        drain();
      }
      await open();
      check(true, 'after Block now');
    } else if (action < 0.74) {
      // The subscription changes: a lapse, a renewal, or a first purchase (Ask to Buy approved later).
      const was = paid;
      paid = !paid;
      if (!paid) everLapsed = true;
      paidChanges = [...paidChanges, { at: Date.now(), paid }];
      touch();
      lc.settleSubscription(paid);
      await flush();
      if (paid) {
        const current = rt.getRoutine();
        rt.saveRoutine(current, new Date(), lc.inPendingFirstNight(new Date()));
        await armTonight();
        await flush();
      }
      drain();
      note(`subscription ${was} → ${paid}`);
      count(paid ? 'buy' : 'lapse');
      // A lapse lets the night under way finish: the morning a lapse lands in, and the next, aren't judged.
      if (!paid) touch(Date.now() + DAY);
      await open();
      check(true, 'after subscription');
    } else if (action < 0.765 && schedules.length) {
      // A schedule edited or deleted on the Apps tab (`saveSchedule` in features/apps/schedule-actions.ts).
      await open();
      const o = r.pick(schedules);
      const now = new Date();
      // A waiting edit that has landed is the one in force now.
      if (o.pending && now.getTime() >= o.pending.from) {
        o.def = o.pending.def;
        o.pending = null;
      }
      const startMin = r.int(0, 23) * 60;
      const next: Def | null = r.chance(0.25) ? null : { id: o.id, name: 'Work', start: startMin, end: (startMin + r.pick([60, 180, 480])) % 1440, days: r.subset([0, 1, 2, 3, 4, 5, 6], 1).sort() };
      // A new schedule in a slot whose last one was deleted: its apps are picked afresh.
      if (next && !defAt(o, now.getTime()) && !o.pending) pick(o.id, o.apps);
      const saved = sc.editSchedule(st.getSchedules(now), o.id, next, now);
      st.saveSchedules(saved);
      lc.syncLock(now);
      await flush();
      drain();
      // The app's rule: at once, unless blocking and the edit would lift some of the block; then at its end.
      const inForce = defAt(o, now.getTime());
      const ends = inForce ? sc.blockEnds(inForce, now) : null;
      const waits = !!ends;
      const appWaits = saved.find((x) => x.id === o.id)?.pending;
      if (appWaits) o.pending = { def: next, from: appWaits.from };
      else {
        o.def = next;
        o.pending = null;
      }
      if (waits && !appWaits && next === null) fail('schedule-delete-early', `${o.id} deleted mid-block at once`);
      note(`schedule ${o.id} → ${JSON.stringify(next)}${appWaits ? ` from ${new Date(appWaits.from).toTimeString().slice(0, 5)}` : ''}`);
      count(next ? 'sched-edit' : 'sched-delete');
      await open();
      check(true, 'after schedule edit');
    } else if (action < 0.78) {
      // The always list: add any time (asleep at once); a removal waits for the next bedtime.
      await open();
      const app = r.pick(['reddit', 'news', 'x']);
      const add = !always.includes(app);
      const draft = st.beginListEdit('always');
      const next = add ? [...always, app] : always.filter((a) => a !== app);
      pick(draft, next);
      const from = lc.looserEditsStartAt(new Date(), 'always');
      st.finishListEdit('always', from);
      st.reapplyStandingBlocks();
      always = next;
      if (add) alwaysOff.delete(app);
      else alwaysOff.set(app, from.getTime());
      lc.syncLock();
      await flush();
      drain();
      note(`${add ? 'add' : 'remove'} ${app} ${add ? 'to' : 'from'} the always list${add ? '' : ` from ${from.toString().slice(0, 21)}`}`);
      count(add ? 'always-add' : 'always-remove');
      await open();
      if (add && paid && !everLapsed && !asleep(app)) fail('always-add', `${app} added to the always list but awake`);
      check(true, 'after always edit');
    } else if (action < 0.81) {
      // The phone restarts: iOS misses callbacks for a while, then the app isn't opened at once.
      outageUntil = Date.now() + r.int(5, 90) * MIN;
      needsOpen = true;
      note(`phone off until ${new Date(outageUntil).toTimeString().slice(0, 5)}`);
      count('restart');
    } else {
      await open();
      note(`open (${before.phase} ${before.morningKey})`);
      count('open');
      check(true, 'open');
    }
    if (nap && Date.now() >= nap.end) nap = null;
    t = Date.now();
  }
  return { log, stats };
}

const RUNS = Number(process.env.FUZZ_RUNS ?? 1100);
const ONLY = process.env.FUZZ_SEED;

test(`lock fuzz: ${ONLY ? `seed ${ONLY}` : `${RUNS} seeded runs`} of 7–14 days, edits, passes, schedules and wake-ups through the app's own paths`, async () => {
  mock.timers.enable({ apis: ['Date'], now: 0 });
  const totals: Record<string, number> = {};
  try {
    const seeds = ONLY ? [Number(ONLY)] : Array.from({ length: RUNS }, (_, i) => i + 1);
    const failures: string[] = [];
    for (const seed of seeds) {
      try {
        const { stats } = await run(seed, !!process.env.FUZZ_DEBUG);
        for (const [k, v] of Object.entries(stats)) totals[k] = (totals[k] ?? 0) + v;
      } catch (error) {
        if (!(error instanceof FuzzFailure)) throw new Error(`seed ${seed} threw: ${(error as Error).stack}`);
        failures.push(error.message);
        if (failures.length >= 5) break;
      }
    }
    if (process.env.FUZZ_STATS) console.log(JSON.stringify(totals));
    if (process.env.FUZZ_SOFT) console.log(`${soft.length} closed-app findings:\n${soft.slice(0, Number(process.env.FUZZ_SOFT)).join('\n')}`);
    if (failures.length) assert.fail(`${failures.length} failing seeds (first ${Math.min(5, failures.length)}):\n\n${failures.join('\n\n')}`);
  } finally {
    mock.timers.reset();
  }
});
