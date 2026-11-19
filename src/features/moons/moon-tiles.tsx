'use no memo';

import { SymbolView } from 'expo-symbols';
import { useEffect, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut, ReduceMotion, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming, ZoomIn } from 'react-native-reanimated';

import { sym } from '@/components/grouped-list';
import { MOON_PADS, MoonHalo, SkyPicture } from '@/components/night-sky';
import { Text } from '@/components/text';
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
function RisingTile({ slot, width, height, radius, disc, wearing = false, children }: { slot: MoonSlot; width: number; height: number; radius: number; disc: number; wearing?: boolean; children?: ReactNode }) {
  const showing = slot.owned || slot.secret ? RISEN : LOW + (RISEN - LOW) * progress(slot);
  // The worn moon rises a little higher on a spring; it sinks back when another is worn.
  const lift = useSharedValue(wearing ? -LIFT * disc : 0);
  useEffect(() => {
    lift.value = withSpring(wearing ? -LIFT * disc : 0, RISE_SPRING);
  }, [wearing, disc, lift]);
  const lifted = useAnimatedStyle(() => ({ transform: [{ translateY: lift.value }] }));
  // The halo's square is centred on the moon's middle: the disc's top sits `showing` of a disc above the tile's bottom edge.
  const halo = disc * MOON_PADS.glow;
  return (
    <View style={[styles.tile, { width, height, borderRadius: radius }, !slot.owned && styles.comingTile]}>
      {/* As Home draws it (night-sky.tsx): the moon's sky flipped so its light comes up from behind the
          moon, and the moon's halo in its own colour round it (user asked for Home's glow here, 2026-11-19). */}
      {slot.owned ? <SkyPicture moon={slot.moon} /> : null}
      <Animated.View style={[styles.moon, { width: halo, height: halo, left: (width - halo) / 2, top: height - showing * disc + disc / 2 - halo / 2 }, lifted]}>
        {slot.owned ? <MoonHalo moon={slot.moon} size={halo} /> : null}
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
});
