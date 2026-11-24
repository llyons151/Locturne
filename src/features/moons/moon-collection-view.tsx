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
import { readLock } from '@/lib/lock-controller';
import { getMorningsWon } from '@/lib/morning-proof';
import { getStreak } from '@/lib/streak';
import { DisplayFont, Gap, Nocturne, Space, Type } from '@/theme';

import { checkSecretMoons, markSeen, MOONS_BG, settleMoons, useOwnedMoons } from './moon-collection';
import { MOONS } from './moon-data';
import { SkyCards, skyCards } from './moon-cards';
import { SwipeGlow } from './moon-glow';
import { moonSlots, type MoonSlot } from './moon-slots';
import { wearAndRise } from './moon-rise';
import { DEFAULT_MOON, useWornMoon } from './moon-theme';
import { MoonsPills } from './moons-pills';
import { isShinyOn, useShinyState } from './shiny-store';
import { shinyOf } from './shiny-look';
import { settleShinyNow } from './shiny-settle';

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
 * come, "Morning 3" (no name till it's yours, user 2026-11-02); once yours, its name over the morning
 * that brought it.
 *
 * Laid out like Cal AI's Milestones (user, 2026-11-16, tools/moons-milestones take 1): the worn moon's
 * light comes down from the top (moon-glow.tsx), the title, "Wearing <name>", Home's pills (every
 * morning, flipping to the streak; how many moons), then the moons as bare icons. Tap one you own
 * and it's worn at once, no popup: its light crossfades in, and the page stays (Home's moon rises
 * with it when the page goes). A locked one gives a tick and a small shake.
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
  const shiny = useShinyState();

  // Earned before the first paint, so a moon that's due never shows as "0 mornings left".
  useState(() => {
    settleMoons();
    settleShinyNow();
  });
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
  // Sky cards: how far they're swiped, which blends the light at the top from card to card as you go.
  // Starts on the worn moon's card, where the cards open.
  const cards = skyCards(slots, extras, width);
  const cardsX = useSharedValue(Math.max(0, cards.all.findIndex((sl) => sl.moon.id === worn.id)) * cards.step);
  // Every moon you have: Moonlight, which you start with, then every one earned, rare and secret too (user, 2026-11-02).
  const count = 1 + MOONS.filter((m) => m.id !== DEFAULT_MOON.id && owned[m.id]).length;
  // Every moon on the page: the ladder (secrets included) and Moonlight, plus rare and limited ones once yours.
  const total = slots.length + extras.length;
  // Every morning you got up, ever (the count the ladder's moons go by), and the streak.
  const mornings = getMorningsWon();
  const streak = getStreak(readLock().morningKey);

  /** Wears a moon you own at once and stays (user, 2026-11-16); false for a locked one, which shakes. */
  const press = (slot: Slot): boolean => {
    if (!slot.owned) {
      haptic.tick();
      return false;
    }
    if (slot.moon.id !== worn.id) {
      // On the page Home's moon is already down: it's swapped, and rises as the page goes (moon-rise.ts).
      wearAndRise(slot.moon.id);
      haptic.tap();
    }
    return true;
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
    <Animated.View style={[styles.screen, held]}>
      {/* Behind the scroll, fixed: the light stays in the sky as the moons scroll up under it. */}
      <SwipeGlow colors={cards.all.map((sl) => (sl.owned ? (isShinyOn(sl.moon.id) ? shinyOf(sl.moon).glow : sl.moon.glow) : worn.glow))} x={cardsX} step={cards.step} />
    <Animated.ScrollView
      // The page bounces at both ends, even when every moon fits on the screen; the sheet has iOS's own pull.
      bounces={as === 'page'}
      alwaysBounceVertical={as === 'page'}
      overScrollMode={as === 'page' ? 'always' : 'never'}
      onScroll={onScroll}
      scrollEventThrottle={16}
      showsVerticalScrollIndicator={false}
      style={styles.scroll}
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
        <View style={styles.side} />
      </View>
      <Text style={styles.wearing}>
        Wearing <Text style={styles.wearingName}>{worn.name}</Text>
      </Text>
      <View style={styles.pills}>
        <MoonsPills mornings={mornings} streak={streak} owned={count} total={total} moonId={worn.id} />
      </View>
      <SkyCards slots={slots} extras={extras} owned={owned} worn={worn.id} width={width} onPress={press} x={cardsX} shiny={shiny} />
    </Animated.ScrollView>
    </Animated.View>
  );
}

function closeMoons() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: MOONS_BG, overflow: 'hidden' },
  scroll: { flex: 1 },
  // Fills the screen so the cards' button sits at the bottom.
  content: { paddingHorizontal: Gap.gutter, flexGrow: 1 },
  head: { flexDirection: 'row', alignItems: 'center', minHeight: CLOSE, marginBottom: Gap.block },
  close: {
    width: CLOSE,
    height: CLOSE,
    borderRadius: CLOSE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Nocturne.frost,
  },
  // Type.title's size (user, 2026-11-16: bigger).
  title: { ...DisplayFont, flex: 1, color: Nocturne.text, fontSize: 28, lineHeight: 33, letterSpacing: -0.4, textAlign: 'center' },
  side: { width: SIDE },
  sideEnd: { alignItems: 'flex-end' },
  wearing: { ...Type.secondary, color: Nocturne.text2, textAlign: 'center' },
  wearingName: { color: Nocturne.text, fontWeight: '600' },
  pills: { marginTop: Space.m, marginBottom: Gap.block },
  pressed: { opacity: 0.7 },
});
