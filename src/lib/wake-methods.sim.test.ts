/// <reference types="node" />

/**
 * Every wake-up method, whole mornings, on the simulated iPhone (sim-device.ts): onboarding arms
 * the night, the phone runs with Locturne closed through bedtime, and the morning is proved
 * through the method's own logic as Home runs it, with sensors faked at the level the app reads
 * them (the pedometer's history and live batches, the altimeter's relative altitude, Vision's
 * joints, a GPS fix, a scanned string). What's shielded is read from the simulated device.
 *
 * - steps: `watchSteps` (step-watch.ts) and the rules in steps.ts, proved as `useMorningWalk`
 *   does, at the goal.
 * - downstairs: `watchDownstairs` (downstairs-watch.ts) with altimeter traces, restarted as
 *   `useMorningStairs` does after a session with no floor.
 * - pushups: the counter (pushups.ts) on Vision-like joints, with the reps saved per morning as
 *   `usePushups` does, proved when the set is met.
 * - scan: `submitScan`. place: `submitPlaceFix`.
 *
 * After each success: only the bedtime list wakes, one proof of the right kind, the mornings
 * count, the payoff's words, and the next bedtime locks again.
 *
 * Needs `--experimental-test-module-mocks` (set in the npm test script).
 */
import assert from 'node:assert/strict';
import { afterEach, describe, mock, test } from 'node:test';

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
const ls = await import('./lock-state.ts');
const rt = await import('./routine.ts');
const st = await import('./screen-time.ts');
const sc = await import('./schedules.ts');
const mp = await import('./morning-proof.ts');
const scan = await import('./scan.ts');
const place = await import('./place.ts');
const passes = await import('./passes.ts');
const em = await import('./emergency.ts');
const { armTonight } = await import('./arm.ts');
const { watchSteps } = await import('./wake/step-watch.ts');
const { stepsOf } = await import('./wake/steps.ts');
const { watchDownstairs, TICK_MS } = await import('./wake/downstairs-watch.ts');
const pu = await import('./wake/pushups.ts');
const { plankPose } = await import('./wake/pose-demo.ts');
const payoff = await import('../features/wake/payoff.ts');

type WakeMethod = import('./routine.ts').WakeMethod;
type Routine = import('./routine.ts').Routine;
type DownstairsSession = import('./wake/downstairs.ts').DownstairsSession;

const MIN = 60_000;
/** October 2026, local time. The 5th is a Monday. */
const at = (d: number, h: number, m = 0, s = 0) => new Date(2026, 9, d, h, m, s).getTime();
const asleep = (app: string) => device.state.shielded.has(app);
const NIGHT = ['tiktok', 'insta'];
const ALWAYS = ['reddit'];

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

/** Opening Locturne (or bringing it to the front): what `useLock` and `useAppStart` sync. */
async function open() {
  lc.syncLock();
  drain();
  await st.settleLimitChanges().catch(() => {});
  drain();
  lc.syncLock();
  await flush();
  drain();
}

function pick(id: string, apps: string[]) {
  device.exports.setFamilyActivitySelectionId({ id, familyActivitySelection: token(apps) });
}

/** Onboarding: lists picked, paid, the routine saved and tonight armed, at `start`. */
async function onboard(routine: Partial<Routine>, start = at(5, 20)) {
  device.reset();
  device.state.cap = 20;
  mock.timers.enable({ apis: ['Date'], now: start });
  pick('night', NIGHT);
  pick('always', ALWAYS);
  lc.settleSubscription(true);
  rt.saveRoutine({ ...rt.DEFAULT_ROUTINE, ...routine });
  assert.equal((await armTonight()).status, 'armed', 'onboarding arms tonight');
  await flush();
  drain();
}

/** Bedtime to the morning with the app closed; the bedtime apps asleep all night. */
async function sleepThroughNight(morning = at(6, 7, 5)) {
  runTo(at(5, 23, 1));
  assert.ok(NIGHT.every(asleep), 'bedtime apps asleep at 23:01');
  runTo(at(6, 3));
  assert.ok(NIGHT.every(asleep), 'still asleep at 3am');
  runTo(morning);
  assert.ok(NIGHT.every(asleep), 'still asleep after the morning start, until proved');
  assert.ok(ALWAYS.every(asleep));
  await open();
  assert.equal(lc.readLock().phase, 'morning');
  assert.ok(NIGHT.every(asleep), 'opening the app in the morning wakes nothing');
}

/** What's true after any real wake-up: the bedtime apps only, one proof, the count, the payoff. */
async function assertWoke(kind: WakeMethod, opts: { wonBefore?: number; other?: string[] } = {}) {
  drain();
  await open();
  assert.equal(lc.readLock().phase, 'day', 'Home reads the day once proved');
  assert.ok(NIGHT.every((a) => !asleep(a)), 'the bedtime apps wake');
  assert.ok(ALWAYS.every(asleep), 'the always list stays asleep');
  for (const a of opts.other ?? []) assert.ok(asleep(a), `${a} stays asleep under its own rule`);
  const proofs = mp.getProofs().filter((p) => p.morningKey === lc.readLock().morningKey);
  assert.equal(proofs.length, 1, 'one proof for the morning');
  assert.equal(proofs[0].kind, kind);
  assert.equal(mp.getMorningsWon(), (opts.wonBefore ?? 0) + 1, 'the mornings count goes up once');
  // A second proof of the same morning is refused and changes nothing.
  assert.equal(lc.proveMorning(kind), null);
  assert.equal(mp.getMorningsWon(), (opts.wonBefore ?? 0) + 1);
  const proof = lc.currentProof(new Date());
  assert.ok(proof, 'the payoff finds the proof');
  const up = new Date(proof.at);
  const line = payoff.payoffLine(kind, up.getHours() * 60 + up.getMinutes(), lc.routineAt(new Date()).morningStart);
  assert.ok(line.length > 0 && !/undefined|NaN/.test(line), `payoff line reads: ${line}`);
}

/** The next bedtime locks again with the app closed. */
function assertNextNightLocks() {
  runTo(at(6, 23, 1));
  assert.ok(NIGHT.every(asleep), 'the next bedtime puts them to sleep again');
  runTo(at(7, 7, 10));
  assert.ok(NIGHT.every(asleep), 'and holds into the next morning');
}

/* ---------- Fake sensors ---------- */

/** A pedometer: steps are timestamps; history counts them in a range, live batches since subscribing. */
function fakePedometer() {
  const steps: number[] = [];
  let live: { from: number; cb: (r: { steps: number }) => void } | null = null;
  const between = (a: number, b: number) => steps.filter((t) => t >= a && t < b).length;
  return {
    steps,
    sensor: {
      isAvailableAsync: async () => true,
      requestPermissionsAsync: async () => ({ granted: true }),
      getPermissionsAsync: async () => ({ granted: true }),
      getStepCountAsync: async (start: Date, end: Date) => ({ steps: between(start.getTime(), end.getTime()) }),
      watchStepCount: (cb: (r: { steps: number }) => void) => {
        live = { from: Date.now(), cb };
        return { remove: () => (live = null) };
      },
    },
    /** Walks `n` steps from now at `perSecond`, delivering live batches every 2 s as CMPedometer does. */
    async walk(n: number, perSecond = 1.8) {
      const start = Date.now();
      for (let i = 0; i < n; i++) {
        const t = start + Math.round((i * 1000) / perSecond);
        steps.push(t);
        mock.timers.setTime(t);
        if (live && i % 4 === 3) live.cb({ steps: between(live.from, t + 1) });
      }
      const end = start + Math.round((n * 1000) / perSecond);
      mock.timers.setTime(end);
      if (live) live.cb({ steps: between(live.from, end + 1) });
      await flush();
    },
    /** Steps taken with Locturne closed: in history only. */
    walkedAt(from: number, n: number, perSecond = 1.8) {
      for (let i = 0; i < n; i++) steps.push(from + Math.round((i * 1000) / perSecond));
    },
  };
}

/**
 * Home's walk (`useMorningWalk`): the watcher from the morning start, proved at the goal.
 * Returns the steps it reports, and stops.
 */
function homeWalk(pedometer: ReturnType<typeof fakePedometer>, routine: Routine) {
  const morningStart = ls.currentMorning(new Date(), rt.toLockSettings(routine)).start.getTime();
  let shown = 0;
  let proved: ReturnType<typeof lc.proveMorning> | undefined;
  const polls: (() => void)[] = [];
  const stop = watchSteps(
    {
      pedometer: pedometer.sensor,
      isIOS: true,
      onAppState: () => ({ remove() {} }),
      setInterval: (run) => polls.push(run),
      clearInterval: () => {},
    },
    {
      morningStart,
      goal: routine.stepGoal,
      onStatus: () => {},
      onCount: (count) => {
        shown = stepsOf(count);
        if (shown >= routine.stepGoal && proved === undefined) proved = lc.proveMorning('steps');
      },
    },
  );
  return {
    steps: () => shown,
    proved: () => proved,
    poll: async () => {
      polls.forEach((p) => p());
      await flush();
    },
    stop,
  };
}

/** Altitude over time, metres, for the altimeter. */
type Trace = (t: number) => number;

/** A seeded wobble, about ±`amp` m, like CMAltimeter's noise. */
function noise(seed: number, amp: number) {
  let x = seed;
  return () => {
    x = (x * 1103515245 + 12345) % 2147483648;
    return ((x / 2147483648) * 2 - 1) * amp;
  };
}

/**
 * Home's stairs (`useMorningStairs`): listens straight away, starts again after a session with no
 * floor, proves at met. Runs the trace at 1 Hz for `ms` and returns what happened.
 */
async function homeStairs(trace: Trace, ms: number, opts: { background?: number } = {}) {
  let session: DownstairsSession | null = null;
  let access = 'checking';
  const live: { listener: ((r: { relativeAltitude?: number }) => void) | null } = { listener: null };
  let clock: (() => void) | null = null;
  let appState: ((s: string) => void)[] = [];
  let origin = 0;
  const statuses: string[] = [];
  let proved: ReturnType<typeof lc.proveMorning> | undefined;
  const watch = watchDownstairs({
    barometer: {
      isAvailableAsync: async () => true,
      setUpdateInterval: () => {},
      addListener: (l) => {
        // CMAltimeter's relative altitude starts from zero at each start.
        origin = trace(Date.now());
        live.listener = l;
        return { remove: () => (live.listener = null) };
      },
    },
    pedometer: {
      getPermissionsAsync: async () => ({ granted: true, canAskAgain: true }),
      requestPermissionsAsync: async () => ({ granted: true, canAskAgain: true }),
    },
    isIOS: true,
    onAppState: (l) => {
      appState.push(l);
      return { remove: () => (appState = appState.filter((x) => x !== l)) };
    },
    onAccess: (a) => (access = a),
    onSession: (s) => {
      session = s;
      if (s && statuses.at(-1) !== s.status) statuses.push(s.status);
      if (s?.status === 'met' && proved === undefined) proved = lc.proveMorning('downstairs');
    },
    setInterval: (run) => {
      clock = run;
      return 1;
    },
    clearInterval: () => (clock = null),
  });
  await flush();
  const t0 = Date.now();
  for (let t = t0; t < t0 + ms; t += 1000) {
    mock.timers.setTime(t);
    const idle = session === null || (session as DownstairsSession).status === 'timedOut';
    if (access === 'ready' && idle && t !== opts.background) {
      await watch.start();
      await flush();
    }
    if (opts.background !== undefined && t === opts.background) {
      for (const l of [...appState]) l('background');
      continue;
    }
    live.listener?.({ relativeAltitude: trace(t) - origin });
    if (clock && (t - t0) % TICK_MS === 0) (clock as () => void)();
    if (proved !== undefined) break;
  }
  watch.dispose();
  return { proved, statuses, session: session as DownstairsSession | null };
}

/** A walk down one flight: flat in bed, `drop` metres over `stairsMs`, then still at the bottom. */
function flight(start: number, drop: number, { stairsMs = 8_000, seed = 1, amp = 0.15, delay = 10_000 } = {}): Trace {
  const wobble = noise(seed, amp);
  return (t) => {
    const s = t - start - delay;
    const h = s <= 0 ? 0 : s >= stairsMs ? -drop : (-drop * s) / stairsMs;
    return 100 + h + wobble();
  };
}

/* ---------- Push-up poses (pose-demo.ts's side-on body, as Vision reports joints) ---------- */

const BODY = { upper: 80, fore: 76, wrist: { x: 200, y: 500 }, ankle: { x: 520, y: 490 } };
const FRAME_MS = 66;
/** A full rep at a normal pace. */
const REP = [165, 150, 130, 110, 90, 70, 60, 60, 60, 75, 95, 115, 135, 155, 165];
/** A half rep: never past 120°. */
const HALF = [165, 155, 140, 130, 122, 120, 120, 125, 140, 155, 165];

function plankDropped(deg: number, drop: number) {
  const top = plankPose(165, BODY);
  const torso = Math.hypot(top.leftHip!.x - top.leftShoulder!.x, top.leftHip!.y - top.leftShoulder!.y);
  const joints = plankPose(deg, BODY);
  const shift = top.leftShoulder!.y + drop * torso - joints.leftShoulder!.y;
  return Object.fromEntries(Object.entries(joints).map(([k, v]) => [k, { ...v!, y: v!.y + shift }]));
}

/** Frames of `reps` repetitions of `shape`, from `from`, with a beat at the top between reps. */
function poseFrames(shape: number[], reps: number, from: number, frame = (deg: number) => plankPose(deg, BODY)) {
  const frames: { at: number; joints: ReturnType<typeof plankPose> }[] = [];
  let t = from;
  for (let r = 0; r < reps; r++) {
    for (const deg of [...shape, 165, 165, 165, 165]) {
      frames.push({ at: t, joints: frame(deg) });
      t += FRAME_MS;
    }
  }
  return frames;
}

/**
 * Home's push-ups (`useMorningPushups` + `usePushups`): Start opens the camera with this morning's
 * saved reps, frames feed the counter, reps are saved as they come, the set's end proves.
 */
function pushupsCamera(goal: number) {
  const morning = lc.readLock().morningKey;
  const saved = () => pu.repsDoneFor(st.sharedGet('locturne.pushupsDone'), morning);
  let s = pu.startPushups(Date.now(), goal, { reps: saved() });
  let proved: ReturnType<typeof lc.proveMorning> | undefined;
  return {
    feed(frames: { at: number; joints: ReturnType<typeof plankPose> }[]) {
      for (const f of frames) {
        mock.timers.setTime(f.at);
        s = pu.tick(pu.addPose(s, f), f.at);
        if (s.reps > saved()) st.sharedSet('locturne.pushupsDone', { morning, reps: s.reps });
        if (s.status === 'met' && proved === undefined) proved = lc.proveMorning('pushups');
      }
    },
    session: () => s,
    proved: () => proved,
  };
}

/* ---------- Steps ---------- */

describe('steps', () => {
  const routine = { ...rt.DEFAULT_ROUTINE, method: 'steps' as const };

  test('200 steps after opening wake the bedtime apps; the next bedtime locks again', async () => {
    await onboard(routine);
    await sleepThroughNight();
    const pedometer = fakePedometer();
    const walk = homeWalk(pedometer, routine);
    await flush();
    await pedometer.walk(150);
    assert.equal(walk.proved(), undefined, 'not at 150');
    assert.ok(NIGHT.every(asleep));
    await pedometer.walk(60);
    assert.ok(walk.proved(), 'proved at the goal');
    walk.stop();
    await assertWoke('steps');
    assertNextNightLocks();
  });

  test('steps walked before opening Locturne count; steps before the morning start do not', async () => {
    await onboard(routine);
    await sleepThroughNight(at(6, 7, 30));
    const pedometer = fakePedometer();
    pedometer.walkedAt(at(6, 6, 30), 500); // up early, before 7:00: none count
    pedometer.walkedAt(at(6, 7, 10), 120); // after 7:00, app closed
    const walk = homeWalk(pedometer, routine);
    await flush();
    assert.equal(walk.steps(), 120, 'history since 7:00 only');
    assert.equal(walk.proved(), undefined);
    await pedometer.walk(85);
    assert.ok(walk.proved(), '120 before opening + 85 live passes 200');
    walk.stop();
    await assertWoke('steps');
  });

  test("a morning's whole walk done with the app closed proves on opening", async () => {
    await onboard(routine);
    await sleepThroughNight(at(6, 7, 1));
    const pedometer = fakePedometer();
    pedometer.walkedAt(at(6, 7, 2), 230);
    runTo(at(6, 7, 20));
    const walk = homeWalk(pedometer, routine);
    await flush();
    assert.ok(walk.proved(), 'the history read on open proves it');
    walk.stop();
    await assertWoke('steps');
  });

  test('shaking the phone at 6 steps a second is capped: 200 shakes in 33 s do not prove', async () => {
    await onboard(routine);
    await sleepThroughNight();
    const pedometer = fakePedometer();
    const walk = homeWalk(pedometer, routine);
    await flush();
    await pedometer.walk(200, 6);
    assert.ok(walk.steps() < 200, `credited ${walk.steps()}`);
    assert.equal(walk.proved(), undefined);
    // The history poll can't add them back either.
    await walk.poll();
    assert.equal(walk.proved(), undefined, 'the poll stays under the cap');
    walk.stop();
    assert.ok(NIGHT.every(asleep));
  });

  test('a lower step goal (100) proves at 100', async () => {
    const r = { ...routine, stepGoal: 100 };
    await onboard(r);
    await sleepThroughNight();
    const pedometer = fakePedometer();
    const walk = homeWalk(pedometer, r);
    await flush();
    await pedometer.walk(101);
    assert.ok(walk.proved());
    walk.stop();
    await assertWoke('steps');
  });
});

/* ---------- Go downstairs ---------- */

describe('downstairs', () => {
  const routine = { ...rt.DEFAULT_ROUTINE, method: 'downstairs' as const };

  test('one floor down (3 m over 8 s, ±0.15 m noise) proves after the 5 s hold', async () => {
    await onboard(routine);
    await sleepThroughNight();
    const r = await homeStairs(flight(Date.now(), 3), 60_000);
    assert.ok(r.proved, `statuses: ${r.statuses.join(' → ')}`);
    assert.ok(r.statuses.includes('holding'));
    await assertWoke('downstairs');
    assertNextNightLocks();
  });

  test('going up a floor proves too (someone who sleeps downstairs)', async () => {
    await onboard(routine);
    await sleepThroughNight();
    const down = flight(Date.now(), 3);
    const r = await homeStairs((t) => 200 - down(t), 60_000);
    assert.ok(r.proved);
    await assertWoke('downstairs');
  });

  test('2.6 m stairs with ±0.3 m noise still finish (the hysteresis)', async () => {
    await onboard(routine);
    await sleepThroughNight();
    const r = await homeStairs(flight(Date.now(), 2.6, { amp: 0.3, seed: 7 }), 90_000);
    assert.ok(r.proved, r.statuses.join(' → '));
  });

  test('2.3 m (a few steps, a split level) never proves, even with noise', async () => {
    await onboard(routine);
    await sleepThroughNight();
    const r = await homeStairs(flight(Date.now(), 2.3, { amp: 0.1, seed: 3 }), 6 * MIN);
    assert.equal(r.proved, undefined, r.statuses.join(' → '));
    assert.ok(NIGHT.every(asleep));
  });

  test('down and straight back up within 3 s does not prove: the hold has to last', async () => {
    await onboard(routine);
    await sleepThroughNight();
    const t0 = Date.now();
    const down = flight(t0, 3, { amp: 0.05 });
    const trace: Trace = (t) => (t - t0 < 18_000 + 3_000 ? down(t) : 100);
    const r = await homeStairs(trace, 50_000);
    assert.equal(r.proved, undefined, r.statuses.join(' → '));
  });

  test('a phone on the bedside table for 20 minutes in a storm (pressure falling 0.5 m per 2 min) never proves', async () => {
    await onboard(routine);
    await sleepThroughNight();
    const t0 = Date.now();
    const wobble = noise(11, 0.1);
    // Falling pressure reads as rising altitude: 0.25 m a minute, 5 m over 20 minutes.
    const r = await homeStairs((t) => 100 + ((t - t0) / MIN) * 0.25 + wobble(), 20 * MIN);
    assert.equal(r.proved, undefined, r.statuses.join(' → '));
    assert.ok(r.statuses.includes('timedOut'), 'sessions restart every 5 minutes, which bounds the drift');
  });

  test('a very fast storm (1 m a minute on the desk) is the edge: it is reported, not hidden', async () => {
    await onboard(routine);
    await sleepThroughNight();
    const t0 = Date.now();
    const r = await homeStairs((t) => 100 + ((t - t0) / MIN) * 1, 10 * MIN);
    // 1 m/min passes 2.5 m in 2.5 minutes of one session. Real weather never moves that fast
    // (a hurricane's eye wall is ~0.3 m/min); recorded so a change to the rules shows here.
    assert.ok(r.proved, 'a drift this fast would pass: the rules rely on weather being slower');
  });

  test('shaking the phone in bed (±1 m spikes at random) never proves', async () => {
    await onboard(routine);
    await sleepThroughNight();
    const spike = noise(5, 1);
    const r = await homeStairs(() => 100 + spike(), 3 * MIN);
    assert.equal(r.proved, undefined, r.statuses.join(' → '));
  });

  test('a door slam (a 4 m spike for 2 s) never proves', async () => {
    await onboard(routine);
    await sleepThroughNight();
    const t0 = Date.now();
    const r = await homeStairs((t) => (t - t0 >= 20_000 && t - t0 < 22_000 ? 96 : 100), 60_000);
    assert.equal(r.proved, undefined, r.statuses.join(' → '));
  });

  test('an elevator down three floors (9 m in 15 s) proves: it is a floor change', async () => {
    await onboard(routine);
    await sleepThroughNight();
    const r = await homeStairs(flight(Date.now(), 9, { stairsMs: 15_000 }), 60_000);
    assert.ok(r.proved);
  });

  test('a single-storey home: listening goes on for 15 minutes, restarting, and never proves', async () => {
    await onboard(routine);
    await sleepThroughNight();
    const wobble = noise(9, 0.2);
    const r = await homeStairs(() => 100 + wobble(), 15 * MIN);
    assert.equal(r.proved, undefined);
    assert.ok(r.statuses.filter((s) => s === 'timedOut').length >= 2, 'restarted after each 5 minutes');
  });

  test('going downstairs BEFORE Home is open: the stairs alone cannot prove (only steps or the shield can)', async () => {
    await onboard(routine);
    await sleepThroughNight(at(6, 7, 1));
    // Walked down at 7:02 with the app closed; opened Home at 7:05, already downstairs.
    runTo(at(6, 7, 5));
    const r = await homeStairs(() => 97 + noise(2, 0.1)(), 6 * MIN);
    assert.equal(r.proved, undefined, 'the session baselines downstairs: nothing to measure');
  });

  test('locking the phone mid-trip: the session ends, and the new one starts from where the phone now is', async () => {
    await onboard(routine);
    await sleepThroughNight();
    const t0 = Date.now();
    // Halfway down when the phone is locked (iOS stops the altimeter); back on at the bottom.
    const r = await homeStairs(flight(t0, 3, { amp: 0.05 }), 60_000, { background: t0 + 14_000 });
    assert.equal(r.proved, undefined, 'the trip is lost: they must change floors again or walk');
  });

  test('walk instead on a stairs morning proves with steps', async () => {
    await onboard(routine);
    await sleepThroughNight();
    const pedometer = fakePedometer();
    const walk = homeWalk(pedometer, routine);
    await flush();
    await pedometer.walk(205);
    assert.ok(walk.proved());
    walk.stop();
    await assertWoke('steps');
  });
});

/* ---------- Push-ups ---------- */

describe('pushups', () => {
  const routine = { ...rt.DEFAULT_ROUTINE, method: 'pushups' as const, pushupGoal: 10 };

  test('10 clean reps prove; the reps are saved for the morning', async () => {
    await onboard(routine);
    await sleepThroughNight();
    const cam = pushupsCamera(10);
    cam.feed(poseFrames(REP, 10, Date.now()));
    assert.equal(cam.session().reps, 10);
    assert.ok(cam.proved());
    await assertWoke('pushups');
    assertNextNightLocks();
  });

  test('9 reps, close the camera, 1 more later: the saved reps carry over and prove', async () => {
    await onboard(routine);
    await sleepThroughNight();
    const first = pushupsCamera(10);
    first.feed(poseFrames(REP, 9, Date.now()));
    assert.equal(first.session().reps, 9);
    assert.equal(first.proved(), undefined);
    mock.timers.setTime(Date.now() + 5 * MIN);
    const second = pushupsCamera(10);
    assert.equal(second.session().reps, 9, 'opens on the 9 done');
    second.feed(poseFrames(REP, 1, Date.now()));
    assert.ok(second.proved());
    await assertWoke('pushups');
  });

  test('half reps (never past 120°) count none', async () => {
    await onboard(routine);
    await sleepThroughNight();
    const cam = pushupsCamera(10);
    cam.feed(poseFrames(HALF, 20, Date.now()));
    assert.equal(cam.session().reps, 0);
    assert.ok(NIGHT.every(asleep));
  });

  test('arms bending with no shoulder drop (arm pumps, jitter) count none', async () => {
    await onboard(routine);
    await sleepThroughNight();
    const cam = pushupsCamera(10);
    cam.feed(poseFrames(REP, 15, Date.now(), (deg) => plankDropped(deg, 0)));
    assert.equal(cam.session().reps, 0);
  });

  test('sitting up (torso upright) doing curls counts none', async () => {
    await onboard(routine);
    await sleepThroughNight();
    const cam = pushupsCamera(10);
    // The same arm, the torso stood up: rotate the body 80° about the wrist.
    const upright = (deg: number) => {
      const j = plankPose(deg, BODY);
      const c = BODY.wrist;
      const a = (80 * Math.PI) / 180;
      return Object.fromEntries(
        Object.entries(j).map(([k, v]) => {
          const dx = v!.x - c.x, dy = v!.y - c.y;
          return [k, { ...v!, x: c.x + dx * Math.cos(a) - dy * Math.sin(a), y: c.y + dx * Math.sin(a) + dy * Math.cos(a) }];
        }),
      ) as ReturnType<typeof plankPose>;
    };
    cam.feed(poseFrames(REP, 15, Date.now(), upright));
    assert.equal(cam.session().reps, 0);
  });

  test('nobody in view for 10 minutes times out; the camera can start again', async () => {
    await onboard(routine);
    await sleepThroughNight();
    const cam = pushupsCamera(10);
    const t0 = Date.now();
    const empty = Array.from({ length: 10 }, (_, i) => ({ at: t0 + i * MIN + MIN, joints: {} }));
    cam.feed(empty);
    assert.equal(cam.session().status, 'timedOut');
    assert.ok(NIGHT.every(asleep));
  });

  test('the phone knocked over mid-set (joints vanish for 3 s): the reps done stay', async () => {
    await onboard(routine);
    await sleepThroughNight();
    const cam = pushupsCamera(10);
    const a = poseFrames(REP, 5, Date.now());
    cam.feed(a);
    const gap = a.at(-1)!.at + 3_000;
    cam.feed([{ at: gap, joints: {} }]);
    cam.feed(poseFrames(REP, 5, gap + 500));
    assert.equal(cam.session().reps, 10);
    assert.ok(cam.proved());
  });

  test('walk instead on a push-ups morning proves with steps', async () => {
    await onboard(routine);
    await sleepThroughNight();
    const pedometer = fakePedometer();
    const walk = homeWalk(pedometer, routine);
    await flush();
    await pedometer.walk(205);
    assert.ok(walk.proved());
    walk.stop();
    await assertWoke('steps');
  });
});

/* ---------- Scan ---------- */

describe('scan', () => {
  const routine = { ...rt.DEFAULT_ROUTINE, method: 'scan' as const };
  const QR = 'LOCTURNE-ABCDEFGHJKMN';

  async function withCode(code = { kind: 'qr' as const, data: QR, type: 'qr' }) {
    await onboard(routine, at(5, 18));
    assert.equal(scan.registerScanCode(code), null, 'set up by day');
    mock.timers.setTime(at(5, 20));
  }

  test('the registered code wakes the bedtime apps; the next bedtime locks again', async () => {
    await withCode();
    await sleepThroughNight();
    assert.equal(scan.submitScan(QR), 'unlocked');
    await assertWoke('scan');
    assertNextNightLocks();
  });

  test('another code, or another Locturne printout, is refused', async () => {
    await withCode();
    await sleepThroughNight();
    assert.equal(scan.submitScan('LOCTURNE-ZZZZZZZZZZZZ'), 'wrongCode');
    assert.equal(scan.submitScan('https://example.com'), 'wrongCode');
    assert.equal(scan.submitScan('5000112637922'), 'wrongCode');
    assert.ok(NIGHT.every(asleep));
  });

  test('a product barcode: UPC-A read back as EAN-13 with a leading 0 still matches', async () => {
    await withCode({ kind: 'barcode', data: '012345678905', type: 'upc_a' } as never);
    await sleepThroughNight();
    assert.equal(scan.submitScan('0012345678905'), 'unlocked');
    await assertWoke('scan');
  });

  test('a scan during the night is refused: bedtime wins', async () => {
    await withCode();
    runTo(at(6, 2));
    await open();
    assert.equal(scan.submitScan(QR), 'notMorning');
    assert.ok(NIGHT.every(asleep));
  });

  test('the code cannot be changed from bed (night or morning)', async () => {
    await withCode();
    runTo(at(6, 2));
    assert.equal(scan.registerScanCode({ kind: 'barcode', data: '9780201379624', type: 'ean13' }), 'asleep');
    await sleepThroughNight();
    assert.equal(scan.registerScanCode({ kind: 'barcode', data: '9780201379624', type: 'ean13' }), 'asleep');
    assert.equal(scan.submitScan('9780201379624'), 'wrongCode');
  });

  test('a saved code is no way out of a steps morning', async () => {
    await onboard({ ...routine, method: 'steps' }, at(5, 18));
    assert.equal(scan.registerScanCode({ kind: 'qr', data: QR, type: 'qr' }), null);
    mock.timers.setTime(at(5, 20));
    await sleepThroughNight();
    assert.equal(scan.submitScan(QR), 'notMethod');
    assert.ok(NIGHT.every(asleep));
  });

  test('a scan morning with no code set falls back to steps', async () => {
    await onboard(routine);
    await sleepThroughNight();
    assert.equal(scan.submitScan(QR), 'noCode');
    const pedometer = fakePedometer();
    const walk = homeWalk(pedometer, routine);
    await flush();
    await pedometer.walk(205);
    assert.ok(walk.proved());
    walk.stop();
    await assertWoke('steps');
  });
});

/* ---------- Place ---------- */

describe('place', () => {
  const routine = { ...rt.DEFAULT_ROUTINE, method: 'place' as const };
  const GYM = { name: 'Gym', latitude: 30.2672, longitude: -97.7431 };
  /** `metres` north of the gym. */
  const north = (metres: number) => GYM.latitude + metres / 111_320;
  const fix = (metres: number, accuracy: number | null = 15, ageMs = 2_000) => ({
    latitude: north(metres),
    longitude: GYM.longitude,
    accuracy,
    timestamp: Date.now() - ageMs,
  });

  async function withPlace() {
    await onboard(routine, at(5, 18));
    assert.equal(place.saveMorningPlace(GYM), null);
    mock.timers.setTime(at(5, 20));
  }

  test('a sharp fix at the gym wakes the bedtime apps; the next bedtime locks again', async () => {
    await withPlace();
    await sleepThroughNight();
    assert.deepEqual(place.submitPlaceFix(fix(30)), { kind: 'unlocked' });
    await assertWoke('place');
    assertNextNightLocks();
  });

  test('from bed, 2 km away: not there', async () => {
    await withPlace();
    await sleepThroughNight();
    assert.equal(place.submitPlaceFix(fix(2_000)).kind, 'notThere');
    assert.ok(NIGHT.every(asleep));
  });

  test('just outside (130 m) is not there; just inside (110 m) is', async () => {
    await withPlace();
    await sleepThroughNight();
    assert.equal(place.submitPlaceFix(fix(130)).kind, 'notThere');
    assert.equal(place.submitPlaceFix(fix(110)).kind, 'unlocked');
  });

  test('a fuzzy fix (accuracy 500 m) at the gym is unsure, never a yes', async () => {
    await withPlace();
    await sleepThroughNight();
    assert.equal(place.submitPlaceFix(fix(10, 500)).kind, 'unsure');
    assert.equal(place.submitPlaceFix(fix(10, null)).kind, 'unsure');
    assert.ok(NIGHT.every(asleep));
  });

  test('a stale fix (a cached one from 2 minutes ago, e.g. last night at the gym) is unsure', async () => {
    await withPlace();
    await sleepThroughNight();
    assert.equal(place.submitPlaceFix(fix(10, 15, 2 * MIN)).kind, 'unsure');
    assert.ok(NIGHT.every(asleep));
  });

  test('a GPS jump (0,0 or out of range) is unsure', async () => {
    await withPlace();
    await sleepThroughNight();
    assert.equal(place.submitPlaceFix({ latitude: 0, longitude: 0, accuracy: 5, timestamp: Date.now() }).kind, 'unsure');
    assert.equal(place.submitPlaceFix({ latitude: 95, longitude: 0, accuracy: 5, timestamp: Date.now() }).kind, 'unsure');
  });

  test('during the night a check-in at the gym is refused', async () => {
    await withPlace();
    runTo(at(6, 2));
    await open();
    assert.equal(place.submitPlaceFix(fix(10)).kind, 'notMorning');
    assert.ok(NIGHT.every(asleep));
  });

  test('no place saved: noPlace, and the morning is walked instead', async () => {
    await onboard(routine);
    await sleepThroughNight();
    assert.equal(place.submitPlaceFix(fix(10)).kind, 'noPlace');
    const pedometer = fakePedometer();
    const walk = homeWalk(pedometer, routine);
    await flush();
    await pedometer.walk(205);
    assert.ok(walk.proved());
    walk.stop();
    await assertWoke('steps');
  });

  test('the place cannot be moved from bed', async () => {
    await withPlace();
    await sleepThroughNight();
    assert.equal(place.saveMorningPlace({ name: 'Bed', latitude: 30.3, longitude: -97.7 }), 'asleep');
  });

  test('a place check-in never wakes a steps morning, as a scan never does', async () => {
    await onboard({ ...routine, method: 'steps' }, at(5, 18));
    assert.equal(place.saveMorningPlace(GYM), null);
    mock.timers.setTime(at(5, 20));
    await sleepThroughNight();
    // Only reachable if something offers the check-in on a non-place morning; Home doesn't today.
    assert.equal(place.submitPlaceFix(fix(10)).kind, 'notMethod');
    assert.ok(NIGHT.every((a) => asleep(a)), 'the bedtime apps stay asleep');
  });
});

/* ---------- Across methods ---------- */

describe('every method', () => {
  test('a pass that morning wakes the bedtime apps, counts as no morning won, and the next night locks', async () => {
    await onboard({ method: 'downstairs' });
    await sleepThroughNight();
    assert.equal(passes.spendPass(), null);
    await open();
    assert.ok(NIGHT.every((a) => !asleep(a)));
    assert.ok(ALWAYS.every(asleep));
    assert.equal(mp.getMorningsWon(), 0, 'a pass is not a morning won');
    assertNextNightLocks();
  });

  test('a schedule and a used Block now keep their apps asleep after a wake-up', async () => {
    await onboard({ method: 'steps' }, at(5, 18));
    pick('sched-0', ['youtube']);
    st.saveSchedules(sc.editSchedule(st.getSchedules(), 'sched-0', { id: 'sched-0', name: 'Morning', start: 6 * 60, end: 9 * 60, days: [0, 1, 2, 3, 4, 5, 6] }, new Date()));
    await open();
    mock.timers.setTime(at(5, 20));
    await sleepThroughNight();
    assert.ok(asleep('youtube'));
    const pedometer = fakePedometer();
    const walk = homeWalk(pedometer, { ...rt.DEFAULT_ROUTINE, method: 'steps' });
    await flush();
    await pedometer.walk(205);
    assert.ok(walk.proved());
    walk.stop();
    await assertWoke('steps', { other: ['youtube'] });
    runTo(at(6, 9, 1));
    assert.ok(!asleep('youtube'), 'the schedule ends at 9');
  });

  test('a morning start edited while asleep is refused; awake, it applies', async () => {
    await onboard({ method: 'steps' });
    runTo(at(6, 2));
    const refusal = () => scan.editRefusal(em.heldPhase(lc.readLock().phase, new Date()));
    assert.equal(refusal(), 'asleep', 'from bed at 2am');
    await sleepThroughNight();
    assert.equal(refusal(), 'asleep', 'in the locked morning');
    const pedometer = fakePedometer();
    const walk = homeWalk(pedometer, { ...rt.DEFAULT_ROUTINE, method: 'steps' });
    await flush();
    await pedometer.walk(205);
    walk.stop();
    await open();
    assert.equal(refusal(), null, 'up: edits apply');
  });

  test('a lapsed subscription: the night under way finishes, the next night does not lock, proofs record nothing', async () => {
    await onboard({ method: 'steps' });
    runTo(at(6, 2));
    lc.settleSubscription(false);
    await open();
    assert.ok(NIGHT.every(asleep), 'tonight, paid for, finishes');
    runTo(at(6, 7, 5));
    await open();
    const pedometer = fakePedometer();
    const walk = homeWalk(pedometer, { ...rt.DEFAULT_ROUTINE, method: 'steps' });
    await flush();
    await pedometer.walk(205);
    walk.stop();
    await open();
    assert.ok(NIGHT.every((a) => !asleep(a)), 'the last paid morning still wakes');
    runTo(at(6, 23, 30));
    await open();
    assert.ok(NIGHT.every((a) => !asleep(a)), 'no lock after the subscription ends');
    runTo(at(7, 7, 5));
    await open();
    assert.equal(lc.proveMorning('steps'), null, 'nothing to prove');
  });

  for (const method of ['steps', 'downstairs', 'pushups', 'scan', 'place'] as const) {
    test(`${method}: three nights in a row lock and wake (method ${method}, proved each morning)`, async () => {
      await onboard({ method }, at(5, 18));
      if (method === 'scan') scan.registerScanCode({ kind: 'qr', data: 'LOCTURNE-ABCDEFGHJKMN', type: 'qr' });
      if (method === 'place') place.saveMorningPlace({ name: 'Gym', latitude: 30.2672, longitude: -97.7431 });
      mock.timers.setTime(at(5, 20));
      for (let night = 0; night < 3; night++) {
        const d = 5 + night;
        runTo(at(d, 23, 1));
        assert.ok(NIGHT.every(asleep), `night ${night + 1} locks`);
        runTo(at(d + 1, 7, 5));
        await open();
        assert.ok(NIGHT.every(asleep), `morning ${night + 1} held`);
        if (method === 'steps') {
          const p = fakePedometer();
          const w = homeWalk(p, { ...rt.DEFAULT_ROUTINE, method });
          await flush();
          await p.walk(205);
          w.stop();
        } else if (method === 'downstairs') {
          await homeStairs(flight(Date.now(), 3, { seed: night + 1 }), 60_000);
        } else if (method === 'pushups') {
          pushupsCamera(10).feed(poseFrames(REP, 10, Date.now()));
        } else if (method === 'scan') {
          assert.equal(scan.submitScan('LOCTURNE-ABCDEFGHJKMN'), 'unlocked');
        } else {
          const p = place.submitPlaceFix({ latitude: 30.2673, longitude: -97.7431, accuracy: 10, timestamp: Date.now() - 1000 });
          assert.equal(p.kind, 'unlocked');
        }
        await open();
        assert.ok(NIGHT.every((a) => !asleep(a)), `morning ${night + 1} wakes`);
        assert.equal(mp.getMorningsWon(), night + 1);
      }
    });
  }
});

/* ---------- Clock changes ---------- */

describe('clock changes', () => {
  // Where the zone has a change in 2026; elsewhere these run as ordinary nights.
  const zone = process.env.TZ ?? '';
  test(`a wake-up on the morning after the clocks change (${zone || 'local'})`, async () => {
    // Find the first change of 2026 in this zone, and sleep the night it falls in.
    let change: number | null = null;
    let prev = new Date(2026, 0, 1).getTimezoneOffset();
    for (let t = new Date(2026, 0, 1).getTime(); t < new Date(2027, 0, 1).getTime(); t += 30 * MIN) {
      const off = new Date(t).getTimezoneOffset();
      if (off !== prev) {
        change = t;
        break;
      }
      prev = off;
    }
    if (change === null) return;
    const day = new Date(change);
    const evening = new Date(day.getFullYear(), day.getMonth(), day.getDate() - 1, 20).getTime();
    await onboard({ method: 'steps' }, evening);
    const bed = new Date(day.getFullYear(), day.getMonth(), day.getDate() - 1, 23, 1).getTime();
    runTo(bed);
    assert.ok(NIGHT.every(asleep), 'locked the night of the change');
    const morning = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 7, 10).getTime();
    runTo(morning);
    await open();
    assert.equal(lc.readLock().phase, 'morning');
    assert.ok(NIGHT.every(asleep));
    const pedometer = fakePedometer();
    pedometer.walkedAt(new Date(day.getFullYear(), day.getMonth(), day.getDate(), 6, 50).getTime(), 300); // before 7:00
    const walk = homeWalk(pedometer, { ...rt.DEFAULT_ROUTINE, method: 'steps' });
    await flush();
    assert.equal(walk.proved(), undefined, 'steps before 7:00 local do not count, clock change or not');
    await pedometer.walk(205);
    assert.ok(walk.proved());
    walk.stop();
    await open();
    assert.ok(NIGHT.every((a) => !asleep(a)));
  });
});
