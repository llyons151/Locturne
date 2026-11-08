// Runs every take headless and reports page errors (no video).
import { chromium } from 'playwright-core';
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome-stable' });
const only = process.argv[2]?.split(',').map(Number);
for (let v = 1; v <= 25; v++) {
  if (only && !only.includes(v)) continue;
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(`http://localhost:5182/?v=${v}&auto=1`);
  const t0 = Date.now();
  try { await page.waitForFunction(() => window.__done, null, { timeout: 40000, polling: 200 }); } catch { errors.push('timeout'); }
  const theme = await page.evaluate(() => state.theme).catch(() => '?');
  console.log(`v${v} ${((Date.now() - t0) / 1000).toFixed(1)}s theme=${theme} ${errors.join(' | ')}`);
  await page.close();
}
await browser.close();
