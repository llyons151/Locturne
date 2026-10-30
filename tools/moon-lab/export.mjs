// Reads the moons out of the moon lab (index.html, the source of truth) and the ladder you built in it
// (docs/moon-lab-picks.json), and writes tools/moon-lab/moons.json for bake.py. Run by `npm run moons:bake`.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const REPO = join(HERE, '..', '..');

const html = readFileSync(join(HERE, 'index.html'), 'utf8');
const start = html.indexOf('const BASELINE');
const end = html.indexOf("REAL.forEach((m) => (m.kind = 'real'));");
if (start < 0 || end < 0) throw new Error('moon lab: could not find the moon lists in index.html');
const { BASELINE, REAL, CREATIVE, TWINS } = new Function(`${html.slice(start, end)}; return { BASELINE, REAL, CREATIVE, TWINS };`)();

let ladder = [];
try {
  ladder = JSON.parse(readFileSync(join(REPO, 'docs', 'moon-lab-picks.json'), 'utf8')).slots ?? [];
} catch {
  console.warn('moon lab: no docs/moon-lab-picks.json, so no ladder');
}

const moons = [
  { ...BASELINE, kind: 'today' },
  ...REAL.map((m) => ({ ...m, kind: 'real' })),
  ...CREATIVE.map((m) => ({ ...m, kind: 'creative' })),
  ...TWINS.map((m) => ({ ...m, kind: 'twin' })),
];
const ids = new Set(moons.map((m) => m.id));
const out = { ladder: ladder.map((id) => (id && ids.has(id) ? id : null)), moons };
writeFileSync(join(HERE, 'moons.json'), `${JSON.stringify(out, null, 2)}\n`);
console.log(`moon lab: exported ${moons.length} moons, ladder ${out.ladder.filter(Boolean).length}/11`);
