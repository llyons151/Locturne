'use dom';

import { IS_DOM } from 'expo/dom';
import { useEffect, useRef } from 'react';

import { LocRig, type LocMood } from './loc-rig';
import { NAV_KNOCK, type BurrowPath, type NavKnockTune } from './nav-knock-tune';
import type { Rim } from './rim';

/**
 * Loc's canvas, as a DOM component (docs.expo.dev/guides/dom-components): the rig is WebGL and
 * canvas code from the browser study, so it runs as-is in a transparent webview on iOS and
 * directly on web. Native passes the mood; a tap on him pokes him here, with no round trip.
 */
/** A second hit within this many ms of the first sends him under the covers; one pokes him. */
const SECOND_HIT_MS = 2500;

/** How much sharper than on screen the share card's picture of him is drawn. */
const SNAP_SCALE = 2.5;

/** How long a Loc keeps the mood he was handed (`take`) before easing into his own. */
const CARRIED_MOOD_MS = 4000;

/** A beat for Home to start fading in before the lump comes running. */
const ARRIVE_DELAY_MS = 120;

export default function LocStage({
  mood,
  share,
  present,
  ink,
  wary = 0,
  onCue,
  onTap,
  onBurrow,
  burrowNonce = 0,
  zoomNonce = 0,
  ultraNonce = 0,
  yellNonce = 0,
  onYell,
  snapNonce = 0,
  onSnap,
  passNonce = 0,
  onPass,
  take,
  rim,
  knock,
  burrowOnTap = false,
  pokeOnly = false,
  rise = false,
  look,
  roam = 0,
  offset = 0,
  pick,
  sharp = false,
  edge,
}: {
  mood: LocMood;
  share: number;
  present: boolean;
  /** How wary of you he is, 0..1 (lib/loc-mind.ts). */
  wary?: number;
  /** His body's colour, `#RRGGBB`; black (in front of the moon) when left out. */
  ink?: string;
  /** What just happened to him (a poke, popping back up...), for his speech bubble. A native action on iOS. */
  onCue?: (cue: 'poke' | 'angry' | 'hello' | 'hide' | 'ultra') => void;
  /** A tap landed on him, the moment it lands, for the phone's buzz. A native action on iOS. */
  onTap?: (kind: 'poke' | 'burrow') => void;
  /** Each burrow's planned run, for the nav strip's bounce (components/nav-knock). A native action on iOS. */
  onBurrow?: (path: BurrowPath) => void;
  /** Bumped to send him under from outside (the knock lab's Burrow button). */
  burrowNonce?: number;
  /** Bumped to send him under with the zoomies (the knock lab's Zoomies button). */
  zoomNonce?: number;
  /** Bumped to send him round the whole screen (the knock lab's Ultra button). */
  ultraNonce?: number;
  /** Bumped to make him yell (the morning payoff); still arriving, he yells once he's up. */
  yellNonce?: number;
  /** The yell's throw, the moment his fist goes up. A native action on iOS. */
  onYell?: () => void;
  /** Bumped to take a picture of him as he is right now (the payoff's share card). */
  snapNonce?: number;
  /** The picture: his canvas as a PNG data URL, transparent round him. A native action on iOS. */
  onSnap?: (png: string) => void;
  /** Bumped to hand his pose and motion over to another Loc (`LocRig.passPose`): the payoff's, to Home's. */
  passNonce?: number;
  /** The pose, for `take` on the other Loc. A native action on iOS. */
  onPass?: (pose: string) => void;
  /** Another Loc's pose to carry on from (`LocRig.takePose`), then ease into this one's mood. A new `nonce` takes it. */
  take?: { nonce: number; pose: string } | null;
  /** The screen's edge, for the ultra zoomies (rim.ts); left out, he never goes round it. */
  rim?: Rim;
  /** The knock lab's live tuning; inside the webview this module is a copy, so it comes as a prop. */
  knock?: NavKnockTune;
  /** Every tap sends him under, not just a second one (onboarding's `build`). */
  burrowOnTap?: boolean;
  /** Taps only ever poke him, a shake and a wobble: nowhere to burrow (the paywall's Loc). */
  pokeOnly?: boolean;
  /** Arrives straight up from the ledge, with no covers to run in along (the paywall's card). */
  rise?: boolean;
  /** Where his eyes rest, `[x, y]` in the rig's gaze units (+y down); his glances play around it. */
  look?: [number, number];
  /** How much of the ledge he dashes about on by himself, 0..1 (the paywall's wide canvas). */
  roam?: number;
  /** Where he stands along the ledge, a share of the canvas's width from the middle (+ right); `LocRig.offset`. */
  offset?: number;
  /** The paywall's plan as he sees it: a change sets off his reaction (`LocRig.guard`). */
  pick?: 'good' | 'bad';
  /** Drawn at the phone's full 3x, not 2x: the paywall's, next to sharp text (looked soft at 2x). */
  sharp?: boolean;
  /**
   * A thin edge round him in this colour, for black sky where his black would vanish: the same
   * near-black edge the ultra zoomies' lump has (components/loc-rim). A hard 1px line, no blur.
   */
  edge?: string;
  dom?: import('expo/dom').DOMProps;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rigRef = useRef<LocRig | null>(null);
  // The mood the rig starts in; later changes go through `setMood`.
  const moodRef = useRef(mood);
  const shareRef = useRef(share);
  /** Restarts the frame loop after it stopped for an idle, out-of-sight Loc or a hidden page. */
  const wakeRef = useRef<() => void>(() => {});
  // Read once, when the rig is made.
  const inkRef = useRef(ink);
  const riseRef = useRef(rise);
  const lookRef = useRef(look);
  const roamRef = useRef(roam);
  const offsetRef = useRef(offset);
  const pickRef = useRef(pick);
  const sharpRef = useRef(sharp);
  const waryRef = useRef(wary);
  const lastTap = useRef(0);
  const onCueRef = useRef(onCue);
  const onTapRef = useRef(onTap);
  const onYellRef = useRef(onYell);
  const onSnapRef = useRef(onSnap);
  const onPassRef = useRef(onPass);
  const onBurrowRef = useRef(onBurrow);
  const rimRef = useRef<Rim | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const rig = new LocRig(canvas, moodRef.current, reduced, inkRef.current);
    rig.setShare(shareRef.current);
    rig.setWary(waryRef.current);
    rig.setRim(rimRef.current);
    rig.rises = riseRef.current;
    if (lookRef.current) rig.look = lookRef.current;
    rig.roam = roamRef.current;
    rig.offset = offsetRef.current;
    rig.onCue = (cue) => onCueRef.current?.(cue);
    rig.onYell = () => onYellRef.current?.();
    rig.onBurrow = (path) => onBurrowRef.current?.(path);
    rigRef.current = rig;
    // He arrives from the `present` effect below, which runs after this one with the rig made.
    let frame = 0;
    let running = false;
    let last = 0;
    let paused = false;
    // The loop runs only while there's something to draw: out of sight with nothing playing, or
    // with the page hidden (the app in the background, a screen over his), it stops until a
    // prop, a tap, a resize or the page coming back wakes it.
    const tick = (now: number) => {
      const dt = Math.min(0.05, Math.max(0, now - last) / 1000);
      last = now;
      if (!paused) rig.step(dt);
      if (document.visibilityState === 'hidden' || (rig.idle && !paused)) { running = false; return; }
      frame = requestAnimationFrame(tick);
    };
    const wake = () => {
      if (running || document.visibilityState === 'hidden') return;
      running = true;
      last = performance.now();
      frame = requestAnimationFrame(tick);
    };
    wakeRef.current = wake;
    const size = () => {
      // Capped at 2x to keep him cheap; `sharp` takes the phone's full 3x.
      const dpr = Math.min(sharpRef.current ? 3 : 2, window.devicePixelRatio || 1);
      const w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; wake(); }
    };
    size();
    const observer = new ResizeObserver(size);
    observer.observe(canvas);
    document.addEventListener('visibilitychange', wake);
    // Dev only: freeze his clock and step it by hand, to review moves frame by frame.
    if (process.env.NODE_ENV !== 'production') {
      (window as unknown as { __locDev?: object }).__locDev = {
        rig,
        advance: (ms: number) => { paused = true; wake(); const n = Math.ceil(ms / (1000 / 60)); for (let i = 0; i < n; i++) rig.step(ms / 1000 / n); },
        resume: () => { paused = false; wake(); },
      };
    }
    // One frame either way, so the canvas is sized and cleared before he first arrives.
    wake();
    return () => {
      cancelAnimationFrame(frame);
      running = false;
      document.removeEventListener('visibilitychange', wake);
      observer.disconnect();
      // Frees the WebGL context: browsers cap them, and the web build remounts him.
      rig.dispose();
      rigRef.current = null;
      wakeRef.current = () => {};
    };
  }, []);

  useEffect(() => {
    const rig = rigRef.current;
    if (!rig) return;
    if (!present) {
      rig.setPresent(false);
      wakeRef.current();
      return;
    }
    // Cleared if he's sent away again first, so a quick flip never brings him up off Home.
    const t = setTimeout(() => {
      rig.setPresent(true);
      wakeRef.current();
    }, ARRIVE_DELAY_MS);
    return () => clearTimeout(t);
  }, [present]);

  useEffect(() => {
    offsetRef.current = offset;
    if (rigRef.current) rigRef.current.offset = offset;
    wakeRef.current();
  }, [offset]);

  useEffect(() => {
    shareRef.current = share;
    rigRef.current?.setShare(share);
    wakeRef.current();
  }, [share]);

  useEffect(() => {
    onCueRef.current = onCue;
    onTapRef.current = onTap;
    onBurrowRef.current = onBurrow;
    onYellRef.current = onYell;
    onSnapRef.current = onSnap;
    onPassRef.current = onPass;
  }, [onCue, onTap, onBurrow, onYell, onSnap, onPass]);

  useEffect(() => {
    if (knock) Object.assign(NAV_KNOCK, knock);
  }, [knock]);

  useEffect(() => {
    if (!burrowNonce) return;
    rigRef.current?.burrow();
    wakeRef.current();
  }, [burrowNonce]);

  useEffect(() => {
    if (!zoomNonce) return;
    rigRef.current?.burrow('zoom');
    wakeRef.current();
  }, [zoomNonce]);

  useEffect(() => {
    if (!ultraNonce) return;
    rigRef.current?.burrow('ultra');
    wakeRef.current();
  }, [ultraNonce]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const rig = rigRef.current;
    if (!snapNonce || !canvas || !rig) return;
    // Drawn once more at SNAP_SCALE times the screen's pixels, so he's sharp on the card (a
    // poster, bigger than he is on screen), then put back; the screen never shows the big frame.
    const w = canvas.width, h = canvas.height;
    try {
      canvas.width = Math.round(w * SNAP_SCALE);
      canvas.height = Math.round(h * SNAP_SCALE);
      rig.step(0);
      onSnapRef.current?.(canvas.toDataURL('image/png'));
    } catch {
      // A canvas that can't be read just means no picture of him on the card.
    } finally {
      canvas.width = w;
      canvas.height = h;
      rig.step(0);
    }
  }, [snapNonce]);

  useEffect(() => {
    if (!yellNonce) return;
    rigRef.current?.yell();
    wakeRef.current();
  }, [yellNonce]);

  useEffect(() => {
    const rig = rigRef.current;
    if (!passNonce || !rig) return;
    onPassRef.current?.(rig.passPose());
  }, [passNonce]);

  // Only the nonce: the same pose handed over again on a re-render changes nothing.
  const takeNonce = take?.nonce ?? 0;
  const takeRef = useRef(take);
  // Kept current before the effect below reads it (effects run in order).
  useEffect(() => {
    takeRef.current = take;
  }, [take]);
  useEffect(() => {
    const rig = rigRef.current;
    const given = takeRef.current;
    if (!takeNonce || !rig || !given) return;
    rig.takePose(given.pose);
    wakeRef.current();
    // He carries on as the other Loc was, in its mood, and only later eases into his own: a
    // change of face right at the hand-over read as a glitch (user 2026-10-28).
    const relax = setTimeout(() => {
      rig.setMood(moodRef.current);
      wakeRef.current();
    }, CARRIED_MOOD_MS);
    return () => clearTimeout(relax);
  }, [takeNonce]);

  // Plain numbers, so a new object with the same edge (every render) changes nothing.
  const rimW = rim?.W, rimH = rim?.H, rimRb = rim?.Rb, rimRt = rim?.Rt;
  useEffect(() => {
    rimRef.current = rimW && rimH && rimRb !== undefined && rimRt !== undefined ? { W: rimW, H: rimH, Rb: rimRb, Rt: rimRt } : null;
    rigRef.current?.setRim(rimRef.current);
  }, [rimW, rimH, rimRb, rimRt]);

  useEffect(() => {
    waryRef.current = wary;
    rigRef.current?.setWary(wary);
  }, [wary]);

  useEffect(() => {
    // Only a change: he arrives on whatever was picked first.
    if (!pick || pick === pickRef.current) return;
    pickRef.current = pick;
    rigRef.current?.guard(pick);
    wakeRef.current();
  }, [pick]);

  useEffect(() => {
    moodRef.current = mood;
    rigRef.current?.setMood(mood);
    wakeRef.current();
  }, [mood]);

  return (
    <>
      {/* Only inside the webview: on web this renders inline, and the page isn't ours to restyle. */}
      {IS_DOM ? (
        <style>{'html, body, #root { margin: 0; padding: 0; height: 100%; background: transparent; overflow: hidden; -webkit-tap-highlight-color: transparent; user-select: none; }'}</style>
      ) : null}
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          touchAction: 'manipulation',
          filter: edge
            ? `drop-shadow(1px 0 0 ${edge}) drop-shadow(-1px 0 0 ${edge}) drop-shadow(0 1px 0 ${edge}) drop-shadow(0 -1px 0 ${edge})`
            : undefined,
        }}
        onPointerDown={(e) => {
          const canvas = canvasRef.current, rig = rigRef.current;
          if (!canvas || !rig) return;
          const r = canvas.getBoundingClientRect();
          const scale = canvas.width / r.width;
          if (!rig.hits((e.clientX - r.left) * scale, (e.clientY - r.top) * scale)) return;
          const now = performance.now();
          const burrow = !pokeOnly && (burrowOnTap || now - lastTap.current < SECOND_HIT_MS);
          onTapRef.current?.(burrow ? 'burrow' : 'poke');
          if (burrow) { lastTap.current = 0; rig.burrow(); }
          else { lastTap.current = now; rig.poke(); }
          wakeRef.current();
        }}
      />
    </>
  );
}
