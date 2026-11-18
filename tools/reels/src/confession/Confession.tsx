// CONFESSION: the format of @nexxfcr's Lockr reels (2.7M / 733K / 507K views, Sept 2026), teardown in
// docs/REEL_TEARDOWN_CONFESSION.md. Three parts, all driven by a spec (specs.ts):
//   1. HOOK: someone else's real clip admitting a phone problem, with word-by-word caps captions
//      (a keyword in colour, an optional picture popping in over a word, e.g. their screen time).
//   2. WAKE UP: a fast morning montage cut on the beat, one big line over it.
//   3. DEMO: the real Locturne: the shield at night, then the walk and the moonrise. One tagline
//      stays on under it. Only the hook changes from reel to reel; parts 2 and 3 are reused.
import { AbsoluteFill, Audio, Img, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { fontFamily } from '../demo/Demo';
import { loadFont as loadMontserrat } from '@remotion/google-fonts/Montserrat';

const { fontFamily: capsFont } = loadMontserrat('normal', { weights: ['900'], subsets: ['latin'] });
import type { ConfessionSpec, Word } from './specs';

export const CF_FPS = 30;
const clampX = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
// thin black edge, no glow (CLAUDE.md: no glow unless asked)
const EDGE = { WebkitTextStroke: '7px #000', paintOrder: 'stroke fill' } as const;

export const timeline = (s: ConfessionSpec) => {
  const hook = s.hookLen;
  const p = s.pivot;
  const montage = s.split ? 0 : !p || p.kind === 'montage' ? s.broll.length * s.brollEach : p.kind === 'clip' ? p.len : p.cards.reduce((n, c) => n + c.len, 0);
  const full = s.demo.reduce((n, d) => n + d.len, 0);
  // split: the demo already ran under the hook at splitRate; only the rest plays full screen
  const demo = s.split ? Math.max(1.5, full - hook * (s.splitRate ?? 0.5)) : full;
  return { hook, montage, demo, total: hook + montage + demo };
};
export const framesFor = (s: ConfessionSpec) => Math.round(timeline(s).total * CF_FPS);

// ---------- captions: short phrases, each word lands as it's said ----------
// starts: hand-set phrase breaks (word indices), the way the reference breaks by meaning; else by count/pauses
function phrases(words: Word[], starts?: number[]) {
  const out: Word[][] = [];
  let cur: Word[] = [];
  words.forEach((w, i) => {
    const gap = i > 0 ? w.s - words[i - 1].e : 0;
    const brk = starts ? starts.includes(i) : cur.length >= 4 || gap > 0.35 || (i > 0 && /[.?!,]$/.test(words[i - 1].w));
    if (cur.length && brk) {
      out.push(cur);
      cur = [];
    }
    cur.push(w);
  });
  if (cur.length) out.push(cur);
  return out;
}

// The reference reel's caption look (frame-stepped 2026-11-12): heavy wide caps with wide tracking, no outline,
// a soft neutral shadow; the whole phrase shows at once with unsaid words dimmed, lighting up as they're spoken;
// a phrase holding a keyword takes that keyword's colour; a small icon sits above it. (Their neon glow is left
// out: CLAUDE.md, no glow unless the user asks for it.)
const clean = (w: string) => w.replace(/[^A-Z0-9']/g, '');
const TIKTOK_PATH = 'M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z';

function Icon({ kind, color }: { kind: string; color: string }) {
  if (kind === 'tiktok') return <svg viewBox="0 0 24 24" width={120} height={120}><path d={TIKTOK_PATH} fill={color} /></svg>;
  if (kind === 'dots') return <div style={{ display: 'flex', gap: 18 }}>{[0, 1, 2].map((k) => <div key={k} style={{ width: 30, height: 30, borderRadius: 15, background: color }} />)}</div>;
  if (kind === 'toggle') return <div style={{ width: 150, height: 86, borderRadius: 43, background: color, position: 'relative' }}><div style={{ position: 'absolute', right: 7, top: 7, width: 72, height: 72, borderRadius: 36, background: 'white', boxShadow: '0 3px 8px rgba(0,0,0,0.3)' }} /></div>;
  return null;
}

function Captions({ spec, t }: { spec: ConfessionSpec; t: number }) {
  const groups = phrases(spec.words, spec.phraseStarts);
  const i = groups.findIndex((g, k) => t >= g[0].s - 0.05 && (k === groups.length - 1 || t < groups[k + 1][0].s - 0.05));
  if (i < 0) return null;
  const g = groups[i];
  const key = g.map((w) => clean(w.w)).find((w) => spec.highlight?.[w]);
  const color = key ? spec.highlight![key] : 'white';
  const iconWord = g.map((w) => clean(w.w)).find((w) => spec.icons?.[w]);
  const iconAt = iconWord ? g.find((w) => clean(w.w) === iconWord)!.s : 0;
  const iconPop = interpolate(t, [iconAt, iconAt + 0.16], [0, 1], { ...clampX, easing: (x) => 1 - (1 - x) ** 3 });
  const enter = interpolate(t, [g[0].s - 0.05, g[0].s + 0.1], [0, 1], clampX);
  const top = spec.captionY ?? 930;
  return (
    <>
      {iconWord && t >= iconAt && (
        <div style={{ position: 'absolute', top: top - 150, width: 1080, display: 'flex', justifyContent: 'center', opacity: iconPop, transform: `scale(${0.6 + 0.4 * iconPop})`, filter: 'drop-shadow(0 6px 14px rgba(0,0,0,0.5))' }}>
          <Icon kind={spec.icons![iconWord]} color={color} />
        </div>
      )}
      <div style={{ position: 'absolute', top, width: 1080, padding: '0 70px', boxSizing: 'border-box', textAlign: 'center', fontFamily: capsFont, fontWeight: 900, fontSize: 62, letterSpacing: '0.09em', lineHeight: 1.2, color, opacity: enter, textShadow: '0 4px 14px rgba(0,0,0,0.65), 0 1px 2px rgba(0,0,0,0.8)' }}>
        {g.map((w, k) => (
          <span key={k} style={{ opacity: t >= w.s - 0.03 ? 1 : 0.32 }}>
            {w.w}
            {k < g.length - 1 ? ' ' : ''}
          </span>
        ))}
      </div>
    </>
  );
}

// a picture (their screen time screenshot, an app icon) that pops in over a word and holds
function Pops({ spec, t }: { spec: ConfessionSpec; t: number }) {
  return (
    <>
      {(spec.pops ?? []).map((p, k) => {
        if (t < p.at || t > p.to) return null;
        const k1 = interpolate(t, [p.at, p.at + 0.18], [0, 1], { ...clampX, easing: (x) => 1 - (1 - x) ** 3 });
        const out = interpolate(t, [p.to - 0.12, p.to], [1, 0], clampX);
        return (
          <Img key={k} src={staticFile(p.src)} style={{ position: 'absolute', left: 540 - p.w / 2, top: p.y, width: p.w, borderRadius: 28, opacity: k1 * out, transform: `scale(${0.7 + 0.3 * k1}) rotate(${p.tilt ?? -3}deg)`, boxShadow: '0 18px 50px rgba(0,0,0,0.55)' }} />
        );
      })}
    </>
  );
}

// The reference reel's clip → montage transition (frame-stepped 2026-11-12): on the last keyword a real
// Screen Time card pops over the face, its picture fades into the first morning shot, so it's a window,
// then the window grows to fill the frame and the montage carries on from the same shot.
export const WINDOW_FADE = 0.25; // card → morning shot inside the card
export const WINDOW_GROW = 0.4; // window → full frame
export const WINDOW_LEAD = WINDOW_FADE + WINDOW_GROW;
const easeInOut = (k: number) => (k < 0.5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2);

function Window({ spec, t }: { spec: ConfessionSpec; t: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const w = spec.window;
  if (!w) return null;
  const word = spec.words.find((x) => x.w.replace(/[^A-Z0-9']/g, '') === w.word);
  const at = w.at ?? (word ? word.s : spec.hookLen - 1.5);
  if (t < at) return null;
  const pop = interpolate(t, [at, at + 0.2], [0, 1], { ...clampX, easing: (x) => 1 - (1 - x) ** 3 });
  const fadeAt = spec.hookLen - WINDOW_LEAD;
  const fade = interpolate(t, [fadeAt, fadeAt + WINDOW_FADE], [0, 1], clampX);
  const grow = easeInOut(interpolate(t, [spec.hookLen - WINDOW_GROW, spec.hookLen], [0, 1], clampX));
  const w0 = w.width ?? 760;
  const h0 = w0 * (w.aspect ?? 752 / 844);
  const top0 = w.top ?? 470;
  const box = { left: (1080 - w0) / 2 * (1 - grow), top: top0 * (1 - grow), width: w0 + (1080 - w0) * grow, height: h0 + (1920 - h0) * grow };
  const tilt = -3 * (1 - grow);
  return (
    <div style={{ position: 'absolute', ...box, borderRadius: 34 * (1 - grow), overflow: 'hidden', opacity: pop, transform: `scale(${0.7 + 0.3 * pop}) rotate(${tilt}deg)`, boxShadow: `0 18px 50px rgba(0,0,0,${0.55 * (1 - grow)})`, background: '#000' }}>
      {fade > 0 && (
        <Sequence from={frame - Math.round((t - fadeAt) * fps)} layout="none">
          <OffthreadVideo src={staticFile(spec.broll[0])} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </Sequence>
      )}
      <Img src={staticFile(w.src)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 1 - fade }} />
    </div>
  );
}

function Hook({ spec, t }: { spec: ConfessionSpec; t: number }) {
  // a slow push-in so a static selfie clip never sits still
  const z = spec.hookZoom ?? 1; // fixed: an animated zoom rescales every frame and reads as shaky
  const growing = spec.window && t > spec.hookLen - WINDOW_GROW;
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <OffthreadVideo src={staticFile(spec.hook)} muted style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: spec.hookFocus ?? '50% 40%', transform: `scale(${z})` }} />
      <Pops spec={spec} t={t} />
      {!growing && <Captions spec={spec} t={t} />}
      <Window spec={spec} t={t} />
    </AbsoluteFill>
  );
}

function BigLine({ text, top, size = 92, color = '#ff2d2d' }: { text: string; top: number; size?: number; color?: string }) {
  return <div style={{ position: 'absolute', top, width: 1080, textAlign: 'center', fontFamily, fontWeight: 800, fontSize: size, letterSpacing: 3, color, ...EDGE }}>{text}</div>;
}

// the beat between the clip and the demo. 'montage' = the reference's WAKE UP shots; 'clip' = one video
// (e.g. Loc jumping up at sunrise); 'cards' = text slams (receipt numbers, notes-style confession lines)
function Pivot({ spec, d }: { spec: ConfessionSpec; d: number }) {
  const p = spec.pivot;
  if (!p || p.kind === 'montage') return <Montage spec={spec} d={d} />;
  if (p.kind === 'clip') return <ClipPivot src={p.src} punch={p.punch} d={d} />;
  let at = 0;
  const i = Math.max(0, p.cards.findIndex((c) => { if (d < at + c.len) return true; at += c.len; return false; }));
  const c = p.cards[i] ?? p.cards[p.cards.length - 1];
  const local = d - at;
  const slam = interpolate(local, [0, 0.14], [1.25, 1], { ...clampX, easing: (k) => 1 - (1 - k) ** 3 });
  const notes = c.style === 'notes';
  return (
    <AbsoluteFill style={{ background: notes ? '#ffffff' : '#000000', alignItems: 'center', justifyContent: 'center', padding: '0 90px' }}>
      <div style={{ transform: `scale(${slam})`, textAlign: 'center', fontFamily, color: notes ? '#111' : c.color ?? 'white' }}>
        <div style={{ fontWeight: 800, fontSize: c.size ?? (notes ? 78 : 200), lineHeight: 1.12, letterSpacing: notes ? 0 : -4 }}>{c.big}</div>
        {c.small && <div style={{ fontWeight: 700, fontSize: 58, marginTop: 26, color: notes ? '#555' : 'rgba(255,255,255,0.8)' }}>{c.small}</div>}
      </div>
    </AbsoluteFill>
  );
}

function ClipPivot({ src, punch, d }: { src: string; punch?: string; d: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <Sequence from={frame - Math.round(d * fps)} layout="none">
        <OffthreadVideo src={staticFile(src)} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </Sequence>
      {punch && <BigLine text={punch} top={330} />}
    </AbsoluteFill>
  );
}

// split variant: the clip on top, the real app underneath from the first second
function SplitHook({ spec, t }: { spec: ConfessionSpec; t: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rate = spec.splitRate ?? 0.5;
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: 1080, height: 960, overflow: 'hidden' }}>
        <OffthreadVideo src={staticFile(spec.hook)} muted style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: spec.hookFocus ?? '50% 35%' }} />
      </div>
      <div style={{ position: 'absolute', top: 960, left: 0, width: 1080, height: 960, overflow: 'hidden' }}>
        <Sequence from={frame - Math.round(t * fps)} layout="none">
          <OffthreadVideo src={staticFile(spec.demo[0].src)} muted playbackRate={rate} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 45%' }} />
        </Sequence>
      </div>
      <div style={{ position: 'absolute', top: 955, left: 0, width: 1080, height: 10, background: '#000' }} />
      <Captions spec={{ ...spec, captionY: spec.captionY ?? 800 }} t={t} />
    </AbsoluteFill>
  );
}

function Montage({ spec, d }: { spec: ConfessionSpec; d: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const i = Math.min(spec.broll.length - 1, Math.floor(d / spec.brollEach));
  const local = d - i * spec.brollEach;
  // after the window transition the first shot is already WINDOW_LEAD s in: carry on from there, unzoomed
  const carry = spec.window && i === 0;
  const z = 1;
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <Sequence from={frame - Math.round(local * fps)} layout="none">
        <OffthreadVideo src={staticFile(spec.broll[i])} muted startFrom={carry ? Math.round(WINDOW_LEAD * fps) : 0} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${z})` }} />
      </Sequence>
      <BigLine text={spec.punch} top={1240} />
    </AbsoluteFill>
  );
}

function DemoPart({ spec, d }: { spec: ConfessionSpec; d: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  let at = 0;
  const seg = spec.demo.find((s) => {
    if (d < at + s.len) return true;
    at += s.len;
    return false;
  }) ?? spec.demo[spec.demo.length - 1];
  const local = d - at;
  const zoom = 1;
  const style = { width: '100%', height: '100%', objectFit: 'cover' as const, objectPosition: '50% 50%', transform: `scale(${zoom})` };
  return (
    <AbsoluteFill style={{ background: '#05060c' }}>
      {seg.src.endsWith('.png') ? (
        <Img src={staticFile(seg.src)} style={style} />
      ) : (
        <Sequence from={frame - Math.round(local * fps)} layout="none">
          <OffthreadVideo src={staticFile(seg.src)} muted startFrom={Math.round((seg.from ?? 0) * fps)} style={style} />
        </Sequence>
      )}
      {seg.stamp && <BigLine text={seg.stamp} top={300} size={64} color="white" />}
      <BigLine text={spec.tagline} top={1330} size={58} />
    </AbsoluteFill>
  );
}

export function Confession(spec: ConfessionSpec) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const tl = timeline(spec);
  const hookEnd = tl.hook;
  const montEnd = hookEnd + tl.montage;
  // a white flash on each hard cut
  const flash = Math.max(interpolate(t, [hookEnd, hookEnd + 0.12], [0.7, 0], clampX) * (t >= hookEnd && !spec.window ? 1 : 0), interpolate(t, [montEnd, montEnd + 0.12], [0.6, 0], clampX) * (t >= montEnd ? 1 : 0));
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      {t < hookEnd ? (spec.split ? <SplitHook spec={spec} t={t} /> : <Hook spec={spec} t={t} />) : t < montEnd ? <Pivot spec={spec} d={t - hookEnd} /> : <DemoPart spec={spec} d={t - montEnd + (spec.split ? hookEnd * (spec.splitRate ?? 0.5) : 0)} />}
      <AbsoluteFill style={{ background: 'white', opacity: flash }} />
      {/* the hook's own voice, then whatever bed the spec names (or none: add a trending sound in the app) */}
      {/* hookLen 0 = the Stitch tail: TikTok plays the creator's clip, this file is everything after it */}
      {hookEnd > 0 && (
        <Sequence durationInFrames={Math.round(hookEnd * fps)}>
          <Audio src={staticFile(spec.hook)} />
        </Sequence>
      )}
      {spec.music && (
        <Audio
          src={staticFile(spec.music)}
          startFrom={Math.max(0, Math.round(((spec.musicHit ?? hookEnd) - hookEnd) * fps))}
          volume={(f) => (f / fps < hookEnd - 0.05 ? spec.musicUnder ?? 0.35 : 0.9) * interpolate(f / fps, [tl.total - 0.8, tl.total], [1, 0], clampX)}
        />
      )}
      {spec.music && (
        <Sequence from={Math.round((hookEnd - (spec.window ? WINDOW_GROW : 0)) * fps)} layout="none">
          <Audio src={staticFile('sfx/whoosh.wav')} volume={0.7} />
        </Sequence>
      )}
    </AbsoluteFill>
  );
}
