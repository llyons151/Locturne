import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { Nocturne, NUMBER_FONT, Type } from '@/theme';

import type { Sideways } from './use-sideways';

const AnimatedPath = Animated.createAnimatedComponent(Path);

/**
 * The nap as a bedside clock: turn the phone on its side and the moon crosses the sky,
 * rising over the horizon on the left as the nap starts and setting below it on the
 * right as it ends, over the minutes left. Turn it back upright to leave.
 *
 * Coming in, the screen fades to black, then the clock fades in and the moon rises and
 * travels to where the nap is up to (the user didn't want it to twist with the phone). After a few seconds the clock dims for a
 * dark room; a tap brings it back.
 *
 * Built to sit on a nightstand without draining the battery: true black (OLED pixels
 * off), no running animations at rest, and while sideways the screen only changes once a
 * minute (every second in the last minute), when the moon eases to its next spot.
 */

/** moon-frosted.png: the disc is 2/3 of the image's width (see night-sky.tsx). */
const FROST_PAD = 1.5;

/** The horizon, as a share of the clock's height. Unseen: the moon just goes below it. */
const HORIZON = 0.85;

/** Where the moon waits below the horizon before rising, in nap progress (below 0). */
const BEHIND = -0.14;

/** How dim the clock gets once left alone, and how long that takes. */
const DIM = 0.4;
const DIM_AFTER_MS = 10_000;

const PATH = 'rgba(221,240,248,0.14)';
const TRAVELLED = 'rgba(221,240,248,0.32)';

/** Slow in and out, no bounce, as everywhere else in the app. */
const EASE = Easing.bezier(0.65, 0, 0.35, 1);
const FADE_MS = 400;

/** 1453 s → 25 min; in the last minute, a countdown: "0:42". */
function remaining(seconds: number) {
  const s = Math.max(0, Math.ceil(seconds));
  return s > 60
    ? { value: String(Math.ceil(s / 60)), unit: 'min', label: `${Math.ceil(s / 60)} minutes` }
    : { value: `0:${String(s % 60).padStart(2, '0')}`, unit: '', label: `${s} seconds` };
}

export function NapClock({
  side,
  progress,
  left,
  until,
}: {
  side: Sideways;
  /** 0 when the nap starts, 1 when it ends. */
  progress: number;
  /** Seconds left in the nap. */
  left: number;
  /** e.g. "Apps asleep until 3:12 pm". */
  until: string;
}) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();

  // Stays up after the phone turns upright, until the clock has faded out.
  const [visible, setVisible] = useState(false);
  if (side !== null && !visible) setVisible(true);
  // Which way the clock faces. Kept while it fades out, so it doesn't flip as it goes.
  const [turn, setTurn] = useState<90 | -90>(90);
  if (side !== null && side !== turn) setTurn(side);
  const open = useRef(false);

  // Bumped by a tap, to restart the wait before dimming.
  const [woken, setWoken] = useState(0);

  // 0 = gone, 1 = in: the black behind it, and everything on it. Leaving, everything on it
  // fades first and the black after, so the Nap tab comes back from a clean black.
  const shown = useSharedValue(0);
  const stage = useSharedValue(0);
  // Where the moon is along its path, in nap progress (below 0 is below the horizon).
  const moonAt = useSharedValue(BEHIND);
  // The arc and readout fading in after the black, and the dimming for a dark room.
  const contentIn = useSharedValue(0);
  const dim = useSharedValue(1);

  // The app stays portrait, so lay the clock out landscape and turn it to face the user.
  const W = Math.max(width, height);
  const H = Math.min(width, height);
  // The notch is on one side or the other depending on the turn; keep both clear.
  const pad = Math.max(insets.top, insets.bottom, 24);

  // The moon's path: a wide arc whose ends dip below the horizon on either side.
  const cx = W / 2;
  const cy = H * 0.9;
  const rx = (W - pad * 2) * 0.45;
  const ry = H * 0.7;
  const disc = H * 0.2;
  const image = disc * FROST_PAD;
  // Starts just clear of the horizon and ends just below it.
  const horizon = H * HORIZON;
  const rise = Math.PI - Math.asin((cy - (horizon - disc / 2 - 6)) / ry);
  const set = Math.asin((cy - (horizon + disc / 2 + 6)) / ry);

  const at = (p: number) => {
    'worklet';
    const angle = rise + (set - rise) * p;
    return { x: cx + rx * Math.cos(angle), y: cy - ry * Math.sin(angle) };
  };
  const start = at(0);
  const arcTo = (p: number) => {
    'worklet';
    const to = at(p);
    return `M ${start.x} ${start.y} A ${rx} ${ry} 0 0 1 ${to.x} ${to.y}`;
  };

  const p = Math.min(1, Math.max(0, progress));
  const time = remaining(left);

  // Turning sideways or back upright. Flipping from one side to the other just re-faces it.
  useEffect(() => {
    if (side !== null) {
      dim.set(1);
      if (open.current) return;
      open.current = true;
      stage.set(1);
      if (reduced) {
        moonAt.set(p);
        contentIn.set(1);
        shown.set(withTiming(1, { duration: 250 }));
        return;
      }
      // Fade to black, then the clock fades in and the moon rises from below the horizon
      // and travels to where the nap is up to.
      shown.set(withTiming(1, { duration: FADE_MS, easing: EASE }));
      moonAt.set(BEHIND);
      moonAt.set(withDelay(FADE_MS, withTiming(p, { duration: 1100 + 900 * p, easing: EASE })));
      contentIn.set(0);
      contentIn.set(withDelay(FADE_MS, withTiming(1, { duration: 800, easing: EASE })));
    } else if (open.current) {
      open.current = false;
      const out = { duration: reduced ? 150 : 300, easing: EASE };
      stage.set(withTiming(0, out));
      shown.set(
        withDelay(
          out.duration,
          withTiming(0, { duration: reduced ? 200 : FADE_MS, easing: EASE }, (finished) => {
            if (finished) scheduleOnRN(setVisible, false);
          }),
        ),
      );
    }
    // Only a turn of the phone plays these; `p` is followed below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [side, reduced]);

  // Each minute the moon eases on to its next spot. Nothing runs while the clock is away.
  useEffect(() => {
    if (!open.current) return;
    moonAt.set(reduced ? p : withTiming(p, { duration: 1500, easing: EASE }));
  }, [p, reduced, moonAt]);

  // Dim for a dark room once left alone.
  useEffect(() => {
    if (!visible) return;
    const id = setTimeout(() => dim.set(withTiming(DIM, { duration: 2000, easing: EASE })), DIM_AFTER_MS);
    return () => clearTimeout(id);
  }, [visible, woken, dim]);

  const brighten = () => {
    dim.set(withTiming(1, { duration: 300, easing: EASE }));
    setWoken((n) => n + 1);
  };

  const backdropStyle = useAnimatedStyle(() => ({ opacity: shown.value }));
  const stageStyle = useAnimatedStyle(() => ({ opacity: stage.value }));
  const moonStyle = useAnimatedStyle(() => {
    const m = at(moonAt.value);
    return { left: m.x - image / 2, top: m.y - image / 2 };
  });
  const dimStyle = useAnimatedStyle(() => ({ opacity: contentIn.value * dim.value }));
  const readoutStyle = useAnimatedStyle(() => ({
    opacity: contentIn.value * dim.value,
  }));
  const travelledProps = useAnimatedProps(() => ({
    d: arcTo(Math.max(0.001, moonAt.value)),
    strokeOpacity: moonAt.value > 0.002 ? 1 : 0,
  }));

  return (
    <Modal
      visible={visible}
      animationType="none"
      presentationStyle="overFullScreen"
      transparent
      statusBarTranslucent
      supportedOrientations={['portrait']}
    >
      <StatusBar hidden />
      <Animated.View style={[styles.black, backdropStyle]} />
      <Animated.View
        style={[
          styles.stage,
          { width: W, height: H, left: (width - W) / 2, top: (height - H) / 2, transform: [{ rotate: `${turn}deg` }] },
          stageStyle,
        ]}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={brighten}
          accessibilityLabel={`${time.label} left. ${until}.`}
          accessibilityHint="Brightens the clock"
        >
          {/* The sky, cut off at the horizon, so the moon rises over it and sets below it. */}
          <View style={[styles.sky, { height: horizon }]}>
            <Animated.View style={[StyleSheet.absoluteFill, dimStyle]}>
              <Svg width={W} height={H}>
                <Path d={arcTo(1)} stroke={PATH} strokeWidth={1.5} strokeDasharray="2 7" strokeLinecap="round" fill="none" />
                <AnimatedPath animatedProps={travelledProps} stroke={TRAVELLED} strokeWidth={1.5} strokeLinecap="round" fill="none" />
              </Svg>
            </Animated.View>

            <Animated.View style={[styles.moon, { width: image, height: image }, moonStyle]}>
              <Image
                source={require('@/assets/onboarding/moon-frosted.png')}
                style={StyleSheet.absoluteFill}
                contentFit="contain"
                accessible={false}
              />
            </Animated.View>
          </View>

          <Animated.View style={[styles.readout, { top: H * 0.34 }, readoutStyle]}>
            <Text style={[styles.time, { fontSize: H * 0.28, lineHeight: H * 0.32 }]} maxFontSizeMultiplier={1}>
              {time.value}
              {time.unit ? <Text style={[styles.unit, { fontSize: H * 0.09 }]}> {time.unit}</Text> : null}
            </Text>
            <Text style={styles.until} maxFontSizeMultiplier={1.2}>
              {until}
            </Text>
          </Animated.View>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  black: { ...StyleSheet.absoluteFill, backgroundColor: '#000' },
  stage: { position: 'absolute' },
  moon: { position: 'absolute' },
  sky: { position: 'absolute', top: 0, left: 0, right: 0, overflow: 'hidden' },
  readout: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  time: { ...NUMBER_FONT, color: Nocturne.text, fontVariant: ['tabular-nums'] },
  unit: { color: Nocturne.text2 },
  until: { ...Type.secondary, color: Nocturne.text2 },
});
