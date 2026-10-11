import { PixelRatio, Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeOut, Keyframe } from 'react-native-reanimated';

import { Text } from '@/components/text';
import { DISPLAY_MAX_SCALE } from '@/theme';

/** Pops up from its tail with a little overshoot, like Duolingo's owl talking. */
const POP = new Keyframe({
  0: { opacity: 0, transform: [{ translateY: 10 }, { scale: 0.5 }] },
  100: { opacity: 1, transform: [{ translateY: 0 }, { scale: 1 }], easing: Easing.out(Easing.back(2.2)) },
}).duration(260);

const TAIL = 12;
const FONT = 16;
const LINE = 21;
const PAD_V = 10;
const MAX_WIDTH = 250;

/**
 * Loc's speech bubble (user, October 10, 2026: "build it like duolingo"; docs/LOC_LINES_INSPO.md):
 * a white rounded bubble right above his head, its tail pointing down at him, one short line.
 * Plain white on the night sky, like his eyes and the white pill buttons; no tint, no glow.
 * A tap dismisses it.
 *
 * `room` caps its height, tail included, so it never reaches what's above it (Home's button on
 * a small phone or with large text): it keeps to the lines that fit, widening to `wide` when
 * that's one, and iOS shrinks the words to fit them. Left out, it grows with its line.
 */
export function LocBubble({ line, onDismiss, room, wide }: { line: string; onDismiss: () => void; room?: number; wide?: number }) {
  const scale = Math.min(PixelRatio.getFontScale(), DISPLAY_MAX_SCALE);
  // Lines that fit in `room`, at the text size in use; three or more is the bubble's own look.
  const lines = room === undefined ? undefined : Math.max(1, Math.floor((room - PAD_V * 2 - TAIL / 2) / (LINE * scale)));
  const tight = lines !== undefined && lines < 3;
  // Room for one line only: wider, so the words don't have to shrink so far.
  const wider = tight && lines < 2 && wide !== undefined;
  return (
    <Animated.View entering={POP} exiting={FadeOut.duration(150)} style={styles.wrap}>
      <Pressable onPress={onDismiss} accessibilityRole="text" accessibilityLabel={`Loc: ${line}`} accessibilityHint="Dismisses">
        <View style={[styles.bubble, wider ? { maxWidth: Math.max(MAX_WIDTH, wide) } : null]}>
          <Text
            style={styles.line}
            maxFontSizeMultiplier={DISPLAY_MAX_SCALE}
            numberOfLines={tight ? lines : undefined}
            adjustsFontSizeToFit={tight}
            minimumFontScale={0.6}
          >
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
  bubble: { maxWidth: MAX_WIDTH, paddingHorizontal: 16, paddingVertical: PAD_V, borderRadius: 18, backgroundColor: '#FFFFFF' },
  line: { color: '#000000', fontSize: FONT, lineHeight: LINE, fontWeight: '600', textAlign: 'center' },
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
