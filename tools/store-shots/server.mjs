// App Store screenshot workbench: renders the panels in panels.json, shows them in a mock App Store,
// and exports them as 1320×2868 PNGs. No dependencies; run with `npm run store-shots`.
import { createServer } from 'node:http';
import { readFile, writeFile, stat, mkdir, readdir, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { extname, join, normalize } from 'node:path';
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
      const files = [join(HERE, 'panels.json'), join(HERE, 'panel.html'), join(HERE, 'panel.css')];
      const shots = await readdir(join(HERE, 'shots')).catch(() => []);
      for (const s of shots) files.push(join(HERE, 'shots', s));
      const times = await Promise.all(files.map((f) => stat(f).then((s) => s.mtimeMs).catch(() => 0)));
      return send(res, 200, String(Math.max(...times) + shots.length), 'text/plain');
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
