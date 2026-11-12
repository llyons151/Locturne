// The demo half every reel cuts to: the real app, full screen, with no words over it.
// public/demo/demo.mp4 is a recording of the real morning (web build, Wake preview's fake
// pedometer): the walk 0 → 200 as a time-lapse, then the moonrise payoff. Re-make it with
// record-web.mjs (docs/REEL_PLAYBOOK.md), or drop a phone screen recording in its place and set
// DEMO_LEN to its length. The name card comes after, on its own.
import { AbsoluteFill, Img, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { loadFont } from '@remotion/google-fonts/TikTokSans';

// the caption face people know from Reels and TikTok: heavy, white, black edge
export const { fontFamily } = loadFont('normal', { weights: ['700', '800'], subsets: ['latin'] });
const W = 1080;
const clampX = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
export const EDGE = { WebkitTextStroke: '10px #000', paintOrder: 'stroke fill' } as const;

export function Typed({ text, t, at, size = 64, top, color = 'white' }: { text: string; t: number; at: number; size?: number; top: number; color?: string }) {
  // words pop on one at a time, like auto captions
  const words = text.split(/(?<=\s)/);
  const n = Math.max(0, Math.floor((t - at) * 9) + 1);
  if (t < at) return null;
  return (
    <div style={{ position: 'absolute', top, width: W, textAlign: 'center', fontFamily, fontWeight: 800, fontSize: size, lineHeight: 1.22, color, whiteSpace: 'pre-line', ...EDGE }}>
      {words.map((w, i) => (
        <span key={i} style={{ opacity: i < n ? 1 : 0 }}>
          {w}
        </span>
      ))}
    </div>
  );
}

/** Seconds of app before the name card. */
export const DEMO_LEN = 5.0;

export function Demo({ d, src = 'demo/demo.mp4', len = DEMO_LEN }: { d: number; src?: string; len?: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const zoom = interpolate(d, [0, 0.4], [1.12, 1], { ...clampX, easing: (k) => 1 - (1 - k) ** 3 });
  const card = interpolate(d, [len, len + 0.2], [0, 1], clampX);
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      {/* the phone screen is taller than the frame: fill the width, trim a little off the top and bottom */}
      {/* a Sequence, so the recording starts at the cut and not at the reel's first frame */}
      <Sequence from={frame - Math.round(d * fps)} layout="none">
        <OffthreadVideo src={staticFile(src)} muted style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 62%', transform: `scale(${zoom})` }} />
      </Sequence>
      <AbsoluteFill style={{ background: '#05060c', opacity: card, alignItems: 'center', justifyContent: 'center' }}>
        <Img src={staticFile('demo/icon.png')} style={{ width: 300, height: 300, borderRadius: 68 }} />
        <div style={{ fontFamily, fontWeight: 800, fontSize: 104, color: 'white', marginTop: 54 }}>Locturne</div>
        <div style={{ fontFamily, fontWeight: 700, fontSize: 44, color: 'rgba(255,255,255,0.75)', marginTop: 14 }}>No apps until you're out of bed.</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
