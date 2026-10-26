import { useState } from 'react';
import { StyleSheet, View, type StyleProp, type TextStyle } from 'react-native';
import Animated, { Easing, Keyframe, LayoutAnimationConfig, useReducedMotion } from 'react-native-reanimated';

import { Text } from '@/components/text';

const ROLL_MS = 380;

/**
 * A number whose digits roll when it changes, like SwiftUI's numeric text: each digit that
 * changed slides out and its new one slides in, upward when the number grows and downward
 * when it shrinks. Digits that stayed the same don't move. Nothing moves on the first render.
 */
export function RollingCount({ value, size, style }: { value: number; size: number; style: StyleProp<TextStyle> }) {
  const reduced = useReducedMotion();
  const [last, setLast] = useState({ value, up: true });
  if (last.value !== value) setLast({ value, up: value > last.value });

  const chars = `${value}`.split('');
  const travel = size * 0.9 * (last.up ? 1 : -1);
  const enter = new Keyframe({
    0: { opacity: 0, transform: [{ translateY: travel }] },
    100: { opacity: 1, transform: [{ translateY: 0 }], easing: Easing.out(Easing.cubic) },
  }).duration(ROLL_MS);
  const exit = new Keyframe({
    0: { opacity: 1, transform: [{ translateY: 0 }] },
    100: { opacity: 0, transform: [{ translateY: -travel }], easing: Easing.in(Easing.cubic) },
  }).duration(ROLL_MS * 0.7);

  return (
    <LayoutAnimationConfig skipEntering>
      <View style={styles.row}>
        {chars.map((char, i) => (
          // Keyed by place from the right, so the ones digit stays the ones digit as tens arrive.
          <View key={chars.length - i} style={styles.slot}>
            {/* Holds the slot's size; the moving digit lies over it. */}
            <Text style={[style, styles.hidden]}>{char}</Text>
            <Animated.Text key={char} entering={reduced ? undefined : enter} exiting={reduced ? undefined : exit} style={[style, styles.digit]}>
              {char}
            </Animated.Text>
          </View>
        ))}
      </View>
    </LayoutAnimationConfig>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  slot: { overflow: 'hidden' },
  hidden: { opacity: 0, fontVariant: ['tabular-nums'] },
  digit: { position: 'absolute', left: 0, top: 0, fontVariant: ['tabular-nums'] },
});
