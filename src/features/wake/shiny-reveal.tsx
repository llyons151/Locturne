import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

/**
 * The morning payoff's shiny reveal (user, 2026-11-23: "a shiny animation so they know they got a shiny ...
 * super native and clean"): drawn over the risen moon once it has settled, in one of ten drafts (`fx`, the
 * wake preview's `fx=1..10`) while one is picked. Crisp white marks only: no glow, no blur. The moon itself
 * turns shiny under it (payoff-screen.tsx previews the shiny moon as this starts).
 */

export const SHINY_FX = 10;
/** How long each draft's moon crossfade into the shiny takes (ms), read by the payoff. */
export const FX_FADE_MS = [0, 500, 900, 400, 600, 700, 0, 500, 450, 260, 1300];
/** The draft names, for the dev gallery. */
export const FX_NAMES = ['', 'Rim twinkle', 'Holo sweep', 'Classic three', 'Ping', 'Constellation', 'Second rise', 'Sheen', 'Mark', 'Nudge', 'Quiet'];

// Motion from docs/research_notes/Shiny reveal motion/references.md: Material 3's emphasized-decelerate for
// entrances, springs with a small bounce (Apple, WWDC23: ~0.15 subtle, over ~0.4 exaggerated), nothing grows from 0.
const EASE = Easing.bezier(0.05, 0.7, 0.1, 1);
const INOUT = Easing.bezier(0.65, 0, 0.35, 1);
/** About a 0.2 bounce: a small tail, never a wobble. */
const SPRING = { damping: 16, stiffness: 260, mass: 0.7, reduceMotion: ReduceMotion.System };
const STAR = 'M12 0l2.4 9.6L24 12l-9.6 2.4L12 24l-2.4-9.6L0 12l9.6-2.4z';

type Spot = { x: number; y: number; s: number; at: number };

/** One four-point star: pops in turning, then shrinks away. */
function Star({ spot, play, dur = 520 }: { spot: Spot; play: number; dur?: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    if (!play) return;
    t.value = 0;
    t.value = withDelay(spot.at, withTiming(1, { duration: dur, easing: Easing.bezier(0.2, 0, 0, 1), reduceMotion: ReduceMotion.System }));
  }, [play, spot.at, dur, t]);
  const style = useAnimatedStyle(() => {
    const p = t.value;
    const up = p < 0.4 ? p / 0.4 : 1 - (p - 0.4) / 0.6;
    // In fast (the first 40%), out slower; from half size, never from nothing; a quarter turn over the whole life.
    return { opacity: p === 0 ? 0 : up, transform: [{ scale: 0.5 + 0.5 * up }, { rotate: `${p * 90}deg` }] };
  });
  return (
    <Animated.View pointerEvents="none" style={[styles.abs, { left: spot.x - spot.s / 2, top: spot.y - spot.s / 2, width: spot.s, height: spot.s }, style]}>
      <Svg width={spot.s} height={spot.s} viewBox="0 0 24 24">
        <Path d={STAR} fill="#FFFFFF" />
      </Svg>
    </Animated.View>
  );
}

/** Points round the moon's rim, `n` of them, starting at angle `off` (radians), sized alternately. */
function rim(cx: number, cy: number, r: number, n: number, off: number, at: (i: number) => number, big = 18): Spot[] {
  return Array.from({ length: n }, (_, i) => {
    const a = off + (i / n) * Math.PI * 2;
    return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, s: i % 2 ? big * 0.65 : big, at: at(i) };
  });
}

/** A thin white ring that leaves the moon's edge and fades: like a system "ping". */
function Ping({ cx, cy, r, play, at }: { cx: number; cy: number; r: number; play: number; at: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    if (!play) return;
    t.value = 0;
    t.value = withDelay(at, withTiming(1, { duration: 900, easing: EASE, reduceMotion: ReduceMotion.System }));
  }, [play, at, t]);
  const box = r * 2 * 1.6;
  const style = useAnimatedStyle(() => ({ opacity: t.value === 0 ? 0 : 0.9 * (1 - t.value), transform: [{ scale: 0.625 + 0.375 * t.value }] }));
  return (
    <Animated.View pointerEvents="none" style={[styles.abs, { left: cx - box / 2, top: cy - box / 2, width: box, height: box }, style]}>
      <Svg width={box} height={box}>
        <Circle cx={box / 2} cy={box / 2} r={box / 2 - 1} stroke="#FFFFFF" strokeWidth={1.5} fill="none" />
      </Svg>
    </Animated.View>
  );
}

/** A thin band of light across the disc, run `times` times: a holo card tilting. Clipped to the moon. */
function Sheen({ cx, cy, r, play, at, times = 1, width = 0.22, strength = 0.5 }: { cx: number; cy: number; r: number; play: number; at: number; times?: number; width?: number; strength?: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    if (!play) return;
    t.value = 0;
    const one = withTiming(1, { duration: 700, easing: INOUT, reduceMotion: ReduceMotion.System });
    t.value = withDelay(at, times === 1 ? one : withSequence(one, withTiming(0, { duration: 0 }), withTiming(1, { duration: 700, easing: INOUT })));
  }, [play, at, times, t]);
  const d = r * 2;
  const band = d * width;
  const style = useAnimatedStyle(() => ({ opacity: t.value === 0 || t.value === 1 ? 0 : 1, transform: [{ translateX: -band - d * 0.3 + t.value * (d * 1.6 + band) }, { rotate: '18deg' }] }));
  return (
    <View pointerEvents="none" style={[styles.abs, { left: cx - r, top: cy - r, width: d, height: d, borderRadius: r, overflow: 'hidden' }]}>
      <Animated.View style={[styles.abs, { top: -d * 0.3, height: d * 1.6, width: band }, style]}>
        <Svg width={band} height={d * 1.6}>
          <Defs>
            <LinearGradient id="sheen" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0} />
              <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity={strength} />
              <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect width={band} height={d * 1.6} fill="url(#sheen)" />
        </Svg>
      </Animated.View>
    </View>
  );
}

/** One big sparkle mark on the moon: lands with a spring, holds, then shrinks away. */
function Mark({ cx, cy, r, play }: { cx: number; cy: number; r: number; play: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    if (!play) return;
    t.value = 0;
    t.value = withSequence(withSpring(1, SPRING), withDelay(420, withTiming(2, { duration: 380, easing: INOUT, reduceMotion: ReduceMotion.System })));
  }, [play, t]);
  const s = r * 0.9;
  const style = useAnimatedStyle(() => {
    const v = t.value;
    const k = v <= 1 ? v : 2 - v;
    return { opacity: v === 0 ? 0 : Math.min(1, k * 1.2), transform: [{ scale: 0.6 + 0.4 * k }, { rotate: `${v * 45}deg` }] };
  });
  return (
    <Animated.View pointerEvents="none" style={[styles.abs, { left: cx - s / 2, top: cy - s / 2, width: s, height: s }, style]}>
      <Svg width={s} height={s} viewBox="0 0 24 24">
        <Path d={STAR} fill="#FFFFFF" />
      </Svg>
    </Animated.View>
  );
}

/**
 * The reveal's marks for draft `fx`, over a moon centred at (cx, cy) with radius r. `play` counts up to replay.
 * Drafts 6 (second rise) and 9 (nudge) also move the moon: the payoff does that part (`moonMove`).
 */
export function ShinyReveal({ fx, cx, cy, r, play }: { fx: number; cx: number; cy: number; r: number; play: number }) {
  if (!play) return null;
  const R = r * 1.12;
  switch (fx) {
    case 1:
      return <>{rim(cx, cy, R, 4, -0.6, (i) => 80 + i * 110).map((s, i) => <Star key={i} spot={s} play={play} />)}</>;
    case 2:
      return (
        <>
          <Sheen cx={cx} cy={cy} r={r} play={play} at={0} width={0.32} strength={0.42} />
          {[[-0.45, -0.35], [0, 0.05], [0.4, 0.4]].map(([dx, dy], i) => <Star key={i} spot={{ x: cx + dx * r, y: cy + dy * r, s: 16, at: 160 + i * 180 }} play={play} dur={460} />)}
        </>
      );
    case 3:
      return <>{[0, 1, 2].flatMap((b) => rim(cx, cy, R * (1 + b * 0.06), 5, b * 0.7, (i) => b * 260 + i * 30, 16).map((s, i) => <Star key={`${b}-${i}`} spot={s} play={play} dur={380} />))}</>;
    case 4:
      return (
        <>
          <Ping cx={cx} cy={cy} r={r} play={play} at={0} />
          <Ping cx={cx} cy={cy} r={r} play={play} at={220} />
        </>
      );
    case 5: {
      const pts: [number, number, number][] = [[-1.25, -0.6, 14], [-0.95, 0.9, 10], [1.2, -0.85, 16], [1.35, 0.35, 10], [0.15, -1.3, 12], [-0.2, 1.3, 12]];
      return <>{pts.map(([dx, dy, s], i) => <Star key={i} spot={{ x: cx + dx * r, y: cy + dy * r, s, at: i * 120 }} play={play} dur={900} />)}</>;
    }
    case 6:
      return <>{rim(cx, cy, R, 3, -1.2, (i) => 40 + i * 120).map((s, i) => <Star key={i} spot={s} play={play} />)}</>;
    case 7:
      return <Sheen cx={cx} cy={cy} r={r} play={play} at={450} times={2} />;
    case 8:
      return <Mark cx={cx} cy={cy} r={r} play={play} />;
    case 9:
      return <>{rim(cx, cy, R * 1.05, 6, 0, (i) => 60 + i * 70, 16).map((s, i) => <Star key={i} spot={s} play={play} dur={420} />)}</>;
    default:
      return null;
  }
}

/** Drafts 6 and 9 move the moon itself: how, for the payoff to run on its shared values. */
/**
 * The buzzes after the first one, in step with the draft's beats (Apple: haptic and motion "in the same tempo"),
 * as ms after the reveal starts.
 */
export const FX_TAPS: Record<number, number[]> = { 3: [260, 520], 4: [220], 5: [240, 480], 7: [450, 1150] };

export function moonMove(fx: number): 'dip' | 'nudge' | null {
  return fx === 6 ? 'dip' : fx === 9 ? 'nudge' : null;
}

/** Draft 9's nudge on the moon's scale (`moonScale`), from its risen scale `s`. */
export function nudgeScale(scale: SharedValue<number>, s: number) {
  scale.set(
    withSequence(
      withTiming(s * 0.96, { duration: 110, easing: INOUT }),
      withTiming(s * 1.04, { duration: 130, easing: INOUT }),
      withTiming(s * 0.98, { duration: 120, easing: INOUT }),
      withSpring(s, SPRING),
    ),
  );
}

const styles = StyleSheet.create({
  abs: { position: 'absolute' },
});
