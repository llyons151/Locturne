'use dom';

import { useEffect, useRef } from 'react';

import { IDLE_MP4, JUMP_MP4, PLOP_MP4 } from './loc-clip-art';

/**
 * Loc's payoff clips, all drawn on one canvas (user, 2026-11-12: "freezing and cutting out", "two
 * versions of him on screen"): the jump, then the idle round and round from the frame the jump ends,
 * then on Done the plop (he dips, springs up legs tucked, and drops behind the floor's edge), which
 * ends with him gone. Nothing is swapped in or out of the page, so there's
 * never a gap or a second him. Each clip is a grey video (tools/loc-clips/bake.py): his alpha in its
 * top half and his eyes' white in the bottom half, put together here in WebGL.
 *
 * Made for the iPhone's webview, where it lagged (user, 2026-11-11: "super laggy on mobile"):
 * - A frame is drawn when the video has a new one (`requestVideoFrameCallback`), not on every screen
 *   refresh: no frame is sent to the GPU twice.
 * - Nothing seeks in view. A seek stalls an iPhone's video for a few frames, and both `loop` and
 *   "back to 0, play" are seeks. Every clip is played a moment and paused on its first frame at the
 *   start, so its decoder is warm; the idle is two copies that take turns, the one that's just
 *   played going back to its start out of sight; and the next clip starts just before its turn.
 * - Clips hand over on the playing clip's clock, a frame before its end, not on `ended`, which
 *   comes late.
 * - The canvas is the video's size, not the screen's pixels: there's nothing finer to draw.
 *
 * `nonce` 0: nothing drawn. 1: the jump, from its first frame; each one after replays it. `leaving`:
 * the plop. `onLaunch` as he leaves the edge (`launchMs` into the jump).
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
type Slot = 'jump' | 'idleA' | 'idleB' | 'plop';
type FrameMeta = { mediaTime: number };
type FrameVideo = HTMLVideoElement & {
  requestVideoFrameCallback?: (cb: (now: number, meta: FrameMeta) => void) => number;
  cancelVideoFrameCallback?: (id: number) => void;
};

/** Hand over this long before a clip's end: under two frames at 60 a second. */
const HANDOVER_S = 0.03;
/**
 * The next clip starts playing, unseen, this long before the hand-over: an iPhone takes a few frames
 * to get a paused video going, and by the hand-over it's running. It joins a few frames in, where
 * the idle has hardly moved.
 */
const PREROLL_S = 0.1;
/** No frame callback for this long while the video's clock runs: this webview isn't sending them, so poll instead. */
const QUIET_MS = 250;

const VERT = `attribute vec2 p; varying vec2 uv;
void main() { uv = vec2((p.x + 1.0) * 0.5, (1.0 - p.y) * 0.5); gl_Position = vec4(p, 0.0, 1.0); }`;
// Top half: how much of him is here. Bottom half: how white (his eyes), already times that.
const FRAG = `precision mediump float; varying vec2 uv; uniform sampler2D t;
void main() {
  float a = texture2D(t, vec2(uv.x, uv.y * 0.5)).r;
  float w = texture2D(t, vec2(uv.x, 0.5 + uv.y * 0.5)).r;
  gl_FragColor = vec4(vec3(min(w, a)), a);
}`;

function video(b64: string) {
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const v = document.createElement('video') as FrameVideo;
  v.src = URL.createObjectURL(new Blob([bytes], { type: 'video/mp4' }));
  v.muted = true;
  v.playsInline = true;
  v.setAttribute('playsinline', '');
  v.setAttribute('muted', '');
  v.preload = 'auto';
  // In the page, unseen: some webviews won't decode a video that isn't.
  Object.assign(v.style, { position: 'absolute', width: '1px', height: '1px', opacity: '0', pointerEvents: 'none' });
  document.body.appendChild(v);
  v.load();
  return v;
}

class Player {
  private gl: WebGLRenderingContext | null;
  private tex: WebGLTexture | null = null;
  private clips: Record<Slot, FrameVideo>;
  /** The clip being drawn; null before the first jump and once the plop has ended. */
  private on: Slot | null = null;
  /** Bumped at every hand-over: a frame callback from a clip that's been left is dropped. */
  private turn = 0;
  private launched = false;
  private raf = 0;
  private dead = false;
  /** Frame callbacks, where the webview has them and sends them; else a poll of the video's clock. */
  private polling: boolean;
  private lastDrawn = -1;
  private lastFrameAt = 0;
  // Once a second, for `onStats`.
  private stats = { since: 0, frames: 0, ticks: 0, worst: 0, drawMs: 0, waits: 0 };

  constructor(private canvas: HTMLCanvasElement, private calls: Calls) {
    this.clips = { jump: video(JUMP_MP4), idleA: video(IDLE_MP4), idleB: video(IDLE_MP4), plop: video(PLOP_MP4) };
    this.polling = typeof this.clips.jump.requestVideoFrameCallback !== 'function';
    // Its last frame is empty (he's under the floor): nothing left to draw or watch.
    this.clips.plop.addEventListener('ended', () => {
      if (this.on === 'plop') this.on = null;
    });
    // Warmed: played for a moment and put back on its first frame, so its turn starts at once.
    for (const slot of Object.keys(this.clips) as Slot[]) {
      const v = this.clips[slot];
      v.play().then(
        () => {
          if (this.dead || this.on === slot) return;
          v.pause();
          if (v.currentTime > 0) v.currentTime = 0;
        },
        () => {},
      );
    }
    const gl = (this.gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false }));
    if (gl) this.setup(gl);
    this.raf = requestAnimationFrame(this.tick);
  }

  private setup(gl: WebGLRenderingContext) {
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    this.tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.clearColor(0, 0, 0, 0);
  }

  /**
   * `slot` plays from where it waits (its first frame, but for a replayed jump) and is the one drawn
   * from its first new frame on; until then the last frame drawn stays, never a blank. The clip
   * left goes back to its start out of sight, ready for its next turn.
   */
  private go(slot: Slot) {
    this.on = slot;
    this.turn++;
    this.lastDrawn = -1;
    this.lastFrameAt = performance.now();
    const v = this.clips[slot];
    v.play().catch(() => {});
    if (!this.polling) this.watch(slot, this.turn);
    // Every other clip (the one left, one started early for a turn it never got) back to its start.
    for (const other of Object.keys(this.clips) as Slot[]) {
      if (other === slot) continue;
      const old = this.clips[other];
      if (!old.paused) old.pause();
      if (old.currentTime > 0) old.currentTime = 0;
    }
  }

  private watch(slot: Slot, turn: number) {
    const v = this.clips[slot];
    v.requestVideoFrameCallback?.((_now, meta) => {
      if (this.dead || this.polling || turn !== this.turn) return;
      this.draw(v, meta.mediaTime);
      // After the draw: a hand-over inside it starts the next clip's own watch.
      if (turn === this.turn) this.watch(slot, turn);
    });
  }

  /** One new frame of the clip that's on: drawn, then whatever its time sets off. */
  private draw(v: FrameVideo, time: number) {
    const now = performance.now();
    const s = this.stats;
    s.frames++;
    if (this.lastDrawn >= 0) s.worst = Math.max(s.worst, now - this.lastFrameAt);
    this.lastFrameAt = now;
    this.lastDrawn = time;
    const gl = this.gl;
    const c = this.canvas;
    if (gl && v.videoWidth) {
      // The video's own size (its top half is him): the page scales it to the box.
      const w = v.videoWidth;
      const h = v.videoHeight >> 1;
      if (c.width !== w || c.height !== h) {
        c.width = w;
        c.height = h;
      }
      gl.viewport(0, 0, w, h);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.bindTexture(gl.TEXTURE_2D, this.tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, v);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      s.drawMs += performance.now() - now;
    }
    if (this.on === 'jump' && !this.launched && time * 1000 >= this.calls.current.launchMs) {
      this.launched = true;
      this.calls.current.onLaunch();
    }
    // The jump runs into the idle, and the idle into its other copy, a frame before the end.
    const left = v.duration - time;
    const next = this.on === 'idleA' ? 'idleB' : this.on === 'jump' || this.on === 'idleB' ? 'idleA' : null;
    if (!next) return;
    if (left <= HANDOVER_S) this.go(next);
    else if (left <= PREROLL_S && this.clips[next].paused) this.clips[next].play().catch(() => {});
  }

  jump() {
    this.launched = false;
    const v = this.clips.jump;
    // A replay (a tap on him): the one seek in view. The idle's last frame stays up while it lands.
    if (v.currentTime > 0) v.currentTime = 0;
    if (this.on === 'jump') {
      this.lastDrawn = -1;
      v.play().catch(() => {});
    } else this.go('jump');
  }

  /** Done: from whatever he's doing. Its last frame is empty: he's under the floor. */
  plop() {
    if (this.on === null || this.on === 'plop') return;
    this.go('plop');
  }

  /** Every screen refresh: the poll where there are no frame callbacks, and the once-a-second stats. */
  private tick = () => {
    if (this.dead) return;
    this.raf = requestAnimationFrame(this.tick);
    const now = performance.now();
    const s = this.stats;
    s.ticks++;
    const v = this.on ? this.clips[this.on] : null;
    if (v) {
      if (v.readyState < 2) s.waits++;
      const moved = v.currentTime !== this.lastDrawn;
      if (this.polling) {
        if (moved && v.readyState >= 2) this.draw(v, v.currentTime);
      } else if (moved && !v.paused && now - this.lastFrameAt > QUIET_MS && v.currentTime > 0.1) {
        // Its clock runs and no frame has been handed over: draw by the clock from here on.
        this.polling = true;
      }
    }
    if (!s.since) s.since = now;
    const span = now - s.since;
    if (span >= 1000) {
      const say = this.calls.current.onStats;
      if (say && this.on) {
        const per = (n: number) => Math.round((n * 1000) / span);
        const each = s.frames ? (s.drawMs / s.frames).toFixed(1) : '0';
        say(`${this.on} · ${per(s.frames)} frames/s of ${per(s.ticks)} · longest wait ${Math.round(s.worst)} ms · draw ${each} ms · stalls ${s.waits} · ${this.polling ? 'poll' : 'callbacks'}`);
      }
      this.stats = { since: now, frames: 0, ticks: 0, worst: 0, drawMs: 0, waits: 0 };
    }
  };

  dispose() {
    this.dead = true;
    cancelAnimationFrame(this.raf);
    for (const v of Object.values(this.clips)) {
      v.pause();
      URL.revokeObjectURL(v.src);
      v.remove();
    }
  }
}
