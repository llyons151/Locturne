import type { StepSensor } from '@/lib/wake/step-watch';

import type { WakePreview } from './wake-preview';

/**
 * FAKE sensors for the wake preview (wake-preview.ts). Each one has the same shape as the
 * expo-sensors object it replaces, and is handed to the same wiring (step-watch.ts), so everything above the hardware — the counting rules, the screens,
 * their states — is the real code. Only the numbers are made up.
 */

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
