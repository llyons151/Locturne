// Moon lab: fifty moons on a mock of Home, each with its sky, halo, moon and sleep orb recoloured
// together, and a ladder to line up the first ten by eye (user, 2026-10-29). A mockup, not the app.
// No dependencies; run with `npm run moon-lab` and open http://localhost:5178.
import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const REPO = join(HERE, '..', '..');
const PORT = Number(process.env.PORT ?? 5178);

/** Your ladder and no's, kept in a file as well as the browser, so Claude can read them. docs/ is local only. */
const PICKS = join(REPO, 'docs', 'moon-lab-picks.json');

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg',
};

// Only the lab itself, the app's assets and the store-shots Loc art are served.
function resolve(urlPath) {
  const p = normalize(decodeURIComponent(urlPath)).replace(/^(\.\.[/\\])+/, '');
  if (p.startsWith('/assets/')) return join(REPO, p);
  if (p.startsWith('/loc/')) return join(REPO, 'tools', 'store-shots', p.slice('/loc/'.length));
  return join(HERE, p === '/' ? 'index.html' : p);
}

async function picks(req, res) {
  res.setHeader('content-type', 'application/json');
  if (req.method === 'POST') {
    let body = '';
    for await (const chunk of req) body += chunk;
    try {
      await mkdir(join(REPO, 'docs'), { recursive: true });
      await writeFile(PICKS, `${JSON.stringify(JSON.parse(body), null, 2)}\n`);
      res.end('{}');
    } catch {
      res.statusCode = 400;
      res.end('{}');
    }
    return;
  }
  try {
    res.end(await readFile(PICKS, 'utf8'));
  } catch {
    res.end('{}');
  }
}

createServer(async (req, res) => {
  const path = new URL(req.url, 'http://x').pathname;
  if (path === '/__moon-picks') return picks(req, res);
  try {
    const file = resolve(path);
    const data = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(data);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('not found');
  }
}).listen(PORT, () => console.log(`Moon lab on http://localhost:${PORT}`));
