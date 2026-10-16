import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

import type { WakeMethod } from '@/lib/routine';

import { getPushupsPreview, setPushupsPreview } from './pushups-preview';

/**
 * The wake preview's settings (/wake-preview, You → Developer): a pretend morning at any hour,
 * and a fake stand-in for each wake-up method's sensor or native view, so the REAL morning
 * screens can be opened and laid out in a browser (`npx expo start`, press w) or a dev build
 * without walking, stairs, a printed code or a trip to the gym. Push-ups' own fakes live in
 * pushups-preview.ts. Kept in memory; a reload starts from the defaults.
 *
 * Every fake is named "Fake …" in the controls, so it's always clear what's real.
 * docs/WAKE_PREVIEW.md has the map.
 */
export type WakePreview = {
  /**
   * `real`: the lock as it is. `morning`: every screen that reads the lock (`useLock`) sees a
   * morning still to prove, so Home offers its button and every morning screen runs; a pass
   * records nothing and moves no shields, and turns this to `woke`. `woke`: that morning done.
   */
  phase: 'real' | 'morning' | 'woke';
  /** The wake-up Home's pretend morning shows: the routine's, or this one whatever the routine says. */
  method: 'routine' | WakeMethod;
  /** The pedometer (expo-sensors) behind Walk steps. */
  steps: 'real' | 'walking' | 'halfway' | 'done' | 'still' | 'denied' | 'unavailable';
  /** The barometer (expo-sensors CMAltimeter) behind Go downstairs. */
  stairs: 'real' | 'down' | 'up' | 'short' | 'still' | 'flat' | 'noSignal' | 'denied' | 'unavailable';
  /** The barcode camera (expo-camera CameraView) behind Scan a code. */
  scan: 'real' | 'fake' | 'ask' | 'denied';
  /** The location read (expo-location) behind Get to a place. */
  place: 'real' | 'walking' | 'there' | 'notThere' | 'unsure' | 'slow' | 'denied' | 'imprecise' | 'off' | 'failed';
  /** In a pretend morning with no code or place set up, use a made-up one instead of "There is no code". */
  standIns: boolean;
  /** The pretend morning just won, and with what: Home opens the payoff for it, made up. */
  won: { method: WakeMethod; at: number } | null;
};

// A browser has none of the sensors, so the fakes start on there; a phone starts real.
const web = Platform.OS === 'web';
const START: WakePreview = {
  phase: 'real',
  method: 'routine',
  steps: web ? 'walking' : 'real',
  stairs: web ? 'down' : 'real',
  scan: web ? 'fake' : 'real',
  place: web ? 'walking' : 'real',
  standIns: true,
  won: null,
};

let current = START;
const listeners = new Set<() => void>();

export const getWakePreview = () => current;

export function setWakePreview(change: Partial<WakePreview>) {
  current = { ...current, ...change };
  listeners.forEach((l) => l());
}

export const resetWakePreview = () => setWakePreview(START);

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const useWakePreview = () => useSyncExternalStore(subscribe, getWakePreview, getWakePreview);

/** The phase a pretend morning shows, or null when it's the real one. */
export function pretendPhase(): 'morning' | 'day' | null {
  const { phase } = current;
  return phase === 'real' ? null : phase === 'morning' ? 'morning' : 'day';
}

/** The method a pretend morning puts on Home, or null to use the routine's. */
export const pretendMethod = (): WakeMethod | null =>
  current.phase !== 'real' && current.method !== 'routine' ? current.method : null;

/**
 * A pretend morning won: nothing is recorded, the preview just moves on to "done". With the
 * method that won it, Home then opens the payoff (/morning-won) with made-up facts.
 */
export const pretendWoke = (method?: WakeMethod) =>
  setWakePreview({ phase: 'woke', won: method ? { method, at: Date.now() } : null });

/**
 * One tap from You → Developer → UI: a pretend morning with every sensor faked (a fake already
 * picked in /wake-preview is kept; only "real" ones switch), so each morning screen can be seen
 * on the phone at any hour, without walking, stairs, a code, a trip or a set of push-ups.
 */
export function fakeTheMorning(method: WakePreview['method'] = 'routine') {
  const p = current;
  setWakePreview({
    phase: 'morning',
    method,
    steps: p.steps === 'real' ? 'walking' : p.steps,
    stairs: p.stairs === 'real' ? 'down' : p.stairs,
    scan: p.scan === 'real' ? 'fake' : p.scan,
    place: p.place === 'real' ? 'walking' : p.place,
  });
  if (getPushupsPreview().scene === 'camera') setPushupsPreview({ scene: 'pushups' });
}
