'use no memo';
// Reads the App Group stores during render (the mornings, the moons), which change outside React.

import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { sym } from '@/components/grouped-list';
import { Text } from '@/components/text';
import * as haptic from '@/lib/haptics';
import { readLock } from '@/lib/lock-controller';
import { getFirstMorning, getMorningsWon } from '@/lib/morning-proof';
import { DisplayFont, Gap, Nocturne, Space, Type } from '@/theme';

import { checkSecretMoons, isSecret, LIMITED, markSeen, MOONS_BG, settleMoons, useOwnedMoons } from './moon-collection';
import { LADDER, MOONS } from './moon-data';
import { LADDER_MORNINGS, ladderNeed, RARE_MOONS } from './moon-ladder';
import { wearAndRise } from './moon-rise';
import { DEFAULT_MOON, useWornMoon } from './moon-theme';
import { MoonThumb } from './moon-thumb';
import type { MoonDef } from './moon-types';

const BY_ID = new Map(MOONS.map((m) => [m.id, m]));
const COLUMNS = 3;
const GAP = Space.m;
/** The top bar's close button, as on the schedule sheet. */
const CLOSE = 30;
/** Each side of the top bar, equal so the title sits in the middle. */
const SIDE = 72;
/** The ladder's moons with a count (nine by mornings, the Eclipse): the secret isn't counted. */
const COUNTED = LADDER.slice(0, LADDER_MORNINGS.length + 1).filter((id): id is string => !!id);

type Slot = {
  moon: MoonDef;
  owned: boolean;
  /** A locked moon's one line instead of its name: "Morning 3", "Week 50" (user, 2026-11-02: no name till it's yours). */
  title?: string;
  secret?: boolean;
};

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
export function MoonCollection({ as, onClose = closeMoons }: { as: 'sheet' | 'page'; onClose?: () => void }) {
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

  const mornings = getMorningsWon();
  const today = readLock().morningKey;
  const firstMorning = getFirstMorning();

  const ladder: Slot[] = LADDER.flatMap((id, i): Slot[] => {
    const moon = id ? BY_ID.get(id) : undefined;
    if (!id || !moon) return [];
    if (isSecret(id)) {
      return owned[id] ? [{ moon, owned: true }] : [{ moon, owned: false, secret: true }];
    }
    if (owned[id]) return [{ moon, owned: true }];
    const need = ladderNeed(i, { mornings, firstMorning, today });
    return [{ moon, owned: false, title: need?.at ?? moon.name }];
  });
  const extras: Slot[] = [...RARE_MOONS, ...LIMITED.map((l) => l.id)].flatMap((id): Slot[] => {
    const moon = BY_ID.get(id);
    return moon && owned[id] ? [{ moon, owned: true }] : [];
  });
  const slots: Slot[] = [{ moon: DEFAULT_MOON, owned: true }, ...ladder];
  const count = COUNTED.filter((id) => owned[id]).length;

  const tile = Math.floor((width - Gap.gutter * 2 - GAP * (COLUMNS - 1)) / COLUMNS);
  const press = (slot: Slot) => {
    if (!slot.owned) return haptic.tick();
    // Wear it and go back: the page slides away and the new moon rises behind it (user, 2026-11-01).
    wearAndRise(slot.moon.id);
    haptic.tap();
    onClose();
  };

  return (
    <ScrollView
      style={styles.screen}
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
          <Text style={styles.count} accessibilityLabel={`${count} of ${COUNTED.length} moons`}>{`${count} of ${COUNTED.length}`}</Text>
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
    </ScrollView>
  );
}

function Grid({ slots, tile, worn, onPress }: { slots: Slot[]; tile: number; worn: string; onPress: (slot: Slot) => void }) {
  return (
    <View style={styles.grid}>
      {slots.map((slot) => {
        const name = slot.owned ? slot.moon.name : slot.secret ? 'Secret moon' : (slot.title ?? slot.moon.name);
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
