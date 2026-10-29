import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

import type { WakeMethod } from '@/lib/routine';
import { syncLock } from '@/lib/lock-controller';
import { endTestLock, finishRehearsal, getRehearsal, getTestLock, rehearsalHeld, winRehearsal } from '@/lib/screen-time';

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
  /**
   * When the pretend morning began, in ms: a real pedometer counts from here, not from the real
   * morning start, or a test in the afternoon is already 200 steps in (user 2026-10-28).
   */
  since: number;
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
  since: 0,
};

let current = START;
const listeners = new Set<() => void>();

export const getWakePreview = () => current;

export function setWakePreview(change: Partial<WakePreview>) {
  const starts = change.phase === 'morning' && current.phase !== 'morning';
  // A rehearsal's morning counts from its own start (`rehearseTheMorning`).
  current = { ...current, ...change, ...(starts && change.since === undefined && { since: Date.now() }) };
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

/**
 * Drops the test morning without doing the wake-up, and a test lock with it (user 2026-10-28:
 * some of it is just checking the screens). The tab bar's Exit test (app-tabs.tsx).
 */
export function exitTestMorning() {
  if (getTestLock()) endTestLock();
  if (getRehearsal()) endRehearsal();
  setWakePreview({ phase: 'real', won: null });
}

/** When the pretend morning under way began (`since`), or null outside one. */
export const pretendSince = (): Date | null => (current.phase === 'morning' ? new Date(current.since) : null);

/** The method a pretend morning puts on Home, or null to use the routine's. */
export const pretendMethod = (): WakeMethod | null =>
  current.phase !== 'real' && current.method !== 'routine' ? current.method : null;

/**
 * A pretend morning won: nothing is recorded, the preview just moves on to "done". With the
 * method that won it, Home then opens the payoff (/morning-won) with made-up facts.
 */
export const pretendWoke = (method?: WakeMethod) => {
  // You → Test the lock: the bedtime apps really sleep until the test morning on Home is won.
  if (method && getTestLock()) endTestLock();
  // You → Rehearse a night: won in Locturne rather than from the shield.
  if (method && rehearsalHeld(getRehearsal())) {
    winRehearsal();
    syncLock();
  }
  setWakePreview({ phase: 'woke', won: method ? { method, at: Date.now() } : null });
};

/** Ends a rehearsal unwon (You, or Exit test on its morning), then puts the day's shield words back. */
export function endRehearsal() {
  finishRehearsal();
  syncLock();
}

/**
 * A rehearsal night's morning on Home (features/dev/rehearsal): a test morning for its method
 * whose steps count from its morning start, as the shield's do. Winning it wakes the copy
 * (`pretendWoke`).
 */
export function rehearseTheMorning(method: WakeMethod, since: number) {
  setWakePreview({ phase: 'morning', method, since, won: null });
}

/**
 * One tap from You → Developer → UI: a pretend morning at any hour. On a phone the sensors stay
 * as they are, real unless one was faked in /wake-preview (user 2026-10-28: the demo is there to
 * check the real thing works, so a code has to really be scanned). A browser has none of them,
 * so there every "real" one switches to its fake.
 */
export function fakeTheMorning(method: WakePreview['method'] = 'routine') {
  const p = current;
  // A fresh test each tap: its steps count from now (`since`).
  if (!web) {
    setWakePreview({ phase: 'morning', method, since: Date.now() });
    return;
  }
  setWakePreview({
    phase: 'morning',
    method,
    since: Date.now(),
    steps: p.steps === 'real' ? 'walking' : p.steps,
    stairs: p.stairs === 'real' ? 'down' : p.stairs,
    scan: p.scan === 'real' ? 'fake' : p.scan,
    place: p.place === 'real' ? 'walking' : p.place,
  });
  if (getPushupsPreview().scene === 'camera') setPushupsPreview({ scene: 'pushups' });
}
