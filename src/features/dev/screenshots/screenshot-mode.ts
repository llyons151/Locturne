import { useSyncExternalStore } from 'react';

/**
 * Dev and preview builds: while on, every dev marking that would show in a screenshot is hidden
 * (Home's FAKE bar, the wake preview's FAKE tags), so a made-up state can be captured as the
 * real app (You → Developer → Screenshot pages, user 2026-11-02). In memory only: a relaunch is real.
 */
let on = false;
const listeners = new Set<() => void>();

export function setScreenshotMode(next: boolean) {
  if (on === next) return;
  on = next;
  listeners.forEach((l) => l());
}

export const isScreenshotMode = () => on;

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => void listeners.delete(l);
};

export const useScreenshotMode = () => useSyncExternalStore(subscribe, isScreenshotMode, isScreenshotMode);
