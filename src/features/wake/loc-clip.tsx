import { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import LocClipPlayer from './loc-clip-player';
// Written by tools/loc-clips/bake.py with the clips: their shape and timings.
import jumpMeta from '../../../assets/loc-clips/loc-jump.json';
import plopMeta from '../../../assets/loc-clips/loc-plop.json';

/**
 * Loc's payoff moment as clips (user, 2026-11-12: the drawn yell "looks kinda terrible"): Kling videos
 * of him jumping out from his duck and landing arms up, idling, and sinking back down on Done, baked
 * by tools/loc-clips/bake.py (docs/LOC_CLIPS.md) and played on one canvas (loc-clip-player.tsx). The
 * cuts, speeds and his eyes are set in the clip lab (`npm run loc-clips`). He stands on the panel's
 * edge: a clip's bottom is where the video's ledge was.
 */
type Clip = {
  /** Width over height of a frame: bake.py's crop. */
  aspect: number;
  /** The clip's width as a share of the screen's, so his peek is about Home's Loc's size. */
  share: number;
  /** Where his head tops out once he's landed, as a share of the clip's height up from its foot. */
  head: number;
  /** When his feet leave the edge: the moment the phone buzzes and the moon goes up (`onYell`). */
  launchMs: number;
};

const CLIPS = {
  jump: {
    aspect: jumpMeta.aspect,
    // Set in the clip lab ("Size in the app"). 0.43 makes his peek Home's Loc's size (user, 2026-11-12: at 0.32 he was
    // smaller than Home's; at 0.4 the standing Loc had felt too big, so this is the one to tune).
    share: jumpMeta.share,
    // 0.9 of the video's own height; the clip has room over that for when he jumps out of it.
    head: 0.9 * (1 - jumpMeta.headroom),
    launchMs: jumpMeta.launchMs,
  },
} satisfies Record<string, Clip>;

export type LocClipName = keyof typeof CLIPS;
export const LOC_CLIP_NAMES = Object.keys(CLIPS) as LocClipName[];

/** A named clip (`?clip=` in the browser preview), else one at random. */
export function pickLocClip(name?: string): LocClipName {
  if (name && name in CLIPS) return name as LocClipName;
  return LOC_CLIP_NAMES[Math.floor(Math.random() * LOC_CLIP_NAMES.length)];
}

/** Done: how long until he's gone, and when in that the moon starts to fall. */
/**
 * Done (user, 2026-11-12: "plop down", using the first clip's leap where "he plops up and tucks his
 * legs"): the player plays the jump's landing backwards (loc-plop: he dips and springs up, legs
 * tucked), he hangs there a beat, then drops through the floor, which ripples where he went in
 * (floor-ripple.tsx).
 */
const PLOP = {
  /** The spring up: the plop clip's own length. */
  up: plopMeta.ms,
  /** Hanging at the top, legs tucked. */
  hang: 70,
  drop: 360,
  /** He's in the floor this far into the drop: the ripple starts. */
  splashAt: 0.4,
};
const PLOP_MS = PLOP.up + PLOP.hang + PLOP.drop;

/** Done: how long until he's gone, when the floor ripples, and when the moon starts to fall (once he's in). */
export function locClipExit(_name: LocClipName) {
  const rippleMs = Math.round(PLOP.up + PLOP.hang + PLOP.drop * PLOP.splashAt);
  // The floor settles most of the way before anything else moves, so the ripple is seen whole.
  return { ms: PLOP_MS, rippleMs, moonMs: rippleMs + 650 };
}

export function locClipSize(name: LocClipName, width: number) {
  const c = CLIPS[name];
  const w = Math.round(width * c.share);
  return { w, h: Math.round(w / c.aspect), head: c.head };
}

/** He comes up from behind the edge into his jump over this long (`nonce` 1). */
const RISE_MS = 240;
/** How far down he starts, as a share of the clip's height: his ducked head is under the edge. */
const RISE_FROM = 0.6;

/**
 * `nonce` 0: out of sight under the edge (Home's own Loc is the one showing, and ducks down there
 * before this one comes up, so the two never swap in view; user, 2026-11-12). 1 plays the clip, rising
 * from under the edge as it starts at his duck; each one after replays it from the duck. `onYell` fires as he leaves the edge. `leaving` (Done): he sinks down out of sight.
 */
export function LocClip({
  name,
  width,
  nonce,
  leaving = false,
  onYell,
  onTap,
}: {
  name: LocClipName;
  width: number;
  nonce: number;
  leaving?: boolean;
  onYell: () => void;
  onTap: () => void;
}) {
  const clip = CLIPS[name];
  const { w, h } = locClipSize(name, width);
  const rise = useSharedValue(nonce > 0 ? 0 : 1);
  // Done: once he's sprung up (the plop clip, in the player), he drops through the floor.
  const fall = useSharedValue(0);
  const riseStyle = useAnimatedStyle(() => ({ transform: [{ translateY: (rise.get() * RISE_FROM + fall.get()) * h }] }));
  useEffect(() => {
    if (!leaving || nonce === 0) return;
    // Gravity: slow off the top, fast into the floor, and on until he's well under it.
    fall.set(withDelay(PLOP.up + PLOP.hang, withTiming(1.15, { duration: PLOP.drop, easing: Easing.in(Easing.quad) })));
  }, [leaving, nonce, fall]);
  useEffect(() => {
    if (nonce === 1) rise.set(withTiming(0, { duration: RISE_MS, easing: Easing.out(Easing.cubic) }));
  }, [nonce, rise]);
  const dom = useMemo(
    () => ({
      style: { width: w, height: h, backgroundColor: 'transparent' },
      scrollEnabled: false,
      bounces: false,
      contentInsetAdjustmentBehavior: 'never' as const,
      // The clips are muted videos, played inline the moment they're wanted.
      allowsInlineMediaPlayback: true,
      mediaPlaybackRequiresUserAction: false,
    }),
    [w, h],
  );
  return (
    <View style={[styles.clip, { width: w, height: h }]} pointerEvents="box-none">
      <Animated.View style={[StyleSheet.absoluteFill, riseStyle]} pointerEvents="none">
        <LocClipPlayer nonce={nonce} leaving={leaving && nonce > 0} launchMs={clip.launchMs} onLaunch={onYell} dom={dom} />
      </Animated.View>
      {/* Over the webview, which would take the touch. */}
      <Pressable onPress={onTap} style={StyleSheet.absoluteFill} accessibilityRole="image" />
    </View>
  );
}

const styles = StyleSheet.create({
  // Cut off at its foot, the panel's edge: he comes up from behind it.
  clip: { alignSelf: 'center', position: 'absolute', bottom: 0, overflow: 'hidden' },
});
