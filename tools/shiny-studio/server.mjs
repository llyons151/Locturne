// Shiny studio: every moon next to its shiny, with sliders, and a Bake button that writes the shinies into the app.
// `npm run shiny-studio` → http://localhost:5187. Settings in shiny.json; bake.py writes assets/moons/shiny/ + shiny-colors.ts.
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { readFile, stat, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(HERE, '..', '..');
const PORT = Number(process.env.PORT ?? 5187);
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png' };
const run = (args) => new Promise((ok, no) => execFile('python3', args, { cwd: HERE, maxBuffer: 1 << 24 }, (e, out, err) => (e ? no(err || e.message) : ok(out))));

createServer(async (req, res) => {
  const path = new URL(req.url, 'http://x').pathname;
  try {
    if (path === '/api/moons') {
      const moons = await run(['-c', 'import json; from shinylib import moons; print(json.dumps(moons()))']);
      const params = JSON.parse(await readFile(join(HERE, 'shiny.json'), 'utf8'));
      res.writeHead(200, { 'content-type': 'application/json' });
      return res.end(JSON.stringify({ moons: JSON.parse(moons), params }));
    }
    if (path === '/api/params' && req.method === 'POST') {
      let body = '';
      for await (const c of req) body += c;
      await writeFile(join(HERE, 'shiny.json'), JSON.stringify(JSON.parse(body), null, 1));
      res.writeHead(200); return res.end('{"ok":true}');
    }
    if (path === '/api/reset' && req.method === 'POST') {
      const out = await run(['defaults.py']);
      res.writeHead(200, { 'content-type': 'text/plain' }); return res.end(out);
    }
    if (path === '/api/bake' && req.method === 'POST') {
      const out = await run(['bake.py']);
      res.writeHead(200, { 'content-type': 'text/plain' }); return res.end(out);
    }
    const p = normalize(decodeURIComponent(path)).replace(/^(\.\.[/\\])+/, '');
    const file = p.startsWith('/assets/') ? join(ROOT, p) : join(HERE, p === '/' ? 'index.html' : p);
    const { size } = await stat(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream', 'content-length': size, 'cache-control': 'no-store' });
    createReadStream(file).pipe(res);
  } catch (e) {
    res.writeHead(500, { 'content-type': 'text/plain' }); res.end(String(e));
  }
}).listen(PORT, () => console.log(`Shiny studio on http://localhost:${PORT}`));
