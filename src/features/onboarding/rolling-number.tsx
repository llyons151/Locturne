import { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import * as haptic from '@/lib/haptics';
import { Nocturne, NUMBER_FONT } from '@/theme';

const ROLL_MS = 1400;

type Props = {
  /** The value to land on, in half steps (e.g. 7.5). */
  value: number;
  format: (value: number) => string;
  onLanded: (landed: boolean) => void;
  rowHeight?: number;
  fontSize?: number;
};

/**
 * Opal-style reveal: numbers roll up through a one-row window, like an odometer, and
 * land on yours. Only the current number shows, so the landed value stands alone.
 * A tick per step as it slows, a thud when it lands.
 */
export function RollingNumber({ value, format, onLanded, rowHeight = 66, fontSize = 60 }: Props) {
  const reduced = useReducedMotion();
  const steps = Math.max(0, Math.round(value * 2));
  // One row per half step, from zero up to the value.
  const rows = useMemo(() => Array.from({ length: steps + 1 }, (_, i) => i / 2), [steps]);
  const target = steps;
  const position = useSharedValue(reduced ? target : 0);

  useEffect(() => {
    if (reduced || steps === 0) {
      position.value = target;
      onLanded(true);
      return;
    }
    const ease = Easing.out(Easing.cubic);
    position.value = withTiming(target, { duration: ROLL_MS, easing: ease });
    const timers: ReturnType<typeof setTimeout>[] = [];
    // Tick as each row passes the centre: invert ease-out-cubic to find when.
    const tickEvery = Math.max(1, Math.ceil(steps / 14));
    for (let i = 1; i <= steps; i += 1) {
      const t = 1 - Math.cbrt(1 - i / steps);
      timers.push(
        setTimeout(() => {
          if (i === steps) {
            haptic.thud();
            onLanded(true);
          } else if (i % tickEvery === 0) {
            haptic.tick();
          }
        }, Math.round(t * ROLL_MS)),
      );
    }
    return () => timers.forEach(clearTimeout);
  }, [reduced, steps, target, position, onLanded]);

  const reelStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -position.value * rowHeight }],
  }));

  return (
    <View style={[styles.window, { height: rowHeight }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View style={reelStyle}>
        {rows.map((row, i) => (
          <Row key={row} index={i} position={position} height={rowHeight}>
            <Text
              style={[styles.number, { fontSize, lineHeight: rowHeight, height: rowHeight }]}
              maxFontSizeMultiplier={1.2}
            >
              {format(row)}
            </Text>
          </Row>
        ))}
      </Animated.View>
    </View>
  );
}

function Row({
  index,
  position,
  height,
  children,
}: {
  index: number;
  position: SharedValue<number>;
  height: number;
  children: React.ReactNode;
}) {
  const style = useAnimatedStyle(() => {
    const distance = Math.abs(index - position.value);
    return {
      opacity: interpolate(distance, [0, 1, 2], [1, 0.35, 0], 'clamp'),
      transform: [{ scale: interpolate(distance, [0, 1], [1, 0.86], 'clamp') }],
    };
  });
  return <Animated.View style={[{ height }, style]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  window: { overflow: 'hidden', alignSelf: 'stretch' },
  number: {
    ...NUMBER_FONT,
    color: Nocturne.accent ?? Nocturne.text,
    textAlign: 'center',
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
});
