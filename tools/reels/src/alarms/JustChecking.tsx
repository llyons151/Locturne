// "JUST CHECKING THE TIME": an original reel in the genre of @jevon_animations' "me every time"
// (one bedroom, big time stamps, a repeat joke that escalates into a panic). Ours: the alarm
// works; the phone is what keeps him in bed. 7:00 → "just checking the time" → 8:59. Then the
// panic cuts straight to a few seconds of the real app, and the end runs back into the start (a loop).
import { ThreeCanvas } from '@remotion/three';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Demo, EDGE, Typed, fontFamily } from '../demo/Demo';
import { Apartment, Box, Phone, glyphTex, type SetState } from '../five/set';
import { POSES, StickFigure, type Pose } from '../five/rig';
import { track, type Key } from '../five/track';
import { Grain, Lights, Sprite, Zzz, withLag } from '../five/FiveMinutes';
import { Face, blink, type Eyes } from '../five/face';
import { BedroomProps } from '../night/props';
import { Look } from '../gate/PhoneGate';

export const JC_FPS = 60;
const W = 1080;
const PANEL_Y = 520; // phone safe zone: nothing in the top ~250 px or the bottom ~420 px, where the Reels and TikTok buttons sit
const PANEL_H = 900;
const clampX = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

// story times
const MORNING = 1.7; // the fade up on 7:00
const LATE = 5.3; // 8:59
const CUT = 6.5; // straight from the panic to the real app
const SHORT = 3.5; // seconds of app (public/demo/demo-short.mp4)
export const JC_TOTAL = CUT + SHORT + 1.1;
export const JC_FRAMES = Math.round(JC_TOTAL * JC_FPS);

// ---------- the time stamps ----------
// [from, stamp, the line under the room]
const STAMPS: [number, string, string][] = [
  [MORNING, '7:00', "Alarm. I'm up."],
  [2.5, '7:01', 'Just checking the time'],
  [3.25, '7:20', 'One video'],
  [3.95, '7:50', 'Ok one more'],
  [4.65, '8:25', 'Still in bed'],
  [LATE, '8:59', ''],
  [LATE + 0.7, '8:59', 'Never again.'],
];
const stampAt = (s: number) => [...STAMPS].reverse().find(([at]) => s >= at);

// ---------- poses ----------
const BED_Y = 0.71;
const lying = { pos: [2.6, BED_Y, -1.0] as [number, number, number], ry: 180, rz: 90 };
const P = (p: Partial<Pose>): Pose => ({ ...POSES.lieBack, ...p });
// every hold breathes and nods a little, so nothing is ever a frozen pose
const nod = (t: number, a = 3) => a * Math.sin(t * 2.1);
const thumb = (t: number, rate: number) => 6 * Math.max(0, Math.sin(t * rate));
const holdPhone = (t: number) => P({ rSh: [0, 0, 96 + nod(t, 1.5)], rEl: [0, 0, 34 + thumb(t, 15)], lSh: [0, 0, 92], lEl: [0, 0, 40], neck: [0, 0, 12 + nod(t)] });
const holdClose = (t: number) => P({ rSh: [0, 0, 80 + nod(t, 1.5)], rEl: [0, 0, 62 + thumb(t, 13)], lSh: [0, 0, 76], lEl: [0, 0, 70], neck: [0, 0, 16 + nod(t)] });
const holdTired = (t: number) => P({ rSh: [0, 0, 84 + nod(t, 4)], rEl: [0, 0, 50 + thumb(t, 9)], lSh: [0, 0, 78], lEl: [0, 0, 56], neck: [0, 0, 2 + nod(t, 5)] });
const asleep = (t: number) => P({ lSh: [8, 0, 2 * Math.sin(t * 2.6)], rSh: [8, 0, 2 * Math.sin(t * 2.6)] });
const stare = (t: number) => P({ rSh: [0, 0, 96], rEl: [0, 0, 36], lSh: [0, 0, 92], lEl: [0, 0, 40], neck: [0, 0, 26 + nod(t, 1.5)] });
const windUp: Pose = P({ rSh: [0, 0, 40], rEl: [0, 0, 70] }); // the arm cocks back before the slap
const panic = (t: number): Pose => ({ ...POSES.sitUp, lSh: [50, 0, 62 + 5 * Math.sin(t * 30)], rSh: [50, 0, 62 + 5 * Math.sin(t * 30)], lEl: [0, 0, 80], rEl: [0, 0, 80], neck: [0, 0, 10 + 4 * Math.sin(t * 24)] });
const upright = { pos: [2.6, BED_Y, -1.0] as [number, number, number], ry: 180, rz: 0 };

const KEYS: Key[] = [
  // last night
  { t: -2, ...lying, pose: holdPhone },
  { t: 0.85, ...lying, pose: holdPhone },
  { t: 1.1, ...lying, pose: POSES.reachUp, ease: 'back' }, // phone onto the nightstand
  { t: 1.22, ...lying, pose: POSES.reachUp },
  { t: 1.5, ...lying, pose: asleep, ease: 'out' },
  // 7:00: alarm off, then "just checking the time"
  { t: MORNING + 0.2, ...lying, pose: asleep },
  { t: MORNING + 0.3, ...lying, pose: windUp, ease: 'out' },
  { t: MORNING + 0.42, ...lying, pose: POSES.reachUp, ease: 'snap' },
  { t: MORNING + 0.62, ...lying, pose: POSES.reachUp },
  { t: MORNING + 0.95, ...lying, pose: holdPhone, ease: 'inOut' },
  { t: 3.95, ...lying, pose: holdPhone },
  { t: 4.2, ...lying, pose: holdClose, ease: 'inOut' },
  { t: 4.65, ...lying, pose: holdClose },
  { t: 4.95, ...lying, pose: holdTired, ease: 'inOut' },
  { t: LATE, ...lying, pose: holdTired },
  { t: LATE + 0.14, ...lying, pose: stare, ease: 'snap' }, // sees 8:59
  { t: LATE + 0.42, ...lying, pose: stare },
  { t: LATE + 0.62, ...upright, pose: panic, ease: 'snap' },
  { t: CUT + 0.2, ...upright, pose: panic },
];

function eyesAt(s: number): Eyes {
  if (s < 1.1) return blink(s, 'half', 1.9);
  if (s < MORNING + 0.3) return 'closed';
  if (s < MORNING + 0.95) return 'half';
  if (s < 3.95) return blink(s, 'open');
  if (s < LATE) return blink(s, 'half', 1.4);
  return 'wide';
}

const FEED = ['#e0697f', '#5aa6d9', '#e8c25a', '#7fd18f', '#b38be0', '#f08c5a'];

function Camera({ x, d, shake }: { x: number; d: number; shake: number }) {
  const { camera, size } = useThree();
  const cam = camera as THREE.PerspectiveCamera;
  cam.fov = 30;
  cam.aspect = size.width / size.height;
  cam.near = 0.05;
  cam.far = 60;
  cam.position.set(x + shake, 1.5 + shake * 0.6, d);
  cam.lookAt(x + shake, 1.32, -0.7);
  cam.updateProjectionMatrix();
  return null;
}

function Room({ s }: { s: number }) {
  const f = withLag(KEYS, s);
  const night = s < MORNING - 0.3;
  // the day outside: night, then dawn; it gets later while he scrolls
  const day = night ? 0 : track([[MORNING, 0.35], [LATE, 1]], s);
  const st: SetState = {
    lights: night ? 0 : 0.18 + 0.4 * day,
    clock: night ? '1:07' : (stampAt(s)?.[1] ?? '7:00'),
    doorOpen: 0,
    eggs: 0,
    donut: false,
    bagOnHook: true,
    water: false,
    t: s,
    sky: night ? 0 : 1,
  };
  const grabbed = s >= MORNING + 0.55;
  const inHand = s < 1.14 || (s >= MORNING && grabbed);
  const ringing = s >= MORNING && s < MORNING + 0.42;
  const scrolling = inHand && s < LATE + 0.1;
  const screen = FEED[Math.floor(s * 2.8 + 100) % FEED.length];
  const sitting = s >= LATE + 0.62;
  const buzz = ringing ? Math.sin(s * 90) * 0.05 : 0;
  // the camera: a slow drift, a small punch-in on every time jump, a shake on 8:59
  const punch = STAMPS.reduce((m, [at]) => Math.max(m, s >= at ? Math.max(0, 1 - (s - at) / 0.35) : 0), 0);
  const camX = 3.0 + 0.04 * Math.sin(s * 0.9);
  const camD = track([[-1, 4.1], [1.4, 4.4], [MORNING, 4.75], [LATE, 4.55], [LATE + 0.6, 4.15], [CUT, 4.0]], s) - 0.22 * punch * punch;
  const shake = s >= LATE && s < LATE + 0.9 ? Math.sin(s * 85) * 0.035 * (1 - (s - LATE) / 0.9) : 0;
  // squash and stretch on the big moves
  const pop = Math.max(0, 1 - Math.abs(s - (LATE + 0.62)) / 0.16);
  return (
    <>
      <Camera x={camX} d={camD} shake={shake} />
      <Lights L={st.lights} camX={camX} moon={night ? 0.9 : 0.5} />
      <Apartment st={st} />
      <BedroomProps messy curtainsOpen={night ? 0.3 : 0.75} />
      {!sitting ? (
        // the blanket has to be taller than his legs (top of a leg is ~0.79), or they poke through it
        <group position={[2.08, 0.6, -1.0]} scale={[1, 1 + 0.035 * Math.sin(s * 2.6), 1]}>
          <Box p={[0, 0.14, 0]} s={[1.5, 0.28, 1.1]} c="#34407e" />
        </group>
      ) : (
        <Box p={[1.95, 0.72, -1.0]} s={[1.15, 0.26, 1.1]} c="#34407e" />
      )}
      {!inHand && <Phone position={[4.05 + buzz, 0.652, -1.12]} rotation={[-Math.PI / 2, 0, 0.3 + buzz]} on={ringing} screen="#f2f2f2" />}
      {scrolling && <pointLight position={[3.05, 1.3, -0.65]} color={screen} intensity={1.0} distance={2.2} decay={2} />}
      <group position={f.pos} rotation={[0, (f.ry * Math.PI) / 180, (f.rz * Math.PI) / 180, 'YZX']} scale={[1 - 0.07 * pop, 1 + 0.14 * pop, 1 - 0.07 * pop]}>
        <StickFigure
          pose={f.pose}
          color="#f1f1f3"
          emissive={0.28}
          head={<Face eyes={eyesAt(s)} size={1.7} />}
          rightHand={
            inHand ? (
              <group scale={1.45}>
                <Phone position={[0, -0.06, 0.03]} rotation={[0, Math.PI, 0]} screen={screen} on />
              </group>
            ) : undefined
          }
        />
      </group>
      <Zzz t={s} from={1.6} to={MORNING + 0.2} />
      {s > LATE + 0.14 && <Sprite tex={glyphTex('!')} p={[3.35, 1.75 + (s >= LATE + 0.62 ? 0.35 : 0), -1.0]} s={0.4 * Math.min(1, (s - LATE - 0.14) * 12)} />}
    </>
  );
}

// ---------- the 2D layer ----------
function Stamp({ s }: { s: number }) {
  const cur = stampAt(s);
  if (!cur) return null;
  const [at, text, sub] = cur;
  const late = text === '8:59';
  const pop = 1 + 0.16 * Math.max(0, 1 - (s - at) / 0.16);
  const shake = late ? Math.sin(s * 70) * 7 * Math.max(0, 1 - (s - at) / 0.9) : 0;
  return (
    <>
      <div style={{ position: 'absolute', top: 270, width: W, textAlign: 'center', fontFamily, fontWeight: 800, fontSize: 190, lineHeight: 1, color: late ? '#ff4b4b' : 'white', fontVariantNumeric: 'tabular-nums', ...EDGE, transform: `translateX(${shake}px) scale(${pop})` }}>
        {text}
        <span style={{ fontSize: 64, marginLeft: 14 }}>AM</span>
      </div>
      <Typed key={sub} text={sub} t={s} at={at + 0.06} top={PANEL_Y + PANEL_H + 14} size={72} />
    </>
  );
}

function NightWords({ s }: { s: number }) {
  return (
    <div style={{ opacity: interpolate(s, [1.3, 1.55], [1, 0], clampX) }}>
      <Typed text={'Me, last night:'} t={s} at={0.05} top={280} size={60} color="#ffd84a" />
      <Typed text={'"Up at 7. For real."'} t={s} at={0.35} top={368} size={84} />
    </div>
  );
}

// ---------- sound: one real track and a real alarm, nothing synthesised ----------
function Sound() {
  const { fps } = useVideoConfig();
  return (
    <>
      <Audio
        src={staticFile('audio/music.mp3')}
        volume={(fr) => {
          const s = fr / fps;
          // the music ducks under the alarm, and fades at the end
          const duck = s >= MORNING - 0.05 && s < MORNING + 0.6 ? 0.35 : 1;
          return 0.6 * duck * interpolate(s, [0, 0.25, JC_TOTAL - 0.5, JC_TOTAL], [0, 1, 1, 0], clampX);
        }}
      />
      {[MORNING].map((at) => (
        <Sequence key={at} from={Math.round(at * fps)} durationInFrames={Math.round(0.45 * fps)}>
          <Audio src={staticFile('audio/alarm.mp3')} volume={0.32} />
        </Sequence>
      ))}
    </>
  );
}

export function JustChecking() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = frame / fps;
  // sleep: fade to black between last night and the alarm; a small dip on every time jump.
  // The reel ends on black and starts from black, so it loops without a seam.
  const sleep = interpolate(s, [1.35, 1.55, MORNING - 0.05, MORNING + 0.12], [0, 1, 1, 0], clampX);
  const jump = STAMPS.slice(2, 6).reduce((m, [at]) => Math.max(m, 0.5 * Math.max(0, 1 - Math.abs(s - at) / 0.12)), 0);
  const flash = interpolate(s, [CUT - 0.1, CUT, CUT + 0.06, CUT + 0.3], [0, 1, 1, 0], clampX);
  const fadeIn = interpolate(s, [0, 0.1], [1, 0], clampX);
  const fadeOut = interpolate(s, [JC_TOTAL - 0.22, JC_TOTAL - 0.02], [0, 1], clampX);
  return (
    <AbsoluteFill style={{ background: '#050507' }}>
      {s < CUT ? (
        <>
          <div style={{ position: 'absolute', left: 0, top: PANEL_Y, width: W, height: PANEL_H, overflow: 'hidden' }}>
            <ThreeCanvas width={W} height={PANEL_H} shadows="soft" gl={{ antialias: true, preserveDrawingBuffer: true }} style={{ background: '#08080b' }}>
              <Look>
                <Room s={s} />
              </Look>
            </ThreeCanvas>
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.45) 100%)' }} />
            <div style={{ position: 'absolute', inset: 0, background: '#000', opacity: Math.max(sleep, jump) }} />
          </div>
          {s < MORNING ? <NightWords s={s} /> : <Stamp s={s} />}
        </>
      ) : (
        <Demo d={s - CUT} src="demo/demo-short.mp4" len={SHORT} />
      )}
      <AbsoluteFill style={{ background: '#fff8e8', opacity: flash }} />
      <Grain />
      <AbsoluteFill style={{ background: '#000', opacity: Math.max(fadeIn, fadeOut) }} />
      <Sound />
    </AbsoluteFill>
  );
}
