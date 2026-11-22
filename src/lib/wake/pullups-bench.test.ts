/// <reference types="node" />

/**
 * Pull-ups (wake/pullups.ts) and the bench press (wake/bench.ts) on the travel machine (wake/travel.ts),
 * with pretend bodies (pose-demo.ts): the reps that count, the half reps and cheats that don't,
 * and the same again through camera trouble (jitter, dropped frames, a slow camera, mirrored,
 * a sideways picture). Real clips are in pullups-clips.test.ts.
 */
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { readBench } from './bench.ts';
import { benchPose, DEMO_BENCH_MS, DEMO_PULL_MS, hangPose, scenePose, type DemoScene } from './pose-demo.ts';
import { addPose, depthOf, startPushups, tick, type Exercise, type PoseFrame, type PushupsSession } from './pushups.ts';
import { readPullup } from './pullups.ts';

const W = 390;
const H = 844;
/** The bench press is filmed with the phone on its side: the picture is the long way across. */
const BW = 844;
const BH = 390;

type Frames = (ms: number) => PoseFrame['joints'];

/** Feeds a body from 0 to `ms`, a frame every `frameMs`, ticking each second. `mess` changes each frame (or drops it: null). */
function run(
  exercise: Exercise,
  body: DemoScene | Frames,
  ms: number,
  { goal = 99, frameMs = 66, mess }: { goal?: number; frameMs?: number; mess?: (j: PoseFrame['joints'], i: number) => PoseFrame['joints'] | null } = {},
) {
  const [w, h] = exercise === 'bench' ? [BW, BH] : [W, H];
  let s: PushupsSession = startPushups(0, goal, { exercise });
  const misses: string[] = [];
  let i = 0;
  for (let t = 0; t < ms; t += frameMs, i++) {
    const raw = typeof body === 'function' ? body(t) : scenePose(body, t, w, h);
    const joints = mess ? mess(raw, i) : raw;
    if (joints) s = addPose(s, { at: t, joints });
    if (s.miss && misses.at(-1) !== s.miss) misses.push(s.miss);
    if (t % 1000 < frameMs) s = tick(s, t);
  }
  return { s, misses };
}

/** A seeded wobble, so a failure repeats. */
function rng(seed: number) {
  let x = seed;
  return () => ((x = (x * 1103515245 + 12345) % 2 ** 31) / 2 ** 31) * 2 - 1;
}
const jitter = (amount: number, seed = 7) => {
  const r = rng(seed);
  return (j: PoseFrame['joints']) => Object.fromEntries(Object.entries(j).map(([k, p]) => [k, { ...p, x: p.x + r() * amount, y: p.y + r() * amount }])) as PoseFrame['joints'];
};
const mirrorIn = (width: number) => (j: PoseFrame['joints']) => Object.fromEntries(Object.entries(j).map(([k, p]) => [k, { ...p, x: width - p.x }])) as PoseFrame['joints'];
const mirror = mirrorIn(W);
/** Lying on the back in bed, the phone at the foot: the same body turned on its side across the picture. */
const lyingDown = (j: PoseFrame['joints']) => Object.fromEntries(Object.entries(j).map(([k, p]) => [k, { ...p, x: p.y * 0.5, y: W - p.x }])) as PoseFrame['joints'];

const LEAD = 1_500;
const pulls = (n: number) => LEAD + DEMO_PULL_MS * n + 300;
const presses = (n: number) => LEAD + DEMO_BENCH_MS * n + 300;

describe('pull-ups: reading a frame', () => {
  test('a dead hang is rest, chin over the bar is the top', () => {
    const fresh = { arm: null, deepest: 0.85, hang: null, prev: null, speed: 0 };
    const hang = readPullup(hangPose(W, H, 0), fresh, 'none');
    assert.ok('atRest' in hang.reading && hang.reading.atRest);
    const top = readPullup(hangPose(W, H, 1), hang.mem, 'rest');
    assert.ok('atWork' in top.reading && top.reading.atWork && top.reading.cheat === null);
  });

  test('nobody, or a body standing with the arms down, is not a hang', () => {
    assert.deepEqual(readPullup({}, { arm: null, deepest: 0.85, hang: null, prev: null, speed: 0 }, 'none').reading, { hint: 'noBody' });
    // Standing under the bar, the arms down by the sides.
    const standing = hangPose(W, H, 0);
    for (const s of ['left', 'right'] as const) {
      standing[`${s}Elbow`] = { ...standing[`${s}Shoulder`]!, y: standing[`${s}Shoulder`]!.y + 120 };
      standing[`${s}Wrist`] = { ...standing[`${s}Shoulder`]!, y: standing[`${s}Shoulder`]!.y + 230 };
    }
    assert.deepEqual(readPullup(standing, { arm: null, deepest: 0.85, hang: null, prev: null, speed: 0 }, 'none').reading, { hint: 'notHanging' });
  });
});

describe('pull-ups: counting', () => {
  test('five good pull-ups count five, at the top of each', () => {
    const { s, misses } = run('pullups', 'pullups', pulls(5));
    assert.equal(s.reps, 5);
    assert.deepEqual(misses, []);
  });

  test('the goal met ends the set', () => {
    const { s } = run('pullups', 'pullups', pulls(6), { goal: 3 });
    assert.equal(s.status, 'met');
    assert.equal(s.reps, 3);
  });

  test('the count lands at the top, not on the way down', () => {
    // Half a rep in: up at the bar, not yet back down.
    const { s } = run('pullups', 'pullups', LEAD + DEMO_PULL_MS * 0.6);
    assert.equal(s.reps, 1);
  });

  test('a wide grip counts too', () => {
    const { s } = run('pullups', (t) => (t < LEAD ? {} : hangPose(W, H, 0.5 - 0.5 * Math.cos(((t - LEAD) / DEMO_PULL_MS) * 2 * Math.PI), { grip: 2.2 })), pulls(4));
    assert.equal(s.reps, 4);
  });

  test('a dead hang alone counts nothing', () => {
    assert.equal(run('pullups', 'pullHang', 20_000).s.reps, 0);
  });

  test('half pull-ups count nothing, and he says so', () => {
    const { s, misses } = run('pullups', 'pullHalf', pulls(5));
    assert.equal(s.reps, 0);
    assert.ok(misses.includes('shallow'));
  });

  test('air pull-downs (the hands move, not the body) count nothing', () => {
    // The shoulders never get up to where the hands hung, so it reads as never reaching the bar.
    const { s, misses } = run('pullups', 'pullAir', pulls(5));
    assert.equal(s.reps, 0);
    assert.ok(misses.every((m) => m === 'bar' || m === 'shallow'), misses.join());
  });

  test('squatting under the bar (feet on the floor) counts nothing', () => {
    const { s, misses } = run('pullups', 'pullSquat', pulls(5));
    assert.equal(s.reps, 0);
    assert.deepEqual(misses, ['feet']);
  });

  test('pumping the arms lying in bed counts nothing', () => {
    const r1 = run('pullups', (t) => lyingDown(scenePose('pullAir', t, W, H)), pulls(5));
    const r2 = run('pullups', (t) => lyingDown(scenePose('pullups', t, W, H)), pulls(5));
    assert.equal(r1.s.reps, 0);
    assert.equal(r2.s.reps, 0);
  });

  test('bouncing at the top without hanging again is one rep, then "arms straight first"', () => {
    // Up, then between 0.45 and 1 of the way: never back to the hang.
    const bounce: Frames = (t) => {
      if (t < LEAD) return {};
      const u = t - LEAD;
      if (u < DEMO_PULL_MS / 2) return hangPose(W, H, 0.5 - 0.5 * Math.cos((u / DEMO_PULL_MS) * 2 * Math.PI));
      return hangPose(W, H, 0.72 + 0.28 * Math.cos(((u - DEMO_PULL_MS / 2) / 1_200) * 2 * Math.PI));
    };
    const { s, misses } = run('pullups', bounce, 12_000);
    assert.equal(s.reps, 1);
    assert.ok(misses.includes('rest'));
  });

  test('the tour: only its good reps count', () => {
    // Air pull-downs, a hang, 2 good, 2 half, 2 under the bar, then good to the end.
    const { s } = run('pullups', 'pullTour', 2_000 + 2 * DEMO_PULL_MS + 2_500 + 6 * DEMO_PULL_MS + 3 * DEMO_PULL_MS + 400);
    assert.equal(s.reps, 5);
  });

  test('the meter: 0 hanging, 1 at the bar', () => {
    let s = startPushups(0, 10, { exercise: 'pullups' });
    s = addPose(s, { at: 0, joints: hangPose(W, H, 0) });
    s = addPose(s, { at: 66, joints: hangPose(W, H, 0) });
    assert.ok(depthOf(s) < 0.1);
    s = addPose(s, { at: 132, joints: hangPose(W, H, 1) });
    assert.ok(depthOf(s) > 0.95);
  });

  for (const [name, opts] of [
    ['jitter of 2% of the picture', { mess: jitter(W * 0.02) }],
    ['jitter of 3.5%', { mess: jitter(W * 0.035, 3) }],
    ['a fifth of frames dropped', { mess: (j: PoseFrame['joints'], i: number) => (i % 5 === 2 ? null : j) }],
    ['two in five dropped', { mess: (j: PoseFrame['joints'], i: number) => (i % 5 === 1 || i % 5 === 3 ? null : j) }],
    ['a slow camera, 8 a second', { frameMs: 125 }],
    ['mirrored', { mess: mirror }],
  ] as const) {
    test(`five good pull-ups through ${name} count five; cheats still nothing`, () => {
      assert.equal(run('pullups', 'pullups', pulls(5), opts).s.reps, 5);
      assert.equal(run('pullups', 'pullHalf', pulls(5), opts).s.reps, 0);
      assert.equal(run('pullups', 'pullAir', pulls(5), opts).s.reps, 0);
      assert.equal(run('pullups', 'pullSquat', pulls(5), opts).s.reps, 0);
    });
  }

  test('lost mid-set, the reps stay, and it carries on', () => {
    const gap: Frames = (t) => (t > LEAD + DEMO_PULL_MS * 2 && t < LEAD + DEMO_PULL_MS * 3 ? {} : scenePose('pullups', t, W, H));
    const { s } = run('pullups', gap, pulls(5));
    assert.equal(s.reps, 4);
  });

  test('a sideways picture (the hang across the screen) is not a hang', () => {
    const turned = (j: PoseFrame['joints']) => Object.fromEntries(Object.entries(j).map(([k, p]) => [k, { ...p, x: p.y, y: p.x }])) as PoseFrame['joints'];
    assert.equal(run('pullups', (t) => turned(scenePose('pullups', t, W, H)), pulls(4)).s.reps, 0);
  });
});

describe('bench press: reading a frame', () => {
  test('locked out is rest; the bar on the chest is work, and fair on a bench', () => {
    const top = readBench(benchPose(BW, BH, 0), { top: null, feet: null }, 'none');
    assert.ok('atRest' in top.reading && top.reading.atRest);
    const chest = readBench(benchPose(BW, BH, 1), top.mem, 'going');
    assert.ok('atWork' in chest.reading && chest.reading.atWork && chest.reading.cheat === null);
  });

  test('the same press lying flat, legs out, is a bed', () => {
    const top = readBench(benchPose(BW, BH, 0, { bed: true }), { top: null, feet: null }, 'none');
    const chest = readBench(benchPose(BW, BH, 1, { bed: true }), top.mem, 'going');
    assert.ok('cheat' in chest.reading && chest.reading.cheat === 'bed');
  });

  test('the feet out of the picture says so', () => {
    const j = benchPose(BW, BH, 0);
    for (const k of ['leftAnkle', 'rightAnkle', 'leftKnee', 'rightKnee'] as const) delete j[k];
    assert.deepEqual(readBench(j, { top: null, feet: null }, 'none').reading, { hint: 'noFeet' });
  });

  test('sitting or standing up (a shoulder press) is not the bench', () => {
    // The lying body stood on its end: the torso upright.
    const j = benchPose(BW, BH, 0);
    const up = Object.fromEntries(Object.entries(j).map(([k, p]) => [k, { ...p, x: p.y, y: BW - p.x }])) as PoseFrame['joints'];
    assert.deepEqual(readBench(up, { top: null, feet: null }, 'none').reading, { hint: 'notBench' });
  });
});

describe('bench press: counting', () => {
  test('five good presses count five, at the lockout', () => {
    const { s, misses } = run('bench', 'bench', presses(5));
    assert.equal(s.reps, 5);
    assert.deepEqual(misses, []);
  });

  test('the count lands at the lockout, not on the chest', () => {
    assert.equal(run('bench', 'bench', LEAD + DEMO_BENCH_MS * 0.55).s.reps, 0);
    assert.equal(run('bench', 'bench', LEAD + DEMO_BENCH_MS * 0.95).s.reps, 1);
  });

  test('half reps count nothing, and he says so', () => {
    const { s, misses } = run('bench', 'benchHalf', presses(6));
    assert.equal(s.reps, 0);
    assert.ok(misses.includes('shallow'));
  });

  test('holding the bar locked out counts nothing', () => {
    assert.equal(run('bench', 'benchHold', presses(6)).s.reps, 0);
  });

  test('pressing air in bed counts nothing: "feet on the floor"', () => {
    const { s, misses } = run('bench', 'benchBed', presses(5));
    assert.equal(s.reps, 0);
    assert.deepEqual(misses, ['bed']);
  });

  test('push-ups (lying, the arms pointing down) count nothing', () => {
    const flipped: Frames = (t) => {
      const j = scenePose('bench', t, BW, BH);
      if (!j.leftShoulder) return j;
      const sy = j.leftShoulder.y;
      return Object.fromEntries(Object.entries(j).map(([k, p]) => [k, k.includes('Elbow') || k.includes('Wrist') ? { ...p, y: 2 * sy - p.y } : p])) as PoseFrame['joints'];
    };
    assert.equal(run('bench', flipped, presses(5)).s.reps, 0);
  });

  test('moving the phone closer mid-set keeps counting (the lockout is relearned)', () => {
    const closer: Frames = (t) => {
      const k = 1 + Math.min(0.3, Math.max(0, (t - 4_000) / 8_000));
      const j = scenePose('bench', t, BW, BH);
      return Object.fromEntries(Object.entries(j).map(([n, p]) => [n, { ...p, x: BW / 2 + (p.x - BW / 2) * k, y: BH * 0.8 - (BH * 0.8 - p.y) * k }])) as PoseFrame['joints'];
    };
    assert.equal(run('bench', closer, presses(6)).s.reps, 6);
  });

  test('lost at the chest, back at the lockout soon after: that rep counts', () => {
    const gap: Frames = (t) => {
      const into = (t - LEAD) % DEMO_BENCH_MS;
      return t > LEAD + DEMO_BENCH_MS && t < LEAD + 2 * DEMO_BENCH_MS && into > DEMO_BENCH_MS * 0.45 && into < DEMO_BENCH_MS * 0.7 ? {} : scenePose('bench', t, BW, BH);
    };
    assert.equal(run('bench', gap, presses(3)).s.reps, 3);
  });

  test('the tour: only its good presses count', () => {
    const { s } = run('bench', 'benchTour', 2_000 + 2 * DEMO_BENCH_MS + 2_500 + 2 * DEMO_BENCH_MS + 2 * DEMO_BENCH_MS + 3 * DEMO_BENCH_MS + 400);
    assert.equal(s.reps, 2 + 3);
  });

  for (const [name, opts] of [
    ['jitter of 2% of the picture', { mess: jitter(W * 0.02) }],
    ['jitter of 3.5%', { mess: jitter(W * 0.035, 3) }],
    ['a fifth of frames dropped', { mess: (j: PoseFrame['joints'], i: number) => (i % 5 === 2 ? null : j) }],
    ['two in five dropped', { mess: (j: PoseFrame['joints'], i: number) => (i % 5 === 1 || i % 5 === 3 ? null : j) }],
    ['a slow camera, 8 a second', { frameMs: 125 }],
    ['mirrored (the head to the right)', { mess: mirrorIn(BW) }],
  ] as const) {
    test(`five presses through ${name} count five; half reps, holding and the bed nothing`, () => {
      assert.equal(run('bench', 'bench', presses(5), opts).s.reps, 5);
      assert.equal(run('bench', 'benchHalf', presses(5), opts).s.reps, 0);
      assert.equal(run('bench', 'benchHold', presses(5), opts).s.reps, 0);
      assert.equal(run('bench', 'benchBed', presses(5), opts).s.reps, 0);
    });
  }
});

describe('his lines', async () => {
  const { pullupsLine, benchLine } = await import('./lines.ts');
  const statuses = ['idle', 'finding', 'counting', 'met', 'timedOut'] as const;
  const misses = [null, 'shallow', 'quick', 'rest', 'bar', 'feet', 'bed'] as const;
  const hints = [null, 'noBody', 'notHanging', 'noFeet', 'notStanding', 'notBench'] as const;
  for (const [name, line] of [['pull-ups', pullupsLine], ['bench press', benchLine]] as const) {
    test(`every ${name} line fits the camera's one-line bubble`, () => {
      for (const status of statuses)
        for (const miss of misses)
          for (const hint of hints)
            for (const [reps, goal] of [[0, 5], [1, 5], [2, 30], [4, 5], [14, 15]]) {
              const said = line(status, reps, goal, miss, hint).replace(/\*/g, '');
              assert.ok(said.length <= 42, `${status}/${miss}/${hint}: "${said}"`);
              if (status === 'counting') assert.ok(said.length <= 33, `"${said}"`);
            }
    });
  }
});
