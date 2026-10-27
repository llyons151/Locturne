import { StyleSheet, View, type StyleProp, type TextStyle } from 'react-native';
import Animated, { Easing, Keyframe, LayoutAnimationConfig, useReducedMotion } from 'react-native-reanimated';

import { Text } from '@/components/text';

const ROLL_MS = 380;

/**
 * A number whose digits roll when it changes, like SwiftUI's numeric text: each digit that
 * changed slides out and its new one slides in. Always upward, whichever way the number went:
 * rolling down reads as going backwards. Digits that stayed the same don't move. Nothing moves
 * on the first render.
 *
 * When the number gains or loses a digit (9 to 10), the width changes under the roll and it
 * clips, so the whole number fades over instead.
 */
export function RollingCount({ value, size, style }: { value: number; size: number; style: StyleProp<TextStyle> }) {
  const reduced = useReducedMotion();

  const chars = `${value}`.split('');
  const travel = size * 0.9;
  const enter = new Keyframe({
    0: { opacity: 0, transform: [{ translateY: travel }] },
    100: { opacity: 1, transform: [{ translateY: 0 }], easing: Easing.out(Easing.cubic) },
  }).duration(ROLL_MS);
  const exit = new Keyframe({
    0: { opacity: 1, transform: [{ translateY: 0 }] },
    100: { opacity: 0, transform: [{ translateY: -travel }], easing: Easing.in(Easing.cubic) },
  }).duration(ROLL_MS * 0.7);

  return (
    // The still number holds the size, so what sits under it never moves while rows swap: an
    // exiting row leaves the layout, and fast taps left the line below riding up into the digits.
    <View>
      <Text style={[style, styles.hidden]}>{value}</Text>
      <LayoutAnimationConfig skipEntering>
        {/* Keyed by length, so a new digit count swaps the whole row with a fade. */}
        <Animated.View
          key={chars.length}
          entering={reduced ? undefined : fadeIn}
          exiting={reduced ? undefined : fadeOut}
          style={styles.row}
        >
          {/* The row's own digits don't roll as it fades in or out. */}
          <LayoutAnimationConfig skipEntering skipExiting>
            {chars.map((char, i) => (
              // Keyed by place from the right, so the ones digit stays the ones digit.
              <View key={chars.length - i} style={styles.slot}>
                {/* Holds the slot's size; the moving digit lies over it. */}
                <Text style={[style, styles.hidden]}>{char}</Text>
                <Animated.Text key={char} entering={reduced ? undefined : enter} exiting={reduced ? undefined : exit} style={[style, styles.digit]}>
                  {char}
                </Animated.Text>
              </View>
            ))}
          </LayoutAnimationConfig>
        </Animated.View>
      </LayoutAnimationConfig>
    </View>
  );
}

const fadeIn = new Keyframe({ 0: { opacity: 0 }, 100: { opacity: 1, easing: Easing.out(Easing.quad) } }).duration(260).delay(120);
const fadeOut = new Keyframe({ 0: { opacity: 1 }, 100: { opacity: 0, easing: Easing.in(Easing.quad) } }).duration(140);

const styles = StyleSheet.create({
  row: { position: 'absolute', left: 0, top: 0, flexDirection: 'row' },
  slot: { overflow: 'hidden' },
  hidden: { opacity: 0, fontVariant: ['tabular-nums'] },
  digit: { position: 'absolute', left: 0, top: 0, fontVariant: ['tabular-nums'] },
});
