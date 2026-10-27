import { createContext, useContext, useState, type PropsWithChildren } from 'react';
import { StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import Animated, { cubicBezier, useReducedMotion } from 'react-native-reanimated';

import { APP_FONT, italicOverhang } from '@/theme';

/**
 * How text arrives on an onboarding page. Picked per page in onboarding-flow.tsx:
 * - focus: Mercury's hero copy (mercury.com/payroll, docs/MERCURY_MOTION.md). Each line comes
 *   into focus where it stands, out of a blur, one line every 150 ms. Nothing moves.
 * - moonrise: text lab #32 "Moonrise". Each line rises slowly from low on the screen.
 */
export type TextMotion = 'focus' | 'moonrise';

/** Gap between one element on the page and the next, in render order (Mercury's hero step). */
const SEQUENCE_GAP_MS = 150;

const outQuint = cubicBezier(0.22, 1, 0.36, 1);

const SPECS = {
  focus: {
    duration: 1400,
    easing: cubicBezier(0.2, 1, 0.4, 1),
    keyframes: () => ({
      from: { opacity: 0, filter: 'blur(8px)' },
      to: { opacity: 1, filter: 'blur(0px)' },
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

/**
 * A control or card arriving: it fades in while drifting up a few points into place, with no
 * overshoot. Kept small on purpose; a 50 px rise with an overshoot read as too aggressive.
 * Two layers, because the fade and the drift have their own curves and start times.
 */
const RISE = {
  duration: 900,
  lag: 60,
  distance: 10,
  fade: cubicBezier(0.25, 0.1, 0.25, 1),
  settle: outQuint,
};

type Sequence = { motion: TextMotion; claim: (minDelay: number) => number };

/**
 * Hands out start times in the order elements mount on the page. `offset` holds the whole page
 * back, while the page before it leaves.
 */
function createSequence(motion: TextMotion, offset: number): Sequence {
  const startedAt = Date.now();
  let cursor = 0;
  return {
    motion,
    // Anything that mounts after its slot has passed (a line revealed by a toggle) starts right away.
    claim: (minDelay) => {
      const slot = cursor;
      cursor += SEQUENCE_GAP_MS;
      return Math.max(0, offset + Math.max(minDelay, slot) - (Date.now() - startedAt));
    },
  };
}

const MotionContext = createContext<Sequence | null>(null);

/** Wraps one page. Everything that enters below it takes the next slot in the sequence. */
export function MotionPage({ motion, offset = 0, children }: PropsWithChildren<{ motion: TextMotion; offset?: number }>) {
  const [sequence] = useState(() => createSequence(motion, offset));
  return (
    <MotionContext.Provider value={sequence}>
      <View style={styles.fill}>{children}</View>
    </MotionContext.Provider>
  );
}

/**
 * Holds what's inside back `offset` ms from mount, with the page's motion, as its own sequence:
 * for words on something that moves in first (`build`'s ground slides up, then they come in).
 */
export function MotionHold({ offset, children }: PropsWithChildren<{ offset: number }>) {
  const motion = useContext(MotionContext)?.motion ?? 'focus';
  const [sequence] = useState(() => createSequence(motion, offset));
  return <MotionContext.Provider value={sequence}>{children}</MotionContext.Provider>;
}

/** Claims this element's start time once, on mount. */
function useEntrance(minDelay = 0) {
  const sequence = useContext(MotionContext);
  const [delay] = useState(() => (sequence ? sequence.claim(minDelay) : minDelay));
  return { motion: sequence?.motion ?? 'focus', delay };
}

// React Native types animationTimingFunction as a string only; Reanimated also
// accepts cubicBezier(), which is what these use.
function animation(motion: TextMotion, rise: number, delay: number) {
  const spec = SPECS[motion];
  return keyframed(spec.keyframes(rise), spec.duration, delay, spec.easing);
}

function keyframed(keyframes: object, duration: number, delay: number, easing: unknown) {
  return {
    animationName: keyframes,
    animationDuration: `${duration}ms`,
    animationDelay: `${Math.round(delay)}ms`,
    animationTimingFunction: easing,
    animationFillMode: 'backwards',
  } as unknown as ViewStyle;
}

/**
 * A block (paragraph, row, card) entering in its turn. Text comes in with the page's motion;
 * `rise` is for a control or card (answers, the schedule), which Mercury slides up instead.
 */
export function Reveal({
  children,
  style,
  delay,
  rise,
}: PropsWithChildren<{ style?: StyleProp<ViewStyle>; delay?: number; rise?: boolean }>) {
  const reduced = useReducedMotion();
  const entrance = useEntrance(delay);
  if (reduced) return <View style={style}>{children}</View>;
  if (rise && entrance.motion === 'focus') {
    return (
      <Animated.View style={keyframed({ from: { opacity: 0 }, to: { opacity: 1 } }, RISE.duration, entrance.delay, RISE.fade)}>
        <Animated.View
          style={[
            style,
            keyframed(
              { from: { transform: [{ translateY: RISE.distance }] }, to: { transform: [{ translateY: 0 }] } },
              RISE.duration,
              entrance.delay + RISE.lag,
              RISE.settle,
            ),
          ]}
        >
          {children}
        </Animated.View>
      </Animated.View>
    );
  }
  return <Animated.View style={[style, animation(entrance.motion, 40, entrance.delay)]}>{children}</Animated.View>;
}

/**
 * A headline entering in its turn, as one line, the way Mercury's hero lines do.
 * `style` must carry the fontSize, which sets how far a moonrise line travels.
 */
export function WordsIn({
  text,
  style,
  delay,
  maxFontSizeMultiplier,
  header,
  motion: motionOverride,
  accent,
}: {
  text: string;
  /** A part of the line in another color (the paywall's number, in the reveal's blue). */
  accent?: { text: string; color: string };
  style: StyleProp<TextStyle>;
  delay?: number;
  maxFontSizeMultiplier?: number;
  header?: boolean;
  /** Overrides the page's motion for this line; it still takes its slot in the page's sequence. */
  motion?: TextMotion;
}) {
  const reduced = useReducedMotion();
  const sequenced = useEntrance(delay);
  const motion = motionOverride ?? sequenced.motion;
  const flat = StyleSheet.flatten(style);
  const size = flat.fontSize ?? 17;
  // Italic lines need room for the last letter's lean, or iOS and Android clip it.
  const overhang = flat.fontStyle === 'italic' ? italicOverhang(size) : null;

  // The animation sits on a View: iOS draws a filter's blur on views, not on text.
  return (
    <Animated.View style={!reduced && animation(motion, size, sequenced.delay)}>
      <Text
        style={[APP_FONT, style, overhang]}
        maxFontSizeMultiplier={maxFontSizeMultiplier}
        accessibilityRole={header ? 'header' : undefined}
      >
        {accent && text.includes(accent.text) ? (
          <>
            {text.slice(0, text.indexOf(accent.text))}
            <Text style={{ color: accent.color }}>{accent.text}</Text>
            {text.slice(text.indexOf(accent.text) + accent.text.length)}
          </>
        ) : (
          text
        )}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
