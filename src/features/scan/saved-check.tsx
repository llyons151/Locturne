import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** The check's white, as in the gallery (docs/design-references/code-saved, #17). */
const MOON = '#F2F8FC';
/** Corners: their width, how far in from the tile's edge, and how long each arm is, in a 180 tile. */
const CORNER_W = 4;
const CORNER_IN = 12;
const ARM = 20;
const TICK_W = 5.5;
/** The tick inside the closed-in corners, in a 180 tile. */
const TICK: [number, number][] = [
  [67.3, 91.1],
  [84.6, 108.4],
  [114.8, 73.8],
];
const OUT = Easing.bezier(0.33, 1, 0.68, 1);
const IN_OUT = Easing.bezier(0.65, 0, 0.35, 1);
const IN = Easing.bezier(0.4, 0, 0.8, 0.3);

/**
 * The code sheet's "it worked" (gallery #17, "Lock on", user 2026-10-28): viewfinder corners snap
 * onto the code as if the camera locked on, the code clears, and the corners close in round a
 * tick that draws itself in. `code` is the tile as it was (the barcode, or the QR), drawn under
 * it so nothing swaps. `delay`: wait for the camera to finish closing over it. No glow.
 */
export function SavedCheck({ size, delay, code, tile }: { size: number; delay: number; code: ReactNode; tile?: object }) {
  const reduced = useReducedMotion();
  const s = size / 180;
  // How far out the corners sit (1 on the code's edge), how much they show, the code, the tick.
  const spread = useSharedValue(reduced ? 0.62 : 1.14);
  const shown = useSharedValue(reduced ? 1 : 0);
  const codeLeft = useSharedValue(reduced ? 0 : 1);
  const tick = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced) return;
    // Snap on (180 ms), hold a beat, then close in round the tick.
    spread.set(withDelay(delay, withSequence(withTiming(1, { duration: 180, easing: OUT }), withDelay(50, withTiming(0.62, { duration: 490, easing: IN_OUT })))));
    shown.set(withDelay(delay, withTiming(1, { duration: 180, easing: OUT })));
    codeLeft.set(withDelay(delay + 240, withTiming(0, { duration: 200, easing: IN })));
    tick.set(withDelay(delay + 320, withTiming(1, { duration: 540, easing: OUT })));
  }, [reduced, delay, spread, shown, codeLeft, tick]);

  const codeStyle = useAnimatedStyle(() => ({ opacity: codeLeft.get(), transform: [{ scale: 0.9 + 0.1 * codeLeft.get() }] }));
  const cornersStyle = useAnimatedStyle(() => ({ opacity: shown.get() }));
  const tickLength = Math.hypot(TICK[1][0] - TICK[0][0], TICK[1][1] - TICK[0][1]) + Math.hypot(TICK[2][0] - TICK[1][0], TICK[2][1] - TICK[1][1]);
  const tickProps = useAnimatedProps(() => ({ strokeDashoffset: tickLength * s * (1 - tick.get()), opacity: tick.get() > 0 ? 1 : 0 }));
  const tickD = 'M' + TICK.map(([x, y]) => `${x * s} ${y * s}`).join(' L');

  return (
    <View style={{ width: size, height: size }} accessibilityRole="image" accessibilityLabel="Code saved">
      {/* The barcode's tile stays: only the code on it clears, and the tick lands on the tile. */}
      {tile ? <View style={[StyleSheet.absoluteFill, tile]} /> : null}
      <Animated.View style={[StyleSheet.absoluteFill, codeStyle]}>{code}</Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, cornersStyle]} pointerEvents="none">
        <Svg width={size} height={size}>
          {(
            [
              [CORNER_IN, CORNER_IN, 1, 1],
              [180 - CORNER_IN, CORNER_IN, -1, 1],
              [CORNER_IN, 180 - CORNER_IN, 1, -1],
              [180 - CORNER_IN, 180 - CORNER_IN, -1, -1],
            ] as const
          ).map(([x, y, sx, sy]) => (
            <Corner key={`${x}-${y}`} x={x} y={y} sx={sx} sy={sy} s={s} spread={spread} />
          ))}
          <AnimatedPath
            d={tickD}
            stroke={MOON}
            strokeWidth={TICK_W * s}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={`${tickLength * s} ${tickLength * s}`}
            animatedProps={tickProps}
          />
        </Svg>
      </Animated.View>
    </View>
  );
}

/**
 * One viewfinder corner, an L, placed by `spread` about the tile's middle: its arms shrink with it
 * but its line keeps its width, as the gallery's non-scaling stroke does.
 */
function Corner({ x, y, sx, sy, s, spread }: { x: number; y: number; sx: 1 | -1; sy: 1 | -1; s: number; spread: SharedValue<number> }) {
  const props = useAnimatedProps(() => {
    const k = spread.get();
    const cx = (90 + (x - 90) * k) * s;
    const cy = (90 + (y - 90) * k) * s;
    const arm = ARM * k * s;
    return { d: `M${cx} ${cy + sy * arm} L${cx} ${cy} L${cx + sx * arm} ${cy}` };
  });
  return <AnimatedPath stroke={MOON} strokeWidth={CORNER_W * s} fill="none" strokeLinecap="round" strokeLinejoin="round" animatedProps={props} />;
}
