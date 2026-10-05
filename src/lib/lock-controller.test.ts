/// <reference types="node" />

/**
 * The controller against a fake Screen Time wrapper: which shields it raises and lowers, and
 * which proofs count. Needs `--experimental-test-module-mocks` (set in the npm test script).
 */
import assert from 'node:assert/strict';
import { beforeEach, describe, mock, test } from 'node:test';

import type { ArmedNight } from './screen-time.ts';

const store = new Map<string, unknown>();
let calls: string[] = [];
let nightHeld = false;
let armed: ArmedNight | null = null;
let live = 0;
let nightPicks = 3;
let shieldTexts: { title: string; tap: boolean }[] = [];
let morningSubtitles: string[] = [];
let nightSubtitles: string[] = [];
let napTidies = 0;
let stoodDown = false;
/** While set, `armNight` waits on it, like iOS registering windows over the bridge. */
let armGate: Promise<void> | null = null;
/** While on, each `armNight` waits for its own release, in call order. */
let gating = false;
let gates: (() => void)[] = [];
/** Windows iOS fails to report back after arming (it keeps reporting a different count). */
let lostWindows = 0;

mock.module(new URL('./screen-time.ts', import.meta.url).href, {
  namedExports: {
    sharedGet: (key: string) => store.get(key),
    sharedSet: (key: string, value: unknown) => store.set(key, value),
    sharedRemove: (key: string) => store.delete(key),
    isStoodDown: () => stoodDown,
    standDown: () => {
      calls.push('standDown');
      stoodDown = true;
      armed = null;
      live = 0;
    },
    standUp: async () => {
      calls.push('standUp');
      stoodDown = false;
    },
    isScreenTimeAvailable: () => true,
    getAccess: () => 'approved',
    isNightHeld: () => nightHeld,
    // As screen-time.ts: armed with a subscription, or bedtime apps asleep under one.
    nightLockArmed: () => nightHeld || (armed !== null && !stoodDown),
    selectionSize: (id: string) => (id === 'night' ? nightPicks : 0),
    sleepApps: (id: string) => {
      calls.push(`sleep:${id}`);
      if (id === 'night') nightHeld = true;
    },
    wakeApps: (id: string) => {
      calls.push(`wake:${id}`);
      if (id === 'night') nightHeld = false;
    },
    reapplyStandingBlocks: () => calls.push('reapply'),
    getArmedNight: () => armed,
    armedWindowNames: () => Array.from({ length: live }, (_, i) => `night-${i}`),
    armNight: async (windows: unknown[], list: string, times: { bedtime: number; morningStart: number }) => {
      calls.push(`arm:${list}:${windows.length}`);
      if (armGate) await armGate;
      if (gating) await new Promise<void>((r) => gates.push(r));
      live = windows.length - lostWindows;
      const armedAt = new Date(clock).toISOString();
      armed = { ...times, windows: windows.length, armedAt, since: armed ? (armed.since ?? armed.armedAt) : armedAt };
    },
    armedSince: (a: ArmedNight) => new Date(a.since ?? a.armedAt),
    peekNap: () => null,
    getNap: () => {
      napTidies += 1;
      return null;
    },
    getLimits: () => [],
    saveLimits: () => {},
    delayListChanges: () => {},
    judgeListAwakeWith: () => {},
    scheduleListSettle: () => {},
    settleListChanges: () => [],
    limitUsedUpToday: () => false,
    moveNightPause: () => {},
    setShieldText: (text: { title: string }, tap: unknown) => shieldTexts.push({ title: text.title, tap: tap !== null }),
    setNightShieldText: (text: { subtitle: string }) => nightSubtitles.push(text.subtitle),
    setMorningShieldText: (text: { subtitle: string }) => morningSubtitles.push(text.subtitle),
    setAlwaysShieldText: () => {},
    setLimitShieldText: () => {},
    disarmNight: () => {
      calls.push('disarm');
      live = 0;
      armed = null;
    },
  },
});

/** The controller reads the clock only through `now`, except `armedAt` in the fake. */
let clock = 0;

const { syncLock, readLock, proveMorning, armRoutine, armRetryAt, onArmed, settleSubscription, subscriptionEnded, inPendingFirstNight } = await import(
  './lock-controller.ts'
);
const { saveRoutine, getRoutine, getPendingRoutine, DEFAULT_ROUTINE } = await import('./routine.ts');
const { recordProof, getProofs } = await import('./morning-proof.ts');

/** Thursday 2026-10-01 at hh:mm, local time. Default routine: 23:00 to 07:00, every night. */
const at = (hh: number, mm = 0, day = 1) => new Date(2026, 9, day, hh, mm);

beforeEach(() => {
  store.clear();
  calls = [];
  shieldTexts = [];
  morningSubtitles = [];
  nightSubtitles = [];
  stoodDown = false;
  armGate = null;
  gating = false;
  gates = [];
  lostWindows = 0;
  nightHeld = false;
  armed = null;
  live = 0;
  nightPicks = 3;
  clock = at(12, 0, 0).getTime();
  saveRoutine(DEFAULT_ROUTINE, at(12, 0, 0)); // onboarding: applies at once
});

/** Armed the afternoon before, like a real install. */
async function armYesterday() {
  clock = at(14, 0, 0).getTime();
  await armRoutine(at(14, 0, 0));
  calls = [];
}

describe('the morning gate', () => {
  test('the night stays held into the morning: nothing wakes at morning start', async () => {
    await armYesterday();
    nightHeld = true; // the 23:00 window fired
    const state = syncLock(at(7, 30));
    assert.equal(state.phase, 'morning');
    assert.ok(!calls.includes('wake:night'));
    assert.ok(nightHeld);
  });

  test('a proof wakes the bedtime apps and re-shields the standing rules', async () => {
    await armYesterday();
    nightHeld = true;
    const state = proveMorning('steps', at(7, 30));
    assert.equal(state?.phase, 'day');
    assert.deepEqual(calls, ['wake:night']); // wakeApps re-applies the standing rules itself
    assert.equal(nightHeld, false);
  });

  test('bedtime wins: no proof at night, and a night-time proof never unlocks the morning', async () => {
    await armYesterday();
    nightHeld = true;
    assert.equal(proveMorning('downstairs', at(23, 30)), null);
    // Even recorded directly, it doesn't count.
    const key = readLock(at(23, 30)).morningKey;
    assert.equal(recordProof({ morningKey: key, kind: 'steps', at: at(23, 30).getTime() }), false);
    assert.equal(syncLock(at(7, 30, 2)).phase, 'morning');
    assert.ok(nightHeld);
  });

  test('a morning proof made in time counts once; later ones are ignored', async () => {
    await armYesterday();
    assert.ok(proveMorning('downstairs', at(7, 10)));
    assert.equal(proveMorning('steps', at(7, 20)), null);
    assert.equal(getProofs().length, 1);
    assert.equal(getProofs()[0].kind, 'downstairs');
  });

  test('a saved proof keeps counting when a later morning start re-reads its morning', async () => {
    await armYesterday();
    nightHeld = true;
    assert.equal(proveMorning('downstairs', at(7, 30))?.phase, 'day');
    // Saved in the day: bedtime 01:00, mornings from 08:00. It takes over at 23:00, and the
    // morning it reads 23:00 to 01:00 as is this one, now starting at 08:00, after the walk.
    saveRoutine({ ...DEFAULT_ROUTINE, bedtime: 60, morningStart: 8 * 60 }, at(9));
    // Armed at once (no window of the edit's falls before 23:00). Windows left at 23:00 would
    // shield from 23:00 instead, and the lock would follow them (`asArmed`).
    clock = at(9).getTime();
    assert.equal(await armRoutine(at(9)), 'armed');
    calls = [];
    assert.equal(syncLock(at(23, 30)).phase, 'day', 'the walk at 07:30 still proves it');
    assert.ok(!calls.includes('sleep:night'));
    assert.equal(nightHeld, false);
    assert.equal(proveMorning('steps', at(23, 40)), null, 'already unlocked: nothing more to record');
    assert.equal(getProofs().length, 1);
  });

  test('a proof is judged when it is saved: one made before morning start is never stored', async () => {
    await armYesterday();
    const key = readLock(at(7, 30)).morningKey;
    assert.equal(recordProof({ morningKey: key, kind: 'steps', at: at(6, 59).getTime() }), false);
    assert.equal(getProofs().length, 0);
    assert.ok(recordProof({ morningKey: key, kind: 'steps', at: at(7, 0).getTime() }));
  });

  test('a pass covers the morning even if used the night before', async () => {
    await armYesterday();
    nightHeld = true;
    const key = readLock(at(23, 30)).morningKey;
    assert.ok(recordProof({ morningKey: key, kind: 'pass', at: at(23, 30).getTime() }));
    assert.equal(syncLock(at(1, 0, 2)).phase, 'night'); // still bedtime
    assert.equal(syncLock(at(7, 0, 2)).phase, 'day');
    assert.equal(nightHeld, false);
  });

  test('yesterday’s proof does not unlock today', async () => {
    await armYesterday();
    proveMorning('steps', at(7, 30));
    nightHeld = true; // tonight's windows
    assert.equal(syncLock(at(7, 30, 2)).phase, 'morning');
  });
});

describe('install day and mornings nobody armed', () => {
  test('finishing onboarding in the afternoon: today reads as day, not morning', async () => {
    clock = at(15, 0).getTime();
    await armRoutine(at(15, 0));
    assert.equal(readLock(at(15, 30)).phase, 'day');
    // Tonight is armed in time, so tomorrow morning is locked.
    assert.equal(readLock(at(7, 30, 2)).phase, 'morning');
  });

  test('nothing armed (before purchase): the morning reads as day', () => {
    assert.equal(readLock(at(8, 0)).phase, 'day');
  });

  test('armed after bedtime: the coming morning is locked', async () => {
    clock = at(23, 30).getTime();
    await armRoutine(at(23, 30));
    assert.equal(readLock(at(7, 30, 2)).phase, 'morning');
  });

  test('a re-arm in the morning (a routine edit) does not free that morning', async () => {
    await armYesterday();
    saveRoutine({ ...DEFAULT_ROUTINE, bedtime: 22 * 60 }, at(7, 20));
    clock = at(7, 20).getTime();
    await armRoutine(at(7, 20));
    assert.equal(readLock(at(7, 30)).phase, 'morning');
  });
});

describe('the shield', () => {
  test('the morning shield sends the open-Locturne notification when tapped; the night one stays quiet', async () => {
    await armYesterday();
    nightHeld = true;
    syncLock(at(7, 30));
    assert.deepEqual(shieldTexts.at(-1), { title: 'No.', tap: true });
    syncLock(at(23, 30));
    assert.deepEqual(shieldTexts.at(-1), { title: 'Shh. I’m sleeping. So are they.', tap: false });
  });

  test('a scan morning with no code yet asks for steps, like the wake screen; a saved code switches it', async () => {
    const { registerScanCode } = await import('./scan.ts');
    saveRoutine({ ...DEFAULT_ROUTINE, method: 'scan' }, at(12, 0, 0));
    syncLock(at(15));
    assert.match(morningSubtitles.at(-1) ?? '', /steps/);
    assert.equal(registerScanCode({ kind: 'qr', data: 'LOCTURNE-abcd', type: 'qr' }, at(15)), null);
    assert.match(morningSubtitles.at(-1) ?? '', /scan your code/);
  });
});

describe('the words for a waiting edit', () => {
  test('an edit made in bed keeps tonight\'s shields on the routine in force', async () => {
    await armYesterday();
    nightHeld = true;
    saveRoutine({ ...DEFAULT_ROUTINE, morningStart: 6 * 60 + 30, method: 'steps' }, at(1, 0, 1)); // waits for tonight
    syncLock(at(1, 0, 1));
    assert.match(nightSubtitles.at(-1) ?? '', /after 7/);
    // From morning start on (here unproven), the next window is the edit's.
    syncLock(at(7, 30, 1));
    assert.match(nightSubtitles.at(-1) ?? '', /after 6:30/);
  });

  test('the morning words stay this morning\'s until it is unlocked', async () => {
    await armYesterday();
    nightHeld = true;
    saveRoutine({ ...DEFAULT_ROUTINE, method: 'steps' }, at(1, 0, 1)); // waits for tonight
    // 07:00, unproven: the last window's end can copy these words up to 30 minutes later.
    syncLock(at(7, 0, 1));
    assert.match(morningSubtitles.at(-1) ?? '', /stairs/);
    // Proven: the next morning's are the edit's.
    proveMorning('downstairs', at(7, 10, 1));
    assert.match(morningSubtitles.at(-1) ?? '', /steps/);
  });

  test('a morning nobody proves gets the edit\'s words once the last window can no longer copy them', async () => {
    await armYesterday();
    nightHeld = true;
    saveRoutine({ ...DEFAULT_ROUTINE, method: 'steps' }, at(7, 20)); // waits for tonight
    syncLock(at(7, 20));
    assert.match(morningSubtitles.at(-1) ?? '', /stairs/);
    // Never proven, so the morning lasts until bedtime. With the app closed overnight,
    // tomorrow's 07:00 copies whatever is written now, and tomorrow runs on the edit.
    assert.equal(syncLock(at(15)).phase, 'morning');
    assert.match(morningSubtitles.at(-1) ?? '', /steps/);
  });
});

describe('an earlier bedtime saved in the day (#137)', () => {
  // 23:00 to 07:00 armed; at 14:00 bedtime moves to 21:30. The edit waits for 23:00, but its
  // windows are armed at once (an earlier bedtime only tightens: wake/arming.ts).
  async function earlier(inForce: Partial<typeof DEFAULT_ROUTINE> = {}) {
    saveRoutine({ ...DEFAULT_ROUTINE, ...inForce }, at(12, 0, 0)); // nothing armed yet: applies at once
    await armYesterday();
    recordProof({ morningKey: '2026-10-01', kind: 'steps', at: at(7, 30).getTime() });
    saveRoutine({ ...DEFAULT_ROUTINE, bedtime: 21 * 60 + 30 }, at(14));
    clock = at(14).getTime();
    await armRoutine(at(14));
    calls = [];
  }

  test('an open in its first night keeps the apps the 21:30 window put to sleep asleep', async () => {
    await earlier();
    assert.equal(armed?.bedtime, 21 * 60 + 30);
    nightHeld = true; // the 21:30 window fired
    const state = syncLock(at(21, 40));
    assert.equal(state.phase, 'night');
    assert.equal(state.morningKey, '2026-10-02');
    assert.ok(!calls.includes('wake:night'));
    assert.ok(nightHeld);
  });

  test('a missed 21:30 window is put back on open', async () => {
    await earlier();
    syncLock(at(21, 40));
    assert.ok(calls.includes('sleep:night'));
  });

  test('not on an evening the routine in force has off: iOS skips those early windows', async () => {
    // Thursday evening is off in the routine in force; the edit turns it on. Arming waits for
    // the edit, so nothing holds 21:30 and the app mustn't claim it does.
    await earlier({ activeNights: [0, 1, 2, 3, 5, 6] });
    assert.equal(armed?.bedtime, 23 * 60);
    assert.equal(readLock(at(21, 40)).phase, 'day');
    assert.equal(+readLock(at(21)).nextChange, +at(23));
    assert.equal(readLock(at(23, 30)).phase, 'night', 'the edit applies at 23:00 as usual');
  });

  test('the open app re-syncs at 21:30, not the old bedtime', async () => {
    // `useLock` sets its timer for `nextChange`.
    await earlier();
    assert.equal(+readLock(at(21)).nextChange, +at(21, 30));
  });

  test('switching tonight off as well, in a second save, puts the routine in force\'s windows back', async () => {
    await earlier();
    assert.equal(armed?.bedtime, 21 * 60 + 30);
    saveRoutine({ ...DEFAULT_ROUTINE, bedtime: 21 * 60 + 30, activeNights: [0, 1, 2, 3, 5, 6] }, at(14, 1));
    clock = at(14, 1).getTime();
    await armRoutine(at(14, 1));
    assert.equal(armed?.bedtime, 23 * 60, 'the 21:30 windows would shield a night that is off');
    // Nothing holds 21:30 any more, so it's the routine in force's day until 23:00, when the
    // edit applies and tonight is off.
    assert.equal(readLock(at(21, 40)).phase, 'day');
    assert.equal(readLock(at(23, 30)).phase, 'off');
  });

  test('a later bedtime saved from bed in that night waits for the next bedtime: tonight stays asleep', async () => {
    await earlier();
    nightHeld = true; // the 21:30 window fired
    assert.equal(syncLock(at(21, 40)).phase, 'night');
    calls = [];
    // The Routine tab passes `inPendingFirstNight`: the 21:30 edit governs tonight, so it's in
    // force now and the new one waits for its next bedtime, tomorrow at 21:30.
    clock = at(21, 40).getTime();
    assert.ok(inPendingFirstNight(at(21, 40)));
    const from = saveRoutine({ ...DEFAULT_ROUTINE, bedtime: 23 * 60 + 30 }, at(21, 40), inPendingFirstNight(at(21, 40)));
    assert.equal(+from, +at(21, 30, 2));
    assert.equal(getRoutine(at(21, 40)).bedtime, 21 * 60 + 30);
    assert.equal(getPendingRoutine(at(21, 40))?.routine.bedtime, 23 * 60 + 30);
    const state = syncLock(at(21, 40));
    assert.equal(state.phase, 'night');
    assert.equal(state.morningKey, '2026-10-02');
    assert.ok(!calls.includes('wake:night'), `woke the bedtime apps from bed: ${calls.join(',')}`);
    // The windows move to tomorrow's 23:30 (as for any edit from bed); tonight stays held.
    await armRoutine(at(21, 40));
    assert.ok(nightHeld);
    assert.ok(!calls.includes('wake:night'), `woke after arming: ${calls.join(',')}`);
    assert.equal(readLock(at(23, 10)).phase, 'night');
    assert.equal(readLock(at(6, 50, 2)).phase, 'night', 'the morning still starts at 07:00');
  });

  test('a sync while iOS registers an earlier bedtime saved inside its night doesn\'t wake it', async () => {
    await armYesterday();
    recordProof({ morningKey: '2026-10-01', kind: 'steps', at: at(7, 30).getTime() });
    clock = at(21, 45).getTime();
    saveRoutine({ ...DEFAULT_ROUTINE, bedtime: 21 * 60 + 30 }, at(21, 45));
    let release = () => {};
    armGate = new Promise((r) => (release = r));
    const run = armRoutine(at(21, 45));
    nightHeld = true; // iOS ran the 21:30 window's start as soon as it was registered
    assert.equal(syncLock(at(21, 45)).phase, 'night', 'a foreground in the registration gap');
    const woke = calls.includes('wake:night');
    release();
    armGate = null;
    await run;
    assert.ok(!woke, `woke mid-registration: ${calls.join(',')}`);
    assert.equal(armed?.bedtime, 21 * 60 + 30);
    assert.ok(nightHeld);
  });
});

describe('arming one at a time', () => {
  test('an edit made while iOS is still arming the last one is armed too', async () => {
    await armYesterday();
    calls = [];
    let release = () => {};
    armGate = new Promise((r) => (release = r));
    // The Routine tab commits on every wheel change: the hour, then the minutes.
    saveRoutine({ ...DEFAULT_ROUTINE, bedtime: 22 * 60 }, at(12));
    const first = armRoutine(at(12));
    saveRoutine({ ...DEFAULT_ROUTINE, bedtime: 22 * 60 + 30 }, at(12));
    const second = armRoutine(at(12));
    release();
    armGate = null;
    await Promise.all([first, second]);
    assert.equal(armed?.bedtime, 22 * 60 + 30);
  });

  test('five quick edits, each landing while iOS registers the last: the last one is armed', async () => {
    // A run used to re-plan at most 3 times, so an edit landing during the third re-run was
    // dropped and iOS kept the one before it until the next sync.
    await armYesterday();
    gating = true;
    const flush = () => new Promise((r) => setImmediate(r));
    const runs: Promise<unknown>[] = [];
    for (const minutes of [0, 10, 20, 30, 40]) {
      // The Routine tab's commit: save, sync, arm.
      saveRoutine({ ...DEFAULT_ROUTINE, bedtime: 22 * 60 + minutes }, at(12));
      syncLock(at(12));
      runs.push(armRoutine(at(12)));
      await flush();
      if (minutes > 0) {
        gates.shift()?.();
        await flush();
        await flush();
      }
    }
    while (gates.length) {
      gates.shift()!();
      await flush();
    }
    await Promise.all(runs);
    assert.equal(armed?.bedtime, 22 * 60 + 40);
  });

  test('ends when iOS keeps reporting a different window count for the same times', async () => {
    lostWindows = 1;
    assert.equal(await armRoutine(at(14)), 'armed');
    // The sync inside the arm asks again; the same times aren't registered twice.
    assert.equal(calls.filter((c) => c.startsWith('arm:')).length, 1);
  });

  test('tells listeners (the notification plan) when it hands iOS new windows', async () => {
    let told = 0;
    const stop = onArmed(() => (told += 1));
    await armRoutine(at(14));
    assert.equal(told, 1);
    await armRoutine(at(15)); // kept: nothing changed
    assert.equal(told, 1);
    stop();
  });
});

describe('an earlier bedtime saved after the walk, while arming waits (deferred)', () => {
  // 23:00 to 07:00 armed. At 07:05, after the walk, bedtime moves to 22:00 and the morning to
  // 08:00. A 07:15 window would shield a phantom night, so arming waits for 08:00, and until a
  // sync after it iOS keeps the 23:00 windows.
  async function deferred() {
    await armYesterday();
    nightHeld = true;
    proveMorning('steps', at(7, 2));
    saveRoutine({ ...DEFAULT_ROUTINE, bedtime: 22 * 60, morningStart: 8 * 60 }, at(7, 5));
    clock = at(7, 5).getTime();
    assert.equal(await armRoutine(at(7, 5)), 'deferred');
    calls = [];
  }

  test('nothing holds 22:00 while iOS still has 23:00: the open app says day and sleeps nothing', async () => {
    await deferred();
    assert.equal(armed?.bedtime, 23 * 60);
    assert.equal(+readLock(at(21)).nextChange, +at(23), 'no re-sync at 22:00: iOS holds nothing then');
    assert.equal(readLock(at(22, 10)).phase, 'day');
  });

  test('an app left open wakes when arming can go ahead', async () => {
    await deferred();
    assert.equal(+armRetryAt(at(7, 5))!, +at(8));
    clock = at(8, 0, 1).getTime();
    syncLock(at(8, 0, 1)); // `useLock`'s timer
    await armRoutine(at(8, 0, 1)); // waits for the background arm
    assert.equal(armed?.bedtime, 22 * 60);
    assert.equal(armRetryAt(at(8, 1)), null);
  });

  test('once a sync after 08:00 arms the edit, 22:00 is held: the edit governs from then', async () => {
    await deferred();
    clock = at(8, 30).getTime();
    assert.equal(await armRoutine(at(8, 30)), 'armed');
    assert.equal(+readLock(at(21)).nextChange, +at(22));
    assert.equal(readLock(at(22, 10)).phase, 'night');
  });
});

describe('re-shielding when the night was lost', () => {
  test('every sync tidies a Block now that iOS never ended, before reading the state', () => {
    napTidies = 0;
    syncLock(at(15));
    assert.equal(napTidies, 1);
  });

  test('a missed night, armed in time, is put back to sleep on open', async () => {
    await armYesterday();
    nightHeld = false; // no window ever fired
    syncLock(at(7, 30));
    assert.ok(calls.includes('sleep:night'));
  });

  test('also at night', async () => {
    await armYesterday();
    syncLock(at(2));
    assert.ok(calls.includes('sleep:night'));
  });

  test('a first install in the morning does not lock that morning', async () => {
    clock = at(7, 30).getTime();
    await armRoutine(at(7, 30));
    assert.ok(!calls.includes('sleep:night'));
    calls = [];
    syncLock(at(7, 45));
    assert.ok(!calls.includes('sleep:night'));
  });

  test('arming during the night shields straight away', async () => {
    clock = at(1, 0).getTime();
    await armRoutine(at(1, 0));
    assert.ok(calls.includes('sleep:night'));
  });

  test('no bedtime apps picked: nothing to shield', async () => {
    nightPicks = 0;
    await armYesterday();
    syncLock(at(2));
    assert.ok(!calls.includes('sleep:night'));
  });

  test('a night switched off wakes apps a daily window put to sleep', async () => {
    // Every night but Thursday (4). Thursday evening's night is off.
    store.clear();
    saveRoutine({ ...DEFAULT_ROUTINE, activeNights: [0, 1, 2, 3, 5, 6] }, at(12, 0, 0));
    await armYesterday();
    nightHeld = true; // the window fired anyway at 23:00 Thursday
    const state = syncLock(at(23, 30));
    assert.equal(state.phase, 'off');
    assert.ok(calls.includes('wake:night'));
  });
});

describe('armRoutine', () => {
  test('arms the saved routine once and keeps it', async () => {
    assert.equal(await armRoutine(at(14)), 'armed');
    assert.equal(await armRoutine(at(15)), 'kept');
    assert.equal(calls.filter((c) => c.startsWith('arm:')).length, 1);
  });

  test('re-arms on sync when iOS dropped the windows', async () => {
    await armYesterday();
    live = 0;
    syncLock(at(14));
    await armRoutine(at(14)); // waits for the background re-arm
    assert.ok(calls.some((c) => c.startsWith('arm:')));
  });

  test('never arms from a sync before anything was armed (before purchase)', async () => {
    syncLock(at(14));
    await new Promise((r) => setTimeout(r, 0));
    assert.ok(!calls.some((c) => c.startsWith('arm:')));
  });

  test('a pending edit is armed during the day', async () => {
    await armYesterday();
    clock = at(14).getTime();
    saveRoutine({ ...DEFAULT_ROUTINE, bedtime: 22 * 60 }, at(14));
    assert.equal(await armRoutine(at(14)), 'armed');
    assert.equal(armed?.bedtime, 22 * 60);
  });

  test('a later morning saved after the walk waits until that morning has passed', async () => {
    await armYesterday();
    nightHeld = true;
    proveMorning('steps', at(7, 2));
    saveRoutine({ ...DEFAULT_ROUTINE, morningStart: 8 * 60 }, at(7, 5));
    assert.equal(await armRoutine(at(7, 5)), 'deferred');
    assert.equal(armed?.morningStart, 7 * 60);
    clock = at(8, 30).getTime();
    assert.equal(await armRoutine(at(8, 30)), 'armed');
    assert.equal(armed?.morningStart, 8 * 60);
  });

  test('no nights left: disarms from the next bedtime', async () => {
    await armYesterday();
    saveRoutine({ ...DEFAULT_ROUTINE, activeNights: [] }, at(14));
    assert.equal(await armRoutine(at(14)), 'deferred');
    assert.ok(armed);
    assert.equal(await armRoutine(at(23, 5)), 'disarmed');
    assert.equal(armed, null);
  });

  test('switching every night off from bed frees neither the night nor the morning', async () => {
    await armYesterday();
    nightHeld = true;
    saveRoutine({ ...DEFAULT_ROUTINE, activeNights: [] }, at(1, 0, 2));
    assert.equal(await armRoutine(at(1, 0, 2)), 'deferred');
    assert.equal(syncLock(at(1, 0, 2)).phase, 'night');
    assert.equal(syncLock(at(7, 30, 2)).phase, 'morning');
    assert.ok(!calls.includes('wake:night'));
    assert.ok(!calls.includes('disarm'));
    // The edit applies at that evening's bedtime: the night is off and the hold ends.
    assert.equal(syncLock(at(23, 30, 2)).phase, 'off');
    assert.ok(calls.includes('wake:night'));
  });
});

describe('a subscription that ends', () => {
  test('in the day: everything stands down at once (nothing was asleep until bedtime anyway)', async () => {
    await armYesterday();
    settleSubscription(false, at(16, 0, 0)); // the afternoon it was armed: before any bedtime
    assert.ok(calls.includes('standDown'));
    assert.ok(subscriptionEnded());
  });

  test('at night: tonight and its morning still hold, then it stands down after the proof', async () => {
    await armYesterday();
    nightHeld = true;
    settleSubscription(false, at(2, 0, 2));
    assert.ok(!calls.includes('standDown'));
    syncLock(at(7, 30, 2));
    assert.ok(!calls.includes('standDown'), 'the morning still asks for its wake-up');
    proveMorning('steps', at(7, 40, 2));
    assert.ok(calls.includes('standDown'));
  });

  test('a morning nobody proves still ends at the next bedtime: the next night never starts', async () => {
    // Found by the simulation (lock-controller.sim.test.ts, seed 24): with no proof the
    // morning lasts until bedtime, and the next night is a night too, so it never stood down.
    await armYesterday();
    nightHeld = true;
    settleSubscription(false, at(2, 0, 2));
    settleSubscription(false, at(15, 0, 2)); // every open asks the store again
    assert.ok(!calls.includes('standDown'), 'the unproven morning still holds through the day');
    settleSubscription(false, at(23, 30, 2));
    assert.ok(calls.includes('standDown'), 'the next night is not locked without a subscription');
  });

  test('found ended in the morning: that morning finishes, the one after does not', async () => {
    await armYesterday();
    nightHeld = true;
    settleSubscription(false, at(9, 0, 2));
    assert.ok(!calls.includes('standDown'));
    settleSubscription(false, at(7, 30, 3));
    assert.ok(calls.includes('standDown'));
  });

  test('renewed before the next open: a sync on the way in never stands down on the old answer', async () => {
    // Found by the simulation (seed 165): on opening, `useLock` syncs before the store answers.
    await armYesterday();
    nightHeld = true;
    settleSubscription(false, at(2, 0, 2));
    syncLock(at(7, 30, 3)); // a later morning, but the store hasn't been asked yet
    assert.ok(!calls.includes('standDown'));
    settleSubscription(true, at(7, 30, 3));
    assert.ok(!calls.includes('standDown'));
    // The extension skipped that morning's night (after the last paid one), so nothing held it:
    // the renewal leaves it free rather than asking for a wake-up (round 50). The next one locks.
    assert.equal(readLock(at(7, 31, 3)).phase, 'day', 'a morning whose night the lapse skipped stays free');
    assert.equal(readLock(at(7, 31, 4)).phase, 'morning', 'the next morning asks for its wake-up');
  });

  test('a flight west mid-night never ends the night under way early', async () => {
    // Found by the simulation (seed 156). Read in a zone further west, the same night starts
    // later than the moment the end was found; it's still the night under way.
    const zone = process.env.TZ;
    process.env.TZ = 'America/New_York';
    try {
      await armYesterday();
      nightHeld = true;
      settleSubscription(false, new Date('2026-10-02T05:30:00Z')); // 01:30 in New York
      process.env.TZ = 'America/Los_Angeles';
      // 02:30 in Los Angeles: the same night (it began at 23:00 there, after the end was found).
      settleSubscription(false, new Date('2026-10-02T09:30:00Z'));
      assert.ok(!calls.includes('standDown'));
      // The next night there is a new one, and never starts.
      settleSubscription(false, new Date('2026-10-03T06:30:00Z')); // 23:30 in Los Angeles
      assert.ok(calls.includes('standDown'));
    } finally {
      if (zone === undefined) delete process.env.TZ;
      else process.env.TZ = zone;
    }
  });

  test('found ended while iOS registers the windows: the arm backs out', async () => {
    // Found by the simulation (seed 543): standing down under an arm left it armed anyway.
    let release = () => {};
    armGate = new Promise((resolve) => (release = resolve));
    const arming = armRoutine(at(14, 0, 0));
    settleSubscription(false, at(14, 0, 0));
    assert.ok(calls.includes('standDown'));
    release();
    assert.equal(await arming, 'disarmed');
    assert.equal(armed, null);
  });

  test('never bought: stands down even at night, since nothing was armed', () => {
    settleSubscription(false, at(2));
    assert.ok(calls.includes('standDown'));
  });

  test('subscribed again: stands back up and forgets the end', async () => {
    settleSubscription(false, at(15));
    settleSubscription(true, at(16));
    assert.ok(calls.includes('standUp'));
    assert.equal(subscriptionEnded(), false);
  });
});
