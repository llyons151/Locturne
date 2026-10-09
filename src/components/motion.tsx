import { createContext, useContext, useState, type PropsWithChildren } from 'react';
import { StyleSheet, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import Animated, { cubicBezier, useReducedMotion } from 'react-native-reanimated';

import { APP_FONT, italicOverhang } from '@/theme';

/**
 * How text arrives on an onboarding page. Picked per page in onboarding-flow.tsx
 * (auditioned at /text-lab):
 * - drift: text lab #2 "Word Drift". Words drift up one after another, slightly out of focus.
 * - moonrise: text lab #32 "Moonrise". Each line rises slowly from low on the screen.
 */
export type TextMotion = 'drift' | 'moonrise';

/** Gap between one element on the page and the next, in render order. */
const SEQUENCE_GAP_MS = 110;
const WORD_STAGGER_MS = 90;

const outQuart = cubicBezier(0.25, 1, 0.5, 1);
const outQuint = cubicBezier(0.22, 1, 0.36, 1);

const SPECS = {
  drift: {
    duration: 800,
    easing: outQuart,
    keyframes: (rise: number) => ({
      from: { opacity: 0, transform: [{ translateY: rise * 0.2 }], filter: 'blur(6px)' },
      to: { opacity: 1, transform: [{ translateY: 0 }], filter: 'blur(0px)' },
    }),
  },
  moonrise: {
    duration: 1500,
    easing: outQuint,
    keyframes: (rise: number) => ({
      from: { opacity: 0, transform: [{ translateY: rise * 0.8 }] },
      to: { opacity: 1, transform: [{ translateY: 0 }] },
    }),
  },
} as const;

type Sequence = { motion: TextMotion; claim: (minDelay: number) => number };

/** Hands out start times in the order elements mount on the page. */
function createSequence(motion: TextMotion): Sequence {
  const startedAt = Date.now();
  let next = 0;
  return {
    motion,
    // Anything that mounts after its slot has passed (a line revealed by a toggle) starts right away.
    claim: (minDelay) => Math.max(0, Math.max(minDelay, next++ * SEQUENCE_GAP_MS) - (Date.now() - startedAt)),
  };
}

const MotionContext = createContext<Sequence | null>(null);

/** Wraps one page. Everything that enters below it takes the next slot in the sequence. */
export function MotionPage({ motion, children }: PropsWithChildren<{ motion: TextMotion }>) {
  const [sequence] = useState(() => createSequence(motion));
  return (
    <MotionContext.Provider value={sequence}>
      <View style={styles.fill}>{children}</View>
    </MotionContext.Provider>
  );
}

/** Claims this element's start time once, on mount. */
function useEntrance(minDelay = 0) {
  const sequence = useContext(MotionContext);
  const [delay] = useState(() => (sequence ? sequence.claim(minDelay) : minDelay));
  return { motion: sequence?.motion ?? 'drift', delay };
}

// React Native's TextStyle types animationTimingFunction as a string only; Reanimated also
// accepts cubicBezier(), which is what these use.
function animation(motion: TextMotion, rise: number, delay: number) {
  const spec = SPECS[motion];
  return {
    animationName: spec.keyframes(rise),
    animationDuration: `${spec.duration}ms`,
    animationDelay: `${Math.round(delay)}ms`,
    animationTimingFunction: spec.easing,
    animationFillMode: 'backwards',
  } as unknown as TextStyle;
}

/** A block (paragraph, row, option, card) entering in its turn. */
export function Reveal({
  children,
  style,
  delay,
}: PropsWithChildren<{ style?: StyleProp<ViewStyle>; delay?: number }>) {
  const reduced = useReducedMotion();
  const entrance = useEntrance(delay);
  return (
    <Animated.View style={[style, !reduced && (animation(entrance.motion, 40, entrance.delay) as ViewStyle)]}>
      {children}
    </Animated.View>
  );
}

/**
 * A headline entering in its turn: word by word for drift, as one line for moonrise.
 * `style` must carry the fontSize, which sets how far the words travel.
 */
export function WordsIn({
  text,
  style,
  delay,
  maxFontSizeMultiplier,
  header,
  motion: motionOverride,
}: {
  text: string;
  style: StyleProp<TextStyle>;
  delay?: number;
  maxFontSizeMultiplier?: number;
  header?: boolean;
  /** Overrides the page's motion for this line; it still takes its slot in the page's sequence. */
  motion?: TextMotion;
}) {
  const reduced = useReducedMotion();
  const sequenced = useEntrance(delay);
  const entrance = { ...sequenced, motion: motionOverride ?? sequenced.motion };
  const flat = StyleSheet.flatten(style);
  const size = flat.fontSize ?? 17;
  const role = header ? ('header' as const) : undefined;
  // Italic lines need room for the last letter's lean, or iOS and Android clip it.
  const overhang = flat.fontStyle === 'italic' ? italicOverhang(size) : null;

  if (entrance.motion === 'moonrise' || reduced) {
    return (
      <Animated.Text
        style={[APP_FONT, style, overhang, !reduced && animation(entrance.motion, size, entrance.delay)]}
        maxFontSizeMultiplier={maxFontSizeMultiplier}
        accessibilityRole={role}
      >
        {text}
      </Animated.Text>
    );
  }

  const words = text.split(' ').filter(Boolean);
  return (
    <View
      style={[styles.words, flat.textAlign === 'center' && styles.wordsCentered, { columnGap: size * 0.24 }]}
      accessible
      accessibilityLabel={text}
      accessibilityRole={role}
    >
      {words.map((word, i) => (
        <Animated.Text
          key={i}
          style={[APP_FONT, style, overhang, animation(entrance.motion, size, entrance.delay + i * WORD_STAGGER_MS)]}
          maxFontSizeMultiplier={maxFontSizeMultiplier}
        >
          {word}
        </Animated.Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  words: { flexDirection: 'row', flexWrap: 'wrap' },
  wordsCentered: { justifyContent: 'center' },
});
