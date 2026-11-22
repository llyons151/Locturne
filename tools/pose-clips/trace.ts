import { readFileSync } from 'node:fs';
import { addPose, startPushups, tick, JOINTS } from '../../src/lib/wake/pushups.ts';
const [file, ex, id, from = '0', to = '1e9'] = process.argv.slice(2);
const clip = JSON.parse(readFileSync(file, 'utf8')).clips[id];
let s = startPushups(0, 999, { exercise: ex as any });
let last = '';
for (const f of clip.frames) {
  const joints: any = {};
  JOINTS.forEach((j, i) => { const c = f[3 + i * 3]; if (c > 0) joints[j] = { x: f[1 + i * 3], y: f[2 + i * 3], c: c / 100 }; });
  s = addPose(s, { at: f[0], joints });
  s = tick(s, f[0]);
  const t = s.travel;
  const line = `${s.reps} ${s.status[0]} ${s.hint ?? ''} ${t?.phase} ${s.miss ?? ''} | ${t?.info}`;
  if (f[0] >= +from && f[0] <= +to) console.log((f[0] / 1000).toFixed(1).padStart(5), line);
}
