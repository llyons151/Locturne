import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { router } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, useWindowDimensions, View, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  LinearTransition,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { Space } from '@/theme';

/**
 * The Sleep sheet's frame, after the user's reference (docs/design-references/sleep-sheet.png):
 * a liquid glass card floating just inside the screen's edges with the phone's round corners, a grabber,
 * and the page dimmed behind it. It slides up on a slow, settling curve with no bounce, follows
 * a downward swipe, and closes on a swipe, a tap outside, or VoiceOver's escape.
 *
 * Built here rather than as a native form sheet so it looks the same in the web preview,
 * where the form sheet was a plain full page.
 */

/** Gap between the card and the screen's edges. */
const INSET = 8;
/** Close to the phone's own corners, minus the inset, so the two curves run parallel. */
const RADIUS = 44;

/**
 * Liquid, as the user asked ("the whole popup should have a liquid feel this extends to the
 * animations"), rising from the bottom ("it should still appear from the bottom not corner"):
 * the card comes up on a soft spring, stretched a little tall like a drop on the way, and
 * settles with one small give, squashing slightly as it lands. It drops away on close.
 */
const OPEN = { damping: 17, stiffness: 170, mass: 0.9 };
const SETTLE = { damping: 20, stiffness: 260 };
const CLOSE = { duration: 300, easing: Easing.bezier(0.5, 0, 0.75, 0) };
/** How far down, or how fast, a swipe has to go to close it. */
const DISMISS_DISTANCE = 120;
const DISMISS_VELOCITY = 900;

let closer: (() => void) | null = null;

/** Closes the open Sleep sheet, pouring it back into the orb (the page's own buttons use it). */
export function closeSleepSheet() {
  if (closer) closer();
  else if (router.canGoBack()) router.back();
}

export function SleepSheet({ children }: { children: ReactNode }) {
  const { width, height } = useWindowDimensions();
  // The card's own size once laid out, so it can start as an orb-sized drop.
  const [size, setSize] = useState({ w: width - INSET * 2, h: height * 0.6 });
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();

  // 0 = off screen below, 1 = open. `drag` is the finger's pull, added on top.
  const shown = useSharedValue(0);
  const drag = useSharedValue(0);
  const closing = useSharedValue(false);

  const leave = () => {
    if (router.canGoBack()) router.back();
  };

  const close = () => {
    'worklet';
    if (closing.get()) return;
    closing.set(true);
    shown.set(withTiming(0, reduced ? { duration: 160 } : CLOSE, (finished) => {
      if (finished) scheduleOnRN(leave);
    }));
  };

  useEffect(() => {
    shown.set(reduced ? withTiming(1, { duration: 200 }) : withSpring(1, OPEN));
    closer = () => close();
    return () => {
      closer = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on open
  }, []);

  const pan = Gesture.Pan()
    .activeOffsetY(8)
    .failOffsetX([-24, 24])
    .onUpdate((e) => {
      // Down follows the finger; up gives a little, like iOS's sheets.
      drag.set(e.translationY > 0 ? e.translationY : e.translationY / 6);
    })
    .onEnd((e) => {
      if (e.translationY > DISMISS_DISTANCE || e.velocityY > DISMISS_VELOCITY) {
        drag.set(withTiming(0, CLOSE));
        close();
      } else {
        drag.set(withSpring(0, SETTLE));
      }
    });

  const scrim = useAnimatedStyle(() => ({
    opacity: interpolate(shown.value, [0, 1], [0, 1], 'clamp') * interpolate(drag.value, [0, 300], [1, 0.4], 'clamp'),
  }));
  const card = useAnimatedStyle(() => {
    if (reduced) return { opacity: shown.value, transform: [{ translateY: drag.value }] };
    // Rising: narrow and tall like a drop; past 1 (the spring's give): wide and short as it
    // lands. A pull down stretches it the same way.
    const v = shown.value;
    const sx = interpolate(v, [0, 1, 1.06], [0.94, 1, 1.015]);
    const sy = interpolate(v, [0, 1, 1.06], [1.05, 1, 0.985]);
    const pull = Math.max(0, drag.value);
    return {
      opacity: interpolate(v, [0, 0.2], [0, 1], 'clamp'),
      transform: [
        { translateY: (1 - v) * (size.h + INSET * 2) + drag.value * 0.85 },
        { scaleX: sx * (1 - pull / 3000) },
        { scaleY: sy * (1 + pull / 1600) },
      ],
    };
  });
  // The contents arrive once the glass has nearly opened, and leave first on close.
  const contents = useAnimatedStyle(() => ({
    opacity: reduced ? 1 : interpolate(shown.value, [0.55, 0.95], [0, 1], 'clamp'),
  }));

  return (
    <View style={styles.root}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, scrim]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => close()} accessibilityLabel="Close" accessibilityRole="button" />
      </Animated.View>
      <GestureDetector gesture={pan}>
        <Animated.View
          layout={reduced ? undefined : LinearTransition.duration(320).easing(Easing.bezier(0.2, 0.9, 0.3, 1))}
          onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
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
          <Animated.View style={contents}>
            <View style={styles.grabber} />
            {children}
          </Animated.View>
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
    // A neutral lift off the page, never a tinted glow.
    shadowColor: '#000000',
    shadowOpacity: 0.5,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 10 },
    overflow: 'hidden',
    // One even, faint edge all round, like iOS's glass sheets.
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    transformOrigin: 'center bottom',
  },
  frost: {
    backgroundColor: 'rgba(28, 32, 44, 0.62)',
    ...Platform.select({ web: { backdropFilter: 'blur(36px) saturate(180%)' } as ViewStyle }),
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 5,
    borderRadius: 3,
    marginTop: 7,
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
  },
});
