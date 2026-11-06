// A jointed capsule stick figure, like the ones in the @neuronvisuals "5 minutes" reel.
// Body space: the figure faces +X, up is +Y, its right side is +Z. Every joint is an Euler
// rotation in degrees. Swinging a limb forward is +z; for arms, +x on the left arm and -x on the
// right arm raise it out to the side (see `side` below, which mirrors x for us).
import * as THREE from 'three';
import type { ReactNode } from 'react';

export type V3 = [number, number, number];
export type Pose = {
  spine: V3; // at the hips, tilts the whole torso
  neck: V3;
  lSh: V3;
  lEl: V3;
  rSh: V3;
  rEl: V3;
  lHip: V3;
  lKnee: V3;
  rHip: V3;
  rKnee: V3;
};

export const REST: Pose = {
  spine: [0, 0, 0],
  neck: [0, 0, 0],
  lSh: [0, 0, 0],
  lEl: [0, 0, 0],
  rSh: [0, 0, 0],
  rEl: [0, 0, 0],
  lHip: [0, 0, 0],
  lKnee: [0, 0, 0],
  rHip: [0, 0, 0],
  rKnee: [0, 0, 0],
};

export const SIZE = {
  torso: 0.56,
  neck: 0.1,
  head: 0.16,
  upperArm: 0.3,
  foreArm: 0.29,
  thigh: 0.43,
  shin: 0.43,
  limbR: 0.048,
  torsoR: 0.07,
  hipW: 0.07,
  shW: 0.1,
  outline: 0.026,
};

const D = Math.PI / 180;
const rot = (v: V3): [number, number, number] => [v[0] * D, v[1] * D, v[2] * D];

const outlineMat = new THREE.MeshBasicMaterial({ color: '#0b0b0d', side: THREE.BackSide });
const geoCache = new Map<string, THREE.BufferGeometry>();
function capsule(r: number, len: number) {
  const k = `c${r}-${len}`;
  if (!geoCache.has(k)) {
    const g = new THREE.CapsuleGeometry(r, len, 6, 14);
    g.translate(0, -len / 2, 0); // hang from the joint
    geoCache.set(k, g);
  }
  return geoCache.get(k)!;
}
function sphere(r: number) {
  const k = `s${r}`;
  if (!geoCache.has(k)) geoCache.set(k, new THREE.SphereGeometry(r, 24, 16));
  return geoCache.get(k)!;
}

function Limb({ len, r, mat, up }: { len: number; r: number; mat: THREE.Material; up?: boolean }) {
  const o = SIZE.outline;
  return (
    <group rotation={up ? [0, 0, Math.PI] : [0, 0, 0]}>
      <mesh geometry={capsule(r, len)} material={mat} castShadow />
      <mesh geometry={capsule(r + o, len)} material={outlineMat} />
    </group>
  );
}

export type Parts = Partial<Record<'head' | 'torso' | 'lArm' | 'rArm' | 'lLeg' | 'rLeg', boolean>>;

export function StickFigure({
  pose,
  color = '#f2f2f2',
  emissive = 0.35,
  show = {},
  rightHand,
  head,
}: {
  pose: Pose;
  color?: string;
  emissive?: number;
  show?: Parts;
  rightHand?: ReactNode;
  head?: ReactNode;
}) {
  const mat = new THREE.MeshLambertMaterial({ color, emissive: new THREE.Color(color), emissiveIntensity: emissive });
  const vis = (k: keyof Parts) => show[k] !== false;
  const S = SIZE;
  const arm = (side: 1 | -1, sh: V3, el: V3, hand?: ReactNode) => (
    <group position={[0, S.torso - 0.04, side * S.shW]} rotation={rot([sh[0] * -side, sh[1], sh[2]])}>
      <Limb len={S.upperArm} r={S.limbR} mat={mat} />
      <group position={[0, -S.upperArm, 0]} rotation={rot([el[0] * -side, el[1], el[2]])}>
        <Limb len={S.foreArm} r={S.limbR} mat={mat} />
        <group position={[0, -S.foreArm - 0.02, 0]}>{hand}</group>
      </group>
    </group>
  );
  const leg = (side: 1 | -1, hip: V3, knee: V3) => (
    <group position={[0, 0, side * S.hipW]} rotation={rot([hip[0] * -side, hip[1], hip[2]])}>
      <Limb len={S.thigh} r={S.limbR + 0.004} mat={mat} />
      <group position={[0, -S.thigh, 0]} rotation={rot(knee)}>
        <Limb len={S.shin} r={S.limbR + 0.004} mat={mat} />
      </group>
    </group>
  );
  return (
    <group>
      {vis('lLeg') && leg(-1, pose.lHip, pose.lKnee)}
      {vis('rLeg') && leg(1, pose.rHip, pose.rKnee)}
      <group rotation={rot(pose.spine)}>
        {vis('torso') && <Limb len={S.torso} r={S.torsoR} mat={mat} up />}
        {vis('lArm') && arm(-1, pose.lSh, pose.lEl)}
        {vis('rArm') && arm(1, pose.rSh, pose.rEl, rightHand)}
        <group position={[0, S.torso + S.neck, 0]} rotation={rot(pose.neck)}>
          {vis('head') && (
            <group position={[0, S.head, 0]}>
              <mesh geometry={sphere(S.head)} material={mat} castShadow />
              <mesh geometry={sphere(S.head + S.outline * 1.4)} material={outlineMat} />
              {head}
            </group>
          )}
        </group>
      </group>
    </group>
  );
}

// ---------- poses and cycles ----------
const P = (p: Partial<Pose>): Pose => ({ ...REST, ...p });
const s = Math.sin;

export const POSES = {
  stand: P({ lSh: [6, 0, -4], rSh: [6, 0, 4], lEl: [0, 0, 8], rEl: [0, 0, 8] }),
  lieBack: P({ lSh: [8, 0, 0], rSh: [8, 0, 0] }),
  reachUp: P({ rSh: [0, 0, 150], rEl: [0, 0, 20], lSh: [8, 0, 0] }), // lying on back, arm up to the clock
  sitUp: P({ lHip: [0, 0, 90], rHip: [0, 0, 90], lSh: [0, 0, 30], rSh: [0, 0, 30], lEl: [0, 0, 30], rEl: [0, 0, 30] }),
  crouch: P({ spine: [0, 0, -35], lHip: [0, 0, 110], rHip: [0, 0, 95], lKnee: [0, 0, -130], rKnee: [0, 0, -120], lSh: [0, 0, 40], rSh: [0, 0, 50], lEl: [0, 0, 20], rEl: [0, 0, 20] }),
  plankUp: P({ lSh: [0, 0, 65], rSh: [0, 0, 65], lEl: [0, 0, 0], rEl: [0, 0, 0] }),
  plankDown: P({ lSh: [0, 0, 15], rSh: [0, 0, 15], lEl: [0, 0, 95], rEl: [0, 0, 95], neck: [0, 0, 10] }),
  grabBag: P({ spine: [0, 0, -10], rSh: [0, 0, 60], rEl: [0, 0, 30], lSh: [6, 0, -4] }),
  holdBag: P({ rSh: [12, 0, 2], rEl: [0, 0, 10], lSh: [6, 0, -4], lEl: [0, 0, 8] }),
  sniff: P({ neck: [-25, 0, -15], rSh: [150, 0, 0], rEl: [0, 0, 120], lSh: [6, 0, 0] }),
  slump: P({ spine: [0, 0, -8], neck: [0, 0, -12], lSh: [6, 0, -2], rSh: [6, 0, -2], lEl: [0, 0, 6], rEl: [0, 0, 6] }),
};

export function walk(t: number, speed = 1, slumped = false): Pose {
  const p = t * Math.PI * 2 * 1.05 * speed;
  const a = 26;
  return P({
    spine: [0, 0, slumped ? -14 : -3],
    neck: [0, 0, slumped ? -14 : 2],
    lHip: [0, 0, a * s(p)],
    rHip: [0, 0, -a * s(p)],
    lKnee: [0, 0, -Math.max(0, 40 * s(p - 1.3)) - 4],
    rKnee: [0, 0, -Math.max(0, 40 * s(p + Math.PI - 1.3)) - 4],
    lSh: [6, 0, -22 * s(p)],
    rSh: [6, 0, 22 * s(p)],
    lEl: [0, 0, 14],
    rEl: [0, 0, 14],
  });
}

export function run(t: number): Pose {
  const p = t * Math.PI * 2 * 1.7;
  return P({
    spine: [0, 0, -14],
    neck: [0, 0, 6],
    lHip: [0, 0, 20 + 45 * s(p)],
    rHip: [0, 0, 20 - 45 * s(p)],
    lKnee: [0, 0, -55 - 40 * s(p - 1.2)],
    rKnee: [0, 0, -55 - 40 * s(p + Math.PI - 1.2)],
    lSh: [8, 0, -40 * s(p)],
    rSh: [8, 0, 40 * s(p)],
    lEl: [0, 0, 85],
    rEl: [0, 0, 85],
  });
}

export function pushups(t: number): Pose {
  const k = (1 - Math.cos(t * Math.PI * 2 * 2.6)) / 2; // 0 up, 1 down
  return lerpPose(POSES.plankUp, POSES.plankDown, k);
}
// how far the body drops during the push-up, for the root
export const pushupDepth = (t: number) => (1 - Math.cos(t * Math.PI * 2 * 2.6)) / 2;

export function cook(t: number): Pose {
  const p = t * Math.PI * 2 * 1.6;
  return P({
    neck: [0, 0, -18],
    rSh: [-10, 0, 45 + 12 * s(p)],
    rEl: [0, 0, 55 + 15 * s(p * 0.5)],
    lSh: [10, 0, 35 + 6 * s(p + 1)],
    lEl: [0, 0, 70],
  });
}

export function scrub(t: number): Pose {
  const p = t * Math.PI * 2 * 2.2;
  return P({
    neck: [0, 0, 6 * s(p)],
    lSh: [150 + 8 * s(p), 0, 10],
    rSh: [150 - 8 * s(p), 0, 10],
    lEl: [120, 0, 0],
    rEl: [120, 0, 0],
  });
}

export function lerpPose(a: Pose, b: Pose, k: number): Pose {
  const out = {} as Pose;
  for (const key of Object.keys(a) as (keyof Pose)[]) {
    out[key] = [0, 1, 2].map((i) => a[key][i] + (b[key][i] - a[key][i]) * k) as V3;
  }
  return out;
}

// ---------- planar two-bone IK ----------
// Solves a limb in its parent's frame so its end reaches (dx, dy) from the joint.
// Angles use the rig convention: a limb at rest points down (0,-1); +z swings it towards +x.
// bend = -1 puts the middle joint ahead of the line (knees); +1 puts it behind.
export function ik2(L1: number, L2: number, dx: number, dy: number, bend: 1 | -1): [number, number] {
  const D = Math.min(Math.hypot(dx, dy), L1 + L2 - 1e-4);
  const base = Math.atan2(dx, -dy);
  const a = Math.acos(Math.min(1, Math.max(-1, (L1 * L1 + D * D - L2 * L2) / (2 * L1 * D))));
  const b = Math.acos(Math.min(1, Math.max(-1, (L1 * L1 + L2 * L2 - D * D) / (2 * L1 * L2))));
  const R = 180 / Math.PI;
  return bend === -1 ? [(base + a) * R, -(Math.PI - b) * R] : [(base - a) * R, (Math.PI - b) * R];
}

// world (x, y) → the root's local plane, for a side-on figure (ry = 0 or 180) pitched by rz
export function toLocal(hip: [number, number], ry: number, rz: number, X: number, Y: number): [number, number] {
  const sx = Math.cos((ry * Math.PI) / 180) >= 0 ? 1 : -1;
  const wx = (X - hip[0]) * sx;
  const wy = Y - hip[1];
  const r = (-rz * Math.PI) / 180;
  return [wx * Math.cos(r) - wy * Math.sin(r), wx * Math.sin(r) + wy * Math.cos(r)];
}
