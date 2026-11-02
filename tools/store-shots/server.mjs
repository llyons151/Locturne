// App Store screenshot workbench: renders the panels in panels.json, shows them in a mock App Store,
// and exports them as 1320×2868 PNGs. No dependencies; run with `npm run store-shots`.
import { createServer } from 'node:http';
import { readFile, writeFile, stat, mkdir, readdir, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { extname, join, normalize } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const REPO = join(HERE, '..', '..');
const PORT = Number(process.env.PORT ?? 5175);
const CHROME = process.env.CHROME ?? 'google-chrome-stable';
const W = 1320;
const H = 2868;

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml',
};

// Only these roots are served: the tool itself and the app's assets (icon, Loc, backgrounds).
function resolve(urlPath) {
  const p = normalize(decodeURIComponent(urlPath)).replace(/^(\.\.[/\\])+/, '');
  if (p.startsWith('/assets/')) return join(REPO, p);
  return join(HERE, p === '/' ? 'index.html' : p);
}

function send(res, code, body, type = 'text/plain') {
  res.writeHead(code, { 'content-type': type, 'cache-control': 'no-store' });
  res.end(body);
}

async function body(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return Buffer.concat(chunks).toString('utf8');
}

function run(cmd, args) {
  return new Promise((ok, fail) => {
    const p = spawn(cmd, args, { stdio: 'ignore' });
    p.on('error', fail);
    p.on('close', (code) => (code === 0 ? ok() : fail(new Error(`${cmd} exited ${code}`))));
  });
}

// Chrome's PNGs carry an alpha channel and App Store Connect rejects transparency,
// so each capture goes through ffmpeg to plain RGB.
async function exportAll() {
  const { panels } = JSON.parse(await readFile(join(HERE, 'panels.json'), 'utf8'));
  const out = join(HERE, 'export');
  await rm(out, { recursive: true, force: true });   // a reorder must not leave stale panels behind
  await mkdir(out, { recursive: true });
  const files = [];
  for (let i = 0; i < panels.length; i++) {
    const raw = join(out, `.raw-${i}.png`);
    const name = `${String(i + 1).padStart(2, '0')}-${panels[i].id}.png`;
    await run(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
      `--window-size=${W},${H}`, '--virtual-time-budget=4000', `--screenshot=${raw}`,
      `http://127.0.0.1:${PORT}/panel.html?i=${i}&export=1`]);
    await run('ffmpeg', ['-v', 'error', '-y', '-i', raw, '-pix_fmt', 'rgb24', join(out, name)]);
    await rm(raw);
    files.push(name);
  }
  return files;
}

// One string that changes whenever anything a panel draws from changes on disk.
async function version() {
  const files = [join(HERE, 'panels.json'), join(HERE, 'panel.html'), join(HERE, 'panel.css')];
  const shots = await readdir(join(HERE, 'shots')).catch(() => []);
  for (const s of shots) files.push(join(HERE, 'shots', s));
  const times = await Promise.all(files.map((f) => stat(f).then((s) => s.mtimeMs).catch(() => 0)));
  return String(Math.max(...times) + shots.length);
}

// Thumbnails: the workbench shows small PNGs instead of live full-size panels (the frost's stacked blurs made
// ~9 live panels lag). Headless Chrome needs ~4 s to draw one full-size panel with the frost (software raster;
// drawing it smaller breaks the backdrop blurs), so 4 Chromes stay open, driven over the DevTools protocol, and
// split the panels between them. Thumbnails land in a temp folder, one set per version.
const THUMBS = join(tmpdir(), 'locturne-store-shots-thumbs');
const THUMB_W = 460;
const WORKERS = 4;
const browsers = [];
// Ctrl+C or kill: exit properly so the 'exit' handlers below close the headless Chromes too.
for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(sig, () => process.exit());

async function openBrowser(k) {
  await mkdir(THUMBS, { recursive: true });
  const port = PORT + 1000 + k;
  const proc = spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${port}`,
    `--user-data-dir=${join(THUMBS, `profile-${k}`)}`, 'about:blank'], { stdio: 'ignore' });
  process.on('exit', () => proc.kill());
  const drop = () => { browsers[k] = null; };
  proc.on('exit', drop);
  let target;
  for (let t = 0; t < 50 && !target; t++) {
    target = await fetch(`http://127.0.0.1:${port}/json/list`).then((r) => r.json())
      .then((list) => list.find((x) => x.type === 'page')).catch(() => null);
    if (!target) await new Promise((ok) => setTimeout(ok, 200));
  }
  if (!target) throw new Error('headless Chrome did not start');
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((ok, fail) => { ws.onopen = ok; ws.onerror = fail; });
  let id = 0;
  const waiting = new Map();
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && waiting.has(m.id)) { const [ok, fail] = waiting.get(m.id); waiting.delete(m.id); m.error ? fail(new Error(m.error.message)) : ok(m.result); }
  };
  ws.onclose = drop;
  const send = (method, params = {}) => new Promise((ok, fail) => { waiting.set(++id, [ok, fail]); ws.send(JSON.stringify({ id, method, params })); });
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  return { send };
}

// panel.html sets body[data-ready] once it has drawn; also wait for its images.
const READY = `document.body.dataset.ready === '1' && [...document.images].every((i) => i.complete)`;

async function renderPanel(k, i, v) {
  browsers[k] ??= openBrowser(k);
  const { send } = await browsers[k];
  await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/panel.html?i=${i}` });
  for (let t = 0; t < 100; t++) {
    const { result } = await send('Runtime.evaluate', { expression: READY });
    if (result.value === true) break;
    await new Promise((ok) => setTimeout(ok, 50));
  }
  await new Promise((ok) => setTimeout(ok, 120));     // let the blurs paint
  const { data } = await send('Page.captureScreenshot', { format: 'jpeg', quality: 92, optimizeForSpeed: true });
  const raw = join(THUMBS, `.raw-${k}.jpg`);
  await writeFile(raw, Buffer.from(data, 'base64'));
  await run('ffmpeg', ['-v', 'error', '-y', '-i', raw, '-vf', `scale=${THUMB_W}:-1:flags=lanczos`, join(THUMBS, `${v}-${i}.png`)]);
}

async function renderAll(v) {
  const { panels } = JSON.parse(await readFile(join(HERE, 'panels.json'), 'utf8'));
  let next = 0;
  await Promise.all(Array.from({ length: WORKERS }, async (_, k) => {
    while (next < panels.length) await renderPanel(k, next++, v);
  }));
}

const jobs = new Map();
let chain = Promise.resolve();          // one render pass at a time
function renderOnce(v) {
  if (!jobs.has(v)) {
    const job = (chain = chain.catch(() => {}).then(() => renderAll(v)));
    job.catch(() => { jobs.delete(v); browsers.fill(null); });
    jobs.set(v, job);
  }
  return jobs.get(v);
}

async function thumb(i, v) {
  const file = join(THUMBS, `${v}-${i}.png`);
  if (!(await stat(file).then(() => true, () => false))) await renderOnce(v);
  return file;
}

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    if (url.pathname === '/api/panels' && req.method === 'PUT') {
      const text = await body(req);
      JSON.parse(text);                                   // refuse to save broken JSON
      await writeFile(join(HERE, 'panels.json'), text);
      return send(res, 200, 'ok');
    }
    if (url.pathname === '/api/version') {
      // The page polls this, so edits to panels.json or new shots show up without a reload.
      return send(res, 200, await version(), 'text/plain');
    }
    if (url.pathname === '/api/thumb') {
      const i = Number(url.searchParams.get('i'));
      const file = await thumb(i, url.searchParams.get('v') || await version());
      res.writeHead(200, { 'content-type': 'image/png', 'cache-control': 'max-age=86400' });
      return res.end(await readFile(file));
    }
    if (url.pathname === '/api/shots') {
      const shots = (await readdir(join(HERE, 'shots')).catch(() => [])).filter((s) => /\.(png|jpe?g|webp)$/i.test(s));
      return send(res, 200, JSON.stringify(shots), TYPES['.json']);
    }
    if (url.pathname === '/api/export' && req.method === 'POST') {
      const files = await exportAll();
      return send(res, 200, JSON.stringify(files), TYPES['.json']);
    }
    const file = resolve(url.pathname);
    const data = await readFile(file);
    send(res, 200, data, TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream');
  } catch (err) {
    send(res, err.code === 'ENOENT' ? 404 : 500, String(err.message ?? err));
  }
}).listen(PORT, process.env.HOST ?? "127.0.0.1", () => {
  console.log(`Store shots: http://localhost:${PORT}`);
});
