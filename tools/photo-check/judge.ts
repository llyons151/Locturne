/// <reference types="node" />
/**
 * Scores the photo wake-ups' rules against what Vision saw in real photos (tools/photo-check/README.md):
 *   node tools/photo-check/judge.ts pet path/to/pet-readings.json   (src/lib/wake/pet.ts)
 *   node tools/photo-check/judge.ts bed path/to/bed-readings.json   (src/lib/wake/bed.ts)
 * Each verdict next to what it should be (pet-photos.txt, bed-pairs.txt), and the numbers behind it.
 */
import { readFileSync } from 'node:fs';

import { judgeBed, judgeBedSetup, type BedReading } from '../../src/lib/wake/bed.ts';
import { judgePet, type PetReading } from '../../src/lib/wake/pet.ts';

const [mode, file] = process.argv.slice(2);
const readings = JSON.parse(readFileSync(file, 'utf8')) as Record<string, PetReading & BedReading>;
const lines = (name: string) =>
  readFileSync(new URL(name, import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => l.split(' '));
const want = new Map(
  mode === 'bed'
    ? lines('./bed-pairs.txt').map(([ref, shot, should]) => [`${ref} ${shot}`, should])
    : lines('./pet-photos.txt').map(([name, should]) => [name, should]),
);

let right = 0;
let wrong = 0;
for (const [name, r] of Object.entries(readings).sort()) {
  const labels = r.labels ?? [];
  const setup = name.startsWith('setup:');
  const verdict =
    mode === 'bed'
      ? (setup ? judgeBedSetup : judgeBed)({ ...r, labels, people: r.people ?? 0, texture: r.texture ?? 0 })
      : judgePet({ ...r, labels, animals: r.animals ?? [], hands: r.hands ?? [] });
  const should = setup ? 'pass' : (want.get(name) ?? 'any');
  const ok = should === 'any' || should === (verdict.ok ? 'pass' : 'fail');
  if (should !== 'any') ok ? right++ : wrong++;
  const top = labels.slice(0, 4).map((l) => `${l.id} ${l.confidence.toFixed(2)}`).join(', ');
  const numbers =
    mode === 'bed'
      ? `match ${r.match?.toFixed(3) ?? '—'} · texture ${r.texture?.toFixed(4)} vs ${r.refTexture?.toFixed(4) ?? '—'} · people ${r.people}`
      : `animals ${(r.animals ?? []).map((a) => `${a.label} ${a.confidence.toFixed(2)}`).join(', ') || 'none'} · hands ${(r.hands ?? []).map((h) => h.points.length).join('/') || 'none'}`;
  console.log(
    `${ok ? '  ' : '✗ '}${name.padEnd(24)} want ${should.padEnd(4)} got ${verdict.ok ? `pass (${verdict.why})` : `fail ${verdict.miss}`}` +
      `\n      ${numbers} · ${top}`,
  );
}
console.log(`\n${right} right, ${wrong} wrong`);
