// Recreation study of the @neuronvisuals "5 MINUTES / NO TIME" reel (11.4 s, 60 fps).
// Two rows share one 3D apartment and one clock: top = gets up, bottom = snoozes.
// Motion: feet and hands are planted with IK (gait.ts), key poses use anticipation/overshoot
// easing, and the head lags the body. Look: lamp spotlights with soft shadows, contact shadows and
// corner occlusion, grain and vignette. Sound: every footfall and contact has a sound.
import * as THREE from 'three';
import { ThreeCanvas } from '@remotion/three';
import { useThree } from '@react-three/fiber';
import { CameraMotionBlur } from '@remotion/motion-blur';
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { loadFont } from '@remotion/google-fonts/ChakraPetch';
import { Apartment, Bag, Box, glyphTex, puffTex, shadowTex, stinkTex, type SetState } from './set';
import { POSES, StickFigure, cook, scrub, type Parts, type Pose } from './rig';
import { RUN, SLUMP_WALK, WALK, footfalls, gait, plankAt, pushupDrive, PUSHUP_RATE } from './gait';
import { sample, track, type Key } from './track';

const { fontFamily } = loadFont('normal', { weights: ['600', '700'], subsets: ['latin'] });

export const FIVE_FPS = 60;
export const FIVE_FRAMES = 690; // 11.5 s @ 60
const W = 1080;
const PANEL_H = 490;
const TOP_Y = 400;
const BOT_Y = 998;
const clampX = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

// ---------- figure tracks ----------
const BED_Y = 0.66;
const HIP = WALK.hipY;
const RHIP = RUN.hipY;
const lying = { pos: [2.6, BED_Y, -1.0] as [number, number, number], ry: 180, rz: 90 };
const P0 = plankAt(0);
const curl: Pose = { ...POSES.lieBack, lHip: [0, 0, 35], rHip: [0, 0, 45], lKnee: [0, 0, -60], rKnee: [0, 0, -70], neck: [0, 0, 20] };
const look: Pose = { ...POSES.lieBack, neck: [0, 0, 38] };
const panic: Pose = { ...POSES.stand, lSh: [50, 0, 10], rSh: [50, 0, 10], lEl: [0, 0, 60], rEl: [0, 0, 60], neck: [0, 0, 8] };

// walking segments: [start, end, gait] — also used to place footstep sounds
const TOP_WALKS: [number, number, typeof WALK][] = [[2.76, 3.4, WALK], [4.62, 5.0, WALK], [6.02, 6.4, WALK], [6.58, 6.88, WALK]];
const BOT_RUNS: [number, number, typeof WALK][] = [[5.3, 6.2, RUN], [6.5, 6.85, RUN]];

const TOP_KEYS: Key[] = [
  { t: 0, ...lying, pose: POSES.lieBack },
  { t: 0.12, ...lying, pose: POSES.lieBack },
  { t: 0.3, ...lying, pose: POSES.reachUp, ease: 'snap' },
  { t: 0.42, ...lying, pose: POSES.lieBack, ease: 'out' },
  // anticipation: curl up, then roll off the bed and land in a plank
  { t: 0.52, ...lying, pose: curl },
  { t: 0.68, pos: [2.75, 0.62, -0.5], ry: 0, rz: -100, pose: { ...POSES.plankUp, lSh: [0, 0, 80], rSh: [0, 0, 80] } },
  { t: 0.86, pos: P0.pos, ry: 0, rz: P0.rz, pose: P0.pose, ease: 'snap' },
  { t: 0.86 + 4 / PUSHUP_RATE, pos: P0.pos, ry: 0, rz: P0.rz, pose: P0.pose, drive: pushupDrive },
  { t: 2.55, pos: [2.85, 0.5, 0.0], ry: 0, rz: 0, pose: POSES.crouch },
  { t: 2.72, pos: [3.1, HIP, 0.0], pose: POSES.stand, ease: 'snap' },
  { t: 2.76, pos: [3.15, HIP, -0.05], pose: POSES.stand },
  { t: 3.4, pos: [7.3, HIP, -0.6], pose: POSES.stand, drive: gait(WALK) },
  { t: 3.52, pos: [7.3, HIP, -0.6], ry: -90, pose: POSES.stand, ease: 'snap' },
  { t: 3.62, pos: [7.3, HIP, -0.6], ry: -90, pose: cook },
  { t: 4.5, pos: [7.3, HIP, -0.6], ry: -90, pose: cook },
  { t: 4.6, pos: [7.35, HIP, -0.55], ry: 0, pose: POSES.stand, ease: 'snap' },
  { t: 4.62, pos: [7.4, HIP, -0.5], ry: 0, pose: POSES.stand },
  { t: 5.0, pos: [11.25, HIP + 0.08, -0.95], pose: POSES.stand, drive: gait(WALK) },
  { t: 5.1, pos: [11.25, HIP + 0.08, -0.95], ry: -90, pose: POSES.stand, ease: 'snap' },
  { t: 5.2, pos: [11.25, HIP + 0.08, -0.95], ry: -90, pose: scrub },
  { t: 5.9, pos: [11.25, HIP + 0.08, -0.95], ry: -90, pose: scrub },
  { t: 5.99, pos: [11.3, HIP, -0.7], ry: 0, pose: POSES.stand, ease: 'snap' },
  { t: 6.02, pos: [11.4, HIP, -0.6], ry: 0, pose: POSES.stand },
  { t: 6.4, pos: [13.45, HIP, -1.05], pose: POSES.stand, drive: gait(WALK) },
  { t: 6.48, pos: [13.45, HIP - 0.04, -1.05], ry: -30, pose: POSES.grabBag, ease: 'snap' },
  { t: 6.58, pos: [13.6, HIP, -1.1], ry: 0, pose: POSES.holdBag },
  { t: 6.88, pos: [15.0, HIP, -1.4], pose: POSES.holdBag, drive: gait(WALK) },
  { t: 7.0, pos: [15.0, HIP, -1.4], ry: -90, pose: POSES.holdBag, ease: 'snap' },
];

const BOT_KEYS: Key[] = [
  { t: 0, ...lying, pose: POSES.lieBack },
  { t: 0.12, ...lying, pose: POSES.lieBack },
  { t: 0.3, ...lying, pose: POSES.reachUp, ease: 'snap' },
  { t: 0.45, ...lying, pose: POSES.lieBack, ease: 'out' },
  { t: 2.33, ...lying, pose: POSES.lieBack },
  { t: 2.48, ...lying, pose: POSES.reachUp, ease: 'snap' },
  { t: 2.64, ...lying, pose: POSES.lieBack, ease: 'out' },
  { t: 4.45, ...lying, pose: POSES.lieBack },
  { t: 4.7, ...lying, pose: look },
  { t: 4.95, ...lying, pose: look },
  // the shock: bolt upright, overshoot, scramble out
  { t: 5.06, pos: [2.6, BED_Y, -1.0], ry: 180, rz: 0, pose: POSES.sitUp, ease: 'snap' },
  { t: 5.24, pos: [3.1, HIP, -0.15], ry: -90, pose: panic, ease: 'snap' },
  { t: 5.3, pos: [3.2, RHIP, -0.3], ry: 0, pose: POSES.stand },
  { t: 6.2, pos: [10.9, RHIP, -0.45], pose: POSES.stand, drive: gait(RUN) },
  { t: 6.3, pos: [11.0, HIP, -0.45], ry: -40, pose: POSES.sniff, ease: 'snap' },
  { t: 6.45, pos: [11.0, HIP, -0.45], ry: -40, pose: POSES.sniff },
  { t: 6.5, pos: [11.2, RHIP, -0.6], ry: 0, pose: POSES.stand },
  { t: 6.85, pos: [15.0, RHIP, -1.4], pose: POSES.slump, drive: gait(RUN) },
  { t: 7.0, pos: [15.0, HIP, -1.4], ry: -90, pose: POSES.slump, ease: 'snap' },
];

// ---------- the rows ----------
type Row = 'top' | 'bottom';
export const ROOM_LAMPS = [3.4, 7.3, 11.0, 14.6];
const timerSecs = (t: number) => Math.min(300, Math.floor(t * 43));

function rowState(row: Row, t: number, runnerX: number) {
  const top = row === 'top';
  // the lamp flickers on
  const lights = top ? track([[0.36, 0], [0.39, 0.7], [0.41, 0.15], [0.45, 1]], t, 'linear') : track([[6.7, 0], [6.85, 1]], t);
  const st: SetState = {
    lights,
    clock: `6:0${Math.min(5, Math.floor(timerSecs(t) / 60))}`,
    doorOpen: track([[6.62, 0], [6.86, 1]], t, 'snap'),
    eggs: top ? track([[3.85, 0], [4.05, 1]], t, 'snap') : 0,
    donut: top || t < 5.75,
    bagOnHook: !top || t < 6.48,
    water: top && t > 5.1 && t < 5.95,
    t,
  };
  const camX = top
    ? track([[0, 2.55], [2.72, 2.55], [3.3, 7.3], [4.6, 7.3], [5.0, 11.1], [6.0, 11.1], [6.4, 14.3]], t)
    : t < 5.3
      ? 2.55
      : t < 6.8
        ? Math.min(14.3, Math.max(2.55, runnerX + track([[5.3, -0.4], [5.6, 0.3]], t)))
        : 14.3;
  const camD = top
    ? track([[0, 5.6], [2.72, 5.6], [3.3, 4.4], [4.6, 4.4], [5.0, 4.0], [6.0, 4.0], [6.4, 4.7]], t)
    : track([[0, 5.6], [5.25, 5.6], [5.6, 4.5], [6.6, 4.5], [6.85, 4.7]], t);
  return { st, camX, camD };
}

export function Camera({ x, d }: { x: number; d: number }) {
  const { camera, size } = useThree();
  const cam = camera as THREE.PerspectiveCamera;
  cam.fov = 30;
  cam.aspect = size.width / size.height;
  cam.near = 0.1;
  cam.far = 60;
  cam.position.set(x, 1.55 + d * 0.04, d);
  cam.lookAt(x, 1.1 + (5.6 - d) * 0.05, -0.7);
  cam.updateProjectionMatrix();
  return null;
}

export function Lights({ L, camX, moon = 0 }: { L: number; camX: number; moon?: number }) {
  // L: 0 = the blue dark room, 1 = lamps on. Only the lamp of the room in view casts shadows.
  const lamp = ROOM_LAMPS.reduce((a, b) => (Math.abs(b - camX) < Math.abs(a - camX) ? b : a));
  return (
    <>
      <ambientLight color={new THREE.Color('#4a62b8').lerp(new THREE.Color('#fff4ea'), L)} intensity={0.95 - 0.1 * L + 0.35 * moon} />
      <hemisphereLight args={['#c9d3ff', '#0b0b12', 0.45 + 0.1 * L]} />
      <directionalLight
        position={[camX + 1.5, 6, 5]}
        intensity={0.12 + 0.75 * L + 0.45 * moon}
        color={L > 0.5 ? '#fff2df' : '#7f93d6'}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={4}
        shadow-camera-bottom={-2}
        shadow-bias={-0.0008}>
        <object3D attach="target" position={[camX, 0, -1]} />
      </directionalLight>
      {L > 0.01 && (
        <spotLight
          position={[lamp, 2.78, -0.6]}
          angle={1.05}
          penumbra={0.9}
          decay={1.6}
          distance={9}
          intensity={22 * L}
          color="#ffe8c8"
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-bias={-0.0006}>
          <object3D attach="target" position={[lamp, 0, -0.4]} />
        </spotLight>
      )}
    </>
  );
}

function Blanket({ row, t }: { row: Row; t: number }) {
  const c = '#34407e';
  const top = row === 'top';
  if ((top && t < 0.5) || (!top && t < 0.5)) return <Box p={[2.1, 0.68, -1.0]} s={[1.4, 0.16, 1.08]} c={c} />;
  if (top) {
    // kicked down to the foot of the bed
    const k = track([[0.5, 0], [0.66, 1]], t, 'snap');
    return <Box p={[2.1 - 0.4 * k, 0.68 - 0.02 * k, -1.0]} s={[1.4 - 0.9 * k, 0.16, 1.08]} c={c} />;
  }
  if (t < 5.0) {
    // breathing under the covers
    const b = 1 + 0.06 * Math.sin(t * 2.4);
    return (
      <group>
        <Box p={[2.45, 0.68, -1.0]} s={[2.05, 0.2, 1.08]} c={c} />
        <group position={[2.3, 0.78, -1.0]} scale={[1, b, 1]}>
          <Box p={[0, 0.02, 0]} s={[1.2, 0.14, 0.5]} c={c} />
        </group>
        <Box p={[3.2, 0.82, -1.0]} s={[0.4, 0.2, 0.55]} c={c} />
      </group>
    );
  }
  // flung off the bed onto the floor
  const k = track([[5.0, 0], [5.22, 1]], t, 'out');
  const arc = Math.sin(k * Math.PI) * 0.5;
  return (
    <group position={[2.4 - 0.1 * k, 0.68 * (1 - k) + 0.05 * k + arc, -1.0 + 0.8 * k]} rotation={[0, 0, -0.6 * Math.sin(k * Math.PI)]}>
      <Box p={[0, 0, 0]} s={[1.6 - 0.6 * k, 0.18 - 0.08 * k, 1.0 - 0.4 * k]} c={c} />
    </group>
  );
}

export function Sprite({ tex, p, s, o = 1 }: { tex: THREE.Texture; p: [number, number, number]; s: number; o?: number }) {
  return (
    <sprite position={p} scale={[s, s, s]}>
      <spriteMaterial map={tex} transparent opacity={o} depthWrite={false} />
    </sprite>
  );
}

export function Zzz({ t, from, to }: { t: number; from: number; to: number }) {
  if (t < from || t > to) return null;
  const out = [];
  for (let i = 0; i < 3; i++) {
    const k = ((((t - from) * 0.9 + i / 3) % 1) + 1) % 1;
    out.push(<Sprite key={i} tex={glyphTex('Z')} p={[3.55 + k * 0.12 + Math.sin(k * 6) * 0.03, 1.0 + k * 0.6, -1.0]} s={0.12 + k * 0.1} o={Math.sin(k * Math.PI)} />);
  }
  return <>{out}</>;
}

export function Steam({ t }: { t: number }) {
  if (t < 3.9 || t > 4.9) return null;
  const fade = interpolate(t, [3.9, 4.1, 4.6, 4.9], [0, 1, 1, 0], clampX);
  const out = [];
  for (let i = 0; i < 5; i++) {
    const k = ((((t - 3.9) * 0.8 + i / 5) % 1) + 1) % 1;
    out.push(<Sprite key={i} tex={puffTex()} p={[7.15 + Math.sin(k * 5 + i) * 0.06, 1.02 + k * 0.5, 0.15]} s={0.1 + k * 0.16} o={0.32 * Math.sin(k * Math.PI) * fade} />);
  }
  return <>{out}</>;
}

// a soft dark blob on the floor under the figure
export function FigureShadow({ x, z, h }: { x: number; z: number; h: number }) {
  const o = Math.max(0, 0.5 - h * 0.35);
  return (
    <mesh position={[x, 0.008, z]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[0.9, 0.5]} />
      <meshBasicMaterial map={shadowTex()} transparent opacity={o} depthWrite={false} color="#000" />
    </mesh>
  );
}

// the head trails the body a little when it turns or tips
export function withLag(keys: Key[], t: number) {
  const f = sample(keys, t);
  const p = sample(keys, t - 1 / 20);
  const lag = Math.max(-14, Math.min(14, (p.rz - f.rz) * 0.35 - (f.pos[1] - p.pos[1]) * 60));
  return { ...f, pose: { ...f.pose, neck: [f.pose.neck[0], f.pose.neck[1], f.pose.neck[2] + lag] as Pose['neck'] } };
}

function RowScene({ row, t }: { row: Row; t: number }) {
  const top = row === 'top';
  const f = withLag(top ? TOP_KEYS : BOT_KEYS, t);
  const { st, camX, camD } = rowState(row, t, f.pos[0]);
  // under the covers only the snoozing arm pokes out
  const covered = !top && t > 0.5 && t < 4.5;
  const show: Parts = covered ? { head: false, torso: false, lArm: false, lLeg: false, rLeg: false } : {};
  const hasBag = top && t >= 6.48;
  const donut = !top && t >= 5.75;
  const stink = !top && t >= 6.3;
  const inBed = (top && t < 0.6) || (!top && t < 5.1);
  const sway = Math.sin(t * 9) * 0.18;
  return (
    <>
      <Camera x={camX} d={camD} />
      <Lights L={st.lights} camX={camX} />
      <Apartment st={st} />
      <Blanket row={row} t={t} />
      {!inBed && <FigureShadow x={f.pos[0]} z={f.pos[2]} h={Math.max(0, f.pos[1] - HIP)} />}
      <group position={f.pos} rotation={[0, (f.ry * Math.PI) / 180, (f.rz * Math.PI) / 180, 'YZX']}>
        <StickFigure
          pose={f.pose}
          color={top ? '#f4f4f4' : '#a9adb4'}
          emissive={top ? 0.3 : 0.25}
          show={show}
          rightHand={
            hasBag ? (
              // broad side to the camera once he turns to face it in the doorway
              t >= 6.92 ? (
                <Bag position={[0, 0.02, 0.2]} rotation={[0, Math.PI / 2, 0]} />
              ) : (
                <Bag position={[0, 0.02, 0.11]} rotation={[0, 0, sway]} />
              )
            ) : undefined
          }
          head={
            donut ? (
              <mesh position={[0.16, -0.04, 0]} rotation={[0, Math.PI / 2, 0]}>
                <torusGeometry args={[0.07, 0.035, 10, 20]} />
                <meshLambertMaterial color="#c97aa0" />
              </mesh>
            ) : undefined
          }
        />
      </group>
      {top && <Steam t={t} />}
      {!top && <Zzz t={t} from={0.8} to={2.3} />}
      {!top && <Zzz t={t} from={2.8} to={4.35} />}
      {!top && t > 4.95 && t < 5.7 && (
        <Sprite tex={glyphTex('!')} p={[f.pos[0] + 0.05, f.pos[1] + 1.25, f.pos[2]]} s={0.35 * Math.min(1, (t - 4.95) * 12)} />
      )}
      {stink && <Sprite tex={stinkTex()} p={[f.pos[0], f.pos[1] + 1.2 + Math.sin(t * 8) * 0.03, f.pos[2] + 0.05]} s={0.42} o={0.9} />}
    </>
  );
}

const PANS: Record<Row, [number, number][]> = {
  top: [[2.78, 3.35], [4.62, 5.02], [6.0, 6.42]],
  bottom: [[5.32, 6.85]],
};

function PanelCanvas({ row }: { row: Row }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <ThreeCanvas width={W} height={PANEL_H} shadows="soft" gl={{ antialias: true, preserveDrawingBuffer: true }} style={{ background: '#08080b' }}>
      <RowScene row={row} t={frame / fps} />
    </ThreeCanvas>
  );
}

function Panel({ row, y }: { row: Row; y: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const panning = PANS[row].some(([a, b]) => t > a && t < b);
  return (
    <div style={{ position: 'absolute', left: 0, top: y, width: W, height: PANEL_H, overflow: 'hidden' }}>
      {panning ? (
        <CameraMotionBlur samples={5} shutterAngle={240}>
          <PanelCanvas row={row} />
        </CameraMotionBlur>
      ) : (
        <PanelCanvas row={row} />
      )}
      {/* lens vignette: darkens the corners, no light added */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.38) 100%)' }} />
    </div>
  );
}

// ---------- 2D overlay ----------
const TOP_LABELS: [number, string][] = [[0.3, 'ALARM OFF'], [1.0, 'PUSH-UPS'], [3.5, 'EGGS'], [5.1, 'SHOWER'], [6.4, 'READY']];
const BOT_LABELS: [number, string][] = [[0.3, 'SNOOZE'], [2.6, 'SNOOZE ×2'], [5.0, 'LATE!'], [5.8, 'DONUT'], [6.3, 'NO SHOWER']];

export function Label({ y, title, subs, t, strike }: { y: number; title: string; subs: [number, string][]; t: number; strike?: number }) {
  let sub = '';
  let since = 0;
  for (const [at, s] of subs)
    if (t >= at) {
      sub = s;
      since = t - at;
    }
  const typed = sub.slice(0, Math.ceil(since * 40));
  const rise = interpolate(since, [0, 0.12], [6, 0], clampX);
  const red = strike !== undefined ? interpolate(t, [strike, strike + 0.12], [0, 1], clampX) : 0;
  const line = strike !== undefined ? interpolate(t, [strike + 0.05, strike + 0.25], [0, 1], { ...clampX, easing: (k) => 1 - (1 - k) ** 3 }) : 0;
  return (
    <div style={{ position: 'absolute', left: 34, top: y + 16, fontFamily, color: 'white', letterSpacing: '0.16em' }}>
      <div style={{ position: 'relative', display: 'inline-block', fontSize: 29, fontWeight: 700, color: red > 0.5 ? '#e0473f' : 'white' }}>
        {title}
        <div style={{ position: 'absolute', left: -4, top: '52%', height: 3, width: `${line * 104}%`, background: '#e0473f' }} />
      </div>
      <div style={{ fontSize: 17, fontWeight: 600, opacity: 0.62, marginTop: 2, transform: `translateY(${rise}px)` }}>{typed}</div>
    </div>
  );
}

function Timer({ t }: { t: number }) {
  const secs = timerSecs(t);
  const k = secs / 300;
  const r = 30;
  const c = 2 * Math.PI * r;
  const txt = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
  // a small pulse every minute and at 5:00
  const sinceMin = (t * 43) % 60 / 43;
  const pulse = secs < 300 ? 1 + 0.08 * Math.max(0, 1 - sinceMin / 0.12) : 1 + 0.12 * Math.max(0, 1 - (t - 300 / 43) / 0.2);
  return (
    <div style={{ position: 'absolute', left: W / 2 - 40, top: (TOP_Y + PANEL_H + BOT_Y) / 2 - 40, width: 80, height: 80, transform: `scale(${pulse})` }}>
      <svg width="80" height="80">
        <circle cx="40" cy="40" r={r} fill="#050506" stroke="#2a2a30" strokeWidth="4" />
        <circle cx="40" cy="40" r={r} fill="none" stroke="white" strokeWidth="4" strokeDasharray={`${c * k} ${c}`} transform="rotate(-90 40 40)" strokeLinecap="round" />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily, fontWeight: 700, fontSize: 19, color: 'white', fontVariantNumeric: 'tabular-nums' }}>
        {txt}
      </div>
    </div>
  );
}

// film grain: a fresh noise seed each frame, very faint
export function Grain() {
  const frame = useCurrentFrame();
  return (
    <svg style={{ position: 'absolute', inset: 0, width: W, height: 1920, opacity: 0.07, mixBlendMode: 'overlay', pointerEvents: 'none' }}>
      <filter id={`g${frame}`}>
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={frame % 97} stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter={`url(#g${frame})`} />
    </svg>
  );
}

// ---------- ending: the walk to work ----------
export const BUILDINGS = Array.from({ length: 26 }, (_, i) => {
  const r = (n: number) => ((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1;
  return { x: i * 150 - 200 + r(1) * 40, w: 90 + r(2) * 90, h: 260 + r(3) * 420, lights: Math.floor(r(4) * 5) };
});
const END_T0 = 7.58;
// sidewalk speed in px/s that matches the walk at the figures' depth, so feet stay planted
export const PX_PER_UNIT = 800 / (2 * 6.4 * Math.tan((15 * Math.PI) / 180));
const GROUND_PX = WALK.speed * PX_PER_UNIT;
const END_SLUMP = { ...SLUMP_WALK, speed: WALK.speed };

function EndWalkers({ t }: { t: number }) {
  const g = gait(WALK)(t + 0.21, END_T0, 99, [0, 0, 0], [0, 0, 0]);
  const s = gait(END_SLUMP, true)(t, END_T0, 99, [0, 0, 0], [0, 0, 0]);
  return (
    <>
      <EndCamera />
      <ambientLight intensity={0.75} color="#e9e2ff" />
      <directionalLight position={[2, 5, 6]} intensity={0.7} color="#ffd9c2" />
      <group position={[-0.95, s.pos[1], 0]}>
        <StickFigure pose={s.pose} color="#a9adb4" emissive={0.25} />
        <Sprite tex={stinkTex()} p={[0.05, 1.18 + Math.sin(t * 8) * 0.03, 0.05]} s={0.42} o={0.85} />
      </group>
      <group position={[0.75, g.pos[1], 0]}>
        <StickFigure
          pose={{ ...g.pose, rSh: [12, 0, 4], rEl: [0, 0, 10] }}
          color="#f7f7f7"
          emissive={0.35}
          rightHand={<Bag position={[0, 0.02, 0.11]} rotation={[0, 0, Math.sin(t * 9) * 0.18]} />}
        />
      </group>
    </>
  );
}
export function EndCamera() {
  const { camera, size } = useThree();
  const cam = camera as THREE.PerspectiveCamera;
  cam.fov = 30;
  cam.aspect = size.width / size.height;
  cam.position.set(0, 1.1, 6.4);
  cam.lookAt(0, 1.0, 0);
  cam.updateProjectionMatrix();
  return null;
}

export const wrap = (v: number, span: number) => ((v % span) + span) % span;

function Ending({ t }: { t: number }) {
  const e = t - END_T0;
  const far = -e * 25;
  const ground = -e * GROUND_PX;
  return (
    <AbsoluteFill style={{ background: 'linear-gradient(#12163a 0%, #2b2a5c 38%, #5d4775 58%, #b46f76 59%, #2a2233 60%)' }}>
      {/* skyline */}
      <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: 1140, transform: `translateX(${far % 3900}px)` }}>
        {[0, 3900].map((off) =>
          BUILDINGS.map((b, i) => (
            <div key={`${off}-${i}`} style={{ position: 'absolute', left: b.x + off, bottom: 0, width: b.w, height: b.h, background: '#15172c' }}>
              {Array.from({ length: b.lights }, (_, j) => (
                <div key={j} style={{ position: 'absolute', left: 14 + ((j * 37) % (b.w - 24)), top: 30 + j * 61, width: 5, height: 5, background: '#d8b56a' }} />
              ))}
            </div>
          )),
        )}
      </div>
      {/* railing + sidewalk, moving at walking speed */}
      <div style={{ position: 'absolute', left: 0, top: 1070, width: W, height: 4, background: '#4a3f52' }} />
      <div style={{ position: 'absolute', left: 0, top: 1140, width: W, height: 200, background: '#4a4350' }} />
      {Array.from({ length: 8 }, (_, i) => (
        <div key={`seam${i}`} style={{ position: 'absolute', left: wrap(i * 240 + ground, 1920) - 300, top: 1140, width: 3, height: 200, background: '#3f3945' }} />
      ))}
      <div style={{ position: 'absolute', left: 0, top: 1340, width: W, height: 26, background: '#6b6470' }} />
      <div style={{ position: 'absolute', left: 0, top: 1366, width: W, height: 560, background: '#1d1b22' }} />
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} style={{ position: 'absolute', left: wrap(i * 260 + ground * 0.85, 2080) - 300, top: 1070, width: 6, height: 70, background: '#4a3f52' }} />
      ))}
      {/* street lamp */}
      <div style={{ position: 'absolute', left: wrap(900 + ground * 0.8, 2400) - 600, top: 410, width: 12, height: 930, background: '#2a2630' }}>
        <div style={{ position: 'absolute', left: -110, top: 0, width: 122, height: 10, background: '#2a2630' }} />
        <div style={{ position: 'absolute', left: -118, top: 10, width: 40, height: 10, background: '#efe3c3' }} />
      </div>
      <div style={{ position: 'absolute', left: 0, top: 670, width: W, height: 800 }}>
        <ThreeCanvas width={W} height={800} gl={{ antialias: true, alpha: true }}>
          <EndWalkers t={t} />
        </ThreeCanvas>
      </div>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.35) 100%)' }} />
    </AbsoluteFill>
  );
}

function Caption({ t }: { t: number }) {
  const text = 'SAME 5 MINUTES.\nDIFFERENT DAY.';
  const typed = text.slice(0, Math.max(0, Math.floor((t - 7.15) * 26)));
  return (
    <div style={{ position: 'absolute', top: 175, width: W, textAlign: 'center', fontFamily, fontWeight: 700, fontSize: 40, letterSpacing: '0.16em', color: 'white', whiteSpace: 'pre-line', lineHeight: 1.45 }}>
      {typed}
    </div>
  );
}

// ---------- sound ----------
// the bed and the big cues follow the original's spectrogram; on top, every contact has a sound
const pushupThuds = Array.from({ length: 4 }, (_, n) => 0.86 + (n + 0.5) / PUSHUP_RATE);
const CUES: [number, string, number][] = [
  [0.0, 'beep', 0.9], [2.3, 'beep', 0.8], [4.42, 'beep', 0.8],
  [0.3, 'click', 0.5], [0.37, 'switch', 0.6], [0.52, 'rustle', 0.6], [0.62, 'creak', 0.4], [0.84, 'thud', 0.7],
  ...pushupThuds.map((x): [number, string, number] => [x, 'thud', 0.45]),
  [2.48, 'click', 0.4],
  [2.78, 'whoosh', 0.7], [4.62, 'whoosh', 0.6], [5.32, 'whoosh', 0.5], [6.0, 'whoosh', 0.6], [6.5, 'whoosh', 0.5],
  [3.86, 'crack', 0.7], [3.9, 'sizzle', 0.55], [5.1, 'water', 0.5],
  [4.95, 'tick', 0.6], [5.0, 'rustle', 0.8], [5.06, 'creak', 0.5],
  [6.3, 'sniff', 0.6], [6.48, 'rustle', 0.4], [6.62, 'click', 0.6], [6.64, 'door', 0.6],
  [6.95, 'tone', 1], [7.0, 'riser', 0.8], [7.8, 'birds', 0.8],
];
const STEPS: [number, number][] = [
  ...TOP_WALKS.flatMap(([a, b, g]) => footfalls(g, a, b).map((x): [number, number] => [x, 0.35])),
  ...BOT_RUNS.flatMap(([a, b, g]) => footfalls(g, a, b).map((x): [number, number] => [x, 0.5])),
  ...footfalls(WALK, END_T0 + 0.05, 11.2).map((x): [number, number] => [x, 0.22]),
];

function Sound() {
  const { fps } = useVideoConfig();
  return (
    <>
      <Audio src={staticFile('sfx/bed.wav')} volume={0.9} />
      {CUES.map(([at, name, vol]) => (
        <Sequence key={`${name}${at}`} from={Math.round(at * fps)}>
          <Audio src={staticFile(`sfx/${name}.wav`)} volume={vol} />
        </Sequence>
      ))}
      {STEPS.map(([at, vol], i) => (
        <Sequence key={`step${i}`} from={Math.round(at * fps)} durationInFrames={Math.round(0.2 * fps)}>
          <Audio src={staticFile('sfx/step.wav')} volume={vol} playbackRate={0.9 + ((i * 37) % 20) / 100} />
        </Sequence>
      ))}
    </>
  );
}

export function FiveMinutes() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const flash = interpolate(t, [7.3, 7.55, 7.6, 7.85], [0, 1, 1, 0], clampX);
  const fadeIn = interpolate(t, [0, 0.12], [1, 0], clampX);
  const fadeOut = interpolate(t, [10.95, 11.45], [0, 1], clampX);
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      {t < END_T0 ? (
        <>
          <Panel row="top" y={TOP_Y} />
          <Panel row="bottom" y={BOT_Y} />
          <Label y={TOP_Y} title="5 MINUTES" subs={TOP_LABELS} t={t} />
          <Label y={BOT_Y} title="NO TIME" subs={BOT_LABELS} t={t} strike={6.95} />
          <Timer t={t} />
        </>
      ) : (
        <Ending t={t} />
      )}
      <AbsoluteFill style={{ background: '#fff8e8', opacity: flash }} />
      <Caption t={t} />
      <Grain />
      <AbsoluteFill style={{ background: '#000', opacity: Math.max(fadeIn, fadeOut) }} />
      <Sound />
    </AbsoluteFill>
  );
}
