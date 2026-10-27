'use dom';

import { IS_DOM } from 'expo/dom';
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type PointerEvent } from 'react';

import { LOC_PATH, LOC_HEIGHT, LOC_WIDTH } from '@/features/home/loc-path';
import { LOC_BASE, LOC_MOODS, LOC_TUNE, LocRig, type LocChannel, type LocMood, type LocSnapshot } from '@/features/home/loc-rig';

import { grid, keep, keepButton, paintLater, Segmented, Select, Slider, Toggle } from './controls';
import { EXPRESSIONS, faceAction, loadMine, type Expression } from './expressions';
import { setNote, useNotes } from './notes';
import { MOON_MOVES } from './moonrise';
import { MOONRISE_CSS, MoonrisePage } from './moonrise-page';
import { ExpressionsPage, NotesPage, PAGES_CSS, UsagePage, UsedLine, VerdictBar } from './pages';
import { BACKDROPS, download, locHeight, paintBackdrop, type Backdrop } from './paint';
import { ACTIONS, DT, FPS, GROUPS, MOODS, record, rest, STILLS, stillFrame, type LocAction, type Take } from './takes';
import { asCode, changes, load, POSE, poseValue, resetAll, setMoodTiming, setPose, setSignature, setTune, signatureOn } from './tune';

/**
 * Dev tool, /loc-studio: everything Loc can do, on the real rig (loc-rig.ts), in one place.
 * - Animate: every move, recorded frame by frame. Play it at any speed, step or scrub it, see
 *   every channel's curve and every frame in a filmstrip, or play with him live. Each says where
 *   it's seen in the app, and takes a good or bad mark. The move list scrolls on its own, so he
 *   stays in view; the curves and filmstrip are under Frame tools.
 * - Expressions: new faces, and a builder for your own (pages.tsx, expressions.ts).
 * - In the app: where he's on screen, in which mood and why, and what makes each move play.
 * - Style: change his eyes and each mood's pose and see it at once; copy the result as code.
 * - Model sheet: his expressions, the key poses of each move, and how he reads at every size.
 * - Notes: every good and bad mark (saved to docs/loc-studio-notes.json when run on its own).
 * - Images: the art he's made from.
 * It's a DOM component, and on its own in a browser too (studio/, `npm run studio`), so the same page runs in a browser and in the app.
 */
type Image = { title: string; note: string; uri: string };
type Tab = 'animate' | 'moonrise' | 'faces' | 'usage' | 'style' | 'sheet' | 'notes' | 'images';
const TABS: { id: Tab; label: string }[] = [
  { id: 'animate', label: 'Animate' },
  { id: 'moonrise', label: 'Moonrise' },
  { id: 'faces', label: 'Expressions' },
  { id: 'usage', label: 'In the app' },
  { id: 'style', label: 'Style' },
  { id: 'sheet', label: 'Model sheet' },
  { id: 'notes', label: 'Notes' },
  { id: 'images', label: 'Images' },
];

const INKS = [
  { id: '#000000', label: 'Black (Home, You)' },
  { id: '#7C7C82', label: 'Gray (push-ups strip)' },
];
const SPEEDS = [1, 0.5, 0.25, 0.1];
const STRIP = 28;
/** The stage canvas's widest, in real pixels. */
const STAGE_MAX_PX = 1100;
const SECOND_HIT_MS = 2500;
const LIVE_READOUT_MS = 120;
const CURVE_COLORS = ['#7AA2FF', '#FF8A65', '#7BD389', '#F2C14E', '#C792EA', '#4DD0E1', '#FF6B9A', '#B0B0B0'];
const DEFAULT_CURVES: LocChannel[] = ['sink', 'y', 'open', 'earL', 'stretch', 'swell'];
const SIZES = [
  { label: 'Home', w: 105 },
  { label: 'You', w: 133 },
  { label: '48 pt', w: 48 },
  { label: '32 pt', w: 32 },
];

const ms = (frame: number) => Math.round((frame / FPS) * 1000);

/**
 * The frame on show. Playback changes it 60 times a second, so it lives outside React state: only
 * the few things that show it (clock, scrubber, curves' playhead, numbers, filmstrip highlight)
 * listen, and the rest of the page doesn't re-render.
 */
type FrameStore = { get: () => number; set: (f: number) => void; subscribe: (l: () => void) => () => void };
function frameStore(): FrameStore {
  let value = 0;
  const listeners = new Set<() => void>();
  return {
    get: () => value,
    set(f) {
      if (f === value) return;
      value = f;
      listeners.forEach((l) => l());
    },
    subscribe(l) {
      listeners.add(l);
      return () => void listeners.delete(l);
    },
  };
}
const useFrame = (store: FrameStore) => useSyncExternalStore(store.subscribe, store.get, store.get);

/** The frame, at most once every `ms` (and always the last one): for the readout's 50 rows, too many to redraw 60 times a second. */
function useFrameEvery(store: FrameStore, ms: number) {
  const [frame, setFrame] = useState(store.get);
  useEffect(() => {
    let last = 0;
    let late: ReturnType<typeof setTimeout> | undefined;
    const off = store.subscribe(() => {
      clearTimeout(late);
      const now = performance.now();
      if (now - last >= ms) {
        last = now;
        setFrame(store.get());
      } else late = setTimeout(() => setFrame(store.get()), ms);
    });
    return () => {
      off();
      clearTimeout(late);
    };
  }, [store, ms]);
  return frame;
}

export default function LocStudio({ images, onClose }: { images: Image[]; onClose?: () => void; dom?: import('expo/dom').DOMProps }) {
  const [tab, setTab] = useState<Tab>('animate');
  const [mood, setMood] = useState<LocMood>('awake');
  const [life, setLife] = useState(true);
  const [reduced, setReduced] = useState(false);
  const [backdrop, setBackdrop] = useState<Backdrop>('moon');
  const [ink, setInk] = useState('#000000');
  const [zoom, setZoom] = useState(0.5);
  const [actionId, setActionId] = useState('poke');
  const [seed, setSeed] = useState(7);
  const [take, setTake] = useState<Take | null>(null);
  const [frames] = useState(frameStore);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [loop, setLoop] = useState(true);
  const [live, setLive] = useState(false);
  const [curves, setCurves] = useState<LocChannel[]>(DEFAULT_CURVES);
  const [filmStep, setFilmStep] = useState(2);
  // The curves, channel chips, frame saving and filmstrip: off until asked for.
  const [tools, setTools] = useState(false);
  const notes = useNotes();
  // Style changes saved in this browser come back first.
  const [tuned, setTuned] = useState(() => {
    load();
    return 0;
  });
  const [ready, setReady] = useState(false);
  const [mine, setMine] = useState<Expression[]>(loadMine);
  // Every move: the rig's, then the expressions as moves (the built-in ideas and yours).
  const actions = useMemo(() => [...ACTIONS, ...EXPRESSIONS.map(faceAction), ...mine.map(faceAction)], [mine]);
  const nameOf = useCallback(
    (id: string) => actions.find((a) => a.id === id)?.label ?? MOON_MOVES.find((m) => m.id === id)?.label ?? id,
    [actions],
  );

  const rootRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLCanvasElement>(null);
  const bgRef = useRef<HTMLCanvasElement>(null);
  const rigRef = useRef<LocRig | null>(null);
  const baseRef = useRef<LocSnapshot | null>(null);
  const renderRef = useRef<{ rig: LocRig; canvas: HTMLCanvasElement } | null>(null);
  const width = useRef(0);
  // The loop reads these; React state drives the page.
  const live$ = useRef({ take, playing, speed, loop, live, zoom, life });
  useLayoutEffect(() => {
    live$.current = { take, playing, speed, loop, live, zoom, life };
  });

  // On web the studio is drawn inline, over the app's own screens (Home's blurred sky, the moon,
  // Home's Loc), and the browser repainted all of them on every frame of playback. Hidden while the
  // studio is open, it plays about three times faster. In the app it has its own webview.
  useEffect(() => {
    if (IS_DOM) return;
    const hidden: [HTMLElement, string][] = [];
    for (let el: HTMLElement | null = rootRef.current; el?.parentElement && el !== document.body; el = el.parentElement) {
      for (const sib of el.parentElement.children) {
        if (sib === el || !(sib instanceof HTMLElement) || sib.tagName === 'STYLE' || sib.tagName === 'SCRIPT') continue;
        hidden.push([sib, sib.style.visibility]);
        sib.style.visibility = 'hidden';
      }
    }
    return () => hidden.forEach(([el, was]) => (el.style.visibility = was));
  }, []);

  const action = actions.find((a) => a.id === actionId) ?? ACTIONS.find((a) => a.id === 'poke')!;
  const getBase = useCallback(() => baseRef.current, []);
  const getRender = useCallback(() => renderRef.current, []);

  // The off-screen rig that draws stills, thumbnails and sheets.
  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const rig = new LocRig(canvas, 'awake');
    renderRef.current = { rig, canvas };
    return () => {
      rig.dispose();
      renderRef.current = null;
    };
  }, []);

  /** Draws `snap` into `target`, `w` px wide with Loc at `share` of it, on a backdrop. */
  const paintStill = useCallback(
    (target: HTMLCanvasElement, snap: LocSnapshot, w: number, share: number, bg: Backdrop, strip: number, transparent = false) => {
      const r = renderRef.current;
      if (!r) return;
      const h = locHeight(w, share);
      r.canvas.width = w;
      r.canvas.height = h;
      r.rig.restore(snap);
      r.rig.setShare(share);
      r.rig.setInk(ink);
      r.rig.render(DT);
      target.width = w;
      target.height = transparent ? h : h + strip;
      const ctx = target.getContext('2d')!;
      if (transparent) ctx.clearRect(0, 0, w, h);
      else paintBackdrop(ctx, w, h + strip, bg, h, w * share, strip);
      ctx.drawImage(r.canvas, 0, 0);
    },
    [ink],
  );

  // Dev hook for reviewing moves from a script: a labelled contact sheet of any move, as a PNG data URL.
  useEffect(() => {
    if (!ready) return;
    (window as unknown as { __locStudio?: object }).__locStudio = {
      ids: ACTIONS.map((x) => x.id),
      sheet: (id: string, step = 3, width = 200, cols = 10, startMood: LocMood = 'awake') => {
        const r = renderRef.current, base = baseRef.current, a = ACTIONS.find((x) => x.id === id);
        if (!r || !base || !a) return null;
        const t = record(r.rig, base, a, startMood, 7, false);
        const cells = [];
        for (let f = 0; f < t.frames.length; f += step) {
          const c = document.createElement('canvas');
          paintStill(c, t.frames[f], width, 0.9, 'moon', 4);
          cells.push({ canvas: c, label: `${f} · ${ms(f - t.preroll)}ms` });
        }
        return grid(cells, cols, '#0E0F13').toDataURL('image/png');
      },
    };
  }, [ready, paintStill]);

  // The stage's rig, made again when Reduce Motion is switched (it's fixed when a rig is made).
  useEffect(() => {
    const canvas = stageRef.current;
    if (!canvas) return;
    const rig = new LocRig(canvas, 'awake', reduced);
    rig.setShare(live$.current.zoom);
    baseRef.current = rig.snapshot();
    rigRef.current = rig;
    setReady(true);
    return () => {
      rig.dispose();
      rigRef.current = null;
      setReady(false);
    };
  }, [reduced]);

  /** Draws frame `f` of the take on the stage. */
  const drawFrame = useCallback((f: number) => {
    const rig = rigRef.current, t = live$.current.take, canvas = stageRef.current;
    if (!rig || !t || !canvas) return;
    rig.restore(t.frames[Math.max(0, Math.min(f, t.frames.length - 1))]);
    rig.setShare(live$.current.zoom);
    canvas.style.transition = 'none';
    canvas.style.opacity = '1';
    rig.render(DT);
  }, []);

  useEffect(() => {
    rigRef.current?.setInk(ink);
    if (!live$.current.live) drawFrame(frames.get());
  }, [ink, ready, drawFrame, frames]);

  const paintStage = useCallback(() => {
    const wrap = wrapRef.current, canvas = stageRef.current, bg = bgRef.current;
    if (!wrap || !canvas || !bg) return;
    const w = wrap.clientWidth;
    width.current = w;
    const h = locHeight(w, zoom);
    // Sharp, but no bigger than it needs to be: every frame the rig copies its WebGL canvas into
    // this one, and at 2x on a wide window that's millions of pixels a frame.
    const dpr = Math.min(2, window.devicePixelRatio || 1, STAGE_MAX_PX / w);
    canvas.style.height = `${h}px`;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    bg.style.height = `${h + STRIP}px`;
    bg.width = Math.round(w * dpr);
    bg.height = Math.round((h + STRIP) * dpr);
    paintBackdrop(bg.getContext('2d')!, bg.width, bg.height, backdrop, canvas.height, canvas.width * zoom, STRIP * dpr);
    rigRef.current?.setShare(zoom);
    if (!live$.current.live) drawFrame(frames.get());
  }, [backdrop, zoom, drawFrame, frames]);

  useEffect(() => {
    paintStage();
    const wrap = wrapRef.current;
    if (!wrap) return;
    const observer = new ResizeObserver(paintStage);
    observer.observe(wrap);
    return () => observer.disconnect();
  }, [paintStage, ready, tab]);

  /** Records the picked move again (new mood, seed, tuning...), keeping the place in it. */
  const shoot = useCallback(
    (a: LocAction = action, s = seed, keepFrame = false) => {
      const rig = rigRef.current, base = baseRef.current;
      if (!rig || !base) return;
      const t = record(rig, base, a, mood, s, life);
      const f = keepFrame ? Math.min(frames.get(), t.frames.length - 1) : 0;
      live$.current = { ...live$.current, take: t, live: false };
      setTake(t);
      frames.set(f);
      setLive(false);
      drawFrame(f);
    },
    [action, seed, mood, life, drawFrame, frames],
  );

  // A new take whenever what it's made from changes. Same move: stay on the same frame.
  const shotAction = useRef<string | null>(null);
  useEffect(() => {
    if (!ready || live$.current.live) return;
    shoot(action, seed, shotAction.current === actionId);
    shotAction.current = actionId;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, actionId, seed, mood, life, tuned]);

  // The frame loop: plays the take, or runs him live.
  useEffect(() => {
    if (tab !== 'animate') return;
    let raf = 0, last = performance.now(), acc = 0;
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const s = live$.current, rig = rigRef.current;
      if (rig && s.live && s.playing) {
        rig.step(dt * s.speed);
      } else if (rig && s.take && s.playing) {
        acc += dt * s.speed;
        const from = frames.get();
        let f = from;
        while (acc >= DT) {
          acc -= DT;
          f += 1;
        }
        if (f !== from) {
          const n = s.take.frames.length;
          if (f >= n) {
            if (s.loop) f %= n;
            else {
              f = n - 1;
              setPlaying(false);
            }
          }
          frames.set(f);
          drawFrame(f);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [tab, drawFrame, frames]);

  const seek = useCallback(
    (f: number) => {
      const t = live$.current.take;
      if (!t) return;
      const clamped = Math.max(0, Math.min(t.frames.length - 1, f));
      frames.set(clamped);
      setPlaying(false);
      drawFrame(clamped);
    },
    [drawFrame, frames],
  );

  const goLive = useCallback(() => {
    const rig = rigRef.current, base = baseRef.current, t = live$.current.take;
    if (!rig || !base) return;
    if (t) rig.restore(t.frames[frames.get()]);
    else {
      rig.restore(base);
      rig.place(true, mood);
    }
    rig.setShare(live$.current.zoom);
    rig.quiet = !life;
    if (rig.currentMood !== mood) rig.setMood(mood);
    live$.current.live = true;
    setLive(true);
    setPlaying(true);
  }, [mood, life, frames]);

  // Live, mood and idle life change on the running rig, the way the app changes them.
  useEffect(() => {
    if (!live) return;
    rigRef.current?.setMood(mood);
  }, [live, mood]);
  useEffect(() => {
    if (live && rigRef.current) rigRef.current.quiet = !life;
  }, [live, life]);

  const notesRef = useRef(notes);
  useLayoutEffect(() => {
    notesRef.current = notes;
  });
  // Keys: space plays, arrows step (shift: 10 frames), Home and End jump, L goes live, G and B mark it good or bad.
  useEffect(() => {
    if (tab !== 'animate') return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') return;
      const f = frames.get();
      if (e.key === ' ') setPlaying((p) => !p);
      else if (e.key === 'ArrowRight') seek(f + (e.shiftKey ? 10 : 1));
      else if (e.key === 'ArrowLeft') seek(f - (e.shiftKey ? 10 : 1));
      else if (e.key === 'Home') seek(0);
      else if (e.key === 'End') seek(Infinity);
      else if (e.key === 'l' || e.key === 'L') goLive();
      else if (e.key === 'g' || e.key === 'G' || e.key === 'b' || e.key === 'B') {
        const v = e.key.toLowerCase() === 'g' ? 'good' : 'bad';
        const a = live$.current.take?.action;
        if (a) setNote(a.id, { verdict: notesRef.current[a.id]?.verdict === v ? undefined : v }, a.label);
      } else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tab, seek, goLive, frames]);

  const lastTap = useRef(0);
  const onStageTap = (e: PointerEvent<HTMLCanvasElement>) => {
    const rig = rigRef.current, canvas = stageRef.current;
    if (!rig || !canvas) return;
    if (!live) return setPlaying((p) => !p);
    const r = canvas.getBoundingClientRect();
    const k = canvas.width / r.width;
    if (!rig.hits((e.clientX - r.left) * k, (e.clientY - r.top) * k)) return;
    const now = performance.now();
    if (now - lastTap.current < SECOND_HIT_MS) {
      lastTap.current = 0;
      rig.burrow();
    } else {
      lastTap.current = now;
      rig.poke();
    }
  };

  const getRig = useCallback(() => rigRef.current, []);
  /** Opens a move in Animate (from Expressions, In the app or Notes), in a mood if given. */
  const openMove = useCallback(
    (id: string, m?: LocMood) => {
      setTab('animate');
      if (m) setMood(m);
      setPlaying(true);
      if (id === actionId && !m) shoot(actions.find((a) => a.id === id), seed);
      setActionId(id);
      rootRef.current?.scrollTo?.({ top: 0 });
    },
    [actionId, actions, seed, shoot],
  );
  const paintThumb = useCallback(
    (c: HTMLCanvasElement, f: number) => {
      const t = live$.current.take;
      if (t) paintStill(c, t.frames[f], 240, zoom, backdrop, 8);
    },
    [paintStill, zoom, backdrop],
  );
  const saveFrame = (transparent: boolean) => {
    if (!take) return;
    const frame = frames.get();
    const out = document.createElement('canvas');
    paintStill(out, take.frames[frame], 1200, zoom, backdrop, STRIP * 2, transparent);
    download(out, `loc-${take.action.id}-f${frame}${transparent ? '' : `-${backdrop}`}.png`);
  };

  return (
    <div className="studio" ref={rootRef}>
      <style>{CSS + PAGES_CSS + MOONRISE_CSS}</style>
      <header className="bar">
        <div className="title">
          <strong>Loc studio</strong>
          <span className="dim">the real rig, frame by frame</span>
        </div>
        <nav className="tabs">
          {TABS.map((t) => (
            <button key={t.id} className={t.id === tab ? 'on' : ''} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </nav>
        {onClose ? (
          <button className="close" onClick={() => onClose()}>
            Close
          </button>
        ) : null}
      </header>

      <section className={`controls ${tab === 'moonrise' ? 'hidden' : ''}`}>
        <Segmented label="Mood" value={mood} options={MOODS.map((m) => ({ id: m, label: m }))} onChange={setMood} />
        <Select label="Behind him" value={backdrop} options={BACKDROPS} onChange={(v) => setBackdrop(v as Backdrop)} />
        <Select label="Body colour" value={ink} options={INKS} onChange={setInk} />
        <Toggle label="Idle life" hint="blinks, glances, habits" on={life} onChange={setLife} />
        <Toggle label="Reduce Motion" hint="as the app does it" on={reduced} onChange={setReduced} />
        <Toggle
          label="Raccoon hands"
          hint="clawed grips that can act"
          on={LOC_TUNE.hands}
          onChange={(on) => {
            setTune({ hands: on });
            setTuned((n) => n + 1);
          }}
        />
        <Toggle
          label="Signature traits"
          hint="heavy lid, stepped face, snap darts"
          on={signatureOn()}
          onChange={(on) => {
            setSignature(on);
            rigRef.current?.refit();
            setTuned((n) => n + 1);
          }}
        />
      </section>

      <div className={`page animate ${tab === 'animate' ? '' : 'hidden'}`}>
        <aside className="library">
          {GROUPS.filter((g) => actions.some((a) => a.group === g)).map((g) => (
            <div key={g} className="group">
              <h3>{g}</h3>
              {actions.filter((a) => a.group === g).map((a) => (
                <button
                  key={a.id}
                  className={`move ${a.id === actionId && !live ? 'on' : ''}`}
                  onClick={() => {
                    setActionId(a.id);
                    setPlaying(true);
                    if (a.id === actionId) shoot(a, seed);
                  }}
                >
                  <span className={`mark ${notes[a.id]?.verdict ?? ''}`} />
                  {a.label}
                  {a.mood ? <span className="dim"> · {a.mood}</span> : null}
                </button>
              ))}
            </div>
          ))}
        </aside>

        <main className="center">
          <div className="note">
            <strong>{live ? 'Live' : action.label}</strong>{' '}
            <span className="dim">
              {live
                ? 'He runs in real time. Tap him to poke him, twice to burrow. Mood and idle life change him as the app would.'
                : action.note}
            </span>
            {live ? null : (
              <>
                <UsedLine id={action.id} />
                <VerdictBar key={action.id} id={action.id} label={action.label} />
              </>
            )}
          </div>

          <div className="stage" ref={wrapRef}>
            <canvas ref={bgRef} className="bg" />
            <canvas ref={stageRef} className="loc" onPointerDown={onStageTap} />
          </div>

          <div className="transport">
            <button title="First frame (Home)" onClick={() => seek(0)} disabled={live}>⏮</button>
            <button title="Back a frame (←)" onClick={() => seek(frames.get() - 1)} disabled={live}>◀︎</button>
            <button className="play" title="Play or pause (space)" onClick={() => setPlaying((p) => !p)}>
              {playing ? 'Pause' : 'Play'}
            </button>
            <button title="On a frame (→)" onClick={() => seek(frames.get() + 1)} disabled={live}>▶︎</button>
            <button title="Last frame (End)" onClick={() => seek(Infinity)} disabled={live}>⏭</button>
            <Segmented label="Speed" value={String(speed)} options={SPEEDS.map((s) => ({ id: String(s), label: `${s}×` }))} onChange={(v) => setSpeed(Number(v))} />
            <Toggle label="Loop" on={loop} onChange={setLoop} />
            <button className={live ? 'on' : ''} title="Run him in real time (L)" onClick={() => (live ? shoot(action, seed) : goLive())}>
              {live ? 'Back to the take' : 'Go live'}
            </button>
            {actionId === 'burrow' || life ? (
              <button title="Another random route, blink timing..." onClick={() => setSeed(Math.floor(Math.random() * 1e9))} disabled={live}>
                New seed
              </button>
            ) : null}
          </div>

          {take && !live ? <Clock take={take} frames={frames} onSeek={seek} /> : null}
          {take && !live ? (
            <Toggle label="Frame tools" hint="curves, channels, saving frames, filmstrip" on={tools} onChange={setTools} />
          ) : null}

          {take && !live && tools ? (
            <>
              <Curves take={take} frames={frames} channels={curves} onSeek={seek} />
              <div className="chips">
                {(Object.keys(LOC_BASE) as LocChannel[]).map((c) => {
                  const i = curves.indexOf(c);
                  return (
                    <button
                      key={c}
                      className={`chip ${i >= 0 ? 'on' : ''}`}
                      style={i >= 0 ? { borderColor: CURVE_COLORS[i % CURVE_COLORS.length] } : undefined}
                      onClick={() => setCurves((cs) => (i >= 0 ? cs.filter((x) => x !== c) : [...cs, c]))}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
              <div className="row">
                <button onClick={() => saveFrame(false)}>Save this frame</button>
                <button onClick={() => saveFrame(true)}>Save it see-through</button>
              </div>
            </>
          ) : null}

          {take && !live && tools ? (
            <Filmstrip
              take={take}
              step={filmStep}
              setStep={setFilmStep}
              frames={frames}
              onSeek={seek}
              paint={paintThumb}
              redraw={`${backdrop}|${ink}|${zoom}|${tuned}`}
            />
          ) : null}
        </main>

        <aside className="readout">
          <h3>Channels{live ? ', live' : ', this frame'}</h3>
          <p className="dim small">Every number the rig moves him with. The curves show any of them over the move.</p>
          <Readout take={take} frames={frames} live={live} getRig={getRig} />
          {take && !live && take.cues.length ? (
            <>
              <h3>He says</h3>
              {take.cues.map((c, i) => (
                <button key={i} className="cue" onClick={() => seek(c.frame)}>
                  “{c.cue}” at frame {c.frame}
                </button>
              ))}
            </>
          ) : null}
          <h3>Zoom</h3>
          <input type="range" min={0.2} max={0.95} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} />
          <p className="dim small">Keys: space plays, ← → step a frame (shift: 10), Home and End jump, L goes live, G marks it good, B bad.</p>
        </aside>
      </div>

      {tab === 'style' && ready ? (
        <StylePage
          mood={mood}
          setMood={setMood}
          paintStill={paintStill}
          backdrop={backdrop}
          getBase={getBase}
          onTuned={() => {
            rigRef.current?.refit();
            setTuned((n) => n + 1);
          }}
        />
      ) : null}
      {tab === 'sheet' && ready ? <SheetPage paintStill={paintStill} backdrop={backdrop} getBase={getBase} getRender={getRender} tuned={tuned} /> : null}
      {tab === 'faces' && ready ? (
        <ExpressionsPage
          paintStill={paintStill}
          backdrop={backdrop}
          getBase={getBase}
          getRender={getRender}
          mood={mood}
          tuned={tuned}
          mine={mine}
          setMine={setMine}
          onPlay={openMove}
        />
      ) : null}
      {tab === 'moonrise' ? <MoonrisePage /> : null}
      {tab === 'usage' ? <UsagePage name={nameOf} onPlay={openMove} /> : null}
      {tab === 'notes' ? <NotesPage name={nameOf} onPlay={openMove} /> : null}
      {tab === 'images' ? <ImagesPage images={images} /> : null}
    </div>
  );
}

// ---- Animate: curves and filmstrip ----

/** The frame number, time and scrubber: the only text that changes every frame. */
function Clock({ take, frames, onSeek }: { take: Take; frames: FrameStore; onSeek: (f: number) => void }) {
  const frame = useFrame(frames);
  return (
    <>
      <div className="clock">
        <span>
          Frame <strong>{frame}</strong> of {take.frames.length - 1}
        </span>
        <span>
          <strong>{ms(frame - take.preroll)}</strong> ms from the start of the move · {ms(take.frames.length - take.preroll)} ms long
        </span>
        <span className="dim">seed {take.seed}</span>
      </div>
      <input className="scrub" type="range" min={0} max={take.frames.length - 1} value={frame} onChange={(e) => onSeek(Number(e.target.value))} />
    </>
  );
}

/** Every channel's number, for the frame on show, or live (a few times a second). */
function Readout({ take, frames, live, getRig }: { take: Take | null; frames: FrameStore; live: boolean; getRig: () => LocRig | null }) {
  const frame = useFrameEvery(frames, LIVE_READOUT_MS);
  const [now, setNow] = useState<Record<LocChannel, number> | null>(null);
  useEffect(() => {
    if (!live) return;
    const t = setInterval(() => setNow(getRig()?.channels ?? null), LIVE_READOUT_MS);
    return () => clearInterval(t);
  }, [live, getRig]);
  const shown = live ? now : (take?.channels[frame] ?? null);
  if (!shown) return null;
  return (
    <table>
      <tbody>
        {(Object.keys(LOC_BASE) as LocChannel[]).map((c) => (
          <tr key={c}>
            <td>{c}</td>
            <td className="num">{shown[c].toFixed(c === 'y' || c === 'sink' || c.startsWith('ear') || c === 'tilt' || c === 'slope' ? 1 : 3)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** The curves are drawn once per take; only the playhead moves, without a re-render. */
function Curves({ take, frames, channels, onSeek }: { take: Take; frames: FrameStore; channels: LocChannel[]; onSeek: (f: number) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const head = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const ranges = useMemo(
    () =>
      channels.map((c) => {
        let lo = Infinity, hi = -Infinity;
        for (const ch of take.channels) {
          lo = Math.min(lo, ch[c]);
          hi = Math.max(hi, ch[c]);
        }
        return { c, lo, hi };
      }),
    [take, channels],
  );

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const draw = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = canvas.clientWidth, h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      const ctx = canvas.getContext('2d')!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const n = take.frames.length;
      const x = (f: number) => (f / Math.max(1, n - 1)) * (w - 2) + 1;
      // Every 100 ms, and the second marks stronger.
      for (let f = take.preroll % 6; f < n; f += 6) {
        const t = ms(f - take.preroll);
        if (t < 0) continue;
        ctx.fillStyle = t % 1000 === 0 ? '#3A3D4A' : '#22242C';
        ctx.fillRect(Math.round(x(f)), 0, 1, h);
      }
      ctx.fillStyle = '#5B6075';
      ctx.fillRect(Math.round(x(take.preroll)), 0, 1, h);
      for (const cue of take.cues) {
        ctx.fillStyle = '#F2C14E';
        ctx.fillRect(Math.round(x(cue.frame)), 0, 2, 10);
      }
      ranges.forEach(({ c, lo, hi }, i) => {
        ctx.strokeStyle = CURVE_COLORS[i % CURVE_COLORS.length];
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        take.channels.forEach((ch, f) => {
          const v = hi - lo < 1e-6 ? 0.5 : (ch[c] - lo) / (hi - lo);
          const y = h - 8 - v * (h - 22);
          if (f === 0) ctx.moveTo(x(f), y);
          else ctx.lineTo(x(f), y);
        });
        ctx.stroke();
      });
    };
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [take, ranges]);

  useEffect(() => {
    const move = () => {
      const canvas = ref.current, line = head.current;
      if (!canvas || !line) return;
      const n = take.frames.length;
      line.style.transform = `translateX(${(frames.get() / Math.max(1, n - 1)) * (canvas.clientWidth - 2)}px)`;
    };
    move();
    return frames.subscribe(move);
  }, [take, frames]);

  const at = (e: PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    onSeek(Math.round(((e.clientX - r.left) / r.width) * (take.frames.length - 1)));
  };
  return (
    <div className="curves">
      <div className="graph">
        <canvas
          ref={ref}
          onPointerDown={(e) => {
            dragging.current = true;
            e.currentTarget.setPointerCapture(e.pointerId);
            at(e);
          }}
          onPointerMove={(e) => dragging.current && at(e)}
          onPointerUp={() => (dragging.current = false)}
        />
        <div ref={head} className="playhead" />
      </div>
      <div className="legend">
        {ranges.map(({ c, lo, hi }, i) => (
          <span key={c} style={{ color: CURVE_COLORS[i % CURVE_COLORS.length] }}>
            {c} <span className="dim">{lo.toFixed(2)} … {hi.toFixed(2)}</span>
          </span>
        ))}
        <span className="dim">Each curve has its own scale. The faint line is where the move starts; yellow ticks are what he says. Drag to scrub.</span>
      </div>
    </div>
  );
}

const Filmstrip = memo(function Filmstrip({
  take,
  step,
  setStep,
  frames: store,
  onSeek,
  paint,
  redraw,
}: {
  take: Take;
  step: number;
  setStep: (n: number) => void;
  frames: FrameStore;
  onSeek: (f: number) => void;
  paint: (c: HTMLCanvasElement, f: number) => void;
  redraw: string;
}) {
  const frames = useMemo(() => Array.from({ length: Math.ceil(take.frames.length / step) }, (_, i) => i * step), [take, step]);
  const [canvases] = useState(() => new Map<number, HTMLCanvasElement>());
  const [buttons] = useState(() => new Map<number, HTMLButtonElement>());
  // The highlight follows the frame on show by itself, without re-rendering every thumbnail.
  useEffect(() => {
    let lit: HTMLButtonElement | undefined;
    const light = () => {
      lit?.classList.remove('on');
      lit = buttons.get(Math.floor(store.get() / step) * step);
      lit?.classList.add('on');
    };
    light();
    return store.subscribe(light);
  }, [store, step, frames, buttons]);
  const paintRef = useRef(paint);
  useLayoutEffect(() => {
    paintRef.current = paint;
  });
  useEffect(() => {
    for (const f of frames) {
      const c = canvases.get(f);
      if (c) paintRef.current(c, f);
    }
  }, [frames, redraw, canvases]);

  const sheet = () => {
    const cells = frames.map((f) => ({ canvas: canvases.get(f)!, label: `${f} · ${ms(f - take.preroll)} ms` })).filter((c) => c.canvas);
    download(grid(cells, 10, '#0E0F13'), `loc-${take.action.id}-filmstrip-every${step}.png`);
  };

  return (
    <div className="film">
      <div className="row">
        <h3>Every frame</h3>
        <Segmented label="Show" value={String(step)} options={[1, 2, 4, 8].map((s) => ({ id: String(s), label: s === 1 ? 'all' : `1 in ${s}` }))} onChange={(v) => setStep(Number(v))} />
        <button onClick={sheet}>Save as a sheet</button>
      </div>
      <div className="thumbs">
        {frames.map((f) => (
          <button key={f} ref={keepButton(buttons, f)} className="thumb" onClick={() => onSeek(f)}>
            <canvas ref={keep(canvases, f)} />
            <span>
              {f} <span className="dim">{ms(f - take.preroll)}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
});

// ---- Style ----

type Paint = (target: HTMLCanvasElement, snap: LocSnapshot, w: number, share: number, bg: Backdrop, strip: number, transparent?: boolean) => void;

function StylePage({
  mood,
  setMood,
  paintStill,
  backdrop,
  getBase,
  onTuned,
}: {
  mood: LocMood;
  setMood: (m: LocMood) => void;
  paintStill: Paint;
  backdrop: Backdrop;
  getBase: () => LocSnapshot | null;
  onTuned: () => void;
}) {
  const [, bump] = useState(0);
  const [code, setCode] = useState<string | null>(null);
  const big = useRef<HTMLCanvasElement>(null);
  const [small] = useState(() => new Map<LocMood, HTMLCanvasElement>());
  const render = useRef<LocRig | null>(null);
  const settled = useRef<(m: LocMood) => LocSnapshot | null>(() => null);

  // A throwaway rig to settle each mood's pose on (simulation only; nothing is drawn with it).
  useEffect(() => {
    const canvas = document.createElement('canvas');
    const rig = new LocRig(canvas, 'awake');
    render.current = rig;
    settled.current = (m) => {
      const base = getBase();
      return base ? rest(rig, base, m) : null;
    };
    return () => rig.dispose();
  }, [getBase]);

  const repaint = useCallback(() => {
    const snapOf = settled.current;
    const b = big.current;
    const s = snapOf(mood);
    if (b && s) paintStill(b, s, 720, 0.9, backdrop, 12);
    for (const m of MOODS) {
      const c = small.get(m), snap = snapOf(m);
      if (c && snap) paintStill(c, snap, 280, 0.9, backdrop, 6);
    }
  }, [mood, paintStill, backdrop, small]);

  useEffect(repaint);

  const changed = () => {
    onTuned();
    bump((n) => n + 1);
    setCode(null);
  };
  const list = changes();

  return (
    <div className="page style">
      <aside className="sliders">
        <h3>Face (every mood)</h3>
        <Slider label="Eye size" value={LOC_TUNE.button} min={18} max={56} step={0.5} onChange={(v) => (setTune({ button: v }), changed())} />
        <Slider label="Pupil size" value={LOC_TUNE.pupil} min={8} max={32} step={0.5} onChange={(v) => (setTune({ pupil: v }), changed())} />
        <label className="field">
          <span>Eye white</span>
          <input type="color" value={LOC_TUNE.eyeWhite} onChange={(e) => (setTune({ eyeWhite: e.target.value.toUpperCase() }), changed())} />
        </label>

        <h3>Signature traits (every mood)</h3>
        <Slider label="Heavy lid (right eye)" value={LOC_TUNE.heavyLid} min={0} max={0.35} step={0.01} onChange={(v) => (setTune({ heavyLid: v }), changed())} />
        <Select
          label="Face timing"
          value={String(LOC_TUNE.faceSteps)}
          options={[
            { id: '0', label: 'Smooth (60 a second)' },
            { id: '12', label: 'On twos (12 poses a second)' },
            { id: '8', label: 'On threes (8 a second)' },
          ]}
          onChange={(v) => (setTune({ faceSteps: Number(v) }), changed())}
        />
        <Toggle label="Snap darts and thought-blinks" on={LOC_TUNE.snapGaze} onChange={(v) => (setTune({ snapGaze: v }), changed())} />
        <Slider label="Blink lag, right eye (ms)" value={LOC_TUNE.blinkLag} min={0} max={80} step={5} onChange={(v) => (setTune({ blinkLag: v }), changed())} />

        <h3>Pose: {mood}</h3>
        <p className="dim small">Pick the mood at the top, or tap one of the five on the right.</p>
        {POSE.map((p) => (
          <Slider key={p.key} label={p.label} value={poseValue(mood, p.key)} min={p.min} max={p.max} step={p.step} onChange={(v) => (setPose(mood, p.key, v), changed())} />
        ))}
        <Slider label="Breathing speed" value={LOC_MOODS[mood].rate} min={0.08} max={0.8} step={0.01} onChange={(v) => (setMoodTiming(mood, { rate: v }), changed())} />
        <Select
          label="Blinks"
          value={String(LOC_MOODS[mood].blinks)}
          options={[
            { id: 'false', label: 'Never' },
            { id: 'slow', label: 'Slow' },
            { id: 'normal', label: 'Normal' },
          ]}
          onChange={(v) => (setMoodTiming(mood, { blinks: v === 'false' ? false : (v as 'slow' | 'normal') }), changed())}
        />
      </aside>

      <main className="preview">
        <canvas ref={big} className="big" />
        <div className="moods">
          {MOODS.map((m) => (
            <button key={m} className={`thumb ${m === mood ? 'on' : ''}`} onClick={() => setMood(m)}>
              <canvas ref={keep(small, m)} />
              <span>{m}</span>
            </button>
          ))}
        </div>
        <p className="dim small">
          Changes apply at once, here and in Animate (moves are recorded again), and are remembered in this browser. They don’t
          change the app until the code below goes into loc-rig.ts.
        </p>
        <div className="row">
          <button onClick={() => setCode(asCode())}>Show as code</button>
          <button
            onClick={() => {
              resetAll();
              changed();
            }}
          >
            Back to what shipped
          </button>
        </div>
        {list.length ? (
          <ul className="changes">
            {list.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        ) : (
          <p className="dim small">Nothing changed from what shipped.</p>
        )}
        {code ? (
          <>
            <textarea readOnly value={code} rows={9} onFocus={(e) => e.currentTarget.select()} />
            <button onClick={() => navigator.clipboard?.writeText(code).catch(() => {})}>Copy</button>
          </>
        ) : null}
      </main>
    </div>
  );
}

// ---- Model sheet ----

function SheetPage({
  paintStill,
  backdrop,
  getBase,
  getRender,
  tuned,
}: {
  paintStill: Paint;
  backdrop: Backdrop;
  getBase: () => LocSnapshot | null;
  getRender: () => { rig: LocRig } | null;
  tuned: number;
}) {
  const [faces] = useState(() => new Map<string, HTMLCanvasElement>());
  const [stills] = useState(() => new Map<string, HTMLCanvasElement>());
  const [sizes] = useState(() => new Map<string, HTMLCanvasElement>());

  useEffect(() => {
    const base = getBase(), render = getRender();
    if (!base || !render) return;
    // Rest poses, settled on the render rig, then drawn (paintStill restores each one). Painted a
    // few a frame (paintLater) so the page doesn't lock up, and by size so the canvas isn't resized
    // between each one.
    const rests = new Map(MOODS.map((m) => [m, rest(render.rig, base, m)]));
    const jobs: (() => void)[] = [];
    for (const m of MOODS) jobs.push(() => {
      const c = faces.get(m);
      if (c) paintStill(c, rests.get(m)!, 360, 0.9, backdrop, 8);
    });
    const takes = new Map<string, Take>();
    for (const s of STILLS) jobs.push(() => {
      const a = ACTIONS.find((x) => x.id === s.action)!;
      if (!takes.has(a.id)) takes.set(a.id, record(render.rig, base, a, a.mood ?? 'awake', 7, false));
      const t = takes.get(a.id)!;
      const c = stills.get(s.label);
      if (c) paintStill(c, t.frames[stillFrame(t, s)], 360, 0.9, backdrop, 8);
    });
    for (const size of SIZES) {
      for (const bg of ['moon', 'night'] as Backdrop[]) {
        for (const m of MOODS) jobs.push(() => {
          const c = sizes.get(`${bg}|${m}|${size.label}`);
          if (!c) return;
          paintStill(c, rests.get(m)!, size.w * 2, 0.9, bg, 4);
          c.style.width = `${size.w}px`;
        });
      }
    }
    return paintLater(jobs);
  }, [getBase, getRender, paintStill, backdrop, tuned, faces, stills, sizes]);

  const save = (map: Map<string, HTMLCanvasElement>, labels: string[], name: string, cols: number) => {
    const cells = labels.map((l) => ({ canvas: map.get(l)!, label: l.split('|').pop()! })).filter((c) => c.canvas);
    download(grid(cells, cols, '#0E0F13'), name);
  };

  return (
    <div className="page sheet">
      <section>
        <div className="row">
          <h3>Expressions: his five moods at rest</h3>
          <button onClick={() => save(faces, MOODS, 'loc-expressions.png', 5)}>Save as PNG</button>
        </div>
        <div className="cells">
          {MOODS.map((m) => (
            <figure key={m}>
              <canvas ref={keep(faces, m)} />
              <figcaption>{m}</figcaption>
            </figure>
          ))}
        </div>
      </section>
      <section>
        <div className="row">
          <h3>Acting: the key pose of each move</h3>
          <button onClick={() => save(stills, STILLS.map((s) => s.label), 'loc-key-poses.png', 5)}>Save as PNG</button>
        </div>
        <div className="cells">
          {STILLS.map((s) => (
            <figure key={s.label}>
              <canvas ref={keep(stills, s.label)} />
              <figcaption>{s.label}</figcaption>
            </figure>
          ))}
        </div>
      </section>
      <section>
        <h3>Sizes: does he still read?</h3>
        <p className="dim small">At the sizes he’s shown in the app, in points, on the moon and on the night sky. He only reads against something light.</p>
        <div className="sizecols">
        {(['moon', 'night'] as Backdrop[]).map((bg) => (
          <div key={bg} className="sizes">
            <h3>{bg === 'moon' ? 'On the moon' : 'On the night sky'}</h3>
            {MOODS.map((m) => (
              <div key={m} className="sizerow">
                <span className="dim">{m}</span>
                {SIZES.map((size) => (
                  <figure key={size.label}>
                    <canvas ref={keep(sizes, `${bg}|${m}|${size.label}`)} />
                    <figcaption>{size.label}</figcaption>
                  </figure>
                ))}
              </div>
            ))}
          </div>
        ))}
        </div>
      </section>
    </div>
  );
}

// ---- Images ----

function ImagesPage({ images }: { images: Image[] }) {
  return (
    <div className="page images">
      <figure>
        <svg viewBox={`0 0 ${LOC_WIDTH} ${LOC_HEIGHT}`} className="art">
          <rect width={LOC_WIDTH} height={LOC_HEIGHT} fill="#D8D5E2" />
          <path d={LOC_PATH} transform={`translate(0 ${LOC_HEIGHT}) scale(0.1 -0.1)`} fill="#000" />
        </svg>
        <figcaption>
          <strong>The silhouette</strong>
          <span className="dim">loc-path.ts. The path everything is built on: the rig skins it, and the still peek (loc-peek.tsx) draws it as is.</span>
        </figcaption>
      </figure>
      {images.map((img) => (
        <figure key={img.uri}>
          <img src={img.uri} alt={img.title} className="art" />
          <figcaption>
            <strong>{img.title}</strong>
            <span className="dim">{img.note}</span>
          </figcaption>
        </figure>
      ))}
      <p className="dim small">
        Studies that aren’t in the app (eye study, headband study, filmstrips, the first browser rig) are in
        docs/design-references/loc-animation and loc-poses, on your computer only.
      </p>
    </div>
  );
}

const CSS = `
.studio { position: absolute; inset: 0; overflow: auto; background: #0E0F13; color: #E7E7EA;
  font: 14px/1.4 -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; -webkit-text-size-adjust: 100%; }
.studio * { box-sizing: border-box; }
.studio h3 { font-size: 12px; text-transform: uppercase; letter-spacing: .06em; color: #9A9BA5; margin: 16px 0 8px; font-weight: 600; }
.studio .dim { color: #8C8D97; }
.studio .small { font-size: 12px; }
.studio button { font: inherit; color: inherit; background: #1C1E25; border: 1px solid #2A2D37; border-radius: 8px; padding: 6px 10px; cursor: pointer; }
.studio button:hover { border-color: #3D4150; }
.studio button.on { background: #2B3350; border-color: #6F86D9; }
.studio button:disabled { opacity: .35; cursor: default; }
.studio select, .studio textarea { font: inherit; color: inherit; background: #1C1E25; border: 1px solid #2A2D37; border-radius: 8px; padding: 6px 8px; }
.studio textarea { width: 100%; font-family: ui-monospace, Menlo, monospace; font-size: 12px; margin: 8px 0; }
.studio input[type=range] { width: 100%; accent-color: #8FA8FF; }
.studio .hidden { display: none !important; }
.studio .row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin: 8px 0; }
.studio .row h3 { margin: 0 8px 0 0; }

.studio .bar { position: sticky; top: 0; z-index: 2; display: flex; flex-wrap: wrap; align-items: center; gap: 12px;
  padding: 10px 16px; background: #0E0F13; border-bottom: 1px solid #23252E; }
.studio .title { display: flex; flex-direction: column; margin-right: auto; }
.studio .tabs { display: flex; gap: 4px; }
.studio .controls { display: flex; flex-wrap: wrap; gap: 10px 18px; align-items: flex-end; padding: 12px 16px; border-bottom: 1px solid #23252E; }
.studio .field { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: #9A9BA5; }
.studio .field.toggle { flex-direction: row; align-items: center; gap: 6px; color: #E7E7EA; font-size: 13px; }
.studio .seg { display: flex; flex-wrap: wrap; gap: 2px; }
.studio .seg button { padding: 5px 9px; border-radius: 6px; font-size: 13px; }

.studio .page { padding: 12px 16px 48px; }
.studio .animate { display: grid; grid-template-columns: 220px minmax(0, 1fr) 230px; gap: 18px; }
/* Wide screens: the Animate page fills the window and each column scrolls on its own, so he stays
   in view while you go down the list of moves. */
@media (min-width: 1001px) {
  .studio { display: flex; flex-direction: column; }
  .studio > .bar, .studio > .controls { flex: none; }
  .studio > .page { flex: none; }
  .studio > .page.animate { flex: 1 1 0; min-height: 0; padding-bottom: 0; }
  .studio .animate > .library, .studio .animate > .center, .studio .animate > .readout { overflow-y: auto; min-height: 0; padding-bottom: 24px; }
  .studio .animate > .library { padding-right: 6px; }
}
.studio .library .group h3:first-child { margin-top: 4px; }
.studio .move { display: block; width: 100%; text-align: left; margin-bottom: 4px; }
.studio .note { min-height: 40px; margin-bottom: 8px; }
.studio .stage { position: relative; border-radius: 12px; overflow: hidden; border: 1px solid #23252E; }
.studio .stage .bg { display: block; width: 100%; }
.studio .stage .loc { position: absolute; left: 0; top: 0; width: 100%; touch-action: manipulation; cursor: pointer; }
.studio .transport { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 8px; margin: 10px 0; }
.studio .transport .play { min-width: 72px; }
.studio .clock { display: flex; flex-wrap: wrap; gap: 6px 18px; font-variant-numeric: tabular-nums; }
.studio .scrub { margin: 6px 0 4px; }
.studio .graph { position: relative; }
.studio .playhead { position: absolute; left: 0; top: 0; bottom: 0; width: 2px; background: #FFFFFF; pointer-events: none; will-change: transform; }
.studio .curves canvas { display: block; width: 100%; height: 170px; background: #14151B; border: 1px solid #23252E; border-radius: 10px; cursor: ew-resize; touch-action: none; }
.studio .legend { display: flex; flex-wrap: wrap; gap: 4px 14px; font-size: 12px; margin: 6px 0; font-variant-numeric: tabular-nums; }
.studio .chips { display: flex; flex-wrap: wrap; gap: 4px; margin: 6px 0 4px; }
.studio .chip { padding: 3px 8px; font-size: 12px; border-radius: 999px; }
.studio .chip.on { background: #1C1E25; border-width: 2px; }
.studio .film { margin-top: 14px; }
.studio .thumbs { display: flex; flex-wrap: wrap; gap: 6px; }
.studio .thumb { padding: 4px; display: flex; flex-direction: column; align-items: center; gap: 2px; font-size: 11px; font-variant-numeric: tabular-nums; }
.studio .thumb canvas { display: block; width: 120px; border-radius: 6px; }
.studio .readout table { width: 100%; border-collapse: collapse; font-size: 13px; font-variant-numeric: tabular-nums; }
.studio .readout td { padding: 2px 0; border-bottom: 1px solid #1E2028; }
.studio .readout .num { text-align: right; }
.studio .cue { display: block; width: 100%; text-align: left; margin-bottom: 4px; font-size: 13px; }

.studio .style { display: grid; grid-template-columns: 320px minmax(0, 1fr); gap: 24px; }
.studio .slider { display: flex; flex-direction: column; gap: 2px; margin-bottom: 10px; font-size: 13px; }
.studio .slider strong { font-variant-numeric: tabular-nums; }
.studio .preview .big { display: block; width: 100%; max-width: 560px; margin: 0 auto 12px; border-radius: 12px; }
.studio .moods { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-bottom: 12px; }
.studio .changes { font-size: 13px; padding-left: 18px; }

.studio .sheet section { margin-bottom: 20px; }
.studio .cells { display: flex; flex-wrap: wrap; gap: 10px; }
.studio figure { margin: 0; display: flex; flex-direction: column; align-items: center; gap: 4px; }
.studio figcaption { font-size: 12px; color: #9A9BA5; text-align: center; }
.studio .cells canvas { width: 180px; border-radius: 8px; }
.studio .sizecols { display: flex; flex-wrap: wrap; gap: 8px 40px; }
.studio .sizes { margin: 4px 0 16px; }
.studio .sizerow { display: flex; align-items: flex-end; gap: 14px; margin-bottom: 8px; }
.studio .sizerow > .dim { width: 70px; font-size: 12px; }

.studio .images { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 18px; }
.studio .images .art { width: 100%; max-height: 300px; object-fit: contain; background: #D8D5E2; border-radius: 10px; }
.studio .images figcaption { display: flex; flex-direction: column; gap: 2px; text-align: left; align-self: stretch; }
.studio .images > p { grid-column: 1 / -1; }

@media (max-width: 1000px) {
  .studio .bar { position: static; padding: 8px 12px; gap: 8px; }
  .studio .title span { display: none; }
  .studio .tabs button, .studio .close { padding: 5px 8px; }
  .studio .controls { padding: 10px 12px; }
  .studio .page { padding: 10px 12px 40px; }
  .studio .animate { grid-template-columns: minmax(0, 1fr); }
  .studio .animate .center { order: 1; }
  .studio .animate .library { order: 2; }
  .studio .animate .readout { order: 3; }
  .studio .library { display: flex; flex-wrap: wrap; gap: 4px 12px; }
  .studio .library .group { min-width: 150px; }
  .studio .style { grid-template-columns: minmax(0, 1fr); }
}
`;
