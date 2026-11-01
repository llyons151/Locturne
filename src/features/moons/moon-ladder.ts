/**
 * When moons are earned (docs/reports/Moon collection flow.md; decisions, user 2026-11-01).
 * Pure: no React, no storage, no images, so it runs under `npm test`. The store
 * (moon-collection.ts) feeds it the facts and saves what it returns.
 *
 * - The ladder: the first nine at a count of mornings got up (never resets), the tenth (the
 *   Eclipse) on the first morning at least 50 weeks after your first.
 * - The rare moon: 1 in 365 on each morning from your second. Never on a morning that already
 *   gave a ladder moon: a hit then waits for the next morning (user, 2026-11-01).
 * - Limited moons: a morning got up on their date.
 * - The secret moon is earned by steps (`SECRET_STEPS`), checked by the store.
 */

/** Mornings for the ladder's first nine moons, in order (docs/reports/Moon count and unlock pacing.md). */
export const LADDER_MORNINGS = [1, 3, 7, 14, 30, 50, 100, 150, 200] as const;
/** The ladder's tenth moon comes this many days after your first morning: week 50, before the renewal. */
export const ECLIPSE_DAYS = 350;
/** One morning in this many brings the rare moon. */
export const RARE_ODDS = 365;
/** The rare moon can't come on your first morning, which already brings the first moon. */
export const RARE_FROM_MORNING = 2;
/** The secret moon: this many steps from morning start to `SECRET_WINDOW_MS` after you got up. Double the walk. */
export const SECRET_STEPS = 400;
export const SECRET_WINDOW_MS = 20 * 60_000;

/** The rare moon (one of the lab's): changeable here alone. */
export const RARE_MOON = 'ringed';

/** A moon you own: the morning that brought it. */
export type OwnedMoon = {
  id: string;
  /** Its morning's key (`LockState.morningKey`) and number (mornings got up, that one included). */
  morningKey: string;
  morning: number;
  /** When it was earned, in ms. */
  at: number;
  /** Shown on a morning payoff already, so it isn't announced again. */
  presented?: boolean;
  /** Seen in the collection: its "New" goes. */
  seen?: boolean;
};

export type RareState = {
  /** A hit that landed on a ladder morning, waiting for the next morning. */
  due: boolean;
  /** The last morning rolled for, so each morning rolls once. */
  rolled: string | null;
  /** Fixed per install: each morning's roll comes from it and the morning's key, so it can't be rerolled. */
  seed: number;
};

export type LadderFacts = {
  /** The ladder's ids in order: nine by mornings, the Eclipse, then the secret (moon-data.ts `LADDER`). */
  ladder: readonly (string | null)[];
  /** Mornings got up, ever. */
  mornings: number;
  /** The first morning got up, and the latest (the one being settled), as morning keys. */
  firstMorning: string | null;
  latest: string | null;
  owned: Record<string, OwnedMoon>;
  rare: RareState;
  /** Limited moons and the one date each can be earned on. */
  limited: readonly { id: string; date: string }[];
  now: number;
};

/** Whole days from one morning key (YYYY-MM-DD) to another. */
export function daysBetween(from: string, to: string): number {
  const ms = (key: string) => {
    const [y, m, d] = key.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((ms(to) - ms(from)) / 86_400_000);
}

/** A number in [0, 1) from the install's seed and a morning's key (FNV-1a). */
export function rollFor(seed: number, key: string): number {
  let h = 0x811c9dc5;
  for (const ch of `${seed}:${key}`) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h / 0x1_0000_0000;
}

/**
 * Every moon due by now, given what's owned. Safe to run as often as you like: a moon is earned
 * once, and a morning is rolled for once. Returns the new state and the ids earned this time.
 */
export function settleLadder(facts: LadderFacts): { owned: Record<string, OwnedMoon>; rare: RareState; earned: string[] } {
  const { ladder, mornings, firstMorning, latest, limited, now } = facts;
  const owned = { ...facts.owned };
  const rare = { ...facts.rare };
  const earned: string[] = [];
  if (!latest || mornings < 1) return { owned, rare, earned };
  const own = (id: string, morning: number) => {
    if (owned[id]) return;
    owned[id] = { id, morningKey: latest, morning, at: now };
    earned.push(id);
  };

  // A long-time user's first look (or a missed day) catches up every rung at once, each with the morning it stood for.
  LADDER_MORNINGS.forEach((count, i) => {
    const id = ladder[i];
    if (id && mornings >= count) own(id, count);
  });
  const eclipse = ladder[LADDER_MORNINGS.length];
  if (eclipse && firstMorning && daysBetween(firstMorning, latest) >= ECLIPSE_DAYS) own(eclipse, mornings);

  // Did this morning already bring a ladder moon (now, or on an earlier look the same morning)?
  const ladderIds = new Set(ladder.slice(0, LADDER_MORNINGS.length + 1).filter((id): id is string => !!id));
  const ladderToday = Object.values(owned).some((m) => ladderIds.has(m.id) && m.morningKey === latest);

  if (!owned[RARE_MOON]) {
    if (rare.rolled !== latest && mornings >= RARE_FROM_MORNING) {
      rare.rolled = latest;
      if (rollFor(rare.seed, latest) < 1 / RARE_ODDS) rare.due = true;
    }
    if (rare.due && !ladderToday) {
      own(RARE_MOON, mornings);
      rare.due = false;
    }
  }

  for (const moon of limited) if (moon.date === latest) own(moon.id, mornings);
  return { owned, rare, earned };
}

/** What a ladder moon's slot says before it's yours, or null once it is. */
export function ladderNeed(
  index: number,
  facts: { mornings: number; firstMorning: string | null; today: string },
): { left: number; unit: 'morning' | 'week'; at: string } | null {
  if (index < LADDER_MORNINGS.length) {
    const count = LADDER_MORNINGS[index];
    return { left: Math.max(0, count - facts.mornings), unit: 'morning', at: `Morning ${count}` };
  }
  if (index === LADDER_MORNINGS.length) {
    const days = facts.firstMorning ? ECLIPSE_DAYS - daysBetween(facts.firstMorning, facts.today) : ECLIPSE_DAYS;
    return { left: Math.max(0, Math.ceil(days / 7)), unit: 'week', at: 'Week 50' };
  }
  return null;
}
