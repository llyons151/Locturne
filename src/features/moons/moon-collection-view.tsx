'use no memo';
// Reads the App Group stores during render (the mornings, the moons), which change outside React.

import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/text';
import * as haptic from '@/lib/haptics';
import { readLock } from '@/lib/lock-controller';
import { getFirstMorning, getMorningsWon } from '@/lib/morning-proof';
import { DisplayFont, Gap, Nocturne, Space, Type } from '@/theme';

import { checkSecretMoon, LIMITED, markSeen, SECRET_MOON, settleMoons, useOwnedMoons } from './moon-collection';
import { LADDER, MOONS } from './moon-data';
import { LADDER_MORNINGS, ladderNeed, RARE_MOON, SECRET_STEPS } from './moon-ladder';
import { DEFAULT_MOON, setMoon, useMoon } from './moon-theme';
import { MoonThumb } from './moon-thumb';
import type { MoonDef } from './moon-types';

const BY_ID = new Map(MOONS.map((m) => [m.id, m]));
const COLUMNS = 3;
const GAP = Space.m;
/** The ladder's moons with a count (nine by mornings, the Eclipse): the secret isn't counted. */
const COUNTED = LADDER.slice(0, LADDER_MORNINGS.length + 1).filter((id): id is string => !!id);

type Slot = {
  moon: MoonDef;
  owned: boolean;
  /** Under its name: "Wearing", "New", "Morning 3", "1 morning left"… */
  status: string;
  secret?: boolean;
};

/**
 * The moon collection (docs/reports/Moon collection flow.md, decisions 2026-11-01): Moonlight,
 * then the ladder in order, the secret's "?", then rare and limited moons, shown only once
 * yours (nothing you can miss ever sits there empty). Locked moons are grey with their name and
 * when they come; only the next says how many mornings are left. Tap one you own to wear it.
 *
 * Shown as a sheet over the screen or as its own page (`/moon-sheet`, `/moon-page`); `title`
 * draws the heading inside, for the sheet (the page has the native one).
 */
export function MoonCollection({ title }: { title: boolean }) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const owned = useOwnedMoons();
  const worn = useMoon();

  // Earned before the first paint, so a moon that's due never shows as "0 mornings left".
  useState(() => settleMoons());
  useEffect(() => {
    checkSecretMoon().catch(() => {});
  }, []);
  // What's new keeps its "New" for this visit, and has been seen once it closes.
  const ownedNow = useRef(owned);
  useEffect(() => {
    ownedNow.current = owned;
  }, [owned]);
  useEffect(() => () => markSeen(Object.keys(ownedNow.current)), []);

  const mornings = getMorningsWon();
  const today = readLock().morningKey;
  const firstMorning = getFirstMorning();
  const statusOf = (id: string, fallback: string) => {
    if (worn.id === id) return 'Wearing';
    if (owned[id] && !owned[id].seen) return 'New';
    return fallback;
  };

  // The next moon by mornings: the only one that counts down.
  const next = LADDER.findIndex((id, i) => i < LADDER_MORNINGS.length && id && !owned[id]);
  const ladder: Slot[] = LADDER.flatMap((id, i): Slot[] => {
    const moon = id ? BY_ID.get(id) : undefined;
    if (!id || !moon) return [];
    if (id === SECRET_MOON) {
      return owned[id] ? [{ moon, owned: true, status: statusOf(id, 'Secret') }] : [{ moon, owned: false, status: 'Tap for a hint', secret: true }];
    }
    if (owned[id]) return [{ moon, owned: true, status: statusOf(id, `Morning ${owned[id].morning}`) }];
    const need = ladderNeed(i, { mornings, firstMorning, today });
    const status = i === next && need && need.left > 0 ? `${need.left} morning${need.left === 1 ? '' : 's'} left` : (need?.at ?? '');
    return [{ moon, owned: false, status }];
  });
  const extras: Slot[] = [RARE_MOON, ...LIMITED.map((l) => l.id)].flatMap((id): Slot[] => {
    const moon = BY_ID.get(id);
    return moon && owned[id] ? [{ moon, owned: true, status: statusOf(id, id === RARE_MOON ? '1 in 365' : `Morning ${owned[id].morning}`) }] : [];
  });
  const slots: Slot[] = [{ moon: DEFAULT_MOON, owned: true, status: statusOf(DEFAULT_MOON.id, 'The first') }, ...ladder];
  const count = COUNTED.filter((id) => owned[id]).length;

  const tile = Math.floor((width - Gap.gutter * 2 - GAP * (COLUMNS - 1)) / COLUMNS);
  const press = (slot: Slot) => {
    if (slot.secret) return askSecret();
    if (!slot.owned) return haptic.tick();
    haptic.tap();
    setMoon(slot.moon.id);
  };

  return (
    <ScrollView contentInsetAdjustmentBehavior={title ? 'never' : 'automatic'} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Gap.section }]}>
      <View style={styles.head}>
        {title ? (
          <Text style={styles.title} accessibilityRole="header">
            Moons
          </Text>
        ) : null}
        <Text style={styles.count}>{`${count} of ${COUNTED.length}`}</Text>
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
        const name = slot.owned || !slot.secret ? slot.moon.name : 'Secret moon';
        return (
          <Pressable
            key={slot.moon.id}
            onPress={() => onPress(slot)}
            accessibilityRole="button"
            accessibilityLabel={`${name}, ${slot.status}`}
            accessibilityState={{ selected: slot.moon.id === worn, disabled: !slot.owned && !slot.secret }}
            style={({ pressed }) => [{ width: tile }, styles.slot, pressed && slot.owned && styles.pressed]}
          >
            <MoonThumb moon={slot.moon} size={tile} locked={!slot.owned} secret={slot.secret} wearing={slot.owned && slot.moon.id === worn} />
            <Text style={[styles.name, !slot.owned && styles.lockedName]} numberOfLines={1}>
              {name}
            </Text>
            <Text style={[styles.status, (slot.status === 'New' || slot.status === 'Wearing') && styles.statusOn]} numberOfLines={1}>
              {slot.status}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** The "?": Loc's riddle, and the plain answer for anyone who asks (Xbox's opt-in reveal). */
function askSecret() {
  haptic.tap();
  Alert.alert('There’s another one up there', 'It comes to people who keep walking after they were allowed to stop. I don’t trust them.', [
    { text: 'Tell me how', onPress: () => Alert.alert('The secret moon', `Walk ${SECRET_STEPS} steps within 20 minutes of getting up.`) },
    { text: 'OK', style: 'cancel' },
  ]);
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: Gap.gutter, paddingTop: Space.xl },
  head: { alignItems: 'center', gap: Space.xs, marginBottom: Gap.block },
  title: { ...DisplayFont, color: Nocturne.text, fontSize: 22, lineHeight: 28, textAlign: 'center' },
  count: { ...Type.secondary, color: Nocturne.text2, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP, rowGap: Space.l },
  slot: { alignItems: 'center', gap: Space.xs },
  name: { ...Type.secondary, color: Nocturne.text, textAlign: 'center', marginTop: Space.xs },
  lockedName: { color: Nocturne.text2 },
  status: { ...Type.caption, color: Nocturne.text3, textAlign: 'center' },
  statusOn: { color: Nocturne.text },
  group: { ...Type.secondary, color: Nocturne.text2, textAlign: 'center', marginTop: Gap.section, marginBottom: Space.l },
  pressed: { opacity: 0.7 },
});
