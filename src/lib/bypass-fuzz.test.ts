/// <reference types="node" />

/**
 * A from-bed bypass fuzzer against the simulated phone (sim-device.ts), with an oracle built
 * only from the product promise, not from the app's own rules (security audits, rounds 51-52).
 *
 * Each run sets up a routine R0 (23:00, 00:30 or 22:00 to the morning, or a night shift with
 * BYPASS_FUZZ_SHIFT=1; some runs have nights off), lets its first night start, and then does
 * everything an impatient person could from bed or the next day: routine edits (whole or one
 * field, wake-up method, Undo, every night off and back), list removals and additions (Apps
 * tab and onboarding's picker, lists that share apps), always-list removals, daily limits
 * (looser, removed, created, their lists edited, up to three, used up), Block now on either
 * list and "Wake him early", onboarding again, scan-code registration and scans, lapses with
 * renewals now, later or never (Ask to Buy waits like a lapse), emergencies, passes and
 * proofs. Actions sometimes land a second or two around a boundary (morning start, a window's
 * start, a waiting change's `from`, inside the extension's two-minute slack), and iOS
 * sometimes refuses a registration part-way, or runs a window's start before the app's next
 * registration. Before R0's next night that's on, R0 and the lists are restored; then the
 * phone runs through that night and into its morning, opened from bed at the boundaries.
 *
 * The promise (no clock or time-zone changes: see Open in BUG_SWEEP_2026-10-04.md):
 *
 * - R0's bedtime apps stay asleep from its first bedtime until a real proof (a walk or a scan
 *   from R0's morning start on, or a pass then) or an emergency unlock, at most until R0's next
 *   bedtime;
 * - a scan code can't be registered while that holds;
 * - the always apps, and the apps of a limit used up, stay asleep until R0's next bedtime (the
 *   limit until midnight at most), unless a lapse stood everything down;
 * - after restoring R0, its next night that's on holds, with the app closed or opened from
 *   bed, through its morning start until a proof (none is made), and so does the always list.
 *
 * Deterministic: seeds come from `prng`. Defaults keep it quick; run more with
 * BYPASS_FUZZ_SEEDS=<count> (and BYPASS_FUZZ_SEED0=<first>), replay one with
 * BYPASS_FUZZ_SEED=<n> BYPASS_FUZZ_DEBUG=1.
 *
 * Needs `--experimental-test-module-mocks` (set in the npm test script).
 */
import assert from 'node:assert/strict';
import { mock, test } from 'node:test';

const { prng, simDevice, token } = await import('./sim-device.ts');
const device = simDevice();

/*
 * iOS refusing a registration part-way (refused-arm.test.ts): after `acceptLeft` more calls,
 * the next `refuseLeft` are refused. And, per run, whether iOS runs a window's start right
 * after its own registration (before the app's next call) or only once the call returns.
 */
const realStart = device.exports.startMonitoring;
let acceptLeft = Infinity;
let refuseLeft = 0;
let fireOnRegister = false;
/**
 * Registrations the simulated iOS itself refused (its cap of 20 activities, `device.state.cap`,
 * or an interval ending before it starts), not the forced refusals above. The night windows,
 * Block now, three limits and the list settle are budgeted to fit (night-plan.ts,
 * `scheduleListSettle`), so any is a failure.
 */
const iosRefused: string[] = [];
device.exports.startMonitoring = async (...args: Parameters<typeof realStart>) => {
  if (acceptLeft <= 0 && refuseLeft > 0) {
    refuseLeft -= 1;
    throw new Error('excessiveActivities');
  }
  acceptLeft -= 1;
  try {
    await realStart(...args);
  } catch (error) {
    iosRefused.push(`${args[0]} (${String(error)}) at ${new Date().toString().slice(0, 24)} with ${[...device.state.monitored.keys()].join(',')}`);
    throw error;
  }
  if (fireOnRegister) for (const q of device.state.queue.splice(0)) device.fire(q.activity, q.callback);
};
const noRefusals = () => {
  acceptLeft = Infinity;
  refuseLeft = 0;
};

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
const ls = await import('./lock-state.ts');
const dl = await import('./daily-limits.ts');
const em = await import('./emergency.ts');
const ps = await import('./passes.ts');
const sc = await import('./scan.ts');
const pp = await import('./pending-purchase.ts');
const np = await import('../features/onboarding/night-picker.ts');
const np2 = await import('./night-plan.ts');
const { armTonight } = await import('./arm.ts');

type Routine = import('./routine.ts').Routine;
type StandingList = import('./screen-time.ts').StandingList;
type LimitId = import('./daily-limits.ts').LimitId;
type DailyLimit = import('./daily-limits.ts').DailyLimit;

const MIN = 60_000;
const ALL = [0, 1, 2, 3, 4, 5, 6];
const ONLY = process.env.BYPASS_FUZZ_SEED;
const SEED0 = Number(ONLY ?? process.env.BYPASS_FUZZ_SEED0 ?? 1);
const SEEDS = ONLY ? 1 : Number(process.env.BYPASS_FUZZ_SEEDS ?? 500);
const DEBUG = !!process.env.BYPASS_FUZZ_DEBUG;

const R0S: Pick<Routine, 'bedtime' | 'morningStart'>[] = [
  { bedtime: 23 * 60, morningStart: 7 * 60 },
  { bedtime: 30, morningStart: 8 * 60 },
  { bedtime: 22 * 60, morningStart: 6 * 60 + 30 },
  ...(process.env.BYPASS_FUZZ_SHIFT
    ? [
        { bedtime: 8 * 60, morningStart: 16 * 60 },
        { bedtime: 20 * 60, morningStart: 4 * 60 },
      ]
    : []),
];

const NIGHT0 = ['tiktok', 'insta'];
const ALWAYS0 = ['reddit'];
const CODE = '5012345678900';

/** The first day's noon: BYPASS_FUZZ_START=YYYY-MM-DD moves it (a clock change in the first nights). */
const START = (process.env.BYPASS_FUZZ_START || '2026-10-04').split('-').map(Number);
const noon = () => new Date(START[0], START[1] - 1, START[2], 12).getTime();
const hm = (t: number) => {
  const d = new Date(t);
  return `${d.toString().slice(0, 21)}${d.getSeconds() ? `:${String(d.getSeconds()).padStart(2, '0')}` : ''}`;
};
const asleep = (app: string) => device.state.shielded.has(app);
const appsOf = (id: string) => device.appsOfId(id);

async function flush() {
  for (let i = 0; i < 6; i++) await new Promise((resolve) => setImmediate(resolve));
}

/** What iOS queued straight after a call (a registration inside its interval). */
function drain() {
  while (device.state.queue.length) {
    const e = device.state.queue.shift()!;
    device.fire(e.activity, e.callback);
  }
}

/** The phone runs with Locturne closed until `to`. */
function runTo(to: number) {
  // Native handoff can replace schedules during a callback. Recompute after each instant.
  while (Date.now() < to) {
    const due = device.dueEvents(Date.now(), to);
    if (!due.length) break;
    const batch = due.filter((e) => e.at === due[0].at);
    for (const e of batch) {
      mock.timers.setTime(e.at);
      device.fire(e.activity, e.callback);
      drain();
    }
  }
  mock.timers.setTime(to);
}

let paid = true;

/** `armIfPaid` (hooks/use-app-start.ts), which can't be imported without React. */
async function armIfPaid() {
  if (!rt.hasRoutine()) return;
  lc.settleSubscription(paid);
  await flush();
  drain();
  if (!paid || st.getArmedNight() || st.shownSelection('night').size === 0) return;
  await armTonight().catch(() => {});
  await flush();
  drain();
}

/** Launch or return to the front: `useLock`, `useStandingBlocks` and `useAppStart`. */
async function open() {
  lc.syncLock();
  drain();
  await st.settleLimitChanges().catch(() => {});
  drain();
  lc.syncLock();
  await flush();
  drain();
  await armIfPaid();
}

async function setup(start: number, routine: Routine) {
  device.reset();
  mock.timers.reset();
  noRefusals();
  paid = true;
  mock.timers.enable({ apis: ['Date'], now: start });
  device.exports.setFamilyActivitySelectionId({ id: 'night', familyActivitySelection: token(NIGHT0) });
  device.exports.setFamilyActivitySelectionId({ id: 'always', familyActivitySelection: token(ALWAYS0) });
  device.exports.setFamilyActivitySelectionId({ id: 'limit-0', familyActivitySelection: token(['yt', 'yt2']) });
  lc.settleSubscription(true);
  rt.saveRoutine(routine);
  const armed = await armTonight();
  drain();
  assert.equal(armed.status, 'armed');
  const limit = { id: 'limit-0' as const, minutes: 15 };
  await st.armLimit(limit);
  st.saveLimits([limit]);
  drain();
  await open();
}

/** The Routine tab's save. */
async function commit(next: Routine) {
  const now = new Date();
  rt.saveRoutine(next, now, lc.inPendingFirstNight(now));
  lc.syncLock();
  drain();
  if (st.getArmedNight()) await lc.armRoutine().catch(() => {});
  else await armIfPaid();
  await flush();
  drain();
}

/** What the Routine tab edits: the waiting edit, or the routine in force. */
const edited = () => rt.getPendingRoutine()?.routine ?? rt.getRoutine();

/** Onboarding again from See plans while paid: `saveSetup`, then `armTonight`. */
async function rerun(bedtime: number, morningStart: number) {
  // Bought (again) on the paywall if it had lapsed.
  paid = true;
  lc.settleSubscription(true);
  drain();
  const now = new Date();
  rt.saveRoutine({ ...edited(), bedtime, morningStart }, now, lc.inPendingFirstNight(now));
  lc.syncLock();
  await armTonight().catch(() => {});
  await flush();
  drain();
}

/** Apple's picker on a standing list's draft (Done writes `apps`), as `edit` in apps-list.tsx opens it. */
function pick(list: StandingList, apps: string[]) {
  const draft = st.beginListEdit(list);
  const ids = { ...device.ids() };
  if (apps.length) ids[draft] = token(apps);
  else delete ids[draft];
  device.exports.userDefaultsSet('familyActivitySelectionIds', ids);
}

/** The Apps tab's `saveAndArm`: saved first, reverted to what iOS still enforces if it refuses. */
async function saveAndArm(limits: DailyLimit[], next: DailyLimit[], arm?: DailyLimit) {
  const before = limits.find((l) => l.id === arm?.id);
  st.saveLimits(next);
  if (!arm) return;
  try {
    await st.armLimit(arm);
  } catch {
    st.saveLimits(before ? st.getLimits().map((l) => (l.id === arm.id ? before : l)) : st.getLimits().filter((l) => l.id !== arm.id));
  }
}

/** The Apps tab's `pickedList` (and `pickedLimit`), after Apple's picker closed on a draft. */
async function listEdit(list: StandingList, apps: string[]) {
  const limits = st.getLimits();
  pick(list, apps);
  st.finishListEdit(list, lc.looserEditsStartAt(new Date(), list));
  if (dl.isLimitId(list)) {
    const existing = limits.find((l) => l.id === list);
    if (existing) await saveAndArm(limits, limits, existing);
    else if (st.selectionSize(list) === 0) st.clearSelection(list);
    else {
      const created: DailyLimit = { id: list, minutes: 30 };
      await saveAndArm(limits, [...limits, created], created);
    }
  }
  st.reapplyStandingBlocks();
  drain();
}

/** Onboarding's bedtime-apps picker (night-picker.ts). */
function picker(apps: string[]) {
  const id = np.openNightPicker(new Date());
  const ids = { ...device.ids() };
  if (apps.length) ids[id] = token(apps);
  else delete ids[id];
  device.exports.userDefaultsSet('familyActivitySelectionIds', ids);
  np.closeNightPicker(id, new Date());
  drain();
}

/** The Apps tab's limit menu (`setMinutes` in apps-list.tsx). */
async function limitMinutes(id: LimitId, minutes: number | null) {
  const limits = st.getLimits();
  if (!limits.some((l) => l.id === id)) return;
  const now = new Date();
  const next = dl.editLimit(limits, id, minutes, lc.looserEditsStartAt(now), now);
  const after = next.find((l) => l.id === id);
  const before = limits.find((l) => l.id === id);
  await saveAndArm(limits, next, after && after.minutes !== before?.minutes ? after : undefined);
  drain();
}

/** Runs one seed and returns why it failed, or null. */
async function run(seed: number): Promise<string | null> {
  const r = prng(seed);
  const times0 = r.pick(R0S);
  const R0: Routine = { ...rt.DEFAULT_ROUTINE, ...times0, activeNights: ALL };
  // Some runs start with an emergency unlock and no lapses: the pause, then everything else.
  const forceEmergency = r.chance(0.15);
  fireOnRegister = r.chance(0.5);
  // Some routines have nights off (never the first night's evening).
  const S0all = rt.toLockSettings(R0);
  const B1 = ls.settingsTakeEffectAt(new Date(noon()), S0all).getTime();
  const M1 = ls.nightsAround(new Date(B1 + MIN), S0all).latest.end.getTime();
  const evening = (end: number) => new Date(new Date(end).getFullYear(), new Date(end).getMonth(), new Date(end).getDate() - 1).getDay();
  if (r.chance(0.3)) {
    const first = evening(M1);
    const off = r.subset(ALL.filter((d) => d !== first), 1).slice(0, r.int(1, 3));
    R0.activeNights = ALL.filter((d) => !off.includes(d));
  }
  await setup(noon(), R0);
  // iOS's cap of 20 activities, and registrations that finish after a turn of the event loop (the
  // real bridge's), in most runs: a sync can land while `armNight` is part-way.
  device.state.cap = r.chance(0.8) ? 20 : null;
  device.state.asyncRegistration = r.chance(0.5);
  iosRefused.length = 0;
  const S0 = rt.toLockSettings(R0);
  // R0's first night starts at B1 and runs into M1; R0's next bedtime (night on or off) is B2;
  // its next night that's on runs from B2on into M2.
  const B2 = ls.nightsAround(new Date(B1 + MIN), S0).next.start.getTime();
  let B2on = B2;
  for (let i = 0; i < 8 && !R0.activeNights.includes(evening(ls.nightsAround(new Date(B2on + MIN), S0).latest.end.getTime())); i++) {
    B2on = ls.nightsAround(new Date(B2on + MIN), S0).next.start.getTime();
  }
  const M2 = ls.nightsAround(new Date(B2on + MIN), S0).latest.end.getTime();
  const t0 = B1 + Math.floor(r.next() * ((M1 - B1) / MIN - 20)) * MIN + 5 * MIN;
  runTo(t0);
  if (r.chance(0.5)) await open();
  const log: string[] = [
    `R0 ${R0.bedtime}/${R0.morningStart} nights ${R0.activeNights.join('')}, first night from ${hm(B1)}, fire on register ${fireOnRegister}, cap ${device.state.cap}, async ${device.state.asyncRegistration}`,
  ];
  let everLapsed = false;
  const failure = (why: string) => `seed ${seed}${everLapsed ? ' [lapsed]' : ''}: ${why}\n   ${log.join('\n   ')}`;
  if (!asleep('tiktok')) return failure('first night not held');

  let unlockedAt: number | null = null;
  let emergencyAt: number | null = null;
  /** Apps of a limit used up, and until when they stay asleep. */
  const usedUp = new Map<string, number>();
  /** The strictest minutes each limit has had (a looser number waits for bedtime, past B2). */
  const strictest = new Map<string, number>([['limit-0', 15]]);
  let lapsed = false;
  // After a stand-down (a lapse), an always-list removal waits only for a midnight: nothing is armed (by design).
  let alwaysExempt = false;
  // An emergency unlock paused the night into M2 (emergencies are always available).
  let pausedM2 = false;
  let failed: string | null = null;

  /*
   * The honest direction (round 52): a looser edit really lands, and no later than the app said.
   * `notes`: what the Apps tab said after the last action (`listChangeLandsAt`), with the change it
   * named; nothing user-made happens until the next action, so by then the phone must have swapped
   * the list if the moment has passed.
   */
  const notes: Partial<Record<'night' | 'always', { at: number; from: number; waitsForOpen: boolean }>> = {};
  const noteChanges = () => {
    for (const list of ['night', 'always'] as const) {
      const landed = st.listChangeLandsAt(list);
      const from = st.listChangeStarts(list);
      notes[list] = landed && from ? { at: landed.at.getTime(), from: from.getTime(), waitsForOpen: landed.waitsForOpen } : undefined;
    }
  };
  /** The Apps tab's note came true: a change it said lands by now has been swapped in. */
  const landedAsNoted = () => {
    if (failed) return;
    for (const list of ['night', 'always'] as const) {
      const note = notes[list];
      if (!note || note.waitsForOpen || Date.now() < note.at + MIN) continue;
      if (st.listChangeStarts(list)?.getTime() === note.from) {
        failed = `${list} change still waiting at ${hm(Date.now())}; the Apps tab said it lands at ${hm(note.at)}`;
        return;
      }
      honest.landed += 1;
    }
  };
  /** After an open, nothing waits past its moment: the open settles it (`settleLimitChanges`). */
  const settledOnOpen = (refused: boolean) => {
    if (failed) return;
    const now = Date.now();
    for (const list of ['night', 'always'] as const) {
      const from = st.listChangeStarts(list)?.getTime();
      if (from !== undefined && from < now - MIN) failed = `${list} change due ${hm(from)} still waiting after an open at ${hm(now)}`;
    }
    if (refused) return;
    for (const limit of st.getLimits()) {
      if (limit.pending && limit.pending.from < now - MIN) failed = `${limit.id}'s looser limit due ${hm(limit.pending.from)} still waiting after an open at ${hm(now)}`;
    }
  };
  /**
   * A looser edit saved by day (nothing waiting before it, the bedtime list awake, armed and paid,
   * no pause) starts by the next bedtime: the later of the routine in force's and a waiting
   * edit's, or the midnight after protection was armed if that's later (`looserEditsStartAt`).
   * Catches a change pushed a whole night later.
   */
  const startsByBedtime = (what: string, at: number, from: number | undefined) => {
    if (failed || from === undefined) return;
    const now = new Date(at);
    const routines = [rt.getRoutine(now), rt.getPendingRoutine(now)?.routine].filter((x): x is Routine => !!x);
    const bedtime = Math.max(...routines.map((x) => ls.settingsTakeEffectAt(now, rt.toLockSettings(x)).getTime()));
    const armed = st.getArmedNight();
    const since = armed ? st.armedSince(armed) : now;
    const floor = new Date(since.getFullYear(), since.getMonth(), since.getDate() + 1).getTime();
    if (from > Math.max(bedtime, floor) + MIN) failed = `${what} saved by day at ${hm(at)} starts ${hm(from)}, after the next bedtime ${hm(Math.max(bedtime, floor))}`;
    else honest.byBedtime += 1;
  };
  /** Was a looser edit saved now one by day, which `startsByBedtime` can judge? */
  const byDay = (phase: string) =>
    phase === 'day' && !st.isNightHeld() && !!st.getArmedNight() && !st.isStoodDown() && paid && !lapsed && em.getNightPause() === null;
  /**
   * Home's status and the phone agree: what the app says is asleep (`heldPhase`) is what iOS
   * shields, for a bedtime app no other rule holds (the always list, a used-up limit, Block now).
   */
  const homeAgrees = () => {
    if (failed) return;
    const phase = em.heldPhase(lc.readLock().phase);
    const held = (phase === 'night' || phase === 'morning') && !lc.pastLastPaid(lc.readLock().morningKey);
    const nap = st.getNap();
    const others = new Set<string>([
      ...(st.isStoodDown() ? [] : appsOf('always')),
      ...(nap ? appsOf(nap.list) : []),
      ...st.getLimits().filter((l) => !st.isStoodDown() && st.limitUsedUpToday(l.id)).flatMap((l) => appsOf(l.id)),
    ]);
    // The extension may start a night up to two minutes early (`settleLocturneLists`' slack, and a
    // window registered inside its interval runs at once): asleep then is within the tolerance.
    const now = Date.now();
    const armed = st.getArmedNight();
    const soon = (t: number | undefined | null) => t !== undefined && t !== null && t >= now && t <= now + 2 * MIN + 1000;
    const early =
      soon(em.getNightPause()?.getTime()) || soon(lc.readLock().nextChange.getTime()) || (!!armed && soon(ls.wallClock(new Date(now), armed.bedtime).getTime()));
    for (const app of appsOf('night')) {
      if (others.has(app)) continue;
      if (held && !asleep(app)) failed = `Home says ${phase} at ${hm(now)} but bedtime app ${app} is awake`;
      else if (!held && asleep(app) && !early) failed = `Home says ${phase} at ${hm(now)} but bedtime app ${app} is asleep`;
      if (failed) return;
      honest.home += 1;
    }
  };

  /** Before B2: the promise of the first night and the day after it. */
  const check = () => {
    if (failed) return;
    const at = Date.now();
    // A stand-down disarms: protection is armed afresh after a renewal, and an always-list removal
    // waits only for the midnight after that (by design).
    if (st.isStoodDown()) alwaysExempt = true;
    if (at >= B2 - MIN) return;
    const awake = (apps: string[]) => apps.find((a) => !asleep(a));
    if (unlockedAt === null && emergencyAt === null && awake(NIGHT0)) {
      failed = `bedtime app ${awake(NIGHT0)} awake at ${hm(at)} before any proof, pass or emergency`;
    } else if (!lapsed && !alwaysExempt && awake(ALWAYS0)) {
      failed = `always app awake at ${hm(at)}`;
    } else if (!everLapsed) {
      for (const [app, until] of usedUp) {
        if (!asleep(app) && at < until - MIN) {
          failed = `used-up limit's app ${app} awake at ${hm(at)}`;
          break;
        }
      }
    }
  };
  /** The phone runs closed to `to`, checked every five minutes. Never backwards. */
  const advance = (to: number, checker = check) => {
    if (to <= Date.now()) return;
    for (let u = Date.now() + 5 * MIN; u < to && !failed; u += 5 * MIN) {
      runTo(u);
      checker();
    }
    runTo(to);
    checker();
  };

  /** Used limits: once a limit's minutes are used today, its apps then stay asleep. */
  const markUsedUp = (at: number) => {
    const today = ls.dateKey(new Date(at));
    const midnight = new Date(at).setHours(24, 0, 0, 0);
    for (const limit of st.getLimits()) {
      const used = device.state.usage.get(`${today}|${limit.id}`) ?? 0;
      const minutes = strictest.get(limit.id);
      if (minutes === undefined || used < minutes) continue;
      for (const app of appsOf(limit.id)) if (!usedUp.has(app)) usedUp.set(app, Math.min(midnight, B2));
    }
  };

  if (forceEmergency) {
    const use = em.emergencyUnlock(new Date());
    await flush();
    drain();
    if (use) emergencyAt = Date.now();
    await open();
    log.push(`${hm(Date.now())} emergency until ${use?.resumesAt ? hm(use.resumesAt) : null}`);
  }

  const count = r.int(3, 16);
  const times = Array.from({ length: count }, () => t0 + Math.floor(r.next() * ((B2 - 20 * MIN - t0) / MIN)) * MIN).sort((a, b) => a - b);
  for (const time of times) {
    // A boundary, a second or two either side: morning start, a window's start, a waiting change.
    let at = Math.max(time, Date.now());
    if (r.chance(0.3)) {
      const marks = [M1];
      const armed = st.getArmedNight();
      if (armed) for (const w of [armed.bedtime, armed.morningStart]) marks.push(ls.wallClock(new Date(at), w).getTime(), ls.wallClock(new Date(at), w, 1).getTime());
      const waiting = rt.getPendingRoutine();
      if (waiting) marks.push(waiting.from);
      for (const list of ['night', 'always'] as const) {
        const from = st.listChangeStarts(list);
        if (from) marks.push(from.getTime());
      }
      // The one-off list settle's start (`scheduleListSettle`).
      const settleAt = device.get<number>('locturne.settleAt');
      if (typeof settleAt === 'number') marks.push(settleAt, settleAt);
      const mark = r.pick(marks) + r.pick([-121, -119, -61, -59, -1, 0, 1, 59, 61, 119]) * 1000;
      if (mark > Date.now() && mark < B2 - 20 * MIN) at = mark;
    }
    advance(at);
    landedAsNoted();
    if (failed) break;
    const now = new Date(at);
    const mins = now.getHours() * 60 + now.getMinutes();
    const others = (d: number) => ALL.filter((x) => x !== d);
    const kinds = [
      'field', 'field', 'field', 'edit', 'edit', 'undo', 'undo', 'nightsOff', 'offOn', 'list', 'list', 'picker', 'always',
      'limit', 'limitNew', 'limitList', 'use', 'use', 'emergency', 'pass', 'proof', 'proof', 'nap', 'wake', 'rerun',
      'lapse', 'lapseLong', 'renew', 'scanSet', 'scan', 'open', 'open',
      'longNight', 'fillLimits', 'napLong', 'settleEdge',
    ] as const;
    let kind: (typeof kinds)[number] = r.pick(kinds);
    if ((forceEmergency || process.env.BYPASS_FUZZ_NOLAPSE) && (kind === 'lapse' || kind === 'lapseLong')) kind = 'open';
    // iOS refuses part of what this action registers (and maybe the open after it).
    const refusing = r.chance(0.2);
    if (refusing) {
      acceptLeft = r.int(0, 8);
      refuseLeft = r.int(1, 20);
    }
    const before = lc.readLock(now).phase;
    const dayEdit = byDay(before);
    const waitingBefore = { night: st.listChangeStarts('night'), always: st.listChangeStarts('always') };
    let note = '';
    switch (kind) {
      case 'edit': {
        const bedtime = r.pick([mins + 1, mins + 2, mins + 3, mins + 5, mins + 20, mins + 60, r.int(0, 95) * 15, R0.bedtime - 60, R0.bedtime + 60].map((x) => (x + 1440) % 1440));
        const morningStart = r.pick([R0.morningStart, bedtime + 30, bedtime + 120, r.int(0, 95) * 15, R0.morningStart - 60, mins + 10].map((x) => (x + 1440) % 1440));
        if ((morningStart - bedtime + 1440) % 1440 < 30) break;
        const activeNights = r.pick([ALL, [], [now.getDay()], others(now.getDay()), others((now.getDay() + 6) % 7)]);
        const method = r.pick(['downstairs', 'steps', 'scan'] as const);
        note = `${bedtime}/${morningStart} nights ${activeNights.join('')} ${method}`;
        await commit({ ...edited(), bedtime, morningStart, activeNights, method });
        break;
      }
      case 'field': {
        const field = r.pick(['bedtime', 'bedtime', 'morningStart', 'activeNights', 'activeNights', 'method', 'stepGoal'] as const);
        const next = { ...edited() };
        if (field === 'bedtime') next.bedtime = r.pick([(mins + 1) % 1440, (mins + 2) % 1440, (mins + 5) % 1440, (mins + 20) % 1440, (mins + 1410) % 1440, R0.bedtime, r.int(0, 95) * 15]);
        else if (field === 'morningStart') next.morningStart = r.pick([R0.morningStart, (mins + 1) % 1440, (mins + 30) % 1440, (mins + 1410) % 1440, r.int(0, 95) * 15]);
        else if (field === 'activeNights') next.activeNights = r.pick([[], ALL, R0.activeNights, others(now.getDay()), others((now.getDay() + 6) % 7)]);
        else if (field === 'method') next.method = r.pick(['downstairs', 'steps', 'scan'] as const);
        else next.stepGoal = r.pick([0, 50, 200, 1000]);
        if ((next.morningStart - next.bedtime + 1440) % 1440 < 30) break;
        note = `${field}=${JSON.stringify(next[field])}`;
        await commit(next);
        break;
      }
      case 'undo':
        await commit({ ...rt.getRoutine() });
        break;
      case 'nightsOff':
        await commit({ ...edited(), activeNights: r.chance(0.5) ? [] : ALL });
        break;
      case 'offOn': {
        // Every night off, then straight back on (or to an earlier bedtime): a week off and back.
        const back = { ...edited(), ...(r.chance(0.5) ? { bedtime: (mins + r.pick([2, 5, 30])) % 1440 } : {}) };
        await commit({ ...edited(), activeNights: [] });
        await open();
        if ((back.morningStart - back.bedtime + 1440) % 1440 >= 30) await commit({ ...back, activeNights: ALL });
        note = `back at ${back.bedtime}`;
        break;
      }
      case 'list': {
        const apps = r.pick([['tiktok'], ['insta'], [], ['tiktok', 'insta'], ['tiktok', 'insta', 'x'], ['x']]);
        note = apps.join(',');
        await listEdit('night', apps);
        if (dayEdit && !waitingBefore.night) startsByBedtime('bedtime-list removal', at, st.listChangeStarts('night')?.getTime());
        break;
      }
      case 'picker': {
        const apps = r.pick([['tiktok'], ['tiktok', 'insta'], ['x'], []]);
        note = apps.join(',');
        picker(apps);
        break;
      }
      case 'always': {
        const apps = r.pick([[], ['reddit'], ['reddit', 'x'], ['tiktok'], ['reddit', 'tiktok', 'yt']]);
        note = apps.join(',');
        await listEdit('always', apps);
        if (dayEdit && !waitingBefore.always) startsByBedtime('always-list removal', at, st.listChangeStarts('always')?.getTime());
        break;
      }
      case 'limit': {
        const limits = st.getLimits();
        if (!limits.length) break;
        const id = r.pick(limits).id;
        const minutes = r.pick([null, 60, 120, 5, 15]);
        note = `${id} ${minutes}`;
        const waitedBefore = !!st.getLimits().find((l) => l.id === id)?.pending;
        await limitMinutes(id, minutes);
        if (dayEdit && !waitedBefore && !refusing) startsByBedtime(`${id}'s looser limit`, at, st.getLimits().find((l) => l.id === id)?.pending?.from);
        const saved = st.getLimits().find((l) => l.id === id);
        if (saved) strictest.set(id, Math.min(strictest.get(id) ?? Infinity, saved.minutes));
        break;
      }
      case 'limitNew': {
        const id = dl.freeLimitId(st.getLimits());
        if (!id) break;
        const apps = r.pick([['fb'], ['fb', 'tiktok'], ['reddit', 'fb'], ['yt']]);
        note = `${id} ${apps.join(',')}`;
        await listEdit(id, apps);
        if (st.getLimits().some((l) => l.id === id)) strictest.set(id, 30);
        break;
      }
      case 'limitList': {
        const limits = st.getLimits();
        if (!limits.length) break;
        const { id } = r.pick(limits);
        const apps = r.pick([[], ['yt'], ['yt2'], ['fb'], ['tiktok'], ['yt', 'yt2', 'fb']]);
        note = `${id} ${apps.join(',')}`;
        await listEdit(id, apps);
        break;
      }
      case 'use': {
        // An app of a limit, used while awake.
        const limits = st.getLimits();
        if (!limits.length || at < M1 + 30 * MIN) break;
        const { id } = r.pick(limits);
        const minutes = r.pick([5, 20, 40]);
        if (device.use(id, minutes)) {
          note = `${id} ${minutes}`;
          drain();
        }
        break;
      }
      case 'emergency': {
        const use = em.emergencyUnlock(now);
        await flush();
        drain();
        note = use ? `pause ${use.pauseNight} until ${use.resumesAt ? hm(use.resumesAt) : null}` : 'none';
        if (use && (use.pauseNight || use.unlockMorning) && emergencyAt === null) emergencyAt = at;
        // Windows armed for an earlier bedtime can make "tonight" the night into M2: pausing it is by design.
        if (use?.pauseNight && use.morningKey === ls.dateKey(new Date(M2))) pausedM2 = true;
        break;
      }
      case 'pass': {
        const result = ps.spendPass(now);
        await flush();
        drain();
        note = String(result);
        if (result === null) {
          if (at < M1) failed = `pass accepted at ${hm(at)} before R0's morning ${hm(M1)} (phase ${before})`;
          else unlockedAt ??= at;
        }
        break;
      }
      case 'proof': {
        const result = lc.proveMorning(r.pick(['downstairs', 'steps'] as const), now);
        await flush();
        drain();
        note = result ? 'accepted' : 'refused';
        if (result) {
          if (at < M1) failed = `walk accepted at ${hm(at)} before R0's morning ${hm(M1)} (phase ${before})`;
          else unlockedAt ??= at;
        }
        break;
      }
      case 'scanSet': {
        const result = sc.registerScanCode({ kind: 'barcode', data: CODE, type: 'ean13' }, now);
        drain();
        note = String(result);
        if (result === null && unlockedAt === null && emergencyAt === null && !lapsed && at < B2 - MIN) {
          failed = `scan code registered at ${hm(at)} while the bedtime apps should be asleep (phase ${before})`;
        }
        break;
      }
      case 'scan': {
        const result = sc.submitScan(CODE, now);
        await flush();
        drain();
        note = result;
        if (result === 'unlocked') {
          if (at < M1) failed = `scan accepted at ${hm(at)} before R0's morning ${hm(M1)} (phase ${before})`;
          else unlockedAt ??= at;
        }
        break;
      }
      case 'nap':
      case 'napLong': {
        const list = r.pick(['night', 'block'] as const);
        const minutes = kind === 'napLong' ? r.pick([120, 240, 480]) : r.pick([15, 30, 60]);
        // The Nap tab's `blocker`. Its picks can't change while a session runs.
        if (st.getNap()) break;
        if (list === 'block') device.exports.setFamilyActivitySelectionId({ id: 'block', familyActivitySelection: token(r.pick([['tiktok', 'yt', 'reddit'], ['fb'], ['insta', 'x']])) });
        if (!st.isStoodDown() && st.hasSelection(list) && !(list === 'night' && st.isNightHeld())) {
          note = await st.startNap(list, minutes).then(
            () => `${list} ${minutes}`,
            () => 'refused',
          );
          lc.syncLock();
          drain();
        }
        break;
      }
      case 'wake':
        if (st.getNap()) {
          st.endNap();
          lc.syncLock();
          drain();
          note = 'woke';
        }
        break;
      case 'rerun': {
        const bedtime = r.pick([(mins + 2) % 1440, (mins + 10) % 1440, R0.bedtime, r.int(0, 95) * 15]);
        const morningStart = (bedtime + r.pick([60, 240, 480])) % 1440;
        note = `${bedtime}/${morningStart}`;
        await rerun(bedtime, morningStart);
        break;
      }
      case 'lapse': {
        lc.settleSubscription(false);
        drain();
        paid = false;
        lapsed = true;
        everLapsed = true;
        // Renewed a little later, as an open would find it.
        advance(Math.min(at + r.pick([1, 30, 120]) * MIN, B2 - 20 * MIN));
        paid = true;
        lc.settleSubscription(true);
        drain();
        await open();
        lapsed = false;
        note = 'and renewed';
        break;
      }
      case 'lapseLong': {
        // Ended, and renewed only by a later action (or never): Ask to Buy waits like this too.
        lc.settleSubscription(false);
        drain();
        paid = false;
        lapsed = true;
        everLapsed = true;
        if (r.chance(0.5)) pp.markPurchasePending(at);
        note = 'until renewed';
        break;
      }
      case 'renew':
        if (!paid) {
          paid = true;
          lc.settleSubscription(true);
          drain();
          note = 'renewed';
        }
        break;
      case 'longNight': {
        // A night of 12 hours or more: 16 windows, iOS's whole night budget.
        const bedtime = r.pick([R0.bedtime - 300, (mins + 2) % 1440, (mins + 60) % 1440, 19 * 60, 20 * 60].map((x) => (x + 1440) % 1440));
        const morningStart = (bedtime + r.pick([720, 780, 900])) % 1440;
        note = `${bedtime}/${morningStart}`;
        await commit({ ...edited(), bedtime, morningStart });
        break;
      }
      case 'fillLimits': {
        // Every daily limit there can be, each on its own apps.
        const made: string[] = [];
        for (let id = dl.freeLimitId(st.getLimits()); id; id = dl.freeLimitId(st.getLimits())) {
          await listEdit(id, [r.pick(['fb', 'yt', 'x', 'snap'])]);
          if (!st.getLimits().some((l) => l.id === id)) break;
          strictest.set(id, 30);
          made.push(id);
        }
        note = made.join(',');
        break;
      }
      case 'settleEdge': {
        // An open (or a save) a moment either side of the list settle's start.
        const settleAt = device.get<number>('locturne.settleAt');
        if (typeof settleAt !== 'number') break;
        const edge = settleAt + r.pick([-121, -61, -1, 0, 1, 61]) * 1000;
        if (edge <= Date.now() || edge >= B2 - 20 * MIN) break;
        advance(edge);
        note = `at ${hm(edge)}`;
        if (r.chance(0.5)) await listEdit('always', r.pick([[], ['reddit'], ['reddit', 'x']]));
        break;
      }
      case 'open':
        break;
    }
    if (r.chance(0.5)) noRefusals();
    if (kind !== 'lapse') await open();
    const refusedOpen = acceptLeft !== Infinity;
    noRefusals();
    settledOnOpen(refusing || refusedOpen);
    if (!refusing && !refusedOpen) homeAgrees();
    noteChanges();
    // Lapsed and not yet renewed: nothing stands until it is.
    if (paid && lapsed && kind !== 'lapse') lapsed = false;
    markUsedUp(Date.now());
    const armed = st.getArmedNight();
    const waiting = rt.getPendingRoutine();
    log.push(
      `${hm(at)} ${kind}${refusing ? ' (refusing)' : ''} ${note} | ${before} -> ${lc.readLock().phase}, tiktok ${asleep('tiktok') ? 'asleep' : 'awake'}, reddit ${asleep('reddit') ? 'asleep' : 'awake'}, armed ${armed ? `${armed.bedtime}/${armed.morningStart}` : 'none'}, waiting ${waiting ? `${waiting.routine.bedtime}/${waiting.routine.morningStart} nights ${waiting.routine.activeNights.join('')} from ${hm(waiting.from)}` : 'none'}, lists ${JSON.stringify(device.ids())}`,
    );
    if (DEBUG) console.log(log[log.length - 1], JSON.stringify(device.get('locturne.routine')), JSON.stringify(device.get('locturne.armedNight')), JSON.stringify(device.get('locturne.pendingLists')), JSON.stringify(device.get('locturne.limits')));
    check();
    if (!failed && iosRefused.length) failed = `iOS refused a registration: ${iosRefused[0]}`;
    if (failed) break;
  }
  if (failed) return failure(failed);

  // Renewed if still lapsed (a purchase that went through), then R0 and the lists back, before B2on.
  advance(Math.max(Date.now() + MIN, B2 - 30 * MIN));
  landedAsNoted();
  if (failed) return failure(failed);
  if (!paid) {
    paid = true;
    lc.settleSubscription(true);
    drain();
    lapsed = false;
  }
  advance(Math.max(Date.now() + MIN, B2on - 15 * MIN), () => {});
  await open();
  await commit({ ...R0 });
  await listEdit('night', NIGHT0);
  await listEdit('always', ALWAYS0);
  await open();
  // Restoring doesn't always get there (a routine still waiting, or a lapse with nothing armed):
  // then R0's next night isn't the promise, but the night the app names is (`nightAt`, as Home
  // says "Apps asleep at …"), so that's the one checked.
  const inForce = JSON.stringify(rt.getRoutine()) === JSON.stringify(R0) && !!st.getArmedNight() && !st.isStoodDown();
  if (pausedM2) {
    phase2Skipped.set('paused', (phase2Skipped.get('paused') ?? 0) + 1);
    return null;
  }
  let start = B2on;
  let end = M2;
  if (inForce) restored += 1;
  else {
    const why = JSON.stringify(rt.getRoutine()) !== JSON.stringify(R0) ? (rt.getPendingRoutine() ? 'waiting' : 'other routine') : !st.getArmedNight() ? 'unarmed' : 'stood down';
    if (!st.getArmedNight() || st.isStoodDown()) {
      phase2Skipped.set(why, (phase2Skipped.get(why) ?? 0) + 1);
      return null;
    }
    // The night the app says comes next, from where it stands now.
    const state = lc.readLock();
    if (state.phase === 'morning' || state.phase === 'off' || em.getNightPause() !== null) {
      phase2Skipped.set(`${why}, ${em.getNightPause() ? 'paused' : state.phase}`, (phase2Skipped.get(`${why}, ${em.getNightPause() ? 'paused' : state.phase}`) ?? 0) + 1);
      return null;
    }
    const night = state.phase === 'night' ? { routine: lc.routineAt(new Date()), start: new Date(), on: true } : rt.nightAt(state.nextChange);
    if (!night.on) {
      phase2Skipped.set(`${why}, night off`, (phase2Skipped.get(`${why}, night off`) ?? 0) + 1);
      return null;
    }
    start = night.start.getTime();
    // Windows still armed for other times (arming waits for the edit to apply) shield from the
    // first of them that starts in the night. BUG_SWEEP Open ("Stale windows from a routine whose
    // night doesn't overlap the new one need native work"): when they file it under another
    // evening (by their own morning start) the extension may skip it until an open re-arms them.
    const armedNow = st.getArmedNight()!;
    if (armedNow.bedtime !== night.routine.bedtime || armedNow.morningStart !== night.routine.morningStart) {
      const nightEnd = ls.nightsAround(new Date(Math.max(start, Date.now()) + MIN), rt.toLockSettings(night.routine)).latest.end;
      const evening = new Date(nightEnd.getFullYear(), nightEnd.getMonth(), nightEnd.getDate() - 1).getDay();
      const firsts = np2.planNightWindows(armedNow.bedtime, armedNow.morningStart)
        .flatMap((w) => [0, 1].map((d) => ls.wallClock(new Date(start), w.start, d).getTime()))
        .filter((t) => t >= start - 2 * MIN)
        .sort((a, b) => a - b);
      const first = firsts[0];
      const filed = first === undefined ? null : new Date(first);
      const filedEvening = filed && (filed.getHours() * 60 + filed.getMinutes() < armedNow.morningStart ? new Date(filed.getFullYear(), filed.getMonth(), filed.getDate() - 1) : filed).getDay();
      if (first === undefined || filedEvening !== evening || first >= nightEnd.getTime()) {
        phase2Skipped.set(`${why}, stale windows (Open)`, (phase2Skipped.get(`${why}, stale windows (Open)`) ?? 0) + 1);
        return null;
      }
      start = Math.max(start, first);
    }
    end = ls.nightsAround(new Date(Math.max(start, Date.now()) + MIN), rt.toLockSettings(night.routine)).latest.end.getTime();
    if (end <= start) {
      phase2Skipped.set(`${why}, empty night`, (phase2Skipped.get(`${why}, empty night`) ?? 0) + 1);
      return null;
    }
    byNightAt.set(why, (byNightAt.get(why) ?? 0) + 1);
  }
  const label = inForce ? "R0's" : "the app's next";
  log.push(`${hm(Date.now())} ${inForce ? 'R0 restored' : `checked by nightAt: ${hm(start)} to ${hm(end)}`}, lists ${JSON.stringify(device.ids())}`);
  const phase2 = () => {
    if (failed) return;
    const at = Date.now();
    if (at < start || at >= end) return;
    const awake = [...NIGHT0, ...ALWAYS0].find((a) => !asleep(a));
    if (awake) failed = `after restoring R0: ${awake} awake at ${hm(at)} (${label} bedtime ${hm(start)}, morning ${hm(end)})`;
    if (awake && DEBUG) console.log('PHASE2', JSON.stringify(device.ids()), JSON.stringify(device.get('locturne.pendingLists')), JSON.stringify(device.get('locturne.armedNight')), device.get('locturne.nightHeld'), device.get('locturne.stoodDown'), JSON.stringify(device.get('locturne.emergencyLog')), device.state.trace.slice(-12).join('\n'));
  };
  // From bed through that night and into its morning, opened at the boundaries.
  const opens = [start - MIN, start, start + 1000, start + MIN, start + r.int(5, 200) * MIN, end - MIN, end - 1000, end, end + MIN, end + 2 * MIN, end + 20 * MIN]
    .filter((t) => t > Date.now())
    .sort((a, b) => a - b);
  for (const t of opens) {
    advance(t, phase2);
    if (failed) break;
    if (r.chance(0.7)) {
      await open();
      phase2();
      // The honest direction too: once Home says they're asleep, they are, and the other way round.
      if (t >= start) homeAgrees();
    }
    // A walk before morning start is refused.
    if (t >= start && t < end && r.chance(0.3) && lc.proveMorning('downstairs', new Date(t))) {
      failed = `after restoring R0: walk accepted at ${hm(t)} before ${label} morning ${hm(end)}`;
    }
    if (failed) break;
  }
  if (!failed) advance(end + 40 * MIN, phase2);
  if (!failed && iosRefused.length) failed = `iOS refused a registration: ${iosRefused[0]}`;
  return failed ? failure(failed) : null;
}

let restored = 0;
/** Runs whose phase 2 checked the night the app named instead of R0's (`nightAt`), by why. */
const byNightAt = new Map<string, number>();
const phase2Skipped = new Map<string, number>();
/** How often each honest check had something to judge. */
const honest = { landed: 0, byBedtime: 0, home: 0 };

test(`from-bed bypass fuzz: ${SEEDS} seeded runs from seed ${SEED0}`, async () => {
  const fails: string[] = [];
  for (let seed = SEED0; seed < SEED0 + SEEDS; seed++) {
    const why = await run(seed);
    if (why) fails.push(why);
    if (DEBUG && why) console.log(why);
  }
  mock.timers.reset();
  device.reset();
  if (process.env.BYPASS_FUZZ_STATS) {
    console.log(`restored ${restored}, by nightAt ${JSON.stringify([...byNightAt])}, phase 2 skipped ${JSON.stringify([...phase2Skipped])}`);
    console.log(`honest checks: ${JSON.stringify(honest)}`);
  }
  if (process.env.BYPASS_FUZZ_LIST) for (const f of fails) console.log(f.split('\n')[0]);
  assert.equal(fails.length, 0, `${fails.length} of ${SEEDS} runs broke the promise. First:\n${fails.slice(0, 3).join('\n\n')}`);
});
