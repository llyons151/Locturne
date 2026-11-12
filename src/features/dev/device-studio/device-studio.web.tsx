import { useEffect, useState, type CSSProperties } from 'react';

/**
 * Dev, browser only (/device-studio, user 2026-11-12: the payoff was "completely off" in the Reel
 * frame): one of the app's main screens on every iPhone size at once, each frame the phone's size
 * in points with its safe areas (`?insets=`, lib/preview-insets.web.tsx), plus the Reel frame's 9:16
 * box. The browser draws no status bar, Dynamic Island or home bar, so they're drawn over the frame
 * to show what each covers. The Reel box can show where TikTok's and Instagram's buttons and caption
 * sit over a Reel.
 */
type Device = { id: string; label: string; width: number; height: number; top: number; bottom: number; island: boolean; reel?: boolean };

// Points and safe areas (portrait) per Apple's sizes: top is the status bar / island inset.
const DEVICES: Device[] = [
  { id: 'se', label: 'iPhone SE', width: 375, height: 667, top: 20, bottom: 0, island: false },
  { id: 'mini', label: 'iPhone 13 mini', width: 375, height: 812, top: 50, bottom: 34, island: false },
  { id: '16', label: 'iPhone 16 / 15', width: 393, height: 852, top: 59, bottom: 34, island: true },
  { id: '17', label: 'iPhone 17 / 16 Pro', width: 402, height: 874, top: 62, bottom: 34, island: true },
  { id: 'plus', label: 'iPhone 16 Plus / 15 Pro Max', width: 430, height: 932, top: 59, bottom: 34, island: true },
  { id: 'max', label: 'iPhone 17 Pro Max', width: 440, height: 956, top: 62, bottom: 34, island: true },
  // The Reel frame on the 430-wide phone (ReelFrameModule.swift): the window's top is under the island, so no top inset.
  { id: 'reel', label: 'Reel frame (430 phone)', width: 430, height: 764, top: 0, bottom: 34, island: false, reel: true },
];

const SCREENS: { id: string; label: string; path: string }[] = [
  { id: 'home', label: 'Home', path: '/' },
  { id: 'payoff', label: 'Payoff', path: '/morning-won?newMoon=harvest' },
  { id: 'routine', label: 'Routine', path: '/routine' },
  { id: 'apps', label: 'Apps', path: '/apps' },
  { id: 'you', label: 'You', path: '/profile' },
  { id: 'sleep', label: 'Sleep sheet', path: '/sleep' },
  { id: 'moons', label: 'Moons', path: '/moon-page' },
  { id: 'settings', label: 'Settings', path: '/settings' },
  { id: 'onboarding', label: 'Onboarding', path: '/onboarding' },
];

/**
 * Where the apps' own buttons and caption cover a 1080 × 1920 Reel (third-party guides; neither
 * platform publishes organic numbers): TikTok top 108, bottom 320, right 120; Instagram top 210,
 * bottom 310, right 84.
 */
const ZONES = {
  tiktok: { label: 'TikTok', top: 108, bottom: 320, right: 120, color: 'rgba(255,0,80,0.28)' },
  instagram: { label: 'Instagram', top: 210, bottom: 310, right: 84, color: 'rgba(160,80,255,0.28)' },
};
type Zone = keyof typeof ZONES | 'none';

const STORE = 'locturne.deviceStudio.v1';
type Saved = { screen: string; zone: Zone; chrome: boolean; picked: string[] };
const DEFAULTS: Saved = { screen: 'payoff', zone: 'tiktok', chrome: true, picked: DEVICES.map((d) => d.id) };

function load(): Saved {
  try {
    return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(STORE) ?? 'null') as Partial<Saved> | null) };
  } catch {
    return DEFAULTS;
  }
}

function url(screen: string, d: Device, run: number) {
  const path = SCREENS.find((s) => s.id === screen)?.path ?? '/';
  const [p, q] = path.split('?');
  const params = new URLSearchParams(q);
  params.set('demo', '1');
  params.set('insets', `${d.top},${d.bottom}`);
  params.set('run', String(run));
  return `${p}?${params}`;
}

export function DeviceStudio() {
  const [saved, setSaved] = useState<Saved>(load);
  const [run, setRun] = useState(() => Date.now());
  const [zoom, setZoom] = useState<string | null>(null);
  const [vh, setVh] = useState(() => window.innerHeight);
  const [vw, setVw] = useState(() => window.innerWidth);
  useEffect(() => {
    const on = () => {
      setVh(window.innerHeight);
      setVw(window.innerWidth);
    };
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  const set = (next: Partial<Saved>) => {
    const all = { ...saved, ...next };
    setSaved(all);
    try {
      localStorage.setItem(STORE, JSON.stringify(all));
    } catch {
      // Private window: forgotten on reload.
    }
  };
  const shown = DEVICES.filter((d) => saved.picked.includes(d.id) && (!zoom || d.id === zoom));
  // One scale for every frame, so the phones compare at their true sizes against each other.
  const tallest = Math.max(...shown.map((d) => d.height), 1);
  // And all of them across the window, side by side.
  const across = (vw - 32 - 20 * (shown.length - 1)) / shown.reduce((sum, d) => sum + d.width + 24, 0);
  const alone = !!zoom || shown.length === 1;
  const scale = Math.min(alone ? 1 : 0.75, (vh - 170) / (tallest + 24), alone ? 1 : across);

  return (
    <div style={s.page}>
      <div style={s.bar}>
        <strong style={{ fontSize: 15 }}>Device studio</strong>
        <select value={saved.screen} onChange={(e) => set({ screen: e.target.value })} style={s.select}>
          {SCREENS.map((sc) => (
            <option key={sc.id} value={sc.id}>
              {sc.label}
            </option>
          ))}
        </select>
        <button type="button" style={s.button} onClick={() => setRun(Date.now())}>
          Reload all
        </button>
        <label style={s.check}>
          <input type="checkbox" checked={saved.chrome} onChange={(e) => set({ chrome: e.target.checked })} />
          Status bar, island, home bar
        </label>
        <span style={s.dim}>Reel overlay:</span>
        {(['tiktok', 'instagram', 'none'] as Zone[]).map((z) => (
          <button key={z} type="button" style={saved.zone === z ? s.picked : s.button} onClick={() => set({ zone: z })}>
            {z === 'none' ? 'None' : ZONES[z].label}
          </button>
        ))}
        {zoom ? (
          <button type="button" style={s.picked} onClick={() => setZoom(null)}>
            ← All phones
          </button>
        ) : null}
      </div>
      <div style={s.bar}>
        {DEVICES.map((d) => (
          <label key={d.id} style={s.check}>
            <input
              type="checkbox"
              checked={saved.picked.includes(d.id)}
              onChange={(e) => set({ picked: e.target.checked ? [...saved.picked, d.id] : saved.picked.filter((x) => x !== d.id) })}
            />
            {d.label}
          </label>
        ))}
      </div>
      <div style={s.row}>
        {shown.map((d) => (
          <div key={d.id} style={s.cell}>
            <button type="button" style={s.caption} onClick={() => setZoom(zoom ? null : d.id)} title="Click to see this one alone, bigger">
              <strong>{d.label}</strong>
              <span style={s.dim}>
                {' '}
                {d.width} × {d.height} pt · {d.width * 3} × {d.height * 3} px · insets {d.top}/{d.bottom}
              </span>
            </button>
            <div style={{ width: (d.width + 24) * scale, height: (d.height + 24) * scale, position: 'relative' }}>
              <div style={{ ...s.phone, width: d.width + 24, height: d.height + 24, transform: `scale(${scale})`, borderRadius: d.reel ? 16 : d.bottom ? 64 : 40 }}>
                <div style={{ position: 'relative', width: d.width, height: d.height, overflow: 'hidden', borderRadius: d.reel ? 0 : d.bottom ? 52 : 6 }}>
                  <iframe key={`${saved.screen}-${run}`} title={d.label} src={url(saved.screen, d, run)} style={{ ...s.screen, width: d.width, height: d.height }} />
                  {saved.chrome && !d.reel ? <Chrome d={d} /> : null}
                  {saved.chrome && d.bottom ? <div style={s.homeBar} /> : null}
                  {d.reel && saved.zone !== 'none' ? <Zones d={d} zone={ZONES[saved.zone]} /> : null}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={s.dim}>
        Each frame is the phone’s size in points with its safe areas, so the layout is the phone’s own. The Reel frame is the box the app squeezes into on
        a 430-point phone: exactly 9:16, recorded as 1290 × 2292 px and scaled to 1080 × 1920. Reel overlays are third-party estimates.
      </div>
    </div>
  );
}

/** The status bar's clock and the island or notch, over the frame: what the top inset makes room for. */
function Chrome({ d }: { d: Device }) {
  return (
    <div style={{ ...s.chrome, height: d.top }}>
      <span style={s.clock}>9:41</span>
      {d.island ? <div style={s.island} /> : d.top > 20 ? <div style={s.notch} /> : null}
    </div>
  );
}

function Zones({ d, zone }: { d: Device; zone: (typeof ZONES)['tiktok'] }) {
  const k = d.width / 1080;
  const band: CSSProperties = { position: 'absolute', background: zone.color, color: '#fff', fontSize: 10, padding: 3, boxSizing: 'border-box' };
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <div style={{ ...band, top: 0, left: 0, right: 0, height: zone.top * k }}>{zone.label}: top bar</div>
      <div style={{ ...band, bottom: 0, left: 0, right: 0, height: zone.bottom * k }}>{zone.label}: caption, name, music</div>
      <div style={{ ...band, top: zone.top * k, bottom: zone.bottom * k, right: 0, width: zone.right * k }} />
    </div>
  );
}

const s: Record<string, CSSProperties> = {
  page: {
    position: 'fixed',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    padding: 16,
    background: '#16171c',
    color: '#f2f8fc',
    font: '13px -apple-system, system-ui, sans-serif',
    overflow: 'auto',
  },
  bar: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 },
  row: { display: 'flex', gap: 20, alignItems: 'flex-end', paddingBottom: 8 },
  cell: { display: 'flex', flexDirection: 'column', gap: 6, flex: 'none', minWidth: 0 },
  caption: { background: 'none', border: 'none', color: '#f2f8fc', textAlign: 'left', padding: 0, cursor: 'zoom-in', font: 'inherit', fontSize: 11, display: 'flex', flexDirection: 'column', maxWidth: 260 },
  phone: { position: 'absolute', left: 0, top: 0, padding: 12, boxSizing: 'border-box', background: '#000', transformOrigin: 'top left', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' },
  screen: { border: 'none', display: 'block', background: '#000' },
  chrome: { position: 'absolute', top: 0, left: 0, right: 0, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  clock: { position: 'absolute', left: 32, top: '50%', transform: 'translateY(-50%)', color: '#fff', fontWeight: 600, fontSize: 16 },
  island: { width: 126, height: 37, borderRadius: 20, background: '#000', marginTop: 4 },
  notch: { position: 'absolute', top: 0, width: 160, height: 32, borderRadius: '0 0 20px 20px', background: '#000' },
  homeBar: { position: 'absolute', bottom: 8, left: '50%', width: 134, height: 5, marginLeft: -67, borderRadius: 3, background: 'rgba(255,255,255,0.85)', pointerEvents: 'none' },
  select: { padding: '6px 8px', borderRadius: 8, background: '#22242c', color: '#f2f8fc', border: '1px solid rgba(255,255,255,0.2)' },
  button: { padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#f2f8fc', cursor: 'pointer' },
  picked: { padding: '6px 10px', borderRadius: 8, border: '1px solid #f2f8fc', background: 'rgba(255,255,255,0.12)', color: '#f2f8fc', cursor: 'pointer', fontWeight: 600 },
  check: { display: 'flex', gap: 6, alignItems: 'center', cursor: 'pointer' },
  dim: { color: '#a8bad3', fontSize: 12 },
};
