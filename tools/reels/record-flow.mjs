// Record the web build as a phone-sized screencast, driven by a list of steps.
// usage: node record-flow.mjs <outdir> '<json steps>'   steps: {go:url} {wait:text} {tap:text} {sleep:ms} {rec:true}
import { spawn } from 'node:child_process';
import { writeFile, mkdir } from 'node:fs/promises';
const [outdir, json] = process.argv.slice(2);
const steps = JSON.parse(json);
await mkdir(`${outdir}/frames`, { recursive: true });
const port = 9335;
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
const waiting = new Map(), stamps = [], writes = [];
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
const find = (text) => `(() => { const el = [...document.querySelectorAll('*')].filter((e) => e.textContent.trim() === ${JSON.stringify(text)} && e.children.length === 0)[0]; if (!el) return null; el.scrollIntoView({ block: 'center' }); const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`;
await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 430, height: 932, deviceScaleFactor: 3, mobile: true });
for (const s of steps) {
  if (s.go) await send('Page.navigate', { url: s.go });
  if (s.wait) for (let t = 0; t < 240; t++) { const r = await send('Runtime.evaluate', { expression: find(s.wait), returnByValue: true }); if (r?.result?.value) break; await sleep(500); }
  if (s.tap) { await sleep(300);
    const r = await send('Runtime.evaluate', { expression: find(s.tap), returnByValue: true });
    const pt = r?.result?.value; console.log('tap', s.tap, JSON.stringify(pt));
    if (pt) { for (const type of ['mouseMoved', 'mousePressed']) await send('Input.dispatchMouseEvent', { type, x: pt.x, y: pt.y, button: 'left', clickCount: 1 }); await sleep(80); await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: pt.x, y: pt.y, button: 'left', clickCount: 1 }); }
  }
  if (s.click) { const [x, y] = s.click; for (const type of ['mouseMoved', 'mousePressed']) await send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 }); await sleep(80); await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 }); }
  if (s.js) await send('Runtime.evaluate', { expression: s.js });
  if (s.rec) await send('Page.startScreencast', { format: 'jpeg', quality: 92, everyNthFrame: 1 });
  if (s.shot) { const r = await send('Page.captureScreenshot', { format: 'png' }); await writeFile(`${outdir}/${s.shot}`, Buffer.from(r.data, 'base64')); }
  if (s.sleep) await sleep(s.sleep);
}
await send('Page.stopScreencast');
await Promise.all(writes);
await writeFile(`${outdir}/stamps.json`, JSON.stringify(stamps));
console.log('frames', n);
proc.kill();
process.exit(0);
