import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
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
 * a rounded bubble right above his head, its tail pointing down at him, one short line. Dark
 * glass everywhere (user, 2026-10-28: "make the text pop-up look like this consistently…
 * liquid glass"): real Liquid Glass tinted with the night's navy on iOS 26, the same navy as
 * a near-solid pane elsewhere, with a hairline edge and moon-white words; no glow. A tap
 * dismisses it. `glass` (the morning payoff only, payoff lab #2, user 2026-10-28): the
 * night's raised navy with a hairline edge, so Done stays the only white thing at the bottom.
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
        <View style={[styles.bubble, !LIQUID && styles.pane, wider ? { maxWidth: Math.max(MAX_WIDTH, wide) } : null]}>
          {LIQUID ? <GlassView glassEffectStyle="regular" colorScheme="dark" tintColor={GLASS_TINT} style={styles.glass} /> : null}
          <Text
            style={styles.line}
            maxFontSizeMultiplier={DISPLAY_MAX_SCALE}
            numberOfLines={tight ? lines : undefined}
            adjustsFontSizeToFit={tight}
            minimumFontScale={0.6}
          >
            {line}
          </Text>
          {/* Outside the bubble's clipped glass, so the tail is a scrap of glass of its own. */}
          <View style={[styles.tail, !LIQUID && styles.pane]}>
            {LIQUID ? <GlassView glassEffectStyle="regular" colorScheme="dark" tintColor={GLASS_TINT} style={StyleSheet.absoluteFill} /> : null}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

/** Real Liquid Glass where iOS has it (26 and later); it can't change while the app runs. */
const LIQUID = isLiquidGlassAvailable();
/** Without it: Nocturne's raised navy, nearly opaque so the sky doesn't muddy the words. */
const PANE = 'rgba(23,36,68,0.92)';
/** With it: the same navy, thinner, so the glass still bends the sky behind. */
const GLASS_TINT = 'rgba(23,36,68,0.55)';
const EDGE = 'rgba(221,240,248,0.16)';

const styles = StyleSheet.create({
  // The tail's tip is the bottom edge, so the parent places it right over his head.
  wrap: { alignItems: 'center', paddingBottom: TAIL / 2 },
  bubble: { maxWidth: MAX_WIDTH, paddingHorizontal: 16, paddingVertical: PAD_V, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, borderColor: EDGE },
  pane: { backgroundColor: PANE },
  glass: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderRadius: 18, overflow: 'hidden' },
  line: { color: '#EEF6FB', fontSize: FONT, lineHeight: LINE, fontWeight: '500', textAlign: 'center' },
  tail: {
    position: 'absolute',
    bottom: -TAIL / 2 + 1,
    left: '50%',
    marginLeft: -TAIL / 2,
    width: TAIL,
    height: TAIL,
    borderBottomRightRadius: 3,
    overflow: 'hidden',
    // The edge carries on round the tail's two outer sides.
    borderRightWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: EDGE,
    transform: [{ rotate: '45deg' }],
  },
});
