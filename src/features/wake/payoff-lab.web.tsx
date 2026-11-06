import { router } from 'expo-router';
import { useEffect, useRef, useState, type CSSProperties } from 'react';

import { PAYOFF_DEFAULTS, setPayoffTuning, type PayoffTuning } from './payoff-tuning';

/**
 * Dev, browser only: the payoff's entrance in a phone-sized frame, its timings on sliders beside
 * it (/payoff-lab). The frame runs the app (/morning-won?demo=1&lab=1); Replay tells it to go back
 * to Home and open the payoff again, so the fade over Home plays too. Values stay in this browser
 * (both pages read them); Copy puts them on the clipboard to bake into payoff-tuning.ts.
 */
// v2: the slower defaults (user 2026-11-05) replace whatever an older lab saved.
const STORE = 'locturne.payoffLab.v2';
const MESSAGE = 'locturne.payoffLab';
const PHONE = { width: 393, height: 852 };

type Lab = PayoffTuning & { homeMs: number };

const LAB_DEFAULTS: Lab = { ...PAYOFF_DEFAULTS, homeMs: 900 };
const fresh = (): Lab => ({ ...LAB_DEFAULTS, rise: [...LAB_DEFAULTS.rise], band: [...LAB_DEFAULTS.band] });

type Curve = 'rise' | 'band';

function load(): Lab {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE) ?? 'null') as Partial<Lab> | null;
    return {
      ...LAB_DEFAULTS,
      ...saved,
      rise: saved?.rise?.length === 4 ? saved.rise : [...LAB_DEFAULTS.rise],
      band: saved?.band?.length === 4 ? saved.band : [...LAB_DEFAULTS.band],
    };
  } catch {
    return fresh();
  }
}

function save(lab: Lab) {
  try {
    localStorage.setItem(STORE, JSON.stringify(lab));
  } catch {
    // Private window: the values just don't outlive the tab.
  }
}

// At import, before the payoff's first render reads them.
setPayoffTuning(load());

const SLIDERS: { key: keyof Omit<Lab, Curve>; label: string; max: number; step: number }[] = [
  { key: 'homeMs', label: 'Home first (replay only)', max: 3000, step: 50 },
  { key: 'screenFadeMs', label: 'Home’s pieces fade out', max: 2000, step: 10 },
  { key: 'bandDelayMs', label: 'Pause, then the strip rises', max: 2000, step: 10 },
  { key: 'bandMs', label: 'Strip rises, Done fades in', max: 3000, step: 10 },
  { key: 'moonFadeMs', label: 'Sky turns new moon (from strip)', max: 3000, step: 50 },
  { key: 'yellAtMs', label: 'Loc yells (after strip starts)', max: 4000, step: 50 },
  { key: 'riseMs', label: 'Moon rise (after the yell)', max: 6000, step: 50 },
  { key: 'pageAtMs', label: 'Page starts, into the rise', max: 5000, step: 50 },
  { key: 'stepMs', label: 'Step between page pieces', max: 800, step: 10 },
  { key: 'lineAtMs', label: 'Loc’s line, after the page', max: 5000, step: 50 },
];

/** Inside the frame, on the payoff: no controls, just Replay when the simulator asks. */
export function PayoffLab({ params }: { params: Record<string, string> }) {
  const paramsRef = useRef(params);
  useEffect(() => {
    paramsRef.current = params;
  }, [params]);
  useEffect(() => {
    // Opened on its own: the simulator is where the controls are.
    if (window.parent === window) {
      window.location.replace('/payoff-lab');
      return;
    }
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.data?.type !== MESSAGE) return;
      const lab = load();
      setPayoffTuning(lab);
      const { newMoon: _moon, ...rest } = paramsRef.current;
      const again = { ...rest, over: '1', cut: e.data.cut ? '1' : '', ...(e.data.newMoon ? { newMoon: e.data.newMoon } : {}) };
      if (router.canGoBack()) router.back();
      setTimeout(() => router.push({ pathname: '/morning-won', params: again }), lab.homeMs);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);
  return null;
}

const START_URL = '/morning-won?demo=1&lab=1&newMoon=harvest';

/** The simulator page: the phone, and the controls beside it. */
export function PayoffLabSimulator() {
  const [lab, setLab] = useState<Lab>(load);
  const [copied, setCopied] = useState(false);
  const [cut, setCut] = useState(false);
  const [newMoon, setNewMoon] = useState(true);
  const frame = useRef<HTMLIFrameElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const fit = () => setScale(Math.min(1, (window.innerHeight - 48) / (PHONE.height + 24)));
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);
  const change = (next: Lab) => {
    save(next);
    setLab(next);
    setCopied(false);
  };
  const replay = (how: { cut: boolean; newMoon: boolean }) => {
    setCut(how.cut);
    setNewMoon(how.newMoon);
    frame.current?.contentWindow?.postMessage(
      { type: MESSAGE, cut: how.cut, newMoon: how.newMoon ? 'harvest' : 'none' },
      window.location.origin,
    );
  };
  const copy = () => {
    const { homeMs: _home, ...tuning } = lab;
    navigator.clipboard?.writeText(JSON.stringify(tuning, null, 2)).then(() => setCopied(true), () => {});
  };

  return (
    <div style={s.page}>
      <div style={{ ...s.phoneSlot, width: (PHONE.width + 24) * scale, height: (PHONE.height + 24) * scale }}>
        <div style={{ ...s.phone, transform: `scale(${scale})` }}>
          <iframe ref={frame} title="Locturne" src={START_URL} style={s.screen} />
        </div>
      </div>
      <div style={s.panel}>
        <strong style={s.title}>Payoff lab</strong>
        <div style={s.row}>
          <button type="button" style={s.primary} onClick={() => replay({ cut, newMoon })}>
            Replay
          </button>
        </div>
        <div style={s.row}>
          <button type="button" style={cut ? s.button : s.picked} onClick={() => replay({ cut: false, newMoon })}>
            Fade over Home
          </button>
          <button type="button" style={cut ? s.picked : s.button} onClick={() => replay({ cut: true, newMoon })}>
            Cut (from shield)
          </button>
        </div>
        <label style={s.check}>
          <input type="checkbox" checked={newMoon} onChange={(e) => replay({ cut, newMoon: e.target.checked })} />
          <span>A new moon this morning (Harvest)</span>
        </label>
        {SLIDERS.map(({ key, label, max, step }) => (
          <label key={key} style={s.slider}>
            <span style={s.labelRow}>
              <span>{label}</span>
              <span style={s.value}>{lab[key]} ms</span>
            </span>
            <input type="range" min={0} max={max} step={step} value={lab[key]} onChange={(e) => change({ ...lab, [key]: Number(e.target.value) })} />
          </label>
        ))}
        {(['band', 'rise'] as const).map((curve) => (
          <div key={curve} style={s.slider}>
            <span>{curve === 'band' ? 'Strip curve' : 'Moon rise curve'} (cubic bezier)</span>
            <div style={s.row}>
              {lab[curve].map((v, i) => (
                <input
                  key={i}
                  type="number"
                  step={0.05}
                  value={v}
                  style={s.number}
                  onChange={(e) => {
                    const next = [...lab[curve]] as Lab[Curve];
                    next[i] = Number(e.target.value);
                    change({ ...lab, [curve]: next });
                  }}
                />
              ))}
            </div>
          </div>
        ))}
        <div style={s.row}>
          <button type="button" style={s.button} onClick={copy}>
            {copied ? 'Copied' : 'Copy values'}
          </button>
          <button type="button" style={s.button} onClick={() => change(fresh())}>
            Reset
          </button>
        </div>
        <div style={s.note}>Changes apply on the next Replay. Click Loc to make him yell again.</div>
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
  // A plain black bezel round the screen, the size of an iPhone 15.
  phone: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: PHONE.width + 24,
    height: PHONE.height + 24,
    padding: 12,
    boxSizing: 'border-box',
    borderRadius: 64,
    background: '#000',
    transformOrigin: 'top left',
    boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
  },
  screen: { width: PHONE.width, height: PHONE.height, border: 'none', borderRadius: 52, display: 'block', background: '#000' },
  panel: {
    flex: 'none',
    width: 300,
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
  check: { display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' },
  slider: { display: 'flex', flexDirection: 'column', gap: 4 },
  labelRow: { display: 'flex', justifyContent: 'space-between', gap: 8 },
  value: { color: '#a8bad3', fontVariantNumeric: 'tabular-nums' },
  number: { width: '25%', minWidth: 0, padding: 4, borderRadius: 6, border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#f2f8fc' },
  note: { color: '#a8bad3', fontSize: 12 },
};
