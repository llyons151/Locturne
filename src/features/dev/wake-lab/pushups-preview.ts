import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

import type { PhoneReading } from '@/lib/wake/phone-hint';
import type { DemoScene } from '@/lib/wake/pose-demo';

/**
 * The push-up preview's settings (/wake-preview, You → Developer), read by the wake lab's
 * push-ups and by a pretend morning (wake-preview.ts `phase`), never a real one: only those pass
 * `preview` to PushupsView. They force each state of the screen, so its UI can be checked in a
 * browser (or on a phone) without a camera or a set of push-ups. Kept in memory; a reload
 * starts from the defaults.
 */
export type PushupsPreview = {
  /** `camera`: the real camera (the webcam on web). Otherwise a pretend body (pose-demo.ts). */
  scene: 'camera' | DemoScene;
  /** How the phone pretends to be standing; `sensor` is the real accelerometer. */
  phone: 'sensor' | keyof typeof PREVIEW_PHONES;
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
};

/** The pretend ways to stand the phone, as the accelerometer would read them. */
export const PREVIEW_PHONES = {
  sideways: { turn: 'landscapeLeft', hint: null },
  sidewaysOther: { turn: 'landscapeRight', hint: null },
  upright: { turn: 'portrait', hint: 'tall' },
  flat: { turn: 'landscapeLeft', hint: 'flat' },
  upsideDown: { turn: 'portrait', hint: 'upsideDown' },
} as const satisfies Record<string, PhoneReading>;

// A browser starts on the fake body doing good reps, sideways (the webcam is a choice away; a
// browser has no accelerometer); a phone on its camera and its own accelerometer.
const web = Platform.OS === 'web';
const START: PushupsPreview = {
  scene: web ? 'pushups' : 'camera',
  phone: web ? 'sideways' : 'sensor',
  setup: 'real',
  goal: 0,
  fastTimeout: false,
  readout: true,
};

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
