'use dom';

import { useState } from 'react';

import type { NavKnockTune } from '@/features/home/nav-knock-tune';

type Num = Exclude<keyof NavKnockTune, 'haptics'>;

/** The controls, in plain words, grouped by what they change. */
const GROUPS: { title: string; rows: { key: Num; label: string; min: number; max: number; step: number }[] }[] = [
  {
    title: 'Loc',
    rows: [
      { key: 'scurry', label: 'Scurry speed', min: 0.5, max: 3.5, step: 0.05 },
      { key: 'reach', label: 'How far he runs', min: 0.15, max: 0.48, step: 0.01 },
      { key: 'width', label: 'How far away they feel him (pt)', min: 20, max: 140, step: 1 },
    ],
  },
  {
    title: 'Bounce',
    rows: [
      { key: 'bounce', label: 'Bounce height', min: 0, max: 3, step: 0.05 },
      { key: 'tempo', label: 'Bounces a second', min: 1.5, max: 6, step: 0.1 },
      { key: 'jiggle', label: 'Jiggle (how long it rings)', min: 0, max: 0.95, step: 0.01 },
      { key: 'blast', label: 'Jump when he bursts out', min: 0, max: 3, step: 0.05 },
    ],
  },
  {
    title: 'Feel',
    rows: [
      { key: 'sway', label: 'Sway aside and trail him', min: 0, max: 3, step: 0.05 },
      { key: 'spin', label: 'Roll with the sway', min: 0, max: 1, step: 0.01 },
      { key: 'squash', label: 'Squash and stretch', min: 0, max: 3, step: 0.05 },
    ],
  },
];

/**
 * The knock lab's panel (store.ts): sliders for the burrow's bounce, a Burrow button, presets,
 * and the tuning as code. A DOM component so the same range inputs run on web and in the app.
 */
export default function KnockPanel({
  tune,
  code,
  presets,
  onChange,
  onPreset,
  onBurrow,
  onClose,
}: {
  tune: NavKnockTune;
  code: string;
  presets: string[];
  onChange: (patch: Partial<NavKnockTune>) => void;
  onPreset: (name: string) => void;
  onBurrow: () => void;
  onClose: () => void;
  dom?: import('expo/dom').DOMProps;
}) {
  const [folded, setFolded] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    }, () => setShowCode(true));
  };
  return (
    <div className="kl">
      <style>{CSS}</style>
      <div className="bar">
        <button className="go" onClick={onBurrow}>Burrow</button>
        <button onClick={() => setFolded(!folded)}>{folded ? 'Show controls' : 'Hide controls'}</button>
        <span className="grow" />
        <button aria-label="Close the knock lab" onClick={onClose}>✕</button>
      </div>
      {folded ? null : (
        <div className="body">
          <div className="presets">
            {presets.map((p) => (
              <button key={p} onClick={() => onPreset(p)}>{p}</button>
            ))}
          </div>
          {GROUPS.map((g) => (
            <section key={g.title}>
              <h3>{g.title}</h3>
              {g.rows.map((r) => (
                <label key={r.key} className="slider">
                  <span>
                    {r.label} <strong>{Math.round(tune[r.key] * 100) / 100}</strong>
                  </span>
                  <input type="range" min={r.min} max={r.max} step={r.step} value={tune[r.key]} onChange={(e) => onChange({ [r.key]: Number(e.target.value) })} />
                </label>
              ))}
            </section>
          ))}
          <label className="check">
            <input type="checkbox" checked={tune.haptics} onChange={(e) => onChange({ haptics: e.target.checked })} /> Haptic tick on the bigger bounces (iPhone)
          </label>
          <div className="presets">
            <button onClick={copy}>{copied ? 'Copied' : 'Copy as code'}</button>
            <button onClick={() => setShowCode(!showCode)}>{showCode ? 'Hide code' : 'Show code'}</button>
          </div>
          {showCode ? <pre>{code}</pre> : null}
          <p className="note">Changes apply to the next burrow and stay in this browser. Paste the code into src/features/home/nav-knock-tune.ts to ship them.</p>
        </div>
      )}
    </div>
  );
}

const CSS = `
html, body, #root { margin: 0; padding: 0; background: transparent; }
.kl { color: #E7E7EA; font: 13px/1.35 -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  background: #0E0F13; border: 1px solid #2A2B31; border-radius: 16px; overflow: hidden;
  -webkit-text-size-adjust: 100%; user-select: none; }
.kl * { box-sizing: border-box; }
.bar { display: flex; gap: 6px; align-items: center; padding: 8px; border-bottom: 1px solid #2A2B31; }
.grow { flex: 1; }
.kl button { font: inherit; color: #E7E7EA; background: #23242A; border: 0; border-radius: 999px; padding: 7px 12px; cursor: pointer; }
.kl button:active { opacity: .7; }
.kl .go { background: #FFFFFF; color: #0E0F13; font-weight: 600; }
.body { padding: 4px 12px 12px; max-height: 46vh; overflow: auto; }
.presets { display: flex; gap: 6px; flex-wrap: wrap; margin: 8px 0; }
h3 { font-size: 11px; text-transform: uppercase; letter-spacing: .06em; color: #9A9BA5; margin: 12px 0 4px; font-weight: 600; }
.slider { display: block; margin: 6px 0; }
.slider span { display: flex; justify-content: space-between; color: #C9CAD1; }
.slider strong { color: #FFFFFF; font-variant-numeric: tabular-nums; }
.slider input { width: 100%; accent-color: #FFFFFF; }
.check { display: flex; gap: 8px; align-items: center; margin: 10px 0 4px; color: #C9CAD1; }
pre { background: #000; border-radius: 10px; padding: 10px; font-size: 11px; white-space: pre-wrap; word-break: break-all; user-select: text; }
.note { color: #8A8B94; font-size: 11px; margin: 8px 0 0; }
`;
