// "ONE MORE VIDEO" v2: an original reel on the same engine as the 5-minutes recreation.
// Same bed, same night, one shared clock (11 PM → 7 AM). Top puts the phone down; bottom doesn't.
// v2: a close-up hook, a brighter and escalating night, CMU motion capture for the acting moves,
// a room with personality, an original lo-fi bed with a drop on the alarm, a "night 2" loop
// ending, and real ambient occlusion (N8AO).
import { ThreeCanvas } from '@remotion/three';
import { useThree } from '@react-three/fiber';
import { EffectComposer, N8AO } from '@react-three/postprocessing';
import { CameraMotionBlur } from '@remotion/motion-blur';
import { useLayoutEffect, type ReactNode } from 'react';
import * as THREE from 'three';
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { loadFont } from '@remotion/google-fonts/ChakraPetch';
import { Apartment, Bag, Box, Phone, glyphTex, type SetState } from '../five/set';
import { POSES, StickFigure, cook, type Pose } from '../five/rig';
import { WALK } from '../five/gait';
import { CLIPS, mocap } from '../five/mocap';
import { track, type Key, type Sample } from '../five/track';
import { FigureShadow, Grain, Label, Lights, Sprite, Steam, Zzz, withLag } from '../five/FiveMinutes';
import { BedroomProps } from './props';

const { fontFamily } = loadFont('normal', { weights: ['600', '700'], subsets: ['latin'] });

export const OMV_FPS = 60;
export const INTRO = 1.0; // the close-up hook before the split screen
const STORY_END = 14.7;
export const OMV_TOTAL = INTRO + STORY_END;
export const OMV_FRAMES = Math.round(OMV_TOTAL * OMV_FPS);
const W = 1080;
const PANEL_H = 490;
const TOP_Y = 400;
const BOT_Y = 998;
const clampX = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

// story times (seconds after the intro)
const NIGHT_A = 0.5;
const NIGHT_B = 5.8; // 7:00 AM: the alarm, and the music drop
const FLASH = 11.15;
const NIGHT2 = 11.45; // the loop ending

// ---------- the clock ----------
const minutesAt = (s: number) =>
  s < NIGHT_A ? 0 : s < NIGHT_B ? ((s - NIGHT_A) / (NIGHT_B - NIGHT_A)) * 480 : 480 + Math.min(52, (s - NIGHT_B) * 10);
function clockText(s: number, ampm = true) {
  const m = Math.floor(23 * 60 + minutesAt(s)) % (24 * 60);
  const h = Math.floor(m / 60);
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${String(m % 60).padStart(2, '0')}${ampm ? (h < 12 ? ' AM' : ' PM') : ''}`;
}

// ---------- poses ----------
const BED_Y = 0.71;
const HIP = WALK.hipY;
const lying = { pos: [2.6, BED_Y, -1.0] as [number, number, number], ry: 180, rz: 90 };
const P = (p: Partial<Pose>): Pose => ({ ...POSES.lieBack, ...p });
const holdPhone = (t: number) =>
  P({ rSh: [0, 0, 96], rEl: [0, 0, 34 + 6 * Math.max(0, Math.sin(t * 15))], lSh: [0, 0, 92], lEl: [0, 0, 40], neck: [0, 0, 12] });
// on his side, phone close to his face, knees pulled up
const holdSide = (t: number) =>
  P({ rSh: [0, 0, 70], rEl: [0, 0, 80 + 6 * Math.max(0, Math.sin(t * 13))], lSh: [0, 0, 60], lEl: [0, 0, 95], lHip: [0, 0, 40], rHip: [0, 0, 30], lKnee: [0, 0, -55], rKnee: [0, 0, -45], neck: [0, 0, -6] });
const holdTired = (t: number) =>
  P({ rSh: [0, 0, 82], rEl: [0, 0, 50 + 5 * Math.max(0, Math.sin(t * 11))], lSh: [0, 0, 78], lEl: [0, 0, 56], neck: [0, 0, 4] });
const curl: Pose = P({ lHip: [0, 0, 35], rHip: [0, 0, 45], lKnee: [0, 0, -60], rKnee: [0, 0, -70], neck: [0, 0, 20] });
const look: Pose = P({ neck: [0, 0, 38] });
const panic: Pose = { ...POSES.stand, lSh: [50, 0, 10], rSh: [50, 0, 10], lEl: [0, 0, 60], rEl: [0, 0, 60] };
const phoneArm = (p: Pose): Pose => ({ ...p, rSh: [8, 0, 58], rEl: [0, 0, 78], neck: [0, 0, -26] });
const SIT = CLIPS.standUp.frames[0];
const edge = { pos: [3.0, SIT.y, -0.4] as [number, number, number], ry: -90 };

const TOP_KEYS: Key[] = [
  { t: -2, ...lying, pose: holdPhone },
  { t: 0.6, ...lying, pose: holdPhone },
  { t: 0.82, ...lying, pose: POSES.reachUp, ease: 'snap' }, // phone onto the nightstand
  { t: 1.0, ...lying, pose: POSES.reachUp },
  { t: 1.2, ...lying, pose: POSES.lieBack, ease: 'out' },
  { t: 5.8, ...lying, pose: POSES.lieBack },
  { t: 5.95, ...lying, pose: POSES.reachUp, ease: 'snap' }, // alarm off, once
  { t: 6.1, ...lying, pose: POSES.lieBack, ease: 'out' },
  { t: 6.2, ...lying, pose: curl },
  { t: 6.38, pos: [2.6, BED_Y, -1.0], ry: 180, rz: 0, pose: POSES.sitUp, ease: 'back' },
  { t: 6.6, ...edge, pose: SIT.pose, ease: 'inOut' },
  // real motion capture from here: stand up off the edge of the bed, then a yawning stretch
  { t: 7.6, pos: [3.05, HIP, -0.4], ry: -90, pose: POSES.stand, drive: mocap(CLIPS.standUp, { rate: 1.65, travel: 'none' }) },
  { t: 8.62, pos: [3.05, HIP, -0.4], ry: -90, pose: POSES.stand, drive: mocap(CLIPS.stretch, { from: 0.8, rate: 2.3, travel: 'none' }) },
  { t: 8.7, pos: [3.1, HIP, -0.45], ry: 0, pose: POSES.stand, ease: 'snap' },
  { t: 9.25, pos: [7.3, HIP, -0.6], pose: POSES.stand, drive: mocap(CLIPS.walk, { rate: 1.2 }) },
  { t: 9.35, pos: [7.3, HIP, -0.6], ry: -90, pose: POSES.stand, ease: 'snap' },
  { t: 9.42, pos: [7.3, HIP, -0.6], ry: -90, pose: cook },
  { t: 10.05, pos: [7.3, HIP, -0.6], ry: -90, pose: cook },
  { t: 10.12, pos: [7.35, HIP, -0.6], ry: 0, pose: POSES.stand, ease: 'snap' },
  { t: 10.55, pos: [13.45, HIP, -1.05], pose: POSES.stand, drive: mocap(CLIPS.walk, { rate: 1.3 }) },
  { t: 10.62, pos: [13.45, HIP - 0.04, -1.05], ry: -30, pose: POSES.grabBag, ease: 'snap' },
  { t: 10.7, pos: [13.6, HIP, -1.1], ry: 0, pose: POSES.holdBag },
  { t: 10.92, pos: [15.0, HIP, -1.4], pose: POSES.holdBag, drive: mocap(CLIPS.walk, { rate: 1.3, edit: (p) => ({ ...p, rSh: [12, 0, 2], rEl: [0, 0, 10] }) }) },
  { t: 11.02, pos: [15.0, HIP, -1.4], ry: -90, pose: POSES.holdBag, ease: 'snap' },
];

const BOT_KEYS: Key[] = [
  { t: -2, ...lying, pose: holdPhone },
  { t: 1.5, ...lying, pose: holdPhone },
  { t: 1.75, ...lying, pose: holdSide }, // rolls onto his side, phone closer
  { t: 2.95, ...lying, pose: holdSide },
  { t: 3.12, ...lying, pose: holdTired }, // back again: low battery
  { t: 3.28, ...lying, pose: POSES.reachUp, ease: 'snap' }, // plugs it in
  { t: 3.42, ...lying, pose: POSES.reachUp },
  { t: 3.6, ...lying, pose: holdTired, ease: 'out' },
  { t: 4.18, ...lying, pose: holdTired },
  { t: 4.3, ...lying, pose: POSES.lieBack, ease: 'snap' }, // 3:40 AM: phone drops on his face
  { t: 5.8, ...lying, pose: POSES.lieBack },
  { t: 5.95, ...lying, pose: POSES.reachUp, ease: 'snap' },
  { t: 6.1, ...lying, pose: POSES.lieBack, ease: 'out' },
  { t: 6.62, ...lying, pose: POSES.lieBack },
  { t: 6.76, ...lying, pose: POSES.reachUp, ease: 'snap' },
  { t: 6.9, ...lying, pose: POSES.lieBack, ease: 'out' },
  { t: 7.55, ...lying, pose: POSES.lieBack },
  { t: 7.72, ...lying, pose: look },
  { t: 7.85, ...lying, pose: look },
  { t: 7.96, pos: [2.6, BED_Y, -1.0], ry: 180, rz: 0, pose: POSES.sitUp, ease: 'snap' },
  { t: 8.12, pos: [3.1, HIP, -0.15], ry: -90, pose: panic, ease: 'snap' },
  { t: 8.2, pos: [3.2, HIP, -0.3], ry: 0, pose: phoneArm(POSES.stand), ease: 'snap' },
  // motion capture: a real sprint from a standstill, then a full run, still staring at the phone
  { t: 9.2, pos: [8.6, HIP, -0.45], pose: phoneArm(POSES.stand), drive: mocap(CLIPS.runStart, { edit: phoneArm }) },
  { t: 10.3, pos: [15.0, HIP, -1.4], pose: phoneArm(POSES.slump), drive: mocap(CLIPS.run, { edit: phoneArm }) },
  { t: 10.45, pos: [15.0, HIP, -1.4], ry: -90, pose: phoneArm(POSES.slump), ease: 'snap' },
];

// ---------- the rows ----------
type Row = 'top' | 'bottom';
const FEED = ['#e0697f', '#5aa6d9', '#e8c25a', '#7fd18f', '#b38be0', '#f08c5a'];

// the long axis roll (lying on a side), per row
const rollAt = (row: Row, s: number) =>
  row === 'top'
    ? track([[2.9, 0], [3.25, 75], [5.55, 75], [5.8, 0]], s) // turns over once in his sleep
    : track([[1.5, 0], [1.75, -50], [2.95, -50], [3.12, 0]], s);

function rowState(row: Row, s: number, runnerX: number) {
  const top = row === 'top';
  const sky = track([[1.0, 0], [5.8, 1]], s);
  const lights = top ? track([[5.95, 0], [6.4, 1]], s) : track([[7.95, 0], [8.2, 1]], s);
  const st: SetState = {
    lights,
    clock: clockText(s, false),
    doorOpen: track(top ? [[10.75, 0], [10.95, 1]] : [[10.12, 0], [10.32, 1]], s, 'snap'),
    eggs: top ? track([[9.45, 0], [9.65, 1]], s, 'snap') : 0,
    donut: false,
    bagOnHook: !top || s < 10.62,
    water: false,
    t: s,
    sky,
  };
  const camX = top
    ? track([[-2, 2.95], [5.8, 2.95], [6.5, 2.8], [8.7, 2.8], [9.25, 7.3], [10.12, 7.3], [10.6, 14.3]], s)
    : s < 7.7
      ? 2.95
      : s < 8.2
        ? track([[7.7, 2.95], [8.1, 2.6]], s)
        : Math.min(14.3, Math.max(2.6, runnerX + track([[8.2, -0.4], [8.6, 0.3]], s)));
  const camD = top
    ? track([[-2, 3.9], [5.8, 3.6], [6.5, 4.8], [8.7, 4.8], [9.25, 4.4], [10.12, 4.4], [10.6, 4.7]], s)
    : track([[-2, 3.9], [4.2, 3.4], [7.7, 3.4], [8.1, 5.4], [8.6, 4.5], [10.0, 4.5], [10.35, 4.7]], s);
  return { st, camX, camD };
}

function Camera({ x, d, y }: { x: number; d: number; y?: number }) {
  const { camera, size } = useThree();
  const cam = camera as THREE.PerspectiveCamera;
  cam.fov = 30;
  cam.aspect = size.width / size.height;
  cam.near = 0.05;
  cam.far = 60;
  const cy = y ?? 1.55 + d * 0.04;
  cam.position.set(x, cy, d);
  cam.lookAt(x, y !== undefined ? y - 0.12 : 1.1 + (5.6 - d) * 0.05, -0.7);
  cam.updateProjectionMatrix();
  return null;
}

// post passes need a warm-up render: advance once more before Remotion captures the frame
function WarmUp() {
  const { advance } = useThree();
  const frame = useCurrentFrame();
  useLayoutEffect(() => {
    advance(performance.now());
  }, [frame, advance]);
  return null;
}

// real ambient occlusion on every 3D view
function Look({ children }: { children: ReactNode }) {
  return (
    <>
      <WarmUp />
      {children}
      <EffectComposer multisampling={4}>
        <N8AO aoRadius={0.45} intensity={2.2} distanceFalloff={0.8} quality="high" halfRes={false} />
      </EffectComposer>
    </>
  );
}

function Room({ row, s, f, cam }: { row: Row; s: number; f: Sample; cam: { x: number; d: number; y?: number } }) {
  const top = row === 'top';
  const { st } = rowState(row, s, f.pos[0]);
  const feed = FEED[Math.floor(s * 2.8 + 100) % FEED.length];
  const lowBattery = !top && s > 2.95 && s < 3.3;
  const charging = !top && s >= 3.3 && s < 7.98;
  const inHand = top ? s < 0.92 : s < 4.22 || s >= 7.98;
  const onStand = top && s >= 0.92;
  const onFace = !top && s >= 4.22 && s < 7.98;
  const screenOn = top ? s < 0.92 : s < 4.6 || s >= 7.98;
  const screen = lowBattery ? (Math.floor(s * 8) % 2 ? '#e04848' : '#3a1214') : feed;
  const inBed = (top && s < 6.4) || (!top && s < 7.96);
  const hasBag = top && s >= 10.62;
  const sway = Math.sin(s * 9) * 0.18;
  const roll = (rollAt(row, s) * Math.PI) / 180;
  const breath = 1 + 0.035 * Math.sin(s * 2.6);
  const night = 1 - st.lights;
  return (
    <>
      <Camera {...cam} />
      <Lights L={st.lights} camX={cam.x} moon={night * 0.9} />
      <Apartment st={st} />
      <BedroomProps messy={!top} curtainsOpen={top ? 1 : 0.35} />
      {/* blanket: breathing while he sleeps */}
      {inBed ? (
        <group position={[2.1, 0.68, -1.0]} scale={[1, s > 1.2 && (top || s > 4.3) ? breath : 1, 1]}>
          <Box p={[0, 0, 0]} s={[1.4, 0.18, 1.08]} c="#34407e" />
        </group>
      ) : top ? (
        <Box p={[2.25, 0.62, -1.0]} s={[2.1, 0.06, 1.06]} c="#34407e" />
      ) : (
        <Box p={[2.3, 0.05, -0.3]} s={[1.0, 0.1, 0.6]} c="#34407e" />
      )}
      {onStand && <Phone position={[4.05, 0.652, -1.12]} rotation={[-Math.PI / 2, 0, 0.3]} on={s > 5.8 && s < 5.95} screen="#f2f2f2" />}
      {charging && (
        // the charger cable from the wall socket up to the bed
        <mesh position={[3.9, 0.45, -1.35]} rotation={[0, 0, 0.9]}>
          <cylinderGeometry args={[0.008, 0.008, 0.6, 6]} />
          <meshLambertMaterial color="#e8e8ea" />
        </mesh>
      )}
      {!top && screenOn && s < 4.6 && <pointLight position={[3.05, 1.3, -0.65]} color="#8fb0ff" intensity={1.1} distance={2.2} decay={2} />}
      {!inBed && <FigureShadow x={f.pos[0]} z={f.pos[2]} h={Math.max(0, f.pos[1] - HIP)} />}
      <group position={f.pos} rotation={[0, (f.ry * Math.PI) / 180, (f.rz * Math.PI) / 180, 'YZX']}>
        <group rotation={[0, roll, 0]}>
          <StickFigure
            pose={f.pose}
            color={top ? '#f4f4f4' : '#a9adb4'}
            emissive={top ? 0.3 : 0.25}
            rightHand={
              hasBag ? (
                s >= 11.02 ? <Bag position={[0, 0.02, 0.2]} rotation={[0, Math.PI / 2, 0]} /> : <Bag position={[0, 0.02, 0.11]} rotation={[0, 0, sway]} />
              ) : inHand ? (
                <group scale={1.45}>
                  <Phone position={[0, -0.06, 0.03]} rotation={[0, Math.PI, 0]} screen={screen} on={screenOn} />
                </group>
              ) : undefined
            }
            head={onFace ? <Phone position={[0.165, 0, 0]} rotation={[0, Math.PI / 2, 0]} on={false} /> : undefined}
          />
        </group>
      </group>
      {top && <Steam t={s - 5.55} />}
      {top && <Zzz t={s} from={1.4} to={5.7} />}
      {!top && <Zzz t={s} from={4.55} to={5.75} />}
      {!top && <Zzz t={s} from={6.2} to={6.6} />}
      {!top && <Zzz t={s} from={7.0} to={7.5} />}
      {!top && s > 7.85 && s < 8.5 && (
        <Sprite tex={glyphTex('!')} p={[f.pos[0] + 0.05, f.pos[1] + 1.25, f.pos[2]]} s={0.35 * Math.min(1, (s - 7.85) * 12)} />
      )}
    </>
  );
}

function RowScene({ row, s }: { row: Row; s: number }) {
  const f = withLag(row === 'top' ? TOP_KEYS : BOT_KEYS, s);
  const { camX, camD } = rowState(row, s, f.pos[0]);
  return (
    <Look>
      <Room row={row} s={s} f={f} cam={{ x: camX, d: camD }} />
    </Look>
  );
}

const PANS: Record<Row, [number, number][]> = { top: [[8.72, 9.25], [10.12, 10.6]], bottom: [[8.35, 10.3]] };

function PanelCanvas({ row }: { row: Row }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <ThreeCanvas width={W} height={PANEL_H} shadows="soft" gl={{ antialias: true, preserveDrawingBuffer: true }} style={{ background: '#08080b' }}>
      <RowScene row={row} s={frame / fps - INTRO} />
    </ThreeCanvas>
  );
}

function Panel({ row, y }: { row: Row; y: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = frame / fps - INTRO;
  const panning = PANS[row].some(([a, b]) => s > a && s < b);
  return (
    <div style={{ position: 'absolute', left: 0, top: y, width: W, height: PANEL_H, overflow: 'hidden' }}>
      {panning ? (
        <CameraMotionBlur samples={5} shutterAngle={240}>
          <PanelCanvas row={row} />
        </CameraMotionBlur>
      ) : (
        <PanelCanvas row={row} />
      )}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.38) 100%)' }} />
    </div>
  );
}

const TOP_LABELS: [number, string][] = [[0.6, 'PHONE DOWN'], [1.3, 'ASLEEP BY 11:10'], [5.8, 'UP AT 7:00'], [9.3, 'BREAKFAST'], [10.6, 'OUT THE DOOR']];
const BOT_LABELS: [number, string][] = [
  [0.0, 'ONE MORE VIDEO'],
  [1.6, 'ONE MORE'],
  [2.4, 'STILL SCROLLING'],
  [2.95, '2% BATTERY'],
  [3.35, 'CHARGING. SCROLLING.'],
  [4.2, 'ASLEEP AT 3:40'],
  [5.95, 'SNOOZE'],
  [6.76, 'SNOOZE ×2'],
  [7.86, 'LATE!'],
  [9.0, 'NO BREAKFAST'],
];

function NightClock({ s }: { s: number }) {
  const k = Math.min(1, minutesAt(s) / 480);
  const r = 34;
  const c = 2 * Math.PI * r;
  const [hm, ap] = clockText(s).split(' ');
  const pulse = 1 + 0.14 * Math.max(0, 1 - Math.abs(s - NIGHT_B) / 0.18);
  return (
    <div style={{ position: 'absolute', left: W / 2 - 46, top: (TOP_Y + PANEL_H + BOT_Y) / 2 - 46, width: 92, height: 92, transform: `scale(${pulse})` }}>
      <svg width="92" height="92">
        <circle cx="46" cy="46" r={r} fill="#050506" stroke="#2a2a30" strokeWidth="4" />
        <circle cx="46" cy="46" r={r} fill="none" stroke="white" strokeWidth="4" strokeDasharray={`${c * k} ${c}`} transform="rotate(-90 46 46)" strokeLinecap="round" />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily, color: 'white', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 19 }}>{hm}</div>
        <div style={{ fontWeight: 600, fontSize: 11, opacity: 0.6, letterSpacing: '0.14em', marginTop: 3 }}>{ap}</div>
      </div>
    </div>
  );
}

// ---------- the hook: a tight shot of the phone lighting his face, then pull out ----------
function IntroScene({ s }: { s: number }) {
  const f = withLag(BOT_KEYS, s);
  const k = track([[-1, 0], [-0.1, 1]], s);
  return (
    <Look>
      <Room row="bottom" s={s} f={f} cam={{ x: 3.68 - 0.15 * k, d: 3.1 + 0.8 * k, y: 1.2 }} />
    </Look>
  );
}

function Intro({ t }: { t: number }) {
  const s = t - INTRO;
  const out = interpolate(t, [0.82, 1.05], [0, 1], clampX);
  const typed = 'ONE MORE VIDEO.'.slice(0, Math.max(0, Math.floor((t - 0.15) * 30)));
  return (
    <AbsoluteFill style={{ opacity: 1 - out, transform: `scale(${1 - 0.25 * out})` }}>
      <ThreeCanvas width={W} height={1920} shadows="soft" gl={{ antialias: true, preserveDrawingBuffer: true }} style={{ background: '#08080b' }}>
        <IntroScene s={s} />
      </ThreeCanvas>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 45%, rgba(0,0,0,0.5) 100%)' }} />
      <div style={{ position: 'absolute', top: 300, width: W, textAlign: 'center', fontFamily, fontWeight: 700, fontSize: 58, letterSpacing: '0.14em', color: 'white' }}>{typed}</div>
      <div style={{ position: 'absolute', top: 390, width: W, textAlign: 'center', fontFamily, fontWeight: 600, fontSize: 26, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.6)' }}>11:00 PM</div>
    </AbsoluteFill>
  );
}

// ---------- the loop ending: night 2, the same bed. This time the phone goes down. ----------
const N2_KEYS: Key[] = [
  { t: -1, ...lying, pose: holdPhone },
  { t: 0.9, ...lying, pose: { ...holdPhone(0), neck: [0, 0, 24] } }, // stops scrolling, looks at it
  { t: 1.35, ...lying, pose: { ...holdPhone(0), neck: [0, 0, 24] } },
  { t: 1.55, ...lying, pose: POSES.reachUp, ease: 'snap' }, // face down on the nightstand
  { t: 1.7, ...lying, pose: POSES.reachUp },
  { t: 1.95, ...lying, pose: POSES.lieBack, ease: 'out' },
];

function Night2Scene({ e }: { e: number }) {
  const f = withLag(N2_KEYS, e);
  const inHand = e < 1.62;
  const st: SetState = { lights: 0, clock: '11:00', doorOpen: 0, eggs: 0, donut: false, bagOnHook: true, water: false, t: e, sky: 0 };
  const breath = 1 + 0.035 * Math.sin(e * 2.6);
  return (
    <Look>
      <Camera x={3.3} d={4.9 - 0.4 * Math.min(1, e / 3)} y={1.2} />
      <Lights L={0} camX={3.0} moon={0.9} />
      <Apartment st={st} />
      <BedroomProps messy={false} curtainsOpen={1} />
      <group position={[2.1, 0.68, -1.0]} scale={[1, e > 2 ? breath : 1, 1]}>
        <Box p={[0, 0, 0]} s={[1.4, 0.18, 1.08]} c="#34407e" />
      </group>
      {!inHand && <Phone position={[4.05, 0.652, -1.12]} rotation={[-Math.PI / 2, 0, 0.3]} on={false} />}
      {inHand && <pointLight position={[3.05, 1.3, -0.65]} color="#8fb0ff" intensity={1.1} distance={2.2} decay={2} />}
      <group position={f.pos} rotation={[0, (f.ry * Math.PI) / 180, (f.rz * Math.PI) / 180, 'YZX']}>
        <StickFigure
          pose={f.pose}
          color="#a9adb4"
          emissive={0.25}
          rightHand={
            inHand ? (
              <group scale={1.45}>
                <Phone position={[0, -0.06, 0.03]} rotation={[0, Math.PI, 0]} screen={FEED[Math.floor(e * 2.8 + 10) % FEED.length]} on={e < 0.9} />
              </group>
            ) : undefined
          }
        />
      </group>
      <Zzz t={e} from={2.3} to={9} />
    </Look>
  );
}

function Night2({ s }: { s: number }) {
  const e = s - NIGHT2;
  const typed = 'SAME BED.\nDIFFERENT NIGHT.'.slice(0, Math.max(0, Math.floor((e - 1.1) * 30)));
  const lab = 'NIGHT 2'.slice(0, Math.max(0, Math.floor((e - 0.05) * 30)));
  return (
    <AbsoluteFill>
      <ThreeCanvas width={W} height={1920} shadows="soft" gl={{ antialias: true, preserveDrawingBuffer: true }} style={{ background: '#08080b' }}>
        <Night2Scene e={e} />
      </ThreeCanvas>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 45%, rgba(0,0,0,0.5) 100%)' }} />
      <div style={{ position: 'absolute', left: 48, top: 120, fontFamily, color: 'white', letterSpacing: '0.16em' }}>
        <div style={{ fontSize: 34, fontWeight: 700 }}>{lab}</div>
        <div style={{ fontSize: 20, fontWeight: 600, opacity: 0.6, marginTop: 4 }}>{e > 0.4 ? '11:00 PM' : ''}</div>
      </div>
      <div style={{ position: 'absolute', top: 1500, width: W, textAlign: 'center', fontFamily, fontWeight: 700, fontSize: 44, letterSpacing: '0.16em', color: 'white', whiteSpace: 'pre-line', lineHeight: 1.45 }}>
        {typed}
      </div>
    </AbsoluteFill>
  );
}

// ---------- sound ----------
const S = (x: number) => x + INTRO; // story time → video time
const taps = Array.from({ length: 30 }, (_, i) => -0.8 + i * 0.17 + ((i * 7) % 5) * 0.02).filter((x) => x < 4.15 && !(x > 2.95 && x < 3.5));
const CUES: [number, string, number][] = [
  ...taps.map((x): [number, string, number] => [S(x), 'click', 0.16]),
  [S(0.84), 'click', 0.5], [S(1.15), 'rustle', 0.4], [S(1.6), 'rustle', 0.35], [S(3.0), 'beep', 0.25], [S(3.3), 'click', 0.5],
  [S(4.24), 'thud', 0.9], [S(4.26), 'crack', 0.35],
  [S(5.8), 'beep', 0.9], [S(5.95), 'click', 0.5], [S(6.6), 'beep', 0.8], [S(6.76), 'click', 0.5],
  [S(6.1), 'switch', 0.4], [S(6.38), 'creak', 0.4], [S(7.0), 'creak', 0.3], [S(7.7), 'rustle', 0.35],
  [S(7.86), 'tick', 0.6], [S(7.9), 'rustle', 0.8], [S(7.96), 'creak', 0.5],
  [S(8.72), 'whoosh', 0.6], [S(8.35), 'whoosh', 0.5], [S(10.12), 'whoosh', 0.6],
  [S(9.43), 'crack', 0.7], [S(9.47), 'sizzle', 0.5],
  [S(10.12), 'click', 0.6], [S(10.14), 'door', 0.5], [S(10.62), 'rustle', 0.4], [S(10.75), 'click', 0.6], [S(10.77), 'door', 0.6],
  [S(10.95), 'riser', 0.7], [S(11.1), 'tone', 0.7],
  [S(NIGHT2 + 1.55), 'click', 0.6], [S(NIGHT2 + 1.62), 'thud', 0.35], [S(NIGHT2 + 1.95), 'rustle', 0.4],
];
const steps = (a: number, b: number, every: number, vol: number) =>
  Array.from({ length: Math.floor((b - a) / every) }, (_, i): [number, number] => [S(a + 0.05 + i * every), vol]);
const STEPS: [number, number][] = [
  ...steps(8.7, 9.25, 0.45, 0.35),
  ...steps(10.12, 10.55, 0.42, 0.35),
  ...steps(10.7, 10.92, 0.42, 0.35),
  ...steps(8.2, 10.3, 0.3, 0.5),
];

function Sound() {
  const { fps } = useVideoConfig();
  return (
    <>
      <Audio src={staticFile('sfx/omv-music.wav')} volume={0.85} />
      {CUES.map(([at, name, vol], i) => (
        <Sequence key={`${name}${at}${i}`} from={Math.round(at * fps)}>
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

export function OneMoreVideo() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const s = t - INTRO;
  const flash = interpolate(s, [FLASH - 0.15, FLASH + 0.1, FLASH + 0.15, NIGHT2 + 0.2], [0, 1, 1, 0], clampX);
  const fadeIn = interpolate(t, [0, 0.12], [1, 0], clampX);
  const fadeOut = interpolate(t, [OMV_TOTAL - 0.45, OMV_TOTAL], [0, 1], clampX);
  const split = interpolate(t, [0.82, 1.05], [0, 1], clampX);
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      {s < NIGHT2 ? (
        <>
          {t > 0.8 && (
            <AbsoluteFill style={{ opacity: split }}>
              <Panel row="top" y={TOP_Y} />
              <Panel row="bottom" y={BOT_Y} />
              <Label y={TOP_Y} title="LIGHTS OUT" subs={TOP_LABELS} t={s} />
              <Label y={BOT_Y} title="ONE MORE VIDEO" subs={BOT_LABELS} t={s} strike={10.5} />
              <NightClock s={s} />
            </AbsoluteFill>
          )}
          {t < 1.06 && <Intro t={t} />}
        </>
      ) : (
        <Night2 s={s} />
      )}
      <AbsoluteFill style={{ background: '#fff8e8', opacity: flash }} />
      <Grain />
      <AbsoluteFill style={{ background: '#000', opacity: Math.max(fadeIn, fadeOut) }} />
      <Sound />
    </AbsoluteFill>
  );
}
