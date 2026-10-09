/// <reference types="node" />

/**
 * How `useDownstairs` checks for a barometer and runs a session, against a fake barometer,
 * permission, clock and app state. The height rules themselves are in downstairs.test.ts.
 */
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import type { DownstairsSession } from './downstairs.ts';
import { TICK_MS, UPDATE_MS, watchDownstairs, type BarometerAccess, type DownstairsWatchDeps } from './downstairs-watch.ts';

const settle = async () => {
  for (let i = 0; i < 5; i++) await new Promise<void>((resolve) => setImmediate(resolve));
};

type Permission = { granted: boolean; canAskAgain: boolean };

function makeWorld() {
  return {
    clock: 0,
    available: true as boolean | Error,
    permission: { granted: false, canAskAgain: true } as Permission,
    /** What the prompt answers. */
    prompt: { granted: true, canAskAgain: false } as Permission | Error,
    /** Holds every prompt until `waiting` is released, to test what happens while it's up. */
    holdPrompt: false,
    waiting: [] as (() => void)[],
    prompts: 0,
    interval: null as number | null,
    listeners: new Set<(r: { relativeAltitude?: number }) => void>(),
    appState: new Set<(state: string) => void>(),
    timers: new Map<number, () => void>(),
    nextTimer: 1,
    access: [] as BarometerAccess[],
    sessions: [] as (DownstairsSession | null)[],
  };
}
type World = ReturnType<typeof makeWorld>;

function setup(before: (world: World) => void = () => {}, overrides: Partial<DownstairsWatchDeps> = {}) {
  const world = makeWorld();
  before(world);
  const answer = async () => {
    world.prompts++;
    if (world.holdPrompt) await new Promise<void>((resolve) => world.waiting.push(resolve));
    if (world.prompt instanceof Error) throw world.prompt;
    world.permission = world.prompt;
    return world.prompt;
  };
  const watch = watchDownstairs({
    isIOS: true,
    barometer: {
      isAvailableAsync: async () => {
        if (world.available instanceof Error) throw world.available;
        return world.available;
      },
      setUpdateInterval: (ms) => void (world.interval = ms),
      addListener: (listener) => {
        world.listeners.add(listener);
        return { remove: () => void world.listeners.delete(listener) };
      },
    },
    pedometer: { getPermissionsAsync: async () => world.permission, requestPermissionsAsync: answer },
    onAppState: (listener) => {
      world.appState.add(listener);
      return { remove: () => void world.appState.delete(listener) };
    },
    onAccess: (a) => world.access.push(a),
    onSession: (s) => world.sessions.push(s),
    now: () => world.clock,
    setInterval: (run) => {
      const id = world.nextTimer++;
      world.timers.set(id, run);
      return id;
    },
    clearInterval: (id) => void world.timers.delete(id as number),
    ...overrides,
  });
  let disposed = false;
  const dispose = watch.dispose;
  watch.dispose = () => {
    disposed = true;
    dispose();
  };
  return {
    world,
    watch,
    /** A barometer reading `seconds` from now. */
    read: (altitude: number | undefined, seconds = 0.5) => {
      world.clock += seconds * 1000;
      for (const listener of [...world.listeners]) listener({ relativeAltitude: altitude });
    },
    tick: (seconds = 1) => {
      world.clock += seconds * 1000;
      for (const run of [...world.timers.values()]) run();
    },
    appState: (state: string) => [...world.appState].forEach((listener) => listener(state)),
    session: () => world.sessions.at(-1) ?? null,
    /** What a session leaves running; the watch's own foreground check (until dispose) isn't counted. */
    listening: () => world.listeners.size + world.timers.size + world.appState.size - (disposed ? 0 : 1),
  };
}

describe('checking for a barometer', () => {
  test('ready when Motion & Fitness is on, or iOS can still ask', async () => {
    for (const permission of [
      { granted: true, canAskAgain: false },
      { granted: false, canAskAgain: true },
    ]) {
      const t = setup((w) => void (w.permission = permission));
      await settle();
      assert.deepEqual(t.world.access, ['ready']);
    }
  });

  test('denied once iOS won’t ask again', async () => {
    const t = setup((w) => void (w.permission = { granted: false, canAskAgain: false }));
    await settle();
    assert.deepEqual(t.world.access, ['denied']);
  });

  test('unavailable off iPhone, without a barometer, or when the check fails', async () => {
    const cases = [
      setup(undefined, { isIOS: false }),
      setup((w) => void (w.available = false)),
      setup((w) => void (w.available = new Error('nope'))),
    ];
    await settle();
    for (const t of cases) assert.deepEqual(t.world.access, ['unavailable']);
  });

  test('turning Motion & Fitness on in Settings and coming back gives ready', async () => {
    const t = setup((w) => void (w.permission = { granted: false, canAskAgain: false }));
    await settle();
    assert.deepEqual(t.world.access, ['denied']);
    t.world.permission = { granted: true, canAskAgain: false };
    t.appState('active');
    await settle();
    assert.deepEqual(t.world.access, ['denied', 'ready']);
    await t.watch.start();
    assert.equal(t.session()?.status, 'waiting');
  });

  test('turning it off while away gives denied; an unchanged answer says nothing new', async () => {
    const t = setup((w) => void (w.permission = { granted: true, canAskAgain: false }));
    await settle();
    t.appState('active');
    await settle();
    assert.deepEqual(t.world.access, ['ready']);
    t.world.permission = { granted: false, canAskAgain: false };
    t.appState('active');
    await settle();
    assert.deepEqual(t.world.access, ['ready', 'denied']);
  });

  test('coming back never turns a missing barometer into ready', async () => {
    const t = setup((w) => {
      w.available = false;
      w.permission = { granted: true, canAskAgain: false };
    });
    await settle();
    t.appState('active');
    await settle();
    assert.deepEqual(t.world.access, ['unavailable']);
  });

  test('a screen gone stops checking on return', async () => {
    const t = setup((w) => void (w.permission = { granted: false, canAskAgain: false }));
    await settle();
    t.watch.dispose();
    assert.equal(t.world.appState.size, 0);
    t.world.permission = { granted: true, canAskAgain: false };
    t.appState('active');
    await settle();
    assert.deepEqual(t.world.access, ['denied']);
  });

  test('a screen gone before the answer hears nothing', async () => {
    const t = setup();
    t.watch.dispose();
    await settle();
    assert.deepEqual(t.world.access, []);
  });
});

describe('a session', () => {
  test('Start asks for Motion & Fitness, then listens to the barometer and a clock', async () => {
    const t = setup();
    await t.watch.start();
    assert.equal(t.world.prompts, 1);
    assert.deepEqual(t.world.access.at(-1), 'ready');
    assert.equal(t.world.interval, UPDATE_MS);
    assert.equal(t.world.listeners.size, 1);
    assert.equal(t.world.timers.size, 1);
    assert.equal(t.session()?.status, 'waiting');
    assert.equal(TICK_MS, 1_000);
  });

  test('a floor down, held, is met, and the listeners stop by themselves', async () => {
    const t = setup();
    await t.watch.start();
    for (let i = 0; i < 3; i++) t.read(0, 0.3);
    for (let i = 0; i < 6; i++) t.read(-1.5 * i, 1);
    for (let i = 0; i < 8; i++) t.read(-3, 1);
    assert.equal(t.session()?.status, 'met');
    assert.equal(t.listening(), 0);
  });

  test('the clock alone notices a silent sensor', async () => {
    const t = setup();
    await t.watch.start();
    for (let i = 0; i < 7; i++) t.tick();
    assert.equal(t.session()?.status, 'noSignal');
    assert.ok(t.listening() > 0, 'no signal yet isn’t the end: a reading can still arrive');
  });

  test('no relative altitude counts as no reading', async () => {
    const t = setup();
    await t.watch.start();
    t.read(undefined);
    assert.equal(t.session()?.count, 0);
  });

  test('a trip to the background ends the session; Control Center doesn’t', async () => {
    const t = setup();
    await t.watch.start();
    t.appState('inactive');
    assert.notEqual(t.session(), null);
    t.appState('background');
    assert.equal(t.session(), null);
    assert.equal(t.listening(), 0);
    t.read(-3);
    assert.equal(t.session(), null, 'a late reading doesn’t bring it back');
  });

  test('Stop ends it, and Start again begins a fresh one', async () => {
    const t = setup();
    await t.watch.start();
    t.read(0);
    t.watch.stop();
    assert.equal(t.listening(), 0);
    await t.watch.start();
    assert.equal(t.listening(), 3);
    assert.equal(t.session()?.count, 0);
  });

  test('Start during a session replaces it, never doubles the listeners', async () => {
    const t = setup();
    await t.watch.start();
    await t.watch.start();
    assert.equal(t.world.listeners.size, 1);
    assert.equal(t.world.timers.size, 1);
    assert.equal(t.world.appState.size, 2, 'the session’s, and the watch’s own foreground check');
  });

  test('a second tap while iOS’s prompt is up is ignored', async () => {
    const t = setup((w) => void (w.holdPrompt = true));
    const first = t.watch.start();
    const second = t.watch.start();
    await settle();
    t.world.waiting.forEach((release) => release());
    await Promise.all([first, second]);
    assert.equal(t.world.prompts, 1);
    assert.equal(t.world.listeners.size, 1);
  });

  test('leaving the screen while the prompt is up leaves nothing listening', async () => {
    const t = setup((w) => void (w.holdPrompt = true));
    const started = t.watch.start();
    await settle();
    t.watch.dispose();
    t.world.waiting.forEach((release) => release());
    await started;
    assert.equal(t.listening(), 0);
    assert.deepEqual(t.world.sessions, []);
  });

  test('Stop cancels a start still waiting for permission', async () => {
    const t = setup((w) => void (w.holdPrompt = true));
    const started = t.watch.start();
    await settle();
    t.watch.stop();
    t.world.waiting.forEach((release) => release());
    await started;
    assert.equal(t.listening(), 0);
    assert.deepEqual(t.world.sessions, []);
  });

  test('backgrounding while permission is pending cancels the hidden start', async () => {
    const t = setup((w) => void (w.holdPrompt = true));
    const started = t.watch.start();
    await settle();
    t.appState('background');
    t.world.waiting.forEach((release) => release());
    await started;
    assert.equal(t.listening(), 0);
    assert.deepEqual(t.world.sessions, []);
  });

  test('a refused or failed prompt says denied and starts nothing', async () => {
    for (const prompt of [{ granted: false, canAskAgain: false }, new Error('nope')]) {
      const t = setup((w) => void (w.prompt = prompt));
      await t.watch.start();
      assert.equal(t.world.access.at(-1), 'denied');
      assert.equal(t.listening(), 0);
    }
  });
});
