// Cut studio: trim, cut and speed up phone recordings, then render them at full quality.
// A project is any folder in ~/Documents/Projects/Tools/LocturneStudio/output that has a raw/ folder of videos.
// Every edit is saved to <project>/edits.json, so Claude can read and change the same cuts you make in the page.
// `npm run cut-studio`, then open http://localhost:5186.
import { createServer } from 'node:http';
import { createReadStream, existsSync } from 'node:fs';
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { homedir } from 'node:os';
import { basename, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const ROOT = process.env.CUT_ROOT ?? join(homedir(), 'Documents', 'Projects', 'Tools', 'LocturneStudio', 'output');
const PORT = Number(process.env.PORT ?? 5186);
const VIDEO = /\.(mp4|mov|m4v)$/i;

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.mp4': 'video/mp4', '.jpg': 'image/jpeg', '.png': 'image/png',
};

// ---------- helpers ----------

function run(cmd, args, onLine) {
  return new Promise((ok, fail) => {
    const p = spawn(cmd, args);
    let err = '';
    p.stdout.on('data', (d) => onLine && String(d).split('\n').forEach(onLine));
    p.stderr.on('data', (d) => (err += d));
    p.on('close', (code) => (code === 0 ? ok() : fail(new Error(err.slice(-2000)))));
  });
}

async function probe(file) {
  return new Promise((ok, fail) => {
    const p = spawn('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:stream=codec_type,width,height',
      '-of', 'json', file]);
    let out = '';
    p.stdout.on('data', (d) => (out += d));
    p.on('close', (code) => {
      if (code !== 0) return fail(new Error('ffprobe failed: ' + file));
      const j = JSON.parse(out);
      const v = j.streams.find((s) => s.codec_type === 'video');
      ok({ duration: Number(j.format.duration), width: v.width, height: v.height,
        audio: j.streams.some((s) => s.codec_type === 'audio') });
    });
  });
}

const safe = (s) => /^[\w.\- ]+$/.test(s) && !s.includes('..');

async function projects() {
  const out = [];
  for (const name of (await readdir(ROOT)).sort().reverse()) {
    if (existsSync(join(ROOT, name, 'raw'))) out.push(name);
  }
  return out;
}

// edits.json: { clips: { <name>: { source, cropTop, note, segments: [{ in, out, speed, label }] } } }
async function loadEdits(project) {
  const dir = join(ROOT, project);
  const file = join(dir, 'edits.json');
  let edits = existsSync(file) ? JSON.parse(await readFile(file, 'utf8')) : { clips: {} };
  const raws = (await readdir(join(dir, 'raw'))).filter((f) => VIDEO.test(f)).sort();
  let changed = !existsSync(file);
  for (const [i, f] of raws.entries()) {
    if (Object.values(edits.clips).some((c) => c.source === f)) continue;
    const { duration } = await probe(join(dir, 'raw', f));
    let name = `clip-${i + 1}`;
    while (edits.clips[name]) name += 'b';
    edits.clips[name] = { source: f, cropTop: 0, note: '', segments: [{ in: 0, out: +duration.toFixed(2), speed: 1, label: '' }] };
    changed = true;
  }
  if (changed) await writeFile(file, JSON.stringify(edits, null, 2));
  return edits;
}

// ---------- proxies (small H.264 copies the browser can scrub; Firefox can't play the phone's HEVC) ----------

const proxyJobs = new Map();
function proxy(project, source) {
  const dir = join(ROOT, project, '.studio');
  const out = join(dir, basename(source, extname(source)) + '.proxy.mp4');
  const strip = join(dir, basename(source, extname(source)) + '.strip.jpg');
  const key = out;
  if (!proxyJobs.has(key)) {
    proxyJobs.set(key, (async () => {
      await mkdir(dir, { recursive: true });
      const src = join(ROOT, project, 'raw', source);
      if (!existsSync(out)) {
        await run('ffmpeg', ['-v', 'error', '-y', '-i', src, '-vf', 'scale=480:-2', '-c:v', 'libx264', '-preset', 'veryfast',
          '-crf', '27', '-g', '12', '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', out + '.tmp.mp4']);
        await run('mv', [out + '.tmp.mp4', out]);
      }
      if (!existsSync(strip)) {
        const { duration } = await probe(src);
        const n = Math.min(120, Math.max(10, Math.round(duration)));
        await run('ffmpeg', ['-v', 'error', '-y', '-i', src, '-vf',
          `fps=${n}/${duration},scale=64:-2,tile=${n}x1`, '-frames:v', '1', '-q:v', '5', strip]);
      }
    })().catch((e) => { proxyJobs.delete(key); throw e; }));
  }
  return proxyJobs.get(key);
}

// ---------- render ----------

const renders = new Map(); // `${project}/${clip}` -> { state, progress, error, file }

function atempo(speed) {
  const parts = [];
  let s = speed;
  while (s > 2) { parts.push('atempo=2'); s /= 2; }
  while (s < 0.5) { parts.push('atempo=0.5'); s /= 0.5; }
  parts.push(`atempo=${s.toFixed(4)}`);
  return parts.join(',');
}

async function render(project, name) {
  const key = `${project}/${name}`;
  const edits = await loadEdits(project);
  const clip = edits.clips[name];
  if (!clip) throw new Error('No clip ' + name);
  const src = join(ROOT, project, 'raw', clip.source);
  const info = await probe(src);
  const segs = clip.segments.filter((s) => s.out - s.in > 0.05).sort((a, b) => a.in - b.in);
  if (!segs.length) throw new Error('No segments to render');
  const total = segs.reduce((t, s) => t + (s.out - s.in) / s.speed, 0);
  let fc = '';
  segs.forEach((s, i) => {
    const len = (s.out - s.in) / s.speed;
    fc += `[0:v]trim=${s.in}:${s.out},setpts=(PTS-STARTPTS)/${s.speed}[v${i}];`;
    if (info.audio) {
      fc += `[0:a]atrim=${s.in}:${s.out},asetpts=PTS-STARTPTS,${atempo(s.speed)},` +
        `afade=t=in:d=0.03,afade=t=out:st=${Math.max(0, len - 0.03).toFixed(3)}:d=0.03[a${i}];`;
    }
  });
  const n = segs.length;
  fc += segs.map((_, i) => `[v${i}]` + (info.audio ? `[a${i}]` : '')).join('') +
    `concat=n=${n}:v=1:a=${info.audio ? 1 : 0}[vc]` + (info.audio ? '[a]' : '') + ';';
  const crop = Math.max(0, Math.round((clip.cropTop || 0) / 2) * 2);
  fc += crop ? `[vc]crop=${info.width}:${info.height - crop}:0:${crop}[v]` : '[vc]null[v]';
  await mkdir(join(ROOT, project, 'renders'), { recursive: true });
  const out = join(ROOT, project, 'renders', `${name}.mp4`);
  const job = { state: 'rendering', progress: 0, error: null, file: `${name}.mp4`, at: Date.now() };
  renders.set(key, job);
  const args = ['-v', 'error', '-y', '-i', src, '-filter_complex', fc, '-map', '[v]', ...(info.audio ? ['-map', '[a]'] : []),
    '-c:v', 'libx264', '-crf', '15', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-r', '60',
    ...(info.audio ? ['-c:a', 'aac', '-b:a', '192k'] : []), '-movflags', '+faststart', '-progress', 'pipe:1', out + '.tmp.mp4'];
  run('ffmpeg', args, (line) => {
    const m = line.match(/^out_time_us=(\d+)/);
    if (m) job.progress = Math.min(0.99, Number(m[1]) / 1e6 / total);
  })
    .then(() => run('mv', [out + '.tmp.mp4', out]))
    .then(() => Object.assign(job, { state: 'done', progress: 1, at: Date.now() }))
    .catch((e) => Object.assign(job, { state: 'error', error: e.message }));
}

// ---------- http ----------

async function serveFile(req, res, file) {
  const { size } = await stat(file);
  const type = TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream';
  const range = req.headers.range?.match(/bytes=(\d*)-(\d*)/);
  if (range) {
    const start = range[1] ? Number(range[1]) : 0;
    const end = range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    res.writeHead(206, { 'content-type': type, 'content-length': end - start + 1, 'accept-ranges': 'bytes',
      'content-range': `bytes ${start}-${end}/${size}`, 'cache-control': 'no-store' });
    createReadStream(file, { start, end }).pipe(res);
    return;
  }
  res.writeHead(200, { 'content-type': type, 'content-length': size, 'accept-ranges': 'bytes', 'cache-control': 'no-store' });
  createReadStream(file).pipe(res);
}

const json = (res, data, code = 200) => {
  res.writeHead(code, { 'content-type': 'application/json', 'cache-control': 'no-store' });
  res.end(JSON.stringify(data));
};
const body = (req) => new Promise((ok) => { let b = ''; req.on('data', (d) => (b += d)); req.on('end', () => ok(b)); });

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    const parts = url.pathname.split('/').filter(Boolean).map(decodeURIComponent);
    if (parts[0] === 'api') {
      if (parts[1] === 'projects') return json(res, await projects());
      const project = parts[2];
      if (!project || !safe(project) || !existsSync(join(ROOT, project, 'raw'))) return json(res, { error: 'bad project' }, 404);
      if (parts[1] === 'edits' && req.method === 'GET') {
        const edits = await loadEdits(project);
        const info = {};
        for (const [name, c] of Object.entries(edits.clips)) {
          const p = await probe(join(ROOT, project, 'raw', c.source));
          const r = join(ROOT, project, 'renders', `${name}.mp4`);
          info[name] = { ...p, rendered: existsSync(r) ? (await stat(r)).mtimeMs : null };
          proxy(project, c.source).catch(() => {});
        }
        return json(res, { edits, info });
      }
      if (parts[1] === 'edits' && req.method === 'PUT') {
        const edits = JSON.parse(await body(req));
        await writeFile(join(ROOT, project, 'edits.json'), JSON.stringify(edits, null, 2));
        return json(res, { ok: true });
      }
      if (parts[1] === 'proxy') {
        const edits = await loadEdits(project);
        const clip = edits.clips[parts[3]];
        if (!clip) return json(res, { error: 'no clip' }, 404);
        await proxy(project, clip.source);
        const base = join(ROOT, project, '.studio', basename(clip.source, extname(clip.source)));
        return await serveFile(req, res, base + (parts[4] === 'strip' ? '.strip.jpg' : '.proxy.mp4'));
      }
      if (parts[1] === 'render' && req.method === 'POST') {
        await render(project, parts[3]);
        return json(res, { ok: true });
      }
      if (parts[1] === 'render' && req.method === 'GET') {
        return json(res, renders.get(`${project}/${parts[3]}`) ?? { state: 'idle' });
      }
      if (parts[1] === 'rendered') {
        const f = join(ROOT, project, 'renders', parts[3] + '.mp4');
        if (!safe(parts[3]) || !existsSync(f)) return json(res, { error: 'not rendered' }, 404);
        return await serveFile(req, res, f);
      }
      return json(res, { error: 'unknown' }, 404);
    }
    const p = normalize(url.pathname).replace(/^(\.\.[/\\])+/, '');
    return await serveFile(req, res, join(HERE, p === '/' ? 'index.html' : p));
  } catch (e) {
    json(res, { error: e.message }, 500);
  }
}).listen(PORT, () => console.log(`Cut studio on http://localhost:${PORT}  (projects in ${ROOT})`));
