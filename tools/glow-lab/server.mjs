// Glow lab: the top glassy, flowing background looks from the 2026-11-17 deep dive, each a real
// WebGL shader behind the real welcome phone, to pick one (user 2026-11-17). Mockups, not the app. No dependencies; run with
// `npm run glow-lab` and open http://localhost:5183.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const REPO = join(HERE, '..', '..');
const PORT = Number(process.env.PORT ?? 5183);

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.mp4': 'video/mp4',
};

// Only the lab itself, the app's assets and the store-shots Loc art are served.
function resolve(urlPath) {
  const p = normalize(decodeURIComponent(urlPath)).replace(/^(\.\.[/\\])+/, '');
  if (p.startsWith('/assets/')) return join(REPO, p);
  if (p.startsWith('/loc/')) return join(REPO, 'tools', 'store-shots', p.slice('/loc/'.length));
  return join(HERE, p === '/' ? 'index.html' : p);
}

createServer(async (req, res) => {
  try {
    const file = resolve(new URL(req.url, 'http://x').pathname);
    const data = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(data);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('not found');
  }
}).listen(PORT, () => console.log(`Glow lab on http://localhost:${PORT}`));
