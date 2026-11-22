'use no memo';
// The React Compiler hoists small capture-free helpers out of worklets into plain functions, which
// then throw on the UI thread and abort the app (crash report, 2026-11-22). Off for this file.

import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

/**
 * The circle the grass or the sun goes in (photo-screen.tsx), the camera dimmed outside it.
 * `aim`: a thin white edge. `scan`: a spinner ring runs round the circle while the photo is read,
 * Material's growing-and-shrinking arc (picked from 15 takes, docs/design-references/scan-lab).
 * `pass`: as Apple Pay's Done, the ring closes round from the top, then a check draws itself in with
 * the same stroke. `miss`: the spinner just stops; the line under the circle says why.
 */
export type AimMode = 'aim' | 'scan' | 'pass' | 'miss';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);

/** One grow-and-shrink of the arc, in seconds. */
const CYCLE = 1.5;
/** The clock runs this long before it wraps; a scan is a second or two, so the wrap never shows. */
const CLOCK = 60;

function easeInOut(x: number) {
  'worklet';
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

function clamp01(x: number) {
  'worklet';
  return Math.max(0, Math.min(1, x));
}

/** The spinner at `t` seconds: where the arc starts (radians) and how far it runs. */
function arcAt(t: number) {
  'worklet';
  const p = (t % CYCLE) / CYCLE;
  const n = Math.floor(t / CYCLE);
  const head = easeInOut(clamp01(p / 0.6)) * 1.5 * Math.PI;
  const tail = easeInOut(clamp01((p - 0.35) / 0.65)) * 1.5 * Math.PI;
  return { start: t * 2.2 + n * 1.5 * Math.PI + tail, sweep: Math.max(head, tail + 0.12) - tail };
}

export function AimCircle({ size, mode, width, height, top }: { size: number; mode: AimMode; width: number; height: number; top: number }) {
  const R = size / 2;
  const s = R / 130;
  const stroke = 6 * s;
  const r = R - 7 * s;
  const C = 2 * Math.PI * r;
  // The check, in the circle's own box: short stroke down-right, long stroke up-right.
  const k = [
    [R - 0.3 * r, R + 0.02 * r],
    [R - 0.08 * r, R + 0.24 * r],
    [R + 0.32 * r, R - 0.2 * r],
  ];
  const tickD = `M${k[0][0]} ${k[0][1]}L${k[1][0]} ${k[1][1]}L${k[2][0]} ${k[2][1]}`;
  const tickLen = Math.hypot(k[1][0] - k[0][0], k[1][1] - k[0][1]) + Math.hypot(k[2][0] - k[1][0], k[2][1] - k[1][1]);

  const clock = useSharedValue(0);
  const scanOn = useSharedValue(0);
  const passOn = useSharedValue(0);
  const close = useSharedValue(0);
  const draw = useSharedValue(0);

  useEffect(() => {
    const scanning = mode === 'scan';
    scanOn.set(withTiming(scanning ? 1 : 0, { duration: scanning ? 200 : 180 }));
    if (scanning) {
      clock.set(0);
      clock.set(withRepeat(withTiming(CLOCK, { duration: CLOCK * 1000, easing: Easing.linear }), -1, false));
    } else cancelAnimation(clock);
    const passed = mode === 'pass';
    passOn.set(passed ? 1 : 0);
    close.set(passed ? withTiming(1, { duration: 380, easing: Easing.out(Easing.cubic) }) : 0);
    draw.set(passed ? withDelay(300, withTiming(1, { duration: 300, easing: Easing.out(Easing.quad) })) : 0);
  }, [mode, clock, scanOn, passOn, close, draw]);

  // The arc: its head races ahead, then its tail catches up, while the whole thing turns. Only the dash
  // offset animates (a fixed `C C` pattern, so the dash shows C - offset from the circle's start) and the
  // turn is a rotation: animating strokeDasharray itself crashed the app on iPhone (2026-11-22).
  const arcProps = useAnimatedProps(() => ({ strokeDashoffset: C - arcAt(clock.get()).sweep * r }));
  const arcTurn = useAnimatedStyle(() => ({ opacity: scanOn.get(), transform: [{ rotate: `${arcAt(clock.get()).start}rad` }] }));

  // Closing: the arc runs clockwise from twelve o'clock (the circle starts at three, so the view turns -90°).
  const closeProps = useAnimatedProps(() => ({ strokeDashoffset: C * (1 - close.get()) }));
  const tickProps = useAnimatedProps(() => ({ strokeDashoffset: tickLen * (1 - draw.get()) }));
  const edgeStyle = useAnimatedStyle(() => ({ opacity: 0.9 * (1 - scanOn.get()) * (1 - passOn.get()) }));
  const trackStyle = useAnimatedStyle(() => ({ opacity: scanOn.get() }));

  const left = (width - size) / 2;
  const cx = left + R;
  const cy = top + R;
  // The dim outside the circle: the whole screen with the circle cut out.
  const veil = `M0 0H${width}V${height}H0Z M${cx - R} ${cy}a${R} ${R} 0 1 0 ${size} 0a${R} ${R} 0 1 0 ${-size} 0Z`;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Path d={veil} fill="rgba(0,0,0,0.5)" fillRule="evenodd" />
      </Svg>
      <View style={[styles.ring, { left, top, width: size, height: size }]}>
        <Animated.View style={[StyleSheet.absoluteFill, edgeStyle]}>
          <Svg width={size} height={size}>
            <Circle cx={R} cy={R} r={R - 0.75} stroke="#FFFFFF" strokeWidth={1.5} fill="none" />
          </Svg>
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, trackStyle]}>
          <Svg width={size} height={size}>
            <Circle cx={R} cy={R} r={r} stroke="rgba(255,255,255,0.18)" strokeWidth={stroke} fill="none" />
          </Svg>
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, arcTurn]}>
          <Svg width={size} height={size}>
            <AnimatedCircle
              cx={R}
              cy={R}
              r={r}
              stroke="#FFFFFF"
              strokeWidth={stroke}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={`${C} ${C}`}
              animatedProps={arcProps}
            />
          </Svg>
        </Animated.View>
        {mode === 'pass' ? (
          <View style={[StyleSheet.absoluteFill, styles.fromTop]}>
            <Svg width={size} height={size}>
              <AnimatedCircle
                cx={R}
                cy={R}
                r={r}
                stroke="#FFFFFF"
                strokeWidth={stroke}
                strokeLinecap="round"
                fill="none"
                strokeDasharray={`${C} ${C}`}
                animatedProps={closeProps}
              />
            </Svg>
          </View>
        ) : null}
        {mode === 'pass' ? (
          <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
            <AnimatedPath
              d={tickD}
              stroke="#FFFFFF"
              strokeWidth={stroke * 1.4}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              strokeDasharray={`${tickLen} ${tickLen}`}
              animatedProps={tickProps}
            />
          </Svg>
        ) : null}
      </View>
    </View>
  );
}

/** Real Liquid Glass where iOS has it (26 and later); a dark smoke behind the camera's controls otherwise. */
const LIQUID = isLiquidGlassAvailable();

/** A Liquid Glass shape over the camera, as the iOS Camera app's controls (the close button, the hint capsule). */
export function CameraGlass({ style, children }: { style: StyleProp<ViewStyle>; children?: ReactNode }) {
  return (
    <View style={[style, !LIQUID && styles.smoke]}>
      {LIQUID ? <GlassView glassEffectStyle="regular" style={[StyleSheet.absoluteFill, styles.round]} /> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  ring: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  fromTop: { transform: [{ rotate: '-90deg' }] },
  smoke: { backgroundColor: 'rgba(0, 0, 0, 0.45)' },
  round: { borderRadius: 999 },
});
