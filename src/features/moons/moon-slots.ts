'use no memo';
// Reads the App Group stores (the mornings), which change outside React.

import { readLock } from '@/lib/lock-controller';
import { getFirstMorning, getMorningsWon } from '@/lib/morning-proof';

import { isSecret, LIMITED } from './moon-collection';
import { LADDER, MOONS } from './moon-data';
import type { OwnedMoon } from './moon-ladder';
import { ladderNeed, RARE_MOONS } from './moon-ladder';
import { DEFAULT_MOON } from './moon-theme';
import type { MoonDef } from './moon-types';

const BY_ID = new Map(MOONS.map((m) => [m.id, m]));

export type MoonSlot = {
  moon: MoonDef;
  owned: boolean;
  /** A locked moon's one line instead of its name: "Morning 3", "Week 50" (user, 2026-11-02: no name till it's yours). */
  title?: string;
  /** A locked ladder moon: how many mornings (or weeks) are left. */
  left?: number;
  unit?: 'morning' | 'week';
  secret?: boolean;
};

/**
 * Every moon slot, in the collection's order (docs/reports/Moon collection flow.md): Moonlight, the
 * ladder in order with the secret's "?", then rare and limited moons only once yours (nothing you can
 * miss ever sits there empty). Shared by the Moons page and the moon wheel.
 */
export function moonSlots(owned: Record<string, OwnedMoon>): { main: MoonSlot[]; extras: MoonSlot[] } {
  const mornings = getMorningsWon();
  const today = readLock().morningKey;
  const firstMorning = getFirstMorning();
  const ladder = LADDER.flatMap((id, i): MoonSlot[] => {
    const moon = id ? BY_ID.get(id) : undefined;
    if (!id || !moon) return [];
    if (owned[id]) return [{ moon, owned: true }];
    if (isSecret(id)) return [{ moon, owned: false, secret: true }];
    const need = ladderNeed(i, { mornings, firstMorning, today });
    return [{ moon, owned: false, title: need?.at, left: need?.left, unit: need?.unit }];
  });
  const extras = [...RARE_MOONS, ...LIMITED.map((l) => l.id)].flatMap((id): MoonSlot[] => {
    const moon = BY_ID.get(id);
    return moon && owned[id] ? [{ moon, owned: true }] : [];
  });
  return { main: [{ moon: DEFAULT_MOON, owned: true }, ...ladder], extras };
}

/** The words a slot shows under it: its name once yours, else when it comes, never the name. */
export function slotLabel(slot: MoonSlot): string {
  if (slot.owned) return slot.moon.name;
  return slot.secret ? 'Secret moon' : (slot.title ?? 'Locked');
}
