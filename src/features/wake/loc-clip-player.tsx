'use dom';

import { useEffect, useRef } from 'react';

import { IDLE_MP4, JUMP_MP4, PLOP_MP4 } from './loc-clip-art';

/**
 * Loc's payoff clips, all drawn on one canvas (user, 2026-11-12: "freezing and cutting out", "two
 * versions of him on screen"): the jump, then the idle round and round from the frame the jump ends,
 * then on Done the plop (the jump's landing run backwards: he dips and springs up, legs tucked), held
 * on its last frame while loc-clip.tsx drops the canvas through the floor. Nothing is swapped in or out of the page, so there's
 * never a gap or a second him. Each clip is a grey video (tools/loc-clips/bake.py): his alpha in its
 * top half and his eyes' white in the bottom half, put together here in WebGL.
 *
 * `nonce` 0: nothing drawn. 1: the jump, from its first frame; each one after replays it. `leaving`:
 * the plop. `onLaunch` as he leaves the edge (`launchMs` into the jump).
 */
export default function LocClipPlayer({
  nonce,
  leaving,
  launchMs,
  onLaunch,
}: {
  nonce: number;
  leaving: boolean;
  launchMs: number;
  onLaunch: () => Promise<void> | void;
  dom?: import('expo/dom').DOMProps;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const player = useRef<Player | null>(null);
  const calls = useRef({ onLaunch, launchMs });
  useEffect(() => {
    calls.current = { onLaunch, launchMs };
  }, [onLaunch, launchMs]);

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

type Calls = { current: { onLaunch: () => unknown; launchMs: number } };
type Phase = 'none' | 'jump' | 'idle' | 'plop';

const VERT = `attribute vec2 p; varying vec2 uv;
void main() { uv = vec2((p.x + 1.0) * 0.5, (1.0 - p.y) * 0.5); gl_Position = vec4(p, 0.0, 1.0); }`;
// Top half: how much of him is here. Bottom half: how white (his eyes), already times that.
const FRAG = `precision mediump float; varying vec2 uv; uniform sampler2D t;
void main() {
  float a = texture2D(t, vec2(uv.x, uv.y * 0.5)).r;
  float w = texture2D(t, vec2(uv.x, 0.5 + uv.y * 0.5)).r;
  gl_FragColor = vec4(vec3(min(w, a)), a);
}`;

function video(b64: string, loop: boolean) {
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const v = document.createElement('video');
  v.src = URL.createObjectURL(new Blob([bytes], { type: 'video/mp4' }));
  v.muted = true;
  v.loop = loop;
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
  private clips: Record<'jump' | 'idle' | 'plop', HTMLVideoElement>;
  private phase: Phase = 'none';
  private launched = false;
  private raf = 0;
  private dead = false;

  constructor(private canvas: HTMLCanvasElement, private calls: Calls) {
    this.clips = { jump: video(JUMP_MP4, false), idle: video(IDLE_MP4, true), plop: video(PLOP_MP4, false) };
    // The jump ends: the idle takes over on the same frame, from its first.
    this.clips.jump.addEventListener('ended', () => {
      if (this.phase === 'jump') this.go('idle');
    });
    const gl = (this.gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false }));
    if (gl) this.setup(gl);
    this.raf = requestAnimationFrame(this.frame);
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
  }

  private go(phase: 'jump' | 'idle' | 'plop') {
    const prev = this.phase;
    this.phase = phase;
    const v = this.clips[phase];
    v.currentTime = 0;
    v.play().catch(() => {});
    if (prev !== 'none' && prev !== phase) this.clips[prev].pause();
  }

  jump() {
    this.launched = false;
    this.go('jump');
  }

  /** Done: from whatever he's doing. Its last frame (up, legs tucked) stays drawn once it ends. */
  plop() {
    if (this.phase === 'none' || this.phase === 'plop') return;
    this.go('plop');
  }

  private frame = () => {
    if (this.dead) return;
    this.raf = requestAnimationFrame(this.frame);
    const gl = this.gl;
    const c = this.canvas;
    const w = Math.round(c.clientWidth * devicePixelRatio);
    const h = Math.round(c.clientHeight * devicePixelRatio);
    if (c.width !== w || c.height !== h) {
      c.width = w;
      c.height = h;
    }
    if (this.phase === 'jump' && !this.launched && this.clips.jump.currentTime * 1000 >= this.calls.current.launchMs) {
      this.launched = true;
      this.calls.current.onLaunch();
    }
    if (!gl) return;
    gl.viewport(0, 0, w, h);
    if (this.phase === 'none') {
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      return;
    }
    const v = this.clips[this.phase];
    // Not ready yet (it's only just been asked to play): drawing nothing this frame leaves the last
    // frame drawn on screen, never a blank one.
    if (v.readyState < 2) return;
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, v);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
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
