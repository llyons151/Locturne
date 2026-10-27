import { Image } from 'expo-image';
import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { FROST_PAD, OPENER_GLOW, openerMoonDisc } from '@/components/night-sky';

/**
 * The moon rises alongside the opener's lines (steps.tsx, `OPENER_LINE_MS`) rather than after
 * them, with the landing page's timing and curve (locturne_landing global.css, `moon-intro`).
 */
const RISE_AFTER_MS = 150;
const RISE_MS = 1800;
/** moon-glow.png: the moon's disc is half the image's width. */
const GLOW_PAD = 2;

/**
 * A fresh launch: the opener's text comes in line by line over the starry sky, then the moon
 * rises from below the screen into its place up top (user, 2026-10-26). It's the same moon and
 * faint glow as NightSky's opener moon, which hides its own until then (`moonless`), so the
 * hand-off doesn't show. Drawn behind the page, so it passes under the text on the way up.
 */
export function Intro({ onDone }: { onDone: () => void }) {
  const { width, height } = useWindowDimensions();
  const reduced = useReducedMotion();
  const end = openerMoonDisc(width, height);
  const box = end.r * 2 * FROST_PAD;
  // From just under the bottom edge to its place.
  const below = height - (end.cy - box / 2);
  const rise = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    // Reduced motion: already in place, so this only hands over.
    rise.value = withDelay(
      reduced ? 0 : RISE_AFTER_MS,
      withTiming(1, { duration: reduced ? 0 : RISE_MS, easing: Easing.bezier(0.7, 0, 0.18, 1) }, (finished) => {
        if (finished) runOnJS(onDone)();
      }),
    );
  }, [reduced, rise, onDone]);

  const moonStyle = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - rise.value) * below }] }));

  const glow = end.r * 2 * GLOW_PAD;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View style={[styles.moon, { left: end.cx - box / 2, top: end.cy - box / 2, width: box, height: box }, moonStyle]}>
        <View style={{ position: 'absolute', left: (box - glow) / 2, top: (box - glow) / 2, width: glow, height: glow, opacity: OPENER_GLOW }}>
          <Image source={require('@/assets/onboarding/moon-glow.png')} style={styles.fill} contentFit="contain" accessible={false} />
        </View>
        <Image source={require('@/assets/onboarding/moon-frosted.png')} style={styles.fill} contentFit="contain" accessible={false} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  moon: { position: 'absolute' },
  fill: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
});
