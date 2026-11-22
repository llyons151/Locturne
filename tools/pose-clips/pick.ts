import { readFileSync, writeFileSync } from 'node:fs';
import { addPose, startPushups, tick } from '../../src/lib/wake/pushups.ts';
const [file, ex, out, maxKb, ...relabel] = process.argv.slice(2);
const d = JSON.parse(readFileSync(file, 'utf8'));
const re = Object.fromEntries(relabel.map((r) => r.split('=')).map(([k, v]) => [k, +v]));
const run = (clip: any, mode: string) => {
  let s = startPushups(0, 1000, { exercise: ex as any });
  clip.frames.forEach((row: number[], i: number) => {
    if (mode === 'half' && i % 2) return;
    const joints: any = {};
    d.joints.forEach((n: string, j: number) => { const [x, y, c] = row.slice(1 + j * 3, 4 + j * 3); if (c > 0) joints[n] = { x: mode === 'mirror' ? 2000 - x : x, y, c: c / 100 }; });
    s = tick(addPose(s, { at: row[0], joints }), row[0]);
  });
  return s.reps;
};
const keep: any = {}; let size = 0; const rows: string[] = [];
const prio = (process.env.PRIO ?? "").split(",");
const entries = Object.entries<any>(d.clips).sort((a, b) => (prio.includes(b[0]) ? 1 : 0) - (prio.includes(a[0]) ? 1 : 0) || a[1].frames.length - b[1].frames.length);
for (const [id, clip0] of entries) {
  const clip = id in re ? { ...clip0, reps: re[id], what: clip0.what + ` [counted ${re[id]} by Locturne's rule]` } : clip0;
  const got = ['as', 'half', 'mirror'].map((m) => run(clip, m));
  const pass = got.every((g) => g === clip.reps);
  const bytes = JSON.stringify(clip).length;
  if (pass && size + bytes < +maxKb * 1024) { keep[id] = clip; size += bytes; rows.push(`kept ${id} ${clip.reps}`); }
  else rows.push(`${pass ? 'size' : 'FAIL'} ${id} want ${clip.reps} got ${got}`);
}
writeFileSync(out, JSON.stringify({ joints: d.joints, clips: keep }));
console.log(rows.join('\n'), `\n${Object.keys(keep).length} kept, ${(size / 1024) | 0} KB`);
