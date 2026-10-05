/**
 * The wiring behind `useStepCount`: when to read history, when to (re)subscribe to live
 * steps, and what to do when the app comes back to the front. steps.ts has the counting rules;
 * this only decides when to feed them. The sensors, the clock and the app state are passed
 * in, so it runs in tests without a phone (step-watch.test.ts).
 *
 * - Open: ask for Motion & Fitness, read history since morning start, start counting from
 *   it, then listen live and re-read history every `HISTORY_EVERY_MS` as a backstop.
 * - Back from the background: live updates stopped while away, so listen again (the watcher
 *   counts from zero; `restartLive` keeps what was credited) and read history to bank the
 *   steps walked meanwhile.
 * - Stopped: everything is removed, and nothing reports after that, even a read in flight.
 */
import { addHistory, addLive, restartLive, startCount, type StepCount } from './steps.ts';

/**
 * - `starting`: asking for Motion & Fitness and reading this morning's history.
 * - `counting`: live.
 * - `denied`: Motion & Fitness is off for Locturne. The screen says how to turn it on.
 * - `unavailable`: no step counter (web, the simulator, a very old phone).
 */
export type StepStatus = 'starting' | 'counting' | 'denied' | 'unavailable';

/** History is read again this often while the screen is open, as a backstop for live updates. */
export const HISTORY_EVERY_MS = 10_000;

type Subscription = { remove: () => void };

/** expo-sensors' `Pedometer`, as much of it as this needs. */
export type StepSensor = {
  isAvailableAsync: () => Promise<boolean>;
  requestPermissionsAsync: () => Promise<{ granted: boolean }>;
  getStepCountAsync: (start: Date, end: Date) => Promise<{ steps: number }>;
  watchStepCount: (callback: (result: { steps: number }) => void) => Subscription;
};

export type StepWatchDeps = {
  pedometer: StepSensor;
  /** Step history only exists on iOS (`getStepCountAsync`), which is all v1 targets. */
  isIOS: boolean;
  /** React Native's `AppState.addEventListener('change', …)`. */
  onAppState: (listener: (state: string) => void) => Subscription;
  now?: () => number;
  setInterval?: (run: () => void, ms: number) => unknown;
  clearInterval?: (handle: unknown) => void;
};

export type StepWatchOptions = {
  morningStart: number;
  goal: number;
  onStatus: (status: StepStatus) => void;
  onCount: (count: StepCount) => void;
};

/** Starts watching. Returns the stop. */
export function watchSteps(deps: StepWatchDeps, options: StepWatchOptions): () => void {
  const { pedometer, onAppState } = deps;
  const now = deps.now ?? Date.now;
  const every = deps.setInterval ?? ((run, ms) => setInterval(run, ms));
  const clear = deps.clearInterval ?? ((handle) => clearInterval(handle as ReturnType<typeof setInterval>));
  const { morningStart, goal } = options;

  let stopped = false;
  let count: StepCount | null = null;
  let watch: Subscription | null = null;
  let poll: unknown = null;

  const update = (next: StepCount) => {
    count = next;
    if (!stopped) options.onCount(next);
  };
  const status = (next: StepStatus) => {
    if (!stopped) options.onStatus(next);
  };
  const readHistory = async () => {
    const end = now();
    if (end <= morningStart) return 0;
    return (await pedometer.getStepCountAsync(new Date(morningStart), new Date(end))).steps;
  };
  const refresh = async () => {
    if (!count) return;
    try {
      const steps = await readHistory();
      // `count` again, not a copy from before the read: live updates may have landed meanwhile.
      if (count && !stopped) update(addHistory(count, steps, now()));
    } catch {
      // A failed read just waits for the next one; live updates carry on.
    }
  };
  const subscribe = () => {
    watch?.remove();
    if (count) update(restartLive(count));
    watch = pedometer.watchStepCount(({ steps }) => {
      if (count && !stopped) update(addLive(count, steps, now()));
    });
  };

  (async () => {
    try {
      if (!deps.isIOS || !(await pedometer.isAvailableAsync())) return status('unavailable');
      if (stopped) return;
      const permission = await pedometer.requestPermissionsAsync();
      if (stopped) return;
      if (!permission.granted) return status('denied');
      const steps = await readHistory();
      if (stopped) return;
      update(startCount(goal, steps, now()));
      status('counting');
      subscribe();
      poll = every(refresh, HISTORY_EVERY_MS);
    } catch {
      status('unavailable');
    }
  })();

  // Live updates stop in the background; on return, catch up from history and listen again.
  const appState = onAppState((state) => {
    if (state !== 'active' || !count || stopped) return;
    subscribe();
    refresh();
  });

  return () => {
    stopped = true;
    watch?.remove();
    if (poll !== null) clear(poll);
    appState.remove();
  };
}
