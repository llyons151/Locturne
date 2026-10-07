import { router } from 'expo-router';
import { useEffect, type ReactNode } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  LinearTransition,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { Nocturne, Space } from '@/theme';

/**
 * The Sleep sheet's frame, after the user's reference (docs/design-references/sleep-sheet.png):
 * a card floating just inside the screen's edges with the phone's round corners, a grabber,
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

const OPEN = { duration: 460, easing: Easing.bezier(0.2, 0.9, 0.3, 1) };
const CLOSE = { duration: 280, easing: Easing.bezier(0.4, 0, 1, 1) };
/** How far down, or how fast, a swipe has to go to close it. */
const DISMISS_DISTANCE = 120;
const DISMISS_VELOCITY = 900;

let closer: (() => void) | null = null;

/** Closes the open Sleep sheet with its slide-out (the page's own buttons use it). */
export function closeSleepSheet() {
  if (closer) closer();
  else if (router.canGoBack()) router.back();
}

export function SleepSheet({ children }: { children: ReactNode }) {
  const { height } = useWindowDimensions();
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
    shown.set(withTiming(1, reduced ? { duration: 200 } : OPEN));
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
        // Carry on from where the finger let go.
        shown.set(1 - drag.get() / height);
        drag.set(0);
        close();
      } else {
        drag.set(withTiming(0, OPEN));
      }
    });

  const scrim = useAnimatedStyle(() => ({
    opacity: interpolate(shown.value, [0, 1], [0, 1]) * interpolate(drag.value, [0, 300], [1, 0.4], 'clamp'),
  }));
  const card = useAnimatedStyle(() =>
    reduced
      ? { opacity: shown.value, transform: [{ translateY: drag.value }] }
      : { transform: [{ translateY: (1 - shown.value) * height + drag.value }] },
  );

  return (
    <View style={styles.root}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, scrim]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => close()} accessibilityLabel="Close" accessibilityRole="button" />
      </Animated.View>
      <GestureDetector gesture={pan}>
        <Animated.View
          layout={reduced ? undefined : LinearTransition.duration(320).easing(Easing.bezier(0.2, 0.9, 0.3, 1))}
          style={[styles.card, { bottom: INSET, paddingBottom: Math.max(insets.bottom - INSET, Space.l) }, card]}
          accessibilityViewIsModal
          onAccessibilityEscape={() => close()}
        >
          <View style={styles.grabber} />
          {children}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  scrim: { backgroundColor: 'rgba(0, 0, 0, 0.55)' },
  card: {
    position: 'absolute',
    left: INSET,
    right: INSET,
    maxWidth: 520,
    alignSelf: 'center',
    borderRadius: RADIUS,
    borderCurve: 'continuous',
    backgroundColor: Nocturne.surface,
    borderWidth: 1,
    borderColor: Nocturne.edge,
    // A neutral lift off the page, never a tinted glow.
    shadowColor: '#000000',
    shadowOpacity: 0.5,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 10 },
    overflow: 'hidden',
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
