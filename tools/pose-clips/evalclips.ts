import { readFileSync } from 'node:fs';
import { addPose, startPushups, tick, JOINTS } from '../../src/lib/wake/pushups.ts';
const [file, ex, filter] = process.argv.slice(2);
const d = JSON.parse(readFileSync(file, 'utf8'));
let ok = 0, n = 0, fake = 0, missed = 0;
for (const [id, clip] of Object.entries<any>(d.clips)) {
  if (filter && !id.includes(filter)) continue;
  let s = startPushups(0, 999, { exercise: ex as any });
  const misses: string[] = [];
  for (const f of clip.frames) {
    const joints: any = {};
    JOINTS.forEach((j, i) => { const c = f[3 + i * 3]; if (c > 0) joints[j] = { x: f[1 + i * 3], y: f[2 + i * 3], c: c / 100 }; });
    s = addPose(s, { at: f[0], joints });
    if (s.miss && misses.at(-1) !== s.miss) misses.push(s.miss);
    s = tick(s, f[0]);
  }
  n++;
  const good = s.reps === clip.reps;
  if (good) ok++; else if (s.reps > clip.reps) fake += s.reps - clip.reps; else missed += clip.reps - s.reps;
  console.log(`${good ? '  ' : 'XX'} ${id.padEnd(34)} want ${String(clip.reps).padStart(2)} got ${String(s.reps).padStart(2)}  ${misses.slice(0, 6).join(',')}  | ${clip.what.slice(0, 90)}`);
}
console.log(`${ok}/${n} exact; extra reps ${fake}, missed reps ${missed}`);
