import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { router } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, useWindowDimensions, View, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { recede } from '@/components/recede';
import { Space } from '@/theme';

/**
 * The Sleep sheet's frame, the shape of the user's reference (docs/design-references/sleep-sheet.png):
 * a card floating just inside the screen's edges with the phone's round corners, a grabber, and
 * the page dimmed behind it. In liquid glass and the app's colours, as the user asked ("it
 * should still be liquid glass and have the color scheme of my app").
 *
 * Motion is one value, `offset`: how far below its resting place the card sits, in points.
 * Opening springs it up from below; dragging moves it with the finger; letting go hands the
 * finger's speed to the spring, so a flick carries straight on off the screen with no stall
 * ("when you swipe off of it the animation to close is kinda janky"). The dimming follows it,
 * and so does the page behind, which shrinks back a little as the card rises (components/recede.tsx).
 *
 * Built here rather than as a native form sheet so it looks the same in the web preview.
 */

/** Gap between the card and the screen's edges. */
const INSET = 8;
/** Close to the phone's own corners, minus the inset, so the two curves run parallel. */
const RADIUS = 44;

/** Up: a soft spring that settles without a wobble. */
const OPEN = { damping: 28, stiffness: 240, mass: 1 };
/** Back to rest after a short pull. */
const SETTLE = { damping: 30, stiffness: 320, mass: 1 };
/** Off the bottom: firm, never bouncing back, carrying the flick's speed. */
const CLOSE = { damping: 30, stiffness: 260, mass: 1, overshootClamping: true };
/** How far down, or how fast, a swipe has to go to close it. */
const DISMISS_DISTANCE = 110;
const DISMISS_VELOCITY = 700;

let closer: (() => void) | null = null;

/** Closes the open Sleep sheet with its slide down (the page's own buttons use it). */
export function closeSleepSheet() {
  if (closer) closer();
  else if (router.canGoBack()) router.back();
}

export function SleepSheet({ children }: { children: ReactNode }) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  // The card's height once laid out: "fully closed" is this far down, plus the gap.
  const [cardHeight, setCardHeight] = useState(height * 0.7);
  const hidden = cardHeight + INSET * 2;

  // Points below the resting place. Starts off screen.
  const offset = useSharedValue(height);
  const closing = useSharedValue(false);

  const leave = () => {
    if (router.canGoBack()) router.back();
  };

  const close = (velocity = 0) => {
    'worklet';
    if (closing.get()) return;
    closing.set(true);
    const done = (finished?: boolean) => {
      'worklet';
      if (finished) scheduleOnRN(leave);
    };
    offset.set(
      reduced
        ? withTiming(hidden, { duration: 180 }, done)
        : withSpring(hidden, { ...CLOSE, velocity: Math.max(velocity, 0) }, done),
    );
  };

  useEffect(() => {
    offset.set(reduced ? withTiming(0, { duration: 200 }) : withSpring(0, OPEN));
    closer = () => close();
    return () => {
      closer = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on open
  }, []);

  // The page behind steps back as the card comes up, and forward as it goes.
  useAnimatedReaction(
    () => interpolate(offset.value, [0, hidden], [1, 0], 'clamp'),
    (open) => recede.set(open),
  );
  useEffect(() => () => recede.set(0), []);

  const pan = Gesture.Pan()
    .activeOffsetY(6)
    .failOffsetX([-24, 24])
    .onUpdate((e) => {
      if (closing.get()) return;
      // Down follows the finger exactly; up resists, like iOS's sheets.
      offset.set(e.translationY > 0 ? e.translationY : -Math.sqrt(-e.translationY) * 2);
    })
    .onEnd((e) => {
      if (closing.get()) return;
      if (e.translationY > DISMISS_DISTANCE || e.velocityY > DISMISS_VELOCITY) close(e.velocityY);
      else offset.set(withSpring(0, { ...SETTLE, velocity: e.velocityY }));
    });

  const scrim = useAnimatedStyle(() => ({
    opacity: interpolate(offset.value, [0, hidden], [1, 0], 'clamp'),
  }));
  const card = useAnimatedStyle(() => ({ transform: [{ translateY: offset.value }] }));

  return (
    <View style={styles.root}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, scrim]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => close()} accessibilityLabel="Close" accessibilityRole="button" />
      </Animated.View>
      <GestureDetector gesture={pan}>
        <Animated.View
          onLayout={(e) => setCardHeight(e.nativeEvent.layout.height)}
          style={[styles.card, { bottom: INSET, paddingBottom: Math.max(insets.bottom - INSET, Space.l) }, card]}
          accessibilityViewIsModal
          onAccessibilityEscape={() => close()}
        >
          {/* Apple's liquid glass on iOS 26; elsewhere a frosted pane that blurs the page behind. */}
          {isLiquidGlassAvailable() ? (
            <GlassView glassEffectStyle="regular" colorScheme="dark" style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.frost]} />
          )}
          <View style={styles.grabber} />
          {children}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  // Light enough that the glass has the page to blur.
  scrim: { backgroundColor: 'rgba(0, 0, 0, 0.3)' },
  card: {
    position: 'absolute',
    left: INSET,
    right: INSET,
    maxWidth: 520,
    alignSelf: 'center',
    borderRadius: RADIUS,
    borderCurve: 'continuous',
    // One even, faint edge all round, like iOS's glass sheets.
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    // A neutral lift off the page, never a tinted glow.
    shadowColor: '#000000',
    shadowOpacity: 0.4,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    overflow: 'hidden',
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 3,
    marginTop: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
  },
  frost: {
    backgroundColor: 'rgba(22, 28, 44, 0.66)',
    ...Platform.select({ web: { backdropFilter: 'blur(36px) saturate(180%)' } as ViewStyle }),
  },
});
