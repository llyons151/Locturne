import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';
import { DanceRingView, isDanceRingViewAvailable } from 'dance-ring';

import { Text } from '@/components/text';
import { Nocturne, NUMBER_FONT } from '@/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** The ring's line, and the dim ring under it. White like the app's buttons; never a glow. */
const RING = Nocturne.text;
const RING_TRACK = 'rgba(255,255,255,0.16)';
/** A break fills the ring back up over this long, instead of cutting (user 2026-11-07). */
const REFILL_MS = 700;

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

/**
 * Dance's timer (user 2026-11-07, after Peloton Strength+'s set timer): the time left in a ring
 * that empties as you dance. Stop too long and the ring fills back up to the whole goal, the
 * count rolling back up with it, rather than snapping to the start.
 */
export function DanceTimer(props: { runMs: number; goal: number; met: boolean; size: number }) {
  return isDanceRingViewAvailable ? <NativeRing {...props} /> : <DrawnRing {...props} />;
}

/** On iPhone, SwiftUI's ring (modules/dance-ring): round ends, the digits rolling. */
function NativeRing({ runMs, goal, met, size }: { runMs: number; goal: number; met: boolean; size: number }) {
  const left = met ? 0 : Math.max(0, Math.min(1, 1 - runMs / (goal * 1000)));
  return (
    <DanceRingView
      style={{ width: size, height: size }}
      left={left}
      seconds={Math.ceil(left * goal - 0.001)}
      lineWidth={ringWidth(size)}
      fontSize={Math.round(size * 0.25)}
      refillMs={REFILL_MS}
    />
  );
}

const ringWidth = (size: number) => Math.max(6, Math.round(size * 0.07));

/** Elsewhere (the web previews, or a build from before the Swift ring), the same ring in SVG. */
function DrawnRing({ runMs, goal, met, size }: { runMs: number; goal: number; met: boolean; size: number }) {
  const reduced = useReducedMotion();
  const goalMs = goal * 1000;
  const target = met ? 0 : Math.max(0, Math.min(1, 1 - runMs / goalMs));
  const left = useSharedValue(target);
  const [seconds, setSeconds] = useState(Math.ceil(target * goal));

  useEffect(() => {
    // Up (a broken run) eases back to full; down follows the frames, about 30 a second.
    const refill = target > left.get() + 0.02;
    left.set(
      reduced
        ? target
        : withTiming(target, refill ? { duration: REFILL_MS, easing: Easing.out(Easing.cubic) } : { duration: 120, easing: Easing.linear }),
    );
  }, [target, reduced, left]);

  // The number reads off the ring, so it climbs back with the refill. Whole seconds only.
  useAnimatedReaction(
    () => Math.ceil(left.get() * goal - 0.001),
    (now, was) => {
      if (now !== was) scheduleOnRN(setSeconds, Math.max(0, now));
    },
    [goal],
  );

  const stroke = ringWidth(size);
  const r = (size - stroke) / 2;
  const around = 2 * Math.PI * r;
  const ringProps = useAnimatedProps(() => ({ strokeDashoffset: around * (1 - left.get()) }));
  const font = Math.round(size * 0.25);

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={RING_TRACK} strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={RING}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${around} ${around}`}
          animatedProps={ringProps}
          // From twelve o'clock, emptying clockwise.
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.middle}>
        <Text style={[styles.number, { fontSize: font, lineHeight: Math.round(font * 1.15) }]} maxFontSizeMultiplier={1.2}>
          {clock(met ? 0 : seconds)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  middle: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  number: { ...NUMBER_FONT, color: Nocturne.text, fontVariant: ['tabular-nums'] },
  track: { height: 6, borderRadius: 3, backgroundColor: RING_TRACK, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3, backgroundColor: RING },
});

/**
 * The camera's bar along the ledge: white on a dim track like the ring (user 2026-11-07: the
 * blue looked off), easing between counts so a broken run slides back down instead of cutting.
 */
export function CameraBar({ progress }: { progress: number }) {
  const reduced = useReducedMotion();
  const target = Math.max(0, Math.min(1, progress));
  const fill = useSharedValue(target);
  useEffect(() => {
    const back = target < fill.get() - 0.02;
    fill.set(reduced ? target : withTiming(target, { duration: back ? REFILL_MS : 200, easing: Easing.out(Easing.cubic) }));
  }, [target, reduced, fill]);
  const width = useAnimatedStyle(() => ({ width: `${fill.get() * 100}%` }));
  return (
    <View style={styles.track}>
      <Animated.View style={[styles.fill, width]} />
    </View>
  );
}
