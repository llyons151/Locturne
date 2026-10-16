'use dom';

import { useEffect, useRef } from 'react';

import { MoonMist } from './moon-mist';
import { MOON_FROSTED, MOON_GLOW } from './moonrise-art';

/**
 * The payoff's moonrise (user, 2026-10-15, after the "S tier" alarm in docs/design-references):
 * the moon resting at the bottom of the screen lifts off and rises to sit behind Loc's circle,
 * a little bigger than it, with mist falling off it and fading: the week strip's mist dots'
 * fluid (user, 2026-10-15: "that mist that's kind of like falling off the moon"), simulated
 * over the whole screen in moon-mist.ts with the moon as a solid moving through it.
 *
 * A DOM component like Loc's stage: the moon and its glow are the app's own images (so the
 * hand-off from the sky's moon is seamless), and the mist is a WebGL canvas under them. Native
 * hides the sky's moon on `onReady` and brings the page in on `onArrive`.
 */

/** A moon disc in screen points: centre and radius. */
export type Disc = { x: number; y: number; r: number };

/** The timeline, in ms from the first frame. */
const HOLD_MS = 420; // a breath at rest, the mist starting to pour, before it lifts
const RISE_MS = 2300;

/** moon-frosted's disc is 2/3 of the image, moon-glow's half (components/night-sky.tsx). */
const FROST_PAD = 1.5;
const GLOW_PAD = 2;

/** The mist's grid cell, in points: coarse, since the shader blurs it into fog anyway. */
const CELL = 6;
/** Fixed 60 Hz steps, so the mist behaves the same at any frame rate. */
const STEP = 1 / 60;

export default function Moonrise({
  from,
  to,
  glow,
  reduced,
  onReady,
  onArrive,
}: {
  /** The sky's resting moon, where the rise starts. */
  from: Disc;
  /** Where it ends: behind Loc. */
  to: Disc;
  /** How visible the sky's glow was at the start (it fades with the moon's sink). */
  glow: number;
  reduced: boolean;
  /** The first frame is up: native can hide the sky's own moon. A native action on iOS. */
  onReady: () => Promise<void> | void;
  /** The moon is in place behind Loc. A native action on iOS. */
  onArrive: () => Promise<void> | void;
  dom?: import('expo/dom').DOMProps;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const moonRef = useRef<HTMLImageElement>(null);
  const glowRef = useRef<HTMLImageElement>(null);
  // Props come over an async bridge and can change (a rotation, a late layout): read the latest.
  const latest = useRef({ from, to, glow, onReady, onArrive });
  useEffect(() => {
    latest.current = { from, to, glow, onReady, onArrive };
  });

  useEffect(() => {
    document.documentElement.style.background = 'transparent';
    document.body.style.background = 'transparent';
    document.body.style.margin = '0';
    document.body.style.overflow = 'hidden';

    const canvas = canvasRef.current!;
    const moon = moonRef.current!;
    const halo = glowRef.current!;
    const mist = new MoonMist(Math.ceil(window.innerWidth / CELL) + 1, Math.ceil(window.innerHeight / CELL) + 1);
    const view = createMistView(canvas, mist.nx, mist.ny);
    let frame = 0;
    let start = -1;
    let last = -1;
    let leftover = 0;
    let prev: { x: number; y: number; r: number } | null = null;
    let ready = false;
    let arrived = false;
    let gone = false;

    const draw = (now: number) => {
      if (gone) return;
      frame = requestAnimationFrame(draw);
      if (!moon.complete || !halo.complete) return;
      if (start < 0) start = last = now;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const t = reduced ? HOLD_MS + RISE_MS + (now - start) : now - start;
      const { from: a, to: b, glow: glowStart } = latest.current;

      // Lift: a slow start, most of the travel in the middle, a long glide in. No overshoot.
      const k = clamp01((t - HOLD_MS) / RISE_MS);
      const e = riseEase(k);
      // A few points' sink while it gathers, as if pushing off.
      const dip = Math.sin(Math.PI * clamp01(t / HOLD_MS)) * 5 * (1 - e);
      const x = lerp(a.x, b.x, e);
      const y = lerp(a.y, b.y, e) + dip;
      const r = lerp(a.r, b.r, e);

      place(moon, x, y, 2 * r * FROST_PAD);
      place(halo, x, y, 2 * r * GLOW_PAD);
      // The moon's own glow, back to full as it comes up (it starts dimmer if the sky had sunk it).
      halo.style.opacity = String(lerp(glowStart, 1, e));

      // The mist, in fixed steps, with the moon's velocity so it drags the air as it rises. A
      // slow frame's steps walk the moon there in even strides, rather than jumping it.
      const p0 = prev ?? { x, y, r };
      const vx = dt > 0 ? (x - p0.x) / dt / CELL : 0;
      const vy = dt > 0 ? (y - p0.y) / dt / CELL : 0;
      prev = { x, y, r };
      leftover += dt;
      const steps = Math.min(2, Math.floor(leftover / STEP));
      for (let i = 1; i <= steps; i++) {
        const f = i / steps;
        mist.step(STEP, { x: lerp(p0.x, x, f) / CELL, y: lerp(p0.y, y, f) / CELL, r: lerp(p0.r, r, f) / CELL, vx, vy });
      }
      leftover = steps === 2 ? 0 : leftover - steps * STEP;

      const after = (t - HOLD_MS - RISE_MS) / 1000; // seconds since arriving
      if (!arrived && after >= -0.12) {
        arrived = true;
        // It lands, and a breath of mist rolls off the whole rim.
        if (!reduced) mist.puff();
        void latest.current.onArrive();
      }
      view?.draw(mist.density, now / 1000);

      if (!ready) {
        ready = true;
        // After this frame reaches the screen, so the two moons never both show or both go.
        requestAnimationFrame(() => void latest.current.onReady());
      }
    };
    frame = requestAnimationFrame(draw);
    return () => {
      gone = true;
      cancelAnimationFrame(frame);
      view?.dispose();
    };
  }, [reduced]);

  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <img ref={glowRef} src={MOON_GLOW} alt="" style={IMG} />
      {/* Under the moon: the mist comes off its edge, and the disc covers where it's solid. */}
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
      <img ref={moonRef} src={MOON_FROSTED} alt="" style={IMG} />
    </div>
  );
}

const IMG = {
  position: 'absolute',
  left: 0,
  top: 0,
  width: 100,
  height: 100,
  transformOrigin: '0 0',
  willChange: 'transform',
  userSelect: 'none',
} as const;

/** An image `size` points across, centred on (x, y). */
function place(img: HTMLImageElement, x: number, y: number, size: number) {
  img.style.transform = `translate3d(${x - size / 2}px, ${y - size / 2}px, 0) scale(${size / 100})`;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** cubic-bezier(0.62, 0, 0.18, 1): heavy to lift, then a long glide. No overshoot. */
function riseEase(x: number) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const [x1, y1, x2, y2] = [0.62, 0, 0.18, 1];
  let t = x;
  for (let i = 0; i < 8; i++) {
    const cx = 3 * x1 * t * (1 - t) ** 2 + 3 * x2 * t * t * (1 - t) + t ** 3 - x;
    const dx = 3 * x1 * (1 - t) ** 2 + 6 * (x2 - x1) * t * (1 - t) + 3 * (1 - x2) * t * t;
    if (Math.abs(cx) < 1e-5 || dx === 0) break;
    t -= cx / dx;
  }
  return 3 * y1 * t * (1 - t) ** 2 + 3 * y2 * t * t * (1 - t) + t ** 3;
}

/**
 * Draws the mist as the dots do (MistDotModule.swift's shader): the density, uploaded as a
 * texture each frame, pushed through a slow drifting warp and a 9-tap blur so it reads as fog,
 * given a fine grain, in the frosted moon's blues. Here over open sky, so thin mist is
 * see-through rather than the jar's dark. Null where WebGL2 isn't there: the moon still rises.
 */
function createMistView(canvas: HTMLCanvasElement, nx: number, ny: number) {
  const gl = canvas.getContext('webgl2', { premultipliedAlpha: true, alpha: true, antialias: false });
  if (!gl) return null;
  const program = link(gl, VERTEX, FRAGMENT);
  if (!program) return null;
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'aPos');
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16F, nx, ny, 0, gl.RED, gl.FLOAT, null);
  const u = (name: string) => gl.getUniformLocation(program, name);
  const uniforms = { res: u('uRes'), dpr: u('uDpr'), time: u('uTime'), cell: u('uCell'), grid: u('uGrid'), mist: u('uMist') };
  // Fog is soft: a point and a half per pixel is plenty.
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

  return {
    draw(density: Float32Array, time: number) {
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, nx, ny, gl.RED, gl.FLOAT, density);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      gl.uniform2f(uniforms.res, w, h);
      gl.uniform1f(uniforms.dpr, dpr);
      gl.uniform1f(uniforms.time, time % 1000);
      gl.uniform1f(uniforms.cell, CELL);
      gl.uniform2f(uniforms.grid, nx, ny);
      gl.uniform1i(uniforms.mist, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    dispose() {
      gl.deleteTexture(texture);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}

function link(gl: WebGL2RenderingContext, vs: string, fs: string) {
  const shader = (type: number, source: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, source);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.warn('moonrise shader', gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  };
  const v = shader(gl.VERTEX_SHADER, vs);
  const f = shader(gl.FRAGMENT_SHADER, fs);
  if (!v || !f) return null;
  const p = gl.createProgram()!;
  gl.attachShader(p, v);
  gl.attachShader(p, f);
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    console.warn('moonrise program', gl.getProgramInfoLog(p));
    return null;
  }
  return p;
}

const VERTEX = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FRAGMENT = `#version 300 es
precision highp float;
uniform vec2 uRes, uGrid;
uniform float uDpr, uTime, uCell;
uniform sampler2D uMist;
out vec4 outColor;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = vec2(1.6 * p.x + 1.2 * p.y, -1.2 * p.x + 1.6 * p.y);
    a *= 0.5;
  }
  return v / 0.9375;
}
float mistAt(vec2 c) { return texture(uMist, c / uGrid).r; }

void main() {
  const vec3 C1 = vec3(0.110, 0.200, 0.430); // deep mist
  const vec3 C2 = vec3(0.443, 0.576, 0.847); // the frosted moon, #7193D8
  const vec3 C3 = vec3(0.800, 0.855, 0.965); // its pale heart
  float T = uTime;
  // Grid units, y down, like the simulation.
  vec2 g = vec2(gl_FragCoord.x, uRes.y * uDpr - gl_FragCoord.y) / uDpr / uCell;

  vec2 w = vec2(fbm(g * 0.18 + vec2(T * 0.20, 0.0)), fbm(g * 0.18 + vec2(5.2, -T * 0.17))) - 0.5;
  vec2 c = g + w * 3.2;
  const float R = 2.4;
  float m = 0.2 * mistAt(c);
  for (int k = 0; k < 8; k++) {
    float a = float(k) * 0.785398;
    m += 0.1 * mistAt(c + vec2(cos(a), sin(a)) * R);
  }
  if (m < 0.004) { outColor = vec4(0.0); return; }
  m *= 0.8 + 0.4 * fbm(g * 0.45 + vec2(-T * 0.3, T * 0.12));

  vec3 col = mix(C1, C2, smoothstep(0.04, 0.5, m));
  col = mix(col, C3, smoothstep(0.5, 1.0, m) * 0.65);
  float alpha = smoothstep(0.0, 0.4, m) * 0.95;
  // Dither, so the thin blues don't band.
  col += (hash(gl_FragCoord.xy + fract(T * 7.0)) - 0.5) / 128.0;
  outColor = vec4(clamp(col, 0.0, 1.0) * alpha, alpha);
}`;
