// The Moonwell orb, drawn with WebGL: one context renders every canvas.orb each frame (shared by the lab pages).
// ───────── Orb renderer: one WebGL context, every canvas.orb copies from it each frame ─────────
const VERT = 'attribute vec2 a; void main(){ gl_Position = vec4(a, 0., 1.); }';
const FRAG = `precision highp float;
uniform vec2 R; uniform float T; uniform vec3 C0, C1, C2, C3; uniform float press;
const float warp = 1.1, swirl = .15, core = .25, glass = .55, ribbons = .2, spec = .8, shade = .5;
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y); }
float fbm(vec2 p){ float v = 0., a = .5; mat2 m = mat2(1.6, 1.2, -1.2, 1.6); for (int i = 0; i < 4; i++) { v += a * noise(p); p = m * p; a *= .5; } return v / .9375; }
void main(){
  vec2 p = (gl_FragCoord.xy / R) * 2. - 1.; float ang = atan(p.y, p.x);
  float rad = .96 * (1. + .035 * press); float r = length(p) / rad; float aa = 2. / (R.x * rad * .5);
  float mask = 1. - smoothstep(1. - aa, 1., r); if (mask <= 0.) { gl_FragColor = vec4(0.); return; }
  vec2 q = p / rad; float z = sqrt(max(0., 1. - min(dot(q, q), 1.))); vec3 n = vec3(q, z);
  vec2 uv = q * (1. - .38 * (1. - z)); float a = swirl * (1. - r) * 1.6 + T * .12 * swirl;
  uv = mat2(cos(a), -sin(a), sin(a), cos(a)) * uv; uv *= 1.35;
  vec2 w1 = vec2(fbm(uv * 1.1 + vec2(0., T * .13)), fbm(uv * 1.1 + vec2(5.2, 1.3) - T * .11));
  vec2 w2 = vec2(fbm(uv + warp * 2. * w1 + vec2(1.7, 9.2) + T * .09), fbm(uv + warp * 2. * w1 + vec2(8.3, 2.8) - T * .07));
  float f = fbm(uv + warp * 2. * w2);
  vec3 col = mix(C0, C1, smoothstep(.25, .75, w2.x)); col = mix(col, C2, smoothstep(.4, .85, f));
  col = mix(col, C3, smoothstep(.62, .95, w1.y * .6 + f * .5) * .85);
  float layer = .5 + .5 * sin(6.2832 * (f * 2.2 + w2.y * .7 + T * .03));
  col *= mix(1., .8 + .32 * layer, ribbons); col += ribbons * .2 * pow(layer, 10.) * (C3 * .6 + .4);
  col *= mix(1., smoothstep(.05, .92, r), core);
  vec3 L = normalize(vec3(-.45, .6, .75)); col *= mix(1., .55 + .6 * max(dot(n, L), 0.), shade);
  float fres = pow(1. - z, 2.6); col += glass * fres * .85;
  vec3 H = normalize(L + vec3(0., 0., 1.)); col += spec * .9 * pow(max(dot(n, H), 0.), 90.);
  float edge = smoothstep(.84, .965, r) * (1. - smoothstep(.965, 1., r)); col += spec * .28 * edge * smoothstep(-.1, .9, q.y * .9 - q.x * .4);
  col *= 1. + .18 * press; col = clamp(col, 0., 1.); gl_FragColor = vec4(col * mask, mask);
}`;
const GLS = 288;
const glc = document.createElement('canvas'); glc.width = glc.height = GLS;
const gl = glc.getContext('webgl', { premultipliedAlpha: true, preserveDrawingBuffer: true, antialias: false });
const U = {};
{
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s)); return s; };
  const prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG)); gl.linkProgram(prog); gl.useProgram(prog);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  ['R', 'T', 'C0', 'C1', 'C2', 'C3', 'press'].forEach((k) => (U[k] = gl.getUniformLocation(prog, k)));
}
let seed = 0;
/** An orb of theme `id` (or a live palette via el._pal), `size` px. */
function orb(id, size, cls = '') {
  const px = Math.min(GLS, Math.round(size * 2));
  const c = document.createElement('canvas'); c.className = `orb ${cls}`; c.width = c.height = px; c.style.width = c.style.height = size + 'px';
  c._id = id; c._seed = (seed++ * 7.3) % 40; c._press = 0;
  return c;
}
function drawOrb(c, t) {
  const pal = c._pal || (typeof PAL !== 'undefined' && PAL[c._id]); if (!pal) return;
  const s = c.width;
  gl.viewport(0, 0, s, s); gl.uniform2f(U.R, s, s); gl.uniform1f(U.T, t * .45 + c._seed);
  gl.uniform3fv(U.C0, pal[0]); gl.uniform3fv(U.C1, pal[1]); gl.uniform3fv(U.C2, pal[2]); gl.uniform3fv(U.C3, pal[3]); gl.uniform1f(U.press, c._press);
  gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLES, 0, 3);
  const ctx = c._ctx || (c._ctx = c.getContext('2d'));
  ctx.clearRect(0, 0, s, s); ctx.drawImage(glc, 0, GLS - s, s, s, 0, 0, s, s);
}
const T0 = performance.now();
(function loop(now) {
  const t = (now - T0) / 1000;
  for (const c of document.querySelectorAll('canvas.orb')) {
    let e = c, hidden = false;
    while (e && e !== document.body) { const cs = e.style; if (cs.opacity === '0' || cs.display === 'none' || cs.visibility === 'hidden') { hidden = true; break; } e = e.parentElement; }
    if (!hidden) drawOrb(c, t);
  }
  requestAnimationFrame(loop);
})(T0);

