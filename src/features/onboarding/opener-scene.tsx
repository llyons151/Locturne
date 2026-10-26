import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

/**
 * Stars as shares of the screen (x, y) and their size in points. Kept to the dark sky: above
 * and beside the moon, clear of Exit, never on the clouds at the bottom.
 */
const STARS: [number, number, number][] = [
  [0.08, 0.06, 1.5],
  [0.22, 0.12, 2],
  [0.41, 0.05, 1.5],
  [0.63, 0.1, 1.5],
  [0.74, 0.04, 2],
  [0.92, 0.15, 1.5],
  [0.12, 0.21, 1.5],
  [0.86, 0.26, 2],
  [0.05, 0.33, 2],
  [0.95, 0.38, 1.5],
  [0.31, 0.02, 1],
  [0.55, 0.16, 1],
  [0.17, 0.42, 1],
  [0.81, 0.45, 1],
];

/**
 * Leaving the opener, each star drops a short way and fades as it goes: how long that takes,
 * how far it gets, and the most a star waits before it goes.
 */
const FALL_MS = 850;
const FALL_DIST = 70;
const FALL_STAGGER_MS = 400;

/**
 * What the opener adds over the onboarding sky: faint stars that twinkle out of step. Drawn
 * by the flow between the sky and the page, shown while `hello` is up. Leaving it, they fall
 * off the bottom of the screen, a few at a time (user, 2026-10-26); coming back, they fade in.
 */
export function OpenerScene({ shown }: { shown: boolean }) {
  const { width, height } = useWindowDimensions();
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {STARS.map(([x, y, size], i) => (
        <Star key={i} left={x * width} top={y * height} size={size} seed={i} shown={shown} />
      ))}
    </View>
  );
}

/** One star: a plain dot that slowly brightens and dims, each on its own beat, and falls when hidden. */
function Star({ left, top, size, seed, shown }: { left: number; top: number; size: number; seed: number; shown: boolean }) {
  const reduced = useReducedMotion();
  // Faint: barely there at their dimmest, never more than half lit (user, 2026-10-26).
  const dim = 0.06 + (seed % 3) * 0.04;
  const bright = 0.25 + (seed % 4) * 0.07;
  const shine = useSharedValue(dim);
  // 0..1: there or not, and how far through its fall. The fall moves the outer view, so it doesn't fight the twinkle on the dot.
  const there = useSharedValue(0);
  const fallen = useSharedValue(0);
  // A little farther for some than others, so they don't move as one.
  const dist = FALL_DIST * (0.8 + (seed % 4) * 0.12);

  useEffect(() => {
    if (reduced) {
      shine.value = (dim + bright) / 2;
      return;
    }
    // Out of step: each star waits a different while, and breathes at a different pace.
    const half = 1800 + ((seed * 7) % 9) * 260;
    const ease = Easing.inOut(Easing.sin);
    shine.value = withDelay(
      (seed * 530) % 2400,
      withRepeat(withSequence(withTiming(bright, { duration: half, easing: ease }), withTiming(dim, { duration: half, easing: ease })), -1),
    );
  }, [reduced, shine, dim, bright, seed]);

  useEffect(() => {
    if (shown) {
      fallen.value = 0;
      there.value = withTiming(1, { duration: 700 });
      return;
    }
    if (reduced) {
      there.value = withTiming(0, { duration: 300 });
      return;
    }
    // Off quick and slowing, fading the whole way, then put back in place out of sight.
    const delay = (seed * 97) % FALL_STAGGER_MS;
    fallen.value = withSequence(
      withDelay(delay, withTiming(1, { duration: FALL_MS, easing: Easing.out(Easing.quad) })),
      withTiming(0, { duration: 0 }),
    );
    there.value = withDelay(delay, withTiming(0, { duration: FALL_MS, easing: Easing.in(Easing.quad) }));
  }, [shown, reduced, seed, there, fallen]);

  const fall = useAnimatedStyle(() => ({
    opacity: there.value,
    transform: [{ translateY: dist * fallen.value }],
  }));
  const twinkle = useAnimatedStyle(() => ({ opacity: shine.value }));
  return (
    <Animated.View style={[styles.star, { left, top }, fall]}>
      <Animated.View style={[styles.dot, { width: size, height: size, borderRadius: size / 2 }, twinkle]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  star: { position: 'absolute' },
  dot: { backgroundColor: '#FFFFFF' },
});
