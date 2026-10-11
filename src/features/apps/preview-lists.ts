import { useSyncExternalStore } from 'react';

import { APPS } from './catalog';

/**
 * The web preview's stand-in lists (there's no Screen Time off iOS), kept outside React so
 * the Apps tab and a list's page (`list-page.tsx`) show and edit the same ones. Limits apply at
 * once: there's no bedtime to wait for.
 */

export type PreviewGroup = 'bedtime' | 'always';
/**
 * `id`: its own, kept for good (its page is `limit-<id>`), so deleting one never moves another's
 * tile or page onto it. `used`: sample minutes so far today, for the meter (an iPhone only learns
 * when a limit is used up). `name`: what the person called it; without one it goes by its apps.
 */
export type PreviewLimit = { id: number; name?: string; minutes: number; used: number; apps: string[] };
type Lists = { picks: Record<PreviewGroup, string[]>; limits: PreviewLimit[] };

const initial = (group: PreviewGroup) =>
  APPS.filter((app) => app.rule === group)
    .map((app) => app.name)
    .sort((a, b) => a.localeCompare(b));

let lists: Lists = {
  picks: { bedtime: initial('bedtime'), always: initial('always') },
  limits: [
    { id: 0, minutes: 30, used: 12, apps: ['Instagram'] },
    { id: 1, minutes: 60, used: 60, apps: ['YouTube', 'Reddit', 'X'] },
  ],
};
let nextId = 2;
const listeners = new Set<() => void>();

function set(next: Lists) {
  lists = next;
  listeners.forEach((listener) => listener());
}

export function usePreviewLists(): Lists {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => lists,
  );
}

/** An app lives in one group: picking it for one takes it out of the other. */
export function savePreviewPicks(group: PreviewGroup, apps: string[]) {
  const picks = { ...lists.picks, [group]: [...apps].sort((a, b) => a.localeCompare(b)) };
  for (const other of ['bedtime', 'always'] as const) {
    if (other !== group) picks[other] = lists.picks[other].filter((app) => !apps.includes(app));
  }
  set({ ...lists, picks });
}

/** A limit's apps; `id` null (or one that's gone) is a new limit, kept only if it has apps. */
export function savePreviewLimitApps(id: number | null, apps: string[]) {
  const { limits } = lists;
  const known = limits.some((l) => l.id === id);
  set({
    ...lists,
    limits: known
      ? limits.map((l) => (l.id === id ? { ...l, apps } : l))
      : apps.length
        ? [...limits, { id: nextId++, minutes: 30, used: 0, apps }]
        : limits,
  });
}

export function setPreviewLimitMinutes(id: number, minutes: number) {
  set({ ...lists, limits: lists.limits.map((l) => (l.id === id ? { ...l, minutes } : l)) });
}

export function setPreviewLimitName(id: number, name: string) {
  const trimmed = name.trim();
  set({
    ...lists,
    limits: lists.limits.map((l) => {
      if (l.id !== id) return l;
      const { name: _old, ...rest } = l;
      return trimmed ? { ...rest, name: trimmed } : rest;
    }),
  });
}

export function removePreviewLimit(id: number) {
  set({ ...lists, limits: lists.limits.filter((l) => l.id !== id) });
}
