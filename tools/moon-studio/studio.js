// The moon studio's editor: the moon list, the preview, the inspector and the collection, over one copy
// of moons.json held here until it's saved. Every edit can be undone; drafts survive a reload.
import * as R from './render.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const clone = (x) => JSON.parse(JSON.stringify(x));
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const round = (v, n = 3) => Math.round(v * 10 ** n) / 10 ** n;
const isHex = (h) => /^#[0-9A-Fa-f]{6}$/.test(h);

/**
 * The ladder's slots, as moon-ladder.ts earns them (LADDER_MORNINGS, ECLIPSE_DAYS, then SECRET_RULES in
 * order from SECRET_FROM). The secrets are never hinted at in the app: these words are only for here.
 */
const SLOTS = [
  ['Morning 1', 'your first morning'], ['Morning 3', ''], ['Morning 7', 'a week'], ['Morning 14', ''], ['Morning 30', 'a month'],
  ['Morning 50', ''], ['Morning 100', ''], ['Morning 150', ''], ['Morning 200', ''], ['Week 50', '350 days in, before renewal'],
  ['Secret · Early', 'up before 5:00 a.m.'],
  ['Secret · Coke', 'woke on a Coke barcode'],
  ['Secret · Far', 'place 2+ km from start'],
];
/** Where the secrets start in the ladder (moon-ladder.ts SECRET_FROM). */
const SECRET_FROM = 10;
const KINDS = { today: 'Starting', real: 'Real', creative: 'Creative', twin: 'Twin' };

// ——— State. ———
let data = null; // moons.json being edited
let saved = null; // moons.json as last saved (string)
let savedById = new Map();
let status = { pending: [], other: false, needsBake: false };
let sel = null;
const ui = { mode: 'moon', view: 'home', compare: 'off', kind: 'all', search: '', closed: new Set(), refs: [] };
try {
  Object.assign(ui, JSON.parse(localStorage.getItem('moon-studio-ui') || '{}'), { refs: [] });
  ui.closed = new Set(ui.closed || []);
} catch {}
const saveUI = () => {
  try {
    localStorage.setItem('moon-studio-ui', JSON.stringify({ ...ui, closed: [...ui.closed], refs: undefined, sel }));
  } catch {}
};

const cur = () => data.moons.find((m) => m.id === sel) ?? data.moons[0];
const byId = (id) => data.moons.find((m) => m.id === id);
const savedData = () => JSON.parse(saved);
const dirty = () => JSON.stringify(data) !== saved;

// ——— Undo. Edits with the same key in quick succession (a slider drag, typing) are one step. ———
let undo = [], redo = [], lastKey = null, lastAt = 0;
const snap = () => JSON.stringify({ data, sel });
function edit(fn, { key = null, rebuild = false, from = null } = {}) {
  const now = performance.now();
  if (!(key && key === lastKey && now - lastAt < 1500)) {
    undo.push(snap());
    if (undo.length > 400) undo.shift();
    redo = [];
  }
  lastKey = key;
  lastAt = now;
  fn();
  changed({ rebuild, from });
}
function restore(s) {
  const st = JSON.parse(s);
  data = st.data;
  sel = byId(st.sel) ? st.sel : data.moons[0].id;
  lastKey = null;
  changed({ rebuild: true });
}
function doUndo() {
  if (!undo.length) return;
  redo.push(snap());
  restore(undo.pop());
  toast('Undone');
}
function doRedo() {
  if (!redo.length) return;
  undo.push(snap());
  restore(redo.pop());
  toast('Redone');
}

// Re-rendering is batched to one frame.
const pending = new Set();
let frame = 0;
function queue(...parts) {
  parts.forEach((p) => pending.add(p));
  if (!frame) frame = requestAnimationFrame(flush);
}
function flush() {
  frame = 0;
  if (!data) return;
  const p = new Set(pending);
  pending.clear();
  if (p.has('list')) renderList();
  if (p.has('stage')) renderStage();
  if (p.has('inspector')) renderInspector();
  if (p.has('collection')) renderCollection();
  if (p.has('status')) renderStatus();
}
let draftTimer = 0;
function changed({ rebuild = false, from = null } = {}) {
  clearTimeout(draftTimer);
  draftTimer = setTimeout(saveDraft, 400);
  queue('list', 'status', ui.mode === 'collection' ? 'collection' : 'stage');
  // The inspector is rebuilt for structural edits and edits made elsewhere (a drag, undo), not while typing in it.
  if (rebuild || from == null) queue('inspector');
  else {
    // Edits made in the inspector itself: keep its JSON box current without rebuilding the panel.
    const j = $('#f-json');
    if (j && document.activeElement !== j) j.value = JSON.stringify(cur(), null, 2);
  }
}
function select(id) {
  if (!byId(id)) return;
  if (id !== sel) picker = null;
  sel = id;
  saveUI();
  queue('list', 'stage', 'inspector');
  if (ui.mode === 'collection') queue('collection');
  requestAnimationFrame(() => $('.item.sel')?.scrollIntoView({ block: 'nearest' }));
}

// ——— Drafts: unsaved edits kept in the browser in case the page is closed. ———
function saveDraft() {
  try {
    if (dirty()) localStorage.setItem('moon-studio-draft', JSON.stringify({ data, base: saved, at: Date.now() }));
    else localStorage.removeItem('moon-studio-draft');
  } catch {}
}

// ——— Toast. ———
let toastTimer;
function toast(msg, bad = false) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.toggle('bad', bad);
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), bad ? 4200 : 1600);
}

// ——— Colours. ———
const hex = R.hex, toHex = R.toHex;
function rgbToHsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min, s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}
function hslToRgb([h, s, l]) {
  h = ((h % 360) + 360) % 360 / 360;
  if (s === 0) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = (t) => {
    t = (t + 1) % 1;
    return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p;
  };
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
}
/** Shifts a colour's hue (degrees), saturation and lightness (-1..1, proportional). */
function adjust(h, { hue = 0, sat = 0, light = 0 }) {
  let [H, S, L] = rgbToHsl(hex(h));
  H += hue;
  S = clamp(sat >= 0 ? S + (1 - S) * sat : S * (1 + sat), 0, 1);
  L = clamp(light >= 0 ? L + (1 - L) * light : L * (1 + light), 0, 1);
  return toHex(hslToRgb([H, S, L]));
}
/** Every colour a moon has, mapped through `f`. */
function mapColours(m, f) {
  const out = clone(m);
  const list = (a) => a && a.map(f);
  out.sky = list(m.sky); out.moon = list(m.moon); out.glow = f(m.glow);
  if (m.orb) out.orb = list(m.orb);
  if (m.tint) out.tint.stops = list(m.tint.stops);
  if (m.saturn) out.saturn = f(m.saturn);
  if (m.twin) { out.twin.moon = list(m.twin.moon); out.twin.glow = f(m.twin.glow); }
  return out;
}
/** A little picture of a moon for the list: its sky, its moon, its twin. */
function chip(m) {
  const sky = [...m.sky].reverse();
  const moon = `radial-gradient(circle at 42% 36%, ${m.moon[m.moon.length - 1]}, ${m.moon[0]} 78%)`;
  const twin = m.twin ? `<b style="left:${clamp(m.twin.x, 0, 1) * 34 - 5.5}px;top:${m.twin.y === 'rise' ? 22 : clamp(m.twin.y, 0, 1.1) * 30 - 5}px;background:radial-gradient(circle at 40% 35%, ${m.twin.moon[m.twin.moon.length - 1]}, ${m.twin.moon[0]})"></b>` : '';
  return `<div class="chip-moon" style="background:linear-gradient(180deg, ${sky.join(', ')})"><i style="background:${moon};left:${(m.cx ?? 0.5) * 100}%;transform:scale(${m.scale ?? 1})"></i>${twin}</div>`;
}

/** Where a moon is used: its ladder slot, rare, limited, starting. */
function uses(id) {
  const out = [];
  const i = data.ladder.indexOf(id);
  if (i >= 0) out.push({ kind: 'slot', label: i >= SECRET_FROM ? 'S' : String(i + 1), title: SLOTS[i][0] });
  if ((data.rare ?? []).includes(id)) out.push({ kind: 'rare', label: 'R', title: 'A rare moon (1 in 365)' });
  if ((data.limited ?? []).some((l) => l.id === id)) out.push({ kind: 'lim', label: 'L', title: 'A limited moon' });
  return out;
}

// ——— The list. ———
function visible() {
  const q = ui.search.trim().toLowerCase();
  return data.moons.filter((m) => {
    if (q && !`${m.name} ${m.id} ${m.tag} ${m.note ?? ''}`.toLowerCase().includes(q)) return false;
    if (ui.kind === 'used') return m.original || uses(m.id).length > 0;
    return ui.kind === 'all' || m.kind === ui.kind;
  });
}
function renderList() {
  const list = $('#list');
  const ms = visible();
  if (!ms.length) {
    list.innerHTML = '<li class="list-empty">No moons match.</li>';
    return;
  }
  list.innerHTML = ms.map((m) => {
    const s = savedById.get(m.id), unsaved = s !== JSON.stringify(m), unbaked = !unsaved && status.pending.includes(m.id);
    return `<li class="item${m.id === sel ? ' sel' : ''}" data-id="${esc(m.id)}" draggable="true">
      ${chip(m)}
      <div class="item-text">
        <div class="item-name">${esc(m.name)}${unsaved ? '<span class="mark unsaved" title="Not saved yet"></span>' : unbaked ? '<span class="mark unbaked" title="Saved, not baked into the app yet"></span>' : ''}</div>
        <div class="item-tag">${esc(m.tag || KINDS[m.kind] || '')}</div>
      </div>
      <div class="badges">${m.original ? '<span class="badge" title="Everyone starts with this one">Start</span>' : ''}${uses(m.id).map((u) => `<span class="badge${u.kind === 'slot' ? ' in-slot' : ''}" title="${esc(u.title)}">${u.label}</span>`).join('')}</div>
    </li>`;
  }).join('');
}

// List: click to select, drag to reorder (or into a collection slot).
let dragId = null;
$('#list').addEventListener('click', (e) => {
  const it = e.target.closest('.item');
  if (it) select(it.dataset.id);
});
$('#list').addEventListener('dblclick', (e) => {
  if (e.target.closest('.item') && ui.mode === 'collection') setMode('moon');
});
$('#list').addEventListener('dragstart', (e) => {
  const it = e.target.closest('.item');
  if (!it) return;
  dragId = it.dataset.id;
  e.dataTransfer.setData('text/moon', dragId);
  e.dataTransfer.effectAllowed = 'copyMove';
  it.classList.add('dragging');
});
$('#list').addEventListener('dragend', () => {
  dragId = null;
  $$('.item').forEach((i) => i.classList.remove('dragging', 'drop-above', 'drop-below'));
});
$('#list').addEventListener('dragover', (e) => {
  const it = e.target.closest('.item');
  if (!it || !dragId) return;
  e.preventDefault();
  const r = it.getBoundingClientRect(), below = e.clientY > r.top + r.height / 2;
  $$('.item').forEach((i) => i.classList.remove('drop-above', 'drop-below'));
  it.classList.add(below ? 'drop-below' : 'drop-above');
});
$('#list').addEventListener('drop', (e) => {
  const it = e.target.closest('.item');
  if (!it || !dragId || it.dataset.id === dragId) return;
  e.preventDefault();
  const below = it.classList.contains('drop-below'), target = it.dataset.id, moving = dragId;
  edit(() => {
    const m = byId(moving);
    data.moons.splice(data.moons.indexOf(m), 1);
    data.moons.splice(data.moons.indexOf(byId(target)) + (below ? 1 : 0), 0, m);
  });
  toast('Moved');
});
$('#search').addEventListener('input', (e) => { ui.search = e.target.value; renderList(); if (ui.view === 'all') renderStage(); });
$('#kind-filter').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  ui.kind = b.dataset.k;
  $$('#kind-filter button').forEach((x) => x.classList.toggle('on', x === b));
  saveUI();
  renderList();
  if (ui.view === 'all') renderStage();
});

// ——— New, duplicate, delete. ———
function uniqueId(base) {
  base = base.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || 'moon';
  let id = base, n = 2;
  while (byId(id)) id = `${base}-${n++}`;
  return id;
}
function addMoon(m) {
  edit(() => {
    const at = data.moons.indexOf(cur()) + 1;
    data.moons.splice(at, 0, m);
    sel = m.id;
  }, { rebuild: true });
  saveUI();
  requestAnimationFrame(() => $('.item.sel')?.scrollIntoView({ block: 'nearest' }));
}
function newMoon() {
  const id = uniqueId('new-moon');
  addMoon({ id, name: 'New moon', kind: 'creative', tag: 'a new one', note: '', sky: ['#05060A', '#1C2A55', '#2C3F78'], moon: ['#5E6470', '#E6E9EE'], glow: '#AEB8CC' });
  toast('New moon');
  requestAnimationFrame(() => { const n = $('#f-name'); n?.focus(); n?.select(); });
}
function duplicate() {
  const m = clone(cur());
  delete m.original;
  if (m.kind === 'today') m.kind = 'creative';
  m.id = uniqueId(`${m.id}-copy`);
  m.name = `${m.name} copy`;
  addMoon(m);
  toast(`Duplicated as ${m.name}`);
}
let armed = 0;
function del() {
  const m = cur(), btn = $('#del-moon');
  if (m.original) return toast('The starting moon can’t be deleted', true);
  if (data.rare.includes(m.id) && data.rare.length === 1) return toast('This is the only rare moon: add another rare moon first (Collection)', true);
  if (!armed) {
    armed = setTimeout(() => { armed = 0; btn.classList.remove('armed'); btn.textContent = 'Delete'; }, 2500);
    btn.classList.add('armed');
    btn.textContent = 'Click to confirm';
    return;
  }
  clearTimeout(armed);
  armed = 0;
  btn.classList.remove('armed');
  btn.textContent = 'Delete';
  const i = data.moons.indexOf(m);
  edit(() => {
    data.moons.splice(i, 1);
    data.ladder = data.ladder.map((id) => (id === m.id ? null : id));
    data.limited = (data.limited ?? []).filter((l) => l.id !== m.id);
    sel = data.moons[Math.min(i, data.moons.length - 1)].id;
  }, { rebuild: true });
  toast(`Deleted ${m.name} (⌘Z to undo)`);
}
$('#new-moon').addEventListener('click', newMoon);
$('#dup-moon').addEventListener('click', duplicate);
$('#del-moon').addEventListener('click', del);

// ——— The stage. ———
const body = $('#stage-body');
function previews() {
  const m = cur(), out = [{ m, label: 'Editing', main: true }];
  if (ui.compare === 'saved') {
    const s = savedData().moons.find((x) => x.id === m.id);
    out.push(s ? { m: s, label: 'Saved' } : { m: null, label: 'Saved', empty: 'Not saved yet' });
  } else if (ui.compare === 'baked') {
    out.push({ m, label: 'Baked', baked: true, note: status.pending.includes(m.id) || savedById.get(m.id) !== JSON.stringify(m) ? 'images from the last bake' : 'what the app has' });
  } else if (ui.compare === 'start') {
    out.push({ m: data.moons.find((x) => x.original), label: 'Moonlight', note: 'the starting moon' });
  }
  return out;
}
function caption(p) {
  const m = p.m;
  const sub = p.main ? m.tag : p.note ?? m?.tag ?? '';
  return `<div class="preview-cap"><b>${esc(m ? m.name : p.label)}</b><span>${esc(sub) || '&nbsp;'}</span><span class="pill">${esc(p.label)}</span></div>`;
}
function fit(n, w, h, capH = 76) {
  const availW = body.clientWidth - 40 - (ui.refs.length ? 250 : 0) - (n - 1) * 48;
  const availH = body.clientHeight - 40 - capH;
  return Math.max(0.2, Math.min(availH / h, availW / n / w, 2.4));
}

function renderStage() {
  body.classList.toggle('with-refs', ui.refs.length > 0);
  body.classList.toggle('scroll', ui.view === 'all');
  const m = cur();
  if (!m) return;
  const ps = previews();
  if (ui.view === 'home') {
    const k = fit(ps.length, R.W, R.H);
    body.innerHTML = ps.map((p, i) => `<div class="preview">
      ${p.m ? `<div class="scaler" style="width:${R.W * k}px;height:${R.H * k}px"><div class="phone${p.main ? ' main' : ''}" data-i="${i}" style="transform:scale(${k})">${R.phoneHTML(p.m, { baked: p.baked, handles: p.main })}</div></div>`
        : `<div class="scaler" style="width:${R.W * k}px;height:${R.H * k}px;display:grid;place-items:center;border:1.5px dashed var(--line2);border-radius:${46 * k}px;color:var(--text3)">${esc(p.empty)}</div>`}
      ${caption(p)}</div>`).join('');
  } else if (ui.view === 'close') {
    // The bottom of the sky panel: the moon and a band of sky above it, zoomed.
    const g = R.geometry(m);
    const regionH = Math.min(R.PANEL, g.size * R.SHOWS + 110 + (m.twin && m.twin.y !== 'rise' ? Math.max(0, R.PANEL * (1 - m.twin.y)) : 0));
    const k = fit(ps.length, R.W, regionH);
    body.innerHTML = ps.map((p, i) => `<div class="preview">
      ${p.m ? `<div class="closeup" style="width:${R.W * k}px;height:${regionH * k}px"><div class="phone${p.main ? ' main' : ''}" data-i="${i}" style="transform:scale(${k});top:${-(R.PANEL - regionH) * k}px">${R.phoneHTML(p.m, { baked: p.baked, handles: p.main, home: false })}</div></div>`
        : `<div class="closeup" style="width:${R.W * k}px;height:${regionH * k}px;display:grid;place-items:center;color:var(--text3)">${esc(p.empty)}</div>`}
      ${caption(p)}</div>`).join('');
  } else if (ui.view === 'orb') {
    body.innerHTML = ps.map((p) => {
      if (!p.m) return `<div class="preview"><div class="bigorb-wrap" style="display:grid;place-items:center;border:1.5px dashed var(--line2);color:var(--text3)">${esc(p.empty)}</div>${caption(p)}</div>`;
      const c = R.orbColours(p.m);
      return `<div class="preview orb-stage">
        <div class="bigorb-wrap">${R.bigOrbHTML(p.m)}<svg viewBox="0 0 24 24"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z" fill="#fff"/></svg></div>
        <div class="orb-swatches">${c.map((x, i) => `<div><i style="background:${toHex(x)}"></i>C${i} ${toHex(x)}</div>`).join('')}</div>
        ${caption({ ...p, note: p.m.orb ? 'custom orb colours' : 'orb colours taken from the moon' })}</div>`;
    }).join('');
  } else if (ui.view === 'tile') {
    renderTiles(m);
  } else if (ui.view === 'all') {
    const k = 150 / R.W;
    body.innerHTML = `<div class="wall">${visible().map((x) => `<div class="wall-item${x.id === sel ? ' sel' : ''}" data-id="${esc(x.id)}">
      <div class="scaler mini-phone" style="width:${R.W * k}px;height:${R.H * k}px"><div class="phone" style="transform:scale(${k});border-radius:46px">${R.phoneHTML(x, { live: false })}</div></div>
      <span>${esc(x.name)}</span><small>${esc(x.tag)}</small></div>`).join('')}</div>`;
  }
  R.attach(body);
}

function renderTiles(m) {
  const sizes = [180, 110, 72];
  body.innerHTML = `<div class="tiles">
    <div class="tile-row">${sizes.map((s) => `<div><div class="tile owned" style="width:${s}px;height:${s}px;border-radius:${s * 0.2}px"><canvas data-icon="${s}"></canvas></div><div class="tile-cap">${s === 180 ? 'Earned' : ''}</div></div>`).join('')}
      <div><div class="tile" style="width:110px;height:110px;border-radius:22px"><canvas data-icon-locked="110"></canvas></div><div class="tile-cap">Not yet yours</div></div>
      ${ui.compare === 'baked' ? `<div><div class="tile owned" style="width:180px;height:180px;border-radius:36px"><img src="/assets/moons/icons/${esc(m.id)}.webp?v=${Date.now()}" width="${180 * 0.86}" alt="" onerror="this.replaceWith(Object.assign(document.createElement('span'),{textContent:'Not baked yet',style:'color:var(--text3);font-size:12px'}))"></div><div class="tile-cap">Baked icon</div></div>` : ''}
    </div>
    <div class="tile-page" title="The Moons page, with this moon worn">${tilePage(m)}</div>
    <div class="note" style="text-align:center;max-width:460px">The icon is the night icon with this moon’s art in its disc and its clouds in the orb’s lightest colour (C3), as bake-icons.py makes it. Pick “vs Baked” to see the baked one beside it.</div>
  </div>`;
  const draw = (c, s, locked, mm = m) => {
    const src = R.iconCanvas(mm, { locked });
    const w = Math.round(s * 0.86), dpr = Math.min(devicePixelRatio || 1, 2);
    c.width = c.height = w * dpr;
    c.style.width = c.style.height = `${w}px`;
    c.getContext('2d').drawImage(src, 0, 0, w * dpr, w * dpr);
  };
  $$('canvas[data-icon]', body).forEach((c) => draw(c, Number(c.dataset.icon), false));
  $$('canvas[data-icon-locked]', body).forEach((c) => draw(c, Number(c.dataset.iconLocked), true));
  $$('canvas[data-page]', body).forEach((c) => {
    const mm = byId(c.dataset.page);
    draw(c, 96, c.dataset.locked === '1', mm);
  });
}
function tilePage(m) {
  const ids = [m.id, ...data.ladder.filter((id) => id && id !== m.id)].slice(0, 9);
  return ids.map((id, i) => `<div class="tile${i < 5 ? ' owned' : ''}${i === 0 ? ' wearing' : ''}"><canvas data-page="${esc(id)}" data-locked="${i < 5 ? 0 : 1}"></canvas></div>`).join('');
}

body.addEventListener('click', (e) => {
  const w = e.target.closest('.wall-item');
  if (w) select(w.dataset.id);
});
body.addEventListener('dblclick', (e) => {
  if (e.target.closest('.wall-item')) setView('home');
});

// Dragging the moon (sideways) and the twin (anywhere); scrolling on them resizes.
let drag = null;
const readout = document.createElement('div');
readout.className = 'handle-readout';
readout.hidden = true;
document.body.appendChild(readout);
function showReadout(x, y, text) {
  readout.hidden = false;
  readout.style.position = 'fixed';
  readout.style.left = `${x}px`;
  readout.style.top = `${y - 14}px`;
  readout.textContent = text;
}
body.addEventListener('pointerdown', (e) => {
  const h = e.target.closest('.handle');
  if (!h || e.button !== 0) return;
  e.preventDefault();
  const phone = h.closest('.phone'), k = phone.getBoundingClientRect().width / R.W, m = cur();
  const g = R.geometry(m);
  drag = { which: h.dataset.handle, k, x0: e.clientX, y0: e.clientY, start: clone(m), g, axis: null };
  h.classList.add('active');
});
window.addEventListener('pointermove', (e) => {
  if (!drag) return;
  let dx = (e.clientX - drag.x0) / drag.k, dy = (e.clientY - drag.y0) / drag.k;
  if (e.shiftKey) {
    drag.axis ??= Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    if (drag.axis === 'x') dy = 0; else dx = 0;
  } else drag.axis = null;
  if (drag.which === 'moon') {
    const cx = round(clamp((drag.start.cx ?? 0.5) + dx / R.W, -0.3, 1.3));
    edit(() => { cur().cx = cx; }, { key: 'drag-moon', from: 'drag' });
    showReadout(e.clientX, e.clientY, `x ${cx.toFixed(3)}`);
  } else {
    const t0 = drag.start.twin, x = round(clamp(t0.x + dx / R.W, -0.5, 1.5));
    let y = t0.y;
    if (y !== 'rise' || Math.abs(dy) > 4) y = round(clamp(drag.g.twin.y / R.PANEL + dy / R.PANEL, -0.1, 1.4));
    edit(() => { const t = cur().twin; t.x = x; t.y = y; }, { key: 'drag-twin', from: 'drag' });
    showReadout(e.clientX, e.clientY, `x ${x.toFixed(3)}  y ${y === 'rise' ? 'rise' : y.toFixed(3)}`);
  }
});
window.addEventListener('pointerup', () => {
  if (!drag) return;
  drag = null;
  readout.hidden = true;
  lastKey = null;
  queue('inspector');
});
let wheelTimer;
body.addEventListener('wheel', (e) => {
  const h = e.target.closest('.handle');
  if (!h) return;
  e.preventDefault();
  const f = Math.exp(-e.deltaY * 0.0015);
  if (h.dataset.handle === 'moon') {
    const s = round(clamp((cur().scale ?? 1) * f, 0.2, 2));
    edit(() => { cur().scale = s; }, { key: 'wheel-moon', from: 'drag' });
    showReadout(e.clientX, e.clientY, `size ${s.toFixed(3)}`);
  } else {
    const s = round(clamp(cur().twin.size * f, 0.03, 1.2));
    edit(() => { cur().twin.size = s; }, { key: 'wheel-twin', from: 'drag' });
    showReadout(e.clientX, e.clientY, `twin size ${s.toFixed(3)}`);
  }
  clearTimeout(wheelTimer);
  wheelTimer = setTimeout(() => { readout.hidden = true; lastKey = null; queue('inspector'); }, 700);
}, { passive: false });

function rise() {
  if (ui.view !== 'home' && ui.view !== 'close') setView('home');
  requestAnimationFrame(() => {
    $$('.phone', body).forEach((p) => {
      p.style.setProperty('--rise-from', `${R.BASE * (cur().scale ?? 1) * 0.9}px`);
      p.classList.remove('rising');
      void p.offsetWidth;
      p.classList.add('rising');
      setTimeout(() => p.classList.remove('rising'), 1700);
    });
  });
}

function setView(v) {
  ui.view = v;
  $$('#views button').forEach((b) => b.classList.toggle('on', b.dataset.view === v));
  saveUI();
  renderStage();
}
function setCompare(c) {
  ui.compare = c;
  $$('#compare button').forEach((b) => b.classList.toggle('on', b.dataset.c === c));
  saveUI();
  renderStage();
}
function seg(id, attr, on) {
  $(id).addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (b) on(b.dataset[attr]);
  });
}
seg('#views', 'view', setView);
seg('#compare', 'c', setCompare);
seg('#skymode', 'v', (v) => {
  R.settings.skyLive = v === 'live';
  $$('#skymode button').forEach((b) => b.classList.toggle('on', b.dataset.v === v));
  renderStage();
});
seg('#halo', 'v', (v) => {
  R.settings.halo = v;
  $$('#halo button').forEach((b) => b.classList.toggle('on', b.dataset.v === v));
  renderStage();
});
$('#rise').addEventListener('click', rise);
$('#pause').addEventListener('click', () => {
  R.settings.paused = !R.settings.paused;
  $('#pause').classList.toggle('on', R.settings.paused);
  toast(R.settings.paused ? 'Paused' : 'Playing');
});
new ResizeObserver(() => queue(ui.mode === 'collection' ? 'collection' : 'stage')).observe(body);

// Reference images: drop one on the stage to keep it beside the phone; click it to copy a colour.
const stage = $('#stage');
stage.addEventListener('dragover', (e) => {
  if (![...e.dataTransfer.types].includes('Files')) return;
  e.preventDefault();
  stage.classList.add('drag-over');
});
stage.addEventListener('dragleave', (e) => { if (!stage.contains(e.relatedTarget)) stage.classList.remove('drag-over'); });
stage.addEventListener('drop', (e) => {
  stage.classList.remove('drag-over');
  const files = [...(e.dataTransfer?.files ?? [])].filter((f) => f.type.startsWith('image/'));
  if (!files.length) return;
  e.preventDefault();
  files.forEach(addRef);
});
document.addEventListener('paste', (e) => {
  if (e.target instanceof Element && e.target.closest('input, textarea')) return;
  const f = [...(e.clipboardData?.files ?? [])].find((x) => x.type.startsWith('image/'));
  if (f) addRef(f);
});
function addRef(file) {
  const r = new FileReader();
  r.onload = () => { ui.refs.push(r.result); renderRefs(); renderStage(); };
  r.readAsDataURL(file);
}
function renderRefs() {
  const el = $('#refs');
  el.hidden = !ui.refs.length;
  el.innerHTML = ui.refs.map((src, i) => `<div class="ref"><img src="${src}" data-i="${i}" title="Click to copy the colour under the cursor"><button data-rm="${i}" title="Remove">✕</button></div>`).join('');
}
$('#refs').addEventListener('click', (e) => {
  const rm = e.target.closest('[data-rm]');
  if (rm) { ui.refs.splice(Number(rm.dataset.rm), 1); renderRefs(); renderStage(); return; }
  const img = e.target.closest('img');
  if (!img) return;
  const r = img.getBoundingClientRect(), c = document.createElement('canvas');
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0);
  const x = Math.floor(((e.clientX - r.left) / r.width) * c.width), y = Math.floor(((e.clientY - r.top) / r.height) * c.height);
  const [rr, gg, bb] = g.getImageData(x, y, 1, 1).data;
  const h = toHex([rr, gg, bb]);
  navigator.clipboard?.writeText(h).catch(() => {});
  lastPicked = h;
  toast(`Copied ${h}: paste it into any colour`);
});
let lastPicked = null;

// ——— The inspector. ———
const insp = $('#inspector');
const get = (o, path) => path.reduce((x, k) => x?.[k], o);
function set(o, path, v) {
  const last = path[path.length - 1];
  const parent = path.slice(0, -1).reduce((x, k) => x[k], o);
  if (v === undefined) delete parent[last];
  else parent[last] = v;
}
const ICONS = {
  caret: '<svg class="caret" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>',
  pipette: '<svg viewBox="0 0 24 24"><path d="m14 4 6 6-2 2-6-6zM12 8l-7 7v4h4l7-7"/></svg>',
};
async function pickColour() {
  if (!window.EyeDropper) {
    toast('This browser can’t pick colours from the screen (Chrome can)', true);
    return null;
  }
  try {
    return (await new EyeDropper().open()).sRGBHex.toUpperCase();
  } catch {
    return null;
  }
}

/** A collapsible section; `toggle` puts an on/off switch in its header. */
function section(id, title, inner, { toggle = null, hint = '' } = {}) {
  const closed = ui.closed.has(id);
  return `<div class="section${closed ? ' closed' : ''}" data-sec="${id}">
    <div class="section-head">${ICONS.caret}<b>${title}</b>${hint ? `<span class="note">${hint}</span>` : ''}
      ${toggle ? `<label class="toggle" title="${toggle.title}"><input type="checkbox" data-toggle="${toggle.key}"${toggle.on ? ' checked' : ''}><span></span></label>` : ''}</div>
    <div class="section-body${toggle && !toggle.on ? ' off' : ''}">${inner}</div></div>`;
}
const slider = (path, label, min, max, step, val, hint = '') => `<div class="field"><div class="field-label">${label}${hint ? `<span class="hint">${hint}</span>` : ''}</div>
  <div class="slider" data-path='${JSON.stringify(path)}'><input type="range" min="${min}" max="${max}" step="${step}" value="${val}"><input class="input" value="${val}"></div></div>`;
const colour = (path, label, val) => `<div class="field"><div class="field-label">${label}</div>
  <div class="colour" data-path='${JSON.stringify(path)}'><div class="swatch" style="background:${val}" title="Click to open the colour picker · Alt-click to pick from the screen"></div><input class="input mono" value="${val}" spellcheck="false"><button class="pipette" title="Pick a colour from the screen">${ICONS.pipette}</button></div></div>`;
function rampHTML(path, label, stops, { min = 2, max = 6, hint = '' } = {}) {
  return `<div class="field"><div class="field-label">${label}<span class="hint">${hint}</span></div>
  <div class="ramp" data-path='${JSON.stringify(path)}' data-min="${min}" data-max="${max}">
    <div class="ramp-bar" style="background:linear-gradient(90deg, ${stops.join(', ')})"></div>
    <div class="ramp-stops">${stops.map((s, i) => `<div class="stop" draggable="true" data-i="${i}">
      <div class="swatch" style="background:${s}" title="Click to open the colour picker · Alt-click to pick from the screen · drag to reorder"></div>
      <input class="input" value="${s}" spellcheck="false">${stops.length > min ? `<button class="x" data-rm="${i}" title="Remove">✕</button>` : ''}</div>`).join('')}
      ${stops.length < max ? '<button class="stop-add" data-add title="Add a colour">+</button>' : ''}</div>
    <div class="ramp-tools"><button data-rev>Reverse</button><button data-spread title="Even out the lightness from dark to light">Even out</button><select class="mini-btn" data-copy><option value="">Copy from…</option>${data.moons.filter((m) => m.id !== sel).map((m) => `<option value="${esc(m.id)}">${esc(m.name)}</option>`).join('')}</select></div>
  </div></div>`;
}

function renderInspector() {
  const m = cur();
  if (!m) return;
  const scroll = insp.scrollTop;
  const slot = data.ladder.indexOf(m.id);
  const derived = R.orbColours(m).map(toHex);
  insp.innerHTML = `
    <div class="insp-head">
      <div class="insp-title">${chip(m)}<div><b>${esc(m.name)}</b><span>${esc(m.id)} · ${KINDS[m.kind] ?? m.kind}${slot >= 0 ? ` · ${SLOTS[slot][0]}` : ''}${data.rare.includes(m.id) ? ' · rare' : ''}</span></div></div>
      <div class="insp-actions">
        <select class="select" id="f-slot" style="width:auto;height:26px;font-size:12px" title="Put this moon in a ladder slot">
          <option value="">Not in the ladder</option>${SLOTS.map(([l], i) => `<option value="${i}"${slot === i ? ' selected' : ''}>${l}${data.ladder[i] && data.ladder[i] !== m.id ? ` (now ${esc(byId(data.ladder[i])?.name ?? data.ladder[i])})` : ''}</option>`).join('')}
        </select>
        ${m.original ? '' : `<button class="btn small" id="f-rare">${data.rare.includes(m.id) ? 'Remove from rare moons' : 'Add to rare moons'}</button>`}
      </div>
    </div>
    ${section('id', 'Name', `
      <div class="row2"><div class="field"><label>Name</label><input class="input" id="f-name" value="${esc(m.name)}"></div>
        <div class="field"><label>Id <span class="hint" style="margin-left:auto;color:var(--text3)">file names</span></label><input class="input mono" id="f-id" value="${esc(m.id)}" spellcheck="false"${m.original ? ' disabled' : ''}></div></div>
      <div class="field"><label>Tag</label><input class="input" id="f-tag" value="${esc(m.tag)}" placeholder="a few words under the name"></div>
      <div class="field"><label>Note</label><textarea class="input" id="f-note" rows="2" placeholder="What it is (only shown here)">${esc(m.note ?? '')}</textarea></div>
      <div class="field"><label>Group</label><select class="select" id="f-kind"${m.original ? ' disabled' : ''}>${Object.entries(KINDS).filter(([k]) => m.original || k !== 'today').map(([k, l]) => `<option value="${k}"${m.kind === k ? ' selected' : ''}>${l}</option>`).join('')}</select></div>
    `)}
    ${m.original ? `<div class="section"><div class="section-body" style="padding-top:14px"><div class="note">The starting moon keeps the original moon image, so it has no moon colours to set. Its sky colours drive the live sky; its halo, size and orb are used too.</div></div></div>` : ''}
    ${section('adjust', 'Shift every colour', `
      <div class="note">Drag to shift the sky, moon, halo, tint, rings, twin and orb together. Let go to keep it.</div>
      ${['hue|Hue|-180|180|1', 'sat|Saturation|-1|1|0.01', 'light|Lightness|-1|1|0.01'].map((s) => { const [k, l, a, b, st] = s.split('|'); return `<div class="field"><div class="field-label">${l}</div><div class="slider adj" data-adj="${k}"><input type="range" min="${a}" max="${b}" step="${st}" value="0"><input class="input" value="0" disabled></div></div>`; }).join('')}
    `)}
    ${section('sky', 'Sky', `${rampHTML(['sky'], 'Dark to light', m.sky, { min: 2, max: 4, hint: 'up to 4: the live sky uses 4' })}`)}
    ${m.original ? '' : section('moon', 'Moon', `${rampHTML(['moon'], 'Dark to light', m.moon, { min: 2, max: 6, hint: 'the moon’s texture mapped onto these' })}`)}
    ${section('halo', 'Halo', `${colour(['glow'], 'Colour', m.glow)}${slider(['glowOpacity'], 'Strength', 0, 1, 0.01, m.glowOpacity ?? 1)}`)}
    ${section('place', 'Size and place', `${slider(['scale'], 'Size', 0.3, 1.8, 0.01, m.scale ?? 1, '1 = today’s moon')}${slider(['cx'], 'Across', -0.3, 1.3, 0.005, m.cx ?? 0.5, '0.5 = centred')}
      <div class="note">Or drag the moon on the phone, and scroll on it to resize.</div>`)}
    ${section('surface', 'Phase and tint', `
      <div class="field"><label>Earth’s shadow</label><select class="select" id="f-phase"><option value="">None (full)</option>${R.PHASES.map((p) => `<option value="${p}"${m.phase === p ? ' selected' : ''}>${p[0].toUpperCase() + p.slice(1)}</option>`).join('')}</select></div>
      <div class="field"><div class="field-label">Colour wash across the disc <label class="toggle" style="margin-left:auto"><input type="checkbox" data-toggle="tint"${m.tint ? ' checked' : ''}><span></span></label></div></div>
      ${m.tint ? `${rampHTML(['tint', 'stops'], 'Wash colours', m.tint.stops, { min: 2, max: 6 })}${slider(['tint', 'angle'], 'Angle', 0, 360, 1, m.tint.angle, 'degrees')}${slider(['tint', 'amount'], 'Amount', 0, 1, 0.01, m.tint.amount)}` : ''}
    `)}
    ${section('rings', 'Rings', `
      <label class="check"><span class="toggle"><input type="checkbox" data-toggle="ring"${m.ring ? ' checked' : ''}><span></span></span>Eclipse ring of fire</label>
      <label class="check"><span class="toggle"><input type="checkbox" data-toggle="saturn"${m.saturn ? ' checked' : ''}><span></span></span>Saturn ring</label>
      ${m.saturn ? colour(['saturn'], 'Saturn ring colour', m.saturn) : ''}
    `)}
    ${section('twin', 'Twin moon', m.twin ? `
      ${rampHTML(['twin', 'moon'], 'Twin’s moon, dark to light', m.twin.moon, { min: 2, max: 6 })}
      ${slider(['twin', 'size'], 'Size', 0.03, 1.2, 0.005, m.twin.size, 'of the width')}
      ${slider(['twin', 'x'], 'Across', -0.5, 1.5, 0.005, m.twin.x)}
      <div class="field"><div class="field-label">Height <label class="check" style="margin-left:auto;font-size:11.5px"><span class="toggle"><input type="checkbox" id="f-rise"${m.twin.y === 'rise' ? ' checked' : ''}><span></span></span>Rises from the edge</label></div>
        ${m.twin.y === 'rise' ? '' : `<div class="slider" data-path='["twin","y"]'><input type="range" min="-0.1" max="1.4" step="0.005" value="${m.twin.y}"><input class="input" value="${m.twin.y}"></div>`}</div>
      ${colour(['twin', 'glow'], 'Twin’s halo', m.twin.glow)}
      ${slider(['twin', 'glowOpacity'], 'Twin’s halo strength', 0, 1, 0.01, m.twin.glowOpacity ?? 0.6)}
      <label class="check"><span class="toggle"><input type="checkbox" id="f-front"${m.twin.front ? ' checked' : ''}><span></span></span>In front of the main moon</label>
      <div class="note">Drag the twin on the phone to place it; scroll on it to resize.</div>` : '<div class="note">Turn on to add a second moon.</div>', { toggle: { key: 'twin', on: !!m.twin, title: 'A second moon' } })}
    ${section('orb', 'Sleep orb', m.orb ? `
      ${m.orb.map((c, i) => colour(['orb', i], `C${i}${['  darkest', '', '', '  lightest, also the tile’s clouds'][i]}`, c)).join('')}` : `
      <div class="orb-swatches" style="justify-content:space-between">${derived.map((c, i) => `<div><i style="background:${c}"></i>C${i}</div>`).join('')}</div>
      <div class="note">Taken from the sky, halo and moon. Turn on to set them yourself.</div>`, { toggle: { key: 'orb', on: !!m.orb, title: 'Custom orb colours' } })}
    ${section('json', 'JSON', `<textarea class="input code" id="f-json" spellcheck="false">${esc(JSON.stringify(m, null, 2))}</textarea>
      <div style="display:flex;gap:6px"><button class="btn small" id="f-json-apply">Apply</button><button class="btn small ghost" id="f-json-copy">Copy</button><span class="note" id="f-json-err" style="color:var(--danger)"></span></div>`)}
  `;
  insp.scrollTop = scroll;
  if (picker) placePicker();
}

// Inspector events, delegated.
const inspEdit = (fn, key, rebuild = false) => edit(fn, { key, rebuild, from: 'inspector' });
insp.addEventListener('click', async (e) => {
  if (e.target.closest('.picker')) return pickerClick(e);
  const sw = e.target.closest('.swatch');
  if (sw && !e.altKey && !sw.closest('.orb-swatches')) {
    const stop = sw.closest('.stop'), holder = stop ? stop.closest('.ramp') : sw.closest('.colour');
    const target = { path: holder.dataset.path, i: stop ? Number(stop.dataset.i) : null };
    if (picker && picker.path === target.path && picker.i === target.i) closePicker();
    else openPicker(target);
    return;
  }
  const head = e.target.closest('.section-head');
  if (head && !e.target.closest('.toggle')) {
    const sec = head.parentElement, id = sec.dataset.sec;
    sec.classList.toggle('closed');
    if (sec.classList.contains('closed')) ui.closed.add(id); else ui.closed.delete(id);
    saveUI();
    return;
  }
  const ramp = e.target.closest('.ramp');
  if (ramp) {
    const path = JSON.parse(ramp.dataset.path);
    if (e.target.closest('[data-add]')) {
      inspEdit(() => {
        const a = get(cur(), path);
        a.push(toHex(R.mix(hex(a[a.length - 1]), [255, 255, 255], 0.35)));
      }, null, true);
    } else if (e.target.closest('[data-rm]')) {
      const i = Number(e.target.closest('[data-rm]').dataset.rm);
      inspEdit(() => get(cur(), path).splice(i, 1), null, true);
    } else if (e.target.closest('[data-rev]')) {
      inspEdit(() => get(cur(), path).reverse(), null, true);
    } else if (e.target.closest('[data-spread]')) {
      inspEdit(() => {
        const a = get(cur(), path);
        const hs = a.map((h) => rgbToHsl(hex(h))).sort((x, y) => x[2] - y[2]);
        const lo = hs[0][2], hi = hs[hs.length - 1][2];
        set(cur(), path, hs.map(([h, s], i) => toHex(hslToRgb([h, s, lo + ((hi - lo) * i) / (hs.length - 1)]))));
      }, null, true);
    } else if (e.altKey && e.target.closest('.swatch')) {
      e.preventDefault();
      const i = Number(e.target.closest('.stop').dataset.i), c = await pickColour();
      if (c) inspEdit(() => { get(cur(), path)[i] = c; }, null, true);
    }
    return;
  }
  const col = e.target.closest('.colour');
  if (col && e.target.closest('.pipette')) {
    const c = await pickColour();
    if (c) inspEdit(() => set(cur(), JSON.parse(col.dataset.path), c), null, true);
    return;
  }
  if (e.target.id === 'f-rare') {
    const id = sel;
    const on = !data.rare.includes(id);
    if (!on && data.rare.length === 1) return toast('There must always be at least one rare moon', true);
    edit(() => { data.rare = on ? [...data.rare, id] : data.rare.filter((x) => x !== id); }, { rebuild: true });
    toast(on ? `${cur().name} is now a rare moon (1 in 365)` : `${cur().name} is no longer rare`);
  }
  if (e.target.id === 'f-json-apply') applyJSON();
  if (e.target.id === 'f-json-copy') { navigator.clipboard?.writeText($('#f-json').value); toast('Copied'); }
});
insp.addEventListener('input', (e) => {
  const t = e.target;
  const sl = t.closest('.slider:not(.adj)');
  if (sl) {
    const path = JSON.parse(sl.dataset.path), v = Number(t.value);
    if (Number.isNaN(v)) return;
    const [range, box] = sl.querySelectorAll('input');
    if (t === range) box.value = v; else range.value = v;
    inspEdit(() => set(cur(), path, v), `s:${path.join('.')}`);
    return;
  }
  const adj = t.closest('.slider.adj');
  if (adj) return shiftColours(adj.dataset.adj, Number(t.value), adj);
  if (t.closest('.picker')) return pickerInput(t);
  const ramp = t.closest('.ramp');
  if (ramp && t.closest('.stop')) {
    const path = JSON.parse(ramp.dataset.path), stop = t.closest('.stop'), i = Number(stop.dataset.i);
    let v = t.value.trim();
    if (t.type !== 'color') {
      if (!v.startsWith('#')) v = `#${v}`;
      t.classList.toggle('bad', !isHex(v));
      if (!isHex(v)) return;
    }
    v = v.toUpperCase();
    inspEdit(() => { get(cur(), path)[i] = v; }, `c:${path.join('.')}:${i}`);
    stop.querySelector('.swatch').style.background = v;
    if (!t.closest('.picker')) syncPicker(v);
    ramp.querySelector('.ramp-bar').style.background = `linear-gradient(90deg, ${get(cur(), path).join(', ')})`;
    return;
  }
  const col = t.closest('.colour');
  if (col) {
    const path = JSON.parse(col.dataset.path);
    let v = t.value.trim();
    if (t.type !== 'color') {
      if (!v.startsWith('#')) v = `#${v}`;
      t.classList.toggle('bad', !isHex(v));
      if (!isHex(v)) return;
    }
    v = v.toUpperCase();
    inspEdit(() => set(cur(), path, v), `c:${path.join('.')}`);
    col.querySelector('.swatch').style.background = v;
    if (!t.closest('.picker')) syncPicker(v);
    return;
  }
  if (t.id === 'f-name') inspEdit(() => { cur().name = t.value; }, 'name');
  if (t.id === 'f-tag') inspEdit(() => { cur().tag = t.value; }, 'tag');
  if (t.id === 'f-note') inspEdit(() => { cur().note = t.value; }, 'note');
});
insp.addEventListener('change', (e) => {
  const t = e.target;
  lastKey = null;
  if (t.closest('.slider.adj')) return finishShift();
  if (t.id === 'f-id') return renameId(t);
  if (t.id === 'f-kind') return inspEdit(() => { cur().kind = t.value; }, null, true);
  if (t.id === 'f-phase') return inspEdit(() => set(cur(), ['phase'], t.value || undefined), null, true);
  if (t.id === 'f-slot') {
    const id = sel, i = t.value === '' ? -1 : Number(t.value);
    edit(() => {
      data.ladder = data.ladder.map((x) => (x === id ? null : x));
      if (i >= 0) data.ladder[i] = id;
    }, { rebuild: true });
    return toast(i >= 0 ? `In ${SLOTS[i][0]}` : 'Out of the ladder');
  }
  if (t.id === 'f-rise') {
    const g = R.geometry(cur());
    return inspEdit(() => { cur().twin.y = t.checked ? 'rise' : round(g.twin.y / R.PANEL); }, null, true);
  }
  if (t.id === 'f-front') return inspEdit(() => { cur().twin.front = t.checked || undefined; if (!t.checked) delete cur().twin.front; }, null, true);
  const tg = t.dataset.toggle;
  if (tg) {
    const m = cur(), on = t.checked;
    inspEdit(() => {
      if (tg === 'tint') set(m, ['tint'], on ? { angle: 100, stops: [toHex(R.mix(hex(m.moon[m.moon.length - 1]), [255, 160, 210], 0.6)), toHex(R.mix(hex(m.moon[m.moon.length - 1]), [150, 220, 255], 0.6))], amount: 0.5 } : undefined);
      if (tg === 'ring') set(m, ['ring'], on || undefined);
      if (tg === 'saturn') set(m, ['saturn'], on ? toHex(R.mix(hex(m.moon[m.moon.length - 1]), [255, 255, 255], 0.3)) : undefined);
      if (tg === 'twin') set(m, ['twin'], on ? { x: 0.8, y: 0.66, size: 0.24, moon: [toHex(R.mix(hex(m.moon[0]), [0, 0, 0], 0.1)), m.moon[m.moon.length - 1]], glow: m.glow, glowOpacity: 0.6 } : undefined);
      if (tg === 'orb') set(m, ['orb'], on ? R.orbColours(m).map(toHex) : undefined);
    }, null, true);
  }
});
// Reordering a ramp's colours by dragging.
let stopDrag = null;
insp.addEventListener('dragstart', (e) => {
  const s = e.target.closest('.stop');
  if (!s) return;
  stopDrag = { path: s.closest('.ramp').dataset.path, i: Number(s.dataset.i) };
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', '');
});
insp.addEventListener('dragover', (e) => {
  const s = e.target.closest('.stop');
  if (!s || !stopDrag || s.closest('.ramp').dataset.path !== stopDrag.path) return;
  e.preventDefault();
  $$('.stop.drag-over', insp).forEach((x) => x.classList.remove('drag-over'));
  s.classList.add('drag-over');
});
insp.addEventListener('drop', (e) => {
  const s = e.target.closest('.stop');
  if (!s || !stopDrag) return;
  e.preventDefault();
  const to = Number(s.dataset.i), { i: from } = stopDrag, path = JSON.parse(stopDrag.path);
  stopDrag = null;
  if (to === from) return renderInspector();
  inspEdit(() => { const a = get(cur(), path); a.splice(to, 0, a.splice(from, 1)[0]); }, null, true);
});
insp.addEventListener('dragend', () => { stopDrag = null; $$('.stop.drag-over', insp).forEach((x) => x.classList.remove('drag-over')); });
insp.addEventListener('focusout', (e) => { if (e.target.closest('.input')) lastKey = null; });
// A ramp's "Copy from" list.
insp.addEventListener('change', (e) => {
  const c = e.target.closest('[data-copy]');
  if (!c || !c.value) return;
  const path = JSON.parse(c.closest('.ramp').dataset.path), src = byId(c.value);
  const from = get(src, path) ?? (path[0] === 'twin' ? src.moon : null) ?? src[path[path.length - 1]];
  if (!from) return toast(`${src.name} has none of those`, true);
  inspEdit(() => set(cur(), path, [...from].slice(0, Number(c.closest('.ramp').dataset.max))), null, true);
  toast(`Copied from ${src.name}`);
});
// Pasting a colour anywhere on a swatch.
insp.addEventListener('paste', (e) => {
  const sw = e.target.closest('.swatch');
  if (!sw) return;
  const v = (e.clipboardData.getData('text') || '').trim().toUpperCase();
  if (isHex(v)) {
    const inp = sw.parentElement.querySelector('.input');
    inp.value = v;
    inp.dispatchEvent(new Event('input', { bubbles: true }));
  }
});

// ——— The colour picker: in the inspector, under the colour it edits, changing the moon as you drag. ———
let picker = null; // { path (JSON string), i (stop index or null), h, s, v }
let recent = [];
try { recent = JSON.parse(localStorage.getItem('moon-studio-recent') || '[]'); } catch {}
function rgbToHsv([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), d = max - Math.min(r, g, b);
  let h = 0;
  if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [((h * 60) + 360) % 360, max ? d / max : 0, max];
}
function hsvToRgb([h, s, v]) {
  const f = (n) => { const k = (n + h / 60) % 6; return (v - v * s * Math.max(0, Math.min(k, 4 - k, 1))) * 255; };
  return [f(5), f(3), f(1)];
}
/** The hex box the picker writes to: a ramp stop's, or a single colour's. */
function pickerTarget() {
  if (!picker) return null;
  if (picker.i === null) return $$('.colour', insp).find((c) => c.dataset.path === picker.path)?.querySelector('.input') ?? null;
  const ramp = $$('.ramp', insp).find((r) => r.dataset.path === picker.path);
  return ramp?.querySelector(`.stop[data-i="${picker.i}"] .input`) ?? null;
}
function openPicker(target) {
  const val = (get(cur(), JSON.parse(target.path)) ?? []);
  const hexv = target.i === null ? val : val[target.i];
  if (!isHex(hexv)) return;
  const [h, s, v] = rgbToHsv(hex(hexv));
  picker = { ...target, h, s, v, start: hexv };
  placePicker();
}
function closePicker() {
  if (picker) remember(pickerTarget()?.value);
  picker = null;
  $('.picker', insp)?.remove();
  $$('.swatch.picking', insp).forEach((x) => x.classList.remove('picking'));
}
function remember(h) {
  if (!h || !isHex(h)) return;
  recent = [h.toUpperCase(), ...recent.filter((x) => x !== h.toUpperCase())].slice(0, 14);
  try { localStorage.setItem('moon-studio-recent', JSON.stringify(recent)); } catch {}
}
function placePicker() {
  $('.picker', insp)?.remove();
  $$('.swatch.picking', insp).forEach((x) => x.classList.remove('picking'));
  const input = pickerTarget();
  if (!input) { picker = null; return; }
  const holder = input.closest('.ramp') ?? input.closest('.colour');
  const anchor = holder.classList.contains('ramp') ? holder.querySelector('.ramp-stops') : holder;
  (input.closest('.stop') ?? holder).querySelector('.swatch').classList.add('picking');
  const el = document.createElement('div');
  el.className = 'picker';
  el.innerHTML = `
    <div class="pk-sv"><div class="pk-knob"></div></div>
    <div class="pk-hue"><div class="pk-hue-knob"></div></div>
    <div class="pk-row">
      <div class="pk-prev"><i class="pk-was" title="Before: click to go back"></i><i class="pk-now"></i></div>
      <input class="input mono pk-hex" spellcheck="false">
      <div class="pk-nums">${['H', 'S', 'B'].map((k) => `<label>${k}<input class="input mono pk-num" data-k="${k}"></label>`).join('')}</div>
      <button class="pipette pk-eye" title="Pick a colour from the screen">${ICONS.pipette}</button>
      <button class="pipette pk-close" title="Done (Esc)">✓</button>
    </div>
    ${recent.length ? `<div class="pk-recent">${recent.map((c) => `<button style="background:${c}" data-c="${c}" title="${c}"></button>`).join('')}</div>` : ''}`;
  anchor.after(el);
  syncPicker();
  bindDrag(el.querySelector('.pk-sv'), (x, y) => { picker.s = x; picker.v = 1 - y; applyPicker(); });
  bindDrag(el.querySelector('.pk-hue'), (x) => { picker.h = Math.min(359.9, x * 360); applyPicker(); });
  requestAnimationFrame(() => el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
}
/** Pointer dragging on a box, giving 0..1 coordinates, live while held. */
function bindDrag(box, on) {
  box.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    try { box.setPointerCapture(e.pointerId); } catch {}
    const move = (ev) => {
      const r = box.getBoundingClientRect();
      on(clamp((ev.clientX - r.left) / r.width, 0, 1), clamp((ev.clientY - r.top) / r.height, 0, 1));
    };
    move(e);
    box.onpointermove = move;
    box.onpointerup = box.onpointercancel = () => { box.onpointermove = null; lastKey = null; remember(pickerTarget()?.value); };
  });
}
const pickerHex = () => toHex(hsvToRgb([picker.h, picker.s, picker.v]));
/** Draws the picker from its h/s/v; with `from` (a hex the colour was set to elsewhere), takes that first. */
function syncPicker(from) {
  const el = $('.picker', insp);
  if (!el || !picker) return;
  if (from && from.toUpperCase() !== pickerHex()) {
    const [h, s, v] = rgbToHsv(hex(from));
    picker.s = s; picker.v = v;
    if (s > 0.01 && v > 0.01) picker.h = h;
  }
  const h = pickerHex();
  el.querySelector('.pk-sv').style.background = `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${picker.h}, 100%, 50%))`;
  const k = el.querySelector('.pk-knob');
  k.style.left = `${picker.s * 100}%`; k.style.top = `${(1 - picker.v) * 100}%`; k.style.background = h;
  el.querySelector('.pk-hue-knob').style.left = `${(picker.h / 360) * 100}%`;
  el.querySelector('.pk-now').style.background = h;
  el.querySelector('.pk-was').style.background = picker.start;
  const hx = el.querySelector('.pk-hex');
  if (document.activeElement !== hx) hx.value = h;
  const vals = { H: Math.round(picker.h), S: Math.round(picker.s * 100), B: Math.round(picker.v * 100) };
  el.querySelectorAll('.pk-num').forEach((n) => { if (document.activeElement !== n) n.value = vals[n.dataset.k]; });
}
/** Writes the picker's colour into its target's hex box, which edits the moon (and the preview) as usual. */
function applyPicker(h = pickerHex()) {
  const input = pickerTarget();
  if (!input) return closePicker();
  input.value = h;
  input.classList.remove('bad');
  input.dispatchEvent(new Event('input', { bubbles: true }));
  syncPicker();
}
function pickerInput(t) {
  if (t.classList.contains('pk-hex')) {
    let v = t.value.trim();
    if (!v.startsWith('#')) v = `#${v}`;
    t.classList.toggle('bad', !isHex(v));
    if (!isHex(v)) return;
    const [h, s, b] = rgbToHsv(hex(v));
    picker.s = s; picker.v = b;
    if (s > 0.01 && b > 0.01) picker.h = h;
    applyPicker(v.toUpperCase());
  } else if (t.classList.contains('pk-num')) {
    const n = Number(t.value);
    if (Number.isNaN(n)) return;
    if (t.dataset.k === 'H') picker.h = clamp(n, 0, 359.9);
    if (t.dataset.k === 'S') picker.s = clamp(n / 100, 0, 1);
    if (t.dataset.k === 'B') picker.v = clamp(n / 100, 0, 1);
    applyPicker();
  }
}
async function pickerClick(e) {
  if (e.target.closest('.pk-close')) return closePicker();
  if (e.target.closest('.pk-was')) { syncPicker(picker.start); return applyPicker(picker.start); }
  const c = e.target.closest('[data-c]');
  if (c) { syncPicker(c.dataset.c); return applyPicker(c.dataset.c); }
  if (e.target.closest('.pk-eye')) {
    const v = await pickColour();
    if (v) { syncPicker(v); applyPicker(v); remember(v); }
  }
}

// Shifting every colour: the moon as it was when the drag began, shifted by all three sliders.
let shiftBase = null;
function shiftColours(k, v, el) {
  if (!shiftBase) shiftBase = { m: clone(cur()), hue: 0, sat: 0, light: 0 };
  shiftBase[k] = v;
  el.querySelector('.input').value = k === 'hue' ? `${v}°` : v.toFixed(2);
  const base = shiftBase.m, a = { hue: shiftBase.hue, sat: shiftBase.sat, light: shiftBase.light };
  inspEdit(() => {
    const m = mapColours(base, (h) => adjust(h, a));
    Object.assign(cur(), m);
  }, 'shift');
}
function finishShift() {
  shiftBase = null;
  lastKey = null;
  queue('inspector');
}

function renameId(input) {
  const m = cur(), old = m.id, id = input.value.trim().toLowerCase();
  if (id === old) return;
  if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) { input.classList.add('bad'); return toast('Ids are lowercase letters, numbers and dashes', true); }
  if (byId(id)) { input.classList.add('bad'); return toast(`“${id}” is already taken`, true); }
  edit(() => {
    m.id = id;
    data.ladder = data.ladder.map((x) => (x === old ? id : x));
    data.rare = data.rare.map((x) => (x === old ? id : x));
    (data.limited ?? []).forEach((l) => { if (l.id === old) l.id = id; });
    sel = id;
  }, { rebuild: true });
  toast(`Renamed to ${id}`);
}
function applyJSON() {
  const err = $('#f-json-err');
  let m;
  try {
    m = JSON.parse($('#f-json').value);
  } catch (e) {
    err.textContent = e.message;
    return;
  }
  if (!m.id || (m.id !== sel && byId(m.id))) { err.textContent = 'The id is missing or taken'; return; }
  const old = sel;
  edit(() => {
    data.moons[data.moons.indexOf(cur())] = m;
    if (m.id !== old) {
      data.ladder = data.ladder.map((x) => (x === old ? m.id : x));
      data.rare = data.rare.map((x) => (x === old ? m.id : x));
    }
    sel = m.id;
  }, { rebuild: true });
  toast('Applied');
}

// ——— The collection. ———
const colEl = $('#collection');
function miniPhone(m, w) {
  const k = w / R.W;
  return `<div class="scaler" style="width:${w}px;height:${R.H * k}px;pointer-events:none"><div class="phone" style="transform:scale(${k});box-shadow:none">${R.phoneHTML(m, { live: false })}</div></div>`;
}
function slotBox(kind, i, id, label, sub) {
  const m = id && byId(id);
  return `<div class="slot"><div class="slot-label">${label}<span>${sub}</span></div>
    <div class="slot-box${m ? ' filled' : ''}" data-kind="${kind}" data-i="${i}" ${m ? 'draggable="true"' : ''} data-id="${esc(id ?? '')}">
      ${m ? `${miniPhone(m, 132)}<button class="slot-x" data-x title="${kind === 'rare' ? 'No longer rare' : 'Empty this slot'}">✕</button>` : 'Drag a moon here from the list'}
    </div><div class="slot-name">${m ? esc(m.name) : '—'}</div></div>`;
}
function renderCollection() {
  const lim = data.limited ?? [];
  colEl.innerHTML = `
    <div class="col-head"><div><h2>Collection</h2><p>Which moon comes when. Drag moons from the list into a slot, drag slots onto each other to swap, double-click a moon to edit it. The rules (mornings, odds, the secrets) are in moon-ladder.ts.</p></div></div>
    <div class="col-group"><b>The ladder</b><span>by mornings got up (never resets); the tenth at week 50</span></div>
    <div class="slots">${SLOTS.slice(0, 10).map(([l, s], i) => slotBox('ladder', i, data.ladder[i], `${i + 1} · ${l}`, s)).join('')}</div>
    <div class="col-group"><b>Secret moons</b><span>each for one odd thing done on a morning; the app never says how</span></div>
    <div class="slots">${SLOTS.slice(SECRET_FROM).map(([l, s], k) => slotBox('ladder', SECRET_FROM + k, data.ladder[SECRET_FROM + k], l, s)).join('')}</div>
    <div class="col-group"><b>Rare moons</b><span>each its own 1 in 365, rolled every morning from the second</span></div>
    <div class="slots">${data.rare.map((id, i) => slotBox('rare', i, id, `Rare ${data.rare.length > 1 ? i + 1 : ''}`, 'each 1 in 365 mornings')).join('')}${slotBox('rare', data.rare.length, null, 'Add a rare moon', 'drop one here')}</div>
    <div class="col-group"><b>Limited moons</b><span>earned only by getting up on their date</span></div>
    ${lim.map((l, i) => `<div class="limited-row" data-li="${i}"><select class="select" data-lim="id">${data.moons.map((m) => `<option value="${esc(m.id)}"${m.id === l.id ? ' selected' : ''}>${esc(m.name)}</option>`).join('')}</select>
      <input class="input mono" type="date" data-lim="date" value="${esc(l.date)}"><button class="btn small ghost" data-lim-rm>Remove</button></div>`).join('')}
    <button class="btn small" id="lim-add">Add a limited moon</button>
  `;
}
colEl.addEventListener('dragstart', (e) => {
  const b = e.target.closest('.slot-box.filled');
  if (b) e.dataTransfer.setData('text/slot', JSON.stringify({ kind: b.dataset.kind, i: Number(b.dataset.i) }));
});
colEl.addEventListener('dragover', (e) => {
  const b = e.target.closest('.slot-box');
  if (!b) return;
  e.preventDefault();
  $$('.slot-box.over', colEl).forEach((x) => x.classList.remove('over'));
  b.classList.add('over');
});
colEl.addEventListener('dragleave', (e) => e.target.closest?.('.slot-box')?.classList.remove('over'));
colEl.addEventListener('drop', (e) => {
  const b = e.target.closest('.slot-box');
  if (!b) return;
  e.preventDefault();
  const to = { kind: b.dataset.kind, i: Number(b.dataset.i) };
  const fromSlot = e.dataTransfer.getData('text/slot'), id = e.dataTransfer.getData('text/moon');
  const getS = (s) => (s.kind === 'rare' ? data.rare[s.i] ?? null : data.ladder[s.i]);
  const setS = (s, v) => {
    if (s.kind !== 'rare') { data.ladder[s.i] = v; return; }
    const r = [...data.rare];
    if (v) r[s.i] = v; else r.splice(s.i, 1);
    data.rare = r.filter((x, i) => x && r.indexOf(x) === i);
  };
  if (fromSlot) {
    const from = JSON.parse(fromSlot);
    if (from.kind === to.kind && from.i === to.i) return;
    const a = getS(from), c = getS(to);
    if (from.kind === 'rare' && !c && data.rare.length === 1) return toast('There must always be at least one rare moon', true);
    edit(() => { setS(to, a); setS(from, c ?? null); });
  } else if (id) {
    if (byId(id)?.original) return toast('Everyone starts with Moonlight, so it can’t be earned', true);
    edit(() => {
      if (to.kind === 'ladder') data.ladder = data.ladder.map((x) => (x === id ? null : x));
      else data.rare = data.rare.filter((x) => x !== id);
      setS(to, id);
    });
    toast(`${byId(id).name} → ${to.kind === 'rare' ? 'Rare' : SLOTS[to.i][0]}`);
  }
});
colEl.addEventListener('click', (e) => {
  if (e.target.closest('[data-x]')) {
    const b = e.target.closest('.slot-box'), i = Number(b.dataset.i);
    if (b.dataset.kind === 'rare') {
      if (data.rare.length === 1) return toast('There must always be at least one rare moon', true);
      return edit(() => { data.rare = data.rare.filter((_, j) => j !== i); });
    }
    return edit(() => { data.ladder[i] = null; });
  }
  const b = e.target.closest('.slot-box.filled');
  if (b) return select(b.dataset.id);
  if (e.target.id === 'lim-add') {
    const today = new Date().toISOString().slice(0, 10);
    return edit(() => { data.limited = [...(data.limited ?? []), { id: sel, date: today }]; });
  }
  const rm = e.target.closest('[data-lim-rm]');
  if (rm) edit(() => data.limited.splice(Number(rm.closest('[data-li]').dataset.li), 1));
});
colEl.addEventListener('dblclick', (e) => {
  const b = e.target.closest('.slot-box.filled');
  if (b) { select(b.dataset.id); setMode('moon'); }
});
colEl.addEventListener('change', (e) => {
  const f = e.target.dataset.lim;
  if (!f) return;
  const i = Number(e.target.closest('[data-li]').dataset.li), v = e.target.value;
  edit(() => { data.limited[i][f] = v; });
});

function setMode(mode) {
  ui.mode = mode;
  $$('#modes button').forEach((b) => b.classList.toggle('on', b.dataset.mode === mode));
  $('#app').classList.toggle('collection-mode', mode === 'collection');
  $('#collection').hidden = mode !== 'collection';
  saveUI();
  if (mode === 'collection') renderCollection();
  else { renderStage(); renderInspector(); }
}
seg('#modes', 'mode', setMode);

// ——— Status, save, bake, history. ———
function renderStatus() {
  const d = dirty();
  const nBake = status.pending.length;
  let html;
  if (d) {
    const n = data.moons.filter((m) => savedById.get(m.id) !== JSON.stringify(m)).length;
    html = `<span class="dot dirty"></span><b>Not saved</b>${n ? ` · ${n} moon${n > 1 ? 's' : ''} changed` : ''}`;
  } else if (status.needsBake) {
    html = `<span class="dot"></span>Saved · <b>${nBake ? `${nBake} moon${nBake > 1 ? 's' : ''} to bake` : 'needs a bake'}</b>`;
  } else html = `<span class="dot ok"></span>Saved and baked`;
  $('#status').innerHTML = html;
  $('#save').disabled = !d;
  $('#save').classList.toggle('dirty', d);
  $('#undo').disabled = !undo.length;
  $('#redo').disabled = !redo.length;
  document.title = `${d ? '• ' : ''}Moon studio`;
}
function setSaved(json, st) {
  saved = json;
  savedById = new Map(JSON.parse(json).moons.map((m) => [m.id, JSON.stringify(m)]));
  if (st) status = st;
  saveDraft();
  queue('list', 'status');
}
async function save() {
  if (!dirty()) return true;
  const json = JSON.stringify(data);
  const res = await fetch('/api/moons', { method: 'PUT', body: json });
  const out = await res.json().catch(() => ({}));
  if (!res.ok) {
    openDrawer('Can’t save', 'fix these first');
    $('#drawer-log').textContent = (out.errors ?? ['unknown error']).map((x) => `• ${x}`).join('\n');
    toast(out.errors?.[0] ?? 'Couldn’t save', true);
    return false;
  }
  setSaved(json, out.status);
  toast('Saved to moons.json');
  return true;
}
function openDrawer(title, sub) {
  $('#drawer').hidden = false;
  $('#drawer-title').textContent = title;
  $('#drawer-sub').textContent = sub;
}
let baking = false;
async function bake(all = false) {
  if (baking) return;
  if (!(await save())) return;
  baking = true;
  $('#bake').disabled = true;
  $('#bake').textContent = 'Baking…';
  const n = status.pending.length;
  openDrawer('Bake', all ? 'every moon: the images, the app’s moon data and the icons' : n ? `${n} changed moon${n > 1 ? 's' : ''}, then the app’s moon data and icons` : 'no images changed: just the app’s moon data');
  const log = $('#drawer-log');
  log.textContent = '';
  try {
    const res = await fetch(`/api/bake${all ? '?all=1' : ''}`, { method: 'POST' });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `HTTP ${res.status}`);
    const reader = res.body.getReader(), dec = new TextDecoder();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      log.textContent += dec.decode(value, { stream: true });
      log.scrollTop = log.scrollHeight;
    }
    const ok = /✓ Done/.test(log.textContent);
    toast(ok ? 'Baked into the app: reload it to see the moons' : 'The bake failed: see the log', !ok);
  } catch (e) {
    log.textContent += `\n${e.message}`;
    toast(e.message, true);
  }
  baking = false;
  $('#bake').disabled = false;
  $('#bake').textContent = 'Bake';
  status = await (await fetch('/api/status')).json();
  R.refreshBaked();
  queue('list', 'status', 'stage');
}
$('#save').addEventListener('click', save);
$('#bake').addEventListener('click', () => bake(false));
$('#bake-menu-btn').addEventListener('click', (e) => { e.stopPropagation(); $('#bake-menu').classList.toggle('open'); });
$('#bake-menu').addEventListener('click', (e) => {
  const b = e.target.closest('[data-bake]');
  if (!b) return;
  $('#bake-menu').classList.remove('open');
  bake(b.dataset.bake === 'all');
});
document.addEventListener('click', () => $('#bake-menu').classList.remove('open'));
$('#drawer-close').addEventListener('click', () => ($('#drawer').hidden = true));
$('#undo').addEventListener('click', doUndo);
$('#redo').addEventListener('click', doRedo);

$('#history-btn').addEventListener('click', async () => {
  const files = await (await fetch('/api/history')).json();
  $('#history-list').innerHTML = files.length ? files.map((f) => {
    const m = f.match(/moons-(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})/);
    const when = m ? new Date(`${m[1]}T${m[2]}:${m[3]}:${m[4]}Z`).toLocaleString() : f;
    return `<li><span>${esc(when)}</span><button class="btn small" data-load="${esc(f)}">Open as edits</button></li>`;
  }).join('') : '<li><span>No earlier saves yet. Each save keeps the version before it here.</span></li>';
  $('#history').hidden = false;
});
$('#history-list').addEventListener('click', async (e) => {
  const b = e.target.closest('[data-load]');
  if (!b) return;
  const d = await (await fetch(`/api/history/${b.dataset.load}`)).json();
  d.rare = Array.isArray(d.rare) ? d.rare : d.rare ? [d.rare] : data.rare;
  d.ladder = [...(d.ladder ?? []), ...Array(SLOTS.length).fill(null)].slice(0, SLOTS.length);
  d.limited ??= data.limited;
  edit(() => { data = d; if (!byId(sel)) sel = data.moons[0].id; }, { rebuild: true });
  $('#history').hidden = true;
  toast('Loaded as unsaved edits: save to keep, ⌘Z to go back');
});
$$('.modal').forEach((m) => m.addEventListener('click', (e) => { if (e.target === m || e.target.closest('[data-close]')) m.hidden = true; }));

// ——— Keys. ———
document.addEventListener('keydown', (e) => {
  const mod = e.metaKey || e.ctrlKey, typing = e.target instanceof Element && e.target.closest('input, textarea, select');
  const k = e.key.toLowerCase();
  if (mod && k === 's') { e.preventDefault(); return save(); }
  if (mod && k === 'b') { e.preventDefault(); return bake(false); }
  if (mod && k === 'z' && !typing) { e.preventDefault(); return e.shiftKey ? doRedo() : doUndo(); }
  if (mod && k === 'y' && !typing) { e.preventDefault(); return doRedo(); }
  if (mod && k === 'd') { e.preventDefault(); return duplicate(); }
  if (e.key === 'Escape' && picker) { closePicker(); return; }
  if (e.key === 'Escape') { $$('.modal').forEach((m) => (m.hidden = true)); $('#bake-menu').classList.remove('open'); if (typing) e.target.blur(); return; }
  if (typing || mod || e.altKey) return;
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    const ms = visible(), i = ms.findIndex((m) => m.id === sel);
    const next = ms[clamp(i + (e.key === 'ArrowDown' ? 1 : -1), 0, ms.length - 1)];
    if (next) select(next.id);
    return;
  }
  if (k === '/') { e.preventDefault(); return $('#search').focus(); }
  if (k === '?') return ($('#help').hidden = false);
  if (k === 'm') return setMode('moon');
  if (k === 'l') return setMode('collection');
  if (k === 'n') return newMoon();
  if (k === 'r') return rise();
  if (k === 'p') return $('#pause').click();
  if (k === 'c') { const order = ['off', 'saved', 'baked', 'start']; return setCompare(order[(order.indexOf(ui.compare) + 1) % order.length]); }
  const views = { 1: 'home', 2: 'close', 3: 'orb', 4: 'tile', 5: 'all' };
  if (views[k] && ui.mode === 'moon') return setView(views[k]);
});
window.addEventListener('beforeunload', (e) => { if (dirty()) { saveDraft(); e.preventDefault(); } });

// ——— Start. ———
async function start() {
  await R.setup($('#defs'));
  const res = await (await fetch('/api/moons')).json();
  data = res.data;
  data.ladder = [...(data.ladder ?? []), ...Array(SLOTS.length).fill(null)].slice(0, SLOTS.length);
  if (!Array.isArray(data.rare)) data.rare = data.rare ? [data.rare] : [];
  setSaved(JSON.stringify(data), res.status);
  let st = {};
  try { st = JSON.parse(localStorage.getItem('moon-studio-ui') || '{}'); } catch {}
  sel = byId(st.sel) ? st.sel : data.moons[0].id;
  // A draft from last time, if it differs from what's saved.
  try {
    const draft = JSON.parse(localStorage.getItem('moon-studio-draft') || 'null');
    if (draft && JSON.stringify(draft.data) !== saved) {
      $('#draft-banner').hidden = false;
      document.body.classList.add('has-banner');
      $('#draft-restore').onclick = () => {
        edit(() => { data = draft.data; if (!byId(sel)) sel = data.moons[0].id; }, { rebuild: true });
        $('#draft-banner').hidden = true;
        document.body.classList.remove('has-banner');
        toast('Restored your unsaved edits');
      };
      $('#draft-discard').onclick = () => {
        try { localStorage.removeItem('moon-studio-draft'); } catch {}
        $('#draft-banner').hidden = true;
        document.body.classList.remove('has-banner');
      };
    }
  } catch {}
  $$('#views button').forEach((b) => b.classList.toggle('on', b.dataset.view === ui.view));
  $$('#compare button').forEach((b) => b.classList.toggle('on', b.dataset.c === ui.compare));
  $$('#kind-filter button').forEach((b) => b.classList.toggle('on', b.dataset.k === ui.kind));
  setMode(ui.mode === 'collection' ? 'collection' : 'moon');
  renderList();
  renderStatus();
  requestAnimationFrame(() => $('.item.sel')?.scrollIntoView({ block: 'center' }));
}
start().catch((e) => {
  console.error(e);
  document.body.insertAdjacentHTML('beforeend', `<div class="toast show bad">Couldn’t start: ${esc(e.message)}</div>`);
});
