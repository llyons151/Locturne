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
  rim,
  knock,
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
  /** The screen's edge, for the ultra zoomies (rim.ts); left out, he never goes round it. */
  rim?: Rim;
  /** The knock lab's live tuning; inside the webview this module is a copy, so it comes as a prop. */
  knock?: NavKnockTune;
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
  const waryRef = useRef(wary);
  const lastTap = useRef(0);
  const onCueRef = useRef(onCue);
  const onTapRef = useRef(onTap);
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
    rig.onCue = (cue) => onCueRef.current?.(cue);
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
      const dpr = Math.min(2, window.devicePixelRatio || 1);
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
    shareRef.current = share;
    rigRef.current?.setShare(share);
    wakeRef.current();
  }, [share]);

  useEffect(() => {
    onCueRef.current = onCue;
    onTapRef.current = onTap;
    onBurrowRef.current = onBurrow;
  }, [onCue, onTap, onBurrow]);

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
        style={{ display: 'block', width: '100%', height: '100%', touchAction: 'manipulation' }}
        onPointerDown={(e) => {
          const canvas = canvasRef.current, rig = rigRef.current;
          if (!canvas || !rig) return;
          const r = canvas.getBoundingClientRect();
          const scale = canvas.width / r.width;
          if (!rig.hits((e.clientX - r.left) * scale, (e.clientY - r.top) * scale)) return;
          const now = performance.now();
          const burrow = now - lastTap.current < SECOND_HIT_MS;
          onTapRef.current?.(burrow ? 'burrow' : 'poke');
          if (burrow) { lastTap.current = 0; rig.burrow(); }
          else { lastTap.current = now; rig.poke(); }
          wakeRef.current();
        }}
      />
    </>
  );
}
