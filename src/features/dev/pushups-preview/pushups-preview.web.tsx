import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

/** An iPhone 16's screen in points, with its safe areas. */
const SCREEN = { width: 393, height: 852, top: 59, bottom: 34 };
const BEZEL = 12;
/** How the phone stands, and how far it's turned on the desk to stand that way (CSS, clockwise). */
const TURNS = { upright: 0, sideways: -90, sidewaysOther: 90 } as const;
type Stance = keyof typeof TURNS;

/** The flipping phone's round: on its side one way, back up, on its side the other way, back up. */
const ROUND: Stance[] = ['sideways', 'upright', 'sidewaysOther', 'upright'];
/** How long the hand takes to turn the phone. */
const TURN_MS = 450;
/**
 * When the screen hears of it: the accelerometer reads sideways about half way round, and the
 * reading has to hold 600 ms (use-phone-hint.ts HOLD_MS) before the screen turns.
 */
const SENSED_MS = TURN_MS / 2 + 600;

const SCENES = [
  ['pushups', 'Good reps'],
  ['nobody', 'Nobody there'],
  ['standing', 'Standing'],
  ['shallow', 'Too shallow'],
  ['quick', 'Too quick'],
] as const;

const frameSrc = (phone: Stance, scene: string, goal: number) =>
  `/pushups-frame?${new URLSearchParams({ phone, scene, goal: String(goal), insets: `${SCREEN.top},${SCREEN.bottom}` })}`;

/**
 * Dev tool, /pushups-preview (web only, `npm run pushups-preview`): the real push-up camera
 * screen with the pretend body, upright, on its side, and a third phone that keeps turning
 * between them, to watch the screen tilt round. Each phone is the real `/pushups-frame`, so
 * editing pushups-view.tsx hot-reloads all three.
 */
export function PushupsPreviewWall() {
  const [zoom, setZoom] = useState(0.62);
  const [scene, setScene] = useState('pushups');
  const [goal, setGoal] = useState(10);
  const [generation, setGeneration] = useState(0);
  return (
    <div style={css.page}>
      <header style={css.bar}>
        <strong style={css.title}>Push-ups preview</strong>
        <label style={css.field}>
          Body
          <select style={css.select} value={scene} onChange={(e) => setScene(e.target.value)}>
            {SCENES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label style={css.field}>
          Goal
          <input style={{ ...css.select, width: 56 }} type="number" min={1} max={100} value={goal} onChange={(e) => setGoal(Number(e.target.value) || 10)} />
        </label>
        <label style={css.field}>
          Zoom
          <input type="range" min={0.35} max={1} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} />
        </label>
        <button style={css.button} onClick={() => setGeneration((g) => g + 1)}>
          Restart
        </button>
      </header>
      <main style={css.wall} key={generation}>
        <Column label="Upright">
          <Phone src={frameSrc('upright', scene, goal)} phone="upright" zoom={zoom} />
        </Column>
        <Column label="On its side (the main way)">
          <Phone src={frameSrc('sideways', scene, goal)} phone="sideways" zoom={zoom} />
        </Column>
        <Column label="Turning">
          <Flipping scene={scene} goal={goal} zoom={zoom} />
        </Column>
      </main>
    </div>
  );
}

function Column({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section style={css.column}>
      <div style={css.label}>{label}</div>
      {children}
    </section>
  );
}

/** The phone that keeps turning: the hand turns it, and the screen hears of it a beat later, as on a phone. */
function Flipping({ scene, goal, zoom }: { scene: string; goal: number; zoom: number }) {
  const [phone, setPhone] = useState<Stance>('upright');
  const [playing, setPlaying] = useState(true);
  const [hold, setHold] = useState(3500);
  const frame = useRef<HTMLIFrameElement>(null);
  // The first scene only: the screen turns by message, so a new src would start it over (Restart does).
  const [src] = useState(() => frameSrc('upright', scene, goal));

  const turnTo = (next: Stance) => {
    setPhone(next);
    setTimeout(() => frame.current?.contentWindow?.postMessage({ pushupsPhone: next }, '*'), SENSED_MS);
  };

  useEffect(() => {
    if (!playing) return;
    let i = 0;
    const timer = setInterval(() => turnTo(ROUND[i++ % ROUND.length]), hold);
    return () => clearInterval(timer);
  }, [playing, hold]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <Phone src={src} phone={phone} zoom={zoom} square frameRef={frame} />
      <div style={css.controls}>
        <button style={css.button} onClick={() => setPlaying((p) => !p)}>
          {playing ? 'Pause' : 'Play'}
        </button>
        {(Object.keys(TURNS) as Stance[]).map((p) => (
          <button
            key={p}
            style={{ ...css.button, ...(p === phone ? css.on : null) }}
            onClick={() => {
              setPlaying(false);
              turnTo(p);
            }}
          >
            {p === 'upright' ? 'Upright' : p === 'sideways' ? 'Side ⟲' : 'Side ⟳'}
          </button>
        ))}
        <label style={css.field}>
          every
          <select style={css.select} value={hold} onChange={(e) => setHold(Number(e.target.value))}>
            {[2000, 3500, 6000].map((ms) => (
              <option key={ms} value={ms}>
                {ms / 1000}s
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}

/** An iPhone frame turned `phone` on the desk, holding the screen at `src`. */
function Phone({
  src,
  phone,
  zoom,
  square = false,
  frameRef,
}: {
  src: string;
  phone: Stance;
  zoom: number;
  /** Room for it both ways up, so it can turn without the page moving. */
  square?: boolean;
  frameRef?: React.Ref<HTMLIFrameElement>;
}) {
  const w = SCREEN.width + BEZEL * 2;
  const h = SCREEN.height + BEZEL * 2;
  const side = TURNS[phone] !== 0;
  const boxW = (square ? h : side ? h : w) * zoom;
  const boxH = (square ? h : side ? w : h) * zoom;
  return (
    <div style={{ width: boxW, height: boxH, position: 'relative', flex: 'none' }}>
      <div
        style={{
          position: 'absolute',
          left: boxW / 2 - w / 2,
          top: boxH / 2 - h / 2,
          width: w,
          height: h,
          padding: BEZEL,
          boxSizing: 'border-box',
          borderRadius: 62,
          background: '#1c1c1e',
          boxShadow: '0 10px 30px rgba(0,0,0,0.45)',
          transform: `scale(${zoom}) rotate(${TURNS[phone]}deg)`,
          transition: `transform ${TURN_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
        }}
      >
        <div style={{ position: 'relative', width: SCREEN.width, height: SCREEN.height, borderRadius: 50, overflow: 'hidden', background: '#000' }}>
          <iframe ref={frameRef} src={src} title={phone} style={{ border: 0, width: SCREEN.width, height: SCREEN.height, display: 'block' }} />
          <div style={css.island} />
        </div>
      </div>
    </div>
  );
}

const css: Record<string, CSSProperties> = {
  page: { minHeight: '100vh', background: '#0b0b0f', color: '#e8e8ee', fontFamily: '-apple-system, system-ui, sans-serif', fontSize: 13 },
  bar: {
    position: 'sticky',
    top: 0,
    zIndex: 2,
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 16,
    padding: '12px 20px',
    background: 'rgba(11,11,15,0.92)',
    borderBottom: '1px solid #222',
  },
  title: { fontSize: 15, marginRight: 8 },
  field: { display: 'flex', alignItems: 'center', gap: 6, color: '#a0a0aa' },
  select: { background: '#1c1c22', color: '#e8e8ee', border: '1px solid #333', borderRadius: 6, padding: '4px 6px' },
  button: { background: '#1c1c22', color: '#e8e8ee', border: '1px solid #333', borderRadius: 6, padding: '5px 10px', cursor: 'pointer' },
  on: { background: '#e8e8ee', color: '#0b0b0f' },
  wall: { display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'center', gap: 40, padding: 28 },
  column: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 },
  label: { color: '#a0a0aa', fontWeight: 600 },
  controls: { display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'center' },
  island: { position: 'absolute', top: 11, left: '50%', width: 124, height: 36, marginLeft: -62, borderRadius: 18, background: '#000', pointerEvents: 'none' },
};
