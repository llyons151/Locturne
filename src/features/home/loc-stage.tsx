'use dom';

import { IS_DOM } from 'expo/dom';
import { useEffect, useRef } from 'react';

import { LocRig, type LocMood } from './loc-rig';

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
  onCue,
}: {
  mood: LocMood;
  share: number;
  present: boolean;
  /** What just happened to him (a poke, popping back up...), for his speech bubble. A native action on iOS. */
  onCue?: (cue: 'poke' | 'angry' | 'hello' | 'hide') => void;
  dom?: import('expo/dom').DOMProps;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rigRef = useRef<LocRig | null>(null);
  // The mood the rig starts in; later changes go through `setMood`.
  const moodRef = useRef(mood);
  const shareRef = useRef(share);
  const presentRef = useRef(present);
  const lastTap = useRef(0);
  const onCueRef = useRef(onCue);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const rig = new LocRig(canvas, moodRef.current, reduced);
    rig.setShare(shareRef.current);
    rig.onCue = (cue) => onCueRef.current?.(cue);
    rigRef.current = rig;
    const arrive = presentRef.current ? setTimeout(() => rig.setPresent(true), ARRIVE_DELAY_MS) : undefined;
    const size = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    };
    size();
    const observer = new ResizeObserver(size);
    observer.observe(canvas);
    let frame = 0;
    let last = performance.now();
    let paused = false;
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!paused) rig.step(dt);
      frame = requestAnimationFrame(tick);
    };
    // Dev only: freeze his clock and step it by hand, to review moves frame by frame.
    if (process.env.NODE_ENV !== 'production') {
      (window as unknown as { __locDev?: object }).__locDev = {
        rig,
        advance: (ms: number) => { paused = true; const n = Math.ceil(ms / (1000 / 60)); for (let i = 0; i < n; i++) rig.step(ms / 1000 / n); },
        resume: () => { paused = false; },
      };
    }
    frame = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(frame); clearTimeout(arrive); observer.disconnect(); rigRef.current = null; };
  }, []);

  useEffect(() => {
    presentRef.current = present;
    const rig = rigRef.current;
    if (!rig) return;
    if (!present) { rig.setPresent(false); return; }
    const t = setTimeout(() => rig.setPresent(true), ARRIVE_DELAY_MS);
    return () => clearTimeout(t);
  }, [present]);

  useEffect(() => {
    shareRef.current = share;
    rigRef.current?.setShare(share);
  }, [share]);

  useEffect(() => {
    onCueRef.current = onCue;
  }, [onCue]);

  useEffect(() => {
    moodRef.current = mood;
    rigRef.current?.setMood(mood);
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
          if (now - lastTap.current < SECOND_HIT_MS) { lastTap.current = 0; rig.burrow(); }
          else { lastTap.current = now; rig.poke(); }
        }}
      />
    </>
  );
}
