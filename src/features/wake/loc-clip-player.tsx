'use dom';

import { useEffect, useRef } from 'react';

import { CLIP_FRAME, IDLE_SHAPES, JUMP_SHAPES, PLOP_SHAPES } from './loc-clip-art';

/**
 * Loc's payoff clips, drawn on one canvas: the jump, then the idle round and round from the frame the
 * jump ends, then on Done the plop (he dips, springs up legs tucked, and drops behind the floor's
 * edge), which ends with him gone. Nothing is swapped in or out of the page, so there's never a gap
 * or a second him (user, 2026-11-12: "freezing and cutting out", "two versions of him on screen").
 *
 * Drawn from outlines, not played as video (user, 2026-11-11: on a phone in Low Power Mode and
 * screen recording the videos stopped dead, "0 frames"): every frame of the clips is traced into
 * polygons, his shape and the white of his eyes (tools/loc-clips/outlines.py), and filled here by this
 * player's own clock. No video, so nothing iOS can hold back or stall; sharp at any size; and a
 * frame is exactly where the clock says. In Low Power Mode iOS draws web pages 30 times a second,
 * not 60: he moves at the same speed, on every other frame.
 *
 * `nonce` 0: nothing drawn. 1: the jump, from its first frame. Each one after (a tap on him) runs
 * him back down the way he came, the jump backwards, then jumps again (user, 2026-11-11: "it needs
 * to reverse back into that original state before it replays"). `leaving`: the plop. `onLaunch` as
 * he leaves the edge (`launchMs` into the jump).
 */
export default function LocClipPlayer({
  nonce,
  leaving,
  launchMs,
  onLaunch,
  onStats,
}: {
  nonce: number;
  leaving: boolean;
  launchMs: number;
  onLaunch: () => Promise<void> | void;
  /** Preview builds: a line of how it's playing (frames a second, the longest wait for one), once a second. */
  onStats?: (line: string) => Promise<void> | void;
  dom?: import('expo/dom').DOMProps;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const player = useRef<Player | null>(null);
  const calls = useRef({ onLaunch, launchMs, onStats });
  useEffect(() => {
    calls.current = { onLaunch, launchMs, onStats };
  }, [onLaunch, launchMs, onStats]);

  useEffect(() => {
    if (!canvas.current) return;
    const p = new Player(canvas.current, calls);
    player.current = p;
    return () => p.dispose();
  }, []);
  useEffect(() => {
    if (nonce > 0) player.current?.jump();
  }, [nonce]);
  useEffect(() => {
    if (leaving) player.current?.plop();
  }, [leaving]);

  return <canvas ref={canvas} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />;
}

type Calls = { current: { onLaunch: () => unknown; launchMs: number; onStats?: (line: string) => unknown } };
type Name = 'jump' | 'idle' | 'plop';
/** `back`: the jump run backwards, down to where it starts, before a replay. */
type Phase = Name | 'back';

/** How many times the jump's speed he goes back down at before a replay. */
const BACK_RATE = 2.6;
const FRAME_MS = 1000 / CLIP_FRAME.fps;

/**
 * A clip's frames (outlines.py's stream of varints): each a pair of paths, him and his eyes' white,
 * made when first drawn and kept.
 */
class Clip {
  private bytes: Uint8Array;
  /** Where each frame starts in `bytes`. */
  private starts: number[] = [];
  private paths: ([Path2D, Path2D] | undefined)[] = [];
  readonly frames: number;
  readonly ms: number;

  constructor(b64: string) {
    const text = atob(b64);
    const bytes = (this.bytes = new Uint8Array(text.length));
    for (let i = 0; i < text.length; i++) bytes[i] = text.charCodeAt(i);
    const at = { i: 0 };
    this.frames = this.read(at);
    // One pass over it to find the frames; nothing is built.
    for (let f = 0; f < this.frames; f++) {
      this.starts.push(at.i);
      for (let part = 0; part < 2; part++) {
        for (let polys = this.read(at); polys > 0; polys--) {
          for (let n = this.read(at) * 2; n > 0; n--) this.read(at);
        }
      }
    }
    this.ms = this.frames * FRAME_MS;
  }

  private read(at: { i: number }) {
    let n = 0;
    let shift = 0;
    for (;;) {
      const b = this.bytes[at.i++];
      n |= (b & 0x7f) << shift;
      if (b < 0x80) return n;
      shift += 7;
    }
  }

  frame(f: number): [Path2D, Path2D] {
    const made = this.paths[f];
    if (made) return made;
    const at = { i: this.starts[f] };
    const part = () => {
      const path = new Path2D();
      for (let polys = this.read(at); polys > 0; polys--) {
        const points = this.read(at);
        let x = this.read(at);
        let y = this.read(at);
        path.moveTo(x, y);
        for (let k = 1; k < points; k++) {
          const dx = this.read(at);
          const dy = this.read(at);
          x += (dx >>> 1) ^ -(dx & 1);
          y += (dy >>> 1) ^ -(dy & 1);
          path.lineTo(x, y);
        }
        path.closePath();
      }
      return path;
    };
    const him = part();
    return (this.paths[f] = [him, part()]);
  }
}

class Player {
  private ctx: CanvasRenderingContext2D | null;
  private clips: Record<Name, Clip>;
  private phase: Phase | null = null;
  /** When the phase began, on `performance.now()`'s clock. */
  private began = 0;
  /** `back`: the jump's frame he goes back down from. */
  private backFrom = 0;
  private launched = false;
  /** What's on the canvas: a clip's frame, so the same one is never drawn twice. */
  private shown: { clip: Name; frame: number } | null = null;
  private raf = 0;
  private dead = false;
  private lastDrawAt = 0;
  // Once a second, for `onStats`.
  private stats = { since: 0, frames: 0, ticks: 0, worst: 0, drawMs: 0 };

  constructor(private canvas: HTMLCanvasElement, private calls: Calls) {
    this.clips = { jump: new Clip(JUMP_SHAPES), idle: new Clip(IDLE_SHAPES), plop: new Clip(PLOP_SHAPES) };
    this.ctx = canvas.getContext('2d');
    // The jump's paths, made a few at a time before he's asked for: its first second never waits on one.
    let warm = 0;
    const next = () => {
      if (this.dead || warm >= this.clips.jump.frames) return;
      for (const until = Math.min(this.clips.jump.frames, warm + 12); warm < until; warm++) this.clips.jump.frame(warm);
      setTimeout(next, 16);
    };
    setTimeout(next, 50);
  }

  private start(phase: Phase) {
    this.phase = phase;
    this.began = performance.now();
    if (!this.raf) this.raf = requestAnimationFrame(this.tick);
  }

  jump() {
    // Nothing of him up yet: straight into the jump. Else back down the way he came first.
    if (this.phase === null || this.phase === 'plop') {
      this.launched = false;
      this.start('jump');
      return;
    }
    if (this.phase === 'back') return;
    // From the idle: the jump's last frame, which the idle starts from. Mid-jump: from where he is.
    this.backFrom = this.phase === 'jump' && this.shown?.clip === 'jump' ? this.shown.frame : this.clips.jump.frames - 1;
    this.start('back');
  }

  /** Done: from whatever he's doing. Its last frame is empty: he's under the floor. */
  plop() {
    if (this.phase === null || this.phase === 'plop') return;
    this.start('plop');
  }

  private tick = () => {
    this.raf = 0;
    if (this.dead || this.phase === null) return;
    this.raf = requestAnimationFrame(this.tick);
    const now = performance.now();
    const s = this.stats;
    s.ticks++;
    let at = now - this.began;
    // A phase that's run out hands over on the same tick, carrying what's left of it.
    if (this.phase === 'back' && at * BACK_RATE >= this.backFrom * FRAME_MS) {
      at -= (this.backFrom * FRAME_MS) / BACK_RATE;
      this.launched = false;
      this.phase = 'jump';
      this.began = now - at;
    }
    if (this.phase === 'jump' && at >= this.clips.jump.ms) {
      at -= this.clips.jump.ms;
      this.phase = 'idle';
      this.began = now - at;
    }
    if (this.phase === 'plop' && at >= this.clips.plop.ms) {
      // Gone: the canvas is cleared and nothing more is drawn.
      this.phase = null;
      this.shown = null;
      const c = this.canvas;
      this.ctx?.clearRect(0, 0, c.width, c.height);
      cancelAnimationFrame(this.raf);
      this.raf = 0;
      return;
    }
    if (this.phase === 'jump' && !this.launched && at >= this.calls.current.launchMs) {
      this.launched = true;
      this.calls.current.onLaunch();
    }
    const clip: Name = this.phase === 'back' ? 'jump' : this.phase;
    const frames = this.clips[clip].frames;
    const frame =
      this.phase === 'back'
        ? Math.max(0, this.backFrom - Math.floor((at * BACK_RATE) / FRAME_MS))
        : this.phase === 'idle'
          ? Math.floor(at / FRAME_MS) % frames
          : Math.min(frames - 1, Math.floor(at / FRAME_MS));
    if (this.shown?.clip !== clip || this.shown.frame !== frame) {
      this.draw(clip, frame);
      const done = performance.now();
      s.frames++;
      s.drawMs += done - now;
      if (this.lastDrawAt) s.worst = Math.max(s.worst, now - this.lastDrawAt);
      this.lastDrawAt = now;
    }
    if (!s.since) s.since = now;
    const span = now - s.since;
    if (span >= 1000) {
      const say = this.calls.current.onStats;
      if (say) {
        const per = (n: number) => Math.round((n * 1000) / span);
        const each = s.frames ? (s.drawMs / s.frames).toFixed(1) : '0';
        say(`${this.phase} · ${per(s.frames)} frames/s of ${per(s.ticks)} · longest wait ${Math.round(s.worst)} ms · draw ${each} ms`);
      }
      this.stats = { since: now, frames: 0, ticks: 0, worst: 0, drawMs: 0 };
    }
  };

  private draw(clip: Name, frame: number) {
    this.shown = { clip, frame };
    const ctx = this.ctx;
    const c = this.canvas;
    if (!ctx) return;
    // The screen's own pixels: the outlines are sharp at any size.
    const w = Math.round(c.clientWidth * devicePixelRatio);
    const h = Math.round(c.clientHeight * devicePixelRatio);
    if (!w || !h) return;
    if (c.width !== w || c.height !== h) {
      c.width = w;
      c.height = h;
    }
    const [him, eyes] = this.clips[clip].frame(frame);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.setTransform(w / CLIP_FRAME.w, 0, 0, h / CLIP_FRAME.h, 0, 0);
    ctx.fillStyle = '#000000';
    ctx.fill(him, 'evenodd');
    ctx.fillStyle = '#FFFFFF';
    ctx.fill(eyes, 'evenodd');
  }

  dispose() {
    this.dead = true;
    cancelAnimationFrame(this.raf);
  }
}
