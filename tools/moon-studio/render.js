// How a moon looks: Home's sky panel with its moon, halo, rings and twin, the live sky and the Sleep orb
// (both shaders, as in the app), and the collection tile's icon. The phone math and shaders are the moon
// lab's (tools/moon-lab/index.html), which match night-sky.tsx, MoonSkyModule.swift and MoonOrbModule.swift.

export const W = 320, H = 693;
const S = W / 390;
export const STRIP = Math.round((14 + 52 + 34) * S);
export const PANEL = H - STRIP;
// risingMoon() in night-sky.tsx: 0.9 of the width, 36% of it above the panel's edge.
export const BASE = W * 0.9;
const FROST_PAD = 1.5, GLOW_PAD = 2;
export const SHOWS = 0.36;

export const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
export const toHex = (c) => '#' + c.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('').toUpperCase();
const lerp = (a, b, t) => a + (b - a) * t;
export const mix = (a, b, t) => a.map((v, i) => lerp(v, b[i], t));
export function ramp(stops, t) {
  const cs = stops.map(hex);
  if (cs.length === 1) return cs[0];
  const x = Math.min(Math.max(t, 0), 1) * (cs.length - 1);
  const i = Math.min(Math.floor(x), cs.length - 2), f = x - i;
  return mix(cs[i], cs[i + 1], f);
}

/** The Sleep orb's four colours: given, or taken from the moon's sky, halo and moon (as bake.py does). */
export function orbColours(m) {
  if (m.orb) return m.orb.map(hex);
  const sky = m.sky.map(hex), moon = m.moon.map(hex);
  return [mix(sky[1], [0, 0, 0], 0.55), sky[sky.length >= 4 ? sky.length - 2 : sky.length - 1], hex(m.glow), mix(moon[moon.length - 1], [255, 255, 255], 0.5)];
}
const skyColours = (m) => { const c = m.sky.map((h) => hex(h).map((v) => v / 255)); while (c.length < 4) c.push(c[c.length - 1]); return c.slice(0, 4); };

const loadImage = (src) => new Promise((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = bad; i.src = src; });

/** The darkest and brightest luminance in an image (opaque pixels only), so a ramp spans exactly its range. */
async function lumRange(src) {
  const im = await loadImage(src);
  const c = document.createElement('canvas');
  c.width = 240; c.height = Math.round((240 * im.naturalHeight) / im.naturalWidth);
  const g = c.getContext('2d');
  g.drawImage(im, 0, 0, c.width, c.height);
  const p = g.getImageData(0, 0, c.width, c.height).data;
  let lo = 1, hi = 0;
  for (let i = 0; i < p.length; i += 4) {
    if (p[i + 3] < 128) continue;
    const l = (0.2126 * p[i] + 0.7152 * p[i + 1] + 0.0722 * p[i + 2]) / 255;
    if (l < lo) lo = l; if (l > hi) hi = l;
  }
  return { lo, hi };
}

// ——— Gradient-map filters: one SVG filter per distinct ramp, kept in a shared <defs>. ———
let RANGES = null;
const filters = new Map();
let defsEl = null;
function filterDef(id, stops, { lo, hi }) {
  const n = 160, R = [], G = [], B = [];
  for (let i = 0; i < n; i++) {
    const [r, g, b] = ramp(stops, (i / (n - 1) - lo) / (hi - lo || 1));
    R.push((r / 255).toFixed(4)); G.push((g / 255).toFixed(4)); B.push((b / 255).toFixed(4));
  }
  const l = '0.2126 0.7152 0.0722 0 0';
  return `<filter id="${id}" color-interpolation-filters="sRGB" x="0" y="0" width="100%" height="100%">
    <feColorMatrix type="matrix" values="${l} ${l} ${l} 0 0 0 1 0"/>
    <feComponentTransfer><feFuncR type="table" tableValues="${R.join(' ')}"/><feFuncG type="table" tableValues="${G.join(' ')}"/>
      <feFuncB type="table" tableValues="${B.join(' ')}"/></feComponentTransfer></filter>`;
}
/**
 * The filter id for a ramp over the sky or the moon image, made the first time it's asked for. The
 * least recently used go past FILTER_CAP, so dragging a colour doesn't pile up thousands.
 */
const FILTER_CAP = 400;
let filterN = 0;
function gm(kind, stops) {
  const key = `${kind}:${stops.join(',')}`;
  let id = filters.get(key);
  if (id) {
    filters.delete(key);
    filters.set(key, id);
    return id;
  }
  id = `gm${filterN++}`;
  filters.set(key, id);
  const holder = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  holder.innerHTML = filterDef(id, stops, RANGES[kind]);
  defsEl.appendChild(holder.firstElementChild);
  while (filters.size > FILTER_CAP) {
    const [oldKey, oldId] = filters.entries().next().value;
    filters.delete(oldKey);
    document.getElementById(oldId)?.remove();
  }
  return id;
}

// ——— Shaders. ———
const VERT = 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }';
const NOISE = `float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y); }`;
const ORB_FRAG = `precision highp float;
uniform vec2 size; uniform float time; uniform vec3 C0, C1, C2, C3;
${NOISE}
float fbm(vec2 p){ float v = 0.0, a = 0.5; mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 4; i++) { v += a * noise(p); p = m * p; a *= 0.5; } return v / 0.9375; }
void main(){
  const float warp = 1.1, swirl = 0.15, core = 0.25, glass = 0.55, ribbons = 0.2, spec = 0.8, shade = 0.5;
  float T = time;
  vec2 frag = gl_FragCoord.xy;
  vec2 p = frag / size * 2.0 - 1.0;
  float r = length(p);
  float aa = 2.0 / (size.x * 0.5);
  float mask = 1.0 - smoothstep(1.0 - aa, 1.0, r);
  if (mask <= 0.0) { gl_FragColor = vec4(0.0); return; }
  vec2 q = p;
  float z = sqrt(max(0.0, 1.0 - min(dot(q, q), 1.0)));
  vec3 n = vec3(q, z);
  vec2 uv = q * (1.0 - 0.38 * (1.0 - z));
  float a = swirl * (1.0 - r) * 1.6 + T * 0.12 * swirl;
  uv = mat2(cos(a), -sin(a), sin(a), cos(a)) * uv;
  uv *= 1.35;
  vec2 w1 = vec2(fbm(uv * 1.1 + vec2(0.0, T * 0.13)), fbm(uv * 1.1 + vec2(5.2, 1.3) - T * 0.11));
  vec2 w2 = vec2(fbm(uv + warp * 2.0 * w1 + vec2(1.7, 9.2) + T * 0.09), fbm(uv + warp * 2.0 * w1 + vec2(8.3, 2.8) - T * 0.07));
  float f = fbm(uv + warp * 2.0 * w2);
  vec3 col = mix(C0, C1, smoothstep(0.25, 0.75, w2.x));
  col = mix(col, C2, smoothstep(0.4, 0.85, f));
  col = mix(col, C3, smoothstep(0.62, 0.95, w1.y * 0.6 + f * 0.5) * 0.85);
  float layer = 0.5 + 0.5 * sin(6.2832 * (f * 2.2 + w2.y * 0.7 + T * 0.03));
  col *= mix(1.0, 0.8 + 0.32 * layer, ribbons);
  col += ribbons * 0.2 * pow(layer, 10.0) * (C3 * 0.6 + 0.4);
  col *= mix(1.0, smoothstep(0.05, 0.92, r), core);
  vec3 L = normalize(vec3(-0.45, 0.6, 0.75));
  col *= mix(1.0, 0.55 + 0.6 * max(dot(n, L), 0.0), shade);
  col += glass * pow(1.0 - z, 2.6) * 0.85;
  vec3 Hv = normalize(L + vec3(0.0, 0.0, 1.0));
  col += spec * 0.9 * pow(max(dot(n, Hv), 0.0), 90.0);
  float edge = smoothstep(0.84, 0.965, r) * (1.0 - smoothstep(0.965, 1.0, r));
  col += spec * 0.28 * edge * smoothstep(-0.1, 0.9, q.y * 0.9 - q.x * 0.4);
  col += (hash(frag + fract(T * 7.0)) - 0.5) / 128.0;
  col = clamp(col, 0.0, 1.0);
  gl_FragColor = vec4(col * mask, mask);
}`;
const SKY_FRAG = `precision highp float;
uniform vec2 size; uniform float time; uniform vec3 C0, C1, C2, C3; uniform sampler2D luma; uniform vec2 lumaSize;
${NOISE}
float fbm(vec2 p){ float v = 0.0, a = 0.5; mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 3; i++) { v += a * noise(p); p = m * p; a *= 0.5; } return v / 0.875; }
vec3 ramp(float t){ t = clamp(t, 0.0, 1.0) * 3.0;
  if (t < 1.0) return mix(C0, C1, t); if (t < 2.0) return mix(C1, C2, t - 1.0); return mix(C2, C3, t - 2.0); }
void main(){
  vec2 frag = vec2(gl_FragCoord.x, size.y - gl_FragCoord.y);
  float s = max(size.x / lumaSize.x, size.y / lumaSize.y);
  vec2 drawn = lumaSize * s;
  vec2 uv = vec2((frag.x - (size.x - drawn.x)) / drawn.x, (size.y - frag.y) / drawn.y);
  float T = time;
  vec2 n = vec2(fbm(uv * vec2(2.0, 4.0) + vec2(T * 0.04, T * 0.02)), fbm(uv * vec2(2.0, 4.0) + vec2(5.0 - T * 0.03, 3.0 + T * 0.025)));
  uv += (n - 0.5) * 0.018;
  vec4 c = texture2D(luma, uv);
  float t = (c.r * 255.0 * 256.0 + c.g * 255.0) / 65535.0;
  t *= 0.96 + 0.06 * (0.5 + 0.5 * sin(T * 0.25));
  vec2 seed = frag + fract(time * 7.0) * 61.0;
  vec3 dn = vec3(hash(seed) + hash(seed + 17.1), hash(seed + 31.7) + hash(seed + 47.3), hash(seed + 59.9) + hash(seed + 73.1)) - 1.0;
  vec3 col = ramp(t) + dn * 1.5 / 255.0;
  gl_FragColor = vec4(col, 1.0);
}`;

function program(w, h, frag, opts) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true, ...opts });
  if (!gl) return null;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s)); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, frag));
  gl.linkProgram(prog); gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  gl.uniform2f(gl.getUniformLocation(prog, 'size'), w, h);
  gl.viewport(0, 0, w, h);
  return { canvas, gl, prog, C: [0, 1, 2, 3].map((i) => gl.getUniformLocation(prog, 'C' + i)), time: gl.getUniformLocation(prog, 'time') };
}

// One context per shader draws every visible canvas in turn and copies it out (browsers cap live contexts).
const DPR = Math.min(window.devicePixelRatio || 1, 2);
const SKY_K = DPR * 2; // sharp enough for the close-up's zoom
let skyGL = null, orbGL = null, bigOrbGL = null;
let skies = [], orbs = [];
const seen = new IntersectionObserver((entries) => entries.forEach((e) => (e.target._visible = e.isIntersecting)));
export const settings = { skyLive: true, halo: 'matched', paused: false };

/** Hooks up the live skies and orbs inside `root` (call after putting phones in the page). */
export function attach(root) {
  root.querySelectorAll('canvas[data-sky]').forEach((canvas) => {
    if (canvas._attached) return;
    canvas._attached = true;
    canvas.width = skyGL ? skyGL.canvas.width : 1; canvas.height = skyGL ? skyGL.canvas.height : 1;
    canvas._visible = true;
    seen.observe(canvas);
    const sky = { canvas, ctx: canvas.getContext('2d'), colours: JSON.parse(canvas.dataset.sky) };
    skies.push(sky);
    drawSky(sky); // straight away, so a re-render never shows a blank frame
  });
  root.querySelectorAll('canvas[data-orb]').forEach((canvas) => {
    if (canvas._attached) return;
    canvas._attached = true;
    const big = canvas.dataset.big === '1';
    const gl = big ? bigOrbGL : orbGL;
    canvas.width = canvas.height = gl ? gl.canvas.width : 1;
    canvas._visible = true;
    seen.observe(canvas);
    const orb = { canvas, big, ctx: canvas.getContext('2d'), colours: JSON.parse(canvas.dataset.orb) };
    orbs.push(orb);
    drawOrb(orb);
  });
}

function drawSky(s) {
  if (!skyGL?.ready) return;
  const { gl, C, time, canvas } = skyGL;
  gl.uniform1f(time, clock / 1000);
  s.colours.forEach((c, i) => gl.uniform3fv(C[i], c));
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  copyOut(skyGL, s.ctx, false);
}
function drawOrb(o) {
  const g = o.big ? bigOrbGL : orbGL;
  if (!g) return;
  const { gl, C, time, canvas } = g;
  gl.uniform1f(time, clock / 1000);
  o.colours.forEach((c, i) => gl.uniform3fv(C[i], c));
  gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  copyOut(g, o.ctx, true);
}

/**
 * Copies a shader's frame into a 2D canvas. Not with drawImage: on some GPUs (seen on the user's Linux Chrome,
 * 2026-11-02) drawImage of a WebGL canvas swaps red and blue, so Moonlight's blue sky came out brown. readPixels
 * always returns RGBA, bottom row first, premultiplied, so it's flipped and (for the orb's soft edge) unpremultiplied.
 */
function copyOut(g, ctx, alpha) {
  const { gl, canvas } = g, w = canvas.width, h = canvas.height;
  if (!g.buf || g.buf.length !== w * h * 4) {
    g.buf = new Uint8Array(w * h * 4);
    g.img = new ImageData(w, h);
  }
  gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, g.buf);
  const src = g.buf, dst = g.img.data, row = w * 4;
  for (let y = 0; y < h; y++) {
    const from = (h - 1 - y) * row;
    if (!alpha) {
      dst.set(src.subarray(from, from + row), y * row);
      continue;
    }
    for (let i = 0, j = y * row; i < row; i += 4, j += 4) {
      const a = src[from + i + 3];
      const k = a ? 255 / a : 0;
      dst[j] = src[from + i] * k; dst[j + 1] = src[from + i + 1] * k; dst[j + 2] = src[from + i + 2] * k; dst[j + 3] = a;
    }
  }
  ctx.putImageData(g.img, 0, 0);
}

let lastSky = 0, clock = 0, lastMs = 0;
function tick(ms) {
  if (!settings.paused) clock += Math.min(ms - lastMs, 100);
  lastMs = ms;
  skies = skies.filter((s) => s.canvas.isConnected);
  orbs = orbs.filter((o) => o.canvas.isConnected);
  // The sky at 30 a second, as the app runs it.
  if (!settings.paused && ms - lastSky >= 33) {
    lastSky = ms;
    for (const s of skies) if (s.canvas._visible) drawSky(s);
  }
  if (!settings.paused) for (const o of orbs) if (o.canvas._visible) drawOrb(o);
  requestAnimationFrame(tick);
}

// ——— The phone. ———
const ICON = {
  home: '<path d="M3 11 12 3l9 8v10h-6v-6H9v6H3z" fill="#0B1428"/>',
  alarm: '<circle cx="12" cy="13" r="8" fill="#C9CED6"/><path d="M12 9v4l3 2" stroke="#1d1e22" stroke-width="2" fill="none" stroke-linecap="round"/>',
  apps: '<rect x="3" y="3" width="8" height="8" rx="2" fill="#C9CED6"/><rect x="13" y="3" width="8" height="8" rx="2" fill="#C9CED6"/><rect x="3" y="13" width="8" height="8" rx="2" fill="#C9CED6"/><rect x="13" y="13" width="8" height="8" rx="2" fill="#C9CED6"/>',
  you: '<circle cx="12" cy="8" r="4.5" fill="#C9CED6"/><path d="M3.5 21c1-4.5 4.5-7 8.5-7s7.5 2.5 8.5 7z" fill="#C9CED6"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z" fill="#fff"/>',
};
const svg = (k) => `<svg viewBox="0 0 24 24">${ICON[k]}</svg>`;

function shadowHTML(phase, F, r) {
  const c = F / 2;
  const circle = (x, y, R, colour, blur) =>
    `<div class="shadow" style="left:${x - R}px;top:${y - R}px;width:${2 * R}px;height:${2 * R}px;background:${colour};filter:blur(${blur}px)"></div>`;
  const parts = {
    crescent: circle(c - r * 0.32, c + r * 0.3, r * 1.02, 'rgba(6,9,18,0.94)', r * 0.06),
    earthshine: circle(c - r * 0.32, c + r * 0.3, r * 1.02, 'rgba(10,16,34,0.72)', r * 0.06),
    half: `<div class="shadow" style="border-radius:0;left:${c - r * 1.3}px;top:${c - r * 1.3}px;width:${r * 1.3}px;height:${r * 2.6}px;background:rgba(6,8,14,0.93);filter:blur(${r * 0.05}px)"></div>`,
    gibbous: circle(c - r * 1.55, c, r, 'rgba(6,8,14,0.93)', r * 0.08),
    bite: circle(c + r * 0.85, c - r * 1.2, r * 1.0, 'rgba(58,12,6,0.9)', r * 0.16),
  };
  return parts[phase] ? `<div class="masked">${parts[phase]}</div>` : '';
}
export const PHASES = ['crescent', 'half', 'gibbous', 'earthshine', 'bite'];

let ringN = 0;
/** The Eclipse's ring of fire (the user asked for this ring, on the Eclipse only, 2026-10-29). */
function eclipseRing(size, cx, cy) {
  const r = size / 2, box = size * 1.6, o = box / 2, n = ringN++;
  return `<svg class="ring" width="${box}" height="${box}" style="left:${cx - o}px;top:${cy - o}px" viewBox="0 0 ${box} ${box}">
    <defs>
      <filter id="rs${n}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${r * 0.035}"/></filter>
      <filter id="rw${n}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${r * 0.09}"/></filter>
    </defs>
    <circle cx="${o}" cy="${o}" r="${r * 0.985}" fill="none" stroke="#FF9A3C" stroke-width="${r * 0.07}" opacity="0.55" filter="url(#rw${n})"/>
    <circle cx="${o}" cy="${o}" r="${r * 0.985}" fill="none" stroke="#FFB45E" stroke-width="${r * 0.035}" filter="url(#rs${n})"/>
    <circle cx="${o}" cy="${o}" r="${r * 0.985}" fill="none" stroke="#FFF0D0" stroke-width="${r * 0.012}"/>
  </svg>`;
}
function saturnRing(size, cx, cy, colour) {
  const r = size / 2;
  const e = (rx, ry, w, o) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" transform="rotate(-16 ${cx} ${cy})" fill="none" stroke="${colour}" stroke-width="${w}" opacity="${o}"/>`;
  return `<svg class="ring" width="${W}" height="${PANEL}" style="left:0;top:0" viewBox="0 0 ${W} ${PANEL}">
    ${e(r * 1.45, r * 0.85, r * 0.045, 0.85)}${e(r * 1.33, r * 0.76, r * 0.018, 0.5)}</svg>`;
}

/** The main moon's and the twin's discs in phone points (centre and size). */
export function geometry(m) {
  const size = BASE * (m.scale ?? 1), cx = W * (m.cx ?? 0.5), cy = PANEL - size * SHOWS + size / 2;
  let twin = null;
  if (m.twin) {
    const t = m.twin, d = W * t.size;
    twin = { x: W * t.x, y: t.y === 'rise' ? PANEL - d * SHOWS + d / 2 : PANEL * t.y, d };
  }
  return { size, cx, cy, twin };
}

const v = () => `?v=${bust}`;
let bust = Date.now();
export const refreshBaked = () => (bust = Date.now());

/**
 * Home's sky panel over the tab strip, for moon `m`. `baked`: the bake's own images (assets/moons/)
 * for the moon, twin and ring glow, to check the bake against the live preview.
 */
export function phoneHTML(m, { baked = false, handles = false, home = true, live = settings.skyLive, date = 'Mon, Nov 2' } = {}) {
  const { size, cx, cy, twin: tw } = geometry(m);
  const F = size * FROST_PAD, G = size * GLOW_PAD, r = size / 2;
  const box = (s, x = cx, y = cy) => `width:${s}px;height:${s}px;left:${x - s / 2}px;top:${y - s / 2}px`;
  const art = (kind, ramp) => (m.original ? '' : baked ? `background-image:url(/assets/moons/${m.id}-${kind}.webp${v()})` : `filter:url(#${gm('moon', ramp)})`);
  let twin = '';
  if (m.twin) {
    const t = m.twin;
    twin = `${t.glowOpacity === 0 ? '' : `<div class="glow" style="${box(tw.d * GLOW_PAD, tw.x, tw.y)};--glow:${t.glow};opacity:${t.glowOpacity ?? 0.6}"></div>`}
      <div class="twin rise" style="${box(tw.d * FROST_PAD, tw.x, tw.y)};${art('twin', t.moon)}"></div>
      ${handles ? `<div class="handle" data-handle="twin" style="${box(tw.d, tw.x, tw.y)}"></div>` : ''}`;
  }
  const behind = m.twin && !m.twin.front ? twin : '', over = m.twin?.front ? twin : '';
  const sky = JSON.stringify(skyColours(m));
  const bakedSky = baked && !m.original ? `background-image:url(/assets/moons/${m.id}-sky.webp${v()});transform:none;background-position:center;` : '';
  return `<div class="panel" style="height:${PANEL}px">
      <div class="sky${live ? ' off' : ''}" style="${bakedSky || (m.original ? '' : `filter:url(#${gm('sky', m.sky)})`)}"></div>
      ${live ? `<canvas class="livesky" data-sky='${sky}'></canvas>` : ''}
      ${behind}
      <div class="glow rise${m.original || settings.halo === 'blue' ? ' orig' : ''}" style="${box(G)};--glow:${m.glow};opacity:${settings.halo === 'off' ? 0 : m.glowOpacity ?? 1}"></div>
      ${m.saturn ? `<div class="rise">${saturnRing(size, cx, cy, m.saturn)}</div>` : ''}
      <div class="moonwrap rise" style="${box(F)}">
        <div class="frost" style="${art('moon', m.moon)}"></div>
        ${m.tint && !baked ? `<div class="masked tint" style="background:linear-gradient(${m.tint.angle}deg, ${m.tint.stops.join(', ')});opacity:${m.tint.amount}"></div>` : ''}
        ${m.phase && !baked ? shadowHTML(m.phase, F, r) : ''}
      </div>
      ${baked && m.ring ? `<div class="ringglow rise" style="${box(size * 1.6)};background-image:url(/assets/moons/${m.id}-ring.webp${v()})"></div>` : ''}
      ${m.ring && !baked ? `<div class="rise">${eclipseRing(size, cx, cy)}</div>` : ''}
      ${m.ring && baked ? `<div class="rise">${eclipseRing(size, cx, cy).replace(/<circle[^>]*filter=[^>]*\/>/g, '')}</div>` : ''}
      ${over}
      ${handles ? `<div class="handle" data-handle="moon" style="${box(size)}"></div>` : ''}
      ${home ? `<img class="loc" src="/loc/loc-peek-eyes.svg" alt="" draggable="false">
      <div class="home">
        <div class="row"><b>Locturne</b><span>${date}</span></div>
        <div class="state">Apps asleep</div>
        <div class="time">11:42</div>
        <div class="sub">Awake after 200 steps from 7:00</div>
        <div class="count">23 mornings up</div>
      </div>` : ''}
    </div>
    <div class="strip" style="height:${STRIP}px">
      <div class="tabs"><div class="tab on">${svg('home')}</div><div class="tab">${svg('alarm')}</div><div class="tab">${svg('apps')}</div><div class="tab">${svg('you')}</div></div>
      <div class="orb"><canvas data-orb='${JSON.stringify(orbColours(m).map((c) => c.map((x) => x / 255)))}'></canvas>${svg('moon')}</div>
    </div>`;
}

/** A big Sleep orb for moon `m`. */
export const bigOrbHTML = (m) => `<canvas class="bigorb" data-big="1" data-orb='${JSON.stringify(orbColours(m).map((c) => c.map((x) => x / 255)))}'></canvas>`;

// ——— Moon art on a canvas: bake.py's gradient map, tint and shadow, for the tile icons. ———
let moonPx = null; // the frosted moon's luminance and alpha at 512
const ART = 512;
function rampLUT(stops) {
  const lut = new Uint8ClampedArray(256 * 3);
  const { lo, hi } = RANGES.moon;
  for (let i = 0; i < 256; i++) {
    const c = ramp(stops, (i / 255 - lo) / (hi - lo || 1));
    lut.set(c, i * 3);
  }
  return lut;
}
/** The moon's disc art (gradient-mapped, tinted, shadowed) on a 512 canvas. */
export function moonArt(m, ramp = m.moon, extras = true) {
  const c = document.createElement('canvas');
  c.width = c.height = ART;
  const g = c.getContext('2d');
  const img = g.createImageData(ART, ART);
  const lut = rampLUT(ramp);
  for (let i = 0, j = 0; i < moonPx.l.length; i++, j += 4) {
    const k = moonPx.l[i] * 3;
    img.data[j] = lut[k]; img.data[j + 1] = lut[k + 1]; img.data[j + 2] = lut[k + 2]; img.data[j + 3] = moonPx.a[i];
  }
  g.putImageData(img, 0, 0);
  if (extras && m.tint) {
    g.save();
    g.globalCompositeOperation = 'source-atop';
    g.globalAlpha = m.tint.amount;
    // A colour wash, like the CSS mix-blend-mode: color the phone uses.
    const tmp = document.createElement('canvas');
    tmp.width = tmp.height = ART;
    const t = tmp.getContext('2d');
    t.drawImage(c, 0, 0);
    t.globalCompositeOperation = 'color';
    const a = (m.tint.angle * Math.PI) / 180, dx = Math.sin(a), dy = -Math.cos(a), len = (Math.abs(dx) + Math.abs(dy)) * ART / 2;
    const grad = t.createLinearGradient(ART / 2 - dx * len, ART / 2 - dy * len, ART / 2 + dx * len, ART / 2 + dy * len);
    m.tint.stops.forEach((s, i) => grad.addColorStop(i / (m.tint.stops.length - 1), s));
    t.fillStyle = grad; t.fillRect(0, 0, ART, ART);
    g.drawImage(tmp, 0, 0);
    g.restore();
  }
  if (extras && m.phase) {
    const r = ART / 3, cc = ART / 2;
    g.save();
    g.globalCompositeOperation = 'source-atop';
    const shape = {
      crescent: [cc - r * 0.32, cc + r * 0.3, r * 1.02, 'rgba(6,9,18,0.94)', 0.06],
      earthshine: [cc - r * 0.32, cc + r * 0.3, r * 1.02, 'rgba(10,16,34,0.72)', 0.06],
      gibbous: [cc - r * 1.55, cc, r, 'rgba(6,8,14,0.93)', 0.08],
      bite: [cc + r * 0.85, cc - r * 1.2, r, 'rgba(58,12,6,0.9)', 0.16],
    }[m.phase];
    if (m.phase === 'half') {
      g.filter = `blur(${r * 0.05}px)`; g.fillStyle = 'rgba(6,8,14,0.93)'; g.fillRect(cc - r * 1.3, cc - r * 1.3, r * 1.3, r * 2.6);
    } else if (shape) {
      const [x, y, R, col, b] = shape;
      g.filter = `blur(${r * b}px)`; g.fillStyle = col; g.beginPath(); g.arc(x, y, R, 0, Math.PI * 2); g.fill();
    }
    g.restore();
  }
  return c;
}

// ——— The collection tile's icon: bake-icons.py, in the browser. ———
let night = null; // { alpha, inDisc, clouds, rim } at 512
const CX = 262, CY = 238.5, R = 163.5, CROP = [0.18, 0.82];
async function prepareNight() {
  const im = await loadImage('/assets/moons/icons/night.png');
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d');
  g.drawImage(im, 0, 0, 512, 512);
  const px = g.getImageData(0, 0, 512, 512).data;
  const n = 512 * 512, alpha = new Float32Array(n), solid = new Uint8Array(n);
  for (let i = 0; i < n; i++) { alpha[i] = px[i * 4 + 3] / 255; solid[i] = alpha[i] > 0.5 ? 1 : 0; }
  // The moon is the shape joined to the disc's centre: the clouds are cut off from it by the icon's gap.
  const moon = new Uint8Array(n), stack = [Math.round(CY) * 512 + CX];
  while (stack.length) {
    const p = stack.pop();
    if (moon[p] || !solid[p]) continue;
    moon[p] = 1;
    const x = p % 512, y = (p / 512) | 0;
    if (x > 0) stack.push(p - 1); if (x < 511) stack.push(p + 1); if (y > 0) stack.push(p - 512); if (y < 511) stack.push(p + 512);
  }
  const grown = new Uint8Array(n); // a 3×3 max filter
  for (let y = 1; y < 511; y++) for (let x = 1; x < 511; x++) {
    let on = 0;
    for (let dy = -1; dy <= 1 && !on; dy++) for (let dx = -1; dx <= 1; dx++) if (moon[(y + dy) * 512 + x + dx]) { on = 1; break; }
    grown[y * 512 + x] = on;
  }
  const inDisc = new Float32Array(n), clouds = new Float32Array(n), rim = new Float32Array(n);
  for (let i = 0; i < n; i++) { inDisc[i] = alpha[i] * grown[i]; clouds[i] = Math.max(0, alpha[i] - inDisc[i]); }
  // The Eclipse's ring: the disc minus the disc shrunk by 4 px.
  for (let y = 4; y < 508; y++) for (let x = 4; x < 508; x++) {
    let lo = 1;
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) lo = Math.min(lo, inDisc[(y + dy) * 512 + x + dx]);
    rim[y * 512 + x] = Math.max(0, inDisc[y * 512 + x] - lo);
  }
  night = { im, inDisc, clouds, rim };
}

/** The tile icon for moon `m` on a 512 canvas: earned (its art and colours) or locked (grey). */
export function iconCanvas(m, { locked = false } = {}) {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d');
  if (locked) {
    g.drawImage(night.im, 0, 0, 512, 512);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = '#2C2C30';
    g.fillRect(0, 0, 512, 512);
    return c;
  }
  const art = document.createElement('canvas');
  art.width = art.height = 512;
  const a = art.getContext('2d');
  const d = Math.round(R * 2), src = m.original ? moonArt(m, ['#3E5A8E', '#9FB6D8'], false) : moonArt(m);
  a.drawImage(src, ART * CROP[0], ART * CROP[0], ART * (CROP[1] - CROP[0]), ART * (CROP[1] - CROP[0]), Math.round(CX - R), Math.round(CY - R), d, d);
  const ap = a.getImageData(0, 0, 512, 512).data;
  const out = g.createImageData(512, 512);
  const light = orbColours(m)[3];
  for (let i = 0, j = 0; i < night.inDisc.length; i++, j += 4) {
    let moonA = night.inDisc[i] * ap[j + 3] / 255;
    let r = ap[j], gg = ap[j + 1], b = ap[j + 2];
    if (m.ring && night.rim[i] > 0) {
      const k = night.rim[i];
      r = r * (1 - k) + light[0] * k; gg = gg * (1 - k) + light[1] * k; b = b * (1 - k) + light[2] * k;
      moonA = Math.max(moonA, k);
    }
    const cl = night.clouds[i], A = moonA + cl || 1e-6;
    out.data[j] = (r * moonA + light[0] * cl) / A;
    out.data[j + 1] = (gg * moonA + light[1] * cl) / A;
    out.data[j + 2] = (b * moonA + light[2] * cl) / A;
    out.data[j + 3] = Math.min(1, moonA + cl) * 255;
  }
  g.putImageData(out, 0, 0);
  return c;
}

export async function setup(defs) {
  defsEl = defs;
  const [sky, moon] = await Promise.all([lumRange('/assets/onboarding/night-sky-moonless.png'), lumRange('/assets/onboarding/moon-frosted.png')]);
  RANGES = { sky, moon };
  // The moon's luminance at 512, for the canvas art.
  const im = await loadImage('/assets/onboarding/moon-frosted.png');
  const c = document.createElement('canvas');
  c.width = c.height = ART;
  const g = c.getContext('2d');
  g.drawImage(im, 0, 0, ART, ART);
  const p = g.getImageData(0, 0, ART, ART).data;
  moonPx = { l: new Uint8Array(ART * ART), a: new Uint8Array(ART * ART) };
  for (let i = 0; i < ART * ART; i++) {
    moonPx.l[i] = Math.round(0.2126 * p[i * 4] + 0.7152 * p[i * 4 + 1] + 0.0722 * p[i * 4 + 2]);
    moonPx.a[i] = p[i * 4 + 3];
  }
  await prepareNight();

  skyGL = program(Math.round(W * SKY_K), Math.round(PANEL * SKY_K), SKY_FRAG, {});
  if (skyGL) {
    const img = await loadImage('/assets/moons/sky-luma.png');
    const { gl, prog } = skyGL;
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.uniform1i(gl.getUniformLocation(prog, 'luma'), 0);
    gl.uniform2f(gl.getUniformLocation(prog, 'lumaSize'), img.naturalWidth, img.naturalHeight);
    skyGL.ready = true;
  }
  const small = Math.round(43 * DPR * 1.25);
  orbGL = program(small, small, ORB_FRAG, { premultipliedAlpha: true, alpha: true });
  bigOrbGL = program(Math.round(300 * DPR), Math.round(300 * DPR), ORB_FRAG, { premultipliedAlpha: true, alpha: true });
  requestAnimationFrame(tick);
}
