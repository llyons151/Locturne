/**
 * The wiring behind `usePushups`: checking for the sensors, and running one push-up session
 * from Start to its end (pushups.ts has the rules). The sensors, the clock and the app state
 * are passed in, so it runs in tests without a phone (pushups-watch.test.ts).
 *
 * A session listens to the pedometer (the walk to the floor), device motion (flat and still)
 * and the proximity sensor (the reps), only between Start and its end. Going to the
 * background ends it: iOS stops all three then. The screen going dark while the sensor is
 * covered isn't the background; the app keeps running.
 */
import { addMotion, addProximity, addSteps, isOver, PUSHUPS, startPushups, tick, type PushupsSession } from './pushups.ts';

/**
 * - `checking`: finding out whether the sensors are there and Motion & Fitness is on.
 * - `ready`: Start can be tapped.
 * - `denied`: Motion & Fitness is off, so the walk to the floor can't be counted.
 * - `unavailable`: no proximity sensor or motion (anything but an iPhone, or an older build).
 */
export type PushupsAccess = 'checking' | 'ready' | 'denied' | 'unavailable';

export const MOTION_MS = 100;
export const TICK_MS = 1_000;
const G = 9.80665;

type Subscription = { remove: () => void };
type Permission = { granted: boolean; canAskAgain: boolean };
type Vector = { x: number; y: number; z: number };

export type PushupsWatchDeps = {
  /** modules/proximity, or null where it isn't built in. */
  proximity: {
    isAvailableAsync: () => Promise<boolean>;
    start: () => Promise<boolean>;
    stop: () => Promise<void>;
    addListener: (event: 'onChange', listener: (change: { near: boolean; at: number }) => void) => Subscription;
  } | null;
  /** expo-sensors' `DeviceMotion`, as much of it as this needs. */
  motion: {
    isAvailableAsync: () => Promise<boolean>;
    setUpdateInterval: (ms: number) => void;
    addListener: (
      listener: (reading: { acceleration: Vector | null; accelerationIncludingGravity: Vector }) => void,
    ) => Subscription;
  };
  /** expo-sensors' `Pedometer`, for the walk to the floor. */
  pedometer: {
    getPermissionsAsync: () => Promise<Permission>;
    requestPermissionsAsync: () => Promise<Permission>;
    watchStepCount: (callback: (result: { steps: number }) => void) => Subscription;
  };
  isIOS: boolean;
  /** React Native's `AppState.addEventListener('change', …)`. */
  onAppState: (listener: (state: string) => void) => Subscription;
  onAccess: (access: PushupsAccess) => void;
  /** The session as it changes; null when a trip to the background ended it. */
  onSession: (session: PushupsSession | null) => void;
  now?: () => number;
  setInterval?: (run: () => void, ms: number) => unknown;
  clearInterval?: (handle: unknown) => void;
};

export type PushupsWatch = {
  /** Asks for Motion & Fitness if it hasn't been, then runs a session of `goal` reps. Repeat taps while waiting are ignored. */
  start: (goal?: number) => Promise<void>;
  stop: () => void;
  /** The screen is gone: stops, and nothing reports after this, even an answer in flight. */
  dispose: () => void;
};

/**
 * Pure: one device-motion reading as the rules want it. iOS's gravity is the reading with
 * the user's own acceleration taken out; lying face-up it points out of the back, z = -1 g.
 */
export function toMotion(
  reading: { acceleration: Vector | null; accelerationIncludingGravity: Vector },
  at: number,
): { at: number; up: number; shake: number } {
  const own = reading.acceleration ?? { x: 0, y: 0, z: 0 };
  const all = reading.accelerationIncludingGravity;
  const gravity = { x: (all.x - own.x) / G, y: (all.y - own.y) / G, z: (all.z - own.z) / G };
  const length = Math.hypot(gravity.x, gravity.y, gravity.z) || 1;
  return { at, up: -gravity.z / length, shake: Math.hypot(own.x, own.y, own.z) / G };
}

export function watchPushups(deps: PushupsWatchDeps): PushupsWatch {
  const { proximity, motion, pedometer } = deps;
  const now = deps.now ?? Date.now;
  const every = deps.setInterval ?? ((run, ms) => setInterval(run, ms));
  const clear = deps.clearInterval ?? ((handle) => clearInterval(handle as ReturnType<typeof setInterval>));
  const walks = PUSHUPS.walkSteps > 0;

  let disposed = false;
  let starting = false;
  let generation = 0;
  let pendingAway: Subscription | null = null;
  let session: PushupsSession | null = null;
  let stopSession = () => {};
  let current: PushupsAccess = 'checking';

  const access = (next: PushupsAccess) => {
    if (disposed) return;
    current = next;
    deps.onAccess(next);
  };
  const update = (next: PushupsSession | null) => {
    session = next;
    if (!disposed) deps.onSession(next);
    if (next && isOver(next)) stopSession();
  };
  const allowed = (permission: Permission) => !walks || permission.granted || permission.canAskAgain;

  (async () => {
    try {
      if (!deps.isIOS || !proximity) return access('unavailable');
      const [sensor, moves] = await Promise.all([proximity.isAvailableAsync(), motion.isAvailableAsync()]);
      if (!sensor || !moves) return access('unavailable');
      access(allowed(await pedometer.getPermissionsAsync()) ? 'ready' : 'denied');
    } catch {
      access('unavailable');
    }
  })();

  // Back from Settings: read Motion & Fitness again, as the downstairs screen does.
  const foreground = deps.onAppState((state) => {
    if (state !== 'active' || disposed || starting) return;
    if (current !== 'ready' && current !== 'denied') return;
    const asked = generation;
    pedometer
      .getPermissionsAsync()
      .then((permission) => {
        if (starting || asked !== generation) return;
        const next = allowed(permission) ? 'ready' : 'denied';
        if (next !== current) access(next);
      })
      .catch(() => {});
  });

  const stop = () => {
    generation++;
    pendingAway?.remove();
    pendingAway = null;
    stopSession();
  };

  const start = async (goal?: number) => {
    if (starting || disposed || !proximity) return;
    starting = true;
    stop();
    const started = generation;
    pendingAway = deps.onAppState((state) => {
      if (state === 'background') stop();
    });
    const permission = walks ? await pedometer.requestPermissionsAsync().catch(() => null) : null;
    const on = !walks || permission?.granted ? await proximity.start().catch(() => false) : false;
    pendingAway?.remove();
    pendingAway = null;
    starting = false;
    if (disposed || started !== generation) {
      if (on) proximity.stop().catch(() => {});
      return;
    }
    if (walks && !permission?.granted) return access('denied');
    if (!on) return access('unavailable');
    access('ready');

    update(startPushups(now(), goal));

    const steps = walks ? pedometer.watchStepCount(({ steps: n }) => session && update(addSteps(session, n, now()))) : null;
    motion.setUpdateInterval(MOTION_MS);
    const moves = motion.addListener((reading) => {
      if (session) update(addMotion(session, toMotion(reading, now())));
    });
    // The sensor's own time, so a late delivery doesn't shorten or stretch a cover.
    const covers = proximity.addListener('onChange', ({ near, at }) => {
      if (session) update(addProximity(session, near, at));
    });
    const clock = every(() => {
      if (session) update(tick(session, now()));
    }, TICK_MS);
    const away = deps.onAppState((state) => {
      if (state !== 'background') return;
      stopSession();
      update(null);
    });
    stopSession = () => {
      steps?.remove();
      moves.remove();
      covers.remove();
      clear(clock);
      away.remove();
      proximity.stop().catch(() => {});
      stopSession = () => {};
    };
  };

  return {
    start,
    stop,
    dispose: () => {
      disposed = true;
      foreground.remove();
      stop();
    },
  };
}
