// "THE GATE": an original hook in the genre of @neuronvisuals' "you become what you feed your
// mind" (people walk through a giant phone and come out as scrollers), then the fix, then a demo.
// One row, one giant phone. Upright people walk in, hunched scrollers shuffle out. At bedtime the
// phone's apps go to sleep (its screen becomes the real Locturne asleep Home), everyone looks up,
// and the camera pushes into that screen and cuts to real phone screenshots of the app.
import { ThreeCanvas } from '@remotion/three';
import { useLoader, useThree } from '@react-three/fiber';
import { EffectComposer, N8AO } from '@react-three/postprocessing';
import { useLayoutEffect, useMemo, type ReactNode } from 'react';
import * as THREE from 'three';
import { AbsoluteFill, Audio, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { DEMO_LEN, Demo, EDGE, Typed, fontFamily } from '../demo/Demo';
import { Face, blink } from '../five/face';
import { Phone } from '../five/set';
import { StickFigure, lerpPose, type Pose } from '../five/rig';
import { CLIPS, clipAt, clipLength } from '../five/mocap';
import { track } from '../five/track';
import { FigureShadow, Grain } from '../five/FiveMinutes';


export const GATE_FPS = 60;
const SLEEP = 5.2; // bedtime: the apps go to sleep
const PUSH_A = 8.0; // the camera starts into the screen
const CUT = 8.9; // cut to the real app
export const GATE_TOTAL = CUT + DEMO_LEN + 1.3;
export const GATE_FRAMES = Math.round(GATE_TOTAL * GATE_FPS);
const W = 1080;
const H = 1920;
const clampX = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const DEG = Math.PI / 180;

// ---------- the people ----------
const PRE = 30; // the line has been walking for a while before frame 0
const GAP = 2.0; // spacing in the queue
const V = 1.4; // walking speed, units/s
const V2 = 0.95; // scrolling speed
const LAP = CLIPS.walk.frames[CLIPS.walk.frames.length - 1].x;
const smooth = (k: number) => {
  const c = Math.min(1, Math.max(0, k));
  return c * c * (3 - 2 * c);
};
// hunched over a phone held in both hands
const scroller = (p: Pose): Pose => ({
  ...p,
  spine: [0, 0, p.spine[2] - 20],
  neck: [0, 0, -30],
  rSh: [10, 0, 30],
  rEl: [0, 0, 112],
  lSh: [10, 0, 26],
  lEl: [0, 0, 118],
  lHip: [0, 0, p.lHip[2] * 0.6 + 12],
  rHip: [0, 0, p.rHip[2] * 0.6 + 12],
});
const FEED = ['#e0697f', '#5aa6d9', '#e8c25a', '#7fd18f', '#b38be0', '#f08c5a'];
const UP = new THREE.Color('#f4f4f4');
const DOWN = new THREE.Color('#a2a6b2');

type Person = { x: number; y: number; pose: Pose; k: number; phoneOn: boolean; i: number };
function people(t: number): Person[] {
  const T = t + PRE;
  const out: Person[] = [];
  for (let i = -6; i < 60; i++) {
    const tc = (i * GAP) / V; // when this one reaches the phone
    let x: number;
    let k = 0;
    let phoneOn = false;
    if (T < tc) x = V * (T - tc);
    else if (tc < SLEEP + PRE) {
      // went in while the apps were awake: comes out scrolling
      const xs = V2 * (SLEEP + PRE - tc); // where they are when the apps go to sleep
      const tw = SLEEP + PRE + 0.2 + Math.max(0, 7 - xs) * 0.1; // the one furthest ahead looks up first, so nobody walks into anybody
      x = V2 * (T - tc) + (V - V2) * Math.max(0, T - tw - 0.45);
      k = smooth((x + 0.05) / 0.45) * (1 - smooth((T - tw) / 0.5));
      phoneOn = T < tw - 0.05;
    } else x = V * (T - tc);
    if (x < -5 || x > 7.5) continue;
    const f = clipAt(CLIPS.walk, ((x + 400 * LAP) / LAP) * clipLength(CLIPS.walk));
    out.push({ x, y: f.y, pose: k > 0 ? lerpPose(f.pose, scroller(f.pose), k) : f.pose, k, phoneOn, i });
  }
  return out;
}

// ---------- the giant phone ----------
const GW = 1.62;
const GH = 3.34;
const SW = 1.46;
const SH = SW * (2796 / 1290);
const GATE_ROT = -40 * DEG; // the screen faces the people walking in, and a little towards us
const NORMAL: [number, number, number] = [Math.sin(GATE_ROT), 0, Math.cos(GATE_ROT)];
const SCREEN_C: [number, number, number] = [NORMAL[0] * 0.075, GH / 2 + 0.02, NORMAL[2] * 0.075];

function rounded(w: number, h: number, r: number) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

// an endless feed: thumbnails, a name line, a like row. Nobody's app in particular.
function feedTexture() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 2048;
  const g = c.getContext('2d')!;
  g.fillStyle = '#141829';
  g.fillRect(0, 0, 512, 2048);
  const cols = ['#5a6fd8', '#7a5ad8', '#4f8fe0', '#8a6fe8', '#5a7fe8', '#6a5fd0', '#4f6fd0', '#7f7fe8'];
  for (let i = 0; i < 8; i++) {
    const y = i * 256;
    g.fillStyle = '#c9d0ee';
    g.beginPath();
    g.arc(52, y + 34, 18, 0, 7);
    g.fill();
    g.fillRect(84, y + 24, 150, 9);
    g.fillStyle = '#7d86ad';
    g.fillRect(84, y + 40, 90, 7);
    g.fillStyle = cols[i];
    g.beginPath();
    g.roundRect(26, y + 66, 460, 150, 18);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,0.85)';
    g.beginPath();
    g.moveTo(236, y + 116);
    g.lineTo(236, y + 166);
    g.lineTo(284, y + 141);
    g.fill();
    g.fillStyle = '#e0697f';
    g.beginPath();
    g.arc(44, y + 236, 8, 0, 7);
    g.fill();
    g.fillStyle = '#7d86ad';
    g.fillRect(64, y + 232, 60, 7);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapT = THREE.RepeatWrapping;
  return t;
}

function Gate({ t }: { t: number }) {
  const asleepSrc = useLoader(THREE.TextureLoader, staticFile('demo/asleep.png'));
  const { body, glass, feed, asleep } = useMemo(() => {
    const b = new THREE.ExtrudeGeometry(rounded(GW, GH, 0.2), { depth: 0.14, bevelEnabled: false, curveSegments: 10 });
    b.translate(0, 0, -0.07);
    const gl = new THREE.ShapeGeometry(rounded(SW, SH, 0.15), 10);
    const fd = feedTexture();
    fd.repeat.set(1 / SW, 0.42 / SH);
    const as = asleepSrc.clone();
    as.colorSpace = THREE.SRGBColorSpace;
    as.repeat.set(1 / SW, 1 / SH);
    as.offset.set(0.5, 0.5);
    as.needsUpdate = true;
    return { body: b, glass: gl, feed: fd, asleep: as };
  }, [asleepSrc]);
  const off = track([[SLEEP - 0.05, 0], [SLEEP + 0.5, 1]], t);
  // the feed scrolls in flicks, like a thumb
  const flick = Math.floor(t * 2.2) + smooth(((t * 2.2) % 1) / 0.35);
  feed.offset.set(0.5, 0.5 + flick * 0.125);
  return (
    <group position={[0, GH / 2 + 0.02, 0]} rotation={[0, GATE_ROT, 0]}>
      <mesh geometry={body} castShadow>
        <meshLambertMaterial color="#1b1c22" />
      </mesh>
      <mesh geometry={glass} position={[0, 0, 0.073]}>
        <meshBasicMaterial map={feed} />
      </mesh>
      <mesh geometry={glass} position={[0, 0, 0.076]}>
        <meshBasicMaterial map={asleep} transparent opacity={off} />
      </mesh>
      {/* the screen lights whoever is standing in front of it */}
      <pointLight position={[0, -0.4, 1.3]} color={off > 0.5 ? '#6f86c8' : '#8fa0ff'} intensity={5 - 2.5 * off} distance={4.5} decay={1.6} />
    </group>
  );
}

// ---------- the 3D scene ----------
const CAM_A: [number, number, number] = [0.8, 2.9, 19.5];
const LOOK_A: [number, number, number] = [0.8, 2.3, 0];
const CAM_B: [number, number, number] = [SCREEN_C[0] + NORMAL[0] * 4.7, SCREEN_C[1], SCREEN_C[2] + NORMAL[2] * 4.7];
const mix3 = (a: number[], b: number[], k: number) => a.map((v, j) => v + (b[j] - v) * k) as [number, number, number];

function Camera({ t }: { t: number }) {
  const { camera, size } = useThree();
  const cam = camera as THREE.PerspectiveCamera;
  const k = track([[PUSH_A, 0], [CUT + 0.05, 1]], t);
  const drift = 0.25 * Math.sin(t * 0.35);
  const a: [number, number, number] = [CAM_A[0] + drift, CAM_A[1], CAM_A[2] - t * 0.12];
  const p = mix3(a, CAM_B, k);
  const l = mix3(LOOK_A, SCREEN_C, k);
  cam.fov = 30;
  cam.aspect = size.width / size.height;
  cam.near = 0.05;
  cam.far = 80;
  cam.position.set(...p);
  cam.lookAt(...l);
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

export function Look({ children }: { children: ReactNode }) {
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

function Scene({ t }: { t: number }) {
  const ps = people(t);
  return (
    <Look>
      <Camera t={t} />
      <fog attach="fog" args={['#050507', 19, 34]} />
      <ambientLight color="#8b96c4" intensity={0.95} />
      <hemisphereLight args={['#c9d3ff', '#0b0b12', 0.5]} />
      <directionalLight
        position={[4, 9, 7]}
        intensity={0.9}
        color="#dfe6ff"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-9}
        shadow-camera-right={9}
        shadow-camera-top={6}
        shadow-camera-bottom={-3}
        shadow-bias={-0.0008}>
        <object3D attach="target" position={[1, 0, 0]} />
      </directionalLight>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[80, 50]} />
        <meshLambertMaterial color="#2a2a35" />
      </mesh>
      <Gate t={t} />
      {ps.map((p) => (
        <group key={p.i}>
          <FigureShadow x={p.x} z={0} h={0} />
          <group position={[p.x, p.y, 0]}>
            <StickFigure
              pose={p.pose}
              color={`#${UP.clone().lerp(DOWN, p.k).getHexString()}`}
              emissive={0.3 - 0.08 * p.k}
              head={<Face eyes={p.k > 0.5 ? 'half' : blink(t, 'open', 2.3, p.i * 0.37)} size={1.6} />}
              rightHand={
                p.k > 0.45 ? (
                  <group scale={2.1}>
                    <Phone position={[0, -0.05, -0.03]} rotation={[0, 0.75, 0]} screen={FEED[(Math.floor(t * 2.8) + p.i * 3 + 600) % FEED.length]} on={p.phoneOn} />
                    {/* the feed on his face */}
                    {p.phoneOn && <pointLight position={[0, 0, -0.12]} color={FEED[(Math.floor(t * 2.8) + p.i * 3 + 600) % FEED.length]} intensity={0.5} distance={0.9} decay={1.5} />}
                  </group>
                ) : undefined
              }
            />
          </group>
        </group>
      ))}
    </Look>
  );
}

// ---------- the words ----------
function nightClock(t: number) {
  const m = (23 * 60 + Math.max(0, t) * 36.5) % (24 * 60);
  const h = Math.floor(m / 60);
  return `${((h + 11) % 12) + 1}:${String(Math.floor(m % 60)).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

function HookWords({ t }: { t: number }) {
  const a = interpolate(t, [SLEEP - 0.25, SLEEP], [1, 0], clampX);
  const b = interpolate(t, [PUSH_A + 0.1, PUSH_A + 0.5], [1, 0], clampX);
  return (
    <>
      <div style={{ opacity: a }}>
        <Typed text={'Nobody plans to\nscroll until 2 AM.'} t={t} at={0.12} top={400} size={78} />
        <div style={{ position: 'absolute', top: 612, width: W, textAlign: 'center', fontFamily, fontWeight: 800, fontSize: 46, color: '#ffd84a', fontVariantNumeric: 'tabular-nums', ...EDGE }}>
          {nightClock(t)}
        </div>
      </div>
      <div style={{ opacity: b }}>
        <Typed text={'So give your apps\na bedtime.'} t={t} at={SLEEP + 0.15} top={400} size={78} />
      </div>
    </>
  );
}

// ---------- sound: one real track, nothing synthesised ----------
function Sound() {
  const { fps } = useVideoConfig();
  return <Audio src={staticFile('audio/music.mp3')} volume={(fr) => 0.6 * interpolate(fr / fps, [0, 0.3, GATE_TOTAL - 0.8, GATE_TOTAL], [0, 1, 1, 0], clampX)} />;
}

export function PhoneGate() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const fadeIn = interpolate(t, [0, 0.12], [1, 0], clampX);
  const fadeOut = interpolate(t, [GATE_TOTAL - 0.4, GATE_TOTAL], [0, 1], clampX);
  return (
    <AbsoluteFill style={{ background: '#050507' }}>
      {t < CUT ? (
        <>
          <ThreeCanvas width={W} height={H} shadows="soft" gl={{ antialias: true, preserveDrawingBuffer: true }} style={{ background: '#050507' }}>
            <Scene t={t} />
          </ThreeCanvas>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 52%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.6) 90%)', opacity: interpolate(t, [PUSH_A, CUT], [1, 0], clampX) }} />
          <HookWords t={t} />
        </>
      ) : (
        <Demo d={t - CUT} />
      )}
      <Grain />
      <AbsoluteFill style={{ background: '#000', opacity: Math.max(fadeIn, fadeOut) }} />
      <Sound />
    </AbsoluteFill>
  );
}
