import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';

import { PAYOFF_LAYOUT_DEFAULTS, setPayoffLayout, type PayoffBox, type PayoffLayout } from './payoff-layout';

/**
 * Dev, browser only (/payoff-studio, user 2026-11-12): the payoff's pieces placed by hand. The real
 * payoff runs in a frame the size of the Reel frame's box (or the whole phone); each piece has a
 * handle over it to drag up or down, and a number beside it. Send writes the placement to
 * docs/payoff-layout.json (tools/payoff-studio/save.mjs) for Claude to bake into payoff-layout.ts and
 * build the motion round. The frame picks the changes up live through the browser's storage
 * (`PayoffStudioBridge`, mounted by the payoff route in the browser).
 */
const STORE = 'locturne.payoffStudio.v1';
const LAB_MESSAGE = 'locturne.payoffLab';
const SAVE_URL = 'http://localhost:5182/save';

type Layouts = Record<PayoffBox, PayoffLayout>;

// `insets`: the phone's safe areas, top and bottom (lib/preview-insets.web.tsx). The box's top is
// under the Dynamic Island, so it has none there.
const BOXES: Record<PayoffBox, { width: number; height: number; label: string; insets: string }> = {
  // The Reel frame on a 430-point-wide iPhone (Pro Max, Plus): floor(430 × 16 / 9), as ReelFrameModule.swift.
  reel: { width: 430, height: 764, label: 'Reel box 430 × 764', insets: '0,34' },
  phone: { width: 430, height: 932, label: 'Whole phone 430 × 932', insets: '59,34' },
};

/** Each draggable piece: its marker in the payoff (`testID`) and the nudge it moves. */
const PIECES: { id: string; key: keyof PayoffLayout; label: string }[] = [
  { id: 'moon', key: 'moonY', label: 'Moon' },
  { id: 'time', key: 'timeY', label: 'Time' },
  { id: 'apply', key: 'applyY', label: 'Apply pill' },
  { id: 'week', key: 'weekY', label: 'This week' },
  { id: 'bubble', key: 'bubbleY', label: 'Loc’s bubble' },
  { id: 'edge', key: 'edgeY', label: 'Edge (Loc stands on it)' },
  { id: 'done', key: 'doneY', label: 'Done + Share' },
];

const fresh = (): Layouts => ({ phone: { ...PAYOFF_LAYOUT_DEFAULTS.phone }, reel: { ...PAYOFF_LAYOUT_DEFAULTS.reel } });

function load(): Layouts {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE) ?? 'null') as Partial<Layouts> | null;
    const base = fresh();
    return { phone: { ...base.phone, ...saved?.phone }, reel: { ...base.reel, ...saved?.reel } };
  } catch {
    return fresh();
  }
}

function save(layouts: Layouts) {
  try {
    localStorage.setItem(STORE, JSON.stringify(layouts));
  } catch {
    // Private window: the frame won't follow, nothing else lost.
  }
}

function applyAll(layouts: Layouts) {
  setPayoffLayout('phone', layouts.phone);
  setPayoffLayout('reel', layouts.reel);
}

// At import, before the payoff's first render reads them.
if (typeof window !== 'undefined') applyAll(load());

/** Inside the frame: the studio's changes, live. */
export function PayoffStudioBridge() {
  useEffect(() => {
    applyAll(load());
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORE) applyAll(load());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);
  return null;
}

type Rect = { top: number; height: number; left: number; width: number };

/** The studio page: the frame with the handles over it, and the numbers beside it. */
export function PayoffStudio() {
  const [layouts, setLayouts] = useState<Layouts>(load);
  const [box, setBox] = useState<PayoffBox>('reel');
  const [picked, setPicked] = useState<string>('moon');
  const [handles, setHandles] = useState(true);
  const [rects, setRects] = useState<Record<string, Rect>>({});
  const [status, setStatus] = useState('');
  const [scale, setScale] = useState(1);
  const frame = useRef<HTMLIFrameElement>(null);
  const size = BOXES[box];

  useEffect(() => {
    const fit = () => setScale(Math.min(1, (window.innerHeight - 48) / (size.height + 24)));
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [size.height]);

  // Where each piece is now, read from the frame every frame (it's the same origin).
  useEffect(() => {
    let raf = 0;
    const read = () => {
      const doc = frame.current?.contentDocument;
      if (doc) {
        const next: Record<string, Rect> = {};
        for (const { id } of PIECES) {
          const el = doc.querySelector(`[data-testid="payoff-${id}"]`);
          if (!el) continue;
          const r = el.getBoundingClientRect();
          next[id] = { top: r.top, height: r.height, left: r.left, width: r.width };
        }
        setRects((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
      }
      raf = requestAnimationFrame(read);
    };
    raf = requestAnimationFrame(read);
    return () => cancelAnimationFrame(raf);
  }, []);

  const change = (key: keyof PayoffLayout, value: number) => {
    setLayouts((prev) => {
      const next = { ...prev, [box]: { ...prev[box], [key]: Math.round(value) } };
      save(next);
      return next;
    });
    setStatus('');
  };

  // Arrow keys move the picked piece: 1 point, 10 with Shift.
  const keyRef = useRef({ picked, layouts, box });
  useEffect(() => {
    keyRef.current = { picked, layouts, box };
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      const piece = PIECES.find((p) => p.id === keyRef.current.picked);
      if (!piece) return;
      e.preventDefault();
      const step = (e.shiftKey ? 10 : 1) * (e.key === 'ArrowUp' ? -1 : 1);
      change(piece.key, keyRef.current.layouts[keyRef.current.box][piece.key] + step);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // `change` reads the box through state updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const drag = useRef<{ key: keyof PayoffLayout; y: number; from: number } | null>(null);
  const onDown = (e: ReactPointerEvent<HTMLDivElement>, id: string, key: keyof PayoffLayout) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setPicked(id);
    drag.current = { key, y: e.clientY, from: layouts[box][key] };
  };
  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    change(d.key, d.from + (e.clientY - d.y) / scale);
  };
  const onUp = () => {
    drag.current = null;
  };

  // Freeze: everything in the frame stops where it is (user, 2026-11-12: to debug it): the frame's
  // animation frames are held back (Reanimated, Loc's canvas) and its CSS animations paused (the page
  // coming into focus). The handles still follow, and nudges still move pieces. Unfreeze lets it all run on.
  const [frozen, setFrozen] = useState(false);
  // The frame's own requestAnimationFrame and what it was asked to run while frozen.
  const held = useRef<{ win: Window; raf: typeof requestAnimationFrame; cbs: FrameRequestCallback[] } | null>(null);
  const freeze = (on: boolean) => {
    const w = frame.current?.contentWindow;
    if (!w) return;
    // A held frame from before a reload is gone with it.
    if (held.current && held.current.win !== w) held.current = null;
    if (on && !held.current) {
      const h = { win: w, raf: w.requestAnimationFrame.bind(w), cbs: [] as FrameRequestCallback[] };
      held.current = h;
      Reflect.set(w, 'requestAnimationFrame', (cb: FrameRequestCallback) => {
        h.cbs.push(cb);
        return 0;
      });
      w.document.getAnimations().forEach((a) => a.pause());
    } else if (!on && held.current) {
      const h = held.current;
      held.current = null;
      Reflect.set(w, 'requestAnimationFrame', h.raf);
      h.cbs.forEach((cb) => h.raf(cb));
      w.document.getAnimations().forEach((a) => a.play());
    }
    setFrozen(on);
  };
  // F toggles it, from the latest render's state.
  const toggleFreeze = useRef(() => {});
  useEffect(() => {
    toggleFreeze.current = () => freeze(!frozen);
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'f' || (e.target as HTMLElement)?.tagName === 'INPUT') return;
      toggleFreeze.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const replay = () => {
    freeze(false);
    frame.current?.contentWindow?.postMessage({ type: LAB_MESSAGE, cut: false, newMoon: 'harvest' }, window.location.origin);
  };
  const whole = () => {
    setFrozen(false);
    if (frame.current) frame.current.src = `/morning-won?demo=1&lab=1&newMoon=harvest&autoDone=5000&insets=${size.insets}&run=${Date.now()}`;
  };
  const pickBox = (next: PayoffBox) => {
    // A fresh frame for the other box: it starts running.
    setFrozen(false);
    setBox(next);
    setStatus('');
  };

  const report = () => ({
    box,
    size: { width: size.width, height: size.height },
    layouts,
    // Where each piece ended up in this box, in points from the box's top.
    measured: Object.fromEntries(
      Object.entries(rects).map(([id, r]) => [id, { top: Math.round(r.top), bottom: Math.round(r.top + r.height), height: Math.round(r.height) }]),
    ),
  });
  const send = async () => {
    const body = JSON.stringify(report(), null, 2);
    try {
      const res = await fetch(SAVE_URL, { method: 'POST', headers: { 'content-type': 'application/json' }, body });
      if (!res.ok) throw new Error(String(res.status));
      setStatus('Sent: saved to docs/payoff-layout.json. Tell Claude it’s there.');
    } catch {
      await navigator.clipboard?.writeText(body).catch(() => {});
      setStatus('The save server isn’t running (npm run payoff-studio), so it’s copied instead: paste it to Claude.');
    }
  };
  const copy = async () => {
    await navigator.clipboard?.writeText(JSON.stringify(report(), null, 2)).catch(() => {});
    setStatus('Copied.');
  };

  const values = layouts[box];
  return (
    <div style={s.page}>
      <div style={{ ...s.phoneSlot, width: (size.width + 24) * scale, height: (size.height + 24) * scale }}>
        <div style={{ ...s.phone, width: size.width + 24, height: size.height + 24, transform: `scale(${scale})` }}>
          <div style={{ position: 'relative', width: size.width, height: size.height }}>
            <iframe
              key={box}
              ref={frame}
              title="Locturne"
              src={`/morning-won?demo=1&lab=1&newMoon=harvest&insets=${size.insets}`}
              style={{ ...s.screen, width: size.width, height: size.height, borderRadius: box === 'reel' ? 0 : 52 }}
            />
            {handles ? (
              <div style={s.overlay}>
                {PIECES.map(({ id, key, label }) => {
                  const r = rects[id];
                  if (!r) return null;
                  const line = id === 'edge';
                  const on = picked === id;
                  return (
                    <div
                      key={id}
                      onPointerDown={(e) => onDown(e, id, key)}
                      onPointerMove={onMove}
                      onPointerUp={onUp}
                      style={{
                        ...s.handle,
                        top: line ? r.top - 8 : r.top,
                        height: line ? 16 : Math.max(r.height, 12),
                        left: line ? 0 : r.left - 4,
                        width: line ? size.width : r.width + 8,
                        borderColor: on ? '#ffd166' : 'rgba(255,255,255,0.45)',
                        ...(line && { border: 'none', borderTop: `2px dashed ${on ? '#ffd166' : 'rgba(255,255,255,0.6)'}`, marginTop: 7 }),
                      }}
                    >
                      <span style={{ ...s.tag, background: on ? '#ffd166' : 'rgba(0,0,0,0.6)', color: on ? '#000' : '#fff' }}>
                        {label} {values[key] > 0 ? `+${values[key]}` : values[key]}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <div style={s.panel}>
        <strong style={s.title}>Payoff studio</strong>
        <div style={s.row}>
          {(Object.keys(BOXES) as PayoffBox[]).map((b) => (
            <button key={b} type="button" style={box === b ? s.picked : s.button} onClick={() => pickBox(b)}>
              {BOXES[b].label}
            </button>
          ))}
        </div>
        <div style={s.note}>
          {box === 'reel'
            ? 'The Reel frame: exactly 9:16, the bottom 1290 × 2292 px of a recording. Each box keeps its own placement.'
            : 'The whole screen, as the App Store build shows it.'}
        </div>
        <div style={s.row}>
          <button type="button" style={s.primary} onClick={replay}>
            Replay entrance
          </button>
          <button type="button" style={s.button} onClick={whole}>
            Whole thing + Done
          </button>
        </div>
        <button type="button" style={frozen ? s.frozen : s.button} onClick={() => freeze(!frozen)}>
          {frozen ? '▶ Unfreeze (F)' : '❚❚ Freeze (F)'}
        </button>
        <label style={s.check}>
          <input type="checkbox" checked={handles} onChange={(e) => setHandles(e.target.checked)} />
          <span>Handles (turn off to tap Loc or see it clean)</span>
        </label>
        <div style={s.note}>Drag a handle up or down, or pick one and use ↑ ↓ (Shift: 10). Numbers are points off where the app puts it.</div>
        {PIECES.map(({ id, key, label }) => (
          <div key={id} style={{ ...s.pieceRow, ...(picked === id && s.pieceOn) }} onClick={() => setPicked(id)}>
            <span style={{ flex: 1 }}>{label}</span>
            <button type="button" style={s.tiny} onClick={() => change(key, values[key] - 1)}>
              −
            </button>
            <input type="number" value={values[key]} style={s.number} onChange={(e) => change(key, Number(e.target.value) || 0)} />
            <button type="button" style={s.tiny} onClick={() => change(key, values[key] + 1)}>
              +
            </button>
            <button type="button" style={s.tiny} onClick={() => change(key, 0)} title="Back to the app’s spot">
              ↺
            </button>
          </div>
        ))}
        <label style={s.slider}>
          <span style={s.labelRow}>
            <span>Moon size</span>
            <span style={s.value}>
              {values.moonSize > 0 ? '+' : ''}
              {values.moonSize} pt{rects.moon ? ` (${Math.round(rects.moon.height)} across)` : ''}
            </span>
          </span>
          <input type="range" min={-120} max={160} step={1} value={values.moonSize} onChange={(e) => change('moonSize', Number(e.target.value))} />
        </label>
        <div style={s.row}>
          <button type="button" style={s.primary} onClick={send}>
            Send to Claude
          </button>
          <button type="button" style={s.button} onClick={copy}>
            Copy
          </button>
          <button
            type="button"
            style={s.button}
            onClick={() => {
              const next = { ...layouts, [box]: { ...fresh()[box] } };
              save(next);
              setLayouts(next);
            }}
          >
            Reset box
          </button>
        </div>
        {status ? <div style={s.status}>{status}</div> : null}
        <div style={s.note}>Loc stands on the edge, so he moves with it; his bubble rides with him. The moon moves live once it has risen.</div>
      </div>
    </div>
  );
}

const s: Record<string, CSSProperties> = {
  page: {
    position: 'fixed',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 40,
    padding: 24,
    background: '#16171c',
    color: '#f2f8fc',
    font: '13px -apple-system, system-ui, sans-serif',
    overflow: 'auto',
  },
  phoneSlot: { flex: 'none', position: 'relative' },
  phone: {
    position: 'absolute',
    left: 0,
    top: 0,
    padding: 12,
    boxSizing: 'border-box',
    borderRadius: 30,
    background: '#000',
    transformOrigin: 'top left',
    boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
  },
  screen: { border: 'none', display: 'block', background: '#000' },
  overlay: { position: 'absolute', inset: 0, pointerEvents: 'none' },
  handle: {
    position: 'absolute',
    boxSizing: 'border-box',
    border: '1.5px dashed',
    borderRadius: 8,
    cursor: 'ns-resize',
    pointerEvents: 'auto',
    touchAction: 'none',
  },
  tag: { position: 'absolute', left: 0, top: -18, fontSize: 11, padding: '1px 6px', borderRadius: 5, whiteSpace: 'nowrap', fontWeight: 600 },
  panel: {
    flex: 'none',
    width: 320,
    maxHeight: '100%',
    overflowY: 'auto',
    padding: 16,
    borderRadius: 14,
    background: '#22242c',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  title: { fontSize: 15 },
  row: { display: 'flex', gap: 8 },
  primary: { flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: '#f2f8fc', color: '#000', fontWeight: 700, cursor: 'pointer' },
  button: { flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#f2f8fc', cursor: 'pointer' },
  picked: { flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid #f2f8fc', background: 'rgba(255,255,255,0.12)', color: '#f2f8fc', cursor: 'pointer', fontWeight: 600 },
  frozen: { padding: '8px 10px', borderRadius: 8, border: '1px solid #7fd1ff', background: 'rgba(127,209,255,0.18)', color: '#f2f8fc', cursor: 'pointer', fontWeight: 700 },
  check: { display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' },
  pieceRow: { display: 'flex', alignItems: 'center', gap: 6, padding: '4px 6px', borderRadius: 8, cursor: 'pointer' },
  pieceOn: { background: 'rgba(255,209,102,0.15)', outline: '1px solid #ffd166' },
  tiny: { width: 26, height: 26, borderRadius: 6, border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#f2f8fc', cursor: 'pointer' },
  number: { width: 56, padding: 4, borderRadius: 6, border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#f2f8fc', textAlign: 'right' },
  slider: { display: 'flex', flexDirection: 'column', gap: 4 },
  labelRow: { display: 'flex', justifyContent: 'space-between', gap: 8 },
  value: { color: '#a8bad3', fontVariantNumeric: 'tabular-nums' },
  note: { color: '#a8bad3', fontSize: 12 },
  status: { color: '#ffd166', fontSize: 12 },
};
