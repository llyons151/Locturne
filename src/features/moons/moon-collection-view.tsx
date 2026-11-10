'use no memo';
// Reads the App Group stores during render (the mornings, the moons), which change outside React.

import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { runOnJS, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { sym } from '@/components/grouped-list';
import { Text } from '@/components/text';
import * as haptic from '@/lib/haptics';
import { DisplayFont, Gap, Nocturne, Space, Type } from '@/theme';

import { checkSecretMoons, markSeen, MOONS_BG, settleMoons, useOwnedMoons } from './moon-collection';
import { MOONS } from './moon-data';
import { moonSlots, slotLabel, type MoonSlot } from './moon-slots';
import { wearAndRise } from './moon-rise';
import { DEFAULT_MOON, useWornMoon } from './moon-theme';
import { MoonThumb } from './moon-thumb';

const COLUMNS = 3;
const GAP = Space.m;
/** The top bar's close button, as on the schedule sheet. */
const CLOSE = 30;
/** Each side of the top bar, equal so the title sits in the middle. */
const SIDE = 72;

/**
 * The page scrolls like any iOS page: past either end it resists and springs back. Pulled down
 * off its top and let go this far past it (the rubber band halves the finger's travel, so about
 * twice this under the thumb), or flicked down from a little way, it closes (user, 2026-11-09).
 */
const PULL_CLOSE = 70;
const FLICK_FROM = 24;
/** Points per ms, iOS's own unit for the speed a drag ended at. */
const FLICK_SPEED = 1.2;

type Slot = MoonSlot;

/**
 * The moon collection (docs/reports/Moon collection flow.md, decisions 2026-11-01): Moonlight,
 * then the ladder in order, the secret's "?", then rare and limited moons, shown only once
 * yours (nothing you can miss ever sits there empty). Locked moons are grey with only when they
 * come, "Morning 3"; once yours, just its name, with no line under it (user, 2026-11-02). Tap one you own to wear it:
 * the collection closes and that moon rises.
 *
 * Shown as a sheet over the screen or as its own page grown out of the tab strip (`/moon-sheet`,
 * `/moon-page`, moons-page.tsx, which closes it with its own `onClose`). Both draw one top bar: close, "Moons", the count (user, 2026-11-01).
 */
export function MoonCollection({
  as,
  onClose = closeMoons,
  onPullClose,
}: {
  as: 'sheet' | 'page';
  onClose?: () => void;
  /** The page's close for when it's pulled down off its top and let go; without it, pulling only bounces. */
  onPullClose?: () => void;
}) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const owned = useOwnedMoons();
  const worn = useWornMoon();

  // Earned before the first paint, so a moon that's due never shows as "0 mornings left".
  useState(() => settleMoons());
  useEffect(() => {
    checkSecretMoons();
  }, []);
  // Every owned moon counts as seen once it closes.
  const ownedNow = useRef(owned);
  useEffect(() => {
    ownedNow.current = owned;
  }, [owned]);
  useEffect(() => () => markSeen(Object.keys(ownedNow.current)), []);

  const { main: slots, extras } = moonSlots(owned);
  // Every moon you have: Moonlight, which you start with, then every one earned, rare and secret too (user, 2026-11-02).
  const count = 1 + MOONS.filter((m) => m.id !== DEFAULT_MOON.id && owned[m.id]).length;
  const countLabel = count === 1 ? '1 moon' : `${count} moons`;

  const tile = Math.floor((width - Gap.gutter * 2 - GAP * (COLUMNS - 1)) / COLUMNS);
  const press = (slot: Slot) => {
    if (!slot.owned) return haptic.tick();
    // Wear it and go back: the page slides away and the new moon rises behind it (user, 2026-11-01).
    wearAndRise(slot.moon.id);
    haptic.tap();
    onClose();
  };

  // How far it's scrolled (under 0: pulled down past its top), and where it was let go to close.
  const scrollY = useSharedValue(0);
  const letGoAt = useSharedValue(0);
  const pullClose = () => {
    haptic.tap();
    onPullClose?.();
  };
  const canPull = onPullClose !== undefined;
  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
    onEndDrag: (e) => {
      const y = e.contentOffset.y;
      if (!canPull || letGoAt.value < 0) return;
      if (y < -PULL_CLOSE || (y < -FLICK_FROM && (e.velocity?.y ?? 0) < -FLICK_SPEED)) {
        letGoAt.value = y;
        runOnJS(pullClose)();
      }
    },
  });
  // Let go to close, the moons stay where the finger left them as the page drops, instead of
  // springing back up against it: this takes back the spring's travel.
  const held = useAnimatedStyle(() => ({
    transform: [{ translateY: letGoAt.value < 0 ? Math.min(0, scrollY.value) - letGoAt.value : 0 }],
  }));

  return (
    <Animated.ScrollView
      // The page bounces at both ends, even when every moon fits on the screen; the sheet has iOS's own pull.
      bounces={as === 'page'}
      alwaysBounceVertical={as === 'page'}
      overScrollMode={as === 'page' ? 'always' : 'never'}
      onScroll={onScroll}
      scrollEventThrottle={16}
      showsVerticalScrollIndicator={false}
      style={[styles.screen, held]}
      contentInsetAdjustmentBehavior="never"
      contentContainerStyle={[styles.content, { paddingTop: (as === 'page' ? insets.top : 0) + Space.xl, paddingBottom: insets.bottom + Gap.section }]}
    >
      {/* One row: the way out (the page slides up, so it goes back down), the title, the count. */}
      <View style={styles.head}>
        <View style={styles.side}>
        <Pressable
          onPress={() => {
            haptic.tap();
            onClose();
          }}
          accessibilityRole="button"
          accessibilityLabel="Close"
          hitSlop={8}
          style={({ pressed }) => [styles.close, pressed && styles.pressed]}
        >
          <SymbolView
            name={as === 'page' ? sym('chevron.down', 'expand_more') : sym('xmark', 'close')}
            size={13}
            weight="bold"
            tintColor={Nocturne.text2}
          />
        </Pressable>
        </View>
        <Text style={styles.title} accessibilityRole="header">
          Moons
        </Text>
        <View style={[styles.side, styles.sideEnd]}>
          <Text style={styles.count}>{countLabel}</Text>
        </View>
      </View>
      <Grid slots={slots} tile={tile} worn={worn.id} onPress={press} />
      {extras.length ? (
        <>
          <Text style={styles.group} accessibilityRole="header">
            Rare
          </Text>
          <Grid slots={extras} tile={tile} worn={worn.id} onPress={press} />
        </>
      ) : null}
    </Animated.ScrollView>
  );
}

function Grid({ slots, tile, worn, onPress }: { slots: Slot[]; tile: number; worn: string; onPress: (slot: Slot) => void }) {
  return (
    <View style={styles.grid}>
      {slots.map((slot) => {
        const name = slotLabel(slot);
        return (
          <Pressable
            key={slot.moon.id}
            onPress={() => onPress(slot)}
            accessibilityRole="button"
            accessibilityLabel={slot.owned ? name : `${name}, locked`}
            accessibilityState={{ selected: slot.moon.id === worn, disabled: !slot.owned }}
            style={({ pressed }) => [{ width: tile }, styles.slot, pressed && slot.owned && styles.pressed]}
          >
            <MoonThumb moon={slot.moon} size={tile} locked={!slot.owned} secret={slot.secret} wearing={slot.owned && slot.moon.id === worn} />
            <Text style={[styles.name, !slot.owned && styles.lockedName]} numberOfLines={1}>
              {name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function closeMoons() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: MOONS_BG },
  content: { paddingHorizontal: Gap.gutter },
  head: { flexDirection: 'row', alignItems: 'center', minHeight: CLOSE, marginBottom: Gap.block },
  close: {
    width: CLOSE,
    height: CLOSE,
    borderRadius: CLOSE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Nocturne.frost,
  },
  title: { ...DisplayFont, flex: 1, color: Nocturne.text, fontSize: 22, lineHeight: 28, textAlign: 'center' },
  side: { width: SIDE },
  sideEnd: { alignItems: 'flex-end' },
  count: { ...Type.secondary, color: Nocturne.text2, textAlign: 'right' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP, rowGap: Space.l },
  slot: { alignItems: 'center', gap: Space.xs },
  name: { ...Type.secondary, color: Nocturne.text, textAlign: 'center', marginTop: Space.xs },
  lockedName: { color: Nocturne.text2 },
  group: { ...Type.secondary, color: Nocturne.text2, textAlign: 'center', marginTop: Gap.section, marginBottom: Space.l },
  pressed: { opacity: 0.7 },
});
