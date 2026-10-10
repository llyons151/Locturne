import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeOut, Keyframe } from 'react-native-reanimated';

import { Text } from '@/components/text';
import { DISPLAY_MAX_SCALE } from '@/theme';

/** Pops up from its tail with a little overshoot, like Duolingo's owl talking. */
const POP = new Keyframe({
  0: { opacity: 0, transform: [{ translateY: 10 }, { scale: 0.5 }] },
  100: { opacity: 1, transform: [{ translateY: 0 }, { scale: 1 }], easing: Easing.out(Easing.back(2.2)) },
}).duration(260);

const TAIL = 12;

/**
 * Loc's speech bubble (user, October 10, 2026: "build it like duolingo"; docs/LOC_LINES_INSPO.md):
 * a white rounded bubble right above his head, its tail pointing down at him, one short line.
 * Plain white on the night sky, like his eyes and the white pill buttons; no tint, no glow.
 * A tap dismisses it.
 */
export function LocBubble({ line, onDismiss }: { line: string; onDismiss: () => void }) {
  return (
    <Animated.View entering={POP} exiting={FadeOut.duration(150)} style={styles.wrap}>
      <Pressable onPress={onDismiss} accessibilityRole="text" accessibilityLabel={`Loc: ${line}`} accessibilityHint="Dismisses">
        <View style={styles.bubble}>
          <Text style={styles.line} maxFontSizeMultiplier={DISPLAY_MAX_SCALE}>
            {line}
          </Text>
          <View style={styles.tail} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // The tail's tip is the bottom edge, so the parent places it right over his head.
  wrap: { alignItems: 'center', paddingBottom: TAIL / 2 },
  bubble: { maxWidth: 250, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 18, backgroundColor: '#FFFFFF' },
  line: { color: '#000000', fontSize: 16, lineHeight: 21, fontWeight: '600', textAlign: 'center' },
  tail: {
    position: 'absolute',
    bottom: -TAIL / 2 + 1,
    left: '50%',
    marginLeft: -TAIL / 2,
    width: TAIL,
    height: TAIL,
    borderBottomRightRadius: 3,
    backgroundColor: '#FFFFFF',
    transform: [{ rotate: '45deg' }],
  },
});
