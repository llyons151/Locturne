import { Image } from 'expo-image';
import { useEffect, useRef } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { DRAG_BOX, MOON_DRAG } from './moon-drag';

/**
 * The moon's own light at the top of the moons page (user asked for it, 2026-11-16: "make the moon
 * tint poke out the top like the payoff"): the payoff's baked drag, with the moon itself left out
 * ("remove the moon keep the glow") and its centre above the screen, so only the light shows. Tuned in
 * tools/moons-milestones. Moons page only: the no-glow rule still holds everywhere else.
 */
/** The moon's square, its disc 1/1.5 of it (FROST_PAD), as the payoff lays it out. */
const BOX = 330;
/** The moon's centre, in points above the page's top: raised till it wasn't too strong (user). */
const CENTRE_Y = -100;
const R = BOX / 1.5 / 2;
/** A new moon's light crossfades in as the old one goes: opacity only, on the UI thread. */
const SWAP_MS = 450;

export function MoonGlow({ id }: { id: string }) {
  const { width } = useWindowDimensions();
  // The first light comes in with the page; only a swap fades.
  const first = useRef(true);
  useEffect(() => {
    first.current = false;
  }, []);
  const source = MOON_DRAG[id];
  if (!source) return null;
  return (
    <Animated.View
      // Keyed on the moon: a new one mounts and fades in over the old one fading out.
      key={id}
      pointerEvents="none"
      entering={first.current ? undefined : FadeIn.duration(SWAP_MS)}
      exiting={FadeOut.duration(SWAP_MS)}
      style={[
        styles.glow,
        {
          left: width / 2 - DRAG_BOX.cx * R,
          top: CENTRE_Y - DRAG_BOX.cy * R,
          width: DRAG_BOX.width * R,
          height: DRAG_BOX.height * R,
        },
      ]}
    >
      <Image source={source} style={StyleSheet.absoluteFill} contentFit="fill" accessible={false} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  glow: { position: 'absolute' },
});
