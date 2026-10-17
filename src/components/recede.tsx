import { useFocusEffect } from 'expo-router';
import { useCallback, type PropsWithChildren } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import Animated, { interpolate, makeMutable, useAnimatedStyle, withSequence, withTiming } from 'react-native-reanimated';

/**
 * How far a sheet is open over the page, 0 (closed) to 1 (fully up). The Sleep sheet drives it
 * from its own slide, so the page shrinks as the card rises, follows a drag, and grows back as it
 * leaves (features/nap/sleep-sheet.tsx).
 */
export const recede = makeMutable(0);

/** Points taken off the page's width when a sheet is fully up (vaul's WINDOW_TOP_OFFSET). */
const SHRINK = 26;
/** Corners the shrunken page gets, running parallel to the phone's own. */
const RADIUS = 44;

/**
 * The page stepping back behind an open sheet: it shrinks a little and rounds its corners, the
 * way iOS page sheets and vaul's `shouldScaleBackground` drawers do. The user asked for it: "when
 * i open this up the background should zoom out a little bit". It goes inside the background, so
 * the sky stays full size around the shrunken page instead of black edges ("i want the blue and
 * stuff to still be there").
 */
export function Recede({ children }: PropsWithChildren) {
  const { width } = useWindowDimensions();
  const scale = (width - SHRINK) / width;
  // Back on the tabs with no sheet over them, the page is full size again, from a fresh update.
  // On iPhone it once stayed shrunk after the Sleep sheet closed, the nav strip pulled in from
  // the sky's edges (user's screenshot, 2026-10-16). The likely cause, unconfirmed on a phone:
  // Reanimated hands a style that has sat still back to React
  // (FORCE_REACT_RENDER_FOR_SETTLED_ANIMATIONS), so React held the shrunk one from while the
  // sheet was up, and the hand-back after it closed went missing. A real change here gets
  // handed back again. Invisible: a hair of a shrink, gone in a frame or two.
  useFocusEffect(
    useCallback(() => {
      recede.set(withSequence(withTiming(0.001, { duration: 16 }), withTiming(0, { duration: 16 })));
    }, []),
  );
  const page = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(recede.value, [0, 1], [1, scale], 'clamp') }],
    borderRadius: interpolate(recede.value, [0, 1], [0, RADIUS], 'clamp'),
  }));
  return (
    <Animated.View style={[styles.page, page]}>{children}</Animated.View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, overflow: 'hidden', borderCurve: 'continuous' },
});
