// Payoff studio's Send (src/features/wake/payoff-studio.web.tsx): writes the placement to
// docs/payoff-layout.json (docs/ is local only), keeping each box's measurements from earlier sends.
// No dependencies; `npm run payoff-studio` (the studio itself is the app's /payoff-studio on :8081).
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..');
const OUT = join(REPO, 'docs', 'payoff-layout.json');
const PORT = Number(process.env.PORT ?? 5182);

createServer(async (req, res) => {
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-headers', 'content-type');
  if (req.method === 'OPTIONS') return res.end();
  if (req.method !== 'POST' || req.url !== '/save') {
    res.writeHead(404);
    return res.end();
  }
  let body = '';
  for await (const chunk of req) body += chunk;
  try {
    const sent = JSON.parse(body);
    const prev = JSON.parse(await readFile(OUT, 'utf8').catch(() => '{}'));
    const next = {
      savedAt: new Date().toISOString(),
      layouts: sent.layouts,
      measured: { ...prev.measured, [sent.box]: { size: sent.size, pieces: sent.measured } },
    };
    await writeFile(OUT, JSON.stringify(next, null, 2) + '\n');
    console.log(`Saved ${sent.box} to ${OUT}`);
    res.end('ok');
  } catch (e) {
    res.writeHead(400);
    res.end(String(e));
  }
}).listen(PORT, () => console.log(`Payoff studio save server on http://localhost:${PORT}; open http://localhost:8081/payoff-studio`));
