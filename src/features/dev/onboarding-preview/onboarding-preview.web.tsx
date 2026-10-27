import { useEffect, useMemo, useState, type CSSProperties } from 'react';

import { chaptersFor } from '@/features/onboarding/content';
import { PAINS, stepsFor, type Pain, type StepId } from '@/features/onboarding/navigation';
import { EXIT_ARMS, type ExitArm } from '@/lib/purchases';

/** iPhone screens in points, with their safe areas (status bar or island, home indicator). */
const DEVICES = {
  se: { label: 'iPhone SE', width: 375, height: 667, top: 20, bottom: 0, island: false },
  '16': { label: 'iPhone 16', width: 393, height: 852, top: 59, bottom: 34, island: true },
  max: { label: 'iPhone 16 Pro Max', width: 440, height: 956, top: 62, bottom: 34, island: true },
} as const;
type DeviceId = keyof typeof DEVICES;

/** Every step of a branch in flow order, with the paywall's exit page (`declined`) beside the plans. */
function stepsOf(pain: Pain): StepId[] {
  return stepsFor(pain).flatMap((step): StepId[] => (step === 'plans' ? [step, 'declined'] : [step]));
}

const PAIN_LABEL: Record<Pain, string> = {
  night: 'Night (up late)',
  morning: 'Morning (can’t get up)',
  overall: 'Overall (too much phone)',
  all: 'All of it (today’s flow)',
};

/** What each branch's three progress-bar chapters are about. */
const CHAPTER_NAMES: Record<Pain, string[]> = {
  all: ['Mornings', 'Nights', 'Setup'],
  morning: ['Mornings', 'Nights', 'Setup'],
  night: ['Nights', 'Mornings', 'Setup'],
  overall: ['Phone in bed', 'The number', 'Setup'],
};

/**
 * The screens whose words or order change by branch (ONBOARDING_BRANCHES §5), for Compare.
 * The rest (found, founder, method, voice, walk, screen-time, armed…) are the same in all four.
 */
const BRANCHED: StepId[] = [
  'wake',
  'bedtime',
  'night-minutes',
  'morning-minutes',
  'night-feel',
  'worst-time',
  'nights-per-week',
  'time-back',
  'tried',
  'reveal',
  'tomorrow',
  'apps',
  'commit',
  'offer',
  'plans',
];

/** The progress bar's chapter, or where a step sits outside them. */
function groupOf(step: StepId, pain: Pain): string {
  const chapter = chaptersFor(pain).findIndex((steps) => steps.includes(step));
  if (chapter >= 0) return CHAPTER_NAMES[pain][chapter] ?? `Chapter ${chapter + 1}`;
  if (step === 'hello') return 'Welcome';
  if (step === 'build') return CHAPTER_NAMES[pain][2];
  if (step === 'founder' || step === 'offer' || step === 'plans' || step === 'declined') return 'Paywall';
  return 'After purchase';
}

type Settings = {
  view: 'wall' | 'single' | 'compare';
  pain: Pain;
  device: DeviceId;
  zoom: number;
  exit: ExitArm;
  newYear: boolean;
  step: StepId;
};

const DEFAULTS: Settings = { view: 'wall', pain: 'all', device: '16', zoom: 0.5, exit: 'longer-trial', newYear: false, step: 'hello' };
const KEY = 'locturne.onboardingPreview';

/** Saved settings, then `?view=single&pain=night&step=reveal&device=se` on top, for links. */
function load(): Settings {
  const query = new URLSearchParams(window.location.search);
  const linked: Partial<Settings> = {};
  const view = query.get('view');
  if (view === 'single' || view === 'wall' || view === 'compare') linked.view = view;
  const pain = PAINS.find((p) => p === query.get('pain'));
  if (pain) linked.pain = pain;
  if (query.get('step')) linked.step = query.get('step') as StepId;
  if (query.get('device')) linked.device = query.get('device') as DeviceId;
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Settings>;
    const merged = { ...DEFAULTS, ...saved, ...linked };
    if (!(merged.device in DEVICES)) merged.device = DEFAULTS.device;
    if (!PAINS.includes(merged.pain)) merged.pain = DEFAULTS.pain;
    if (!stepsOf(merged.pain).includes(merged.step)) merged.step = 'hello';
    return merged;
  } catch {
    return { ...DEFAULTS, ...linked };
  }
}

function urlFor(step: StepId, s: Settings, pain: Pain = s.pain): string {
  const d = DEVICES[s.device];
  const params = new URLSearchParams({ step, pain, exit: s.exit, insets: `${d.top},${d.bottom}` });
  if (s.newYear) params.set('newyear', '1');
  return `/onboarding?${params}`;
}

/**
 * Dev tool, /onboarding-preview (web only): every onboarding screen, real, in phone frames.
 * Wall shows one branch's whole flow at once; Single is one phone you can tap through, with
 * the step list beside it (← → to move); Compare puts the four branches side by side on every
 * screen that differs. Each frame is the real `/onboarding?step=…&pain=…`, so editing any
 * onboarding file hot-reloads every frame. Answers are the flow's PREVIEW_ANSWERS.
 */
export function OnboardingPreview() {
  const [s, setS] = useState<Settings>(load);
  // Bumped by Reload to remount every frame (a fresh flow from its step).
  const [generation, setGeneration] = useState(0);
  const set = (patch: Partial<Settings>) => setS((old) => ({ ...old, ...patch }));

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch {
      // Private window: settings just don't stick.
    }
  }, [s]);

  const flow = useMemo(() => stepsOf(s.pain), [s.pain]);
  useEffect(() => {
    if (s.view !== 'single') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      const i = flow.indexOf(s.step);
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') set({ step: flow[Math.min(flow.length - 1, i + 1)] });
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') set({ step: flow[Math.max(0, i - 1)] });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [s.view, s.step, flow]);

  const groups = useMemo(() => {
    const out: { name: string; steps: StepId[] }[] = [];
    for (const step of flow) {
      const name = groupOf(step, s.pain);
      const last = out[out.length - 1];
      if (last?.name === name) last.steps.push(step);
      else out.push({ name, steps: [step] });
    }
    return out;
  }, [flow, s.pain]);

  const device = DEVICES[s.device];

  return (
    <div style={css.page}>
      <header style={css.bar}>
        <strong style={css.title}>Onboarding preview</strong>
        <Segment
          value={s.view}
          options={[
            ['wall', 'Wall'],
            ['single', 'Single'],
            ['compare', 'Compare'],
          ]}
          onChange={(view) => set({ view })}
        />
        {s.view === 'compare' ? null : (
          <label style={css.field}>
            Branch
            <select
              style={css.select}
              value={s.pain}
              onChange={(e) => {
                const pain = e.target.value as Pain;
                set({ pain, step: stepsOf(pain).includes(s.step) ? s.step : 'hello' });
              }}
            >
              {PAINS.map((pain) => (
                <option key={pain} value={pain}>
                  {PAIN_LABEL[pain]}
                </option>
              ))}
            </select>
          </label>
        )}
        <label style={css.field}>
          Device
          <select style={css.select} value={s.device} onChange={(e) => set({ device: e.target.value as DeviceId })}>
            {(Object.keys(DEVICES) as DeviceId[]).map((id) => (
              <option key={id} value={id}>
                {DEVICES[id].label} ({DEVICES[id].width}×{DEVICES[id].height})
              </option>
            ))}
          </select>
        </label>
        <label style={css.field}>
          Zoom
          <input
            type="range"
            min={0.25}
            max={1}
            step={0.05}
            value={s.zoom}
            onChange={(e) => set({ zoom: Number(e.target.value) })}
          />
          <span style={css.dim}>{Math.round(s.zoom * 100)}%</span>
        </label>
        <label style={css.field}>
          Exit offer
          <select style={css.select} value={s.exit} onChange={(e) => set({ exit: e.target.value as ExitArm })}>
            {EXIT_ARMS.map((arm) => (
              <option key={arm} value={arm}>
                {arm}
              </option>
            ))}
          </select>
        </label>
        <label style={css.field}>
          <input type="checkbox" checked={s.newYear} onChange={(e) => set({ newYear: e.target.checked })} />
          New Year copy
        </label>
        <button style={css.button} onClick={() => setGeneration((g) => g + 1)}>
          Reload frames
        </button>
      </header>

      {s.view === 'compare' ? (
        <main style={css.wall}>
          <p style={css.dim}>
            Every screen whose words or order change by branch, one column per branch. A dash means that branch doesn&apos;t
            ask it. The other screens are the same in all four.
          </p>
          <div style={{ ...css.compareRow, ...css.compareHead }}>
            {PAINS.map((pain) => (
              <div key={pain} style={{ width: (device.width + 24) * s.zoom, fontWeight: 600 }}>
                {PAIN_LABEL[pain]}
              </div>
            ))}
          </div>
          {BRANCHED.map((step) => (
            <section key={step}>
              <h2 style={css.group}>{step}</h2>
              <div style={css.compareRow}>
                {PAINS.map((pain) =>
                  stepsFor(pain).includes(step) ? (
                    <figure key={pain} style={css.card}>
                      <figcaption style={css.caption}>
                        <span style={css.dim}>
                          {stepsFor(pain).indexOf(step) + 1}. {pain}
                        </span>
                        <button style={css.link} onClick={() => set({ view: 'single', pain, step })}>
                          Focus
                        </button>
                      </figcaption>
                      <Phone key={`${pain}-${step}-${generation}`} src={urlFor(step, s, pain)} device={device} zoom={s.zoom} lazy />
                    </figure>
                  ) : (
                    <div key={pain} style={{ ...css.missing, width: (device.width + 24) * s.zoom, height: (device.height + 24) * s.zoom }}>
                      —
                    </div>
                  ),
                )}
              </div>
            </section>
          ))}
        </main>
      ) : s.view === 'wall' ? (
        <main style={css.wall}>
          {groups.map((group) => (
            <section key={group.name}>
              <h2 style={css.group}>{group.name}</h2>
              <div style={css.row}>
                {group.steps.map((step) => (
                  <figure key={step} style={css.card}>
                    <figcaption style={css.caption}>
                      <span>
                        <span style={css.dim}>{flow.indexOf(step) + 1}.</span> {step}
                      </span>
                      <span style={css.links}>
                        <button style={css.link} onClick={() => set({ view: 'single', step })}>
                          Focus
                        </button>
                        <a style={css.link} href={urlFor(step, s)} target="_blank" rel="noreferrer">
                          Tab ↗
                        </a>
                      </span>
                    </figcaption>
                    <Phone key={`${s.pain}-${step}-${generation}`} src={urlFor(step, s)} device={device} zoom={s.zoom} lazy />
                  </figure>
                ))}
              </div>
            </section>
          ))}
        </main>
      ) : (
        <main style={css.single}>
          <nav style={css.list}>
            {groups.map((group) => (
              <div key={group.name}>
                <div style={css.listGroup}>{group.name}</div>
                {group.steps.map((step) => (
                  <button
                    key={step}
                    style={{ ...css.listItem, ...(step === s.step ? css.listItemOn : null) }}
                    onClick={() => set({ step })}
                  >
                    <span style={css.dim}>{flow.indexOf(step) + 1}</span> {step}
                  </button>
                ))}
              </div>
            ))}
          </nav>
          <div style={css.stage}>
            <div style={css.stageHead}>
              <button style={css.button} onClick={() => set({ step: flow[Math.max(0, flow.indexOf(s.step) - 1)] })}>
                ← Prev
              </button>
              <span>
                {s.step} <span style={css.dim}>· {groupOf(s.step, s.pain)} · tap through it, it&apos;s the real flow</span>
              </span>
              <button
                style={css.button}
                onClick={() => set({ step: flow[Math.min(flow.length - 1, flow.indexOf(s.step) + 1)] })}
              >
                Next →
              </button>
            </div>
            <Phone key={`${s.pain}-${s.step}-${generation}`} src={urlFor(s.step, s)} device={device} zoom={Math.max(s.zoom, 0.8)} />
            <div style={css.dim}>
              Edit files in src/features/onboarding/ and every frame hot-reloads. Reload frames restarts them at their step.
            </div>
          </div>
        </main>
      )}
    </div>
  );
}

function Phone({
  src,
  device,
  zoom,
  lazy = false,
}: {
  src: string;
  device: (typeof DEVICES)[DeviceId];
  zoom: number;
  lazy?: boolean;
}) {
  const bezel = 12;
  const outerW = (device.width + bezel * 2) * zoom;
  const outerH = (device.height + bezel * 2) * zoom;
  return (
    <div style={{ width: outerW, height: outerH, flex: 'none' }}>
      <div
        style={{
          width: device.width + bezel * 2,
          height: device.height + bezel * 2,
          transform: `scale(${zoom})`,
          transformOrigin: 'top left',
          padding: bezel,
          boxSizing: 'border-box',
          borderRadius: device.island ? 62 : 44,
          background: '#1c1c1e',
          boxShadow: '0 10px 30px rgba(0,0,0,0.45)',
        }}
      >
        <div
          style={{
            position: 'relative',
            width: device.width,
            height: device.height,
            borderRadius: device.island ? 50 : 32,
            overflow: 'hidden',
            background: '#000',
          }}
        >
          <iframe
            src={src}
            loading={lazy ? 'lazy' : 'eager'}
            title={src}
            style={{ width: device.width, height: device.height, border: 0, display: 'block' }}
          />
          {device.island ? <div style={css.island} /> : null}
          {device.bottom ? <div style={css.homeBar} /> : null}
        </div>
      </div>
    </div>
  );
}

function Segment<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: [T, string][];
  onChange: (value: T) => void;
}) {
  return (
    <div style={css.segment}>
      {options.map(([v, label]) => (
        <button key={v} style={{ ...css.segmentItem, ...(v === value ? css.segmentOn : null) }} onClick={() => onChange(v)}>
          {label}
        </button>
      ))}
    </div>
  );
}

const css: Record<string, CSSProperties> = {
  page: {
    position: 'absolute',
    inset: 0,
    overflow: 'auto',
    background: '#111214',
    color: '#E8E8EA',
    fontFamily: '-apple-system, system-ui, sans-serif',
    fontSize: 13,
  },
  bar: {
    position: 'sticky',
    top: 0,
    zIndex: 2,
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 16,
    padding: '10px 16px',
    background: 'rgba(17,18,20,0.92)',
    backdropFilter: 'blur(12px)',
    borderBottom: '1px solid #26272b',
  },
  title: { fontSize: 15, marginRight: 8 },
  field: { display: 'flex', alignItems: 'center', gap: 6 },
  select: { background: '#1d1e22', color: 'inherit', border: '1px solid #33343a', borderRadius: 6, padding: '4px 6px' },
  button: {
    background: '#1d1e22',
    color: 'inherit',
    border: '1px solid #33343a',
    borderRadius: 6,
    padding: '5px 10px',
    cursor: 'pointer',
  },
  dim: { color: '#8a8b92' },
  segment: { display: 'flex', background: '#1d1e22', border: '1px solid #33343a', borderRadius: 7, padding: 2 },
  segmentItem: { background: 'none', border: 0, color: '#a0a1a8', padding: '4px 12px', borderRadius: 5, cursor: 'pointer' },
  segmentOn: { background: '#3a3b42', color: '#fff' },
  wall: { padding: '8px 16px 48px' },
  // Four columns, never wrapped: scroll sideways on a narrow window instead.
  compareRow: { display: 'flex', flexWrap: 'nowrap', gap: 20, width: 'max-content' },
  compareHead: { marginTop: 8 },
  missing: { display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#55565c', fontSize: 28 },
  group: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: '#8a8b92', margin: '24px 0 10px' },
  row: { display: 'flex', flexWrap: 'wrap', gap: 20 },
  card: { margin: 0, display: 'flex', flexDirection: 'column', gap: 6 },
  caption: { display: 'flex', justifyContent: 'space-between', gap: 8, fontWeight: 600 },
  links: { display: 'flex', gap: 8, fontWeight: 400 },
  link: { background: 'none', border: 0, padding: 0, color: '#9db8ff', cursor: 'pointer', textDecoration: 'none', font: 'inherit' },
  single: { display: 'flex', minHeight: 'calc(100% - 52px)' },
  list: {
    width: 190,
    flex: 'none',
    borderRight: '1px solid #26272b',
    padding: '8px 8px 32px',
    overflowY: 'auto',
    position: 'sticky',
    top: 52,
    alignSelf: 'flex-start',
    maxHeight: 'calc(100vh - 52px)',
    boxSizing: 'border-box',
  },
  listGroup: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: '#8a8b92', margin: '14px 8px 4px' },
  listItem: {
    display: 'block',
    width: '100%',
    textAlign: 'left',
    background: 'none',
    border: 0,
    color: 'inherit',
    padding: '5px 8px',
    borderRadius: 6,
    cursor: 'pointer',
    font: 'inherit',
  },
  listItemOn: { background: '#2c2d33' },
  stage: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: 20 },
  stageHead: { display: 'flex', alignItems: 'center', gap: 16 },
  island: {
    position: 'absolute',
    top: 11,
    left: '50%',
    width: 124,
    height: 36,
    marginLeft: -62,
    borderRadius: 18,
    background: '#000',
    pointerEvents: 'none',
    zIndex: 1,
  },
  homeBar: {
    position: 'absolute',
    bottom: 8,
    left: '50%',
    width: 136,
    height: 5,
    marginLeft: -68,
    borderRadius: 3,
    background: 'rgba(255,255,255,0.75)',
    pointerEvents: 'none',
    zIndex: 1,
  },
};
