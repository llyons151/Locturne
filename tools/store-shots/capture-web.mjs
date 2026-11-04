// Capture web-build screens at iPhone 6.9" size (430x932 @3x = 1290x2796) after a real-time wait, for tools/store-shots/shots.
// usage: node tools/store-shots/capture-web.mjs <outdir> <waitMs> <name=url>...   e.g. 11-moon-noir="http://localhost:8081/morning-won?demo=1&week=3&newMoon=noir" (wait ~18000 so the payoff settles)
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

const [outdir, waitMs, ...jobs] = process.argv.slice(2);
const port = 9333;
const proc = spawn('google-chrome-stable', ['--headless=new', '--hide-scrollbars', `--remote-debugging-port=${port}`,
  `--user-data-dir=${outdir}/profile`, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((ok) => setTimeout(ok, ms));
let target;
for (let t = 0; t < 50 && !target; t++) {
  target = await fetch(`http://127.0.0.1:${port}/json/list`).then((r) => r.json()).then((l) => l.find((x) => x.type === 'page')).catch(() => null);
  if (!target) await sleep(200);
}
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((ok) => (ws.onopen = ok));
let id = 0;
const waiting = new Map();
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && waiting.has(m.id)) { waiting.get(m.id)(m.result); waiting.delete(m.id); } };
const send = (method, params = {}) => new Promise((ok) => { waiting.set(++id, ok); ws.send(JSON.stringify({ id, method, params })); });
await send('Emulation.setDeviceMetricsOverride', { width: 430, height: 932, deviceScaleFactor: 3, mobile: true });
for (const job of jobs) {
  // `name=url#click=Label`: after the wait, tap the element whose text is exactly Label, then wait 3 s more.
  const [name, full] = job.split(/=(.*)/s);
  const [url, click] = full.split('#click=');
  await send('Page.navigate', { url });
  await sleep(Number(waitMs));
  if (click) {
    await send('Runtime.evaluate', { expression: `(() => { const el = [...document.querySelectorAll('*')].reverse()
      .find((e) => e.textContent.trim() === ${JSON.stringify(decodeURIComponent(click))}); el?.click(); return !!el; })()` });
    await sleep(3000);
  }
  const { data } = await send('Page.captureScreenshot', { format: 'png' });
  await writeFile(`${outdir}/${name}.png`, Buffer.from(data, 'base64'));
  console.log('saved', name);
}
proc.kill();
process.exit(0);
