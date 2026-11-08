// Films each take's scripted demo (?v=N&auto=1) in headless Chrome via a CDP screencast, then
// stitches the frames into an mp4 with ffmpeg. Needs the lab running (npm run moons-layout-lab) and
// playwright-core resolvable (NODE_PATH). Usage: node record.mjs [outDir] [1,2,...]
import { chromium } from 'playwright-core';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const OUT = process.argv[2] ?? 'videos';
const ONLY = process.argv[3]?.split(',').map(Number);
const N = 25;
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome-stable', args: ['--hide-scrollbars', '--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--use-angle=vulkan', '--enable-features=Vulkan'] });
for (let v = 1; v <= N; v++) {
  if (ONLY && !ONLY.includes(v)) continue;
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`http://localhost:5182/?v=${v}`);
  await page.waitForFunction(() => window.__ready, null, { timeout: 30000 });
  const cdp = await page.context().newCDPSession(page);
  const frames = [];
  cdp.on('Page.screencastFrame', async (f) => {
    frames.push({ data: f.data, t: f.metadata.timestamp });
    cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 88, maxWidth: 780, maxHeight: 1688, everyNthFrame: 1 });
  await page.waitForTimeout(400);
  await page.evaluate(() => run(VARIANTS[+new URLSearchParams(location.search).get('v') - 1], true));
  await page.waitForFunction(() => window.__done, null, { timeout: 60000, polling: 100 });
  await page.waitForTimeout(300);
  await cdp.send('Page.stopScreencast');
  await page.close();

  const dir = join(OUT, `f${v}`); rmSync(dir, { recursive: true, force: true }); mkdirSync(dir);
  let list = '';
  frames.forEach((f, i) => {
    const name = `${String(i).padStart(5, '0')}.jpg`;
    writeFileSync(join(dir, name), Buffer.from(f.data, 'base64'));
    const dur = i + 1 < frames.length ? Math.max(0.001, frames[i + 1].t - f.t) : 0.5;
    list += `file '${name}'\nduration ${dur.toFixed(4)}\n`;
  });
  list += `file '${String(frames.length - 1).padStart(5, '0')}.jpg'\n`;
  writeFileSync(join(dir, 'list.txt'), list);
  const out = join(OUT, `take-${String(v).padStart(2, "0")}.mp4`);
  // Poster: the frame ~45% through (the pop-up is open, mid-scroll).
  writeFileSync(join(OUT, `take-${String(v).padStart(2, '0')}.jpg`), Buffer.from(frames[Math.floor(frames.length * .45)].data, 'base64'));
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', join(dir, 'list.txt'),
    '-vf', 'fps=30,scale=540:-2:flags=lanczos,format=yuv420p', '-c:v', 'libx264', '-crf', '24', '-preset', 'slow', '-movflags', '+faststart', out]);
  rmSync(dir, { recursive: true, force: true });
  const span = frames.length ? frames.at(-1).t - frames[0].t : 0;
  console.log(`v${v}: ${frames.length} frames, ${(frames.length / Math.max(span, .001)).toFixed(1)} fps${errors.length ? ' ERRORS: ' + errors.join(' | ') : ''}`);
}
await browser.close();
