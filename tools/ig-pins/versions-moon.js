// Moonrise set (user picked 06, 2026-11-25): the app's frosted moon WITH its glow (user asked for the glow),
// a rounder App Store badge on the middle post, and 15 phone layouts. Uses helpers from versions.js.
const MOON_BG = sky(['#080B18', '#0F1838 50%', '#1A2A58']);
// The site/app moon: moon.webp (disc = 2/3 of image) softly blurred, over moon-glow.webp (disc = 1/2 of image).
const moon = (cx, cy, d, o = {}) => [
  { src: `${LAND}/sky/moon-glow.webp`, css: { left: cx - d + 'px', top: cy - d + 'px', width: 2 * d + 'px',
    opacity: o.glow ?? 1, mixBlendMode: 'screen', zIndex: 0 } },
  { src: `${LAND}/sky/moon.webp`, css: { left: cx - .75 * d + 'px', top: cy - .75 * d + 'px', width: 1.5 * d + 'px',
    filter: `blur(${(d * (o.frost ?? .012)).toFixed(1)}px) brightness(${o.bright ?? 1.12})`, opacity: o.op ?? .95, zIndex: 0 } }];
// Rounder badge: Apple's artwork clipped inside a softer rounded rect with its own hairline.
const rbadge = (x, y, w = 360) => { const h = w / 2.99;
  return { css: { left: x - w / 2 + 'px', top: y + 'px', width: w + 'px', height: h + 'px', borderRadius: h * .42 + 'px',
    overflow: 'hidden', background: '#000', boxShadow: 'inset 0 0 0 2px rgba(166,166,166,.9), 0 10px 30px rgba(0,0,0,.45)', zIndex: 8 },
    html: `<img src="${LAND}/badges/app-store.svg" style="position:absolute;left:50%;top:50%;width:108%;transform:translate(-50%,-50%)">` }; };
const P = (s, a, x, y, h, r = 0, z = 1) => ({ s, a, x, y, h, r, z });
const H = heads(COPY.main);
const mv = (id, name, note, phones, o = {}) => ({ id, name, note, bg: MOON_BG, stars: { n: 150, h: 700 },
  under: moon(o.mx ?? 1620, o.my ?? 1730, o.md ?? 1460, o.moon), phones, text: o.text || H,
  html: [rbadge(o.bx ?? 1620, o.by ?? 1296, o.bw)], ...(o.extra || {}) });

const MOON = [
mv('m01', 'Straight row', 'The 06 layout cleaned up: three front-on phones, middle one lifted to make room for the badge.', [
  P(A.asleep, F, 540, 850, 930), P(A.steps, F, 1620, 790, 880), P(A.payoff, F, 2700, 850, 930)]),

mv('m02', 'Tilted out', 'Side phones turn away from the middle like an open book; the middle stays straight above the badge.', [
  P(A.asleep, 'yawm030_pitchp00', 560, 860, 960, -7), P(A.steps, F, 1620, 790, 880), P(A.payoff, 'yawp030_pitchp00', 2680, 860, 960, 7)]),

mv('m03', 'Tilted in', 'Side phones lean toward the moon in the middle, pulling the eye to the centre post.', [
  P(A.asleep, 'yawp030_pitchp00', 580, 860, 960, 6), P(A.steps, F, 1620, 790, 880), P(A.payoff, 'yawm030_pitchp00', 2660, 860, 960, -6)]),

mv('m04', 'Rising', 'Phones climb left to right like the moon coming up: night low, morning high.', [
  P(A.asleep, F, 540, 930, 900), P(A.steps, F, 1620, 800, 860), P(A.payoff, F, 2700, 800, 880)],
  { text: [heads(COPY.main)[0], heads(COPY.main)[1], heads(COPY.main, 104)[2]] }),

mv('m05', 'Rising, tilted', 'The same climb with each phone tipped up a little more, so the row reads as one motion.', [
  P(A.asleep, 'yawm015_pitchp00', 540, 930, 900, -10), P(A.steps, 'yawm015_pitchp00', 1620, 810, 860, -5), P(A.payoff, F, 2700, 780, 940, 0)]),

mv('m06', 'Big bleed', 'Phones blown up and cut by the bottom edge, moon behind. Badge sits under the middle headline.', [
  P(A.asleep, F, 540, 1240, 1600), P(A.steps, F, 1620, 1330, 1600), P(A.payoff, F, 2700, 1240, 1600)],
  { by: 300, bw: 300, my: 1800 }),

mv('m07', 'Front and back', 'Each post has a pair: the main screen in front, a second screen tucked behind it (shield, methods, moon).', [
  P(A.shield, 'yawm030_pitchp00', 400, 900, 840, -8, 1), P(A.asleep, F, 620, 900, 900, 0, 2),
  P(A.methods, 'yawp030_pitchp00', 1790, 830, 780, 8, 1), P(A.steps, F, 1560, 820, 840, 0, 2),
  P(A.blue, 'yawp030_pitchp00', 2840, 900, 840, 8, 1), P(A.payoff, F, 2620, 900, 900, 0, 2)]),

mv('m08', 'Leaning back', 'Phones tip back as if lying on the moon’s horizon. Calmer and more photographic.', [
  P(A.asleep, 'yawp000_pitchp30', 540, 880, 900), P(A.steps, 'yawp000_pitchp30', 1620, 820, 840), P(A.payoff, 'yawp000_pitchp30', 2700, 880, 900)]),

mv('m09', 'Leaning forward', 'Phones tip toward you from above, the top edge closest. Feels like the phone is being held up.', [
  P(A.asleep, 'yawp000_pitchm30', 540, 860, 920), P(A.steps, 'yawp000_pitchm30', 1620, 790, 860), P(A.payoff, 'yawp000_pitchm30', 2700, 860, 920)]),

mv('m10', 'One angle', 'Every phone at the same 3D angle and spin, the "one angle rule" from App Store screenshot guides.', [
  P(A.asleep, 'yawm045_pitchp15', 560, 880, 960, -10), P(A.steps, 'yawm045_pitchp15', 1640, 810, 900, -10), P(A.payoff, 'yawm045_pitchp15', 2720, 880, 960, -10)]),

mv('m11', 'Mirror', 'Left and right phones are mirror images around the straight middle phone, so the trio looks balanced.', [
  P(A.asleep, 'yawm045_pitchp15', 580, 870, 960, -10), P(A.steps, F, 1620, 790, 880), P(A.payoff, 'yawp045_pitchp15', 2660, 870, 960, 10)]),

mv('m12', 'Fan', 'Three phones fanned out from the middle so each one crosses a seam. The moon sits behind the fan.', [
  P(A.asleep, 'yawm045_pitchp15', 860, 880, 1100, -12, 1), P(A.steps, F, 1620, 790, 960, 0, 3), P(A.payoff, 'yawp045_pitchp15', 2380, 880, 1100, 12, 1)],
  { by: 1310 }),

mv('m13', 'Hero middle', 'The middle phone is big and straight; the side phones turn sharply toward it like a stage.', [
  P(A.asleep, 'yawp060_pitchp00', 600, 880, 880), P(A.steps, F, 1620, 780, 900), P(A.payoff, 'yawm060_pitchp00', 2640, 880, 880)]),

mv('m14', 'Behind the moon', 'The moon sits in front: phones rise from behind its edge, so the moonrise is literal.', [
  P(A.asleep, F, 540, 950, 1000), P(A.steps, F, 1620, 900, 960), P(A.payoff, F, 2700, 950, 1000)],
  { md: 1700, my: 2000, extra: {} }),

mv('m15', 'Scattered', 'Casual, slightly different spins (−8°, +4°, −3°) like phones laid down by hand. Less rigid than a row.', [
  P(A.asleep, 'yawm015_pitchp15', 560, 870, 940, -8), P(A.steps, 'yawp015_pitchp15', 1630, 800, 880, 4), P(A.payoff, 'yawm015_pitchp00', 2690, 860, 940, -3)]),
];
// m14: move the moon layers above the phones
MOON.find(v => v.id === 'm14').over = MOON.find(v => v.id === 'm14').under.map(i => ({ ...i, css: { ...i.css, zIndex: 2 } }));
MOON.find(v => v.id === 'm14').under = [];

// White pill badge (user reference 2026-11-25): Apple logo from the official badge art, white fully-rounded pill.
const APPLE_LOGO = `<svg viewBox="7.6 7.6 18.6 23" style="height:100%;display:block" fill="#000"><path d="M24.76888,20.30068a4.94881,4.94881,0,0,1,2.35656-4.15206,5.06566,5.06566,0,0,0-3.99116-2.15768c-1.67924-.17626-3.30719,1.00483-4.1629,1.00483-.87227,0-2.18977-.98733-3.6085-.95814a5.31529,5.31529,0,0,0-4.47292,2.72787c-1.934,3.34842-.49141,8.26947,1.3612,10.97608.9269,1.32535,2.01018,2.8058,3.42763,2.7533,1.38706-.05753,1.9051-.88448,3.5794-.88448,1.65876,0,2.14479.88448,3.591.8511,1.48838-.02416,2.42613-1.33124,3.32051-2.66914a10.962,10.962,0,0,0,1.51842-3.09251A4.78205,4.78205,0,0,1,24.76888,20.30068Z"/><path d="M22.03725,12.21089a4.87248,4.87248,0,0,0,1.11452-3.49062,4.95746,4.95746,0,0,0-3.20758,1.65961,4.63634,4.63634,0,0,0-1.14371,3.36139A4.09905,4.09905,0,0,0,22.03725,12.21089Z"/></svg>`;
const wbadge = (x, y, w = 400) => { const h = w * .3;
  return { css: { left: x - w / 2 + 'px', top: y + 'px', width: w + 'px', height: h + 'px', borderRadius: h / 2 + 'px', background: '#F7F8FB',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: h * .2 + 'px', boxShadow: '0 12px 34px rgba(0,0,0,.4)', zIndex: 8 },
    html: `<div style="height:${h * .42}px">${APPLE_LOGO}</div><div style="display:flex;flex-direction:column;line-height:1;font-family:Inter,sans-serif;color:#0B0C10">
      <span style="font-size:${h * .2}px;font-weight:500;color:#4A4D57;letter-spacing:-.005em">Download on the</span>
      <span style="font-size:${h * .34}px;font-weight:700;letter-spacing:-.025em;margin-top:${h * .04}px">App Store</span></div>` }; };
const m11 = (id, name, note, la, ra, roll) => ({ ...mv(id, name, note, [
  P(A.asleep, la, 580, 870, 960, -roll), P(A.steps, F, 1620, 790, 880), P(A.payoff, ra, 2660, 870, 960, roll)]),
  html: [wbadge(1620, 1288)] });
MOON.push(
  m11('m11a', 'Mirror, softer', 'm11 with less tilt: 30° turn, 6° lean. White pill badge.', 'yawm030_pitchp15', 'yawp030_pitchp15', 6),
  m11('m11b', 'Mirror, gentle', 'Less again: 30° turn, no lean back, 4° lean.', 'yawm030_pitchp00', 'yawp030_pitchp00', 4),
  m11('m11c', 'Mirror, subtle', 'Barely tilted: 15° turn, 3° lean. Closest to straight-on.', 'yawm015_pitchp15', 'yawp015_pitchp15', 3));
if (typeof module !== 'undefined') module.exports = MOON;
