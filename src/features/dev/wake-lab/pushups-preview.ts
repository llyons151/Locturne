import { useSyncExternalStore } from 'react';

import type { PhoneHint } from '@/lib/wake/phone-hint';
import type { DemoScene } from '@/lib/wake/pose-demo';

/**
 * The push-up preview's settings (You → Developer), read by the wake lab's push-ups and by a
 * pretend morning (`phase`), never a real one: only those pass `preview` to PushupsView. They force
 * each state of the screen, so its UI can be checked in a browser (or on a phone) without a
 * camera or a set of push-ups. Kept in memory; a reload starts from the real thing.
 */
export type PushupsPreview = {
  /** `camera`: the real camera (the webcam on web). Otherwise a pretend body (pose-demo.ts). */
  scene: 'camera' | DemoScene;
  /** How the phone pretends to be standing; `upright` is the real accelerometer. */
  phone: 'upright' | PhoneHint;
  /**
   * `real`: as it is. `ask`: Continue before the camera prompt. `denied`: access off.
   * `oldBuild`: a build without the camera module. `noCamera` / `model`: the camera (or the web
   * model) fails as it opens.
   */
  setup: 'real' | 'ask' | 'denied' | 'oldBuild' | 'noCamera' | 'model';
  /** Push-ups to do; 0 is the routine's. */
  goal: number;
  /** Time out after 15 s instead of 10 minutes, to see the timed-out strip. */
  fastTimeout: boolean;
  /** The tuning readout over the camera. */
  readout: boolean;
  /**
   * `real`: the lock as it is. `morning`: every screen that reads the lock (`useLock`) sees a
   * morning still to prove, so Home offers "Start push-ups" and the morning screen runs; its
   * pass records nothing and moves no shields, and turns this to `woke`. `woke`: that morning
   * done, as day. A browser never has a real armed morning, so this is how it's seen there.
   */
  phase: 'real' | 'morning' | 'woke';
};

const START: PushupsPreview = { scene: 'camera', phone: 'upright', setup: 'real', goal: 0, fastTimeout: false, readout: true, phase: 'real' };

let current = START;
const listeners = new Set<() => void>();

export const getPushupsPreview = () => current;

export function setPushupsPreview(change: Partial<PushupsPreview>) {
  current = { ...current, ...change };
  listeners.forEach((l) => l());
}

export const resetPushupsPreview = () => setPushupsPreview(START);

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const usePushupsPreview = () => useSyncExternalStore(subscribe, getPushupsPreview, getPushupsPreview);

/** How long the fast timeout leaves before the set times out. */
export const FAST_TIMEOUT_MS = 15_000;
