import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { FROST_PAD, MoonPart, MoonRing } from '@/components/night-sky';
import { Text } from '@/components/text';
import { Nocturne, Radius } from '@/theme';

import { MOON_ICONS, NIGHT_ICON } from './moon-icons';
import type { MoonDef } from './moon-types';

/** The moon's width inside its square (the payoff's round moon). */
const DISC = 0.56;
/** The icon's width inside its square, and its disc within it (tools/moon-lab/bake-icons.py). */
const ICON = 0.8;
const ICON_DISC = { x: 262 / 512, y: 238.5 / 512, r: 163.5 / 512 };

/**
 * A collection tile: the night icon (a moon behind two clouds) in a square of smoked glass, the
 * moon's own art and colours once it's yours (user, 2026-11-01). `locked`: the icon in grey, so
 * the colours stay the surprise (docs/reports/Moon collection flow.md); `secret` puts a "?" in it.
 * `round`: the moon itself, still (no rise, no halo), as the payoff shows a new one on the sky.
 */
export function MoonThumb({
  moon,
  size,
  locked = false,
  secret = false,
  wearing = false,
  round = false,
}: {
  moon: MoonDef;
  size: number;
  locked?: boolean;
  secret?: boolean;
  wearing?: boolean;
  /** Just the moon, no square of sky (the payoff's, on the real sky). */
  round?: boolean;
}) {
  if (!round) {
    const icon = size * ICON;
    const r = icon * ICON_DISC.r;
    return (
      <View style={[styles.tile, styles.glassTile, { width: size, height: size, borderRadius: Radius.card }, wearing && styles.wearing]}>
        <View style={{ width: icon, height: icon }}>
          <Image
            source={locked ? NIGHT_ICON : (MOON_ICONS[moon.id] ?? NIGHT_ICON)}
            style={StyleSheet.absoluteFill}
            contentFit="contain"
            tintColor={locked ? LOCKED_ICON : undefined}
            accessible={false}
          />
          {locked && secret ? (
            <View style={[styles.secretSpot, { left: icon * ICON_DISC.x - r, top: icon * ICON_DISC.y - r, width: r * 2, height: r * 2 }]}>
              <Text style={[styles.secret, { fontSize: r * 0.9 }]}>?</Text>
            </View>
          ) : null}
        </View>
      </View>
    );
  }
  const disc = size * (round ? 1 : DISC);
  const box = disc * FROST_PAD;
  return (
    <View
      style={[
        styles.tile,
        { width: size, height: size, borderRadius: round ? size / 2 : Radius.card },
        // A ring or a twin may reach past a round moon's edge.
        round && !locked && styles.unclipped,
        locked ? styles.lockedTile : round ? null : styles.ownedTile,
        wearing && styles.wearing,
      ]}
    >
      {!locked && !round ? (
        <Image
          source={moon.sky ?? require('@/assets/onboarding/night-sky-moonless.png')}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          contentPosition="top right"
          accessible={false}
        />
      ) : null}
      {locked ? (
        <View style={[styles.lockedDisc, { width: disc, height: disc, borderRadius: disc / 2 }]}>
          {secret ? <Text style={[styles.secret, { fontSize: disc * 0.42 }]}>?</Text> : null}
        </View>
      ) : (
        <View style={{ width: box, height: box }}>
          {moon.twin && moon.twinAt && !moon.twinAt.front ? <MoonPart source={moon.twin} box={box} x={moon.twinAt.x} y={moon.twinAt.y} size={moon.twinAt.size * FROST_PAD} /> : null}
          {/* A Saturn ring behind the moon's frosted edge, as on Home (night-sky.tsx). */}
          {moon.ringLine?.kind === 'saturn' ? <MoonRing line={moon.ringLine} box={box} /> : null}
          <Image
            source={moon.moon ?? require('@/assets/onboarding/moon-frosted.png')}
            style={[StyleSheet.absoluteFill, { transform: [{ scale: moon.scale }] }]}
            contentFit="contain"
            accessible={false}
          />
          {moon.ring ? <MoonPart source={moon.ring} box={box} x={0} y={0} size={1.6} /> : null}
          {moon.ringLine?.kind === 'eclipse' ? <MoonRing line={moon.ringLine} box={box} /> : null}
          {moon.twin && moon.twinAt?.front ? <MoonPart source={moon.twin} box={box} x={moon.twinAt.x} y={moon.twinAt.y} size={moon.twinAt.size * FROST_PAD} /> : null}
        </View>
      )}
    </View>
  );
}

/** A moon not yet yours: the icon in a faint grey. */
const LOCKED_ICON = '#2C2C30';

const styles = StyleSheet.create({
  tile: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  unclipped: { overflow: 'visible' },
  ownedTile: { backgroundColor: Nocturne.bg },
  // Plain smoked glass, as the cards (docs/CARD_CONSISTENCY.md).
  lockedTile: { backgroundColor: 'rgba(255, 255, 255, 0.05)', borderWidth: StyleSheet.hairlineWidth, borderColor: Nocturne.edge },
  glassTile: { backgroundColor: 'rgba(255, 255, 255, 0.05)', borderWidth: StyleSheet.hairlineWidth, borderColor: Nocturne.edge },
  secretSpot: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  lockedDisc: { backgroundColor: 'rgba(255, 255, 255, 0.08)', alignItems: 'center', justifyContent: 'center' },
  secret: { color: Nocturne.text2, fontWeight: '600' },
  // The moon you're wearing: a plain white edge (no glow).
  wearing: { borderWidth: 2, borderColor: Nocturne.text },
});
