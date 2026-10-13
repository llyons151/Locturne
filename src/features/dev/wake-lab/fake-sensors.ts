import type { DownstairsWatchDeps } from '@/lib/wake/downstairs-watch';
import type { StepSensor } from '@/lib/wake/step-watch';

import type { WakePreview } from './wake-preview';

/**
 * FAKE sensors for the wake preview (wake-preview.ts). Each one has the same shape as the
 * expo-sensors object it replaces, and is handed to the same wiring (step-watch.ts,
 * downstairs-watch.ts), so everything above the hardware — the counting rules, the screens,
 * their states — is the real code. Only the numbers are made up.
 */

type Sub = { remove: () => void };

/** Fast walking: under the anti-shake cap of 4 a second (steps.ts), so every step counts. */
const STEPS_PER_S = 3.5;

/** FAKE Pedometer: someone walking (or not) since the screen opened. */
export function fakePedometer(mode: Exclude<WakePreview['steps'], 'real'>, goal: number): StepSensor {
  const opened = Date.now();
  const base = mode === 'halfway' ? Math.floor(goal / 2) : mode === 'done' ? goal : 0;
  const rate = mode === 'still' ? 0 : STEPS_PER_S;
  const granted = { granted: mode !== 'denied' };
  return {
    isAvailableAsync: async () => mode !== 'unavailable',
    requestPermissionsAsync: async () => granted,
    getPermissionsAsync: async () => granted,
    // History: what was walked before opening, plus everything since.
    getStepCountAsync: async () => ({ steps: base + Math.floor(rate * ((Date.now() - opened) / 1000)) }),
    // Live: steps since subscribing, a batch a second like CMPedometer's.
    watchStepCount: (callback) => {
      const from = Date.now();
      const id = setInterval(() => callback({ steps: Math.floor(rate * ((Date.now() - from) / 1000)) }), 1000);
      return { remove: () => clearInterval(id) };
    },
  };
}

/** The FAKE barometer's scripted climb: height in metres `ms` after Start. */
function heightAt(mode: WakePreview['stairs'], ms: number): number {
  const noise = Math.sin(ms / 370) * 0.04;
  // A second or two still, then about 8 s on the stairs, then standing there.
  const walked = Math.min(1, Math.max(0, (ms - 1500) / 8000));
  switch (mode) {
    case 'down':
      return -3.2 * walked + noise;
    case 'up':
      return 3.2 * walked + noise;
    case 'short':
      return -1.6 * walked + noise;
    case 'flat':
      return 0;
    default:
      return noise;
  }
}

/**
 * How much faster the FAKE barometer's clock runs: 'still' times out (5 min) in 15 s, and
 * 'flat' reads as stuck (30 s) in a couple of seconds. The others run at real speed.
 */
const FAST = 20;

/** FAKE Barometer + the Pedometer permission it shares, for `watchDownstairs`. */
export function fakeStairs(
  mode: Exclude<WakePreview['stairs'], 'real'>,
): Pick<DownstairsWatchDeps, 'barometer' | 'pedometer' | 'now'> & { isIOS: boolean } {
  const opened = Date.now();
  const fast = mode === 'still' || mode === 'flat';
  const permission = mode === 'denied' ? { granted: false, canAskAgain: false } : { granted: true, canAskAgain: true };
  return {
    isIOS: true,
    now: fast ? () => opened + (Date.now() - opened) * FAST : undefined,
    pedometer: { getPermissionsAsync: async () => permission, requestPermissionsAsync: async () => permission },
    barometer: {
      isAvailableAsync: async () => mode !== 'unavailable',
      setUpdateInterval: () => {},
      addListener: (listener): Sub => {
        if (mode === 'noSignal') return { remove: () => {} };
        const from = Date.now();
        // On the fast clock, often enough that the gaps don't read as a dead sensor (6 s).
        const id = setInterval(() => listener({ relativeAltitude: heightAt(mode, Date.now() - from) }), fast ? 100 : 500);
        return { remove: () => clearInterval(id) };
      },
    },
  };
}
