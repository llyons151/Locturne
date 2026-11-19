'use no memo';

import { SymbolView } from 'expo-symbols';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import Animated, {
  Extrapolation,
  FadeIn,
  FadeInDown,
  FadeOut,
  interpolate,
  ReduceMotion,
  runOnJS,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  ZoomIn,
  type SharedValue,
} from 'react-native-reanimated';

import { sym } from '@/components/grouped-list';

import { MOON_PADS, MoonHalo, SkyPicture } from '@/components/night-sky';
import { Text } from '@/components/text';
import * as haptic from '@/lib/haptics';
import { Gap, Nocturne, Space, Type } from '@/theme';

import type { OwnedMoon } from './moon-ladder';
import { slotLabel, type MoonSlot } from './moon-slots';
import { DEFAULT_MOON } from './moon-theme';
import { MoonThumb } from './moon-thumb';

/**
 * The moons page's two tile looks (user 2026-11-19, Developer → Moons page, moons-look.ts):
 * `PickerLook`, small rounded squares in two grouped boxes (yours, coming) like iOS's app-icon
 * picker, and `FrostedLook`, tall tiles of each moon's sky with its name on top. In both the moon
 * rises from the tile's bottom edge and is cut off by it, as on Home.
 *
 * A moon still to come is the same tile in shadow: a dark sky and a dim moon (no colours given
 * away), sitting lower the further off it is. Morning 50 at 31 mornings is most of the way up,
 * Morning 200 has barely broken the edge; it rises as you get closer. A secret is a risen shadow with a "?".
 */

/** How much of the moon's disc shows above the tile's bottom edge once it's yours. */
const RISEN = 0.5;
/** The wide halo under the moon's own, as a multiple of it. */
const WIDE = 1.7;
/** The wash's stops from the bottom edge up: an ease-out so there is no visible line where it ends. */
const WASH: [number, number][] = [[0, 0.34], [0.18, 0.26], [0.36, 0.15], [0.52, 0.07], [0.68, 0.02], [0.82, 0]];
/** A coming moon's least and most showing, by how far along its mornings are. */
const LOW = 0.1;
const NUDGE = 4;
const NUDGE_MS = 60;
/** How much higher the worn moon rises, as a share of its disc. */
const LIFT = 0.12;
const RISE_SPRING = { damping: 14, stiffness: 140, reduceMotion: ReduceMotion.System };
const PRESS_SPRING = { damping: 18, stiffness: 420, reduceMotion: ReduceMotion.System };
/** The gap between each tile's entrance as the page opens. */
const STAGGER_MS = 28;

type Props = {
  slots: MoonSlot[];
  extras: MoonSlot[];
  owned: Record<string, OwnedMoon>;
  worn: string;
  width: number;
  onPress: (slot: MoonSlot) => boolean;
};

/** How far along a coming moon is, 0..1: its mornings (or weeks) done of the number it comes at. */
function progress(slot: MoonSlot): number {
  if (slot.owned || slot.secret) return 1;
  const at = Number(slot.title?.match(/\d+/)?.[0]);
  if (!at || slot.left === undefined) return 0;
  return Math.max(0, Math.min(1, 1 - slot.left / at));
}

/** The line under a moon: when it came, or how long till it comes. */
function subline(slot: MoonSlot, got?: OwnedMoon, short = false): string | undefined {
  if (slot.owned) return slot.moon.id === DEFAULT_MOON.id ? 'From the start' : got ? `Morning ${got.morning}` : undefined;
  if (slot.secret || slot.left === undefined) return undefined;
  if (short) return `${slot.left} to go`;
  const unit = slot.unit === 'week' ? 'week' : 'morning';
  return `${slot.left} ${unit}${slot.left === 1 ? '' : 's'} to go`;
}

/** A tile: the moon's sky (or a dark one, still to come) with the moon rising from its bottom edge. */
function RisingTile({
  slot,
  width,
  height,
  radius,
  disc,
  wearing = false,
  away,
  children,
}: {
  slot: MoonSlot;
  width: number;
  height: number;
  radius: number;
  disc: number;
  wearing?: boolean;
  /** Sky cards: how far the card is from the middle (0 there, 1 a card away); the moon sinks with it. */
  away?: SharedValue<number>;
  children?: ReactNode;
}) {
  const showing = slot.owned || slot.secret ? RISEN : LOW + (RISEN - LOW) * progress(slot);
  // The worn moon rises a little higher on a spring; it sinks back when another is worn.
  const lift = useSharedValue(wearing ? -LIFT * disc : 0);
  useEffect(() => {
    lift.value = withSpring(wearing ? -LIFT * disc : 0, RISE_SPRING);
  }, [wearing, disc, lift]);
  const lifted = useAnimatedStyle(() => ({
    transform: [{ translateY: lift.value + (away ? interpolate(away.value, [0, 1], [0, disc * SINK], Extrapolation.CLAMP) : 0) }],
  }));
  // The halo's square is centred on the moon's middle: the disc's top sits `showing` of a disc above the tile's bottom edge.
  const halo = disc * MOON_PADS.glow;
  return (
    <View style={[styles.tile, { width, height, borderRadius: radius }, !slot.owned && styles.comingTile]}>
      {/* As Home draws it (night-sky.tsx): the moon's sky flipped so its light comes up from behind the
          moon, and the moon's halo in its own colour round it (user asked for Home's glow here, 2026-11-19). */}
      {slot.owned ? <SkyPicture moon={slot.moon} /> : null}
      {/* The moon's light rising up the sky from the bottom edge, so the halo fades out instead of stopping (user 2026-11-19). */}
      {slot.owned ? <GlowWash color={slot.moon.glow} id={`w-${slot.moon.id}-${Math.round(width)}`} /> : null}
      <Animated.View style={[styles.moon, { width: halo, height: halo, left: (width - halo) / 2, top: height - showing * disc + disc / 2 - halo / 2 }, lifted]}>
        {slot.owned ? (
          <>
            {/* A wide faint halo under the moon's own, so its edge softens into the sky. */}
            <View style={[styles.moon, styles.wide, { width: halo * WIDE, height: halo * WIDE, left: (halo - halo * WIDE) / 2, top: (halo - halo * WIDE) / 2 }]}>
              <MoonHalo moon={slot.moon} size={halo * WIDE} />
            </View>
            <View style={styles.soft}>
              <MoonHalo moon={slot.moon} size={halo} />
            </View>
          </>
        ) : null}
        <View style={[styles.moon, { left: (halo - disc) / 2, top: (halo - disc) / 2 }, !slot.owned && styles.shadow]}>
          <MoonThumb moon={slot.owned ? slot.moon : DEFAULT_MOON} size={disc} round />
        </View>
      </Animated.View>
      {slot.secret ? (
        <View style={[StyleSheet.absoluteFill, styles.center]}>
          <Text style={[styles.secret, { fontSize: Math.round(disc * 0.42) }]}>?</Text>
        </View>
      ) : null}
      {children}
    </View>
  );
}

/** The moon's glow colour washed up from the bottom edge, fading out on an eased curve by about two thirds up. */
function GlowWash({ color, id }: { color: string; id: string }) {
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none">
      <Defs>
        <LinearGradient id={id} x1="0" y1="1" x2="0" y2="0">
          {WASH.map(([at, a]) => (
            <Stop key={at} offset={at} stopColor={color} stopOpacity={a} />
          ))}
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}

/** Tapping wears a moon you own; a coming one gives a small shake. */
function Cell({ slot, index, onPress, children }: { slot: MoonSlot; index: number; onPress: (slot: MoonSlot) => boolean; children: ReactNode }) {
  const shake = useSharedValue(0);
  const press = useSharedValue(1);
  const shaken = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }, { scale: press.value }] }));
  const name = slotLabel(slot);
  return (
    // The tiles rise in one after another as the page opens (only on first show).
    <Animated.View entering={FadeInDown.delay(Math.min(index, 14) * STAGGER_MS).duration(420).springify().damping(18).reduceMotion(ReduceMotion.System)}>
    <Pressable
      onPressIn={() => {
        press.value = withSpring(0.94, PRESS_SPRING);
      }}
      onPressOut={() => {
        press.value = withSpring(1, PRESS_SPRING);
      }}
      onPress={() => {
        if (onPress(slot)) return;
        shake.value = withSequence(withTiming(-NUDGE, { duration: NUDGE_MS }), withTiming(NUDGE, { duration: NUDGE_MS }), withTiming(0, { duration: NUDGE_MS }));
      }}
      accessibilityRole="button"
      accessibilityLabel={slot.owned ? name : `${name}, locked`}
    >
      <Animated.View style={shaken}>{children}</Animated.View>
    </Pressable>
    </Animated.View>
  );
}

function split(slots: MoonSlot[], extras: MoonSlot[]) {
  return { yours: [...slots.filter((s) => s.owned), ...extras], coming: slots.filter((s) => !s.owned) };
}

/** Draft 9: small rounded squares in a grouped box, yours then coming, a check under the one you wear. */
export function PickerLook({ slots, extras, owned, worn, width, onPress }: Props) {
  const { yours, coming } = split(slots, extras);
  const inner = width - Gap.gutter * 2 - PICK_PAD * 2;
  // Each cell: the tile inside a ring's room (the worn one's white edge), 4 across.
  const cell = Math.floor((inner - PICK_GAP * (PICK_COLS - 1)) / PICK_COLS);
  const tile = cell - RING * 2;
  const box = (list: MoonSlot[], offset = 0) => (
    <View style={styles.pickBox}>
      {list.map((slot, i) => {
        const wearing = slot.owned && slot.moon.id === worn;
        const sub = slot.owned ? undefined : subline(slot, undefined, true);
        return (
          <View key={slot.moon.id} style={{ width: cell }}>
            <Cell slot={slot} index={i + offset} onPress={onPress}>
              <View style={styles.cellCol}>
                <View style={styles.ring}>
                  <RisingTile slot={slot} width={tile} height={tile} radius={tile * 0.26} disc={tile * 0.92} wearing={wearing} />
                  {/* The worn one's white edge springs in. */}
                  {wearing ? <Animated.View entering={ZoomIn.springify().damping(14)} exiting={FadeOut.duration(160)} style={[StyleSheet.absoluteFill, styles.ringOn, { borderRadius: tile * 0.26 + RING }]} /> : null}
                </View>
                <Text style={[styles.pickName, !slot.owned && styles.dim]} numberOfLines={2}>
                  {slotLabel(slot)}
                </Text>
                {sub ? <Text style={styles.pickSub}>{sub}</Text> : null}
                {wearing ? (
                  <Animated.View entering={ZoomIn.springify().damping(12)} exiting={FadeOut.duration(160)}>
                    <SymbolView name={sym('checkmark.circle.fill', 'check_circle')} size={15} tintColor={Nocturne.text} />
                  </Animated.View>
                ) : null}
              </View>
            </Cell>
          </View>
        );
      })}
    </View>
  );
  return (
    <View style={styles.pickPage}>
      <Text style={styles.label} accessibilityRole="header">
        Your moons
      </Text>
      {box(yours)}
      {coming.length ? (
        <>
          <Text style={[styles.label, styles.labelGap]} accessibilityRole="header">
            Coming
          </Text>
          {box(coming, yours.length)}
        </>
      ) : null}
    </View>
  );
}

/** Draft 13: tall tiles of each moon's sky, the name and when on top, the moon rising from the bottom. */
export function FrostedLook({ slots, extras, owned, worn, width, onPress }: Props) {
  const { yours, coming } = split(slots, extras);
  const w = Math.floor((width - Gap.gutter * 2 - FROST_GAP * 2) / 3);
  const h = Math.round(w * 1.34);
  return (
    <View style={styles.frostGrid}>
      {[...yours, ...coming].map((slot, i) => {
        const wearing = slot.owned && slot.moon.id === worn;
        const sub = subline(slot, owned[slot.moon.id]);
        return (
          <Cell key={slot.moon.id} slot={slot} index={i} onPress={onPress}>
            <RisingTile slot={slot} width={w} height={h} radius={Math.round(w * 0.16)} disc={w * 0.92} wearing={wearing}>
              <View style={styles.frostWords}>
                <Text style={[styles.frostName, !slot.owned && styles.dim]} numberOfLines={2}>
                  {slotLabel(slot)}
                </Text>
                {sub ? <Text style={styles.frostSub}>{sub}</Text> : null}
              </View>
              {wearing ? <Animated.View entering={FadeIn.duration(220)} exiting={FadeOut.duration(160)} style={[StyleSheet.absoluteFill, styles.wornEdge, { borderRadius: Math.round(w * 0.16) }]} /> : null}
            </RisingTile>
          </Cell>
        );
      })}
    </View>
  );
}

/**
 * One sky card, drawn as the frosted tiles are (the sky lit from below, the glow, the moon rising out
 * of the bottom edge), the name and when at the top. Off the middle it shrinks and dims, its moon sinks
 * and its words fade; swiped into the middle the moon rises into place, all following the finger.
 */
function SkyCard({ slot, index, step, w, h, x, got, wearing }: { slot: MoonSlot; index: number; step: number; w: number; h: number; x: SharedValue<number>; got?: OwnedMoon; wearing: boolean }) {
  const away = useDerivedValue(() => Math.min(1, Math.abs(x.value / step - index)));
  const card = useAnimatedStyle(() => ({
    opacity: interpolate(away.value, [0, 1], [1, 0.5]),
    transform: [{ scale: interpolate(away.value, [0, 1], [1, 0.88]) }],
  }));
  const words = useAnimatedStyle(() => ({
    opacity: interpolate(away.value, [0, 0.6], [1, 0], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(away.value, [0, 1], [0, -10]) }],
  }));
  const sub = subline(slot, got);
  return (
    <Animated.View style={card}>
      <RisingTile slot={slot} width={w} height={h} radius={CARD_R} disc={w * 0.92} wearing={wearing} away={away}>
        <Animated.View style={[styles.cardWords, words]}>
          <Text style={[styles.cardName, !slot.owned && styles.dim]} numberOfLines={1}>
            {slotLabel(slot)}
          </Text>
          {sub ? <Text style={styles.cardSub}>{sub}</Text> : null}
        </Animated.View>
      </RisingTile>
    </Animated.View>
  );
}

/**
 * Draft 5 (user 2026-11-19): every moon as a tall card of its own sky, swiped sideways one at a time,
 * the one in the middle full size and its neighbours smaller and dimmer. Opens on the worn moon. The
 * button under it wears the moon in the middle, or says how long till it comes.
 */
export function SkyCardsLook({ slots, extras, owned, worn, width, onPress, onCentre }: Props & { onCentre?: (id: string) => void }) {
  const { yours, coming } = split(slots, extras);
  const all = [...yours, ...coming];
  const { height: screenH } = useWindowDimensions();
  const w = Math.round(width * 0.66);
  // Tall, but never so tall the button is pushed off the screen: the header and button take about CARDS_CHROME.
  const h = Math.round(Math.max(w * 1.3, Math.min(w * 1.9, screenH - CARDS_CHROME)));
  const step = w + CARD_GAP;
  const start = Math.max(0, all.findIndex((sl) => sl.moon.id === worn));
  const [at, setAt] = useState(start);
  const list = useRef<Animated.ScrollView>(null);
  const x = useSharedValue(start * step);
  const last = useSharedValue(start);
  // A tap each time a new card reaches the middle, as a picker wheel does; nothing re-renders mid-swipe.
  const tick = () => haptic.tap();
  // Once the swipe comes to rest: the count, the button and the page's light take the card in the middle
  // (a coming moon keeps the worn moon's light). Updating these on every crossing re-rendered the page
  // and restarted the light's crossfade mid-swipe (user 2026-11-19: the glow glitched).
  const settle = (i: number) => {
    setAt(i);
    const mid = all[i];
    onCentre?.(mid?.owned ? mid.moon.id : worn);
  };
  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      x.value = e.contentOffset.x;
      const i = Math.max(0, Math.min(all.length - 1, Math.round(e.contentOffset.x / step)));
      if (i !== last.value) {
        last.value = i;
        runOnJS(tick)();
      }
    },
    onMomentumEnd: (e) => {
      runOnJS(settle)(Math.max(0, Math.min(all.length - 1, Math.round(e.contentOffset.x / step))));
    },
  });
  const slot = all[at] ?? all[0];
  const wearing = slot.owned && slot.moon.id === worn;
  const sub = subline(slot);
  return (
    <View style={styles.cardsPage}>
      {/* Spare height splits evenly above and below the cards, so they sit in the middle. */}
      <View style={styles.cardsSpacer} />
      <Animated.ScrollView
        ref={list}
        // Opens on the worn moon (contentOffset alone isn't honoured on the web).
        onLayout={() => list.current?.scrollTo({ x: start * step, animated: false })}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={step}
        decelerationRate="fast"
        disableIntervalMomentum
        contentOffset={{ x: start * step, y: 0 }}
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={styles.cardsRow}
        contentContainerStyle={{ paddingHorizontal: (width - w) / 2, gap: CARD_GAP, alignItems: 'center' }}
      >
        {all.map((sl, i) => (
          <SkyCard key={sl.moon.id} slot={sl} index={i} step={step} w={w} h={h} x={x} got={owned[sl.moon.id]} wearing={sl.owned && sl.moon.id === worn} />
        ))}
      </Animated.ScrollView>
      <Text style={styles.cardCount}>
        {at + 1} of {all.length}
      </Text>
      <View style={styles.cardsSpacer} />
      <Pressable
        onPress={() => {
          if (slot.owned && !wearing) onPress(slot);
        }}
        disabled={!slot.owned || wearing}
        accessibilityRole="button"
        style={({ pressed }) => [styles.cardBtn, (!slot.owned || wearing) && styles.cardBtnQuiet, pressed && styles.cardBtnPressed]}
      >
        <Text style={[styles.cardBtnText, (!slot.owned || wearing) && styles.cardBtnTextQuiet]}>
          {wearing ? 'Wearing' : slot.owned ? `Wear ${slot.moon.name}` : slot.secret ? 'A secret' : (sub ?? 'Coming')}
        </Text>
      </Pressable>
    </View>
  );
}

const CARD_GAP = Space.m;
/** Points above and below the cards: the page's header and pills, the count, the button and its clearance. */
const CARDS_CHROME = 450;
/** How far a card's moon sinks (share of its disc) when the card is a whole step off the middle. */
const SINK = 0.35;
const CARD_R = 26;
const PICK_COLS = 4;
const PICK_PAD = Space.m;
const PICK_GAP = Space.s;
/** Room round each picker tile for the worn one's white edge. */
const RING = 3;
const FROST_GAP = Space.s + 2;

const styles = StyleSheet.create({
  tile: { overflow: 'hidden', backgroundColor: Nocturne.bg },
  comingTile: { backgroundColor: '#11131B' },
  moon: { position: 'absolute' },
  wide: { opacity: 0.45 },
  soft: { opacity: 0.85 },
  // A moon still to come: its shape in shadow, no colour given away.
  shadow: { opacity: 0.22 },
  center: { alignItems: 'center', justifyContent: 'center' },
  secret: { color: Nocturne.text2, fontWeight: '700' },
  dim: { color: Nocturne.text2 },
  label: { ...Type.caption, color: Nocturne.text2, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: Space.s, marginLeft: Space.xs },
  labelGap: { marginTop: Gap.block },
  pickPage: { alignSelf: 'stretch' },
  pickBox: { flexDirection: 'row', flexWrap: 'wrap', columnGap: PICK_GAP, rowGap: Space.m, padding: PICK_PAD, borderRadius: 20, backgroundColor: 'rgba(255, 255, 255, 0.06)' },
  cellCol: { alignItems: 'center', gap: 4 },
  ring: { padding: RING },
  ringOn: { borderWidth: 2, borderColor: Nocturne.text },
  pickName: { fontSize: 12, lineHeight: 15, fontWeight: '500', color: Nocturne.text, textAlign: 'center' },
  pickSub: { fontSize: 11, lineHeight: 14, color: Nocturne.text2, textAlign: 'center' },
  frostGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: FROST_GAP },
  frostWords: { position: 'absolute', top: Space.m, left: Space.s, right: Space.s, alignItems: 'center', gap: 2 },
  frostName: { fontSize: 13, lineHeight: 16, fontWeight: '600', color: Nocturne.text, textAlign: 'center' },
  frostSub: { fontSize: 11, lineHeight: 14, color: 'rgba(235, 240, 250, 0.72)', textAlign: 'center' },
  wornEdge: { borderWidth: 2, borderColor: Nocturne.text },
  // Fills the page's height, so the button sits at the bottom of the screen.
  cardsPage: { alignSelf: 'stretch', alignItems: 'center', gap: Space.l, flex: 1 },
  cardsSpacer: { flex: 1 },
  // As wide as the screen: the page's gutter is taken back so the cards run to the edges.
  cardsRow: { alignSelf: 'stretch', marginHorizontal: -Gap.gutter, flexGrow: 0 },
  cardWords: { position: 'absolute', left: Space.m, right: Space.m, top: Space.xl, alignItems: 'center', gap: 2 },
  cardName: { fontSize: 19, lineHeight: 24, fontWeight: '700', color: Nocturne.text, textAlign: 'center' },
  cardSub: { fontSize: 13, lineHeight: 17, color: 'rgba(235, 240, 250, 0.75)', textAlign: 'center' },
  cardCount: { ...Type.caption, color: Nocturne.text2, fontVariant: ['tabular-nums'] },
  cardBtn: { alignSelf: 'stretch', minHeight: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: Nocturne.cta },
  cardBtnQuiet: { backgroundColor: 'rgba(255, 255, 255, 0.1)' },
  cardBtnPressed: { opacity: 0.8 },
  cardBtnText: { fontSize: 16, fontWeight: '700', color: Nocturne.onCta },
  cardBtnTextQuiet: { color: Nocturne.text },
});
