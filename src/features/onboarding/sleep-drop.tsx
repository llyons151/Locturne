import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { AppTile } from '@/components/app-icons';
import { restingMoonDisc } from '@/components/night-sky';
import * as haptic from '@/lib/haptics';

/**
 * "Put N to sleep": the page falls away and the picked apps lift out of their rows, then
 * fall into the moon one after another, shrinking as they go, as if dropping away into
 * the distance, until they're gone. As the last one disappears the next screen comes in.
 * The moon itself never changes.
 */

export type IconOrigin = { x: number; y: number; size: number };

/** The script, in ms. */
const LIFT_MS = 420;
const FALL_MS = 1450;
const MAX_STAGGER = 210;
/** All the drops fit inside this, however many apps there are. */
const DROP_SPREAD = 950;
/** The next screen starts coming in when the last icon is this far through its fall. */
const HAND_OFF = 0.75;

/** Slow in, slow out: nothing snaps or bounces. */
const GLIDE = Easing.bezier(0.45, 0, 0.2, 1);
/**
 * Lets go gently, then eases into the moon: something falling away into the distance
 * slows down on screen as it gets farther off.
 */
const DROP = Easing.bezier(0.42, 0, 0.25, 1);
/** Shrinks steadily, so it's still visible when it reaches the moon. */
const AWAY = Easing.bezier(0.3, 0, 0.6, 1);

/** Stable pseudo-random numbers, so the choreography doesn't reshuffle on render. */
function rand(seed: number) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export function SleepDrop({
  apps,
  from,
  onDone,
}: {
  apps: string[];
  /** Where each app's icon sits on screen when the animation starts (centres, in points). */
  from: Record<string, IconOrigin>;
  onDone: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const reduced = useReducedMotion();
  const n = apps.length;
  const finished = useRef(false);

  const plan = useMemo(() => {
    const moon = restingMoonDisc(width, height);
    const top = moon.cy - moon.r;
    const stagger = n <= 1 ? 0 : Math.min(MAX_STAGGER, DROP_SPREAD / (n - 1));
    // They vanish a little way into the moon's face, close together.
    const spread = Math.min(width * 0.16, moon.r * 0.3) * Math.min(1, (n + 1) / 5);
    const land = apps.map((_, i) => {
      const u = n === 1 ? 0 : i / (n - 1) - 0.5;
      return { x: moon.cx + u * 2 * spread + (rand(i) - 0.5) * 8, y: top + moon.r * 0.42 };
    });
    // The bottom row goes first, so no icon falls through the ones below it.
    const delay = apps.map((_, i) => (n - 1 - i) * stagger);
    const last = Math.max(...delay);
    return { land, delay, handOff: last + LIFT_MS + FALL_MS * HAND_OFF };
  }, [apps, n, width, height]);

  useEffect(() => {
    const finish = () => {
      if (finished.current) return;
      finished.current = true;
      onDone();
    };
    if (reduced) {
      haptic.done();
      finish();
      return;
    }
    const timers = [
      setTimeout(haptic.tap, 0),
      ...plan.delay.map((d) => setTimeout(haptic.tick, d + LIFT_MS)),
      setTimeout(() => {
        haptic.done();
        finish();
      }, plan.handOff),
    ];
    return () => timers.forEach(clearTimeout);
    // Plays once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (reduced) return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {apps.map((app, i) => (
        <FallingIcon
          key={app}
          app={app}
          from={from[app] ?? { x: width / 2, y: height * 0.4, size: 32 }}
          to={plan.land[i]}
          delay={plan.delay[i]}
          seed={i}
        />
      ))}
    </View>
  );
}

/** One icon: rises a little out of its row, then falls away toward the moon, shrinking to nothing. */
function FallingIcon({
  app,
  from,
  to,
  delay,
  seed,
}: {
  app: string;
  from: IconOrigin;
  to: { x: number; y: number };
  delay: number;
  seed: number;
}) {
  // Drawn at 2x the row icon so it stays sharp while it grows on the lift.
  const size = from.size * 2;
  const x = useSharedValue(from.x);
  const y = useSharedValue(from.y);
  const scale = useSharedValue(0.5);
  const rot = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    const fall = delay + LIFT_MS;
    const tilt = (rand(seed + 7) - 0.5) * 16;
    x.value = withDelay(fall, withTiming(to.x, { duration: FALL_MS, easing: GLIDE }));
    y.value = withDelay(
      delay,
      withSequence(
        withTiming(from.y - 10, { duration: LIFT_MS, easing: GLIDE }),
        withTiming(to.y, { duration: FALL_MS, easing: DROP }),
      ),
    );
    scale.value = withDelay(
      delay,
      withSequence(
        withTiming(0.8, { duration: LIFT_MS, easing: GLIDE }),
        withTiming(0.14, { duration: FALL_MS, easing: AWAY }),
      ),
    );
    rot.value = withDelay(fall, withTiming(tilt, { duration: FALL_MS, easing: GLIDE }));
    // Fades out once it's over the moon's face.
    opacity.value = withDelay(fall + FALL_MS * 0.72, withTiming(0, { duration: FALL_MS * 0.28, easing: GLIDE }));
    // Plays once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: x.value - size / 2 },
      { translateY: y.value - size / 2 },
      { rotate: `${rot.value}deg` },
      { scale: scale.value },
    ],
  }));

  return (
    <Animated.View style={[styles.icon, { width: size, height: size }, style]}>
      <AppTile name={app} size={size} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  icon: { position: 'absolute', left: 0, top: 0 },
});
