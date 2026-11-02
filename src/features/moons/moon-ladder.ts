/**
 * When moons are earned (docs/reports/Moon collection flow.md; decisions, user 2026-11-01).
 * Pure: no React, no storage, no images, so it runs under `npm test`. The store
 * (moon-collection.ts) feeds it the facts and saves what it returns.
 *
 * - The ladder: the first nine at a count of mornings got up (never resets), the tenth (the
 *   Eclipse) on the first morning at least 50 weeks after your first.
 * - The rare moons (RARE_MOONS): each 1 in 365 on each morning from your second, rolled on its own.
 *   At most one lands a morning, never on a morning that already
 *   gave a ladder moon: a hit then waits for the next morning (user, 2026-11-01).
 * - Limited moons: a morning got up on their date.
 * - The secret moons (`SECRET_RULES`, the ladder's last slots) each by one odd thing done on a
 *   morning, checked by the store (`secretsEarned`). Never hinted at in the app (user, 2026-11-02):
 *   finding them out is for people to talk about online.
 */

/** Mornings for the ladder's first nine moons, in order (docs/reports/Moon count and unlock pacing.md). */
export const LADDER_MORNINGS = [1, 3, 7, 14, 30, 50, 100, 150, 200] as const;
/** The ladder's tenth moon comes this many days after your first morning: week 50, before the renewal. */
export const ECLIPSE_DAYS = 350;
/** One morning in this many brings the rare moon. */
export const RARE_ODDS = 365;
/** The rare moon can't come on your first morning, which already brings the first moon. */
export const RARE_FROM_MORNING = 2;
/**
 * The secret moons, in the order of their slots after the Eclipse (user, 2026-11-02):
 * - `early`: got up before `EARLY_HOUR` (by the wake-up's own clock time).
 * - `coke`: a scan morning whose code is a Coca-Cola product's barcode (`isCokeBarcode`).
 * - `far`: a place morning that started at least `FAR_M` from the place, by the live location
 *   Home showed that morning (`noteFarthest` in the store).
 */
export type SecretRule = 'early' | 'coke' | 'far';
export const SECRET_RULES: readonly SecretRule[] = ['early', 'coke', 'far'];
export const EARLY_HOUR = 5;
export const FAR_M = 2000;
/** Where the secret moons' slots start in the ladder: after the nine by mornings and the Eclipse. */
export const SECRET_FROM = 10;

/**
 * Coca-Cola's company prefixes, as they start a product's barcode once it's written out as
 * 13 digits (UPC-A gets a leading 0, UPC-E is expanded first): the US and Canada (049000,
 * 067000), Europe (5449000), the UK (5000112), Japan (4902102), Mexico (7501055).
 */
const COKE_PREFIXES = ['0049000', '0067000', '5449000', '5000112', '4902102', '7501055'];

/** A UPC-E code (8 digits) written out as its 12-digit UPC-A. */
function expandUpcE(code: string): string | null {
  if (!/^[01]\d{7}$/.test(code)) return null;
  const [ns, d1, d2, d3, d4, d5, d6, check] = code;
  const body =
    d6 <= '2' ? `${d1}${d2}${d6}0000${d3}${d4}${d5}`
    : d6 === '3' ? `${d1}${d2}${d3}00000${d4}${d5}`
    : d6 === '4' ? `${d1}${d2}${d3}${d4}00000${d5}`
    : `${d1}${d2}${d3}${d4}${d5}0000${d6}`;
  return `${ns}${body}${check}`;
}

/** Pure: whether a scanned barcode is a Coca-Cola product's (any can or bottle they make). */
export function isCokeBarcode(data: string, type = ''): boolean {
  const digits = data.trim();
  if (!/^\d+$/.test(digits)) return false;
  const upcE = digits.length === 8 && (type === 'upc_e' || digits[0] === '0') ? expandUpcE(digits) : null;
  const ean = digits.length === 13 ? digits : digits.length === 12 ? `0${digits}` : upcE ? `0${upcE}` : null;
  return !!ean && COKE_PREFIXES.some((prefix) => ean.startsWith(prefix));
}

/** Pure: metres between two points on the Earth (haversine). */
export function metresBetween(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** What a morning's wake-up did, for the secret moons. */
export type SecretFacts = {
  /** The wake-up's method (a pass or an emergency never gets this far). */
  kind: string;
  /** When you got up, in local clock time. */
  hour: number;
  /** The scan morning's code: the one it must have matched. */
  scanned: { data: string; type: string } | null;
  /** The farthest Home saw you from the place that morning, in metres; null when it never saw you. */
  farthest: number | null;
};

/** Pure: which secret rules one morning's wake-up meets. */
export function secretsMet(f: SecretFacts): SecretRule[] {
  const met: SecretRule[] = [];
  if (f.hour < EARLY_HOUR) met.push('early');
  if (f.kind === 'scan' && f.scanned && isCokeBarcode(f.scanned.data, f.scanned.type)) met.push('coke');
  if (f.kind === 'place' && f.farthest !== null && f.farthest >= FAR_M) met.push('far');
  return met;
}

/**
 * The rare moons, each its own 1 in 365 (Blue Moon added, user 2026-11-02). Written by the moon studio's
 * bake (tools/moon-lab/bake.py, from moons.json's `rare`); the first rolls on the morning's key alone (as the
 * single rare moon always did), the rest on the key and their id.
 */
export const RARE_MOONS: readonly string[] = ['bluemoon', 'ringed'];
/** Whether an id is one of the rare moons. */
export const isRare = (id: string) => RARE_MOONS.includes(id);

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
  /**
   * Rare moons rolled but not yet given (a hit on a ladder morning, or a second hit the same morning),
   * in the order they'll come. Older installs saved `true` / `false`, meaning the first rare moon.
   */
  due: readonly string[] | boolean;
  /** The last morning rolled for, so each morning rolls once. */
  rolled: string | null;
  /** Fixed per install: each morning's roll comes from it and the morning's key, so it can't be rerolled. */
  seed: number;
};

export type LadderFacts = {
  /** The ladder's ids in order: nine by mornings, the Eclipse, then the secrets (moon-data.ts `LADDER`). */
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
  /** The rare moons, each its own 1 in 365; RARE_MOONS unless given (tests pass their own). */
  rareMoons?: readonly string[];
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
  const { ladder, mornings, firstMorning, latest, limited, now, rareMoons = RARE_MOONS } = facts;
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

  // Each rare moon not yet yours rolls once a morning; hits queue, and one lands per morning that isn't a ladder morning.
  let due = (rare.due === true ? [rareMoons[0]] : rare.due === false ? [] : [...rare.due]).filter((id) => id && rareMoons.includes(id) && !owned[id]);
  if (rare.rolled !== latest && mornings >= RARE_FROM_MORNING && rareMoons.some((id) => !owned[id])) {
    rare.rolled = latest;
    rareMoons.forEach((id, i) => {
      if (owned[id] || due.includes(id)) return;
      if (rollFor(rare.seed, i === 0 ? latest : `${latest}:${id}`) < 1 / RARE_ODDS) due.push(id);
    });
  }
  // Never two rare moons on one morning: settling again the same morning (the payoff settles on
  // every render) leaves the next one waiting for a later morning.
  const rareToday = Object.values(owned).some((m) => rareMoons.includes(m.id) && m.morningKey === latest);
  if (due.length && !ladderToday && !rareToday) {
    own(due[0], mornings);
    due = due.slice(1);
  }
  rare.due = due;

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
