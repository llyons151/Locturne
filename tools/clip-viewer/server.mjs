// Clip viewer: watch every reference clip a study pulled (docs/reel-refs/clip-study/), with stats,
// why it was picked, Claude's take, and your own keep/skip marks + notes (saved to marks.json there).
// Fill it with `npm run clip-viewer:fetch`, then `npm run clip-viewer` and open http://localhost:5182.
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { readFile, stat, writeFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const DATA = join(HERE, '..', '..', 'docs', 'reel-refs', 'clip-study');
const PORT = Number(process.env.PORT ?? 5182);

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.mp4': 'video/mp4', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.png': 'image/png',
};

function resolve(urlPath) {
  const p = normalize(decodeURIComponent(urlPath)).replace(/^(\.\.[/\\])+/, '');
  if (p.startsWith('/data/')) return join(DATA, p.slice('/data/'.length));
  return join(HERE, p === '/' ? 'index.html' : p);
}

async function serveFile(req, res, file) {
  const { size } = await stat(file);
  const type = TYPES[extname(file)] ?? 'application/octet-stream';
  const range = req.headers.range?.match(/bytes=(\d*)-(\d*)/);
  if (range) {
    // Videos need byte ranges or the browser can't seek.
    const start = range[1] ? Number(range[1]) : 0;
    const end = range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    res.writeHead(206, { 'content-type': type, 'content-length': end - start + 1, 'accept-ranges': 'bytes',
      'content-range': `bytes ${start}-${end}/${size}` });
    createReadStream(file, { start, end }).pipe(res);
    return;
  }
  res.writeHead(200, { 'content-type': type, 'content-length': size, 'accept-ranges': 'bytes', 'cache-control': 'no-store' });
  createReadStream(file).pipe(res);
}

async function readJson(name, fallback) {
  try { return JSON.parse(await readFile(join(DATA, name), 'utf8')); } catch { return fallback; }
}

createServer(async (req, res) => {
  const path = new URL(req.url, 'http://x').pathname;
  try {
    if (path === '/api/all') {
      const [items, takes, marks] = await Promise.all([readJson('items.json', []), readJson('takes.json', {}), readJson('marks.json', {})]);
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ items, takes, marks }));
      return;
    }
    if (path === '/api/mark' && req.method === 'POST') {
      let body = '';
      for await (const chunk of req) body += chunk;
      const { id, mark, note } = JSON.parse(body);
      const marks = await readJson('marks.json', {});
      marks[id] = { mark: mark ?? null, note: note ?? '', at: new Date().toISOString() };
      if (!marks[id].mark && !marks[id].note) delete marks[id];
      await writeFile(join(DATA, 'marks.json'), JSON.stringify(marks, null, 1));
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end('{"ok":true}');
      return;
    }
    await serveFile(req, res, resolve(path));
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('not found');
  }
}).listen(PORT, () => console.log(`Clip viewer on http://localhost:${PORT}`));
