// Bubble lab: twenty animated takes on Loc's payoff speech bubble, side by side, to pick a
// direction by eye (user, 2026-10-29). Static mockups, not the app. No dependencies; run with
// `npm run bubble-lab` and open http://localhost:5177.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const REPO = join(HERE, '..', '..');
const PORT = Number(process.env.PORT ?? 5177);

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
}).listen(PORT, () => console.log(`Bubble lab on http://localhost:${PORT}`));
