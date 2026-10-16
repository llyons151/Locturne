/** The Loc studio's small controls and helpers, shared by its pages. */

/** Lays canvases out in a labelled grid, for saving as one PNG. */
export function grid(cells: { canvas: HTMLCanvasElement; label: string }[], cols: number, bg: string) {
  const cw = Math.max(...cells.map((c) => c.canvas.width)), ch = Math.max(...cells.map((c) => c.canvas.height));
  const label = 22, pad = 8;
  const rows = Math.ceil(cells.length / cols);
  const out = document.createElement('canvas');
  out.width = Math.min(cols, cells.length) * (cw + pad) + pad;
  out.height = rows * (ch + label + pad) + pad;
  const ctx = out.getContext('2d')!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.font = '13px -apple-system, system-ui, sans-serif';
  cells.forEach((c, i) => {
    const x = pad + (i % cols) * (cw + pad), y = pad + Math.floor(i / cols) * (ch + label + pad);
    ctx.drawImage(c.canvas, x, y);
    ctx.fillStyle = '#C9CAD1';
    ctx.fillText(c.label, x + 2, y + ch + 16);
  });
  return out;
}

export const keepButton = (map: Map<number, HTMLButtonElement>, key: number) => (b: HTMLButtonElement | null) => {
  if (b) map.set(key, b);
  else map.delete(key);
};

/** A ref that keeps the canvas in `map` under `key` while it's mounted. */
export const keep = <K,>(map: Map<K, HTMLCanvasElement>, key: K) => (c: HTMLCanvasElement | null) => {
  if (c) map.set(key, c);
  else map.delete(key);
};

export function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="field">
      <span>{label}</span>
      <div className="seg">
        {options.map((o) => (
          <button key={o.id} className={o.id === value ? 'on' : ''} onClick={() => onChange(o.id)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Select({ label, value, options, onChange }: { label: string; value: string; options: { id: string; label: string }[]; onChange: (v: string) => void }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Toggle({ label, hint, on, onChange }: { label: string; hint?: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="field toggle">
      <input type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked)} />
      <span>
        {label}
        {hint ? <span className="dim"> ({hint})</span> : null}
      </span>
    </label>
  );
}

export function Slider({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void }) {
  return (
    <label className="slider">
      <span>
        {label} <strong>{Math.round(value * 100) / 100}</strong>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

/**
 * Runs `jobs` a few at a time, about 10 ms of them a frame, so painting a page of stills never
 * locks the page up (it took seconds all at once). Returns a cancel, for an effect's cleanup.
 */
export function paintLater(jobs: (() => void)[]) {
  let raf = 0;
  const run = () => {
    const until = performance.now() + 10;
    while (jobs.length && performance.now() < until) jobs.shift()!();
    if (jobs.length) raf = requestAnimationFrame(run);
  };
  raf = requestAnimationFrame(run);
  return () => cancelAnimationFrame(raf);
}
