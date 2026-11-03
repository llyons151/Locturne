// Loaded by panel.html / listing.html when ?edit=1 (the Edit tab). Anything with data-edit can be dragged; the wheel
// resizes a phone or item, Shift+wheel tilts it. Nothing is saved here: the page tells the parent (index.html) what moved, in
// panel pixels, and the parent writes panels.json / listings.json and reloads the panels involved.
(() => {
  const post = (msg) => parent.postMessage({ ...msg, from: Number(new URLSearchParams(location.search).get('i') ?? 0) }, '*');
  const css = document.createElement('style');
  css.textContent = `[data-edit] { cursor: grab; } [data-edit]:hover { outline: 6px dashed rgba(90,120,255,.55); outline-offset: 6px; }
    [data-edit].sel { outline: 8px solid #5a78ff; outline-offset: 6px; } body.dragging, body.dragging * { cursor: grabbing !important; }`;
  document.head.appendChild(css);
  const num = (v) => parseFloat(v) || 0;
  let drag = null;

  addEventListener('pointerdown', (e) => {
    const el = e.target.closest('[data-edit]');
    if (!el) return post({ type: 'select', key: null });
    e.preventDefault();
    const cs = getComputedStyle(el);
    drag = { el, x: e.clientX, y: e.clientY, left: num(cs.left), top: num(cs.top), bottom: num(cs.bottom), moved: false };
    el.setPointerCapture(e.pointerId);
    document.body.classList.add('dragging');
  });
  addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
    const axis = drag.el.dataset.axis;                      // captions only move up and down
    if (axis !== 'y') drag.el.style.left = `${drag.left + dx}px`;
    if (drag.el.style.bottom && !drag.el.style.top) drag.el.style.bottom = `${drag.bottom - dy}px`;
    else drag.el.style.top = `${drag.top + dy}px`;
  });
  addEventListener('pointerup', (e) => {
    if (!drag) return;
    const { el, moved } = drag, dx = Math.round(e.clientX - drag.x), dy = Math.round(e.clientY - drag.y);
    document.body.classList.remove('dragging');
    drag = null;
    post(moved ? { type: 'move', key: el.dataset.edit, dx: el.dataset.axis === 'y' ? 0 : dx, dy } : { type: 'select', key: el.dataset.edit });
  });

  // Wheel: bigger/smaller (phones). Shift+wheel: tilt. Previewed with CSS, sent once the wheel settles.
  let acc = null;
  addEventListener('wheel', (e) => {
    const el = e.target.closest('[data-edit^="ph:"], [data-edit^="wb:"], [data-edit^="item:"]');
    if (!el) return;
    e.preventDefault();
    const d = (e.deltaY || e.deltaX) > 0 ? -1 : 1;
    if (!acc || acc.el !== el) acc = { el, dh: 0, droll: 0, h: el.getBoundingClientRect().height, w: num(el.style.width) };
    if (e.shiftKey) acc.droll += d;
    else acc.dh += d * Math.max(8, acc.h * 0.04);
    const k = (acc.h + acc.dh) / acc.h;
    if (el.dataset.edit.startsWith('item:')) {           // items grow by scale (text, art and all)
      el.style.scale = k; el.style.rotate = `${acc.droll}deg`;
      clearTimeout(acc.t); const a = acc;
      acc.t = setTimeout(() => { acc = null; post({ type: 'move', key: el.dataset.edit, dscale: (a.h + a.dh) / a.h, drot: a.droll }); }, 450);
      return;
    }
    el.style.height = `${Math.round(acc.h + acc.dh)}px`;
    if (acc.w) el.style.width = `${Math.round(acc.w * k)}px`;
    el.style.rotate = `${-acc.droll}deg`;
    clearTimeout(acc.t);
    const a = acc;
    acc.t = setTimeout(() => { acc = null; post({ type: 'move', key: el.dataset.edit, dh: a.dh, droll: a.droll }); }, 450);
  }, { passive: false });

  addEventListener('message', (e) => {
    if (e.data?.type !== 'highlight') return;
    document.querySelectorAll('[data-edit]').forEach((el) => el.classList.toggle('sel', el.dataset.edit === e.data.key));
  });
})();
