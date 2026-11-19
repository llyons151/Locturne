import { Image } from 'expo-image';
import { StyleSheet, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

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

const styles = StyleSheet.create({
  glow: { position: 'absolute' },
});

/**
 * Sky cards (user 2026-11-19: "it should transition between the colors as u swipe"): every card's light,
 * blended by how far the swipe is between cards, following the finger. The light of the card at or
 * just behind the swipe sits fully on underneath and the next one fades in over it by the fraction
 * travelled, so halfway between two cards it's an even mix and the light never dims. `ids`: the moon
 * whose light each card shows, in card order (a coming moon shows the worn moon's).
 */
export function SwipeGlow({ ids, x, step }: { ids: string[]; x: SharedValue<number>; step: number }) {
  return (
    <>
      {ids.map((id, i) => (
        <SwipeLayer key={i} id={id} index={i} x={x} step={step} />
      ))}
    </>
  );
}

function SwipeLayer({ id, index, x, step }: { id: string; index: number; x: SharedValue<number>; step: number }) {
  const { width } = useWindowDimensions();
  const style = useAnimatedStyle(() => {
    const pos = Math.max(0, x.value / step);
    const base = Math.floor(pos);
    const t = pos - base;
    return { opacity: index === base ? 1 : index === base + 1 ? t : 0 };
  });
  const source = MOON_DRAG[id];
  if (!source) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.glow,
        { left: width / 2 - DRAG_BOX.cx * R, top: CENTRE_Y - DRAG_BOX.cy * R, width: DRAG_BOX.width * R, height: DRAG_BOX.height * R },
        style,
      ]}
    >
      <Image source={source} style={StyleSheet.absoluteFill} contentFit="fill" transition={0} accessible={false} />
    </Animated.View>
  );
}
