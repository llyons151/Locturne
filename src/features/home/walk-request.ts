import { useSyncExternalStore } from 'react';

/**
 * A "walk instead" asked for from outside Home (`/wake?method=steps`): the morning it's for, so
 * Home turns that morning into the walk. Kept here rather than in Home's URL, as `/wake` goes
 * back to the tabs already open (`dismissTo`) instead of putting a second Home on top.
 */
let asked: string | null = null;
const listeners = new Set<() => void>();

export function askWalk(morningKey: string | null): void {
  asked = morningKey;
  for (const listener of listeners) listener();
}

export function useWalkRequest(): string | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => asked,
    () => asked,
  );
}
