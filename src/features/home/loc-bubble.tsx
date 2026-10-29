import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { PixelRatio, Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeOut, Keyframe } from 'react-native-reanimated';

import { Text } from '@/components/text';
import { DISPLAY_MAX_SCALE } from '@/theme';

/**
 * Grows out of a dot into the capsule, as a Liquid Glass button materialises (gallery #01, user
 * 2026-10-28), then the words come in (`WORDS_IN`). Scale and opacity only: the iOS fast path.
 */
const GLASS_IN = new Keyframe({
  0: { opacity: 0, transform: [{ scaleX: 0.32 }, { scaleY: 0.72 }] },
  55: { opacity: 1, transform: [{ scaleX: 1.04 }, { scaleY: 0.98 }], easing: Easing.out(Easing.cubic) },
  100: { opacity: 1, transform: [{ scaleX: 1 }, { scaleY: 1 }], easing: Easing.inOut(Easing.quad) },
}).duration(560);
const WORDS_IN = FadeIn.duration(220).delay(200);

/** Room under the capsule, between it and his head. */
const GAP = 8;
const FONT = 16;
const LINE = 20;
const PAD_V = 12;
const MAX_WIDTH = 250;

/**
 * Loc's speech bubble: one short line right above his head. A clear Liquid Glass capsule with no
 * tail (the user's pick from the bubble gallery, #01, 2026-10-28:
 * docs/design-references/loc-bubbles): real glass on iOS 26, untinted, white semibold words, a
 * neutral drop shadow for lift; elsewhere a dark pane the same shape. No glow. A tap dismisses it.
 *
 * `room` caps its height, gap included, so it never reaches what's above it (Home's button on
 * a small phone or with large text): it keeps to the lines that fit, widening to `wide` when
 * that's one, and iOS shrinks the words to fit them. Left out, it grows with its line.
 */
export function LocBubble({ line, onDismiss, room, wide }: { line: string; onDismiss: () => void; room?: number; wide?: number }) {
  const scale = Math.min(PixelRatio.getFontScale(), DISPLAY_MAX_SCALE);
  // Lines that fit in `room`, at the text size in use; three or more is the bubble's own look.
  const lines = room === undefined ? undefined : Math.max(1, Math.floor((room - PAD_V * 2 - GAP) / (LINE * scale)));
  const tight = lines !== undefined && lines < 3;
  // Room for one line only: wider, so the words don't have to shrink so far.
  const wider = tight && lines < 2 && wide !== undefined;
  return (
    <Animated.View entering={GLASS_IN} exiting={FadeOut.duration(150)} style={styles.wrap}>
      <Pressable onPress={onDismiss} accessibilityRole="text" accessibilityLabel={`Loc: ${line}`} accessibilityHint="Dismisses">
        <View style={[styles.bubble, !LIQUID && styles.pane, wider ? { maxWidth: Math.max(MAX_WIDTH, wide) } : null]}>
          {LIQUID ? <GlassView glassEffectStyle="regular" colorScheme="dark" style={styles.glass} /> : null}
          <Animated.View entering={WORDS_IN}>
            <Text
              style={styles.line}
              maxFontSizeMultiplier={DISPLAY_MAX_SCALE}
              numberOfLines={tight ? lines : undefined}
              adjustsFontSizeToFit={tight}
              minimumFontScale={0.6}
            >
              {line}
            </Text>
          </Animated.View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

/** Real Liquid Glass where iOS has it (26 and later); it can't change while the app runs. */
const LIQUID = isLiquidGlassAvailable();
/** Without it: a dark, nearly opaque pane, so the sky and the moon don't muddy the words. */
const PANE = 'rgba(28,31,40,0.88)';
const EDGE = 'rgba(255,255,255,0.18)';
const CAPSULE = 999;

const styles = StyleSheet.create({
  // The capsule's foot is the bottom edge (less the gap), so the parent places it right over his head.
  wrap: { alignItems: 'center', paddingBottom: GAP },
  bubble: {
    maxWidth: MAX_WIDTH,
    paddingHorizontal: 22,
    paddingVertical: PAD_V,
    borderRadius: CAPSULE,
    borderCurve: 'continuous',
    // Neutral lift off the sky, never a tint (CLAUDE.md: no glow).
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
  },
  pane: { backgroundColor: PANE, borderWidth: StyleSheet.hairlineWidth, borderColor: EDGE },
  glass: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderRadius: CAPSULE, overflow: 'hidden' },
  line: { color: '#FFFFFF', fontSize: FONT, lineHeight: LINE, fontWeight: '600', letterSpacing: -0.16, textAlign: 'center' },
});
