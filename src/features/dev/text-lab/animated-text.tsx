import { useMemo } from 'react';
import { StyleSheet, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { DisplayFont, Nocturne } from '@/theme';

import type { Order, TextAnimation } from './animations';

type Unit = { text: string; delay: number };


const PAUSE_AFTER = /[.,?!…:;—]$/;

/** Small seeded PRNG so "random" orders are stable across replays of the same line. */
function seeded(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h;
}

/** Position of each unit in the stagger sequence. */
function ranks(count: number, order: Order, seed: number): number[] {
  const mid = (count - 1) / 2;
  switch (order) {
    case 'reverse':
      return Array.from({ length: count }, (_, i) => count - 1 - i);
    case 'center':
      return Array.from({ length: count }, (_, i) => Math.round(Math.abs(i - mid)));
    case 'edges':
      return Array.from({ length: count }, (_, i) => Math.round(mid - Math.abs(i - mid)));
    case 'random': {
      const rand = seeded(seed);
      const shuffled = Array.from({ length: count }, (_, i) => i);
      for (let i = count - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      const result: number[] = [];
      shuffled.forEach((unit, rank) => (result[unit] = rank));
      return result;
    }
    default:
      return Array.from({ length: count }, (_, i) => i);
  }
}

/** Splits the line into words (each a list of units) with a start delay per unit, in ms at 1x. */
export function plan(text: string, animation: TextAnimation) {
  const words = text.split(' ').filter(Boolean);
  // A masked line moves as one, but each row needs its own mask, so it animates word by word in sync.
  const split = animation.split === 'line' && animation.mask ? 'word' : animation.split;
  const pieces = words.map((word) => (split === 'char' ? Array.from(word) : [word]));
  const flat = pieces.flat();
  const order = ranks(flat.length, animation.order ?? 'forward', hash(text));
  const stagger = animation.split === 'line' ? 0 : animation.stagger;
  const rand = seeded(hash(text) + animation.id);

  let pause = 0;
  const delays = flat.map((piece, i) => {
    const jitter = animation.jitter ? rand() * animation.jitter : 0;
    const delay = order[i] * stagger + jitter + pause;
    // Deadpan beat: hold after a full stop before the next unit starts.
    if (animation.punctuationPause && PAUSE_AFTER.test(piece) && i < flat.length - 1) pause += animation.punctuationPause;
    return delay;
  });

  let cursor = 0;
  const grouped: Unit[][] = pieces.map((units) => units.map((unit) => ({ text: unit, delay: delays[cursor++] })));
  const total = Math.max(0, ...delays) + animation.duration;
  return { split, words: grouped, total };
}

export function AnimatedText({
  text,
  animation,
  size,
  delay = 0,
  speed = 1,
  color = Nocturne.text,
  style,
}: {
  text: string;
  animation: TextAnimation;
  size: number;
  /** ms before the first unit starts, at 1x. */
  delay?: number;
  speed?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const keyframes = useMemo(() => animation.keyframes(size), [animation, size]);
  const { split, words } = useMemo(() => plan(text, animation), [text, animation]);

  const textStyle = [styles.voice, { color, fontSize: size, lineHeight: size * 1.08 }];
  const origin = animation.transformOrigin ? { transformOrigin: animation.transformOrigin } : null;
  // React Native 0.86 declares its own string-only `animationTimingFunction` on TextStyle, which
  // clashes with Reanimated's cubicBezier() objects in the Text typings. Runtime handles both.
  const motion = (unitDelay: number) =>
    ({
      animationName: keyframes,
      animationDuration: `${Math.round(animation.duration / speed)}ms`,
      animationDelay: `${Math.round((delay + unitDelay) / speed)}ms`,
      animationTimingFunction: animation.easing,
      animationFillMode: 'backwards',
    }) as unknown as TextStyle;

  // Room for italic overhang and descenders so a mask doesn't shave the glyphs.
  const maskStyle: ViewStyle = {
    overflow: 'hidden',
    paddingHorizontal: size * 0.1,
    marginHorizontal: -size * 0.1,
    paddingBottom: size * 0.14,
    marginBottom: -size * 0.14,
  };

  const unit = (u: Unit, key: string, inWord?: boolean) => {
    const node = (
      <Animated.Text
        key={key}
        style={[
          textStyle,
          origin,
          inWord && styles.noWrap,
          motion(u.delay),
        ]}
      >
        {u.text}
      </Animated.Text>
    );
    return animation.mask ? (
      <View key={key} style={maskStyle}>
        {node}
      </View>
    ) : (
      node
    );
  };

  if (split === 'line') {
    return (
      <View style={style} accessible accessibilityLabel={text}>
        <Animated.Text
          style={[
            textStyle,
            origin,
            motion(0),
          ]}
        >
          {text}
        </Animated.Text>
      </View>
    );
  }

  return (
    <View style={[styles.row, { columnGap: size * 0.24 }, style]} accessible accessibilityLabel={text}>
      {words.map((word, w) =>
        split === 'word' ? (
          unit(word[0], `${w}`)
        ) : (
          <View key={w} style={styles.word}>
            {word.map((u, c) => unit(u, `${w}-${c}`, true))}
          </View>
        ),
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  voice: { ...DisplayFont, letterSpacing: -0.3 },
  row: { flexDirection: 'row', flexWrap: 'wrap' },
  word: { flexDirection: 'row' },
  noWrap: { flexShrink: 0 },
});
