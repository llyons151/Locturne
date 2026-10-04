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
let napTidies = 0;
let stoodDown = false;

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
      live = windows.length;
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
    limitUsedUpToday: () => false,
    setShieldText: (text: { title: string }, tap: unknown) => shieldTexts.push({ title: text.title, tap: tap !== null }),
    setNightShieldText: () => {},
    disarmNight: () => {
      calls.push('disarm');
      live = 0;
      armed = null;
    },
  },
});

/** The controller reads the clock only through `now`, except `armedAt` in the fake. */
let clock = 0;

const { syncLock, readLock, proveMorning, armRoutine, settleSubscription, subscriptionEnded } = await import('./lock-controller.ts');
const { saveRoutine, DEFAULT_ROUTINE } = await import('./routine.ts');
const { recordProof, getProofs } = await import('./morning-proof.ts');

/** Thursday 2026-10-01 at hh:mm, local time. Default routine: 23:00 to 07:00, every night. */
const at = (hh: number, mm = 0, day = 1) => new Date(2026, 9, day, hh, mm);

beforeEach(() => {
  store.clear();
  calls = [];
  shieldTexts = [];
  stoodDown = false;
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

  test('a proof that stopped counting never blocks the next one, so the morning can still open', async () => {
    await armYesterday();
    nightHeld = true;
    // A walk logged for this morning before its start as the clock now reads it (the phone
    // crossed timezones westward after proving, say). It no longer counts...
    const key = readLock(at(7, 30, 2)).morningKey;
    store.set('locturne.morningProofs', [{ morningKey: key, kind: 'steps', at: at(6, 0, 2).getTime() }]);
    assert.equal(syncLock(at(7, 30, 2)).phase, 'morning');
    // ...and must not stop the emergency unlock, a pass or a fresh walk from opening it.
    assert.ok(recordProof({ morningKey: key, kind: 'emergency', at: at(7, 40, 2).getTime() }));
    assert.equal(syncLock(at(7, 40, 2)).phase, 'day');
    assert.equal(nightHeld, false);
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
