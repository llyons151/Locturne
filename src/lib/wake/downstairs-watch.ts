/**
 * The wiring behind `useDownstairs`: checking for a barometer, and running one live "go
 * downstairs" session from Start to its end (downstairs.ts has the rules). The sensors, the
 * clock and the app state are passed in, so it runs in tests without a phone
 * (downstairs-watch.test.ts).
 *
 * A session only listens between Start and its end, and stops if the app goes to the
 * background: iOS pauses the altimeter then, so it would be judging a gap. Coming back shows
 * Start again rather than pretending.
 */
import { addSample, isOver, startDownstairs, tick, type DownstairsSession } from './downstairs.ts';

/**
 * - `checking`: finding out whether there's a barometer and Motion & Fitness is on.
 * - `ready`: Start can be tapped.
 * - `denied`: Motion & Fitness is off for Locturne (the barometer shares that permission).
 * - `unavailable`: no barometer, or no relative altitude (anything but an iPhone).
 */
export type BarometerAccess = 'checking' | 'ready' | 'denied' | 'unavailable';

/** CMAltimeter reports about once a second whatever we ask; ask for a little faster anyway. */
export const UPDATE_MS = 500;
export const TICK_MS = 1_000;

type Subscription = { remove: () => void };
type Permission = { granted: boolean; canAskAgain: boolean };

export type DownstairsWatchDeps = {
  /** expo-sensors' `Barometer`, as much of it as this needs. */
  barometer: {
    isAvailableAsync: () => Promise<boolean>;
    setUpdateInterval: (ms: number) => void;
    addListener: (listener: (reading: { relativeAltitude?: number }) => void) => Subscription;
  };
  /**
   * expo-sensors' `Pedometer`, for the permission only. Barometer has no permission calls of
   * its own (expo-sensors answers "granted"); the altimeter needs Motion & Fitness, which
   * Pedometer's calls really ask iOS about.
   */
  pedometer: {
    getPermissionsAsync: () => Promise<Permission>;
    requestPermissionsAsync: () => Promise<Permission>;
  };
  isIOS: boolean;
  /** React Native's `AppState.addEventListener('change', …)`. */
  onAppState: (listener: (state: string) => void) => Subscription;
  onAccess: (access: BarometerAccess) => void;
  /** The session as it changes; null when a trip to the background ended it. */
  onSession: (session: DownstairsSession | null) => void;
  now?: () => number;
  setInterval?: (run: () => void, ms: number) => unknown;
  clearInterval?: (handle: unknown) => void;
};

export type DownstairsWatch = {
  /** Shows iOS's prompt if it hasn't been, then runs a session. Repeat taps while waiting are ignored. */
  start: () => Promise<void>;
  /** Ends the session in progress, if any. */
  stop: () => void;
  /** The screen is gone: stops, and nothing reports after this, even an answer in flight. */
  dispose: () => void;
};

/** Checks for a barometer straight away, and returns the controls. */
export function watchDownstairs(deps: DownstairsWatchDeps): DownstairsWatch {
  const { barometer, pedometer } = deps;
  const now = deps.now ?? Date.now;
  const every = deps.setInterval ?? ((run, ms) => setInterval(run, ms));
  const clear = deps.clearInterval ?? ((handle) => clearInterval(handle as ReturnType<typeof setInterval>));

  let disposed = false;
  let starting = false;
  let generation = 0;
  let pendingAway: Subscription | null = null;
  let session: DownstairsSession | null = null;
  let stopSession = () => {};

  const access = (next: BarometerAccess) => {
    if (!disposed) deps.onAccess(next);
  };
  const update = (next: DownstairsSession | null) => {
    session = next;
    if (!disposed) deps.onSession(next);
    if (next && isOver(next)) stopSession();
  };

  (async () => {
    try {
      if (!deps.isIOS || !(await barometer.isAvailableAsync())) return access('unavailable');
      const permission = await pedometer.getPermissionsAsync();
      access(permission.granted || permission.canAskAgain ? 'ready' : 'denied');
    } catch {
      access('unavailable');
    }
  })();

  const stop = () => {
    generation++;
    pendingAway?.remove();
    pendingAway = null;
    stopSession();
  };

  // Start waits on iOS's permission answer: a second tap, or leaving the screen meanwhile,
  // must not leave a listener running.
  const start = async () => {
    if (starting || disposed) return;
    starting = true;
    stop();
    const started = generation;
    pendingAway = deps.onAppState((state) => {
      if (state === 'background') stop();
    });
    const permission = await pedometer.requestPermissionsAsync().catch(() => null);
    pendingAway?.remove();
    pendingAway = null;
    starting = false;
    if (disposed || started !== generation) return;
    if (!permission?.granted) return access('denied');
    access('ready');

    update(startDownstairs(now()));

    barometer.setUpdateInterval(UPDATE_MS);
    const listener = barometer.addListener(({ relativeAltitude }) => {
      // Off iOS there's no relative altitude: NaN makes the session report no signal.
      if (session) update(addSample(session, { at: now(), altitude: relativeAltitude ?? Number.NaN }));
    });
    const clock = every(() => {
      if (session) update(tick(session, now()));
    }, TICK_MS);
    // Only a real trip to the background: Control Center and alerts pass through `inactive`.
    const away = deps.onAppState((state) => {
      if (state !== 'background') return;
      stopSession();
      update(null);
    });
    stopSession = () => {
      listener.remove();
      clear(clock);
      away.remove();
      stopSession = () => {};
    };
  };

  return {
    start,
    stop,
    dispose: () => {
      disposed = true;
      stop();
    },
  };
}
