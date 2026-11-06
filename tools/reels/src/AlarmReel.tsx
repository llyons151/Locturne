// "4 alarms" reel: snooze, snooze, snooze, then Loc walks off with the phone.
// Art is in ../public (generated with GPT image via ../gen.sh). All coordinates below are in
// plate pixels (the plates are 1024x1536); the camera maps them onto the 1080x1920 frame.
import { Fragment, type CSSProperties, type ReactNode } from 'react';
import {
  AbsoluteFill,
  Audio,
  Easing,
  Img,
  interpolate,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { loadFont } from '@remotion/google-fonts/Inter';

const { fontFamily } = loadFont('normal', { weights: ['600', '800', '900'], subsets: ['latin'] });

export const ALARM_REEL_FRAMES = 510;

const W = 1080;
const H = 1920;
const PW = 1024;
const PH = 1536;
const COVER = H / PH; // 1.25: plate height fills the frame at zoom 1

// ---------- timeline (frames @30fps) ----------
const T = {
  nightEnd: 80,
  morning: 96,
  buzzes: [
    { from: 108, slap: 132, clock: '6:00', at: 100 },
    { from: 172, slap: 196, clock: '6:05', at: 165 },
    { from: 230, slap: 254, clock: '6:10', at: 225 },
  ],
  lastRing: 290, // 6:15
  locGrab: 302,
  locLand: 314,
  doorOpen: 318,
  locAtDoor: 360,
  emptySlap: 330,
  shock: 372,
  shield: 405,
  stepsFrom: 418,
  stepsTo: 462,
  end: 472,
};

// ---------- small helpers ----------
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const inRange = (f: number, a: number, b: number) => f >= a && f < b;

const INK = '#141826';
const textStyle: CSSProperties = {
  fontFamily,
  color: 'white',
  WebkitTextStroke: `14px ${INK}`,
  paintOrder: 'stroke fill',
  textAlign: 'center',
  lineHeight: 1.05,
};

// ---------- camera ----------
type Shot = { cx: number; cy: number; z: number };
const WIDE: Shot = { cx: 592, cy: 768, z: 1 };
const MID: Shot = { cx: 520, cy: 960, z: 1.45 };
const CLOSE: Shot = { cx: 330, cy: 1010, z: 2.3 };

function shotAt(f: number): Shot {
  if (f < T.nightEnd) return MID;
  if (f < 165) return WIDE;
  if (f < 285) return MID;
  if (f < T.shock) return WIDE;
  if (f < T.shield) return CLOSE;
  return WIDE;
}

function Stage({ shot, children, push = 0 }: { shot: Shot; children: ReactNode; push?: number }) {
  const s = COVER * shot.z * (1 + push);
  // keep the plate covering the frame
  const halfW = W / 2 / s;
  const halfH = H / 2 / s;
  const cx = Math.min(Math.max(shot.cx, halfW), PW - halfW);
  const cy = Math.min(Math.max(shot.cy, halfH), PH - halfH);
  return (
    <div
      style={{
        position: 'absolute',
        width: PW,
        height: PH,
        left: 0,
        top: 0,
        transformOrigin: '0 0',
        transform: `translate(${W / 2 - cx * s}px, ${H / 2 - cy * s}px) scale(${s})`,
      }}>
      {children}
    </div>
  );
}

// ---------- plate (which drawing of the room) ----------
function plateAt(f: number): string {
  if (f < T.morning) return 'p-night.png';
  if (f >= T.shield) return 'bedroom-morning.png';
  if (f >= T.shock) return 'p-shock.png';
  for (const b of T.buzzes) if (inRange(f, b.slap, b.slap + 10)) return 'p-slap.png';
  if (inRange(f, T.emptySlap, T.emptySlap + 14)) return 'p-slap.png';
  return 'p-asleep.png';
}

// ---------- props ----------
function isRinging(f: number) {
  for (const b of T.buzzes) if (inRange(f, b.from, b.slap + 2)) return true;
  return f >= T.lastRing && f < T.locGrab;
}

function NightstandPhone() {
  const f = useCurrentFrame();
  if (f < T.morning || f >= T.locGrab) return null;
  if (plateAt(f) === 'p-slap.png') return null; // the hand covers it
  const ringing = isRinging(f);
  const dx = ringing ? Math.sin(f * 2.6) * 3 : 0;
  const lines = ringing && Math.floor(f / 3) % 2 === 0;
  return (
    <div style={{ position: 'absolute', left: 618 + dx, top: 1032, width: 66, height: 13 }}>
      <div style={{ position: 'absolute', inset: 0, borderRadius: 4, background: '#1b1f2c' }} />
      {ringing && <div style={{ position: 'absolute', left: 4, right: 4, top: 2, height: 4, borderRadius: 2, background: '#cfe0ff' }} />}
      {lines && (
        <>
          <Bzz x={-22} />
          <Bzz x={76} flip />
        </>
      )}
    </div>
  );
}

function Bzz({ x, flip }: { x: number; flip?: boolean }) {
  return (
    <svg style={{ position: 'absolute', left: x, top: -16, transform: flip ? 'scaleX(-1)' : undefined }} width="14" height="40">
      <path d="M12 2 Q2 10 12 18 M12 22 Q2 30 12 38" stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function Door() {
  const f = useCurrentFrame();
  const open = f >= T.shield ? 1 : interpolate(f, [T.doorOpen, T.doorOpen + 8], [0, 1], { ...clamp, easing: Easing.out(Easing.quad) });
  if (open <= 0) return null;
  // dark doorway, then the panel swings on its left hinge (squash in x)
  return (
    <>
      <div style={{ position: 'absolute', left: 812, top: 598, width: 196, height: 646, background: '#262b3b' }} />
      <div
        style={{
          position: 'absolute',
          left: 812,
          top: 598,
          width: 196,
          height: 646,
          background: '#8a5a43',
          transformOrigin: '0 50%',
          transform: `scaleX(${1 - 0.86 * open})`,
        }}
      />
    </>
  );
}

// ---------- Loc ----------
const LOC_H = 150; // sitting height in plate px

function Loc() {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const appear = T.buzzes[1].at;
  if (f < appear || f >= T.locAtDoor + 14) return null;

  let src = 'loc-watch.png';
  let x = 690; // feet centre
  let y = 1050; // feet line
  let h = LOC_H;
  let sx = 1;
  let sy = 1;
  let opacity = 1;

  if (f < T.locGrab) {
    if (f >= T.buzzes[2].slap + 10) src = 'loc-tap.png';
    else if (f >= T.buzzes[1].slap + 10) src = 'loc-crossed.png';
    // pop in with a squash
    const pop = spring({ frame: f - appear, fps, config: { damping: 9, stiffness: 160 } });
    sx = interpolate(pop, [0, 1], [0.2, 1]);
    sy = interpolate(pop, [0, 1], [0.2, 1]);
    // breathing so he never freezes
    sy *= 1 + Math.sin(f / 9) * 0.015;
    // a tiny jolt each time a snooze lands
    for (const b of T.buzzes) if (inRange(f, b.slap, b.slap + 6)) sy *= 0.93;
  } else {
    h = 215;
    src = Math.floor(f / 5) % 2 === 0 ? 'loc-walk-a.png' : 'loc-walk-b.png';
    if (f < T.locLand) {
      const t = (f - T.locGrab) / (T.locLand - T.locGrab);
      x = interpolate(t, [0, 1], [690, 770]);
      y = interpolate(t, [0, 1], [1050, 1262]) - Math.sin(t * Math.PI) * 70;
      src = 'loc-walk-a.png';
    } else {
      const t = interpolate(f, [T.locLand, T.locAtDoor], [0, 1], clamp);
      x = interpolate(t, [0, 1], [770, 905]);
      y = 1262 - Math.abs(Math.sin(f / 2.5)) * 8;
      // landing squash
      if (f < T.locLand + 4) sy = 0.88;
      opacity = interpolate(f, [T.locAtDoor, T.locAtDoor + 12], [1, 0], clamp);
      h = interpolate(f, [T.locAtDoor, T.locAtDoor + 12], [215, 180], clamp);
    }
  }

  return (
    <Img
      src={staticFile(src)}
      style={{
        position: 'absolute',
        height: h,
        left: x,
        top: y - h,
        opacity,
        transformOrigin: '50% 100%',
        transform: `translateX(-50%) scale(${sx}, ${sy})`,
      }}
    />
  );
}

// ---------- overlays ----------
function ClockStamp() {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const stamps = [...T.buzzes.map((b) => ({ at: b.at, text: b.clock })), { at: 285, text: '6:15' }];
  let current: { at: number; text: string } | undefined;
  for (const s of stamps) if (f >= s.at) current = s;
  if (!current || f >= T.shock) return null;
  const p = spring({ frame: f - current.at, fps, config: { damping: 11, stiffness: 220 } });
  return (
    <div style={{ position: 'absolute', top: 250, width: W, display: 'flex', justifyContent: 'center' }}>
      <div style={{ ...textStyle, fontSize: 150, fontWeight: 900, transform: `scale(${interpolate(p, [0, 1], [1.5, 1])})`, opacity: p }}>
        {current.text}
      </div>
    </div>
  );
}

function Caption({ from, to, children, top = 230, size = 96 }: { from: number; to: number; children: ReactNode; top?: number; size?: number }) {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (f < from || f >= to) return null;
  const p = spring({ frame: f - from, fps, config: { damping: 14, stiffness: 180 } });
  return (
    <div style={{ position: 'absolute', top, width: W, display: 'flex', justifyContent: 'center' }}>
      <div style={{ ...textStyle, fontSize: size, fontWeight: 800, opacity: p, transform: `translateY(${(1 - p) * 30}px)` }}>{children}</div>
    </div>
  );
}

function PhoneFrame({ children, enter, exit }: { children: ReactNode; enter: number; exit: number }) {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (f < enter || f >= exit) return null;
  const pin = spring({ frame: f - enter, fps, config: { damping: 15, stiffness: 140 } });
  const pout = interpolate(f, [exit - 8, exit], [0, 1], clamp);
  const y = (1 - pin) * 1400 + pout * 1400;
  return (
    <AbsoluteFill style={{ background: `rgba(10,12,20,${0.55 * pin * (1 - pout)})` }}>
      <div
        style={{
          position: 'absolute',
          left: (W - 600) / 2,
          top: 560,
          width: 600,
          height: 1220,
          borderRadius: 86,
          background: '#0b0c10',
          padding: 22,
          transform: `translateY(${y}px) rotate(${(1 - pin) * 6}deg)`,
          boxShadow: '0 30px 60px rgba(0,0,0,0.45)',
        }}>
        <div style={{ width: '100%', height: '100%', borderRadius: 66, overflow: 'hidden', position: 'relative' }}>{children}</div>
      </div>
    </AbsoluteFill>
  );
}

const ALARMS = [
  { t: '6:00', at: 32 },
  { t: '6:05', at: 40 },
  { t: '6:10', at: 48 },
  { t: '6:15', at: 56 },
];

function AlarmList() {
  const f = useCurrentFrame();
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#000', fontFamily, color: 'white', padding: '90px 40px' }}>
      <div style={{ fontSize: 64, fontWeight: 800, marginBottom: 30 }}>Alarms</div>
      {ALARMS.map((a) => {
        const on = interpolate(f, [a.at, a.at + 5], [0, 1], clamp);
        return (
          <div key={a.t} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #222', padding: '22px 0' }}>
            <div style={{ fontSize: 92, fontWeight: 600, opacity: 0.45 + 0.55 * on }}>
              {a.t}
              <span style={{ fontSize: 40 }}> AM</span>
            </div>
            <div style={{ width: 120, height: 72, borderRadius: 36, background: on > 0.5 ? '#34c759' : '#39393d', position: 'relative' }}>
              <div style={{ position: 'absolute', top: 5, left: 5 + on * 48, width: 62, height: 62, borderRadius: 31, background: 'white' }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ShieldScreen() {
  const f = useCurrentFrame();
  const steps = Math.round(interpolate(f, [T.stepsFrom, T.stepsTo], [0, 200], { ...clamp, easing: Easing.inOut(Easing.quad) }));
  const done = f >= T.stepsTo;
  const pop = interpolate(f, [T.stepsTo, T.stepsTo + 6], [1.15, 1], clamp);
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: done ? '#f3ead8' : '#101629',
        color: done ? INK : 'white',
        fontFamily,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: 50,
      }}>
      <div style={{ width: 150, height: 150, borderRadius: 75, background: done ? '#f6c453' : '#e9e2cf', marginBottom: 50, transform: `scale(${pop})` }} />
      <div style={{ fontSize: 58, fontWeight: 800, lineHeight: 1.1 }}>{done ? 'Your apps are awake.' : 'Your apps are asleep.'}</div>
      <div style={{ fontSize: 38, fontWeight: 600, opacity: 0.7, marginTop: 18 }}>{done ? 'Good morning.' : 'Walk 200 steps to wake them up.'}</div>
      <div style={{ width: '86%', height: 22, borderRadius: 11, background: done ? '#e3d6bd' : '#262f4d', marginTop: 70, overflow: 'hidden' }}>
        <div style={{ width: `${steps / 2}%`, height: '100%', borderRadius: 11, background: done ? INK : 'white' }} />
      </div>
      <div style={{ fontSize: 70, fontWeight: 900, marginTop: 30, fontVariantNumeric: 'tabular-nums' }}>
        {steps}
        <span style={{ fontSize: 40, opacity: 0.6 }}> / 200 steps</span>
      </div>
    </div>
  );
}

function Fade() {
  const f = useCurrentFrame();
  const a = f < T.morning
    ? interpolate(f, [T.nightEnd - 4, T.nightEnd + 6], [0, 1], clamp)
    : interpolate(f, [T.morning, T.morning + 8], [1, 0], clamp);
  return <AbsoluteFill style={{ background: 'black', opacity: a }} />;
}

// ---------- sound ----------
function Sfx() {
  const ring = (from: number, len: number, vol: number | ((f: number) => number)) => (
    <Sequence key={`r${from}`} from={from} durationInFrames={len}>
      <Audio src={staticFile('sfx/alarm.wav')} loop volume={vol} />
      <Audio src={staticFile('sfx/buzz.wav')} loop volume={0.5} />
    </Sequence>
  );
  return (
    <>
      {ALARMS.map((a) => (
        <Sequence key={a.t} from={a.at} durationInFrames={6}>
          <Audio src={staticFile('sfx/tick.wav')} volume={0.6} />
        </Sequence>
      ))}
      {T.buzzes.map((b) => (
        <Fragment key={b.at}>
          <Sequence key={`c${b.at}`} from={b.at} durationInFrames={6}>
            <Audio src={staticFile('sfx/tick.wav')} />
          </Sequence>
          {ring(b.from, b.slap - b.from, 0.55)}
          <Sequence key={`s${b.slap}`} from={b.slap} durationInFrames={6}>
            <Audio src={staticFile('sfx/slap.wav')} />
          </Sequence>
        </Fragment>
      ))}
      {/* the last alarm keeps ringing as Loc carries it out, fading down the hall */}
      <Sequence from={T.lastRing} durationInFrames={T.shield - T.lastRing}>
        <Audio
          src={staticFile('sfx/alarm.wav')}
          loop
          volume={(f) => interpolate(f + T.lastRing, [T.locLand, T.locAtDoor + 10, T.shock], [0.55, 0.25, 0.4], clamp)}
        />
      </Sequence>
      <Sequence from={T.doorOpen} durationInFrames={20}>
        <Audio src={staticFile('sfx/door.wav')} />
      </Sequence>
      <Sequence from={T.emptySlap} durationInFrames={6}>
        <Audio src={staticFile('sfx/slap.wav')} volume={0.8} />
      </Sequence>
      {Array.from({ length: 12 }, (_, i) => T.stepsFrom + Math.round((i * (T.stepsTo - T.stepsFrom)) / 12)).map((at) => (
        <Sequence key={`t${at}`} from={at} durationInFrames={4}>
          <Audio src={staticFile('sfx/tick.wav')} volume={0.35} />
        </Sequence>
      ))}
      <Sequence from={T.stepsTo} durationInFrames={30}>
        <Audio src={staticFile('sfx/done.wav')} />
      </Sequence>
    </>
  );
}

// ---------- the reel ----------
export function AlarmReel() {
  const f = useCurrentFrame();
  const shot = shotAt(f);
  const push = f >= T.shock && f < T.shield ? interpolate(f, [T.shock, T.shield], [0, 0.08], clamp) : 0;
  return (
    <AbsoluteFill style={{ background: '#0c0e16' }}>
      <Stage shot={shot} push={push}>
        <Img src={staticFile(plateAt(f))} style={{ position: 'absolute', width: PW, height: PH }} />
        <Door />
        <NightstandPhone />
        <Loc />
      </Stage>

      <Caption from={0} to={T.nightEnd}>me at 1am</Caption>
      <PhoneFrame enter={18} exit={T.nightEnd}>
        <AlarmList />
      </PhoneFrame>
      <ClockStamp />
      <Caption from={T.shock + 4} to={T.shield} top={260} size={120}>
        my phone??
      </Caption>
      <PhoneFrame enter={T.shield} exit={T.end}>
        <ShieldScreen />
      </PhoneFrame>
      <Caption from={T.end} to={ALARM_REEL_FRAMES} top={300} size={104}>
        the only alarm
        <br />I can't snooze
      </Caption>
      <Caption from={T.end + 14} to={ALARM_REEL_FRAMES} top={1720} size={54}>
        Locturne
      </Caption>
      <Fade />
      <Sfx />
    </AbsoluteFill>
  );
}
