// Audit every deck: lint findings + hand rubric score, worst first. `node tools/slides/audit.mjs [--json] [name…]`
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lint, scoreTotal } from './lint.mjs';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const args = process.argv.slice(2), asJson = args.includes('--json'), only = args.filter((a) => !a.startsWith('--'));
const credits = JSON.parse(await readFile(join(HERE, 'photos', 'credits.json'), 'utf8').catch(() => '{}'));
const hooks = JSON.parse(await readFile(join(HERE, 'hooks.json'), 'utf8'));
const refs = JSON.parse(await readFile(join(HERE, '..', '..', 'docs', 'slideshow-refs', 'refs.json'), 'utf8').catch(() => '{}'));
const rows = [];
for (const f of (await readdir(join(HERE, 'decks'))).filter((f) => f.endsWith('.json')).sort()) {
  const name = f.slice(0, -5);
  if (only.length && !only.some((o) => name.includes(o))) continue;
  const deck = JSON.parse(await readFile(join(HERE, 'decks', f), 'utf8'));
  const found = lint(deck, credits, hooks, refs);
  rows.push({ name, job: deck.job, slides: deck.slides.length, score: scoreTotal(deck), fails: found.filter((x) => x.level === 'fail'),
    warns: found.filter((x) => x.level === 'warn') });
}
// --images: photos that open more than one deck (same hook image twice looks lazy and may trip duplicate matching),
// split by account, so same-account repeats stand out. Renders and Loc art are excluded (they're the product / mascot).
if (args.includes('--images')) {
  const use = {};
  for (const f of (await readdir(join(HERE, 'decks'))).filter((f) => f.endsWith('.json'))) {
    const d = JSON.parse(await readFile(join(HERE, 'decks', f), 'utf8')), s0 = d.slides[0] ?? {};
    const img = s0.image ?? s0.bg ?? s0.top?.image;
    if (img && !/\/renders\/|\/loc\//.test(img)) (use[img] ??= []).push([f.slice(0, -5), (d.account ?? '?').split(' ')[0]]);
  }
  for (const [img, ds] of Object.entries(use).filter(([, ds]) => ds.length > 1).sort((a, b) => b[1].length - a[1].length)) {
    const acc = {}; ds.forEach(([, a]) => (acc[a] = (acc[a] ?? 0) + 1));
    const clash = Object.entries(acc).filter(([, n]) => n > 1).map(([a]) => a);
    console.log(`${clash.length ? '✗' : ' '} ${img}  ×${ds.length}  ${ds.map(([n, a]) => `${n} (${a})`).join(', ')}${clash.length ? '  ← same account: ' + clash.join(', ') : ''}`);
  }
  process.exit(0);
}
// --results: real posts (posts.json, logged in the studio) grouped by hook formula and by job, best taps/1K first.
if (args.includes('--results')) {
  const posts = JSON.parse(await readFile(join(HERE, 'posts.json'), 'utf8').catch(() => '[]'));
  const decks = {};
  for (const f of (await readdir(join(HERE, 'decks'))).filter((f) => f.endsWith('.json')))
    decks[f.slice(0, -5)] = JSON.parse(await readFile(join(HERE, 'decks', f), 'utf8'));
  const formulaOf = (d) => lint(d, credits, hooks, refs).find((x) => x.rule === 'proven' && x.level === 'ok')?.text.match(/formula: ([\w-]+)/)?.[1] ?? '(none)';
  const med = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : 0; };
  for (const [label, key] of [['hook formula', (d) => formulaOf(d)], ['job', (d) => d.job ?? '?'], ['deck', (d, n) => n]]) {
    const g = {};
    for (const p of posts) { const d = decks[p.deck]; if (!d) continue; (g[key(d, p.deck)] ??= []).push(p); }
    console.log(`\nBy ${label} (${posts.length} posts)`);
    const rate = (ps, k) => { const v = ps.reduce((a, p) => a + (p.views ?? 0), 0); return v ? (ps.reduce((a, p) => a + (p[k] ?? 0), 0) / v * 1000).toFixed(1) : '–'; };
    Object.entries(g).sort((a, b) => Number(rate(b[1], 'taps')) - Number(rate(a[1], 'taps'))).forEach(([k, ps]) =>
      console.log(`  ${k.padEnd(28)} n=${String(ps.length).padStart(2)}  median views ${String(med(ps.map((p) => p.views ?? 0))).padStart(8)}  saves/1K ${rate(ps, 'saves').padStart(5)}  shares/1K ${rate(ps, 'shares').padStart(5)}  taps/1K ${rate(ps, 'taps').padStart(5)}`));
  }
  console.log('\nRule of thumb (SLIDESHOW_MARKETING §7): keep a format at 3+ taps/1K and a 50K+ post; park it under ~500 median views.');
  process.exit(0);
}
rows.sort((a, b) => (a.score ?? 99) - (b.score ?? 99) || b.fails.length - a.fails.length || b.warns.length - a.warns.length);
if (asJson) console.log(JSON.stringify(rows, null, 1));
else for (const r of rows) {
  console.log(`${String(r.score ?? '–').padStart(2)}/20  ${r.name}  (${r.job}, ${r.slides} slides)  ${r.fails.length} fail, ${r.warns.length} warn`);
  for (const x of [...r.fails, ...r.warns]) console.log(`        ${x.level === 'fail' ? '✗' : '!'} ${x.rule}: ${x.text}`);
}
