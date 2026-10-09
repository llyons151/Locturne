/// <reference types="node" />

/**
 * When `useStepCount` reads history, subscribes and resubscribes, against a fake pedometer,
 * clock and app state. The counting rules themselves are in steps.test.ts.
 */
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { HISTORY_EVERY_MS, watchSteps, type StepStatus, type StepWatchDeps } from './step-watch.ts';
import { stepsOf, type StepCount } from './steps.ts';

/** Lets pending promises settle. */
const settle = async () => {
  for (let i = 0; i < 5; i++) await new Promise<void>((resolve) => setImmediate(resolve));
};

const MORNING = 1_000_000;

type World = ReturnType<typeof makeWorld>;

function makeWorld() {
  return {
    clock: MORNING + 60_000,
    available: true as boolean | Error,
    granted: true,
    prompts: 0,
    permissionReads: 0,
    /** Steps since morning start that the motion chip reports. */
    history: 50,
    historyFails: false,
    historyReads: [] as [number, number][],
    /** Live watchers, newest last; only `live` ones get updates. */
    watchers: [] as { callback: (r: { steps: number }) => void; live: boolean }[],
    appState: new Set<(state: string) => void>(),
    timers: new Map<number, () => void>(),
    nextTimer: 1,
    statuses: [] as StepStatus[],
    counts: [] as StepCount[],
  };
}

/** Starts a watch on a fresh fake world, after `before` has set it up. */
function setup(before: (world: World) => void = () => {}, overrides: Partial<StepWatchDeps> = {}) {
  const world = makeWorld();
  before(world);
  const deps: StepWatchDeps = {
    isIOS: true,
    pedometer: {
      isAvailableAsync: async () => {
        if (world.available instanceof Error) throw world.available;
        return world.available;
      },
      requestPermissionsAsync: async () => {
        world.prompts++;
        return { granted: world.granted };
      },
      getPermissionsAsync: async () => {
        world.permissionReads++;
        return { granted: world.granted };
      },
      getStepCountAsync: async (start, end) => {
        world.historyReads.push([+start, +end]);
        if (world.historyFails) throw new Error('CMErrorDomain');
        return { steps: world.history };
      },
      watchStepCount: (callback) => {
        const watcher = { callback, live: true };
        world.watchers.push(watcher);
        return { remove: () => void (watcher.live = false) };
      },
    },
    onAppState: (listener) => {
      world.appState.add(listener);
      return { remove: () => void world.appState.delete(listener) };
    },
    now: () => world.clock,
    setInterval: (run) => {
      const id = world.nextTimer++;
      world.timers.set(id, run);
      return id;
    },
    clearInterval: (id) => void world.timers.delete(id as number),
    ...overrides,
  };
  const stop = watchSteps(deps, {
    morningStart: MORNING,
    goal: 200,
    onStatus: (s) => world.statuses.push(s),
    onCount: (c) => world.counts.push(c),
  });

  const live = () => world.watchers.filter((w) => w.live);
  return {
    world,
    stop,
    live,
    /** The live watcher reports `raw` steps since it subscribed, `seconds` later. */
    walk: (raw: number, seconds: number) => {
      world.clock += seconds * 1000;
      for (const w of live()) w.callback({ steps: raw });
    },
    poll: () => [...world.timers.values()].forEach((run) => run()),
    appState: (state: string) => [...world.appState].forEach((listener) => listener(state)),
    steps: () => {
      const last = world.counts.at(-1);
      return last ? stepsOf(last) : null;
    },
  };
}

describe('step watch', () => {
  test('opens on the history since morning start, then listens live and polls', async () => {
    const t = setup();
    await settle();
    assert.deepEqual(t.world.statuses, ['counting']);
    assert.deepEqual(t.world.historyReads, [[MORNING, MORNING + 60_000]]);
    assert.equal(t.steps(), 50);
    assert.equal(t.live().length, 1);
    assert.equal(t.world.timers.size, 1);

    t.walk(10, 5);
    assert.equal(t.steps(), 60);
  });

  test('the poll banks steps the live watcher missed', async () => {
    const t = setup();
    await settle();
    t.walk(5, 10);
    t.world.history = 90;
    t.poll();
    await settle();
    assert.equal(t.steps(), 90);
    assert.equal(HISTORY_EVERY_MS, 10_000);
  });

  test('a failed history read is shrugged off; live steps carry on', async () => {
    const t = setup();
    await settle();
    t.world.historyFails = true;
    t.poll();
    await settle();
    t.walk(12, 6);
    assert.equal(t.steps(), 62);
    assert.ok(!t.world.statuses.includes('unavailable'));
  });

  test('a failed initial history read still starts live counting and retries history', async () => {
    const t = setup((w) => void (w.historyFails = true));
    await settle();
    assert.deepEqual(t.world.statuses, ['counting']);
    assert.equal(t.live().length, 1);
    t.walk(12, 6);
    assert.equal(t.steps(), 12);
    t.world.historyFails = false;
    t.world.history = 50;
    t.world.clock += HISTORY_EVERY_MS;
    t.poll();
    await settle();
    assert.equal(t.steps(), 50, 'recovered history includes steps walked before opening');
    t.stop();
  });

  test('back from the background: listens again and banks what was walked away', async () => {
    const t = setup();
    await settle();
    t.walk(20, 10);
    assert.equal(t.steps(), 70);

    // 80 steps in the background: live updates stopped, history kept counting.
    t.world.clock += 120_000;
    t.world.history = 150;
    t.appState('active');
    await settle();

    assert.equal(t.live().length, 1, 'the old watcher is removed, one new one listens');
    assert.equal(t.world.watchers.length, 2);
    assert.equal(t.steps(), 150);

    // The new watcher counts from zero; its steps add on at once.
    t.walk(6, 3);
    assert.equal(t.steps(), 156);
  });

  test('other app states, like Control Center’s `inactive`, change nothing', async () => {
    const t = setup();
    await settle();
    t.appState('inactive');
    t.appState('background');
    await settle();
    assert.equal(t.world.watchers.length, 1);
    assert.equal(t.world.historyReads.length, 1);
  });

  test('a return before counting has started doesn’t subscribe early', async () => {
    const t = setup();
    t.appState('active');
    assert.equal(t.world.watchers.length, 0);
    await settle();
    assert.equal(t.world.watchers.length, 1);
  });

  test('stop removes the watcher, the poll and the app state listener', async () => {
    const t = setup();
    await settle();
    t.stop();
    assert.equal(t.live().length, 0);
    assert.equal(t.world.timers.size, 0);
    assert.equal(t.world.appState.size, 0);
  });

  test('a history read that lands after stop reports nothing', async () => {
    const t = setup();
    await settle();
    t.poll();
    const reported = t.world.counts.length;
    t.stop();
    await settle();
    assert.equal(t.world.counts.length, reported);
  });

  test('stopped while asking for permission: nothing starts and nothing reports', async () => {
    const t = setup();
    t.stop();
    await settle();
    assert.deepEqual(t.world.statuses, []);
    assert.equal(t.world.watchers.length, 0);
    assert.equal(t.world.timers.size, 0);
    assert.equal(t.world.prompts, 0, 'unmounted availability checks must not open a permission prompt');
  });

  test('Motion & Fitness off', async () => {
    const t = setup((w) => void (w.granted = false));
    await settle();
    assert.deepEqual(t.world.statuses, ['denied']);
    assert.equal(t.world.watchers.length, 0);
  });

  test('turned on from Settings while denied: counting starts on return, once', async () => {
    const t = setup((w) => void (w.granted = false));
    await settle();
    t.appState('background');
    t.appState('active');
    await settle();
    assert.deepEqual(t.world.statuses, ['denied'], 'still off: stays denied');
    assert.equal(t.world.watchers.length, 0);

    t.world.granted = true;
    t.appState('background');
    t.appState('active');
    t.appState('active');
    await settle();
    assert.deepEqual(t.world.statuses, ['denied', 'starting', 'counting']);
    assert.equal(t.world.prompts, 1, 'reads the permission again, never prompts again');
    assert.equal(t.world.watchers.length, 1, 'two quick returns start one watcher');
    assert.equal(t.world.timers.size, 1);
    assert.equal(t.steps(), 50);

    t.walk(10, 5);
    assert.equal(t.steps(), 60);
  });

  test('stopped while re-reading the permission: nothing starts', async () => {
    const t = setup((w) => void (w.granted = false));
    await settle();
    t.world.granted = true;
    t.appState('active');
    t.stop();
    await settle();
    assert.deepEqual(t.world.statuses, ['denied']);
    assert.equal(t.world.watchers.length, 0);
    assert.equal(t.world.timers.size, 0);
  });
});

describe('no step counter', () => {
  test('off iPhone', async () => {
    const t = setup(undefined, { isIOS: false });
    await settle();
    assert.deepEqual(t.world.statuses, ['unavailable']);
  });

  test('no motion chip, or one that errors', async () => {
    for (const available of [false, new Error('nope')]) {
      const t = setup((w) => void (w.available = available));
      await settle();
      assert.deepEqual(t.world.statuses, ['unavailable'], String(available));
      t.stop();
    }
  });

  test('before morning start, history is zero without asking', async () => {
    const t = setup((w) => void (w.clock = MORNING - 1));
    await settle();
    assert.deepEqual(t.world.historyReads, []);
    assert.equal(t.steps(), 0);
    assert.deepEqual(t.world.statuses, ['counting']);
  });
});
