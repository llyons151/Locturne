/// <reference types="node" />

/**
 * How `usePushups` checks for the sensors and runs a session, against a fake proximity
 * sensor, device motion, pedometer, clock and app state. The rep rules are in pushups.test.ts.
 */
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { PUSHUPS, type PushupsSession } from './pushups.ts';
import { MOTION_MS, toMotion, watchPushups, type PushupsAccess, type PushupsWatchDeps } from './pushups-watch.ts';

const settle = async () => {
  for (let i = 0; i < 5; i++) await new Promise<void>((resolve) => setImmediate(resolve));
};

type Permission = { granted: boolean; canAskAgain: boolean };
type Reading = Parameters<Parameters<PushupsWatchDeps['motion']['addListener']>[0]>[0];

/** Lying face-up and still, as iOS reports it. */
const FACE_UP: Reading = { acceleration: { x: 0, y: 0, z: 0 }, accelerationIncludingGravity: { x: 0, y: 0, z: -9.81 } };

function setup(before: (world: ReturnType<typeof makeWorld>) => void = () => {}, overrides: Partial<PushupsWatchDeps> = {}) {
  const world = makeWorld();
  before(world);
  const watch = watchPushups({
    isIOS: true,
    proximity: {
      isAvailableAsync: async () => world.sensor,
      start: async () => {
        world.on = world.sensor;
        return world.sensor;
      },
      stop: async () => void (world.on = false),
      addListener: (_event, listener) => {
        world.covers.add(listener);
        return { remove: () => void world.covers.delete(listener) };
      },
    },
    motion: {
      isAvailableAsync: async () => true,
      setUpdateInterval: (ms) => void (world.interval = ms),
      addListener: (listener) => {
        world.motion.add(listener);
        return { remove: () => void world.motion.delete(listener) };
      },
    },
    pedometer: {
      getPermissionsAsync: async () => world.permission,
      requestPermissionsAsync: async () => (world.permission = world.prompt),
      watchStepCount: (callback) => {
        world.steps.add(callback);
        return { remove: () => void world.steps.delete(callback) };
      },
    },
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
  return { world, watch, last: () => world.sessions.at(-1) };
}

function makeWorld() {
  return {
    clock: 0,
    sensor: true,
    on: false,
    permission: { granted: false, canAskAgain: true } as Permission,
    prompt: { granted: true, canAskAgain: false } as Permission,
    interval: null as number | null,
    covers: new Set<(c: { near: boolean; at: number }) => void>(),
    motion: new Set<(r: Reading) => void>(),
    steps: new Set<(r: { steps: number }) => void>(),
    appState: new Set<(state: string) => void>(),
    timers: new Map<number, () => void>(),
    nextTimer: 1,
    access: [] as PushupsAccess[],
    sessions: [] as (PushupsSession | null)[],
  };
}

type World = ReturnType<typeof makeWorld>;
const send = <T,>(set: Set<(v: T) => void>, value: T) => [...set].forEach((listener) => listener(value));

/** Walk to the floor, lie flat until counting, then `n` push-ups. */
function pushups(world: World, n: number) {
  send(world.steps, { steps: PUSHUPS.walkSteps });
  for (let i = 0; i <= PUSHUPS.settleMs / MOTION_MS; i++) {
    world.clock += MOTION_MS;
    send(world.motion, FACE_UP);
  }
  for (let i = 0; i < n; i++) {
    world.clock += 1_500;
    send(world.covers, { near: true, at: world.clock });
    send(world.covers, { near: false, at: world.clock + 700 });
  }
}

describe('push-ups watch', () => {
  test('a full set proves it and lets go of every sensor', async () => {
    const { world, watch, last } = setup();
    await settle();
    assert.equal(world.access.at(-1), 'ready');
    await watch.start();
    assert.equal(world.on, true);
    assert.equal(world.interval, MOTION_MS);
    pushups(world, PUSHUPS.reps);
    assert.equal(last()?.status, 'met');
    assert.equal(world.on, false);
    assert.equal(world.covers.size + world.motion.size + world.steps.size + world.timers.size, 0);
  });

  test('no proximity sensor is unavailable', async () => {
    const { world, watch } = setup((w) => (w.sensor = false));
    await settle();
    assert.equal(world.access.at(-1), 'unavailable');
    await watch.start();
    assert.equal(world.sessions.length, 0);
  });

  test('without the native module it is unavailable', async () => {
    const { world } = setup(() => {}, { proximity: null });
    await settle();
    assert.equal(world.access.at(-1), 'unavailable');
  });

  test('Motion & Fitness refused: denied, and the sensor stays off', async () => {
    const { world, watch } = setup((w) => (w.prompt = { granted: false, canAskAgain: false }));
    await settle();
    await watch.start();
    assert.equal(world.access.at(-1), 'denied');
    assert.equal(world.on, false);
  });

  test('going to the background ends the session', async () => {
    const { world, watch, last } = setup();
    await settle();
    await watch.start();
    pushups(world, 3);
    send(world.appState, 'background');
    assert.equal(last(), null);
    assert.equal(world.on, false);
    assert.equal(world.covers.size, 0);
  });

  test('the screen going dark (inactive) keeps counting', async () => {
    const { world, watch, last } = setup();
    await settle();
    await watch.start();
    send(world.appState, 'inactive');
    pushups(world, 2);
    assert.equal(last()?.reps, 2);
  });

  test('disposed mid-prompt leaves nothing running', async () => {
    const { world, watch } = setup();
    await settle();
    const starting = watch.start();
    watch.dispose();
    await starting;
    assert.equal(world.on, false);
    assert.equal(world.covers.size + world.motion.size, 0);
  });

  test('device motion: face-up still is flat; picked up is not', () => {
    const flat = toMotion(FACE_UP, 0);
    assert.ok(flat.up > 0.99 && flat.shake < 0.01);
    const held = toMotion(
      { acceleration: { x: 1, y: 1, z: 0 }, accelerationIncludingGravity: { x: 1, y: -6.9, z: -6.9 } },
      0,
    );
    assert.ok(held.up < 0.8);
    assert.ok(held.shake > 0.1);
  });
});
