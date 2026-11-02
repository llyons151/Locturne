import { makeMutable } from 'react-native-reanimated';

/**
 * The moons page's way in (user, 2026-11-01): everything on the tabs fades, Loc pops down, and
 * the black strip under them slides up into the page. These are what the page drives and the
 * tabs read.
 */

/** The tab pages and the strip's buttons: 1 shown, 0 faded for the moons page. */
export const tabsShown = makeMutable(1);

/**
 * The other tabs' pages (not Home, which fades its own pieces): faded with `tabsShown` on the way
 * in, but back at full at once while the page still covers them, so the page drops away off a
 * finished page. Fading them back in as a whole left them half see-through, then popping in, on
 * Routine and Apps (user, 2026-11-02), as Home's did before it got its own fade.
 */
export const tabPagesShown = makeMutable(1);

/**
 * Loc pops down (rather than running off along the edge) while the moons page is up, and pops
 * back up when it goes: `quick` stays on a moment after `away` ends, for his way back.
 */
type LocMoons = { away: boolean; quick: boolean };
let loc: LocMoons = { away: false, quick: false };
let settle: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();
function publish(next: LocMoons) {
  if (next.away === loc.away && next.quick === loc.quick) return;
  loc = next;
  listeners.forEach((listener) => listener());
}
/** Long enough for his pop back up to start (loc-stage.tsx waits a beat before arriving). */
const QUICK_AFTER_MS = 1000;
export const locAway = {
  get: () => loc,
  set(away: boolean) {
    clearTimeout(settle);
    publish({ away, quick: true });
    if (!away) settle = setTimeout(() => publish({ away: false, quick: false }), QUICK_AFTER_MS);
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => void listeners.delete(listener);
  },
};
