/// <reference types="node" />

/**
 * A from-bed bypass fuzzer against the simulated phone (sim-device.ts), with an oracle built
 * only from the product promise, not from the app's own rules (security audit, round 51).
 *
 * Each run sets up a routine R0 (23:00, 00:30 or 22:00 to the morning, or a night shift with
 * BYPASS_FUZZ_SHIFT=1), lets its first night start, and then does everything an impatient
 * person could from bed or the next day: routine edits (whole or one field, Undo, every night
 * off), list removals (Apps tab and onboarding's picker), always-list removals, a looser or
 * removed daily limit, Block now, onboarding again, lapses and renewals, emergencies, passes
 * and proofs. Before R0's next bedtime, R0 and the lists are restored; then the phone runs
 * with Locturne closed through that night. The promise:
 *
 * - the bedtime apps stay asleep until a real proof (a walk or a pass from R0's morning start
 *   on) or an emergency unlock;
 * - the always app, and a used-up limit's app, stay asleep until R0's next bedtime (the limit
 *   until midnight at most), unless a lapse stood everything down;
 * - after restoring R0, its next night holds with the app closed.
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
const np = await import('../features/onboarding/night-picker.ts');
const { armTonight } = await import('./arm.ts');

type Routine = import('./routine.ts').Routine;
type StandingList = import('./screen-time.ts').StandingList;

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

const day = (d: number, h: number, m = 0) => new Date(2026, 9, d, h, m).getTime();
const hm = (t: number) => new Date(t).toString().slice(0, 21);
const asleep = (app: string) => device.state.shielded.has(app);

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
  for (const e of device.dueEvents(Date.now(), to)) {
    mock.timers.setTime(e.at);
    device.fire(e.activity, e.callback);
    drain();
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
  await armTonight();
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
  paid = true;
  mock.timers.enable({ apis: ['Date'], now: start });
  device.exports.setFamilyActivitySelectionId({ id: 'night', familyActivitySelection: token(['tiktok', 'insta']) });
  device.exports.setFamilyActivitySelectionId({ id: 'always', familyActivitySelection: token(['reddit']) });
  device.exports.setFamilyActivitySelectionId({ id: 'limit-0', familyActivitySelection: token(['yt']) });
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
  lc.settleSubscription(true);
  drain();
  const now = new Date();
  rt.saveRoutine({ ...edited(), bedtime, morningStart }, now, lc.inPendingFirstNight(now));
  lc.syncLock();
  await armTonight().catch(() => {});
  await flush();
  drain();
}

/** Apple's picker on a standing list's draft, then Done (`pickedList` in apps-list.tsx). */
function listEdit(list: StandingList, apps: string[]) {
  const draft = st.beginListEdit(list);
  const ids = { ...device.ids() };
  if (apps.length) ids[draft] = token(apps);
  else delete ids[draft];
  device.exports.userDefaultsSet('familyActivitySelectionIds', ids);
  st.finishListEdit(list, lc.looserEditsStartAt(new Date(), list));
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
async function limitMinutes(minutes: number | null) {
  const limits = st.getLimits();
  if (!limits.length) return;
  const { id } = limits[0];
  const now = new Date();
  const next = dl.editLimit(limits, id, minutes, lc.looserEditsStartAt(now), now);
  const after = next.find((l) => l.id === id);
  const before = limits.find((l) => l.id === id);
  if (after && after.minutes !== before?.minutes) await st.armLimit(after);
  st.saveLimits(next);
  drain();
}

/** Runs one seed and returns why it failed, or null. */
async function run(seed: number): Promise<string | null> {
  const r = prng(seed);
  const R0: Routine = { ...rt.DEFAULT_ROUTINE, ...r.pick(R0S), activeNights: ALL };
  // Some runs start with an emergency unlock and no lapses: the pause, then everything else.
  const forceEmergency = r.chance(0.15);
  await setup(day(4, 12), R0);
  const S0 = rt.toLockSettings(R0);
  // R0's first night starts at B1 and runs into M1; its next bedtime is B2, into M2.
  const B1 = ls.settingsTakeEffectAt(new Date(day(4, 12)), S0).getTime();
  const M1 = ls.nightsAround(new Date(B1 + MIN), S0).latest.end.getTime();
  const B2 = ls.nightsAround(new Date(B1 + MIN), S0).next.start.getTime();
  const M2 = ls.nightsAround(new Date(B2 + MIN), S0).latest.end.getTime();
  const t0 = B1 + Math.floor(r.next() * ((M1 - B1) / MIN - 20)) * MIN + 5 * MIN;
  runTo(t0);
  if (r.chance(0.5)) await open();
  const log: string[] = [`R0 ${R0.bedtime}/${R0.morningStart}, first night from ${hm(B1)}`];
  const failure = (why: string) => `seed ${seed}: ${why}\n   ${log.join('\n   ')}`;
  if (!asleep('tiktok')) return failure('first night not held');

  let unlockedAt: number | null = null;
  let emergencyAt: number | null = null;
  let usedUpAt: number | null = null;
  let lapsed = false;
  let everLapsed = false;
  let failed: string | null = null;

  const check = (phase2: boolean) => {
    if (failed) return;
    const at = Date.now();
    if (phase2) {
      if (!asleep('tiktok')) failed = `after restoring R0: bedtime app awake at ${hm(at)} (R0's bedtime ${hm(B2)})`;
      return;
    }
    if (at >= B2 - MIN) return;
    if (unlockedAt === null && emergencyAt === null && (!asleep('tiktok') || !asleep('insta'))) {
      failed = `bedtime app awake at ${hm(at)} before any proof, pass or emergency`;
    } else if (!lapsed && !asleep('reddit')) {
      failed = `always app awake at ${hm(at)}`;
    } else if (!everLapsed && usedUpAt !== null && !asleep('yt') && at < new Date(usedUpAt).setHours(24, 0, 0, 0) - MIN) {
      failed = `used-up limit's app awake at ${hm(at)}`;
    }
  };
  /** The phone runs closed to `to`, checked every five minutes. Never backwards. */
  const advance = (to: number, phase2 = false) => {
    if (to <= Date.now()) return;
    for (let u = Date.now() + 5 * MIN; u < to && !failed; u += 5 * MIN) {
      runTo(u);
      check(phase2);
    }
    runTo(to);
    check(phase2);
  };

  if (forceEmergency) {
    const use = em.emergencyUnlock(new Date());
    await flush();
    drain();
    if (use) emergencyAt = Date.now();
    await open();
    log.push(`${hm(Date.now())} emergency until ${use?.resumesAt ? hm(use.resumesAt) : null}`);
  }

  const count = r.int(3, 14);
  const times = Array.from({ length: count }, () => t0 + Math.floor(r.next() * ((B2 - 20 * MIN - t0) / MIN)) * MIN).sort((a, b) => a - b);
  let usedLimit = false;
  for (const time of times) {
    // A lapse runs the clock on to its renewal, past the next action's time.
    const at = Math.max(time, Date.now());
    advance(at);
    if (failed) break;
    // Use up the limit once the day's under way.
    if (!usedLimit && at > M1 + 60 * MIN) {
      usedLimit = true;
      if (device.use('limit-0', 20)) {
        drain();
        if (asleep('yt')) usedUpAt = at;
      }
    }
    const now = new Date(at);
    const mins = now.getHours() * 60 + now.getMinutes();
    const others = (d: number) => ALL.filter((x) => x !== d);
    const kinds = ['field', 'field', 'field', 'field', 'edit', 'edit', 'undo', 'undo', 'nightsOff', 'list', 'picker', 'always', 'limit', 'emergency', 'pass', 'proof', 'proof', 'nap', 'wake', 'rerun', 'lapse', 'open', 'open'] as const;
    let kind: (typeof kinds)[number] = r.pick(kinds);
    if (forceEmergency && kind === 'lapse') kind = 'open';
    const before = lc.readLock(now).phase;
    let note = '';
    switch (kind) {
      case 'edit': {
        const bedtime = r.pick([mins + 5, mins + 20, mins + 60, r.int(0, 95) * 15, R0.bedtime - 60, R0.bedtime + 60].map((x) => (x + 1440) % 1440));
        const morningStart = r.pick([R0.morningStart, bedtime + 30, bedtime + 120, r.int(0, 95) * 15, R0.morningStart - 60, mins + 10].map((x) => (x + 1440) % 1440));
        if ((morningStart - bedtime + 1440) % 1440 < 30) break;
        const activeNights = r.pick([ALL, [], [now.getDay()], others(now.getDay()), others((now.getDay() + 6) % 7)]);
        note = `${bedtime}/${morningStart} nights ${activeNights.join('')}`;
        await commit({ ...edited(), bedtime, morningStart, activeNights });
        break;
      }
      case 'field': {
        const field = r.pick(['bedtime', 'bedtime', 'morningStart', 'activeNights', 'activeNights'] as const);
        const next = { ...edited() };
        if (field === 'bedtime') next.bedtime = r.pick([(mins + 5) % 1440, (mins + 20) % 1440, (mins + 1410) % 1440, R0.bedtime, r.int(0, 95) * 15]);
        else if (field === 'morningStart') next.morningStart = r.pick([R0.morningStart, (mins + 30) % 1440, (mins + 1410) % 1440, r.int(0, 95) * 15]);
        else next.activeNights = r.pick([[], ALL, others(now.getDay()), others((now.getDay() + 6) % 7)]);
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
      case 'list': {
        const apps = r.pick([['tiktok'], ['tiktok', 'insta'], ['tiktok', 'insta', 'x']]);
        note = apps.join(',');
        listEdit('night', apps);
        break;
      }
      case 'picker': {
        const apps = r.pick([['tiktok'], ['tiktok', 'insta']]);
        note = apps.join(',');
        picker(apps);
        break;
      }
      case 'always': {
        const apps = r.pick([[], ['reddit'], ['reddit', 'x']]);
        note = apps.join(',');
        listEdit('always', apps);
        break;
      }
      case 'limit': {
        const minutes = r.pick([null, 60, 120, 5]);
        note = String(minutes);
        await limitMinutes(minutes);
        break;
      }
      case 'emergency': {
        const use = em.emergencyUnlock(now);
        await flush();
        drain();
        note = use ? `pause ${use.pauseNight} until ${use.resumesAt ? hm(use.resumesAt) : null}` : 'none';
        if (use && (use.pauseNight || use.unlockMorning) && emergencyAt === null) emergencyAt = at;
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
        const result = lc.proveMorning('downstairs', now);
        await flush();
        drain();
        note = result ? 'accepted' : 'refused';
        if (result) {
          if (at < M1) failed = `walk accepted at ${hm(at)} before R0's morning ${hm(M1)} (phase ${before})`;
          else unlockedAt ??= at;
        }
        break;
      }
      case 'nap': {
        const list = r.pick(['night', 'block'] as const);
        if (list === 'block') device.exports.setFamilyActivitySelectionId({ id: 'block', familyActivitySelection: token(['tiktok', 'yt', 'reddit']) });
        const minutes = r.pick([15, 30, 60]);
        if (!st.getNap() && !st.isStoodDown() && st.hasSelection(list) && !(list === 'night' && st.isNightHeld())) {
          note = await st.startNap(list, minutes).then(
            () => list,
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
        const bedtime = r.pick([(mins + 10) % 1440, R0.bedtime, r.int(0, 95) * 15]);
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
      case 'open':
        break;
    }
    if (kind !== 'lapse') await open();
    const armed = st.getArmedNight();
    const waiting = rt.getPendingRoutine();
    log.push(
      `${hm(at)} ${kind} ${note} | ${before} -> ${lc.readLock().phase}, tiktok ${asleep('tiktok') ? 'asleep' : 'awake'}, armed ${armed ? `${armed.bedtime}/${armed.morningStart}` : 'none'}, waiting ${waiting ? `${waiting.routine.bedtime}/${waiting.routine.morningStart} nights ${waiting.routine.activeNights.join('')} from ${hm(waiting.from)}` : 'none'}`,
    );
    if (DEBUG) console.log(log[log.length - 1], JSON.stringify(device.get('locturne.routine')), JSON.stringify(device.get('locturne.armedNight')), device.get('locturne.subscriptionEnded'), device.get('locturne.subscriptionEndedMorning'), device.get('locturne.freeMorning'), JSON.stringify(device.get('locturne.pendingLists')));
    check(false);
    if (failed) break;
  }
  if (failed) return failure(failed);

  // R0 and the lists back, in the day before B2.
  advance(Math.max(Date.now() + MIN, B2 - 15 * MIN));
  if (failed) return failure(failed);
  await open();
  await commit({ ...R0 });
  listEdit('night', ['tiktok', 'insta']);
  // Restoring doesn't always get there (a lapse that stood down, a routine still waiting):
  // then there's no promise about R0's next night to check.
  if (JSON.stringify(rt.getRoutine()) !== JSON.stringify(R0) || !st.getArmedNight() || st.isStoodDown()) return null;
  log.push(`${hm(Date.now())} R0 restored`);
  // The app closed from R0's next bedtime through its morning.
  runTo(B2 + 2 * MIN);
  advance(M2 - 2 * MIN, true);
  return failed ? failure(failed) : null;
}

test(`from-bed bypass fuzz: ${SEEDS} seeded runs from seed ${SEED0}`, async () => {
  const fails: string[] = [];
  for (let seed = SEED0; seed < SEED0 + SEEDS; seed++) {
    const why = await run(seed);
    if (why) fails.push(why);
    if (DEBUG && why) console.log(why);
  }
  mock.timers.reset();
  device.reset();
  assert.equal(fails.length, 0, `${fails.length} of ${SEEDS} runs broke the promise. First:\n${fails.slice(0, 3).join('\n\n')}`);
});
