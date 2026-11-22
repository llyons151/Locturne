/// <reference types="node" />

/**
 * Real clips (2026-11-21, docs/PULLUP_TESTS.md): YouTube videos of pull-ups, the bench press and their
 * look-alikes, run through MediaPipe's pose model at 15 frames a second, the joints kept, the
 * video not. Counts by eye from contact sheets. Each runs as shot, at half the frame rate and
 * facing the other way. Only clips the rules get right every way are here; the ones they don't
 * (jumping and box-assisted pull-ups, side-on kipping; bench clips shot right up against the
 * plates, or from the foot end) are listed in the doc.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';

import { addPose, startPushups, tick, type Exercise, type Joint, type PoseFrame } from './pushups.ts';

for (const [file, exercise] of [
  ['pullup-clips.json', 'pullups'],
  ['bench-clips.json', 'bench'],
] as const satisfies readonly (readonly [string, Exercise])[])
  describe(`real clips (${file})`, () => {
    type Clip = { reps: number; what: string; frames: number[][] };
    const data = JSON.parse(readFileSync(new URL(`./fixtures/${file}`, import.meta.url), 'utf8')) as { joints: Joint[]; clips: Record<string, Clip> };
    const toFrame = (row: number[], mirror: boolean): PoseFrame => {
      const joints: PoseFrame['joints'] = {};
      data.joints.forEach((name, i) => {
        const [x, y, c] = row.slice(1 + i * 3, 4 + i * 3);
        if (c > 0) joints[name] = { x: mirror ? 2000 - x : x, y, c: c / 100 };
      });
      return { at: row[0], joints };
    };
    const count = (clip: Clip, { every = 1, mirror = false } = {}) => {
      let s = startPushups(0, 1000, { exercise });
      clip.frames.forEach((row, i) => {
        if (i % every) return;
        const frame = toFrame(row, mirror);
        s = tick(addPose(s, frame), frame.at);
      });
      return s.reps;
    };
    for (const [name, clip] of Object.entries(data.clips)) {
      test(`${clip.what}: ${clip.reps}`, () => {
        assert.equal(count(clip), clip.reps, name);
        assert.equal(count(clip, { every: 2 }), clip.reps, `${name}, half the frame rate`);
        assert.equal(count(clip, { mirror: true }), clip.reps, `${name}, mirrored`);
      });
    }
  });
