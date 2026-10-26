import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** How far a pressed control gives under the finger. */
const PRESSED_SCALE = 0.97;

/**
 * A Pressable that gives a little under the finger and springs back on release, instead of
 * dimming (docs/DUOLINGO_MOTION.md: Duolingo pushes its buttons down; this is the native idiom).
 * Takes a plain style, not a `({ pressed }) => style` function.
 */
export function PressScale({
  style,
  onPressIn,
  onPressOut,
  ...props
}: Omit<PressableProps, 'style'> & { style?: StyleProp<ViewStyle> }) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const scaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <AnimatedPressable
      {...props}
      onPressIn={(e) => {
        scale.set(reduced ? PRESSED_SCALE : withTiming(PRESSED_SCALE, { duration: 90, easing: Easing.out(Easing.quad) }));
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.set(reduced ? 1 : withSpring(1, { damping: 14, stiffness: 320 }));
        onPressOut?.(e);
      }}
      style={[style, scaleStyle]}
    />
  );
}
