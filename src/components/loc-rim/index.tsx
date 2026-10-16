import { useEffect, useRef, useState } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import Animated, { Easing, cancelAnimation, makeMutable, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import type { UltraRun } from '@/features/home/loc-ultra';
import { rimPoint } from '@/features/home/rim';
import { thud, tick } from '@/lib/haptics';

const AnimatedPath = Animated.createAnimatedComponent(Path);

/**
 * Loc's lump tearing round the whole screen in the ultra zoomies (features/home/loc-ultra.ts).
 * His own canvas only covers the bottom edge, so this layer, over the whole panel, draws the
 * lump from the moment he dives until he's home in the middle of the bottom edge again, where
 * the canvas picks it up for the crouch and the burst. Drawn like his: the covers' black bulging
 * in from the edge, a ripple trailing it, trembling when he strains. The run comes planned, in
 * one message (`runRim`), and plays on the UI thread.
 */
// Kept on the global object, so a hot reload of this file (in development) shares one channel
// instead of Loc sending runs to an old copy that's no longer drawn: the lump just didn't show.
const shared = globalThis as { __locRim?: { current: ReturnType<typeof makeMutable<UltraRun | null>>; listeners: Set<(on: boolean) => void> } };
shared.__locRim ??= { current: makeMutable<UltraRun | null>(null), listeners: new Set() };
const { current, listeners } = shared.__locRim;

/** Draw this run, from now. */
export function runRim(run: UltraRun) {
  current.set(run);
  listeners.forEach((l) => l(true));
}

/** He left Home mid-run: the lump fades away. */
export function stopRim() {
  listeners.forEach((l) => l(false));
}

/** Both drawn a moment together at the hand-off, black on black, so there's never a frame without him. */
const HANDOFF = 80;
/** Out past the screen's edge, so no hairline shows between the lump and the edge. */
const BLEED = 3;
const FADE_MS = 160;

export function LocRim() {
  const { width, height } = useWindowDimensions();
  const [on, setOn] = useState(0);
  const clock = useSharedValue(0);
  const fade = useSharedValue(1);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const clear = () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
    const listen = (start: boolean) => {
      clear();
      const run = current.get();
      if (!start || !run) {
        fade.set(withTiming(0, { duration: FADE_MS }));
        timers.current.push(setTimeout(() => setOn(0), FADE_MS + 20));
        return;
      }
      const end = run.home + HANDOFF;
      cancelAnimation(clock);
      fade.set(1);
      clock.set(0);
      clock.set(withTiming(end, { duration: end, easing: Easing.linear }));
      for (const [ms, kind] of run.taps) timers.current.push(setTimeout(kind === 'thud' ? thud : tick, ms));
      timers.current.push(setTimeout(() => setOn(0), end + 30));
      setOn((n) => n + 1);
    };
    listeners.add(listen);
    return () => {
      listeners.delete(listen);
      clear();
    };
  }, [clock, fade]);

  const props = useAnimatedProps(() => {
    const none = { d: 'M0 0' };
    const run = current.value;
    const n = run ? run.u.length : 0;
    if (!run || n < 2) return none;
    const t = clock.value;
    const f = Math.min(n - 1, t / (run.dt * 1000));
    const i0 = Math.min(n - 2, Math.floor(f)), i1 = i0 + 1, k = f - i0;
    const at = (a: number[]) => a[i0] + (a[i1] - a[i0]) * k;
    const h = at(run.h) * fade.value;
    if (h <= 0.002) return none;
    const u = at(run.u), w = at(run.w), shake = at(run.shake);
    const W = run.rim.W;
    // The same lump as on his canvas (LocRig.drawLump): 9 pt high at rest, a fifth of the
    // width across, a quick uneven tremble when he strains, and a ripple trailing it.
    const strain = shake * (Math.sin(t * 0.058) * 0.6 + Math.sin(t * 0.037) * 0.4);
    const top = 9 * h * (1 + Math.sin(t * 0.006) * 0.08 + strain * 0.12);
    const sig = W * 0.085 * w;
    const vel = (run.u[i1] - run.u[i0]) / run.dt;
    const dir = Math.sign(vel);
    const ripple = top * 0.42 * Math.min(1, (Math.abs(vel) / W) * 1.6) * (0.65 + 0.35 * Math.sin(t * 0.01));
    const c = u + strain * 2;
    const trail = c - dir * 1.7 * sig;
    const lo = c - 4 * sig, hi = c + 4 * sig, step = Math.max(2, sig / 10);
    let front = '', back = '';
    for (let s = lo; s <= hi + 0.01; s += step) {
      const p = rimPoint(s, run.rim);
      const d = (s - c) / sig, r = (s - trail) / (0.7 * sig);
      const lift = top * Math.exp(-d * d) + ripple * Math.exp(-r * r);
      const x = (p[0] + p[2] * lift).toFixed(1), y = (p[1] + p[3] * lift).toFixed(1);
      front += `${front ? 'L' : 'M'}${x} ${y}`;
      back = `L${(p[0] - p[2] * BLEED).toFixed(1)} ${(p[1] - p[3] * BLEED).toFixed(1)}` + back;
    }
    return { d: `${front}${back}Z` };
  });

  if (!on) return null;
  return (
    // Sized outright: on web an SVG left to fill its box falls back to 300 x 150.
    <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
      <AnimatedPath animatedProps={props} fill="#000000" />
    </Svg>
  );
}
