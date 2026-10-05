import { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
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

import { useOnMoon } from '@/components/moon-surface';
import { Reveal } from '@/components/motion';
import * as haptic from '@/lib/haptics';
import { formatPreset } from '@/lib/text';
import { Nocturne, Radius, Space, Type } from '@/theme';

const HOURS = ['12', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'];
const MINUTES = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));
const PERIODS = ['am', 'pm'];
const SETTLE = { damping: 28, stiffness: 220, mass: 0.8 };
/** How far a flick carries, in seconds of release velocity. */
const FLICK_S = 0.22;

/** Scroll-wheel time picker (hour : minute am/pm) with a row of presets underneath. */
export function TimeWheel({
  value,
  onChange,
  presets,
  short = false,
}: {
  value: number;
  onChange: (minutes: number) => void;
  presets: number[];
  /** Five rows instead of seven, to leave room for something under the wheel. */
  short?: boolean;
}) {
  const { height } = useWindowDimensions();
  // Seven rows on a normal phone, five on short ones so the page still fits without scrolling.
  // The quiz moon leaves less room under its curve, so it drops two rows there.
  const moon = useOnMoon();
  const row = height < 700 ? 34 : 40;
  const visible = (height < 700 || short ? 5 : 7) - (moon ? 2 : 0);

  const hours24 = Math.floor(value / 60);
  const minute = value % 60;
  const hourIndex = hours24 % 12;
  const period = hours24 < 12 ? 0 : 1;
  const set = (h: number, m: number, p: number) => onChange((h + p * 12) * 60 + m);

  return (
    <Reveal style={styles.wrap}>
      <View style={[styles.wheels, { height: row * visible }]}>
        <View style={[styles.band, { top: (row * (visible - 1)) / 2, height: row }]} />
        <Column
          items={HOURS}
          index={hourIndex}
          onIndex={(i) => set(i, minute, period)}
          loop
          row={row}
          visible={visible}
          label="Hour"
          align="right"
        />
        <View style={[styles.colon, { height: row * visible }]}>
          <Text style={styles.colonText}>:</Text>
        </View>
        <Column
          items={MINUTES}
          index={minute}
          onIndex={(i) => set(hourIndex, i, period)}
          loop
          row={row}
          visible={visible}
          label="Minute"
          align="left"
        />
        <Column
          items={PERIODS}
          index={period}
          onIndex={(i) => set(hourIndex, minute, i)}
          row={row}
          visible={visible}
          label="AM or PM"
          align="center"
        />
      </View>

      <View style={styles.presetBlock}>
        <Text style={[styles.presetsLabel, moon && styles.presetsLabelOnMoon]}>Presets</Text>
        <View style={styles.presets} accessibilityRole="radiogroup">
          {presets.map((preset) => {
            const selected = preset === value;
            return (
              <Pressable
                key={preset}
                onPress={() => {
                  haptic.tap();
                  onChange(preset);
                }}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                style={({ pressed }) => [styles.preset, selected && styles.presetSelected, pressed && styles.pressed]}
              >
                <Text style={styles.presetLabel} numberOfLines={1} adjustsFontSizeToFit>
                  {formatPreset(preset)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </Reveal>
  );
}

/** Scroll-wheel number picker for age, same feel as the time wheel. */
export function AgeWheel({
  value,
  onChange,
  min,
  max,
}: {
  value: number;
  onChange: (age: number) => void;
  min: number;
  max: number;
}) {
  const { height } = useWindowDimensions();
  const row = height < 700 ? 40 : 48;
  const visible = height < 700 ? 5 : 7;
  const items = useMemo(() => Array.from({ length: max - min + 1 }, (_, i) => `${min + i}`), [min, max]);

  return (
    <Reveal style={styles.wrap}>
      <View style={[styles.wheels, { height: row * visible }]}>
        <View style={[styles.band, { top: (row * (visible - 1)) / 2, height: row }]} />
        <Column
          items={items}
          index={value - min}
          onIndex={(i) => onChange(min + i)}
          row={row}
          visible={visible}
          label="Age"
          align="center"
          wide
        />
      </View>
    </Reveal>
  );
}

type ColumnProps = {
  items: string[];
  index: number;
  onIndex: (index: number) => void;
  /** Wraps around (59 → 00) instead of stopping at the ends. */
  loop?: boolean;
  row: number;
  visible: number;
  label: string;
  align: 'left' | 'right' | 'center';
  /** Bigger type for a single-column wheel. */
  wide?: boolean;
};

function Column({ items, index, onIndex, loop = false, row, visible, label, align, wide = false }: ColumnProps) {
  const count = items.length;
  // Scroll position in rows. Unbounded when looping; the selected item is offset mod count.
  const offset = useSharedValue(index);
  const start = useSharedValue(0);
  // Ticks only while the user is driving it, not when a preset spins the wheel.
  const driving = useSharedValue(false);
  // Where the wheel last came to rest. Only rests the user caused are reported up;
  // syncing to a preset must not echo back through a stale closure.
  const settled = useSharedValue({ i: index, user: false });

  useAnimatedReaction(
    () => settled.get(),
    (now, before) => {
      if (before !== null && now !== before && now.user) scheduleOnRN(onIndex, now.i);
    },
  );

  // Follow outside changes (presets) by the shortest way round.
  useEffect(() => {
    if (index === settled.get().i) return;
    settled.set({ i: index, user: false });
    driving.set(false);
    const current = Math.round(offset.get());
    let delta = index - (((current % count) + count) % count);
    if (loop && delta > count / 2) delta -= count;
    if (loop && delta < -count / 2) delta += count;
    offset.set(withSpring(current + delta, SETTLE));
  }, [index, count, loop, offset, driving, settled]);

  useAnimatedReaction(
    () => Math.round(offset.get()),
    (now, before) => {
      if (before !== null && now !== before && driving.get()) scheduleOnRN(haptic.tap);
    },
  );

  const gesture = useMemo(() => {
    const settle = (target: number) => {
      'worklet';
      const t = loop ? target : Math.min(count - 1, Math.max(0, target));
      offset.set(withSpring(t, SETTLE));
      settled.set({ i: ((t % count) + count) % count, user: true });
    };

    const pan = Gesture.Pan()
      .onBegin(() => {
        cancelAnimation(offset);
        start.set(offset.get());
        driving.set(true);
      })
      .onUpdate((e) => {
        const next = start.get() - e.translationY / row;
        // Past either end of a fixed list, resist like a rubber band.
        offset.set(
          loop ? next : next < 0 ? next * 0.3 : next > count - 1 ? count - 1 + (next - count + 1) * 0.3 : next,
        );
      })
      .onEnd((e) => {
        settle(Math.round(offset.get() - (e.velocityY / row) * FLICK_S));
      });

    const tap = Gesture.Tap().onEnd((e) => {
      const steps = Math.round((e.y - (row * visible) / 2) / row);
      if (steps !== 0) {
        driving.set(true);
        settle(Math.round(offset.get()) + steps);
      }
    });
    return Gesture.Race(pan, tap);
  }, [loop, count, row, visible, offset, start, driving, settled]);

  const step = (delta: number) => {
    const next = loop ? (index + delta + count) % count : Math.min(count - 1, Math.max(0, index + delta));
    if (next !== index) {
      haptic.tap();
      onIndex(next);
    }
  };

  return (
    <GestureDetector gesture={gesture}>
      <View
        style={[styles.column, wide && styles.columnWide, { height: row * visible }]}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityValue={{ text: items[index] }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === 'increment') step(1);
          if (event.nativeEvent.actionName === 'decrement') step(-1);
        }}
      >
        {items.map((item, i) => (
          <Item
            key={item}
            label={item}
            i={i}
            count={count}
            loop={loop}
            offset={offset}
            row={row}
            visible={visible}
            align={align}
            wide={wide}
          />
        ))}
      </View>
    </GestureDetector>
  );
}

function Item({
  label,
  i,
  count,
  loop,
  offset,
  row,
  visible,
  align,
  wide,
}: {
  label: string;
  i: number;
  count: number;
  loop: boolean;
  offset: SharedValue<number>;
  row: number;
  visible: number;
  align: ColumnProps['align'];
  wide: boolean;
}) {
  const half = visible / 2;
  const style = useAnimatedStyle(() => {
    let d = i - offset.get();
    if (loop) d = ((((d + count / 2) % count) + count) % count) - count / 2;
    const far = Math.abs(d);
    return {
      opacity: far > half ? 0 : interpolate(far, [0, 1, 2, 3], [1, 0.5, 0.3, 0.14], 'clamp'),
      transform: [{ translateY: d * row }, { scale: interpolate(far, [0, 3], [1, 0.84], 'clamp') }],
    };
  });
  return (
    <Animated.View style={[styles.item, { top: (row * (visible - 1)) / 2, height: row }, style]}>
      <Text style={[styles.itemText, wide && styles.itemTextWide, { textAlign: align }]} maxFontSizeMultiplier={1.2}>
        {label}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Space.xl, alignSelf: 'stretch' },
  wheels: { flexDirection: 'row', justifyContent: 'center', alignSelf: 'center', gap: 8 },
  band: { position: 'absolute', left: -20, right: -20, borderRadius: 12, backgroundColor: Nocturne.surface },
  column: { width: 56, overflow: 'hidden' },
  columnWide: { width: 120 },
  colon: { width: 12, justifyContent: 'center', alignItems: 'center' },
  colonText: { color: Nocturne.text, fontSize: 24, fontWeight: '500', marginTop: -3 },
  item: { position: 'absolute', left: 0, right: 0, justifyContent: 'center' },
  itemText: { color: Nocturne.text, fontSize: 24, fontWeight: '500', fontVariant: ['tabular-nums'] },
  itemTextWide: { fontSize: 32, fontWeight: '600' },
  presetBlock: { gap: Space.s },
  presetsLabel: Type.label,
  presetsLabelOnMoon: { color: Nocturne.text },
  presets: { flexDirection: 'row', gap: 8 },
  preset: {
    flex: 1,
    minHeight: 44,
    borderRadius: Radius.control,
    borderWidth: 1,
    borderColor: Nocturne.edge,
    backgroundColor: Nocturne.surface,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetSelected: { borderColor: Nocturne.cta, borderWidth: 2 },
  presetLabel: { color: Nocturne.text, fontSize: 15, fontWeight: '600' },
  pressed: { opacity: 0.75 },
});
