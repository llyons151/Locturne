import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { locLine, type LocCue } from '@/features/home/loc-lines';
import type { LocMood, LocRig, LocSnapshot } from '@/features/home/loc-rig';

import { grid, keep, paintLater, Slider } from './controls';
import { EXPRESSIONS, FACE_CONTROLS, faceCode, holdFace, saveMine, type Expression, type Face } from './expressions';
import { clearNotes, notesText, setNote, useNotes, VERDICTS } from './notes';
import { download, type Backdrop } from './paint';
import { MOODS, rest } from './takes';
import { idleTable, moodSurfaces, SURFACES, unused, usedIn } from './usage';

/**
 * The Loc studio's newer pages (October 15, 2026): Expressions (new faces, and a builder for
 * your own), In the app (where every move and mood is seen, and how often) and Notes (your
 * good and bad marks on everything, saved where Claude can read them).
 */
export type Paint = (target: HTMLCanvasElement, snap: LocSnapshot, w: number, share: number, bg: Backdrop, strip: number, transparent?: boolean) => void;
type Render = () => { rig: LocRig } | null;
/** Opens a move (an action id) in Animate, in a mood if given. */
export type Play = (id: string, mood?: LocMood) => void;

/** Home draws him 105 pt wide on a phone (27% of the screen). */
const HOME_W = 105;

// ---- Good or bad ----

export function VerdictBar({ id, label }: { id: string; label?: string }) {
  const notes = useNotes();
  const note = notes[id] ?? {};
  return (
    <div className="verdict">
      {VERDICTS.map((v) => (
        <button
          key={v.id}
          className={`v-${v.id} ${note.verdict === v.id ? 'on' : ''}`}
          onClick={() => setNote(id, { verdict: note.verdict === v.id ? undefined : v.id }, label)}
        >
          {v.label}
        </button>
      ))}
      <input
        type="text"
        placeholder="Note (what to change)"
        value={note.text ?? ''}
        onChange={(e) => setNote(id, { text: e.target.value }, label)}
      />
    </div>
  );
}

// ---- Expressions ----

const BLANK: Expression = { id: 'new', label: '', reads: '', moment: '', face: {}, mine: true };

export function ExpressionsPage({
  paintStill,
  backdrop,
  getBase,
  getRender,
  mood,
  tuned,
  mine,
  setMine,
  onPlay,
}: {
  paintStill: Paint;
  backdrop: Backdrop;
  getBase: () => LocSnapshot | null;
  getRender: Render;
  mood: LocMood;
  tuned: number;
  mine: Expression[];
  setMine: (list: Expression[]) => void;
  onPlay: Play;
}) {
  const all = useMemo(() => [...mine, ...EXPRESSIONS], [mine]);
  const [cards] = useState(() => new Map<string, HTMLCanvasElement>());
  const [smalls] = useState(() => new Map<string, HTMLCanvasElement>());
  const [moodCells] = useState(() => new Map<LocMood, HTMLCanvasElement>());
  const [draft, setDraft] = useState<Expression>(BLANK);
  const [code, setCode] = useState<string | null>(null);
  const big = useRef<HTMLCanvasElement>(null);
  const small = useRef<HTMLCanvasElement>(null);

  const still = useCallback(
    (e: Pick<Expression, 'face' | 'hold' | 'pop'>) => {
      const base = getBase(), r = getRender();
      return base && r ? holdFace(r.rig, base, mood, e) : null;
    },
    [getBase, getRender, mood],
  );

  // The gallery and the five moods it's measured against.
  useEffect(() => {
    const base = getBase(), r = getRender();
    if (!base || !r) return;
    // A few a frame, and grouped by size so the drawing canvas isn't resized between each one.
    const snaps = new Map<string, LocSnapshot | null>();
    const snapOf = (e: Expression) => (snaps.has(e.id) ? snaps.get(e.id)! : (snaps.set(e.id, still(e)), snaps.get(e.id)!));
    const jobs: (() => void)[] = [];
    for (const e of all) jobs.push(() => {
      const c = cards.get(e.id), snap = snapOf(e);
      if (c && snap) paintStill(c, snap, 480, 0.9, backdrop, 6);
    });
    for (const e of all) jobs.push(() => {
      const s = smalls.get(e.id), snap = snapOf(e);
      if (!s || !snap) return;
      paintStill(s, snap, HOME_W * 2, 0.9, 'moon', 4);
      s.style.width = `${HOME_W}px`;
    });
    for (const m of MOODS) jobs.push(() => {
      const c = moodCells.get(m);
      if (c) paintStill(c, rest(r.rig, base, m), 220, 0.9, backdrop, 4);
    });
    return paintLater(jobs);
  }, [all, still, paintStill, backdrop, getBase, getRender, tuned, cards, smalls, moodCells]);

  // The builder's preview, big and at Home's size.
  // Once a frame at most while a slider is dragged: only the newest face is drawn.
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      const snap = still(draft);
      if (!snap) return;
      if (big.current) paintStill(big.current, snap, 640, 0.9, backdrop, 10);
      if (small.current) {
        paintStill(small.current, snap, HOME_W * 2, 0.9, 'moon', 4);
        small.current.style.width = `${HOME_W}px`;
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [draft, still, paintStill, backdrop, tuned]);

  const setFace = (patch: Face) => {
    setDraft((d) => ({ ...d, face: { ...d.face, ...patch } }));
    setCode(null);
  };
  // What the slider shows when the face leaves a channel alone: his mood's own value.
  const restValues = useMemo(() => {
    const base = getBase(), r = getRender();
    if (!base || !r) return null;
    r.rig.restore(rest(r.rig, base, mood));
    return r.rig.channels;
    // `tuned`: the mood's pose was changed on the Style page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getBase, getRender, mood, tuned]);

  const saveDraft = () => {
    const label = draft.label.trim() || 'Untitled';
    const id = draft.mine && draft.id !== 'new' ? draft.id : `mine-${Date.now().toString(36)}`;
    const entry: Expression = { ...draft, id, label, mine: true };
    const next = mine.some((m) => m.id === id) ? mine.map((m) => (m.id === id ? entry : m)) : [entry, ...mine];
    setMine(next);
    saveMine(next);
    setDraft(entry);
  };
  const remove = (id: string) => {
    const next = mine.filter((m) => m.id !== id);
    setMine(next);
    saveMine(next);
    if (draft.id === id) setDraft(BLANK);
  };
  const saveSheet = () => {
    const cells = all.map((e) => ({ canvas: cards.get(e.id)!, label: e.label })).filter((c) => c.canvas);
    download(grid(cells, 4, '#0E0F13'), 'loc-expressions-new.png');
  };

  const groups = [...new Set(FACE_CONTROLS.map((c) => c.group))];
  return (
    <div className="page faces">
      <section className="builder">
        <aside className="sliders">
          <div className="row">
            <h3>Build a face</h3>
            <button onClick={() => (setDraft(BLANK), setCode(null))}>Start blank</button>
          </div>
          <p className="dim small">
            Starts from his <strong>{mood}</strong> face (the mood at the top). Each slider you touch is part of the expression; the
            rest stay as the mood has them.
          </p>
          {groups.map((g) => (
            <div key={g}>
              <h3>{g}</h3>
              {FACE_CONTROLS.filter((c) => c.group === g).map((c) => {
                const set = draft.face[c.key] !== undefined;
                const shown = draft.face[c.key] ?? restValues?.[c.key] ?? 0;
                return (
                  <div key={c.key} className={`facectl ${set ? 'set' : ''}`}>
                    <Slider label={c.label} value={shown} min={c.min} max={c.max} step={c.step} onChange={(v) => setFace({ [c.key]: v })} />
                    {set ? (
                      <button
                        className="unset"
                        title="Leave this to the mood"
                        onClick={() => {
                          const { [c.key]: _, ...face } = draft.face;
                          setDraft((d) => ({ ...d, face }));
                        }}
                      >
                        ×
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ))}
        </aside>
        <main className="preview">
          <canvas ref={big} className="big" />
          <div className="row center">
            <span className="dim small">At Home’s size:</span>
            <canvas ref={small} className="homesize" />
          </div>
          <label className="field">
            <span>Name</span>
            <input type="text" value={draft.label} placeholder="e.g. Suspicious" onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))} />
          </label>
          <label className="field">
            <span>What it should read as</span>
            <input type="text" value={draft.reads} onChange={(e) => setDraft((d) => ({ ...d, reads: e.target.value }))} />
          </label>
          <label className="field">
            <span>Where it could go in the app</span>
            <input type="text" value={draft.moment} onChange={(e) => setDraft((d) => ({ ...d, moment: e.target.value }))} />
          </label>
          <div className="row">
            <button onClick={saveDraft}>{draft.mine && draft.id !== 'new' ? 'Save changes' : 'Save to my expressions'}</button>
            {draft.mine && draft.id !== 'new' ? <button onClick={() => onPlay(`face:${draft.id}`)}>Play it in Animate</button> : null}
            <button onClick={() => setCode(faceCode({ ...draft, id: draft.label || 'new face' }))}>Show as code</button>
          </div>
          {code ? (
            <>
              <textarea readOnly value={code} rows={10} onFocus={(e) => e.currentTarget.select()} />
              <button onClick={() => navigator.clipboard?.writeText(code).catch(() => {})}>Copy</button>
            </>
          ) : null}
        </main>
      </section>

      <section>
        <h3>His five moods, to compare</h3>
        <div className="cells">
          {MOODS.map((m) => (
            <figure key={m}>
              <canvas ref={keep(moodCells, m)} className="mini" />
              <figcaption>{m}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section>
        <div className="row">
          <h3>New expressions ({all.length})</h3>
          <button onClick={saveSheet}>Save as PNG</button>
        </div>
        <p className="dim small">
          Ideas, made from the rig’s own channels. None is in the app yet. Play one to see him snap into it and settle back; Edit
          loads it into the builder.
        </p>
        <div className="facegrid">
          {all.map((e) => (
            <article key={e.id} className="face">
              <canvas ref={keep(cards, e.id)} className="card" />
              <div className="pics">
                <div>
                  <div className="row tight">
                    <strong>{e.label}</strong>
                    {e.mine ? <span className="tag">yours</span> : null}
                  </div>
                  <p className="small">{e.reads}</p>
                </div>
                <canvas ref={keep(smalls, e.id)} className="homesize" title="At Home’s size" />
              </div>
              {e.moment ? <p className="dim small">Could go: {e.moment}</p> : null}
              <div className="row tight">
                <button onClick={() => onPlay(`face:${e.id}`)}>Play</button>
                <button onClick={() => (setDraft({ ...e, mine: e.mine, id: e.mine ? e.id : 'new', label: e.mine ? e.label : `${e.label} (mine)` }), setCode(null), window.scrollTo?.(0, 0))}>
                  Edit
                </button>
                <button onClick={() => setCode(faceCode(e))}>Code</button>
                {e.mine ? <button onClick={() => remove(e.id)}>Delete</button> : null}
              </div>
              <VerdictBar id={`face:${e.id}`} label={e.label} />
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

// ---- In the app ----

const CUES: { cue: LocCue; label: string }[] = [
  { cue: 'hello', label: 'Says hello (a third of the time he comes up)' },
  { cue: 'poke', label: 'Poked (a third of pokes, never twice in a row)' },
  { cue: 'angry', label: 'Bursts out of a burrow (a quarter of the time)' },
];

export function UsagePage({ name, onPlay }: { name: (id: string) => string; onPlay: Play }) {
  const [seed, setSeed] = useState(0);
  const idle = useMemo(() => idleTable(), []);
  const never = useMemo(() => unused(), []);
  const hiddenMoods = MOODS.filter((m) => !moodSurfaces(m).includes('Home'));
  // Sample lines change with the button, not on every render.
  const lines = useMemo(() => {
    const out: Record<string, (string | null)[]> = {};
    for (const { cue } of CUES) for (const m of MOODS) out[`${cue}|${m}`] = [0, 1].map(() => locLine(cue, m, 11));
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed]);

  const chip = (id: string, mood?: LocMood) => (
    <button key={id + (mood ?? '')} className="chip" onClick={() => onPlay(id, mood)}>
      ▶ {name(id)}
    </button>
  );

  return (
    <div className="page usage">
      <section className="callouts">
        <div className="callout">
          <strong>Never seen on Home:</strong> {hiddenMoods.join(', ')}. {hiddenMoods.includes('betrayed') ? 'Betrayed only shows when you miss a push-up.' : ''}
        </div>
        <div className="callout">
          <strong>Never seen anywhere in the app ({never.length}):</strong>
          <div className="chips">{never.map((a) => chip(a.id, a.mood))}</div>
        </div>
      </section>

      {SURFACES.map((s) => (
        <section key={s.id} className="surface">
          <div className="row">
            <h2>{s.name}</h2>
            <span className="dim small">{s.size}</span>
          </div>
          <p className="dim">{s.where}</p>
          <h3>Mood</h3>
          <table>
            <tbody>
              {s.moods.map((m) => (
                <tr key={m.mood}>
                  <td className="k">{chip(`mood:${m.mood}`)}</td>
                  <td>{m.when}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <h3>What makes him move</h3>
          <table>
            <tbody>
              {s.triggers.map((t) => (
                <tr key={t.what}>
                  <td className="k">{t.what}</td>
                  <td>
                    <div className="chips">{t.plays.map((id) => chip(id))}</div>
                    {t.odds ? <span className="dim small">{t.odds}</span> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}

      <section className="surface">
        <h2>When nothing’s happening</h2>
        <p className="dim">
          Every few seconds he picks an idle move for his mood, at random by these odds. Wherever he’s on screen (Home, You, the
          payoff, push-ups), so a mood’s idle moves show everywhere that mood does.
        </p>
        <table>
          <tbody>
            {idle.map((row) => (
              <tr key={row.mood}>
                <td className="k">
                  <strong>{row.mood}</strong>
                  <div className="dim small">
                    every {row.gap[0]}–{row.gap[0] + row.gap[1]} s · {moodSurfaces(row.mood).join(', ')}
                  </div>
                </td>
                <td>
                  {row.moves.map((m) => (
                    <div key={m.id} className="share">
                      <div className="barwrap">
                        <div className="barfill" style={{ width: `${m.share * 100}%` }} />
                      </div>
                      <span className="pct">{Math.round(m.share * 100)}%</span>
                      {chip(m.id, row.mood)}
                    </div>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="surface">
        <div className="row">
          <h2>What he says</h2>
          <button onClick={() => setSeed((n) => n + 1)}>Other lines</button>
        </div>
        <p className="dim">Sample lines on Home, late morning. Moments (bedtime soon, apps asleep, the wake-up done) have their own lines.</p>
        <table>
          <tbody>
            {CUES.map(({ cue, label }) => (
              <tr key={cue}>
                <td className="k">{label}</td>
                <td>
                  {MOODS.filter((m) => lines[`${cue}|${m}`].some(Boolean)).map((m) => (
                    <div key={m} className="line">
                      <span className="dim small">{m}:</span> {lines[`${cue}|${m}`].filter(Boolean).map((l) => `“${l}”`).join('  ·  ')}
                    </div>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

/** "In the app: …" for a move, or that it's never seen. */
export function UsedLine({ id }: { id: string }) {
  const where = usedIn(id);
  return where ? (
    <div className="used small">
      <span className="dim">In the app:</span> {where}
    </div>
  ) : (
    <div className="used small never">Never seen in the app. Studio only.</div>
  );
}

// ---- Notes ----

export function NotesPage({ name, onPlay }: { name: (id: string) => string; onPlay: Play }) {
  const notes = useNotes();
  const [copied, setCopied] = useState(false);
  const entries = Object.entries(notes);
  const text = notesText(notes, name);
  return (
    <div className="page notes">
      <p className="dim">
        Mark moves (in Animate: the buttons, or G and B) and expressions good or bad, with a note if you like. Running on its own
        (`npm run studio`), the studio saves them to docs/loc-studio-notes.json, where Claude reads them; you don’t have to paste
        anything. Copy is there too.
      </p>
      <div className="row">
        <button
          disabled={!entries.length}
          onClick={() =>
            navigator.clipboard
              ?.writeText(text)
              .then(() => setCopied(true))
              .catch(() => {})
          }
        >
          {copied ? 'Copied' : 'Copy all as text'}
        </button>
        <button disabled={!entries.length} onClick={() => confirm('Clear every note?') && clearNotes()}>
          Clear all
        </button>
      </div>
      {entries.length ? (
        <table>
          <tbody>
            {entries.map(([id, n]) => (
              <tr key={id}>
                <td className="k">
                  <button className="chip" onClick={() => onPlay(id)}>
                    ▶ {n.label ?? name(id)}
                  </button>
                </td>
                <td>
                  <VerdictBar id={id} label={n.label} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="dim">No notes yet.</p>
      )}
      {entries.length ? <textarea readOnly value={text} rows={Math.min(20, text.split('\n').length + 1)} /> : null}
    </div>
  );
}

export const PAGES_CSS = `
.studio h2 { font-size: 18px; margin: 0; }
.studio input[type=text] { font: inherit; color: inherit; background: #1C1E25; border: 1px solid #2A2D37; border-radius: 8px; padding: 6px 8px; min-width: 0; }
.studio .verdict { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; margin-top: 6px; }
.studio .verdict input { flex: 1; min-width: 140px; font-size: 13px; }
.studio .verdict button { padding: 4px 9px; font-size: 13px; }
.studio .verdict .v-good.on { background: #1F3A2A; border-color: #5FBF85; }
.studio .verdict .v-bad.on { background: #3E2024; border-color: #D9626F; }
.studio .mark { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 7px; vertical-align: 1px; background: #2A2D37; }
.studio .mark.good { background: #5FBF85; }
.studio .mark.bad { background: #D9626F; }
.studio .used { margin-top: 4px; }
.studio .used.never { color: #D9B44A; }
.studio .tag { font-size: 11px; padding: 1px 6px; border-radius: 999px; background: #2B3350; color: #C9D3FF; }

.studio .faces .builder { display: grid; grid-template-columns: 320px minmax(0, 1fr); gap: 24px; margin-bottom: 18px; }
.studio .faces .preview .field { margin-bottom: 8px; }
.studio .faces .row.center { justify-content: center; }
.studio .faces .homesize { display: block; border-radius: 6px; }
.studio .facectl { position: relative; padding-right: 26px; }
.studio .facectl.set .slider span { color: #C9D3FF; }
.studio .facectl .unset { position: absolute; right: 0; top: 12px; padding: 0 6px; font-size: 13px; }
.studio .faces .mini { width: 140px; border-radius: 8px; }
.studio .facegrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 14px; }
.studio .face { background: #14151B; border: 1px solid #23252E; border-radius: 12px; padding: 10px; display: flex; flex-direction: column; }
.studio .face p { margin: 4px 0; }
.studio .face .card { width: 100%; border-radius: 8px; }
.studio .face .pics { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
.studio .face .pics .homesize { margin-top: 6px; flex: none; }
.studio .row.tight { margin: 6px 0 2px; gap: 6px; }

.studio .usage section, .studio .notes table { max-width: 1100px; }
.studio .surface { margin-bottom: 26px; }
.studio .surface table, .studio .notes table { width: 100%; border-collapse: collapse; }
.studio .surface td, .studio .notes td { padding: 8px 10px 8px 0; border-bottom: 1px solid #1E2028; vertical-align: top; }
.studio .surface td.k, .studio .notes td.k { width: 30%; }
.studio .callouts { display: flex; flex-direction: column; gap: 8px; margin-bottom: 22px; }
.studio .callout { background: #1A1C23; border: 1px solid #2A2D37; border-radius: 10px; padding: 10px 12px; }
.studio .share { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.studio .barwrap { width: 120px; height: 8px; background: #1C1E25; border-radius: 4px; overflow: hidden; flex: none; }
.studio .barfill { height: 100%; background: #6F86D9; }
.studio .pct { width: 36px; text-align: right; font-variant-numeric: tabular-nums; font-size: 12px; }
.studio .line { margin-bottom: 4px; }

@media (max-width: 1000px) {
  .studio .faces .builder { grid-template-columns: minmax(0, 1fr); }
  .studio .surface td.k { width: 40%; }
  .studio .barwrap { width: 60px; }
}
`;
