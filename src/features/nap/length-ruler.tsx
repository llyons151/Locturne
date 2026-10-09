import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  interpolate,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Nocturne } from '@/theme';

/**
 * The nap length as a ruler you drag sideways, from the user's reference (TIDE's focus card,
 * 2026-10-08): fine ticks that fade toward the ends and one taller mark in the middle. Each tick
 * is five minutes; a flick carries on and settles on the nearest one.
 *
 * Its own pan rather than a ScrollView so it settles exactly on a tick, and so the sheet's
 * swipe-down still wins when the finger goes down instead of across.
 */

export const NAP_STEP = 5;
export const NAP_MIN = 5;
export const NAP_MAX = 240;
const COUNT = (NAP_MAX - NAP_MIN) / NAP_STEP + 1;
/** Points between ticks. */
const GAP = 12;
const SETTLE = { damping: 32, stiffness: 300, mass: 1 };

const indexOf = (minutes: number) => Math.round((Math.min(NAP_MAX, Math.max(NAP_MIN, minutes)) - NAP_MIN) / NAP_STEP);

export function LengthRuler({ value, onChange }: { value: number; onChange: (minutes: number) => void }) {
  const [width, setWidth] = useState(0);
  // How far along the ruler the middle mark sits, in points.
  const offset = useSharedValue(indexOf(value) * GAP);
  const start = useSharedValue(0);
  const end = (COUNT - 1) * GAP;

  const snapTo = (index: number, velocity = 0) => {
    'worklet';
    const i = Math.min(COUNT - 1, Math.max(0, index));
    offset.set(withSpring(i * GAP, { ...SETTLE, velocity }));
  };

  const pan = Gesture.Pan()
    .activeOffsetX([-6, 6])
    .failOffsetY([-12, 12])
    .onStart(() => {
      cancelAnimation(offset);
      start.set(offset.get());
    })
    .onUpdate((e) => {
      const x = start.get() - e.translationX;
      // Past either end it gives a little, then holds.
      const over = x < 0 ? x : x > end ? x - end : 0;
      offset.set(over === 0 ? x : x - over + Math.sign(over) * Math.sqrt(Math.abs(over)) * 3);
    })
    .onEnd((e) => {
      // Where the flick would coast to, rounded to a tick.
      const projected = offset.get() - e.velocityX * 0.16;
      snapTo(Math.round(projected / GAP), -e.velocityX);
    });

  // A new length each time the middle mark crosses a tick.
  useAnimatedReaction(
    () => Math.min(COUNT - 1, Math.max(0, Math.round(offset.value / GAP))),
    (i, previous) => {
      if (previous !== null && i !== previous) scheduleOnRN(onChange, NAP_MIN + i * NAP_STEP);
    },
  );

  const track = useAnimatedStyle(() => ({ transform: [{ translateX: width / 2 - GAP / 2 - offset.value }] }));

  const step = (by: 1 | -1) => snapTo(indexOf(value) + by);

  return (
    <View
      style={styles.ruler}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel="Nap length"
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => step(e.nativeEvent.actionName === 'increment' ? 1 : -1)}
    >
      <GestureDetector gesture={pan}>
        <View style={styles.touch} collapsable={false}>
          <Animated.View style={[styles.track, track]}>
            {Array.from({ length: COUNT }, (_, i) => (
              <Tick key={i} at={i * GAP} offset={offset} half={width / 2} />
            ))}
          </Animated.View>
          <View pointerEvents="none" style={[styles.mark, { left: width / 2 - MARK_WIDTH / 2 }]} />
        </View>
      </GestureDetector>
    </View>
  );
}

/** One tick, fading out as it nears either end of the ruler. */
function Tick({ at, offset, half }: { at: number; offset: SharedValue<number>; half: number }) {
  const style = useAnimatedStyle(() => {
    const d = half > 0 ? Math.abs(at - offset.value) / half : 1;
    return { opacity: interpolate(d, [0, 0.12, 0.75, 1], [0, 0.55, 0.3, 0], 'clamp') };
  });
  return (
    <View style={styles.slot}>
      <Animated.View style={[styles.tick, style]} />
    </View>
  );
}

const MARK_WIDTH = 3;

const styles = StyleSheet.create({
  ruler: { alignSelf: 'stretch', height: 36 },
  touch: { flex: 1, overflow: 'hidden', justifyContent: 'center' },
  track: { flexDirection: 'row', alignItems: 'center', position: 'absolute', left: 0, top: 0, bottom: 0 },
  slot: { width: GAP, alignItems: 'center' },
  tick: { width: 1.5, height: 9, borderRadius: 1, backgroundColor: Nocturne.text },
  mark: { position: 'absolute', top: 8, width: MARK_WIDTH, height: 20, borderRadius: 1.5, backgroundColor: Nocturne.text },
});
