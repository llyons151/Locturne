/// <reference types="node" />

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';

import { pushupsLine, spokenRep } from './lines.ts';
import { phoneHint } from './phone-hint.ts';
import { DEMO_REP_MS, demoPose, plankPose, scenePose, type DemoScene } from './pose-demo.ts';
import {
  addPose,
  angleAt,
  depthOf,
  PUSHUPS,
  readFrame,
  repProgress,
  startPushups,
  tick,
  type Joint,
  type JointPoint,
  type PoseFrame,
  type PushupsSession,
} from './pushups.ts';

const W = 390;
const H = 844;
const FRAME_MS = 66;

/** Feeds `pose` from `from` to `to` ms, a frame every `FRAME_MS`. */
function run(s: PushupsSession, from: number, to: number, pose = (ms: number) => demoPose(ms, W, H)) {
  for (let t = from; t < to; t += FRAME_MS) s = addPose(s, { at: t, joints: pose(t) });
  return s;
}

const p = (x: number, y: number, c = 0.9): JointPoint => ({ x, y, c });
const BODY = { upper: 80, fore: 76, wrist: { x: 200, y: 500 }, ankle: { x: 520, y: 490 } };

/** A side-on plank with the elbow at `deg`, moving as a real body does (pose-demo.ts). */
const plankAt = (deg: number) => plankPose(deg, BODY);

/** The same, with the whole body shifted down `drop` torsos from where the top would be: a bend with a chosen dip of the shoulders. */
function plankDropped(deg: number, drop: number): PoseFrame['joints'] {
  const top = plankAt(165);
  const torso = Math.hypot(top.leftHip!.x - top.leftShoulder!.x, top.leftHip!.y - top.leftShoulder!.y);
  const joints = plankAt(deg);
  const shift = top.leftShoulder!.y + drop * torso - joints.leftShoulder!.y;
  return Object.fromEntries(Object.entries(joints).map(([k, v]) => [k, { ...v, y: v.y + shift }]));
}

/** Frames at `deg` (or `[deg, drop]`), one every `FRAME_MS` from `at`. */
function feed(s: PushupsSession, at: number, steps: (number | [number, number])[]) {
  steps.forEach((step, i) => {
    const joints = Array.isArray(step) ? plankDropped(step[0], step[1]) : plankAt(step);
    s = addPose(s, { at: at + i * FRAME_MS, joints });
  });
  return s;
}

/** A full rep at a normal pace: down to 60°, a beat at the bottom, back up. */
const REP = [165, 150, 130, 110, 90, 70, 60, 60, 60, 75, 95, 115, 135, 155, 165];

describe('angleAt', () => {
  test('reads a right angle and a straight line', () => {
    assert.equal(Math.round(angleAt(p(0, 0), p(0, 10), p(10, 10))), 90);
    assert.equal(Math.round(angleAt(p(0, 0), p(10, 0), p(20, 0))), 180);
  });

  test('the plank helper bends the elbow to the angle asked', () => {
    for (const deg of [60, 100, 150, 170]) {
      const read = readFrame(plankAt(deg));
      assert.ok('elbow' in read);
      assert.ok(Math.abs(read.elbow - deg) < 0.5, `${deg} read as ${read.elbow}`);
    }
  });
});

describe('readFrame', () => {
  test('nobody: no joints, or joints too unsure', () => {
    assert.deepEqual(readFrame({}), { hint: 'noBody' });
    const unsure = Object.fromEntries(Object.entries(plankAt(160)).map(([k, v]) => [k, { ...v, c: 0.1 }]));
    assert.deepEqual(readFrame(unsure), { hint: 'noBody' });
  });

  test('standing curls are not a plank', () => {
    const joints = plankAt(90);
    const standing = { ...joints, leftHip: p(joints.leftShoulder!.x, joints.leftShoulder!.y + 200) };
    assert.deepEqual(readFrame(standing), { hint: 'notPlank' });
  });

  test('arm pumps lying on your back are not a plank: hands above the shoulders', () => {
    const joints = plankAt(120);
    const shoulder = joints.leftShoulder!;
    const onBack = { ...joints, leftWrist: p(shoulder.x, shoulder.y - 150), leftElbow: p(shoulder.x + 40, shoulder.y - 70) };
    assert.deepEqual(readFrame(onBack), { hint: 'notPlank' });
  });

  test('an arm no body has (the dark room folding it up) is unreadable, not a reading', () => {
    const joints = plankAt(160);
    const s = joints.leftShoulder!;
    const folded = { ...joints, leftElbow: p(s.x + 4, s.y + 4), leftWrist: p(s.x + 6, s.y + 10) };
    assert.deepEqual(readFrame(folded), { hint: 'noBody' });
  });

  test('takes whichever side the camera sees best', () => {
    const left = plankAt(160);
    const right = Object.fromEntries(Object.entries(plankAt(90)).map(([k, v]) => [k.replace('left', 'right'), { ...v, c: 0.95 }]));
    const read = readFrame({ ...left, ...right });
    assert.ok('elbow' in read && Math.abs(read.elbow - 90) < 0.5);
  });
});

describe('push-up session', () => {
  test('starts looking for a body', () => {
    const s = startPushups(0, 12);
    assert.equal(s.status, 'finding');
    assert.equal(s.hint, 'noBody');
    assert.equal(s.goal, 12);
  });

  test('the demo body does one rep per cycle and meets the goal', () => {
    let s = startPushups(0, 3);
    s = run(s, 0, DEMO_REP_MS * 2.5);
    assert.equal(s.reps, 2);
    assert.equal(s.status, 'counting');
    s = run(s, DEMO_REP_MS * 2.5, DEMO_REP_MS * 4);
    assert.equal(s.reps, 3);
    assert.equal(s.status, 'met');
    assert.ok(s.metAt !== null);
    // Over is over: more frames change nothing.
    assert.equal(run(s, DEMO_REP_MS * 4, DEMO_REP_MS * 6), s);
  });

  test('a normal rep counts once', () => {
    let s = feed(startPushups(0), 0, [165, 165, ...REP]);
    assert.equal(s.reps, 1);
    s = feed(s, 2000, [165, 165, 165]);
    assert.equal(s.reps, 1);
  });

  test('counting starts at the top of a plank, not partway down', () => {
    let s = feed(startPushups(0), 0, [120]);
    assert.equal(s.status, 'finding');
    s = feed(s, 100, [165]);
    assert.equal(s.status, 'counting');
  });

  test('a half rep is said, not counted', () => {
    const s = feed(startPushups(0), 0, [165, 165, [150, 0.05], [130, 0.2], [125, 0.3], [125, 0.3], [130, 0.2], 155, 165]);
    assert.equal(s.reps, 0);
    assert.equal(s.miss, 'shallow');
  });

  test('bent elbows with the shoulders barely moving count nothing and say nothing (camera jitter)', () => {
    const s = feed(startPushups(0), 0, [165, 165, [100, 0.05], [60, 0.05], [60, 0.05], [100, 0.05], 165, 165]);
    assert.equal(s.reps, 0);
    assert.equal(s.miss, null);
  });

  test('one frame at the bottom is a spike, not a rep', () => {
    const s = feed(startPushups(0), 0, [165, 165, [130, 0.3], [60, 0.7], [130, 0.3], 165, 165]);
    assert.equal(s.reps, 0);
  });

  test('a spike that straightens the arm mid-rep doesn’t restart the measure from halfway down', () => {
    const s = feed(startPushups(0), 0, [165, 165, [130, 0.25], [110, 0.35], [160, 0.35], [90, 0.55], [60, 0.7], [60, 0.7], [110, 0.4], 165]);
    assert.equal(s.reps, 1);
  });

  test('reps faster than minRepMs are refused as too quick', () => {
    const quick = [165, [90, 0.6], [60, 0.7], [60, 0.7], 165] as (number | [number, number])[];
    let s = feed(startPushups(0), 0, [165, 165]);
    s = feed(s, 200, quick);
    assert.equal(s.reps, 1);
    s = feed(s, 200 + 5 * FRAME_MS, quick.slice(1));
    assert.equal(s.reps, 1);
    assert.equal(s.miss, 'quick');
    s = feed(s, 2000, quick);
    assert.equal(s.reps, 2);
    assert.equal(s.miss, null);
  });

  test('a dropped frame or two mid-rep is ignored; a long gap loses the plank but keeps the reps', () => {
    let s = run(startPushups(0), 0, DEMO_REP_MS * 1.2);
    assert.equal(s.reps, 1);
    const at = DEMO_REP_MS * 1.2;
    s = addPose(s, { at, joints: {} });
    assert.equal(s.status, 'counting');
    s = addPose(s, { at: at + PUSHUPS.lostMs + 100, joints: {} });
    assert.equal(s.status, 'finding');
    assert.equal(s.hint, 'noBody');
    assert.equal(s.reps, 1);
    // Back in a plank: counting again from the top, the rep kept.
    s = run(s, at + PUSHUPS.lostMs + 200, at + PUSHUPS.lostMs + 200 + DEMO_REP_MS * 1.1);
    assert.equal(s.status, 'counting');
    assert.equal(s.reps, 2);
  });

  test('standing up mid-set says so', () => {
    let s = run(startPushups(0), 0, DEMO_REP_MS);
    const joints = plankAt(90);
    const standing = { ...joints, leftHip: p(joints.leftShoulder!.x, joints.leftShoulder!.y + 200), rightHip: undefined };
    s = addPose(s, { at: DEMO_REP_MS + PUSHUPS.lostMs + 10, joints: standing });
    assert.equal(s.status, 'finding');
    assert.equal(s.hint, 'notPlank');
  });

  test('a stalled camera loses the plank on the clock', () => {
    let s = run(startPushups(0), 0, 500);
    assert.equal(s.status, 'counting');
    s = tick(s, 500 + PUSHUPS.lostMs + 66);
    assert.equal(s.status, 'finding');
  });

  test('times out, but not before', () => {
    assert.equal(tick(startPushups(0), PUSHUPS.timeoutMs - 1).status, 'finding');
    assert.equal(tick(startPushups(0), PUSHUPS.timeoutMs).status, 'timedOut');
  });

  test('the goal is a whole number of at least one', () => {
    assert.equal(startPushups(0, 0).goal, 1);
    assert.equal(startPushups(0, 7.6).goal, 8);
  });

  test('progress and depth', () => {
    let s = startPushups(0, 4);
    assert.equal(repProgress(s), 0);
    assert.equal(depthOf(s), 0);
    s = { ...s, reps: 2, elbow: PUSHUPS.downDeg };
    assert.equal(repProgress(s), 0.5);
    assert.equal(depthOf(s), 1);
  });
});

/**
 * Real clips (2026-10-10, docs/PUSHUP_TESTS.md): YouTube videos run through MediaPipe's pose
 * model at 15 frames a second, the joints kept, the video not. The counts were checked by eye.
 */
describe('real clips', () => {
  type Clip = { reps: number; what: string; frames: number[][] };
  const data = JSON.parse(readFileSync(new URL('./fixtures/pushup-clips.json', import.meta.url), 'utf8')) as {
    joints: Joint[];
    clips: Record<string, Clip>;
  };
  const toFrame = (row: number[]): PoseFrame => {
    const joints: PoseFrame['joints'] = {};
    data.joints.forEach((name, i) => {
      const [x, y, c] = row.slice(1 + i * 3, 4 + i * 3);
      if (c > 0) joints[name] = { x, y, c: c / 100 };
    });
    return { at: row[0], joints };
  };

  for (const [name, clip] of Object.entries(data.clips)) {
    test(`${clip.what}: ${clip.reps} reps`, () => {
      let s = startPushups(0, 1000);
      for (const row of clip.frames) {
        const frame = toFrame(row);
        s = tick(addPose(s, frame), frame.at);
      }
      assert.equal(s.reps, clip.reps, name);
    });

    test(`${clip.what}: the same at half the frame rate`, () => {
      let s = startPushups(0, 1000);
      clip.frames.forEach((row, i) => {
        if (i % 2) return;
        const frame = toFrame(row);
        s = tick(addPose(s, frame), frame.at);
      });
      assert.equal(s.reps, clip.reps, name);
    });

    test(`${clip.what}: the same facing the other way`, () => {
      let s = startPushups(0, 1000);
      for (const row of clip.frames) {
        const frame = toFrame(row);
        const mirrored = Object.fromEntries(Object.entries(frame.joints).map(([k, v]) => [k, { ...v, x: 2000 - v.x }]));
        s = tick(addPose(s, { at: frame.at, joints: mirrored }), frame.at);
      }
      assert.equal(s.reps, clip.reps, name);
    });
  }
});

describe('phone hint', () => {
  test('upright, or leaning back a little, is fine', () => {
    assert.equal(phoneHint({ x: 0, y: -1, z: 0 }), null);
    assert.equal(phoneHint({ x: 0, y: -0.85, z: -0.5 }), null);
    assert.equal(phoneHint({ x: 0.3, y: -0.95, z: 0 }), null);
  });

  test('flat on the floor, either way up', () => {
    assert.equal(phoneHint({ x: 0, y: 0, z: -1 }), 'flat');
    assert.equal(phoneHint({ x: 0, y: -0.5, z: -0.86 }), 'flat');
    assert.equal(phoneHint({ x: 0, y: 0, z: 1 }), 'flat');
  });

  test('on its side, or upside down', () => {
    assert.equal(phoneHint({ x: 1, y: 0, z: 0 }), 'sideways');
    assert.equal(phoneHint({ x: -0.9, y: -0.3, z: -0.2 }), 'sideways');
    assert.equal(phoneHint({ x: 0, y: 1, z: 0 }), 'upsideDown');
  });

  test('mid-throw or shaken: no opinion', () => {
    assert.equal(phoneHint({ x: 0, y: 0, z: 0.1 }), null);
    assert.equal(phoneHint({ x: 2, y: 1, z: 0 }), null);
  });
});

describe('push-up lines', () => {
  test('says why a rep missed first', () => {
    assert.equal(pushupsLine('counting', 3, 10, 'shallow'), 'That was a nod. Lower.');
    assert.equal(pushupsLine('counting', 0, 10, null), 'Arms straight. Now go down.');
    assert.equal(pushupsLine('finding', 0, 10, null, 'notPlank'), "On the floor. I don't count standing.");
    assert.equal(pushupsLine('finding', 4, 10, null, 'noBody'), 'Where did you go. Come back.');
  });

  test('the same rep gets the same line, and the end is near', () => {
    assert.equal(pushupsLine('counting', 2, 10, null), pushupsLine('counting', 2, 10, null));
    assert.notEqual(pushupsLine('counting', 2, 10, null), pushupsLine('counting', 3, 10, null));
    assert.match(pushupsLine('counting', 9, 10, null), /Almost/);
  });

  test('the spoken count', () => {
    assert.equal(spokenRep(3, 10), '3');
    assert.equal(spokenRep(10, 10), "10. Fine. I'm up.");
  });

  test('every state has a short line', () => {
    for (const s of ['idle', 'finding', 'counting', 'met', 'timedOut'] as const)
      for (const m of [null, 'shallow', 'quick'] as const) {
        const line = pushupsLine(s, 5, 10, m);
        assert.ok(line.length > 0 && line.length <= 44, `${s}/${m}: ${line}`);
      }
  });
});

describe('the wake lab preview scenes (pose-demo.ts scenePose)', () => {
  /** Plays `scene` for up to 40 s, or until the set is met, and lists what the screen would have shown. */
  function play(scene: DemoScene) {
    let s = startPushups(0, 10);
    const shown = new Set<string>();
    for (let t = 0; t < 40_000 && s.status !== 'met'; t += FRAME_MS) {
      s = tick(addPose(s, { at: t, joints: scenePose(scene, t, W, H) }), t);
      shown.add(s.status);
      if (s.hint) shown.add(s.hint);
      if (s.miss) shown.add(s.miss);
    }
    return { reps: s.reps, shown };
  }

  test('good reps finish the set', () => assert.equal(play('pushups').reps, 10));
  test('half reps never count, and say so', () => {
    const { reps, shown } = play('shallow');
    assert.equal(reps, 0);
    assert.ok(shown.has('shallow'));
  });
  test('too quick says so', () => assert.ok(play('quick').shown.has('quick')));
  test('a plank hold counts nothing', () => {
    const { reps, shown } = play('hold');
    assert.equal(reps, 0);
    assert.ok(shown.has('counting'));
  });
  test('standing curls read as not a plank', () => {
    const { reps, shown } = play('standing');
    assert.equal(reps, 0);
    assert.ok(shown.has('notPlank'));
  });
  test('nobody is nobody', () => assert.deepEqual([...play('nobody').shown], ['finding', 'noBody']));
  test('the tour shows every state and still finishes', () => {
    const { reps, shown } = play('tour');
    assert.equal(reps, 10);
    for (const state of ['noBody', 'notPlank', 'counting', 'shallow', 'quick', 'met']) assert.ok(shown.has(state), state);
  });
});
