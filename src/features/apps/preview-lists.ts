import { useSyncExternalStore } from 'react';

import { APPS } from './catalog';

/**
 * The web preview's stand-in lists (there's no Screen Time off iOS), kept outside React so
 * the Apps tab and a list's page (`list-page.tsx`) show and edit the same ones. Limits apply at
 * once: there's no bedtime to wait for.
 */

export type PreviewGroup = 'bedtime' | 'always';
/** `used`: sample minutes so far today, for the meter (an iPhone only learns when a limit is used up). */
export type PreviewLimit = { minutes: number; used: number; apps: string[] };
type Lists = { picks: Record<PreviewGroup, string[]>; limits: PreviewLimit[] };

const initial = (group: PreviewGroup) =>
  APPS.filter((app) => app.rule === group)
    .map((app) => app.name)
    .sort((a, b) => a.localeCompare(b));

let lists: Lists = {
  picks: { bedtime: initial('bedtime'), always: initial('always') },
  limits: [
    { minutes: 30, used: 12, apps: ['Instagram'] },
    { minutes: 60, used: 60, apps: ['YouTube', 'Reddit', 'X'] },
  ],
};
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

/** A limit's apps; an index past the end is a new limit, kept only if it has apps. */
export function savePreviewLimitApps(index: number, apps: string[]) {
  const { limits } = lists;
  set({
    ...lists,
    limits:
      index < limits.length
        ? limits.map((l, i) => (i === index ? { ...l, apps } : l))
        : apps.length
          ? [...limits, { minutes: 30, used: 0, apps }]
          : limits,
  });
}

export function setPreviewLimitMinutes(index: number, minutes: number) {
  set({ ...lists, limits: lists.limits.map((l, i) => (i === index ? { ...l, minutes } : l)) });
}

export function removePreviewLimit(index: number) {
  set({ ...lists, limits: lists.limits.filter((_, i) => i !== index) });
}
