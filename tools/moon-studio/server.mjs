// Moon studio: edit every moon (sky, moon, halo, size, rings, twin, orb), the ladder, the rare moon and
// limited moons, see them live on a mock of Home, then save to tools/moon-lab/moons.json and bake them
// into the app (user, 2026-11-02). No dependencies; `npm run moon-studio`, then http://localhost:5179.
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdir, readdir, readFile, rename, stat, unlink, writeFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const REPO = join(HERE, '..', '..');
const LAB = join(REPO, 'tools', 'moon-lab');
const MOONS = join(LAB, 'moons.json');
const LADDER_TS = join(REPO, 'src', 'features', 'moons', 'moon-ladder.ts');
const COLLECTION_TS = join(REPO, 'src', 'features', 'moons', 'moon-collection.ts');
/** A copy of moons.json before every save, so nothing is ever lost. docs/ is local only. */
const HISTORY = join(REPO, 'docs', 'moon-studio-history');
const KEEP = 80;
/** moons.json as of the last bake, to tell which moons changed since. */
const BAKED = join(REPO, 'docs', 'moon-studio-baked.json');
const PORT = Number(process.env.PORT ?? 5179);

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg',
};

// Only the studio itself, the app's assets and the store-shots Loc art are served.
function resolve(urlPath) {
  const p = normalize(decodeURIComponent(urlPath)).replace(/^(\.\.[/\\])+/, '');
  if (p.startsWith('/assets/')) return join(REPO, p);
  if (p.startsWith('/loc/')) return join(REPO, 'tools', 'store-shots', p.slice('/loc/'.length));
  return join(HERE, p === '/' ? 'index.html' : p);
}

const json = (res, code, body) => {
  res.writeHead(code, { 'content-type': 'application/json', 'cache-control': 'no-store' });
  res.end(JSON.stringify(body));
};
async function body(req) {
  let s = '';
  for await (const chunk of req) s += chunk;
  return s;
}

/** What a save must look like, so a bad edit can't reach the bake. Returns a list of problems. */
function check(d) {
  const errs = [];
  if (!d || !Array.isArray(d.moons)) return ['no moons list'];
  const hex = (h) => typeof h === 'string' && /^#[0-9A-Fa-f]{6}$/.test(h);
  const ramp = (r, min, what) => {
    if (!Array.isArray(r) || r.length < min) errs.push(`${what}: needs at least ${min} colours`);
    else r.forEach((h, i) => hex(h) || errs.push(`${what}: colour ${i + 1} isn't #RRGGBB`));
  };
  const ids = new Set();
  d.moons.forEach((m, i) => {
    const at = m?.id || `moon ${i + 1}`;
    if (!m?.id || !/^[a-z0-9][a-z0-9-]*$/.test(m.id)) errs.push(`${at}: id must be lowercase letters, numbers and dashes`);
    if (ids.has(m.id)) errs.push(`${at}: id used twice`);
    ids.add(m.id);
    if (!m.name) errs.push(`${at}: no name`);
    ramp(m.sky, 2, `${at} sky`);
    ramp(m.moon, 2, `${at} moon`);
    if (!hex(m.glow)) errs.push(`${at}: halo colour isn't #RRGGBB`);
    if (m.orb) ramp(m.orb, 4, `${at} orb`);
    if (m.tint) ramp(m.tint.stops, 2, `${at} tint`);
    if (m.twin) {
      ramp(m.twin.moon, 2, `${at} twin`);
      if (!hex(m.twin.glow)) errs.push(`${at}: twin halo colour isn't #RRGGBB`);
    }
    if (m.saturn && !hex(m.saturn)) errs.push(`${at}: ring colour isn't #RRGGBB`);
  });
  if (!d.moons.some((m) => m.original)) errs.push('no starting moon (the one everyone has)');
  (d.ladder ?? []).forEach((id, i) => id && !ids.has(id) && errs.push(`ladder slot ${i + 1}: no moon "${id}"`));
  if (d.rare !== undefined) {
    if (!Array.isArray(d.rare) || !d.rare.length) errs.push('there must be at least one rare moon');
    else d.rare.forEach((id) => ids.has(id) || errs.push(`rare moons: no moon "${id}"`));
  }
  (d.limited ?? []).forEach((l) => {
    if (!ids.has(l.id)) errs.push(`limited: no moon "${l.id}"`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(l.date ?? '')) errs.push(`limited ${l.id}: date must be YYYY-MM-DD`);
  });
  return errs;
}

async function backup() {
  try {
    await mkdir(HISTORY, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    await writeFile(join(HISTORY, `moons-${stamp}.json`), await readFile(MOONS));
    const old = (await readdir(HISTORY)).filter((f) => f.endsWith('.json')).sort();
    for (const f of old.slice(0, Math.max(0, old.length - KEEP))) await unlink(join(HISTORY, f));
  } catch {}
}

/** The last bake's moons.json; the first time, today's file (it's what the app has). */
async function bakedSnapshot() {
  try {
    return JSON.parse(await readFile(BAKED, 'utf8'));
  } catch {
    const now = await readFile(MOONS, 'utf8');
    await mkdir(join(REPO, 'docs'), { recursive: true });
    await writeFile(BAKED, now);
    return JSON.parse(now);
  }
}

/** Moons new or changed since the last bake, and whether anything else (order, ladder, rare, removals) did. */
async function status() {
  const [now, then] = [JSON.parse(await readFile(MOONS, 'utf8')), await bakedSnapshot()];
  const before = new Map(then.moons.map((m) => [m.id, JSON.stringify(m)]));
  const pending = now.moons.filter((m) => before.get(m.id) !== JSON.stringify(m)).map((m) => m.id);
  const rest = (d) => JSON.stringify({ ...d, moons: d.moons.map((m) => m.id) });
  return { pending, other: rest(now) !== rest(then), needsBake: pending.length > 0 || rest(now) !== rest(then) };
}

let baking = null;
/** Runs the bake (all moons, or `only`), streaming its output as plain text. */
async function bake(res, only) {
  if (baking) return json(res, 409, { error: 'A bake is already running' });
  res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store', 'x-accel-buffering': 'no' });
  const steps = [
    ['python3', [join(LAB, 'bake.py'), ...(only.length ? ['--only', only.join(',')] : [])]],
    ['python3', [join(LAB, 'bake-icons.py'), ...(only.length ? ['--only', only.join(',')] : [])]],
  ];
  const started = Date.now();
  baking = true;
  // What this bake bakes, recorded as baked when it finishes (a save during the bake stays pending).
  const snapshot = await readFile(MOONS);
  const run = (i) => {
    if (i >= steps.length) {
      baking = null;
      writeFile(BAKED, snapshot).catch(() => {});
      res.end(`\n✓ Done in ${((Date.now() - started) / 1000).toFixed(1)}s\n`);
      return;
    }
    const [cmd, args] = steps[i];
    res.write(`$ ${cmd} ${args.map((a) => a.replace(REPO + '/', '')).join(' ')}\n`);
    const p = spawn(cmd, args, { cwd: REPO, env: { ...process.env, PYTHONUNBUFFERED: '1' } });
    p.stdout.on('data', (c) => res.write(c));
    p.stderr.on('data', (c) => res.write(c));
    p.on('close', (code) => {
      if (code !== 0) {
        baking = null;
        res.end(`\n✗ Failed (exit ${code})\n`);
      } else run(i + 1);
    });
  };
  run(0);
}

async function api(req, res, path) {
  if (path === '/api/moons' && req.method === 'GET') {
    const data = JSON.parse(await readFile(MOONS, 'utf8'));
    // The rare and limited moons live in the app's code until the first save puts them in moons.json.
    if (typeof data.rare === 'string') data.rare = [data.rare];
    if (!data.rare) {
      const list = (await readFile(LADDER_TS, 'utf8')).match(/^export const RARE_MOONS: readonly string\[\] = \[(.*)\];$/m)?.[1] ?? '';
      data.rare = [...list.matchAll(/'([^']+)'/g)].map(([, id]) => id);
    }
    if (!data.limited) {
      const list = (await readFile(COLLECTION_TS, 'utf8')).match(/^export const LIMITED: .*= \[(.*)\];$/m)?.[1] ?? '';
      data.limited = [...list.matchAll(/id: '([^']+)', date: '([^']+)'/g)].map(([, id, date]) => ({ id, date }));
    }
    return json(res, 200, { data, status: await status() });
  }
  if (path === '/api/moons' && req.method === 'PUT') {
    let d;
    try {
      d = JSON.parse(await body(req));
    } catch {
      return json(res, 400, { errors: ['not JSON'] });
    }
    const errs = check(d);
    if (errs.length) return json(res, 400, { errors: errs });
    await backup();
    const tmp = `${MOONS}.tmp`;
    await writeFile(tmp, `${JSON.stringify(d, null, 2)}\n`);
    await rename(tmp, MOONS);
    return json(res, 200, { status: await status() });
  }
  if (path === '/api/status') return json(res, 200, await status());
  if (path === '/api/history' && req.method === 'GET') {
    const files = await readdir(HISTORY).catch(() => []);
    return json(res, 200, files.filter((f) => f.endsWith('.json')).sort().reverse());
  }
  if (path.startsWith('/api/history/') && req.method === 'GET') {
    const f = path.slice('/api/history/'.length);
    if (!/^moons-[\w-]+\.json$/.test(f)) return json(res, 400, {});
    return json(res, 200, JSON.parse(await readFile(join(HISTORY, f), 'utf8')));
  }
  if (path === '/api/bake' && req.method === 'POST') {
    // ?all=1 bakes every moon (about six minutes); otherwise just the moons changed since the last
    // bake, and with none changed '-' re-bakes no images but still rewrites the app's moon data.
    const all = new URL(req.url, 'http://x').searchParams.get('all') === '1';
    const { pending } = await status();
    return bake(res, all ? [] : pending.length ? pending : ['-']);
  }
  json(res, 404, {});
}

createServer(async (req, res) => {
  const path = new URL(req.url, 'http://x').pathname;
  try {
    if (path.startsWith('/api/')) return await api(req, res, path);
    const file = resolve(path);
    const data = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(data);
  } catch (e) {
    if (res.headersSent) return res.end();
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end(path.startsWith('/api/') ? String(e) : 'not found');
  }
}).listen(PORT, () => console.log(`Moon studio on http://localhost:${PORT}`));
