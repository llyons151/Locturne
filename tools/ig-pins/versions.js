// 15 pinned-trio designs. Canvas 3240x1440, tiles centred at x = 540 / 1620 / 2700.
// Research: docs/reports/Instagram pinned post trio.md. No glows (CLAUDE.md); neutral drop shadows only.
const T = [540, 1620, 2700];
const LAND = '../../../locturne_landing/public';
const A = { asleep: '01-asleep-clean', steps: '02-steps-clean', payoff: '03-payoff', shield: '13-shield-night',
  methods: '12-wake-methods-clean', blue: '11-moon-bluehour' };
const F = 'yawp000_pitchp00';
const COPY = {
  main: ['Your apps sleep<br><b>until you’re up.</b>', 'Walk <b>200 steps.</b><br>Then they wake up.', '<b>You’re up.</b><br>So are your apps.'],
  loc: ['2 a.m. you<br><b>doesn’t get a vote.</b>', 'Hate push-ups?<br><b>Walk instead.</b>', '<b>Good behaviour.</b><br>I’m counting.'],
  short: ['Bedtime lock.', 'Walk to unlock.', 'Wake up for real.'],
};
const CTA = 'Search <b style="font-weight:700">Locturne</b> on the App Store';
// sky that gets lighter left → right (night → blue hour) and lighter toward the bottom
const sky = (low, top = '#06070B', fade = '70%') => [
  `linear-gradient(90deg, ${low.join(', ')})`,
  `linear-gradient(180deg, ${top} 0%, ${top}E6 22%, ${top}00 ${fade})`];
const NIGHT = sky(['#0B1024', '#142049 40%', '#22376E 75%', '#2E4A86']);
const heads = (copy, y = 104, size = 88, extra = {}) => copy.map((h, i) => ({ x: T[i], y, size, html: `<div class="h">${h}</div>`, ...extra }));
const kick = (labels, y, size = 26, op) => labels.map((k, i) => ({ x: T[i], y, size, html: `<div class="k"${op ? ` style="opacity:${op}"` : ''}>${k}</div>` }));
const cta = (y, size = 34, color = '#EDEBE6', bg = 'rgba(255,255,255,.1)') =>
  ({ x: T[2], y, size, html: `<span class="pill" style="background:${bg};color:${color}">${CTA}</span>` });
const badge = (x, y, w = 330) => ({ src: `${LAND}/badges/app-store.svg`, css: { left: x - w / 2 + 'px', top: y + 'px', width: w + 'px', zIndex: 6 } });
const trio = (shots, o = {}) => shots.map((s, i) => ({ s, a: (o.a && o.a[i]) || F, x: T[i] + ((o.dx && o.dx[i]) || 0),
  y: (o.y && o.y[i]) || o.y0 || 900, h: (o.h && o.h[i]) || o.h0 || 1000, r: (o.r && o.r[i]) || 0, z: (o.z && o.z[i]) || 1 }));
const S3 = [A.asleep, A.steps, A.payoff];

const VERSIONS = [
{ id: '01', name: 'Night to morning', note: 'The store listing’s look: the sky brightens left to right, one front-on phone per tile, CTA pill on the payoff.',
  bg: NIGHT, stars: { n: 120, h: 600 },
  phones: trio(S3, { y0: 850, h0: 930 }),
  text: [...heads(COPY.main), cta(1356, 28)] },

{ id: '02', name: 'Big bleed', note: 'Same sky, phones blown up and cropped by the bottom edge. Reads at thumbnail size.',
  bg: NIGHT, stars: { n: 100, h: 500 },
  phones: trio(S3, { y0: 1230, h0: 1640 }),
  text: heads(COPY.main, 96, 92) },

{ id: '03', name: 'Seam crossers', note: 'Angled phones that lean across the seams, so the three posts lock together on the grid.',
  bg: NIGHT, stars: { n: 120, h: 560 },
  phones: [
    { s: A.asleep, a: 'yawm030_pitchp00', x: 960, y: 930, h: 1160, r: -8, z: 2 },
    { s: A.steps, a: F, x: 1700, y: 950, h: 1060, r: 0, z: 1 },
    { s: A.payoff, a: 'yawp030_pitchm15', x: 2560, y: 930, h: 1160, r: 7, z: 2 }],
  text: heads(COPY.main) },

{ id: '04', name: 'Shield first', note: 'Opens on the real blocked-app screen (the thing people feel at 2 a.m.), then walk, then wake.',
  bg: sky(['#07080E', '#0E1630 45%', '#1E3060 80%', '#2A4480']), stars: { n: 160, h: 700 },
  phones: trio([A.shield, A.steps, A.payoff], { y0: 850, h0: 930 }),
  text: [...heads(['2 a.m. you<br><b>doesn’t get a vote.</b>', COPY.main[1], COPY.main[2]]), cta(1356, 28)] },

{ id: '05', name: 'Black like the site', note: 'Pure black with faint stars, matching locturne.com’s hero. Flat App Store badge on tile 3.',
  bg: ['#000'], stars: { n: 140, h: 1440, max: 2.4 },
  phones: trio(S3, { y0: 860, h0: 940 }),
  text: heads(COPY.main),
  over: [badge(T[2], 1342, 300)] },

{ id: '06', name: 'Moonrise', note: 'One big moon rising behind all three phones, joining the tiles. Uses the site’s moon photo (no glow).',
  bg: sky(['#080B18', '#0F1838 50%', '#1A2A58']), stars: { n: 150, h: 700 },
  under: [{ src: `${LAND}/sky/moon.webp`, css: { left: 1620 - 1100 + 'px', top: '640px', width: '2200px', opacity: .9, zIndex: 0 } }],
  phones: trio(S3, { y0: 870, h0: 960 }),
  text: [...heads(COPY.main), cta(1356, 28, '#EDEBE6', 'rgba(8,12,28,.55)')] },

{ id: '07', name: 'Daylight', note: 'The light periwinkle field from the store-screenshot study, navy type. The odd one out on a dark feed.',
  bg: ['radial-gradient(120% 90% at 50% 10%, #EEF3FC 0%, #D6E1F7 45%, #B9CBF0 100%)'], grain: false,
  phones: trio(S3, { y0: 850, h0: 930 }).map(p => ({ ...p, so: .28 })),
  text: [...heads(COPY.main, 104, 88, { color: '#0B1428' }).map(t => ({ ...t, html: t.html.replace(/<b>/g, '<b style="color:#3A5FBF">') })),
    cta(1356, 28, '#fff', '#0B1428')] },

{ id: '08', name: 'Night into day', note: 'A stronger ramp: tile 1 is near-black midnight, tile 3 is bright blue hour. The story is in the light.',
  bg: sky(['#05060A', '#101A3C 35%', '#3D5FA0 70%', '#8EABDD'], '#05060A', '62%'), stars: { n: 110, h: 620 },
  phones: trio(S3, { y0: 850, h0: 930 }),
  text: [...heads(COPY.main), cta(1356, 28, '#0B1428', 'rgba(255,255,255,.85)')] },

{ id: '09', name: 'Loc peeks', note: 'Loc’s silhouette peeks up from the bottom corner of tile 3, next to the payoff phone. The mascot appears once.',
  bg: NIGHT, stars: { n: 120, h: 560 },
  over: [{ src: '../store-shots/loc-peek-eyes.svg', css: { left: '2600px', top: '1095px', width: '560px', zIndex: 3 } }],
  phones: trio(S3, { y0: 850, h0: 930, dx: [0, 0, -150] }),
  text: heads(COPY.main) },

{ id: '10', name: 'Headline below', note: 'Phones drop in from the top edge and the words sit low, with numbered kickers 1, 2, 3.',
  bg: sky(['#0B1024', '#142049 40%', '#22376E 75%', '#2E4A86'], '#0A0E1E', '55%'), stars: { n: 80, h: 400 },
  phones: trio(S3, { y0: 430, h0: 1240 }),
  text: [...kick(['01 · Night', '02 · Morning', '03 · Up'], 1105, 24), ...heads(COPY.main, 1160, 80)] },

{ id: '11', name: 'Timeline', note: 'A thin line runs through all three posts like a night’s timeline. Big times are the headlines.',
  bg: NIGHT, stars: { n: 110, h: 520 },
  phones: trio(S3, { y0: 925, h0: 900 }),
  text: [
    { x: 1620, y: 300, w: 3240, size: 10, html: '<div style="height:2px;background:linear-gradient(90deg,rgba(237,235,230,0),rgba(237,235,230,.35) 8%,rgba(237,235,230,.35) 92%,rgba(237,235,230,0))"></div>' },
    ...T.map(x => ({ x, y: 291, w: 20, size: 10, html: '<div style="width:20px;height:20px;border-radius:50%;background:#EDEBE6"></div>' })),
    ...heads(['11:42 <span style="font-weight:500;opacity:.6">pm</span>', '7:01 <span style="font-weight:500;opacity:.6">am</span>', '7:04 <span style="font-weight:500;opacity:.6">am</span>'], 120, 112).map(t => ({ ...t, html: t.html.replace('class="h"', 'class="h" style="font-weight:700"') })),
    ...T.map((x, i) => ({ x, y: 344, size: 38, html: `<div class="s">${['Your apps fall asleep.', 'Walk 200 steps.', 'They’re awake. So are you.'][i]}</div>` })),
    cta(1380, 28)] },

{ id: '12', name: 'Fanned trio', note: 'Maximum overlap: three phones fanned so each one crosses a seam. Busiest on the grid, most "one post".',
  bg: NIGHT, stars: { n: 120, h: 560 },
  phones: [
    { s: A.asleep, a: 'yawm045_pitchp15', x: 830, y: 960, h: 1180, r: -9, z: 1 },
    { s: A.steps, a: F, x: 1620, y: 930, h: 1120, r: 0, z: 3 },
    { s: A.payoff, a: 'yawp045_pitchp15', x: 2410, y: 960, h: 1180, r: 9, z: 1 }],
  text: heads(COPY.main) },

{ id: '13', name: 'Brand intro', note: 'Tile 1 is the app icon and name (who we are). Tiles 2 and 3 show how it works, with a flat badge on 3.',
  bg: NIGHT, stars: { n: 140, h: 700 },
  under: [{ src: '../../assets/images/icon.png', css: { left: 540 - 210 + 'px', top: '440px', width: '420px', borderRadius: '94px', zIndex: 1,
    boxShadow: '0 24px 60px rgba(0,0,0,.5)' } }],
  phones: trio([null, A.steps, A.payoff], { y0: 850, h0: 930 }).slice(1),
  text: [
    { x: 540, y: 950, size: 104, html: '<div class="h" style="font-weight:800;letter-spacing:-.035em">Locturne</div>' },
    { x: 540, y: 1090, size: 44, w: 820, html: '<div class="s">Your apps sleep at bedtime and wake when you get out of bed.</div>' },
    ...heads(COPY.main).slice(1)],
  over: [badge(T[2], 1342, 300)] },

{ id: '14', name: 'Tilted 3D', note: 'Every phone at a different dynamic 3D angle. Premium on social; Apple’s guidelines prefer straight-on.',
  bg: NIGHT, stars: { n: 120, h: 560 },
  phones: [
    { s: A.asleep, a: 'yawm045_pitchp15', x: 560, y: 900, h: 1020, r: -12 },
    { s: A.steps, a: 'yawp030_pitchm15', x: 1620, y: 900, h: 1020, r: 10 },
    { s: A.payoff, a: 'yawm030_pitchm15', x: 2690, y: 900, h: 1020, r: -6 }],
  text: [...heads(COPY.main), cta(1356, 28)] },

{ id: '15', name: 'Quiet', note: 'Apple-style restraint: black, short three-word lines under smaller phones, lots of empty space.',
  bg: ['radial-gradient(70% 60% at 50% 30%, #0E1326 0%, #050608 70%)'], stars: { n: 60, h: 900, max: 2 },
  phones: trio(S3, { y0: 610, h0: 900 }),
  text: [...heads(COPY.short.map(s => `<b>${s}</b>`), 1150, 72), ...T.map((x, i) => ({ x, y: 1250, size: 34,
    html: `<div class="s">${['Apps sleep at bedtime.', '200 steps in the morning.', 'Search Locturne on the App Store.'][i]}</div>` }))] },
];
if (typeof module !== 'undefined') module.exports = VERSIONS;
