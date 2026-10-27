import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Text } from '@/components/text';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { SymbolView } from 'expo-symbols';
import Animated, {
  cancelAnimation,
  interpolate,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useOnMoon } from '@/components/moon-surface';
import { Reveal } from '@/components/motion';
import * as haptic from '@/lib/haptics';
import { APP_FONT, Nocturne, Space } from '@/theme';

const HOURS = ['12', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'];
const MINUTES = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));
const PERIODS = ['am', 'pm'];
const PLAIN_MINUTES = Array.from({ length: 60 }, (_, i) => `${i}`);
const SETTLE = { damping: 28, stiffness: 220, mass: 0.8 };
/** How far a flick carries, in seconds of release velocity. */
const FLICK_S = 0.22;
/** The time list's column, and its white pill centred in it. */
const PILL_COLUMN = 240;
const PILL_WIDTH = 210;
const DAY = 24 * 60;
/** The time list's step, in minutes. */
const STEP = 15;
const TIMES = Array.from({ length: DAY / STEP }, (_, i) => {
  const h = Math.floor((i * STEP) / 60);
  const m = ((i * STEP) % 60).toString().padStart(2, '0');
  return `${h % 12 || 12}:${m} ${h < 12 ? 'AM' : 'PM'}`;
});

/** Scroll-wheel time picker (hour : minute am/pm). */
export function TimeWheel({
  value,
  onChange,
  short = false,
}: {
  value: number;
  onChange: (minutes: number) => void;
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

    </Reveal>
  );
}

/**
 * One centred column of clock times every quarter hour (Structured's picker): the chosen one on a
 * white pill with an alarm clock (or a moon, for bedtime) beside it, arrows above and below that step it.
 */
export function TimeList({
  value,
  onChange,
  label,
  short = false,
  icon = 'alarm',
}: {
  value: number;
  onChange: (minutes: number) => void;
  /** What the time is, for VoiceOver. */
  label: string;
  /** What sits beside the chosen time: an alarm clock for waking, a moon for bedtime. */
  icon?: PillIcon;
  /** Five rows instead of seven, to leave room for something under the list. */
  short?: boolean;
}) {
  const { height } = useWindowDimensions();
  const moon = useOnMoon();
  const row = height < 700 ? 36 : 42;
  const visible = (height < 700 || short ? 5 : 7) - (moon ? 2 : 0);
  const index = Math.round(value / STEP) % TIMES.length;

  // A time off the quarter hour (set elsewhere) snaps to the row it shows as.
  useEffect(() => {
    if (value % STEP) onChange(index * STEP);
  }, [value, index, onChange]);

  const step = (delta: number) => {
    haptic.tap();
    onChange((((index + delta) % TIMES.length) + TIMES.length) % TIMES.length * STEP);
  };

  return (
    <Reveal style={styles.list}>
      <Arrow direction="up" onPress={() => step(-1)} />
      <View style={[styles.wheels, { height: row * visible }]}>
        <View style={[styles.pill, { top: (row * (visible - 1)) / 2, height: row, borderRadius: row / 2 }]} />
        <Column
          items={TIMES}
          index={index}
          onIndex={(i) => onChange(i * STEP)}
          loop
          row={row}
          visible={visible}
          label={label}
          align="center"
          pill
          icon={icon}
        />
      </View>
      <Arrow direction="down" onPress={() => step(1)} />
    </Reveal>
  );
}

function Arrow({ direction, onPress }: { direction: 'up' | 'down'; onPress: () => void }) {
  const up = direction === 'up';
  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={up ? 'Earlier' : 'Later'}
      style={({ pressed }) => [styles.arrow, pressed && styles.pressed]}
    >
      <SymbolView
        name={up ? { ios: 'arrow.up', android: 'arrow_upward', web: 'arrow_upward' } : { ios: 'arrow.down', android: 'arrow_downward', web: 'arrow_downward' }}
        size={20}
        tintColor={Nocturne.text2}
      />
    </Pressable>
  );
}

/** A single wheel of whole numbers from `min` to `max`, same feel as the time wheel. */
export function NumberWheel({
  value,
  onChange,
  min,
  max,
  label,
}: {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  /** What the number counts, for VoiceOver. */
  label: string;
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
          label={label}
          align="center"
          wide
        />
      </View>
    </Reveal>
  );
}

/** An hours and minutes length of time (0 hr up to `maxHours`, 0–59 min), same feel as the time wheel. */
export function DurationWheel({
  value,
  onChange,
  maxHours,
}: {
  /** Minutes. */
  value: number;
  onChange: (minutes: number) => void;
  maxHours: number;
}) {
  const { height } = useWindowDimensions();
  const row = height < 700 ? 34 : 40;
  const visible = 5;
  const hours = useMemo(() => Array.from({ length: maxHours + 1 }, (_, h) => `${h}`), [maxHours]);
  const h = Math.floor(value / 60);
  const m = value % 60;

  return (
    <Reveal style={styles.wrap}>
      <View style={[styles.wheels, { height: row * visible }]}>
        <View style={[styles.band, { top: (row * (visible - 1)) / 2, height: row }]} />
        <Column
          items={hours}
          index={h}
          onIndex={(i) => onChange(i * 60 + m)}
          row={row}
          visible={visible}
          label="Hours"
          align="right"
        />
        <View style={[styles.unit, { height: row * visible }]}>
          <Text style={styles.unitText}>hr</Text>
        </View>
        <Column
          items={PLAIN_MINUTES}
          index={m}
          onIndex={(i) => onChange(h * 60 + i)}
          loop
          row={row}
          visible={visible}
          label="Minutes"
          align="right"
        />
        <View style={[styles.unit, { height: row * visible }]}>
          <Text style={styles.unitText}>min</Text>
        </View>
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
  /** The time list: the centred row turns dark to sit on its white pill. */
  pill?: boolean;
  /** The symbol beside the pill's time. */
  icon?: PillIcon;
};

type PillIcon = 'alarm' | 'moon';

const PILL_SYMBOLS = {
  alarm: { ios: 'alarm.fill', android: 'alarm', web: 'alarm' },
  moon: { ios: 'moon.fill', android: 'bedtime', web: 'bedtime' },
} as const;

function Column({
  items,
  index,
  onIndex,
  loop = false,
  row,
  visible,
  label,
  align,
  wide = false,
  pill = false,
  icon = 'alarm',
}: ColumnProps) {
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

  // The rows near the selection mount first and the rest a few per frame. All 96 of the time
  // list's rows at once, each with its own animated styles, took about half a second, which
  // froze onboarding's page fade. Once they're all in, nothing re-renders under a drag.
  const [reach, setReach] = useState(Math.ceil(visible / 2) + 2);
  useEffect(() => {
    if (reach >= (loop ? count / 2 : count)) return;
    const id = requestAnimationFrame(() => setReach((r) => r + 4));
    return () => cancelAnimationFrame(id);
  }, [reach, count, loop]);
  const mounted = (i: number) => {
    let d = i - index;
    if (loop) d = ((((d + count / 2) % count) + count) % count) - count / 2;
    return Math.abs(d) <= reach;
  };

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
        style={[styles.column, wide && styles.columnWide, pill && styles.columnPill, { height: row * visible }]}
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
        {items.map((item, i) =>
          mounted(i) ? (
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
              pill={pill}
              icon={icon}
            />
          ) : null,
        )}
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
  pill,
  icon,
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
  pill: boolean;
  icon: PillIcon;
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
  const near = useDerivedValue(() => {
    let d = i - offset.get();
    if (loop) d = ((((d + count / 2) % count) + count) % count) - count / 2;
    return Math.abs(d);
  });
  // On the pill a time is dark, off it light. Two copies crossfade rather than one animating its
  // colour: iOS can only set opacity and transforms straight on the view, and a colour went
  // through a full layout commit every frame the wheel moved.
  const clock = useAnimatedStyle(() => ({ opacity: interpolate(near.get(), [0, 0.5], [1, 0], 'clamp') }));
  const away = useAnimatedStyle(() => ({ opacity: interpolate(near.get(), [0, 0.5], [0, 1], 'clamp') }));
  const text = [APP_FONT, styles.itemText, wide && styles.itemTextWide, pill && styles.itemTextPill, { textAlign: align }];
  return (
    <Animated.View style={[styles.item, { top: (row * (visible - 1)) / 2, height: row }, style]}>
      <View style={pill && styles.itemCentre}>
        {pill ? (
          // Hangs off the text's left edge, so every time stays centred whether or not it's showing.
          <Animated.View style={[styles.clock, clock]}>
            <SymbolView name={PILL_SYMBOLS[icon]} size={18} tintColor={Nocturne.onCta} />
          </Animated.View>
        ) : null}
        {pill ? (
          <View>
            <Animated.Text style={[text, away]} maxFontSizeMultiplier={1.2}>
              {label}
            </Animated.Text>
            <Animated.Text style={[text, styles.itemTextOnPill, clock]} maxFontSizeMultiplier={1.2}>
              {label}
            </Animated.Text>
          </View>
        ) : (
          <Animated.Text style={text} maxFontSizeMultiplier={1.2}>
            {label}
          </Animated.Text>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'stretch' },
  wheels: { flexDirection: 'row', justifyContent: 'center', alignSelf: 'center', gap: 8 },
  // A veil, like iOS's own wheels, so it takes the colour of whatever it sits on (a sheet's glass too).
  band: { position: 'absolute', left: -20, right: -20, borderRadius: 12, backgroundColor: 'rgba(255, 255, 255, 0.08)' },
  column: { width: 56, overflow: 'hidden' },
  columnWide: { width: 120 },
  columnPill: { width: PILL_COLUMN },
  list: { alignSelf: 'stretch', alignItems: 'center', gap: Space.s },
  arrow: { padding: 6 },
  // Behind the time list's centred row.
  // Plain numbers: `left: '50%'` with a negative margin landed ~50pt right on an iPhone (2026-10-26).
  pill: { position: 'absolute', left: (PILL_COLUMN - PILL_WIDTH) / 2, width: PILL_WIDTH, backgroundColor: Nocturne.cta },
  colon: { width: 12, justifyContent: 'center', alignItems: 'center' },
  colonText: { color: Nocturne.text, fontSize: 24, fontWeight: '500', marginTop: -3 },
  unit: { width: 40, justifyContent: 'center' },
  unitText: { color: Nocturne.text2, fontSize: 17, fontWeight: '500' },
  item: { position: 'absolute', left: 0, right: 0, justifyContent: 'center' },
  itemText: { color: Nocturne.text, fontSize: 24, fontWeight: '500', fontVariant: ['tabular-nums'] },
  itemTextWide: { fontSize: 32, fontWeight: '600' },
  itemTextPill: { fontSize: 20, fontWeight: '600' },
  itemTextOnPill: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, color: Nocturne.onCta },
  itemCentre: { alignSelf: 'center', justifyContent: 'center' },
  clock: { position: 'absolute', left: -28, top: 0, bottom: 0, justifyContent: 'center' },
  pressed: { opacity: 0.6 },
});
