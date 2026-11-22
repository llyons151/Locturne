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
    close.set(passed ? withTiming(1, { duration: 380, easing: Easing.out(Easing.cubic) }) : 0);
    draw.set(passed ? withDelay(300, withTiming(1, { duration: 300, easing: Easing.out(Easing.quad) })) : 0);
  }, [mode, clock, scanOn, close, draw]);

  // The arc: its head races ahead, then its tail catches up, while the whole thing turns.
  const arcProps = useAnimatedProps(() => {
    const t = clock.get();
    const io = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
    const clamp = (x: number) => Math.max(0, Math.min(1, x));
    const p = (t % CYCLE) / CYCLE;
    const n = Math.floor(t / CYCLE);
    const head = io(clamp(p / 0.6)) * 1.5 * Math.PI;
    const tail = io(clamp((p - 0.35) / 0.65)) * 1.5 * Math.PI;
    const start = t * 2.2 + n * 1.5 * Math.PI + tail;
    const sweep = Math.max(head, tail + 0.12) - tail;
    const len = sweep * r;
    const at = (((start * r) % C) + C) % C;
    return { strokeDasharray: [len, C], strokeDashoffset: -at };
  });

  // Closing: the arc runs clockwise from twelve o'clock to a full ring (dash starts at three, so -C/4).
  const closeProps = useAnimatedProps(() => ({ strokeDasharray: [C * close.get(), C], strokeDashoffset: C / 4 }));
  const tickProps = useAnimatedProps(() => ({ strokeDashoffset: tickLen * (1 - draw.get()) }));
  const edgeStyle = useAnimatedStyle(() => ({ opacity: mode === 'pass' ? 0 : 0.9 * (1 - scanOn.get()) }));
  const spinStyle = useAnimatedStyle(() => ({ opacity: scanOn.get() }));

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
        <Animated.View style={[StyleSheet.absoluteFill, spinStyle]}>
          <Svg width={size} height={size}>
            <Circle cx={R} cy={R} r={r} stroke="rgba(255,255,255,0.18)" strokeWidth={stroke} fill="none" />
            <AnimatedCircle
              cx={R}
              cy={R}
              r={r}
              stroke="#FFFFFF"
              strokeWidth={stroke}
              strokeLinecap="round"
              fill="none"
              animatedProps={arcProps}
            />
          </Svg>
        </Animated.View>
        {mode === 'pass' ? (
          <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
            <AnimatedCircle cx={R} cy={R} r={r} stroke="#FFFFFF" strokeWidth={stroke} strokeLinecap="round" fill="none" animatedProps={closeProps} />
            <AnimatedPath
              d={tickD}
              stroke="#FFFFFF"
              strokeWidth={stroke * 1.4}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              strokeDasharray={[tickLen, tickLen]}
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
  smoke: { backgroundColor: 'rgba(0, 0, 0, 0.45)' },
  round: { borderRadius: 999 },
});
