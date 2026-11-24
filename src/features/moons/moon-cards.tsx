'use no memo';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import Animated, {
  Extrapolation,
  interpolate,
  ReduceMotion,
  runOnJS,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';

import { MOON_PADS, MoonHalo, SkyPicture } from '@/components/night-sky';
import { Text } from '@/components/text';
import * as haptic from '@/lib/haptics';
import { Gap, Nocturne, Space, Type } from '@/theme';

import type { OwnedMoon } from './moon-ladder';
import { slotLabel, type MoonSlot } from './moon-slots';
import { DEFAULT_MOON } from './moon-theme';
import { MoonThumb } from './moon-thumb';
import type { ShinyState } from './shiny';
import { shinyOf } from './shiny-look';
import { isShinyOn, setShinyOn } from './shiny-store';
import { ShinyToggle } from './shiny-toggle';

/**
 * The moons page (user 2026-11-19, draft 5 of docs/moons-page-directions): every moon as a tall card of
 * its own sky, swiped sideways one at a time. Each card is drawn as Home draws its moon (the sky lit from
 * below, the halo, the moon rising out of the bottom edge) with the name and when on top. The card in the
 * middle is full size; off the middle a card shrinks and dims, its moon sinks and its words fade, all
 * following the finger. Opens on the worn moon; the button under it wears the moon in the middle, or says
 * how long till it comes.
 *
 * A moon still to come is the same card in shadow: a dark sky and a dim moon (no colours given away),
 * sitting lower the further off it is, so it rises as the mornings add up. A secret is a risen shadow with a "?".
 */

/** How much of the moon's disc shows above the card's bottom edge once it's yours. */
const RISEN = 0.5;
/** A coming moon's least showing, by how far along its mornings are (up to RISEN). */
const LOW = 0.1;
/** The wide halo under the moon's own, as a multiple of it. */
const WIDE = 1.7;
/** The wash's stops from the bottom edge up: an ease-out so there is no visible line where it ends. */
const WASH: [number, number][] = [[0, 0.34], [0.18, 0.26], [0.36, 0.15], [0.52, 0.07], [0.68, 0.02], [0.82, 0]];
/** How much higher the worn moon rises, as a share of its disc. */
const LIFT = 0.12;
const RISE_SPRING = { damping: 14, stiffness: 140, reduceMotion: ReduceMotion.System };
/** How far a card's moon sinks (share of its disc) when the card is a whole step off the middle. */
const SINK = 0.35;
const CARD_GAP = Space.m;
const CARD_R = 26;
/** The card's width as a share of the screen's. */
const CARD_W = 0.66;
/** Points above and below the cards: the page's header and pills, the count, the button and its clearance. */
const CARDS_CHROME = 450;

/** How far along a coming moon is, 0..1: its mornings (or weeks) done of the number it comes at. */
function progress(slot: MoonSlot): number {
  if (slot.owned || slot.secret) return 1;
  const at = Number(slot.title?.match(/\d+/)?.[0]);
  if (!at || slot.left === undefined) return 0;
  return Math.max(0, Math.min(1, 1 - slot.left / at));
}

/** The line under a moon's name: when it came, or how long till it comes. */
function subline(slot: MoonSlot, got?: OwnedMoon): string | undefined {
  if (slot.owned) return slot.moon.id === DEFAULT_MOON.id ? 'From the start' : got ? `Morning ${got.morning}` : undefined;
  if (slot.secret || slot.left === undefined) return undefined;
  const unit = slot.unit === 'week' ? 'week' : 'morning';
  return `${slot.left} ${unit}${slot.left === 1 ? '' : 's'} to go`;
}

/**
 * The card's shiny line (shiny.ts): caught, and on which morning; or, on the moon you're wearing, how
 * many mornings you've hunted it. Nothing for a moon still to come or one you're not hunting.
 */
function shinyLine(slot: MoonSlot, wearing: boolean, shiny: ShinyState): string | undefined {
  if (!slot.owned) return undefined;
  const caught = shiny.caught[slot.moon.id];
  if (caught) return `Shiny caught · Morning ${caught.morning}`;
  if (!wearing) return undefined;
  const n = shiny.hunt[slot.moon.id] ?? 0;
  return n ? `Hunting its shiny · ${n} morning${n === 1 ? '' : 's'}` : 'Hunting its shiny';
}

/** The cards' order (yours, rare ones included, then coming) and the swipe's distance from one card to the next. */
export function skyCards(slots: MoonSlot[], extras: MoonSlot[], width: number) {
  const all = [...slots.filter((s) => s.owned), ...extras, ...slots.filter((s) => !s.owned)];
  return { all, step: Math.round(width * CARD_W) + CARD_GAP };
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

/** The card's picture: the moon's sky (or a dark one, still to come) with the moon rising from its bottom edge. */
function CardSky({ slot, w, h, disc, wearing, away, children }: { slot: MoonSlot; w: number; h: number; disc: number; wearing: boolean; away: SharedValue<number>; children?: ReactNode }) {
  const showing = slot.owned || slot.secret ? RISEN : LOW + (RISEN - LOW) * progress(slot);
  // The worn moon rises a little higher on a spring; it sinks back when another is worn.
  const lift = useSharedValue(wearing ? -LIFT * disc : 0);
  useEffect(() => {
    lift.value = withSpring(wearing ? -LIFT * disc : 0, RISE_SPRING);
  }, [wearing, disc, lift]);
  const lifted = useAnimatedStyle(() => ({
    transform: [{ translateY: lift.value + interpolate(away.value, [0, 1], [0, disc * SINK], Extrapolation.CLAMP) }],
  }));
  // The halo's square is centred on the moon's middle: the disc's top sits `showing` of a disc above the bottom edge.
  const halo = disc * MOON_PADS.glow;
  // Its shiny, when caught and switched on (shiny.ts): the colours only, for now.
  const look = slot.owned && isShinyOn(slot.moon.id) ? shinyOf(slot.moon) : slot.moon;
  return (
    <View style={[styles.card, { width: w, height: h }, !slot.owned && styles.coming]}>
      {/* As Home draws it (night-sky.tsx): the sky flipped so its light comes up from behind the moon, the
          moon's light washed up from the bottom, and its halo (user asked for Home's glow here, 2026-11-19). */}
      {slot.owned ? <SkyPicture moon={look} /> : null}
      {slot.owned ? <GlowWash color={look.glow} id={`w-${look.id}${look.shiny ? '-s' : ''}-${Math.round(w)}`} /> : null}
      <Animated.View style={[styles.abs, { width: halo, height: halo, left: (w - halo) / 2, top: h - showing * disc + disc / 2 - halo / 2 }, lifted]}>
        {slot.owned ? (
          <>
            <View style={[styles.abs, styles.wide, { width: halo * WIDE, height: halo * WIDE, left: (halo - halo * WIDE) / 2, top: (halo - halo * WIDE) / 2 }]}>
              <MoonHalo moon={look} size={halo * WIDE} />
            </View>
            <View style={styles.soft}>
              <MoonHalo moon={look} size={halo} />
            </View>
          </>
        ) : null}
        <View style={[styles.abs, { left: (halo - disc) / 2, top: (halo - disc) / 2 }, !slot.owned && styles.shadow]}>
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

/** One card in its slot of the row: shrinks, dims and sinks its moon as it leaves the middle. */
function SkyCard({ slot, index, step, w, h, x, got, wearing, shiny }: { slot: MoonSlot; index: number; step: number; w: number; h: number; x: SharedValue<number>; got?: OwnedMoon; wearing: boolean; shiny: ShinyState }) {
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
  const hunt = shinyLine(slot, wearing, shiny);
  return (
    <View style={[styles.slot, { width: step }]}>
      <Animated.View style={card}>
        <CardSky slot={slot} w={w} h={h} disc={w * 0.92} wearing={wearing} away={away}>
          <Animated.View style={[styles.words, words]}>
            <Text style={[styles.name, !slot.owned && styles.dim]} numberOfLines={1}>
              {slotLabel(slot)}
            </Text>
            {sub ? <Text style={styles.sub}>{sub}</Text> : null}
            {hunt ? <Text style={styles.sub}>{hunt}</Text> : null}
          </Animated.View>
        </CardSky>
      </Animated.View>
    </View>
  );
}

/**
 * The count and the button. Their own component, told which card is in the middle the moment it gets
 * there, so they change with the swipe without re-rendering the cards (user 2026-11-19: the button lagged).
 */
function CardsFooter({ all, start, worn, register, onPress, shiny }: { all: MoonSlot[]; start: number; worn: string; register: (set: (i: number) => void) => void; onPress: (slot: MoonSlot) => boolean; shiny: ShinyState }) {
  const [at, setAt] = useState(start);
  useEffect(() => register(setAt), [register]);
  const slot = all[at] ?? all[0];
  if (!slot) return null;
  const wearing = slot.owned && slot.moon.id === worn;
  const quiet = !slot.owned || wearing;
  const caught = slot.owned && !!shiny.caught[slot.moon.id];
  return (
    <>
      {caught ? <ShinyToggle value={isShinyOn(slot.moon.id)} onChange={(v) => setShinyOn(slot.moon.id, v)} /> : null}
      <Text style={styles.count}>
        {at + 1} of {all.length}
      </Text>
      <View style={styles.spacer} />
      <Pressable
        onPress={() => {
          if (slot.owned && !wearing) onPress(slot);
        }}
        disabled={quiet}
        accessibilityRole="button"
        style={({ pressed }) => [styles.btn, quiet && styles.btnQuiet, pressed && styles.btnPressed]}
      >
        <Text style={[styles.btnText, quiet && styles.btnTextQuiet]}>
          {wearing ? 'Wearing' : slot.owned ? `Wear ${slot.moon.name}` : slot.secret ? 'A secret' : (subline(slot) ?? 'Coming')}
        </Text>
      </Pressable>
    </>
  );
}

export function SkyCards({
  slots,
  extras,
  owned,
  worn,
  width,
  onPress,
  x,
  shiny,
}: {
  slots: MoonSlot[];
  extras: MoonSlot[];
  owned: Record<string, OwnedMoon>;
  worn: string;
  width: number;
  onPress: (slot: MoonSlot) => boolean;
  /** The swipe's position, the page's: it also blends the light at the top (SwipeGlow). Starts on the worn moon. */
  x: SharedValue<number>;
  /** The shinies caught and hunted (shiny-store.ts `useShinyState`): a new one re-renders the cards. */
  shiny: ShinyState;
}) {
  const { all, step } = skyCards(slots, extras, width);
  const { height: screenH } = useWindowDimensions();
  const w = step - CARD_GAP;
  // Tall, but never so tall the button is pushed off the screen.
  const h = Math.round(Math.max(w * 1.3, Math.min(w * 1.9, screenH - CARDS_CHROME)));
  const start = Math.max(0, all.findIndex((sl) => sl.moon.id === worn));
  const last = useSharedValue(start);
  const setFooter = useRef<(i: number) => void>(() => {});
  const register = useRef((set: (i: number) => void) => {
    setFooter.current = set;
  }).current;
  // A tap as each card reaches the middle, as a picker wheel does, and the count and button follow at once.
  const reach = (i: number) => {
    haptic.tap();
    setFooter.current(i);
  };
  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      x.value = e.contentOffset.x;
      const i = Math.max(0, Math.min(all.length - 1, Math.round(e.contentOffset.x / step)));
      if (i !== last.value) {
        last.value = i;
        runOnJS(reach)(i);
      }
    },
  });
  return (
    <View style={styles.page}>
      {/* Spare height splits evenly above and below the cards, so they sit in the middle. */}
      <View style={styles.spacer} />
      <Animated.FlatList
        data={all}
        keyExtractor={(sl) => sl.moon.id}
        extraData={shiny}
        renderItem={({ item, index }) => (
          <SkyCard slot={item} index={index} step={step} w={w} h={h} x={x} got={owned[item.moon.id]} wearing={item.owned && item.moon.id === worn} shiny={shiny} />
        )}
        // Only the cards near the middle are drawn: each is a sky, a wash, two halos and a moon.
        initialNumToRender={3}
        maxToRenderPerBatch={2}
        windowSize={5}
        getItemLayout={(_, i) => ({ length: step, offset: step * i, index: i })}
        initialScrollIndex={start}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={step}
        decelerationRate="fast"
        disableIntervalMomentum
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={styles.row}
        contentContainerStyle={{ paddingHorizontal: (width - step) / 2 }}
      />
      <CardsFooter all={all} start={start} worn={worn} register={register} onPress={onPress} shiny={shiny} />
    </View>
  );
}

const styles = StyleSheet.create({
  // Fills the page's height, so the button sits at the bottom of the screen.
  page: { alignSelf: 'stretch', alignItems: 'center', gap: Space.l, flex: 1 },
  spacer: { flex: 1 },
  // As wide as the screen: the page's gutter is taken back so the cards run to the edges.
  row: { alignSelf: 'stretch', marginHorizontal: -Gap.gutter, flexGrow: 0 },
  slot: { alignItems: 'center' },
  card: { overflow: 'hidden', borderRadius: CARD_R, backgroundColor: Nocturne.bg },
  coming: { backgroundColor: '#11131B' },
  abs: { position: 'absolute' },
  wide: { opacity: 0.45 },
  soft: { opacity: 0.85 },
  // A moon still to come: its shape in shadow, no colour given away.
  shadow: { opacity: 0.22 },
  center: { alignItems: 'center', justifyContent: 'center' },
  secret: { color: Nocturne.text2, fontWeight: '700' },
  dim: { color: Nocturne.text2 },
  words: { position: 'absolute', left: Space.m, right: Space.m, top: Space.xl, alignItems: 'center', gap: 2 },
  name: { fontSize: 19, lineHeight: 24, fontWeight: '700', color: Nocturne.text, textAlign: 'center' },
  sub: { fontSize: 13, lineHeight: 17, color: 'rgba(235, 240, 250, 0.75)', textAlign: 'center' },
  count: { ...Type.caption, color: Nocturne.text2, fontVariant: ['tabular-nums'] },
  btn: { alignSelf: 'stretch', minHeight: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: Nocturne.cta },
  btnQuiet: { backgroundColor: 'rgba(255, 255, 255, 0.1)' },
  btnPressed: { opacity: 0.8 },
  btnText: { fontSize: 16, fontWeight: '700', color: Nocturne.onCta },
  btnTextQuiet: { color: Nocturne.text },
});
