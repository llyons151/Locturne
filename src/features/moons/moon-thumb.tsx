import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { FROST_PAD, MoonPart, MoonRing } from '@/components/night-sky';
import { Text } from '@/components/text';
import { Nocturne, Radius } from '@/theme';

import type { MoonDef } from './moon-types';

/** The moon's width inside its square. */
const DISC = 0.56;

/**
 * A moon in a square of its own sky, as Home shows it: the collection's tiles and the payoff's
 * new moon. Still (no rise, no halo). `locked`: no colour, only a grey disc, so the colours stay
 * the surprise (docs/reports/Moon collection flow.md); `secret` puts a "?" in it.
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
          <Image
            source={moon.moon ?? require('@/assets/onboarding/moon-frosted.png')}
            style={[StyleSheet.absoluteFill, { transform: [{ scale: moon.scale }] }]}
            contentFit="contain"
            accessible={false}
          />
          {moon.ring ? <MoonPart source={moon.ring} box={box} x={0} y={0} size={1.6} /> : null}
          {moon.ringLine ? <MoonRing line={moon.ringLine} box={box} /> : null}
          {moon.twin && moon.twinAt?.front ? <MoonPart source={moon.twin} box={box} x={moon.twinAt.x} y={moon.twinAt.y} size={moon.twinAt.size * FROST_PAD} /> : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  unclipped: { overflow: 'visible' },
  ownedTile: { backgroundColor: Nocturne.bg },
  // Plain smoked glass, as the cards (docs/CARD_CONSISTENCY.md).
  lockedTile: { backgroundColor: 'rgba(255, 255, 255, 0.05)', borderWidth: StyleSheet.hairlineWidth, borderColor: Nocturne.edge },
  lockedDisc: { backgroundColor: 'rgba(255, 255, 255, 0.08)', alignItems: 'center', justifyContent: 'center' },
  secret: { color: Nocturne.text2, fontWeight: '600' },
  // The moon you're wearing: a plain white edge (no glow).
  wearing: { borderWidth: 2, borderColor: Nocturne.text },
});
