// Night path, ten ways (user, 2026-11-03: picked "Night path" from the first twenty, plus the sky tint
// of "Sky preview"; the other nineteen were deleted). The moons are stops on a path; the stretch
// you've walked is solid, the rest dashed. The worn moon's sky tints the top of the page, and
// tapping a moon you own previews its sky there. Tap a stop: a pop-over points at it.
// Each take: name, desc, build(ctx) → content, detail(slot, el, ctx), optional peek/demo.
/* global $, wait, anim, tap, drag, scrollBy, phone, state, SLOTS, S, A, MORN, lineOf, pct, tileHTML, headHTML */

document.head.append($(`<style>
  .pad { padding-top: 78px; }
  .vp .backdrop { position: absolute; inset: 0; }
  .vp .backdrop img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: .55; }
  .vp .backdrop::after { content: ''; position: absolute; inset: 0; background: linear-gradient(#0000 0%, #000a 45%, #000 72%); }
  .vp .scroll { scrollbar-width: none; }
  .map { position: relative; }
  .map svg.path { position: absolute; left: 0; top: 0; overflow: visible; }
  .pnode { position: absolute; width: 0; height: 0; cursor: pointer; }
  .pnode .tile { position: absolute; left: calc(var(--s) / -2); top: calc(var(--s) / -2); border-radius: 50%; }
  .pnode .tile.wearing { border-width: 2px; }
  .vp.square .pnode .tile { border-radius: 20px; }
  .pnode .nm { position: absolute; font-size: 14px; white-space: nowrap; color: var(--text); }
  .pnode.lk .nm { color: var(--text2); }
  .pnode .nm small { display: block; font-size: 12px; color: var(--text2); margin-top: 2px; }
  .lb-under .nm { top: calc(var(--s) / 2 + 8px); left: 0; transform: translateX(-50%); text-align: center; }
  .lb-right .nm { left: calc(var(--s) / 2 + 12px); top: 0; transform: translateY(-50%); }
  .lb-left .nm { right: calc(var(--s) / 2 + 12px); top: 0; transform: translateY(-50%); text-align: right; }
  .lb-card .nm { left: calc(var(--s) / 2 + 14px); top: 0; transform: translateY(-50%); width: 252px; padding: 12px 14px; border-radius: 18px; background: rgba(255,255,255,.05); border: 1px solid var(--edge); white-space: normal; }
  .lb-card .nm b { font-size: 15px; } .lb-card .bar { width: 100%; margin-top: 8px; height: 4px; }
  .here { position: absolute; width: 12px; height: 12px; margin: -6px 0 0 -6px; border-radius: 50%; background: #fff; border: 3px solid #000; }
  .herepill { position: absolute; transform: translate(-100%, -50%); margin-left: -14px; padding: 5px 10px; border-radius: 999px; background: rgba(255,255,255,.12); font-size: 12px; font-weight: 600; white-space: nowrap; }
  .overhead { position: absolute; left: 0; right: 0; top: 0; z-index: 3; padding-top: 78px; background: linear-gradient(#000e 70%, #0000); }
  .hscroll { overflow-x: auto; overflow-y: hidden; scrollbar-width: none; }

  .pop { position: absolute; z-index: 41; width: 230px; border-radius: 22px; background: #232327; padding: 16px 18px; text-align: center; transform-origin: var(--ox) var(--oy); }
  .pop::after { content: ''; position: absolute; left: calc(var(--ax) - 9px); width: 18px; height: 18px; background: #232327; transform: rotate(45deg); border-radius: 3px; }
  .pop.up::after { bottom: -7px; } .pop.dn::after { top: -7px; }
  .pop .pt { font-size: 17px; font-weight: 700; } .pop .pl { color: var(--text2); font-size: 14px; margin-top: 3px; }
  .pop .bar { width: 100%; margin-top: 12px; }
  .pop .wear { position: relative; z-index: 1; margin-top: 12px; width: 100%; height: 42px; border-radius: 21px; background: #fff; color: #000; font-weight: 600; }
</style>`));

const relRect = (el) => { const r = el.getBoundingClientRect(), p = phone.getBoundingClientRect(); return { x: r.left - p.left, y: r.top - p.top, w: r.width, h: r.height }; };

// A pop-over pointing at the stop.
async function detailPop(s, el) {
  const src = el.querySelector('.tile') || el, r = relRect(src), cx = r.x + r.w / 2, w = 230;
  const catcher = $('<div class="scrim" style="background:rgba(0,0,0,.25)"></div>'); phone.append(catcher);
  const up = r.y > 330, left = Math.max(14, Math.min(390 - w - 14, cx - w / 2));
  const pop = $(`<div class="pop ${up ? 'up' : 'dn'}"><div class="pt">${s.label}</div><div class="pl">${s.owned && s.id === state.worn ? 'Wearing' : lineOf(s)}</div>
    ${!s.owned && s.left ? `<div class="bar"><b style="width:${pct(s)}%"></b></div>` : ''}${s.owned && s.id !== state.worn ? '<button class="wear">Wear</button>' : ''}</div>`);
  phone.append(pop);
  const h = pop.offsetHeight, top = up ? r.y - h - 12 : r.y + r.h + 12;
  Object.assign(pop.style, { left: left + 'px', top: top + 'px' });
  pop.style.setProperty('--ax', cx - left + 'px'); pop.style.setProperty('--ox', cx - left + 'px'); pop.style.setProperty('--oy', up ? '100%' : '0');
  anim(catcher, [{ opacity: 0 }, { opacity: 1 }], { duration: 200 });
  await anim(pop, [{ transform: 'scale(.4)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 340, easing: 'cubic-bezier(.34,1.35,.64,1)' });
  return { wear: pop.querySelector('.wear'), dismiss: catcher, close: async () => {
    anim(catcher, [{ opacity: 1 }, { opacity: 0 }], { duration: 200 }).then(() => catcher.remove());
    await anim(pop, [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(.6)', opacity: 0 }], { duration: 180 }); pop.remove();
  } };
}
// Tapping a moon you own also turns the sky behind the path into its sky, till you close the pop-over.
async function pathDetail(s, el, ctx) {
  if (s.owned) ctx.root.sky(s.id);
  const d = await detailPop(s, el), close = d.close;
  d.close = async (worn) => { if (!worn && s.owned) ctx.root.sky(state.worn); await close(); };
  return d;
}

// ───────── Path geometry ─────────
// One segment between two stops: a straight line, or a curve leaving vertically ('v') or sideways ('h').
function seg(a, b, shape, k) {
  if (shape === 'line') return { d: `M${a}L${b}`, at: (t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t] };
  const c1 = shape === 'h' ? [a[0] + k, a[1]] : [a[0], a[1] + k], c2 = shape === 'h' ? [b[0] - k, b[1]] : [b[0], b[1] - k];
  const at = (t) => [0, 1].map((j) => { const u = 1 - t; return u * u * u * a[j] + 3 * u * u * t * c1[j] + 3 * u * t * t * c2[j] + t * t * t * b[j]; });
  return { d: `M${a}C${c1} ${c2} ${b}`, at };
}
const WALKED = 2; // whole segments walked: Moonlight → Deep Sea → Harvest; then part of the way to Morning 7.
const subLine = (s) => (s.owned ? (s.id === state.worn ? 'Wearing' : `Morning ${s.n || 0}`) : s.left ? `${s.left} more` : '');
const sideFor = (x) => (x > 195 ? 'left' : 'right');

/**
 * Builds one take: the sky backdrop, the header, and a map of stops at `pts` joined by segments.
 * opts: pts, w/h (map size), shape, k, size (stop), label ('under' | 'right' | 'left' | 'alt' | 'auto' | 'card'),
 * walk (share of the third segment walked), rest/walked (SVG for the unwalked and walked path), extra (map HTML),
 * square (rounded-square stops), horizontal, overhead (header pinned over a scroll that starts at the bottom).
 */
function pathTake(o) {
  return (ctx) => {
    const { pts, shape = 'line', k = 60, size = 74, walk = 0.5 } = o;
    const segs = pts.slice(1).map((p, i) => seg(pts[i], p, shape, k));
    const here = segs[WALKED].at(walk);
    const w = o.w ?? 390, h = o.h ?? Math.max(...pts.map((p) => p[1])) + 130;
    const restSVG = o.rest ? o.rest(segs) : `<g fill="none" stroke="rgba(255,255,255,.22)" stroke-width="2" stroke-dasharray="5 7">${segs.map((s) => `<path d="${s.d}"/>`).join('')}</g>`;
    const walkSVG = o.walked ? o.walked(segs, walk) : `<g fill="none" stroke="rgba(255,255,255,.8)" stroke-width="2" stroke-linecap="round">${segs.slice(0, WALKED + 1).map((s, i) => `<path d="${s.d}" pathLength="1" stroke-dasharray="${i < WALKED ? '1 0' : `${walk} 1`}"/>`).join('')}</g>`;
    const nodes = SLOTS.map((s, i) => {
      const [x, y] = pts[i];
      const lb = o.label === 'alt' ? (i % 2 ? 'left' : 'right') : o.label === 'auto' ? sideFor(x) : (o.label ?? 'under');
      const name = lb === 'card'
        ? `<b>${s.label}</b><small>${s.owned ? (s.id === state.worn ? 'Wearing' : lineOf(s)) : lineOf(s)}</small>${!s.owned && s.left && i === 3 ? `<div class="bar"><b style="width:${pct(s)}%"></b></div>` : ''}`
        : `${s.label}${lb !== 'under' ? `<small>${subLine(s)}</small>` : ''}`;
      return `<div class="pnode cell ${s.owned ? '' : 'lk'} lb-${lb}" data-id="${s.id}" style="left:${x}px;top:${y}px;--s:${size}px">${tileHTML(s, size)}<div class="nm">${name}</div></div>`;
    }).join('');
    const map = `<div class="map" style="width:${w}px;height:${h}px">${o.extra ? o.extra(pts, segs) : ''}<svg class="path" width="${w}" height="${h}">${restSVG}${walkSVG}</svg>
      ${o.noHere ? '' : `<div class="here" style="left:${here[0]}px;top:${here[1]}px"></div>`}${o.herePill ? `<div class="herepill" style="left:${here[0]}px;top:${here[1]}px">You · Morning ${MORN}</div>` : ''}${nodes}</div>`;
    const root = $(`<div class="vp ${o.square ? 'square' : ''}" style="position:absolute;inset:0"><div class="backdrop"><img src="${A(state.worn).sky}"></div></div>`);
    let inner;
    if (o.horizontal) inner = $(`<div class="scroll pad">${headHTML()}<div class="hscroll">${map}</div></div>`);
    else if (o.overhead) { inner = $(`<div class="scroll">${map}</div>`); }
    else inner = $(`<div class="scroll pad">${headHTML()}${map}</div>`);
    root.append(inner);
    if (o.overhead) {
      root.append($(`<div class="overhead">${headHTML()}</div>`));
      requestAnimationFrame(() => (inner.scrollTop = inner.scrollHeight));
    }
    root.sky = (id) => {
      const bd = root.querySelector('.backdrop'), old = [...bd.querySelectorAll('img')], img = $(`<img src="${A(id).sky}" style="opacity:0">`);
      bd.append(img); anim(img, [{ opacity: 0 }, { opacity: 0.55 }], { duration: 500 }).then(() => old.forEach((x) => x.remove()));
    };
    return root;
  };
}

// Deterministic little stars for the star-chart take.
function stars(n, w, h, seed = 7) {
  let s = seed; const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  return Array.from({ length: n }, () => `<i style="position:absolute;left:${(r() * w).toFixed(0)}px;top:${(r() * h).toFixed(0)}px;width:${r() < .2 ? 2 : 1.4}px;height:${r() < .2 ? 2 : 1.4}px;border-radius:50%;background:rgba(255,255,255,${(0.25 + r() * 0.5).toFixed(2)})"></i>`).join('');
}
// Raccoon paw prints along a segment, turned along it.
function paws(segList, upto) {
  let out = '', side = 1;
  segList.forEach((sg, i) => {
    const end = i < WALKED ? 1 : i === WALKED ? upto : 0;
    for (let t = 0.12; t < end; t += 0.15) {
      const [x, y] = sg.at(t), [x2, y2] = sg.at(Math.min(1, t + 0.01)), ang = Math.atan2(y2 - y, x2 - x) * 180 / Math.PI + 90;
      side = -side;
      out += `<g transform="translate(${x.toFixed(1)},${y.toFixed(1)}) rotate(${ang.toFixed(0)}) translate(${side * 6},0)" fill="rgba(255,255,255,.85)"><ellipse cx="0" cy="2" rx="3.6" ry="4.2"/><circle cx="-4.2" cy="-3.6" r="1.5"/><circle cx="-1.5" cy="-5.6" r="1.5"/><circle cx="1.5" cy="-5.6" r="1.5"/><circle cx="4.2" cy="-3.6" r="1.5"/></g>`;
    }
  });
  return out;
}

const winding = (amp, step, top = 80, freq = 1.25, cx = 195) => SLOTS.map((s, i) => [Math.round(cx + amp * Math.sin(i * freq)), top + i * step]);
const scaleY = (() => { const n = [0, 1, 3, 7, 14, 30, 50, 100, 150, 200, 350]; return SLOTS.map((s, i) => (i < n.length ? 80 + Math.sqrt(n[i]) * 118 : 80 + Math.sqrt(350) * 118 + (i - n.length + 1) * 130)); })();
const peekDown = async (ctx) => { const sc = ctx.root.querySelector('.scroll'); await scrollBy(sc, 160); await wait(200); };

const VARIANTS = [
  // 1
  { name: 'Zigzag', desc: 'The original: stops step left and right down the sky, straight lines between them. Walked stretch solid, the rest dashed, a dot where you are now.',
    build: pathTake({ pts: SLOTS.map((s, i) => [i % 2 ? 270 : 120, 70 + i * 125]) }), peek: peekDown, detail: pathDetail },
  // 2
  { name: 'Winding road', desc: 'One soft curve snaking down the page, stops sitting on its bends, names beside them on the open side.',
    build: pathTake({ pts: winding(105, 135), shape: 'v', k: 70, label: 'auto' }), peek: peekDown, detail: pathDetail },
  // 3
  { name: 'Centre line', desc: 'A straight line down the middle, stops on it, names alternating left and right. The most centred and the calmest.',
    build: pathTake({ pts: SLOTS.map((s, i) => [195, 80 + i * 120]), size: 66, label: 'alt' }), peek: peekDown, detail: pathDetail },
  // 4
  { name: 'Star chart', desc: 'The stops scattered like a constellation on a real star chart: thin lines, small stops, tiny stars around them.',
    build: pathTake({ pts: [90, 250, 150, 300, 110, 230, 320, 140, 260, 90, 200, 310, 150, 260].map((x, i) => [x, 70 + i * 118 + [0, 20, -10, 15, -5, 25, 0, -15, 10, 20, -10, 5, 15, 0][i]]), size: 58,
      rest: (segs) => `<g fill="none" stroke="rgba(255,255,255,.2)" stroke-width="1.2" stroke-dasharray="2 6">${segs.map((s) => `<path d="${s.d}"/>`).join('')}</g>`,
      walked: (segs, f) => `<g fill="none" stroke="rgba(255,255,255,.75)" stroke-width="1.4">${segs.slice(0, 3).map((s, i) => `<path d="${s.d}" pathLength="1" stroke-dasharray="${i < 2 ? '1 0' : `${f} 1`}"/>`).join('')}</g>`,
      extra: (pts) => stars(120, 390, Math.max(...pts.map((p) => p[1])) + 130) }), peek: peekDown, detail: pathDetail },
  // 5
  { name: 'To scale', desc: 'Stops spaced by how many mornings away they really are, so the long gaps look long. A pill marks where you are: Morning 5.',
    build: pathTake({ pts: SLOTS.map((s, i) => [150, scaleY[i]]), size: 62, label: 'right', herePill: true, walk: (Math.sqrt(5) - Math.sqrt(3)) / (Math.sqrt(7) - Math.sqrt(3)) }), peek: peekDown, detail: pathDetail },
  // 6
  { name: 'Paw prints', desc: 'Loc\'s paw prints mark the stretch you\'ve walked; the rest of the way is faint dots. Winding path.',
    build: pathTake({ pts: winding(95, 135, 80, 1.1), shape: 'v', k: 70, label: 'auto', noHere: true,
      rest: (segs) => `<g fill="none" stroke="rgba(255,255,255,.22)" stroke-width="2.4" stroke-linecap="round" stroke-dasharray="0.1 10">${segs.map((s) => `<path d="${s.d}"/>`).join('')}</g>`,
      walked: (segs, f) => paws(segs, f) }), peek: peekDown, detail: pathDetail },
  // 7
  { name: 'Climb up', desc: 'The path runs upward: you start at the bottom and climb toward the moons ahead, so the page opens where you are and the rest rises above you.',
    build: pathTake({ pts: SLOTS.map((s, i) => [Math.round(195 + 100 * Math.sin(i * 1.25)), 1780 - i * 130]), shape: 'v', k: -70, label: 'auto', overhead: true }),
    detail: pathDetail },
  // 8
  { name: 'Sideways', desc: 'The path runs left to right; you swipe along it. Stops bob up and down a wave, names under them.',
    build: pathTake({ pts: SLOTS.map((s, i) => [80 + i * 130, i % 2 ? 330 : 200]), w: 80 + 13 * 130 + 80, h: 560, shape: 'h', k: 70, horizontal: true }),
    peek: async (ctx) => { const sc = ctx.root.querySelector('.hscroll'), from = sc.scrollLeft; await drag(sc, -120, 0, 650, (e) => { sc.scrollLeft = from + 140 * e; }); await wait(250); },
    detail: pathDetail },
  // 9
  { name: 'Path with cards', desc: 'A line down the left with a card beside every stop: its name, when it came or how far off, and a bar on the next one.',
    build: pathTake({ pts: SLOTS.map((s, i) => [56, 80 + i * 110]), size: 60, label: 'card', square: true }), peek: peekDown, detail: pathDetail },
  // 10
  { name: 'Night road', desc: 'A wide soft road winds down the page with a dashed centre line; the stretch you\'ve covered is lit a little brighter.',
    build: pathTake({ pts: winding(90, 140, 80, 1.4), shape: 'v', k: 75, size: 66, label: 'auto', noHere: true,
      rest: (segs) => `<g fill="none" stroke="rgba(255,255,255,.07)" stroke-width="42" stroke-linecap="round">${segs.map((s) => `<path d="${s.d}"/>`).join('')}</g>`,
      walked: (segs, f) => `<g fill="none" stroke="rgba(255,255,255,.16)" stroke-width="42" stroke-linecap="round">${segs.slice(0, 3).map((s, i) => `<path d="${s.d}" pathLength="1" stroke-dasharray="${i < 2 ? '1 0' : `${f} 1`}"/>`).join('')}</g>
        <g fill="none" stroke="rgba(255,255,255,.35)" stroke-width="2" stroke-dasharray="8 12">${segs.map((s) => `<path d="${s.d}"/>`).join('')}</g>` }), peek: peekDown, detail: pathDetail },
];
