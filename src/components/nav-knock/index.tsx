import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { Platform, StyleSheet, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import Animated, { makeMutable, useAnimatedStyle, useFrameCallback, useSharedValue, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { NAV_KNOCK, type BurrowPath, type NavKnockTune } from '@/features/home/nav-knock-tune';
import { tick } from '@/lib/haptics';

import { poseOf, startKnock, stepKnock, type Knock } from './physics';

/**
 * The nav strip's buttons bouncing as Loc burrows under them (nav-knock-tune.ts). Loc's rig plans
 * the lump's whole run when he dives and sends it once (`knockNav`); the tab bar plays the bounce
 * from it in a frame callback, on the UI thread, so nothing crosses threads while it plays.
 */
const run = makeMutable<{ id: number; path: BurrowPath; tune: NavKnockTune } | null>(null);
let runs = 0;
const starters = new Set<() => void>();

/** Loc just dived: bounce the buttons along this run, with the tuning as it is now. */
export function knockNav(path: BurrowPath) {
  run.set({ id: ++runs, path, tune: { ...NAV_KNOCK } });
  starters.forEach((start) => start());
}

/** Loc left mid-run (off Home): the buttons ring down where they are, with no lump under them. */
export function stopKnock() {
  const now = run.get();
  if (!now) return;
  run.set({ id: ++runs, path: { dt: 1, x: [], h: [], pop: 0 }, tune: { ...now.tune, haptics: false } });
  starters.forEach((start) => start());
}

type Pose = { x: number; y: number; a: number; sx: number; sy: number };
export type NavKnock = { poses: SharedValue<Pose[]>; layout: (index: number) => (e: LayoutChangeEvent) => void; row: (e: LayoutChangeEvent) => void };

/** Bounces closer together than this (s) share one haptic tick. */
const HAPTIC_GAP = 0.14;
/** Below this rise in a step (`stepKnock`'s return) a bounce is too small to feel. */
const HAPTIC_MIN = 0.012;
const R = 26;
/**
 * The physics' own clock: fixed steps, however uneven the frames (a web page's are). A step
 * that followed each frame's length would move the springs by uneven amounts, which reads as
 * judder; 240 a second divides 60 and 120 Hz screens evenly.
 */
const STEP = 1 / 240;

/**
 * The tab bar's side: `count` buttons in a row across the full-width strip.
 * Wrap each button in `Knockable` with its index, and give the row `row` as its `onLayout`.
 */
export function useNavKnock(count: number, reduced: boolean): NavKnock {
  const { width } = useWindowDimensions();
  const rest = () => Array.from({ length: count }, () => ({ x: 0, y: 0, a: 0, sx: 1, sy: 1 }));
  const poses = useSharedValue<Pose[]>(rest());
  const homes = useSharedValue<{ x: number; y: number }[]>(Array.from({ length: count }, () => ({ x: 0, y: 0 })));
  const origin = useSharedValue({ x: 0, y: 0 });
  const sim = useSharedValue<Knock | null>(null);
  const playing = useSharedValue(0);
  const felt = useSharedValue(-1);
  const behind = useSharedValue(0);
  // Turns the frame callback off once the buttons are home (it's made below, after this).
  const frameRef = useRef<{ setActive: (on: boolean) => void } | null>(null);
  // A run that ended as a newer one started leaves the newer one playing.
  const stop = useCallback((id: number) => {
    if (id === runs) frameRef.current?.setActive(false);
  }, []);

  const frame = useFrameCallback((info) => {
    const now = run.get();
    if (!now) return;
    let k = sim.get();
    if (!k || playing.get() !== now.id) {
      // A new dive while the last bounce still plays picks the buttons up where they are.
      const next = startKnock(count);
      if (k && !k.done) next.discs = k.discs;
      k = next;
      playing.set(now.id);
      felt.set(-1);
      behind.set(0);
    }
    const o = origin.get();
    const world = {
      homes: homes.get().map((h) => ({ x: o.x + h.x, y: o.y + h.y })),
      W: width, R, path: now.path, tune: now.tune,
    };
    // As many fixed steps as the frame was long; a long stall (the app in the background)
    // catches up at most a tenth of a second.
    let owed = Math.min(0.1, behind.get() + (info.timeSincePreviousFrame ?? 16) / 1000);
    let hard = 0;
    while (owed >= STEP && !k.done) {
      hard = Math.max(hard, stepKnock(k, world, STEP));
      owed -= STEP;
    }
    behind.set(owed);
    sim.set(k);
    // They rise as far as the panel's edge, the top of the row.
    const up = Math.max(0, o.y - 1);
    poses.set(k.discs.map((d) => poseOf(d, R, up, now.tune)));
    if (now.tune.haptics && hard > HAPTIC_MIN && k.t - felt.get() > HAPTIC_GAP) {
      felt.set(k.t);
      scheduleOnRN(tick);
    }
    if (k.done) {
      run.set(null);
      sim.set(null);
      scheduleOnRN(stop, now.id);
    }
  }, false);

  useEffect(() => {
    frameRef.current = frame;
    const start = () => {
      if (reduced) return void run.set(null);
      frame.setActive(true);
    };
    starters.add(start);
    return () => void starters.delete(start);
  }, [frame, reduced]);

  const layout = useCallback(
    (index: number) => (e: LayoutChangeEvent) => {
      const { x, y, width: w, height: h } = e.nativeEvent.layout;
      homes.modify((list) => {
        'worklet';
        list[index] = { x: x + w / 2, y: y + h / 2 };
        return list;
      });
    },
    [homes],
  );
  const row = useCallback((e: LayoutChangeEvent) => origin.set({ x: e.nativeEvent.layout.x, y: e.nativeEvent.layout.y }), [origin]);

  return { poses, layout, row };
}

/** One button the burrow bounces: moved, rolled and squashed, laid out as normal. */
export function Knockable({ knock, index, children }: { knock: NavKnock; index: number; children: ReactNode }) {
  // Only the poses go to the UI thread, not the layout callbacks with them.
  const poses = knock.poses;
  const style = useAnimatedStyle(() => {
    const p = poses.value[index] ?? { x: 0, y: 0, a: 0, sx: 1, sy: 1 };
    return { transform: [{ translateX: p.x }, { translateY: p.y }, { rotate: `${p.a}rad` }, { scaleX: p.sx }, { scaleY: p.sy }] };
  });
  return (
    <Animated.View style={[styles.layer, style]} onLayout={knock.layout(index)}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // On web, each button on its own GPU layer: moving it then only recomposites, with no repaint
  // of the button (the moon's SVG above all) on every frame.
  layer: Platform.OS === 'web' ? ({ willChange: 'transform' } as object) : {},
});
