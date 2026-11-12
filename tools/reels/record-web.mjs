// Record the web build as a phone-sized screencast. usage: node record-web.mjs <outdir> <url> <clickText> <seconds>
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
const [outdir, url, clickText, secs] = process.argv.slice(2);
const port = 9334;
const proc = spawn('google-chrome-stable', ['--headless=new', '--hide-scrollbars', `--remote-debugging-port=${port}`, `--user-data-dir=${outdir}/profile`, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((ok) => setTimeout(ok, ms));
let target;
for (let t = 0; t < 50 && !target; t++) {
  target = await fetch(`http://127.0.0.1:${port}/json/list`).then((r) => r.json()).then((l) => l.find((x) => x.type === 'page')).catch(() => null);
  if (!target) await sleep(200);
}
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((ok) => (ws.onopen = ok));
let id = 0, n = 0;
const waiting = new Map();
const stamps = [];
const writes = [];
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && waiting.has(m.id)) { waiting.get(m.id)(m.result); waiting.delete(m.id); }
  if (m.method === 'Page.screencastFrame') {
    const name = `f${String(n++).padStart(5, '0')}.jpg`;
    stamps.push([name, m.params.metadata.timestamp]);
    writes.push(writeFile(`${outdir}/frames/${name}`, Buffer.from(m.params.data, 'base64')));
    ws.send(JSON.stringify({ id: ++id, method: 'Page.screencastFrameAck', params: { sessionId: m.params.sessionId } }));
  }
};
const send = (method, params = {}) => new Promise((ok) => { waiting.set(++id, ok); ws.send(JSON.stringify({ id, method, params })); });
await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 430, height: 932, deviceScaleFactor: 2, mobile: true });
await send('Emulation.setTimezoneOverride', { timezoneId: process.env.TZID || 'Etc/GMT+12' });
await send('Page.navigate', { url });
// wait for the bundle: until the text to click exists
for (let t = 0; t < 240; t++) {
  const r = await send('Runtime.evaluate', { expression: `[...document.querySelectorAll('*')].some((e) => e.textContent.trim() === ${JSON.stringify(clickText)})`, returnByValue: true });
  if (r?.result?.value) break;
  await sleep(1000);
}
await sleep(1500);
await send('Page.startScreencast', { format: 'jpeg', quality: 90, everyNthFrame: 1 });
const ok = await send('Runtime.evaluate', { expression: `(() => { const el = [...document.querySelectorAll('*')].filter((e) => e.textContent.trim() === ${JSON.stringify(clickText)} && e.children.length === 0)[0]; if (!el) return null; el.scrollIntoView({ block: 'center' }); const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`, returnByValue: true });
const pt = ok?.result?.value;
console.log('tap at', JSON.stringify(pt));
if (pt) {
  await sleep(300);
  await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: pt.x, y: pt.y }] });
  await sleep(60);
  await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}
await sleep(Number(secs) * 1000);
await send('Page.stopScreencast');
await Promise.all(writes);
await writeFile(`${outdir}/stamps.json`, JSON.stringify(stamps));
console.log('frames', n);
proc.kill();
process.exit(0);
