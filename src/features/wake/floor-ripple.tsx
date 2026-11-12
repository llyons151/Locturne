import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** How long the ripple runs, start to flat. */
export const RIPPLE_MS = 1100;
/** Room over the floor's edge for the ripple to rise into. */
const ROOM = 48;
/** The swell's height where he went in, at its top. */
const SWELL = 14;
/** Its half width there; it widens to this times `SPREAD` as it runs out and settles. */
const WIDE = 34;
const SPREAD = 2.6;
/** Points between samples along the edge; the curve is smoothed between them. */
const STEP = 6;
/** No ripple this close to the screen's sides, where the panel's corners round off. */
const SIDE = 44;

/**
 * The black floor (the payoff's strip) taking Loc like liquid as he plops into it on Done (user,
 * 2026-11-12; "a lil more clean"): one smooth swell where he went in that spreads and settles flat. Drawn as black rising out of the floor into the sky, so it reads as the floor itself.
 * `nonce` > 0 plays it once, centred at `x`. Sits on the floor's edge: its bottom is the edge.
 */
export function FloorRipple({ width, x, nonce }: { width: number; x: number; nonce: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    if (!nonce) return;
    t.set(0);
    t.set(withTiming(1, { duration: RIPPLE_MS, easing: Easing.linear }));
  }, [nonce, t]);
  const props = useAnimatedProps(() => {
    const p = t.get();
    if (p <= 0 || p >= 1) return { d: `M0,${ROOM} L${width},${ROOM} Z` };
    // One soft swell where he went in: it rises quickly, then sinks back as it spreads and splits into
    // two gentle crests running out each way. Heights ease in and out, so nothing pops.
    const rise = Math.min(1, p / 0.18);
    const height = SWELL * (rise * rise * (3 - 2 * rise)) * (1 - p) ** 1.6;
    const half = WIDE * (1 + (SPREAD - 1) * p);
    const apart = width * 0.34 * p * p;
    const ys: number[] = [];
    for (let px = 0; px <= width; px += STEP) {
      const u = Math.abs(px - x);
      const crest = Math.exp(-(((u - apart) / half) ** 2));
      const side = Math.min(1, Math.min(px, width - px) / SIDE);
      ys.push(ROOM - height * crest * side * side);
    }
    // Through the samples' midpoints as a smooth curve: no corners on the swell.
    let d = `M0,${ys[0]}`;
    for (let i = 1; i < ys.length - 1; i++) {
      const mx = (i + 0.5) * STEP;
      d += ` Q${i * STEP},${ys[i]} ${Math.min(mx, width)},${(ys[i] + ys[i + 1]) / 2}`;
    }
    return { d: `${d} L${width},${ROOM} L${width},${ROOM + 2} L0,${ROOM + 2} Z` };
  });
  return (
    <View style={[styles.wrap, { height: ROOM + 2 }]} pointerEvents="none">
      <Svg width={width} height={ROOM + 2}>
        <AnimatedPath animatedProps={props} fill="#000000" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: -2 },
});
