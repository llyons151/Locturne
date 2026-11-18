// Slideshow studio: our TikTok slideshows (decks/*.json, drawn by slide.html) next to the viral ones they copy
// (docs/slideshow-refs, local only), with editing and PNG export at the deck's size.
// `npm run slides` → http://localhost:5183. Research: docs/reports/Screen time slideshows live 2026-11-12.md.
import { createServer } from 'node:http';
import { readFile, writeFile, readdir, mkdir, rm } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const REPO = join(HERE, '..', '..');
const PORT = Number(process.env.PORT ?? 5183);
const CHROME = process.env.CHROME ?? 'google-chrome-stable';

// URL prefix → folder. Photos, refs and exports stay out of git (third-party images).
const MOUNTS = {
  '/photos/': join(HERE, 'photos'),
  '/out/': join(HERE, 'out'),
  '/fonts/': join(HERE, 'fonts'),
  '/decks/': join(HERE, 'decks'),
  '/refs/': join(REPO, 'docs', 'slideshow-refs'),
  '/shots/': join(REPO, 'tools', 'store-shots', 'shots'),
  '/demo/': join(REPO, 'tools', 'reels', 'public', 'demo'),
  '/loc/': join(REPO, 'tools', 'reels', 'public'),
};
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2',
};
const IMG = /\.(png|jpe?g|webp)$/i;

function resolve(urlPath) {
  const p = normalize(decodeURIComponent(urlPath)).replace(/^(\.\.[/\\])+/, '');
  for (const [pre, dir] of Object.entries(MOUNTS)) if (p.startsWith(pre)) return join(dir, p.slice(pre.length));
  return join(HERE, p === '/' ? 'index.html' : p);
}
const list = (dir) => readdir(dir).catch(() => []);
const body = async (req) => { const c = []; for await (const x of req) c.push(x); return Buffer.concat(c).toString(); };
const safe = (name) => /^[\w-]+$/.test(name) ? name : null;

async function state() {
  const decks = [];
  for (const f of (await list(MOUNTS['/decks/'])).filter((f) => f.endsWith('.json')).sort()) {
    decks.push({ name: f.slice(0, -5), ...JSON.parse(await readFile(join(MOUNTS['/decks/'], f), 'utf8')) });
  }
  const refs = {};
  for (const d of (await list(MOUNTS['/refs/'])).sort()) {
    const files = (await list(join(MOUNTS['/refs/'], d))).filter((f) => IMG.test(f)).sort();
    if (files.length) refs[d] = files;
  }
  const meta = JSON.parse(await readFile(join(MOUNTS['/refs/'], 'refs.json'), 'utf8').catch(() => '{}'));
  const credits = JSON.parse(await readFile(join(MOUNTS['/photos/'], 'credits.json'), 'utf8').catch(() => '{}'));
  const posts = JSON.parse(await readFile(join(HERE, 'posts.json'), 'utf8').catch(() => '[]'));
  return {
    decks, refs, meta, credits, posts,
    photos: (await list(MOUNTS['/photos/'])).filter((f) => IMG.test(f)).sort().map((f) => '/photos/' + f),
    shots: [
      ...(await list(MOUNTS['/demo/'])).filter((f) => IMG.test(f)).sort().map((f) => '/demo/' + f),
      ...(await list(MOUNTS['/shots/'])).filter((f) => IMG.test(f)).sort().map((f) => '/shots/' + f),
    ],
  };
}

// One headless Chrome per slide, screenshotting slide.html at the deck's exact size.
const shoot = (url, out, [w, h]) => new Promise((ok, fail) => execFile(CHROME, ['--headless=new', '--disable-gpu',
  '--hide-scrollbars', '--force-device-scale-factor=1', `--window-size=${w},${h}`, '--virtual-time-budget=4000',
  `--screenshot=${out}`, url], { timeout: 60000 }, (err) => (err ? fail(err) : ok())));

async function exportDeck(name) {
  const deck = JSON.parse(await readFile(join(MOUNTS['/decks/'], name + '.json'), 'utf8'));
  const dir = join(MOUNTS['/out/'], name);
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  const files = [];
  for (let i = 0; i < deck.slides.length; i++) {
    const file = `${String(i + 1).padStart(2, '0')}.png`;
    await shoot(`http://localhost:${PORT}/slide.html?deck=${name}&i=${i}`, join(dir, file), deck.size ?? [1080, 1350]);
    files.push(`/out/${name}/${file}`);
  }
  return files;
}

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const json = (code, v) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(v)); };
  try {
    if (url.pathname === '/api/state') return json(200, await state());
    const save = url.pathname.match(/^\/api\/decks\/(.+)$/);
    if (save && req.method === 'POST') {
      const name = safe(save[1]);
      if (!name) return json(400, { error: 'bad name' });
      const deck = JSON.parse(await body(req));
      await writeFile(join(MOUNTS['/decks/'], name + '.json'), JSON.stringify(deck, null, 2) + '\n');
      return json(200, { ok: true });
    }
    // Posting log: one row per real post (deck, account, date, url, numbers). posts.json, local only.
    if (url.pathname === '/api/posts' && req.method === 'POST') {
      const rows = JSON.parse(await body(req));
      if (!Array.isArray(rows)) return json(400, { error: 'expected an array' });
      await writeFile(join(HERE, 'posts.json'), JSON.stringify(rows, null, 1) + '\n');
      return json(200, { ok: true });
    }
    const exp = url.pathname.match(/^\/api\/export\/(.+)$/);
    if (exp && req.method === 'POST') {
      const name = safe(exp[1]);
      if (!name) return json(400, { error: 'bad name' });
      return json(200, { files: await exportDeck(name), dir: join(MOUNTS['/out/'], name) });
    }
    const file = resolve(url.pathname);
    const data = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(data);
  } catch (e) {
    if (url.pathname.startsWith('/api/')) return json(500, { error: String(e.message ?? e) });
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('not found');
  }
}).listen(PORT, () => console.log(`Slideshow studio on http://localhost:${PORT}`));
