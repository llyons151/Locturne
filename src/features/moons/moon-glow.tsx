import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';

import { SHINY_FADE_MS } from './moon-theme';

/**
 * The moon's own light at the top of the moons page (user asked for it, 2026-11-16: "make the moon tint
 * poke out the top like the payoff"), centred above the screen so only its lower edge shows. Moons page only:
 * the no-glow rule still holds everywhere else.
 *
 * It is the halo Home draws round the moon (moon-glow.png) in the moon's glow colour, the same colour as
 * its card's halo, one shape for every moon. (It was the payoff's baked drag, whose colours don't match the
 * cards and whose strength varies wildly: Lagoon's is peach on a teal card, the Eclipse's nearly empty, so
 * the light lurched and cut out as you swiped, user 2026-11-19.)
 *
 * It follows the swipe (user 2026-11-19: "it should transition between the colors as u swipe"): the light of
 * the card at or just behind the swipe sits fully on underneath and the next one fades in over it by the
 * fraction travelled, so halfway between two cards it's an even mix and it never dims.
 */
const GLOW = require('@/assets/onboarding/moon-glow.png');
/** The glow's square, as a multiple of the screen's width. */
const SIZE = 2.2;
/** Its centre, in points above the page's top. */
const CENTRE_Y = -210;
/** How strong the light is overall. */
const STRENGTH = 1;

/** `colors`: the glow colour each card shows, in card order (a coming moon shows the worn moon's). */
export function SwipeGlow({ colors, x, step }: { colors: string[]; x: SharedValue<number>; step: number }) {
  const { width } = useWindowDimensions();
  const size = width * SIZE;
  return (
    <View pointerEvents="none" style={[styles.glow, { left: (width - size) / 2, top: CENTRE_Y - size / 2, width: size, height: size }]}>
      {colors.map((color, i) => (
        <Layer key={i} color={color} index={i} x={x} step={step} size={size} />
      ))}
    </View>
  );
}

function Layer({ color, index, x, step, size }: { color: string; index: number; x: SharedValue<number>; step: number; size: number }) {
  const style = useAnimatedStyle(() => {
    const pos = Math.max(0, x.value / step);
    const base = Math.floor(pos);
    const t = pos - base;
    return { opacity: index === base ? 1 : index === base + 1 ? t : 0 };
  });
  // A card's colour changing in place (its shiny switched on or off): the new light fades in over the old.
  const [shown, setShown] = useState(color);
  const [old, setOld] = useState<string | null>(null);
  const fresh = useSharedValue(1);
  if (color !== shown) {
    setOld(shown);
    setShown(color);
  }
  useEffect(() => {
    if (!old) return;
    fresh.value = 0;
    fresh.value = withTiming(1, { duration: SHINY_FADE_MS, easing: Easing.inOut(Easing.cubic) });
  }, [old, fresh]);
  const freshStyle = useAnimatedStyle(() => ({ opacity: fresh.value }));
  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]}>
      {old ? <Image source={GLOW} style={[StyleSheet.absoluteFill, { width: size, height: size }]} contentFit="contain" tintColor={old} transition={0} accessible={false} /> : null}
      <Animated.View style={[StyleSheet.absoluteFill, freshStyle]}>
        <Image source={GLOW} style={{ width: size, height: size }} contentFit="contain" tintColor={shown} transition={0} accessible={false} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  glow: { position: 'absolute', opacity: STRENGTH },
});
