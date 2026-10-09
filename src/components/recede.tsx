import type { PropsWithChildren } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { interpolate, makeMutable, useAnimatedStyle } from 'react-native-reanimated';

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
 * The page stepping back behind an open sheet: it shrinks a little and rounds its corners over
 * black, the way iOS page sheets and vaul's `shouldScaleBackground` drawers do. The user asked
 * for it: "when i open this up the background should zoom out a little bit".
 */
export function Recede({ children }: PropsWithChildren) {
  const { width } = useWindowDimensions();
  const scale = (width - SHRINK) / width;
  const page = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(recede.value, [0, 1], [1, scale], 'clamp') }],
    borderRadius: interpolate(recede.value, [0, 1], [0, RADIUS], 'clamp'),
  }));
  return (
    <View style={styles.black}>
      <Animated.View style={[styles.page, page]}>{children}</Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  black: { flex: 1, backgroundColor: '#000000' },
  page: { flex: 1, overflow: 'hidden', borderCurve: 'continuous' },
});
