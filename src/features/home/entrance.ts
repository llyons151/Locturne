import { useEffect } from 'react';
import {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { HOME_RISE_MS } from '@/components/night-sky';

/** A strong ease-out: quick to arrive, long soft landing. Never ease-in on UI. */
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

/** Everything starts once the moon is about a third of the way up. */
const START_MS = HOME_RISE_MS * 0.35;
/** The one movement, and the moment every piece is fully in. */
const DURATION_MS = 800;
/** How far the middle rises into place, in points. Small: it settles, it doesn't fly. */
const RISE = 16;
/** Each piece starts fading in this much after the one above it… */
const STAGGER_MS = 55;
/** …and all of them finish together, at the end of the movement. */

/** Fades piece `step` in once, ending with everything else. */
function usePiece(step: number) {
  const opacity = useSharedValue(0);
  useEffect(() => {
    const offset = step * STAGGER_MS;
    opacity.value = withDelay(START_MS + offset, withTiming(1, { duration: DURATION_MS - offset, easing: EASE_OUT }));
  }, [opacity, step]);
  return useAnimatedStyle(() => ({ opacity: opacity.value }));
}

/**
 * Home's entrance, played once when Home mounts (launch, or back from onboarding), not on
 * every tab switch.
 *
 * One movement: the middle of Home (`group`: moon, headline, line, button) rises as a single
 * block on one curve. The top (mornings, screen time, the week) doesn't move; it only fades in
 * (user's ask, October 8, 2026). The fade is staggered (`piece`), top to bottom, and every fade
 * ends on the frame the movement stops.
 *
 * Plain animated styles, not Reanimated's `entering` animations: on web those replayed when a
 * tab came back into view and left the piece `position: absolute`, pushing the top of Home
 * off by the page padding (October 8, 2026).
 *
 * Reduce Motion keeps the fades and drops the movement.
 */
export function useEntrance() {
  const reduced = useReducedMotion();
  const rise: SharedValue<number> = useSharedValue(reduced ? 0 : RISE);
  useEffect(() => {
    rise.value = withDelay(START_MS, withTiming(0, { duration: DURATION_MS, easing: EASE_OUT }));
  }, [rise]);
  const group = useAnimatedStyle(() => ({ transform: [{ translateY: rise.value }] }));

  // One per piece, top to bottom: the stat pills, the week, the moon, the headline, the line,
  // the button.
  const pieces = [usePiece(0), usePiece(1), usePiece(2), usePiece(3), usePiece(4), usePiece(5)];
  const piece = (step: number) => pieces[step];

  return { group, piece };
}

export type Entrance = ReturnType<typeof useEntrance>['piece'];
