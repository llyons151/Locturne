import type { MoonDef } from './moon-types';

/**
 * Pure: what the morning payoff shows of the moons this morning brought (payoff-screen.tsx):
 * the first, how many more, and the moon Apply would put on, or null once it's worn. The rare
 * and the secret rise like any other (user, 2026-11-02): the moon coming up is the reveal.
 */
export function payoffMoon({
  newMoons,
  moons,
  worn,
}: {
  newMoons: readonly string[];
  moons: readonly MoonDef[];
  /** The id of the moon being worn. */
  worn: string;
}): { moon: MoonDef | null; more: number; toWear: MoonDef | null } {
  const moon = moons.find((m) => m.id === newMoons[0]) ?? null;
  if (!moon) return { moon: null, more: 0, toWear: null };
  return { moon, more: Math.max(0, newMoons.length - 1), toWear: worn !== moon.id ? moon : null };
}
