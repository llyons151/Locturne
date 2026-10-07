import { useEffect } from 'react';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, ClipPath, Defs, G, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * The Sleep button's moving glow, which the user asked for (2026-10-06): soft pools of
 * moonlight drifting and merging under the surface, like light on water, kept inside the
 * button. Drawn in SVG and cut by an SVG circle, not a rounded view, because Chrome won't
 * clip moving layers to rounded corners (see app-background.tsx), and this must never spill.
 *
 * One slow clock drives every pool on its own path, so the pattern never visibly repeats
 * and nothing re-renders. With Reduce Motion the pools hold still.
 */

/** One trip round the clock. Long, so the drift reads as calm, not busy. */
const CYCLE_MS = 14_000;

type Pool = {
  id: string;
  color: string;
  /** Radius, as a share of the button. */
  r: number;
  /** Strength at its centre. */
  opacity: number;
  /** Path: how far it wanders (share of the button) and how many laps per cycle. */
  ax: number;
  ay: number;
  fx: number;
  fy: number;
  phase: number;
};

// The orb from the user's reference (docs/design-references/glow-orb.png), in the app's own
// colours, as the user asked: "blues with white", not its purple. Moon white and white light
// swirling through the sky's blues.
const POOLS: Pool[] = [
  { id: 'a', color: '#FFFFFF', r: 0.42, opacity: 0.9, ax: 0.2, ay: 0.16, fx: 1, fy: 2, phase: 0 },
  { id: 'b', color: '#8CC4F5', r: 0.52, opacity: 0.85, ax: 0.24, ay: 0.22, fx: 2, fy: 1, phase: 2.1 },
  { id: 'c', color: '#CFE6F7', r: 0.46, opacity: 0.85, ax: 0.22, ay: 0.2, fx: 1, fy: 3, phase: 4.2 },
  { id: 'd', color: '#4A93E0', r: 0.34, opacity: 0.8, ax: 0.26, ay: 0.14, fx: 3, fy: 2, phase: 1.3 },
];

function PoolCircle({ pool, size, clock }: { pool: Pool; size: number; clock: SharedValue<number> }) {
  const c = size / 2;
  const props = useAnimatedProps(() => {
    const t = clock.value * Math.PI * 2;
    return {
      cx: c + Math.sin(t * pool.fx + pool.phase) * pool.ax * size,
      cy: c + Math.cos(t * pool.fy + pool.phase) * pool.ay * size,
    };
  });
  return <AnimatedCircle animatedProps={props} r={pool.r * size} fill={`url(#moon-water-${pool.id})`} />;
}

export function MoonWater({ size, reduced }: { size: number; reduced: boolean }) {
  const clock = useSharedValue(0);

  useEffect(() => {
    if (reduced) return;
    clock.set(withRepeat(withTiming(1, { duration: CYCLE_MS, easing: Easing.linear }), -1, false));
    return () => cancelAnimation(clock);
  }, [reduced, clock]);

  const c = size / 2;
  return (
    <Svg width={size} height={size} style={{ position: 'absolute' }} pointerEvents="none">
      <Defs>
        <ClipPath id="moon-water-clip">
          <Circle cx={c} cy={c} r={c} />
        </ClipPath>
        <LinearGradient id="moon-water-base" x1="0.2" y1="0" x2="0.8" y2="1">
          <Stop offset="0" stopColor="#5FA6EC" />
          <Stop offset="1" stopColor="#17488F" />
        </LinearGradient>
        {/* The orb's gloss: a soft light up and to the left, held still while the pools move. */}
        <RadialGradient id="moon-water-gloss" cx="34%" cy="26%" r="42%">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.6} />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
        </RadialGradient>
        {/* A darker edge, so it reads as a sphere rather than a flat disc. */}
        <RadialGradient id="moon-water-rim" cx="50%" cy="50%" r="50%">
          <Stop offset="0.72" stopColor="#0A2D5E" stopOpacity={0} />
          <Stop offset="1" stopColor="#0A2D5E" stopOpacity={0.45} />
        </RadialGradient>
        {POOLS.map((p) => (
          <RadialGradient key={p.id} id={`moon-water-${p.id}`} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={p.color} stopOpacity={p.opacity} />
            <Stop offset="0.55" stopColor={p.color} stopOpacity={p.opacity * 0.35} />
            <Stop offset="1" stopColor={p.color} stopOpacity={0} />
          </RadialGradient>
        ))}
      </Defs>
      <G clipPath="url(#moon-water-clip)">
        <Rect width={size} height={size} fill="url(#moon-water-base)" />
        {POOLS.map((p) => (
          <PoolCircle key={p.id} pool={p} size={size} clock={clock} />
        ))}
        <Rect width={size} height={size} fill="url(#moon-water-rim)" />
        <Rect width={size} height={size} fill="url(#moon-water-gloss)" />
      </G>
    </Svg>
  );
}
