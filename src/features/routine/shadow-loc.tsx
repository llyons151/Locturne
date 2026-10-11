import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Text } from '@/components/text';

/**
 * Loc in the dark (user, October 10, 2026: "just a subtle thing in the background"): in the
 * black beside the Routine dial, two small button eyes fade in, blink, and he says it
 * in two small bubbles, then they fade back out. A nod to the line, never Batman's name or
 * look. Covers nothing you need and takes no touches.
 */
// Broken by hand into even lines: left to wrap in the narrow corner, it strands a word on its own.
const LINES = ['They think\nI’m hiding in\nthe shadows.', 'But I am\nthe shadows.'] as const;

// When each beat lands, in ms from the visit.
const EYES_AT = 900;
const FIRST_AT = 1900;
const PAUSE_AT = 4200;
const SECOND_AT = 4600;
const OUT_AT = 6800;

/** His button eyes (loc-rig.ts), small: the right one a touch lower, as on his tilted head. */
const EYE = 6;
const PUPIL = 3.6;

/** Round the whole time (user: no squishing), bar one quick blink. */
function Eyes({ shown }: { shown: boolean }) {
  const reduced = useReducedMotion();
  const open = useSharedValue(0);
  const lid = useSharedValue(1);

  useEffect(() => {
    // A slow fade in the dark, then one blink; out the same way.
    open.set(withTiming(shown ? 1 : 0, { duration: shown ? 700 : 500, easing: Easing.inOut(Easing.quad) }));
    if (shown && !reduced) lid.set(withDelay(1400, withSequence(withTiming(0.1, { duration: 80 }), withTiming(1, { duration: 140 }))));
  }, [shown, reduced, open, lid]);

  const style = useAnimatedStyle(() => ({ opacity: open.get(), transform: [{ scaleY: lid.get() }] }));
  return (
    <Animated.View style={[styles.eyes, style]}>
      <View style={styles.eye}>
        <View style={styles.pupil} />
      </View>
      <View style={[styles.eye, styles.eyeLow]}>
        <View style={styles.pupil} />
      </View>
    </Animated.View>
  );
}

/**
 * Plays once each time `visit` changes (0: not yet). `titleWidth` is the title's own width, so
 * the bubble can keep clear of it.
 */
export function ShadowLoc({ visit, titleWidth }: { visit: number; titleWidth: number }) {
  return visit ? <Scene key={visit} titleWidth={titleWidth} /> : null;
}

/** Bubble text sizes, largest first: the first that fits beside the title is used. */
const SIZES = [
  { fontSize: 12, lineHeight: 16, paddingHorizontal: 10, paddingVertical: 7 },
  { fontSize: 11, lineHeight: 14, paddingHorizontal: 8, paddingVertical: 6 },
] as const;
/** Clear space kept between the title and the bubble. */
const TITLE_GAP = 12;

function Scene({ titleWidth }: { titleWidth: number }) {
  // Beats: 0 nothing, 1 eyes, 2 first line, 3 pause, 4 second line, 5 gone.
  const [beat, setBeat] = useState(0);
  // Measured, not guessed: the font differs by platform. The bubble's width per size, and the row's.
  const [widths, setWidths] = useState<(number | undefined)[]>([]);
  const [rowWidth, setRowWidth] = useState(0);

  useEffect(() => {
    const timers = [EYES_AT, FIRST_AT, PAUSE_AT, SECOND_AT, OUT_AT].map((ms, i) => setTimeout(() => setBeat(i + 1), ms));
    return () => timers.forEach(clearTimeout);
  }, []);

  // The title is centred, so the room right of it is half of what it leaves. On a narrow
  // screen (an SE with Display Zoom) no size fits, and only the eyes play.
  const room = (rowWidth - titleWidth) / 2 - TITLE_GAP;
  const measured = rowWidth > 0 && titleWidth > 0 && widths.length === SIZES.length && widths.every((w) => w !== undefined);
  const size = measured ? SIZES.find((_, i) => (widths[i] ?? Infinity) <= room) : undefined;

  const line = beat === 2 ? LINES[0] : beat === 4 ? LINES[1] : null;
  return (
    <View
      style={StyleSheet.absoluteFill}
      onLayout={(e) => setRowWidth(e.nativeEvent.layout.width)}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {/* Unseen: each size's widest bubble, measured once. */}
      <View style={styles.measure}>
        {SIZES.map((each, i) => (
          <View
            key={each.fontSize}
            style={[styles.bubble, { paddingHorizontal: each.paddingHorizontal, paddingVertical: each.paddingVertical }]}
            onLayout={(e) => {
              const width = e.nativeEvent.layout.width;
              setWidths((all) => Object.assign([...all], { [i]: width }));
            }}
          >
            <Text style={[styles.line, { fontSize: each.fontSize, lineHeight: each.lineHeight }]} maxFontSizeMultiplier={1}>
              {LINES.join('\n')}
            </Text>
          </View>
        ))}
      </View>
      <View style={styles.speech}>
        {line && size ? (
          <Animated.View
            key={line}
            entering={FadeIn.duration(250)}
            exiting={FadeOut.duration(250)}
            style={[styles.bubble, { paddingHorizontal: size.paddingHorizontal, paddingVertical: size.paddingVertical }]}
          >
            <Text style={[styles.line, { fontSize: size.fontSize, lineHeight: size.lineHeight }]} maxFontSizeMultiplier={1}>
              {line}
            </Text>
            <View style={styles.tail} />
          </Animated.View>
        ) : null}
      </View>
      <View style={styles.eyesAt}>
        <Eyes shown={beat >= 1 && beat <= 4} />
      </View>
    </View>
  );
}

const TAIL = 8;

/**
 * Where he sits, in points from the top of the title row. The dial (260 wide, centred) leaves
 * a strip of black down its right side, and its ring curves away from the corner under the
 * title: the eyes sit in that strip, the bubble in the corner above them, right of the title.
 */
const EYES_TOP = 70;
/** The eyes' row: two eyes and the gap between them. */
const EYES_W = EYE * 4 + 5;
const EYES_RIGHT = 4;

const styles = StyleSheet.create({
  // Its bottom just over the eyes, the tail pointing down between them. As wide as its
  // longest line, so it never reaches back to the title.
  speech: { position: 'absolute', top: 0, right: 0, height: EYES_TOP - TAIL, justifyContent: 'flex-end', alignItems: 'flex-end' },
  eyesAt: { position: 'absolute', top: EYES_TOP, right: EYES_RIGHT },
  eyes: { flexDirection: 'row', alignItems: 'flex-start', gap: 5 },
  eye: { width: EYE * 2, height: EYE * 2, borderRadius: EYE, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  eyeLow: { marginTop: 2 },
  pupil: { width: PUPIL * 2, height: PUPIL * 2, borderRadius: PUPIL, backgroundColor: '#000000', marginTop: 1.5 },
  bubble: { borderRadius: 12, backgroundColor: '#FFFFFF' },
  measure: { position: 'absolute', top: 0, left: 0, opacity: 0, alignItems: 'flex-start' },
  tail: {
    position: 'absolute',
    bottom: -TAIL / 2 + 1,
    right: EYES_RIGHT + EYES_W / 2 - TAIL / 2,
    width: TAIL,
    height: TAIL,
    borderBottomRightRadius: 2,
    backgroundColor: '#FFFFFF',
    transform: [{ rotate: '45deg' }],
  },
  line: { color: '#000000', fontWeight: '600', textAlign: 'center' },
});
