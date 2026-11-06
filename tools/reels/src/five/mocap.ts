// Plays CMU motion capture retargeted onto the rig (see tools/reels/mocap/). Each clip is 60 fps
// rig angles plus hip travel. A mocap drive plays a clip across a key segment, either moving the
// body along the segment's path (time-compressed travel, like the gaits) or in place.
import type { Drive } from './gait';
import { lerpPose, type Pose } from './rig';
import run from '../mocap/run.json';
import runStart from '../mocap/runStart.json';
import walk from '../mocap/walk.json';
import zombie from '../mocap/zombie.json';
import stretch from '../mocap/stretch.json';
import standUp from '../mocap/standUp.json';

type Frame = { x: number; y: number; z: number; ry: number; pose: Pose };
export type Clip = { fps: number; loop: boolean; frames: Frame[] };

export const CLIPS = {
  run: run as unknown as Clip,
  runStart: runStart as unknown as Clip,
  walk: walk as unknown as Clip,
  zombie: zombie as unknown as Clip,
  stretch: stretch as unknown as Clip,
  standUp: standUp as unknown as Clip,
};

export const clipLength = (c: Clip) => c.frames.length / c.fps;

// pose + hip offset at clip time s (looping clips wrap and keep travelling)
export function clipAt(c: Clip, s: number): Frame {
  const n = c.frames.length;
  let f = s * c.fps;
  let laps = 0;
  if (c.loop) {
    laps = Math.floor(f / n);
    f -= laps * n;
  } else f = Math.max(0, Math.min(n - 1.001, f));
  const i = Math.floor(f);
  const k = f - i;
  const A = c.frames[i];
  const B = c.frames[(i + 1) % n];
  const lap = c.frames[n - 1].x;
  return {
    x: A.x + (B.x - A.x) * k + laps * lap,
    y: A.y + (B.y - A.y) * k,
    z: A.z + (B.z - A.z) * k,
    ry: A.ry + (B.ry - A.ry) * k,
    pose: lerpPose(A.pose, B.pose, k),
  };
}

type Opts = {
  from?: number; // clip time at the segment start
  rate?: number; // clip seconds per real second
  travel?: 'path' | 'none';
  edit?: (p: Pose) => Pose; // e.g. hold a phone
  yOffset?: number;
};

export function mocap(c: Clip, o: Opts = {}): Drive {
  const { from = 0, rate = 1, travel = 'path', edit, yOffset = 0 } = o;
  return (t, t0, t1, a, b) => {
    const s = from + (t - t0) * rate;
    const f = clipAt(c, s);
    const k = Math.min(1, Math.max(0, (t - t0) / (t1 - t0)));
    const pos: [number, number, number] =
      travel === 'path' ? [a[0] + (b[0] - a[0]) * k, f.y + yOffset, a[2] + (b[2] - a[2]) * k] : [a[0], f.y + yOffset, a[2]];
    return { pos, ry: 0, rz: 0, pose: edit ? edit(f.pose) : f.pose };
  };
}
