import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import Animated, { Easing, ReduceMotion, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

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

/**
 * A swap is a true crossfade with no dip: the light on show stays fully on underneath, the new one
 * fades in over it only once its image has loaded, and then everything under it goes. (Fading the old
 * out while the new came in left both half-clear mid-swap, a visible dip, and the new image could pop in
 * part-way; on the Sky cards, where the light follows the swipe, that read as a glitch, user 2026-11-19.)
 */
export function MoonGlow({ id }: { id: string }) {
  const [layers, setLayers] = useState<{ id: string; n: number }[]>([{ id, n: 0 }]);
  useEffect(() => {
    setLayers((ls) => {
      const top = ls[ls.length - 1];
      return top.id === id ? ls : [...ls, { id, n: top.n + 1 }];
    });
  }, [id]);
  return (
    <>
      {layers.map((l) => (
        <GlowLayer key={l.n} id={l.id} fade={l.n > 0} onShown={() => setLayers((ls) => ls.filter((x) => x.n >= l.n))} />
      ))}
    </>
  );
}

function GlowLayer({ id, fade, onShown }: { id: string; fade: boolean; onShown: () => void }) {
  const { width } = useWindowDimensions();
  const opacity = useSharedValue(fade ? 0 : 1);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const source = MOON_DRAG[id];
  if (!source) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.glow,
        {
          left: width / 2 - DRAG_BOX.cx * R,
          top: CENTRE_Y - DRAG_BOX.cy * R,
          width: DRAG_BOX.width * R,
          height: DRAG_BOX.height * R,
        },
        style,
      ]}
    >
      <Image
        source={source}
        style={StyleSheet.absoluteFill}
        contentFit="fill"
        transition={0}
        accessible={false}
        onLoad={() => {
          if (!fade) return;
          opacity.value = withTiming(1, { duration: SWAP_MS, easing: Easing.inOut(Easing.quad), reduceMotion: ReduceMotion.System }, (done) => {
            if (done) runOnJS(onShown)();
          });
        }}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  glow: { position: 'absolute' },
});
