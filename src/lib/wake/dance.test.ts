/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { DANCE, readStanding } from './dance.ts';
import { frontPose, scenePose, type DemoScene } from './pose-demo.ts';
import { addPose, startPushups, tick, type PoseFrame, type PushupsSession } from './pushups.ts';

const W = 390;
const H = 844;
const FRAME_MS = 66;

const start = (goal = 10) => startPushups(0, goal, { exercise: 'dance' });

/** Feeds `scene` from `from` to `to` ms, a frame every `FRAME_MS`, ticking the clock each second. */
function run(s: PushupsSession, scene: DemoScene | ((ms: number) => PoseFrame['joints']), from: number, to: number) {
  for (let t = from; t < to; t += FRAME_MS) {
    const joints = typeof scene === 'function' ? scene(t) : scenePose(scene, t - from + 1_500, W, H);
    s = addPose(s, { at: t, joints });
    if (t % 1000 < FRAME_MS) s = tick(s, t);
  }
  return s;
}

describe('dance: standing, all of you', () => {
  test('a body standing front-on reads', () => {
    assert.ok('torso' in readStanding(frontPose(W, H)));
  });

  test('nobody, or only the top half, is noBody', () => {
    assert.deepEqual(readStanding({}), { hint: 'noBody' });
    const top = frontPose(W, H);
    delete top.leftKnee;
    delete top.rightKnee;
    delete top.leftAnkle;
    delete top.rightAnkle;
    assert.deepEqual(readStanding(top), { hint: 'noBody' });
  });

  test('sitting on the bed’s edge is not standing', () => {
    assert.deepEqual(readStanding(frontPose(W, H, { sitting: true })), { hint: 'notStanding' });
  });

  test('lying down (the body across the picture) is not standing', () => {
    const lying = Object.fromEntries(Object.entries(frontPose(W, H)).map(([k, p]) => [k, { ...p, x: p.y, y: p.x }]));
    assert.deepEqual(readStanding(lying), { hint: 'notStanding' });
  });
});

describe('dance: the clock', () => {
  test('ten seconds of dancing straight is met', () => {
    const s = run(start(10), 'dance', 0, 11_500);
    assert.equal(s.status, 'met');
    assert.equal(s.reps, 10);
  });

  test('standing still never counts', () => {
    const s = run(start(), 'danceStill', 0, 15_000);
    assert.equal(s.reps, 0);
    assert.equal(s.status, 'counting');
    assert.equal(s.hint, 'still');
  });

  test('arms only never counts, and he says the legs too', () => {
    const s = run(start(), 'danceArms', 0, 15_000);
    assert.equal(s.reps, 0);
    assert.equal(s.hint, 'legs');
  });

  test('sitting on the edge of the bed, arms going, never counts', () => {
    const s = run(start(), 'danceSitting', 0, 15_000);
    assert.equal(s.reps, 0);
    assert.equal(s.status, 'finding');
    assert.equal(s.hint, 'notStanding');
  });

  test('a shaken phone (the whole body jumping together) never counts', () => {
    const shaken = (ms: number) => {
      const dx = Math.sin(ms / 40) * 60;
      const dy = Math.cos(ms / 33) * 60;
      return Object.fromEntries(Object.entries(frontPose(W, H)).map(([k, p]) => [k, { ...p, x: p.x + dx, y: p.y + dy }]));
    };
    const s = run(start(), shaken, 0, 15_000);
    assert.equal(s.reps, 0);
  });

  test('stopping breaks the run: back to zero, said so', () => {
    let s = run(start(10), 'dance', 0, 6_000);
    assert.ok(s.reps >= 4, `danced ${s.reps}`);
    s = run(s, 'danceStill', 6_000, 6_000 + DANCE.breakMs + 1_000);
    assert.equal(s.reps, 0);
    assert.equal(s.miss, 'broke');
    s = run(s, 'dance', 9_000, 20_500);
    assert.equal(s.status, 'met', 'ten straight after the break');
  });

  test('a short stumble (under breakMs) keeps the run', () => {
    let s = run(start(10), 'dance', 0, 5_000);
    const before = s.reps;
    s = run(s, 'danceStill', 5_000, 5_500);
    assert.equal(s.reps, before);
  });

  test('walking out of the picture breaks it too, and the clock alone does it with no frames', () => {
    let s = run(start(10), 'dance', 0, 5_000);
    assert.ok(s.reps > 0);
    s = tick(s, 5_000 + DANCE.breakMs + 500);
    assert.equal(s.reps, 0);
    assert.equal(s.status, 'finding');
  });

  test('every camera starts from zero: seconds straight are never carried', () => {
    assert.equal(startPushups(0, 10, { exercise: 'dance', reps: 7 }).reps, 0);
  });

  test('times out with nobody there', () => {
    const s = tick(start(), DANCE.timeoutMs + 1);
    assert.equal(s.status, 'timedOut');
  });

  test('the tour ends met', () => {
    const s = run(start(10), 'danceTour', 0, 40_000);
    assert.equal(s.status, 'met');
  });
});
