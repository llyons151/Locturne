/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { squatsLine } from './lines.ts';
import { addPose, depthOf, startPushups, tick, type JointPoint, type PoseFrame, type PushupsSession } from './pushups.ts';
import { readSquatFrame, SQUATS } from './squats.ts';

const FRAME_MS = 66;
const LEG = { shin: 90, thigh: 90, torso: 110 };
const ANKLE = { x: 200, y: 700 };
const DEG = Math.PI / 180;

const p = (x: number, y: number, c = 0.9): JointPoint => ({ x, y, c });

/**
 * A side-on squat with the knee at `deg`, facing right, as a real body bends: the shins tip
 * forward, the thighs back, the torso leans a little. 180 is standing straight.
 */
function squatAt(deg: number, { lying = false, legsOut = false } = {}): PoseFrame['joints'] {
  const flex = 180 - deg;
  const shinTilt = (legsOut ? 90 : flex * 0.4) * DEG;
  const thighTilt = flex * 0.6 * DEG;
  const lean = flex * 0.35 * DEG;
  const knee = { x: ANKLE.x + LEG.shin * Math.sin(shinTilt), y: ANKLE.y - LEG.shin * Math.cos(shinTilt) };
  const hip = { x: knee.x - LEG.thigh * Math.sin(thighTilt + (legsOut ? -90 * DEG : 0)), y: knee.y - LEG.thigh * Math.cos(thighTilt + (legsOut ? -90 * DEG : 0)) };
  const shoulder = { x: hip.x + LEG.torso * Math.sin(lean), y: hip.y - LEG.torso * Math.cos(lean) };
  const body = { leftAnkle: ANKLE, leftKnee: knee, leftHip: hip, leftShoulder: shoulder };
  // Lying on your back: the whole body turned a quarter, so the torso is flat.
  const turn = (pt: { x: number; y: number }) => (lying ? { x: ANKLE.x + (ANKLE.y - pt.y), y: ANKLE.y - (pt.x - ANKLE.x) * 0.2 } : pt);
  return Object.fromEntries(Object.entries(body).map(([k, v]) => [k, p(turn(v).x, turn(v).y)]));
}

/** Frames at each knee angle, one every `FRAME_MS` from `at`. */
function feed(s: PushupsSession, at: number, degs: number[], how?: { lying?: boolean; legsOut?: boolean }) {
  degs.forEach((deg, i) => {
    s = addPose(s, { at: at + i * FRAME_MS, joints: squatAt(deg, how) });
  });
  return s;
}

/** One squat at a normal pace: down to 90°, a beat at the bottom, back up. */
const REP = [175, 165, 150, 135, 120, 105, 95, 90, 90, 90, 100, 115, 130, 145, 160, 175];
const START = (goal = 20) => startPushups(0, goal, { exercise: 'squats' });

describe('readSquatFrame', () => {
  test('reads the knee angle the helper bends to, the hips and the thigh', () => {
    for (const deg of [90, 120, 150, 175]) {
      const read = readSquatFrame(squatAt(deg));
      assert.ok('angle' in read, `${deg}: ${JSON.stringify(read)}`);
      assert.ok(Math.abs(read.angle - deg) < 0.5, `${deg} read as ${read.angle}`);
      assert.ok(Math.abs(read.scale - LEG.thigh) < 0.5);
    }
  });

  test('nobody, or a leg the camera is unsure of, is no body', () => {
    assert.deepEqual(readSquatFrame({}), { hint: 'noBody' });
    const unsure = Object.fromEntries(Object.entries(squatAt(175)).map(([k, v]) => [k, { ...v!, c: 0.1 }]));
    assert.deepEqual(readSquatFrame(unsure), { hint: 'noBody' });
  });

  test('lying on your back, or sitting up with the legs out, is not standing', () => {
    assert.deepEqual(readSquatFrame(squatAt(120, { lying: true })), { hint: 'notStanding' });
    assert.deepEqual(readSquatFrame(squatAt(175, { legsOut: true })), { hint: 'notStanding' });
  });
});

describe('a squat session', () => {
  test('is a squat session, with its own default timeout', () => {
    const s = START();
    assert.equal(s.exercise, 'squats');
    assert.equal(s.timeoutMs, SQUATS.timeoutMs);
    assert.equal(startPushups(0).exercise, 'pushups');
  });

  test('counts a full squat, once', () => {
    const s = feed(START(), 0, [175, 175, ...REP]);
    assert.equal(s.reps, 1);
    assert.equal(s.status, 'counting');
  });

  test('twenty squats meet a goal of twenty', () => {
    const steps = [175, 175, ...Array.from({ length: 20 }, () => REP).flat()];
    const s = feed(START(20), 0, steps);
    assert.equal(s.reps, 20);
    assert.equal(s.status, 'met');
  });

  test('a half squat is no rep, and says so', () => {
    const s = feed(START(), 0, [175, 175, 160, 145, 132, 130, 130, 132, 145, 160, 175]);
    assert.equal(s.reps, 0);
    assert.equal(s.miss, 'shallow');
  });

  test('one frame at the bottom is the camera, not a squat', () => {
    const s = feed(START(), 0, [175, 175, 175, 90, 175, 175, 175]);
    assert.equal(s.reps, 0);
  });

  test('knees pumped lying down count nothing', () => {
    const s = feed(START(), 0, [175, 175, ...REP, ...REP], { lying: true });
    assert.equal(s.reps, 0);
    assert.equal(s.hint, 'notStanding');
  });

  test('the meter reads how far down the squat is', () => {
    const top = feed(START(), 0, [175, 175]);
    assert.equal(depthOf(top), 0);
    const bottom = feed(top, 200, [150, 120, 100]);
    assert.equal(depthOf(bottom), 1);
  });

  test('nobody standing for ten minutes times out, with the reps done kept', () => {
    let s = feed(START(), 0, [175, 175, ...REP]);
    s = tick(s, s.now + SQUATS.timeoutMs + 1_000);
    assert.equal(s.status, 'timedOut');
    assert.equal(startPushups(0, 20, { exercise: 'squats', reps: s.reps }).reps, 1);
  });
});

describe('squatsLine', () => {
  test('asks you to stand when you are lying down, and counts in his voice', () => {
    assert.equal(squatsLine('finding', 0, 20, null, 'notStanding'), "Stand up. I don't count lying down.");
    assert.equal(squatsLine('counting', 0, 20, 'shallow'), 'That was a curtsy. Lower.');
    assert.equal(squatsLine('met', 20, 20, null), "I'm up. Don't talk to me yet.");
    assert.ok(squatsLine('timedOut', 0, 20, null).includes('squats'));
  });
});
