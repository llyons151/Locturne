'use no memo';
// Reads the App Group stores during render (the mornings, the moons), which change outside React.

import { isMoonOrbViewAvailable, MoonOrbView } from 'moon-orb';
import { SymbolView } from 'expo-symbols';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  interpolate,
  scrollTo,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN, scheduleOnUI } from 'react-native-worklets';

import { sym } from '@/components/grouped-list';
import { MoonWater } from '@/components/moon-water';
import { Text } from '@/components/text';
import { closeSleepSheet, SHEET_PADDING } from '@/features/nap/sleep-sheet';
import * as haptic from '@/lib/haptics';
import { DisplayFont, Nocturne, Space, Type } from '@/theme';

import { checkSecretMoons, markSeen, settleMoons, useOwnedMoons } from './moon-collection';
import { wearAndRise } from './moon-rise';
import { moonSlots, slotLabel, type MoonSlot } from './moon-slots';
import { useWornMoon } from './moon-theme';

/** One stop on the wheel: the orb's width plus the room between orbs. */
const ITEM = 96;
const ORB = 64;
/** The row the orbs sit in: tall enough for the middle one at full size. */
const ROW = 84;
/** The ring round the middle orb. */
const RING = 84;
/** A locked moon's orb: grey water, so its colours stay the surprise (as the Moons page's grey icons). */
const LOCKED: string[] = ['#060608', '#17171C', '#2C2C33', '#5A5A64'];

/**
 * The moon wheel (user, 2026-11-07, take 8 of tools/orb-wheel-lab): tap Home's moon and this
 * floats up in the Sleep sheet's liquid-glass card. Every moon is its Sleep orb, the theme's icon,
 * on a wheel you slide sideways; the one in the ring is the pick, and Wear puts it on: the sheet
 * goes and the new moon rises, recolouring the sky, the moon and the orb. Locked moons sit on the
 * wheel too, grey with a lock, named only by when they come ("Morning 7"), never by name; the
 * secret one is a "?". Not now, under Wear, leaves it as it was.
 */
export function MoonWheel() {
  const owned = useOwnedMoons();
  const worn = useWornMoon();
  const reduced = useReducedMotion();

  // Earned before the first paint, so a moon that's due never shows as locked.
  useState(() => settleMoons());
  useEffect(() => {
    checkSecretMoons();
  }, []);
  // Every owned moon counts as seen once it closes, as on the Moons page.
  const ownedNow = useRef(owned);
  useEffect(() => {
    ownedNow.current = owned;
  }, [owned]);
  useEffect(() => () => markSeen(Object.keys(ownedNow.current)), []);

  const { main, extras } = moonSlots(owned);
  const slots = [...main, ...extras];
  const start = Math.max(0, slots.findIndex((s) => s.moon.id === worn.id));

  const [index, setIndex] = useState(start);
  const [width, setWidth] = useState(0);
  const x = useSharedValue(start * ITEM);
  const list = useAnimatedRef<Animated.ScrollView>();
  const last = useSharedValue(start);

  const onScroll = useAnimatedScrollHandler((e) => {
    x.set(e.contentOffset.x);
  });
  const settle = (i: number) => {
    setIndex(i);
    haptic.tap();
  };
  // A light click each time a new orb reaches the ring, like Apple's wheel pickers.
  useAnimatedReaction(
    () => Math.min(slots.length - 1, Math.max(0, Math.round(x.get() / ITEM))),
    (i) => {
      if (i === last.get()) return;
      last.set(i);
      scheduleOnRN(settle, i);
    },
  );
  // Opens on the moon you're wearing.
  const placed = useRef(false);
  const layout = (e: LayoutChangeEvent) => {
    setWidth(e.nativeEvent.layout.width);
    if (placed.current) return;
    placed.current = true;
    scheduleOnUI(() => {
      'worklet';
      scrollTo(list, start * ITEM, 0, false);
    });
  };

  const go = (i: number) => {
    scheduleOnUI(() => {
      'worklet';
      scrollTo(list, i * ITEM, 0, !reduced);
    });
  };

  const slot = slots[index];
  const wearing = slot.owned && slot.moon.id === worn.id;
  const wear = () => {
    haptic.done();
    closeSleepSheet();
    // The old moon drops and the new one rises as the card slides away (moon-rise.ts).
    wearAndRise(slot.moon.id);
  };
  const later = () => {
    haptic.tap();
    closeSleepSheet();
  };

  const side = Math.max(0, (width - ITEM) / 2);

  return (
    <View style={styles.sheet}>
      <Text style={styles.title} accessibilityRole="header">
        Theme
      </Text>
      <View style={styles.wheel} onLayout={layout}>
        {width ? <View pointerEvents="none" style={[styles.ring, { left: width / 2 - RING / 2 }]} /> : null}
        <Animated.ScrollView
          ref={list}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={ITEM}
          decelerationRate="fast"
          disableIntervalMomentum
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingHorizontal: side }}
        >
          {slots.map((s, i) => (
            <Stop key={s.moon.id} slot={s} i={i} x={x} near={Math.abs(i - index) <= 1} reduced={reduced} selected={i === index} onPress={() => go(i)} />
          ))}
        </Animated.ScrollView>
      </View>
      <View style={styles.actions}>
        {slot.owned ? (
          <Pressable
            onPress={wear}
            disabled={wearing}
            accessibilityRole="button"
            accessibilityState={{ disabled: wearing }}
            style={({ pressed }) => [styles.button, wearing && styles.buttonQuiet, pressed && styles.pressed]}
          >
            <Text style={[styles.buttonLabel, wearing && styles.buttonLabelQuiet]}>{wearing ? 'Wearing' : 'Wear'}</Text>
          </Pressable>
        ) : (
          <View style={[styles.button, styles.buttonQuiet]} accessibilityRole="text">
            <Text style={[styles.buttonLabel, styles.buttonLabelQuiet]}>{lockedLine(slot)}</Text>
          </View>
        )}
        <Pressable onPress={later} accessibilityRole="button" hitSlop={8} style={({ pressed }) => [styles.later, pressed && styles.pressed]}>
          <Text style={styles.laterLabel}>Not now</Text>
        </Pressable>
      </View>
    </View>
  );
}

/** What the button says on a locked moon: how far off it is, never what it is. */
function lockedLine(slot: MoonSlot): string {
  if (slot.secret) return 'Locked';
  const left = slot.left ?? 0;
  if (left <= 0) return 'Yours next morning';
  if (slot.unit === 'week') return left === 1 ? '1 more week' : `${left} more weeks`;
  return left === 1 ? '1 more morning' : `${left} more mornings`;
}

/** One orb on the wheel and its words, growing as it nears the ring. */
function Stop({
  slot,
  i,
  x,
  near,
  reduced,
  selected,
  onPress,
}: {
  slot: MoonSlot;
  i: number;
  x: SharedValue<number>;
  near: boolean;
  reduced: boolean;
  selected: boolean;
  onPress: () => void;
}) {
  const orb = useAnimatedStyle(() => {
    const d = Math.abs(x.get() / ITEM - i);
    return { transform: [{ scale: interpolate(d, [0, 1, 2], [1.12, 0.86, 0.78], 'clamp') }], opacity: interpolate(d, [0, 1, 2.5], [1, 0.72, 0.4], 'clamp') };
  });
  const words = useAnimatedStyle(() => ({ opacity: interpolate(Math.abs(x.get() / ITEM - i), [0, 1, 2], [1, 0.5, 0.25], 'clamp') }));
  const label = slotLabel(slot);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={slot.owned ? label : `${label}, locked`}
      accessibilityState={{ selected }}
      style={styles.stop}
    >
      <View style={styles.orbRow}>
        <Animated.View style={orb}>
          <Orb slot={slot} paused={!near || reduced} />
        </Animated.View>
      </View>
      <Animated.View style={words}>
        <Text style={[styles.name, !slot.owned && styles.lockedName]} numberOfLines={1}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

/** The moon's Sleep orb (the Metal Moonwell, or its SVG stand-in), grey with a lock until it's yours. */
function Orb({ slot, paused }: { slot: MoonSlot; paused: boolean }) {
  const colors = slot.owned ? slot.moon.orb : LOCKED;
  return (
    <View style={styles.orb}>
      {isMoonOrbViewAvailable ? (
        <MoonOrbView style={StyleSheet.absoluteFill} paused={paused} colors={colors} />
      ) : (
        <MoonWater size={ORB} reduced={paused} colors={colors} />
      )}
      {slot.owned ? null : (
        <View style={[StyleSheet.absoluteFill, styles.lock]}>
          {slot.secret ? (
            <Text style={styles.secret}>?</Text>
          ) : (
            <SymbolView name={sym('lock.fill', 'lock')} size={17} weight="semibold" tintColor="rgba(255, 255, 255, 0.62)" />
          )}
        </View>
      )}
    </View>
  );
}

// As the other Sleep-sheet pages (moon-picker.tsx, steps-sheet.tsx).
const styles = StyleSheet.create({
  sheet: { paddingTop: Space.m, gap: Space.l },
  title: { ...DisplayFont, color: Nocturne.text, fontSize: 19, lineHeight: 24, textAlign: 'center', marginTop: Space.xs },
  wheel: { height: ROW + Space.s + 20 },
  ring: {
    position: 'absolute',
    top: (ROW - RING) / 2,
    width: RING,
    height: RING,
    borderRadius: RING / 2,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.9)',
  },
  stop: { width: ITEM, alignItems: 'center', gap: Space.s },
  orbRow: { height: ROW, alignItems: 'center', justifyContent: 'center' },
  orb: { width: ORB, height: ORB, borderRadius: ORB / 2, overflow: 'hidden' },
  lock: { alignItems: 'center', justifyContent: 'center' },
  secret: { color: 'rgba(255, 255, 255, 0.7)', fontSize: 24, lineHeight: 28, fontWeight: '600' },
  name: { ...Type.caption, color: Nocturne.text, textAlign: 'center', maxWidth: ITEM - 6 },
  lockedName: { color: Nocturne.text2 },
  actions: { paddingHorizontal: SHEET_PADDING, gap: Space.xs },
  button: { minHeight: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 28, backgroundColor: Nocturne.cta },
  buttonQuiet: { backgroundColor: Nocturne.frost },
  buttonLabel: { color: Nocturne.onCta, fontSize: 17, fontWeight: '600' },
  buttonLabelQuiet: { color: Nocturne.text2 },
  later: { alignSelf: 'center', paddingVertical: Space.s, paddingHorizontal: Space.l },
  laterLabel: { ...Type.secondary, color: Nocturne.text2, textAlign: 'center' },
  pressed: { opacity: 0.7 },
});
