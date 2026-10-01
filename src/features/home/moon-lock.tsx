import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { tick } from '@/lib/haptics';

/** Moon white for the lock, a shade darker for the shackle, and the night showing through the keyhole. */
const BODY = '#EEF6FB';
const SHACKLE = '#C7D6E6';
const KEYHOLE = '#16254F';

/** How far the open shackle sits above its closed position, as a share of the lock's height. */
const OPEN_LIFT = 0.16;

// Quick and settled, like the tab bar: no wobble at rest.
const SETTLE = { damping: 22, stiffness: 380 };

/**
 * The home screen's lock: it rises into place open, then the shackle drops shut with a
 * click (a light haptic), and the body gives a little under it. Remount it to replay.
 */
export function MoonLock({ size, delay = 0 }: { size: number; delay?: number }) {
  const reduced = useReducedMotion();
  // 0 = hidden, 1 = in place (still open).
  const appear = useSharedValue(reduced ? 1 : 0);
  // 0 = open, 1 = shut.
  const shut = useSharedValue(reduced ? 1 : 0);
  // Dips as the shackle lands.
  const press = useSharedValue(1);

  useEffect(() => {
    if (reduced) return;
    appear.set(withDelay(delay, withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) })));
    shut.set(
      withDelay(
        delay + 520,
        withTiming(1, { duration: 200, easing: Easing.in(Easing.quad) }, (finished) => {
          if (!finished) return;
          scheduleOnRN(tick);
          press.set(withSequence(withTiming(0.95, { duration: 60 }), withSpring(1, SETTLE)));
        }),
      ),
    );
  }, [reduced, delay, appear, shut, press]);

  const height = size * 1.2;

  const lockStyle = useAnimatedStyle(() => ({
    opacity: appear.value,
    transform: [
      { translateY: (1 - appear.value) * size * 0.08 },
      { scale: (0.9 + appear.value * 0.1) * press.value },
    ],
  }));

  const shackleStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -(1 - shut.value) * height * OPEN_LIFT }],
  }));

  return (
    <Animated.View style={[{ width: size, height }, lockStyle]}>
      <Animated.View style={[StyleSheet.absoluteFill, shackleStyle]}>
        <Svg width={size} height={height} viewBox="0 0 100 120">
          <Path
            d="M29 60 V40 A21 21 0 0 1 71 40 V60"
            stroke={SHACKLE}
            strokeWidth={11}
            strokeLinecap="round"
            fill="none"
          />
        </Svg>
      </Animated.View>
      <View style={StyleSheet.absoluteFill}>
        <Svg width={size} height={height} viewBox="0 0 100 120">
          <Rect x={12} y={54} width={76} height={60} rx={16} fill={BODY} />
          <Circle cx={50} cy={79} r={8} fill={KEYHOLE} />
          <Rect x={46} y={81} width={8} height={17} rx={4} fill={KEYHOLE} />
        </Svg>
      </View>
    </Animated.View>
  );
}
