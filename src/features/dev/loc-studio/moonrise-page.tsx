import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';

import { LocRig, type LocMood, type LocSnapshot } from '@/features/home/loc-rig';

import { grid, keep, paintLater, Segmented, Toggle } from './controls';
import { MOON_MOVES, drawParts, frameAt, moonUp, paintSky, recordMoon, type MoonMode, type MoonMove, type MoonTake, type MouthStyle } from './moonrise';
import { setNote, useNotes } from './notes';
import { VerdictBar } from './pages';
import { DT, FPS } from './takes';
import { locHeight } from './paint';

/**
 * The Moonrise section: 20 takes of Loc looking up, throwing his arms up and yelling the moon up
 * (moonrise.ts). Its own stage, so the moon can rise behind him in time with each take. Studio only.
 */

const STRIP = 28;
const STAGE_MAX_PX = 1100;
const SPEEDS = [1, 0.5, 0.25, 0.1];
const MOODS: { id: LocMood; label: string }[] = [
  { id: 'awake', label: 'awake' },
  { id: 'smug', label: 'smug' },
  { id: 'groggy', label: 'groggy' },
];
const MOONS: { id: MoonMode; label: string }[] = [
  { id: 'rises', label: 'Rises on the yell' },
  { id: 'up', label: 'Already up' },
  { id: 'none', label: 'No moon' },
];
const MOUTHS: { id: MouthStyle; label: string }[] = [
  { id: 'white', label: 'White' },
  { id: 'cut', label: 'See-through' },
  { id: 'none', label: 'None' },
];
const TILE_W = 300;
const TILE_SHARE = 0.56;
/** Room over the rig's view box: up on tiptoe with his arms up, he's taller than it. */
const HEADROOM = 1.3;
const tall = (w: number, share: number) => Math.round(locHeight(w, share) * HEADROOM);

const ms = (take: MoonTake, frame: number) => Math.round(((frame - take.preroll) / FPS) * 1000);

/** The frame on show, outside React state so playback doesn't re-render the page (as in Animate). */
function frameStore() {
  let value = 0;
  const listeners = new Set<() => void>();
  return {
    get: () => value,
    set(f: number) {
      if (f === value) return;
      value = f;
      listeners.forEach((l) => l());
    },
    subscribe(l: () => void) {
      listeners.add(l);
      return () => void listeners.delete(l);
    },
  };
}
type FrameStore = ReturnType<typeof frameStore>;

export function MoonrisePage() {
  const [moveId, setMoveId] = useState(MOON_MOVES[0].id);
  const [mood, setMood] = useState<LocMood>('awake');
  const [moon, setMoon] = useState<MoonMode>('rises');
  const [mouth, setMouth] = useState<MouthStyle>('white');
  const [zoom, setZoom] = useState(0.5);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [loop, setLoop] = useState(true);
  const [take, setTake] = useState<MoonTake | null>(null);
  const [frames] = useState(frameStore);
  const notes = useNotes();
  const move = MOON_MOVES.find((m) => m.id === moveId) ?? MOON_MOVES[0];

  const wrapRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLCanvasElement>(null);
  const bgRef = useRef<HTMLCanvasElement>(null);
  const rigRef = useRef<LocRig | null>(null);
  const baseRef = useRef<LocSnapshot | null>(null);
  const offRef = useRef<{ rig: LocRig; canvas: HTMLCanvasElement; base: LocSnapshot } | null>(null);
  const [ready, setReady] = useState(false);
  const live$ = useRef({ take, playing, speed, loop, zoom, moon, mouth });
  useLayoutEffect(() => {
    live$.current = { take, playing, speed, loop, zoom, moon, mouth };
  });

  // Two rigs: the stage's, and one off screen for the overview's stills.
  useEffect(() => {
    const canvas = stageRef.current;
    if (!canvas) return;
    const rig = new LocRig(canvas, 'awake');
    rig.setShare(live$.current.zoom);
    baseRef.current = rig.snapshot();
    rigRef.current = rig;
    const offCanvas = document.createElement('canvas');
    const off = new LocRig(offCanvas, 'awake');
    offRef.current = { rig: off, canvas: offCanvas, base: off.snapshot() };
    setReady(true);
    return () => {
      rig.dispose();
      off.dispose();
      rigRef.current = null;
      offRef.current = null;
      setReady(false);
    };
  }, []);

  /** The backdrop for frame `f`: the moon is part of the take, so it's painted every frame. */
  const paintBack = useCallback((f: number) => {
    const bg = bgRef.current, canvas = stageRef.current, s = live$.current;
    if (!bg || !canvas) return;
    const up = s.take ? moonUp(s.take, f, s.moon) : s.moon === 'none' ? -1 : 0;
    const dpr = canvas.width / (canvas.clientWidth || canvas.width);
    paintSky(bg.getContext('2d')!, bg.width, bg.height, canvas.height, canvas.width * s.zoom, STRIP * dpr, up);
  }, []);

  const drawFrame = useCallback(
    (f: number) => {
      const rig = rigRef.current, s = live$.current, canvas = stageRef.current;
      if (!rig || !s.take || !canvas) return;
      const i = Math.max(0, Math.min(f, s.take.frames.length - 1));
      rig.restore(s.take.frames[i]);
      rig.setShare(s.zoom);
      rig.render(DT);
      drawParts(rig, canvas, s.zoom, s.take.parts[i], s.mouth);
      paintBack(i);
    },
    [paintBack],
  );

  const paintStage = useCallback(() => {
    const wrap = wrapRef.current, canvas = stageRef.current, bg = bgRef.current;
    if (!wrap || !canvas || !bg) return;
    const w = wrap.clientWidth;
    const h = tall(w, zoom);
    const dpr = Math.min(2, window.devicePixelRatio || 1, STAGE_MAX_PX / w);
    canvas.style.height = `${h}px`;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    bg.style.height = `${h + STRIP}px`;
    bg.width = Math.round(w * dpr);
    bg.height = Math.round((h + STRIP) * dpr);
    drawFrame(frames.get());
  }, [zoom, drawFrame, frames]);

  useEffect(() => {
    paintStage();
    const wrap = wrapRef.current;
    if (!wrap) return;
    const observer = new ResizeObserver(paintStage);
    observer.observe(wrap);
    return () => observer.disconnect();
  }, [paintStage, ready]);

  useEffect(() => {
    drawFrame(frames.get());
  }, [moon, mouth, drawFrame, frames]);

  const shoot = useCallback(
    (m: MoonMove, keepFrame: boolean) => {
      const rig = rigRef.current, base = baseRef.current;
      if (!rig || !base) return;
      const t = recordMoon(rig, base, m, mood);
      const f = keepFrame ? Math.min(frames.get(), t.frames.length - 1) : 0;
      live$.current = { ...live$.current, take: t };
      setTake(t);
      frames.set(f);
      drawFrame(f);
    },
    [mood, drawFrame, frames],
  );

  const shotId = useRef<string | null>(null);
  useEffect(() => {
    if (!ready) return;
    shoot(move, shotId.current === move.id);
    shotId.current = move.id;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, moveId, mood]);

  // Playback.
  useEffect(() => {
    let raf = 0, last = performance.now(), acc = 0;
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const s = live$.current;
      if (s.take && s.playing) {
        acc += dt * s.speed;
        let f = frames.get();
        const from = f;
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
  }, [drawFrame, frames]);

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

  const open = useCallback(
    (id: string) => {
      setPlaying(true);
      if (id === moveId) shoot(move, false);
      setMoveId(id);
    },
    [moveId, move, shoot],
  );

  // Keys: space plays, arrows step (shift: 10), Home and End jump, up and down change take, G and B mark it.
  const notesRef = useRef(notes);
  useLayoutEffect(() => {
    notesRef.current = notes;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      const f = frames.get();
      const i = MOON_MOVES.findIndex((m) => m.id === moveId);
      if (e.key === ' ') setPlaying((p) => !p);
      else if (e.key === 'ArrowRight') seek(f + (e.shiftKey ? 10 : 1));
      else if (e.key === 'ArrowLeft') seek(f - (e.shiftKey ? 10 : 1));
      else if (e.key === 'Home') seek(0);
      else if (e.key === 'End') seek(Infinity);
      else if (e.key === 'ArrowDown') open(MOON_MOVES[Math.min(MOON_MOVES.length - 1, i + 1)].id);
      else if (e.key === 'ArrowUp') open(MOON_MOVES[Math.max(0, i - 1)].id);
      else if (e.key === 'g' || e.key === 'G' || e.key === 'b' || e.key === 'B') {
        const v = e.key.toLowerCase() === 'g' ? 'good' : 'bad';
        setNote(move.id, { verdict: notesRef.current[move.id]?.verdict === v ? undefined : v }, `Moonrise: ${move.label}`);
      } else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [seek, open, frames, moveId, move]);

  /** Paints `move` at `ms` into `target`, `w` wide, with the moon where it is then. */
  const paintStill = useCallback(
    (target: HTMLCanvasElement, m: MoonMove, at: number, w: number) => {
      const off = offRef.current;
      if (!off) return;
      const h = tall(w, TILE_SHARE);
      off.canvas.width = w;
      off.canvas.height = h;
      const t = recordMoon(off.rig, off.base, m, mood, at);
      const f = frameAt(t, at);
      off.rig.restore(t.frames[f]);
      off.rig.setShare(TILE_SHARE);
      off.rig.render(DT);
      drawParts(off.rig, off.canvas, TILE_SHARE, t.parts[f], live$.current.mouth);
      target.width = w;
      target.height = h + 10;
      const ctx = target.getContext('2d')!;
      paintSky(ctx, w, h + 10, h, w * TILE_SHARE, 10, moonUp(t, f, live$.current.moon));
      ctx.drawImage(off.canvas, 0, 0);
    },
    [mood],
  );

  // Dev hook for reviewing from a script: a labelled contact sheet of a take, as a PNG data URL.
  useEffect(() => {
    if (!ready) return;
    (window as unknown as { __locMoonrise?: object }).__locMoonrise = {
      ids: MOON_MOVES.map((m) => m.id),
      sheet: (id: string, step = 6, width = 220, cols = 8) => {
        const m = MOON_MOVES.find((x) => x.id === id), off = offRef.current;
        if (!m || !off) return null;
        const t = recordMoon(off.rig, off.base, m, mood);
        const cells = [];
        for (let f = 0; f < t.frames.length; f += step) {
          const c = document.createElement('canvas');
          paintStill(c, m, ms(t, f), width);
          cells.push({ canvas: c, label: `${ms(t, f)}ms` });
        }
        return grid(cells, cols, '#0E0F13').toDataURL('image/png');
      },
      peaks: (width = 240, cols = 5) => {
        const cells = MOON_MOVES.map((m) => {
          const c = document.createElement('canvas');
          paintStill(c, m, m.score.peak, width);
          return { canvas: c, label: m.label };
        });
        return grid(cells, cols, '#0E0F13').toDataURL('image/png');
      },
    };
  }, [ready, mood, paintStill]);

  return (
    <div className="page animate moonrise">
      <aside className="library">
        <h3>Moonrise · 20 takes</h3>
        {MOON_MOVES.map((m, i) => (
          <button key={m.id} className={`move ${m.id === moveId ? 'on' : ''}`} onClick={() => open(m.id)}>
            <span className={`mark ${notes[m.id]?.verdict ?? ''}`} />
            <span className="dim">{i + 1}.</span> {m.label}
            {m.mood ? <span className="dim"> · {m.mood}</span> : null}
          </button>
        ))}
      </aside>

      <main className="center">
        <div className="note">
          <strong>{move.label}</strong> <span className="dim">{move.note}</span>
          <VerdictBar key={move.id} id={move.id} label={`Moonrise: ${move.label}`} />
        </div>

        <div className="stage" ref={wrapRef}>
          <canvas ref={bgRef} className="bg" />
          <canvas ref={stageRef} className="loc" onPointerDown={() => setPlaying((p) => !p)} />
        </div>

        <div className="transport">
          <button title="First frame (Home)" onClick={() => seek(0)}>⏮</button>
          <button title="Back a frame (←)" onClick={() => seek(frames.get() - 1)}>◀︎</button>
          <button className="play" title="Play or pause (space)" onClick={() => setPlaying((p) => !p)}>
            {playing ? 'Pause' : 'Play'}
          </button>
          <button title="On a frame (→)" onClick={() => seek(frames.get() + 1)}>▶︎</button>
          <button title="Last frame (End)" onClick={() => seek(Infinity)}>⏭</button>
          <Segmented label="Speed" value={String(speed)} options={SPEEDS.map((s) => ({ id: String(s), label: `${s}×` }))} onChange={(v) => setSpeed(Number(v))} />
          <Toggle label="Loop" on={loop} onChange={setLoop} />
        </div>
        {take ? <MoonClock take={take} frames={frames} onSeek={seek} /> : null}

        {ready ? <Overview paint={paintStill} moveId={moveId} onOpen={open} redraw={`${mood}|${moon}|${mouth}`} /> : null}
      </main>

      <aside className="readout">
        <Segmented label="Starts" value={mood} options={MOODS} onChange={setMood} />
        <div className="gap" />
        <Segmented label="The moon" value={moon} options={MOONS} onChange={setMoon} />
        <div className="gap" />
        <Segmented label="Mouth" value={mouth} options={MOUTHS} onChange={setMouth} />
        <h3>Zoom</h3>
        <input type="range" min={0.25} max={0.8} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} />
        <h3>How it’s made</h3>
        <p className="dim small">
          His head, eyes, ears and shake are the real rig. The arms and mouth are new and drawn on top, in his ink, riding his
          bones: short fluffy arms on two-bone IK, where the paws on the ledge let go and become the hands, and a mouth under his
          eyes. Hands and mouth have their own springs, so they drag and overshoot. Every take uses the same phases (notice, look up,
          wind up, arms up, yell, settle), timed and acted differently.
        </p>
        <p className="dim small">Nothing here is in the app.</p>
        <p className="dim small">
          Keys: space plays, ← → step a frame (shift: 10), ↑ ↓ change take, Home and End jump, G marks it good, B bad.
        </p>
      </aside>
    </div>
  );
}

function MoonClock({ take, frames, onSeek }: { take: MoonTake; frames: FrameStore; onSeek: (f: number) => void }) {
  const frame = useSyncExternalStore(frames.subscribe, frames.get, frames.get);
  const rise = take.preroll + Math.round((take.move.score.rise / 1000) * FPS);
  return (
    <div>
      <div className="clock">
        <span>
          Frame <strong>{frame}</strong> of {take.frames.length - 1}
        </span>
        <span>
          <strong>{ms(take, frame)}</strong> ms
        </span>
        <span className="dim">the moon starts up at {take.move.score.rise} ms</span>
      </div>
      <div className="scrub moon-scrub">
        <input type="range" min={0} max={take.frames.length - 1} value={frame} onChange={(e) => onSeek(Number(e.target.value))} />
        <span className="tick" style={{ left: `${(rise / (take.frames.length - 1)) * 100}%` }} title="The moon starts up" />
      </div>
    </div>
  );
}

/** Every take at its big moment: a tile each, painted a few at a time. Click one to open it. */
function Overview({
  paint,
  moveId,
  onOpen,
  redraw,
}: {
  paint: (c: HTMLCanvasElement, m: MoonMove, ms: number, w: number) => void;
  moveId: string;
  onOpen: (id: string) => void;
  redraw: string;
}) {
  const [canvases] = useState(() => new Map<string, HTMLCanvasElement>());
  const notes = useNotes();
  useEffect(() => {
    const jobs = MOON_MOVES.map((m) => () => {
      const c = canvases.get(m.id);
      if (c) paint(c, m, m.score.peak, TILE_W);
    });
    return paintLater(jobs);
  }, [canvases, paint, redraw]);
  return (
    <section className="overview">
      <h3>All 20, at their big moment</h3>
      <div className="tiles">
        {MOON_MOVES.map((m, i) => (
          <button key={m.id} className={`tile ${m.id === moveId ? 'on' : ''}`} onClick={() => onOpen(m.id)}>
            <canvas ref={keep(canvases, m.id)} />
            <span>
              <span className={`mark ${notes[m.id]?.verdict ?? ''}`} />
              <span className="dim">{i + 1}.</span> {m.label}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

export const MOONRISE_CSS = `
.studio .moonrise .gap { height: 12px; }
.studio .moonrise input[type=range] { margin-left: 0; margin-right: 0; }
.studio .moon-scrub { position: relative; }
.studio .moon-scrub input { width: 100%; }
.studio .moon-scrub .tick { position: absolute; top: -4px; width: 2px; height: 10px; background: #D8D5E2; pointer-events: none; }
.studio .overview { margin-top: 18px; }
.studio .overview .tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; }
.studio .overview .tile { display: flex; flex-direction: column; gap: 4px; padding: 6px; text-align: left; font-size: 12px; }
.studio .overview .tile canvas { display: block; width: 100%; border-radius: 6px; }
`;
