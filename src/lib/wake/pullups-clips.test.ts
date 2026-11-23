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

/**
 * The user's own set (2026-11-22): the phone upright and close, the legs off the edge of the picture.
 * MediaPipe still guesses the ankles out there, at 0.3–0.53, level with the hips: before, every rep
 * was called a bed, and the phone counted 10 of 16. The feet aren't seen, so it asks for them and
 * counts nothing; with them seen (put back in, on the floor under the knees), all 16 count, whatever
 * the camera's rate and wherever its frames fall.
 */
describe("the user's own set (2026-11-22)", () => {
  type Set = { joints: Joint[]; reps: number; frames: number[][] };
  const data = JSON.parse(readFileSync(new URL('./fixtures/bench-user-2026-11-22.json', import.meta.url), 'utf8')) as Set;
  const run = (hz: number, offset: number, feet: boolean) => {
    let s = startPushups(0, 1000, { exercise: 'bench' });
    let slot = -1;
    for (const row of data.frames) {
      const k = Math.floor(((row[0] + offset) * hz) / 1000);
      if (k === slot) continue;
      slot = k;
      const joints: PoseFrame['joints'] = {};
      data.joints.forEach((name, i) => {
        const [x, y, c] = row.slice(1 + i * 3, 4 + i * 3);
        if (c > 0) joints[name] = { x, y, c: c / 100 };
      });
      const { leftHip: hip, leftShoulder: sh } = joints;
      if (feet && hip && sh) {
        const torso = Math.hypot(hip.x - sh.x, hip.y - sh.y);
        joints.leftAnkle = joints.rightAnkle = { x: hip.x + torso * 1.2, y: hip.y + torso * 0.6, c: 0.95 };
      }
      s = tick(addPose(s, { at: row[0], joints }), row[0]);
    }
    return s;
  };
  test('the ankles guessed out of the picture are not feet: it asks for them, and never calls it a bed', () => {
    const s = run(15, 0, false);
    assert.equal(s.reps, 0);
    assert.equal(s.hint, 'noFeet');
    assert.notEqual(s.miss, 'bed');
  });
  for (const hz of [8, 10, 12, 15])
    test(`with the feet seen, all ${data.reps} count at ${hz} a second, wherever the frames fall`, () => {
      for (const offset of [0, 20, 40, 60, 80, 100]) assert.equal(run(hz, offset, true).reps, data.reps, `offset ${offset} ms`);
    });
});
