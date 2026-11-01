import type { MoonDef } from './moon-types';

/**
 * Pure: what the morning payoff shows of the moons this morning brought (payoff-screen.tsx):
 * the first, how many more, whether it's hidden until tapped (the rare and the secret), and the
 * moon "Wear" would put on, or null once it's worn or while it's hidden.
 */
export function payoffMoon({
  newMoons,
  moons,
  worn,
  revealed,
  surprises,
}: {
  newMoons: readonly string[];
  moons: readonly MoonDef[];
  /** The id of the moon being worn. */
  worn: string;
  /** Tapped open (only matters for a surprise). */
  revealed: boolean;
  /** Ids that open with a tap: the rare and the secret. */
  surprises: readonly (string | null)[];
}): { moon: MoonDef | null; more: number; hidden: boolean; toWear: MoonDef | null } {
  const moon = moons.find((m) => m.id === newMoons[0]) ?? null;
  if (!moon) return { moon: null, more: 0, hidden: false, toWear: null };
  const hidden = surprises.includes(moon.id) && !revealed;
  return { moon, more: Math.max(0, newMoons.length - 1), hidden, toWear: !hidden && worn !== moon.id ? moon : null };
}
