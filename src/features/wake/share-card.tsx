'use dom';

import { useEffect, useRef } from 'react';

import { MOON_FROSTED, MOON_GLOW } from './moonrise-art';
import { NIGHT_SKY } from './share-card-art';

/** What the card says: the payoff's own words and numbers, already formatted. */
export type CardFacts = {
  /** "7:06" and "am". */
  value: string;
  unit: string;
  /** "Morning 12", or a milestone's name. */
  kicker: string;
  stats: { value: string; label: string; icon: 'sunrise' | 'calendar' }[];
  days: { letter: string; done: boolean; today: boolean }[];
};

// A phone story, 9:16, at 1080 wide. Sized like the payoff itself: its points times S (a 390 pt
// wide phone drawn 1080 wide), so it reads as the screen, not a blown-up copy of it.
const W = 1080;
const H = 1920;
const S = W / 390;
/** The black strip under the panel, with the name in it, and the panel's corners (44 pt). */
const STRIP = 230;
const PANEL_R = Math.round(44 * S);
/** The moon's disc and its top. Its frosted image is 1.5 times the disc, its glow 2 (night-sky.tsx). */
const MOON = 860;
const MOON_TOP = 90;
const FROST_PAD = 1.5;
const GLOW_PAD = 2;
/** Loc's width on the card, as a share of it (0.27 on screen: a little bigger here, he's the star). */
const LOC_SHARE = 0.3;
/** His share of his own canvas's width (payoff-screen.tsx LOC_SHARE). */
const LOC_IN_CANVAS = 0.27;

/** The app's own face: its display font on the web build, the system's (SF) on iPhone, as the app's text. */
function appFont() {
  const display = getComputedStyle(document.documentElement).getPropertyValue('--font-display').trim();
  return `${display ? `${display}, ` : ''}-apple-system, system-ui, sans-serif`;
}

/**
 * The morning payoff's share card (user, 2026-10-27): the screen as a picture to post. The
 * moon at the top with the time in it, the week, and Loc mid-yell on the panel's edge (a
 * snapshot of his own canvas), over the black strip with the name. Drawn on a canvas in a
 * webview, so no native screenshot module is needed; bumping `nonce` paints it and hands the PNG
 * back through `onCard`.
 */
export default function ShareCard({
  facts,
  loc,
  nonce,
  onCard,
}: {
  facts: CardFacts;
  /** Loc's canvas as a PNG data URL (LocStage `onSnap`), or null to leave him out. */
  loc: string | null;
  nonce: number;
  /** The card as a PNG data URL. A native action on iOS. */
  onCard: (png: string) => Promise<void> | void;
  dom?: import('expo/dom').DOMProps;
}) {
  // What to paint, kept current after each render (not written during it).
  const latest = useRef({ facts, loc });
  useEffect(() => {
    latest.current = { facts, loc };
  });

  useEffect(() => {
    if (!nonce) return;
    let live = true;
    paint(latest.current.facts, latest.current.loc)
      .then((png) => live && onCard(png))
      .catch(() => {});
    return () => {
      live = false;
    };
    // Painted once per bump, with whatever the facts are then.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce]);

  return <div style={{ width: 1, height: 1 }} />;
}

const load = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

async function paint(facts: CardFacts, loc: string | null): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const font = appFont();
  const [sky, glow, moon, locImg] = await Promise.all([
    load(NIGHT_SKY),
    load(MOON_GLOW),
    load(MOON_FROSTED),
    loc ? load(loc).catch(() => null) : null,
    document.fonts?.load(`700 100px ${font}`).catch(() => null),
  ]);
  const panelBottom = H - STRIP;
  const type = (weight: number, size: number) => `${weight} ${Math.round(size * S)}px ${font}`;

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, W, H);

  // The panel: the app's own night sky (flipped, as it shows it), cover-fit to the panel's width
  // and its foot, ending in the panel's rounded corners over the strip.
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(0, -PANEL_R, W, panelBottom + PANEL_R, PANEL_R);
  ctx.clip();
  const skyScale = Math.max(W / sky.width, panelBottom / sky.height);
  const skyW = sky.width * skyScale, skyH = sky.height * skyScale;
  ctx.drawImage(sky, W - skyW, panelBottom - skyH, skyW, skyH);

  // The moon, risen to the top in its light, the time inside it.
  const cx = W / 2, cy = MOON_TOP + MOON / 2;
  ctx.drawImage(glow, cx - (MOON * GLOW_PAD) / 2, cy - (MOON * GLOW_PAD) / 2, MOON * GLOW_PAD, MOON * GLOW_PAD);
  ctx.drawImage(moon, cx - (MOON * FROST_PAD) / 2, cy - (MOON * FROST_PAD) / 2, MOON * FROST_PAD, MOON * FROST_PAD);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = 'rgba(255,255,255,0.72)';
  ctx.font = type(400, 15);
  ctx.fillText('Up at', cx, cy - 100);
  // The time and its am, set together on one baseline, centred as a pair.
  ctx.font = type(700, 64);
  const tracking = -1.5 * S;
  const valueW = spacedWidth(ctx, facts.value, tracking);
  ctx.font = type(500, 22);
  const unitW = ctx.measureText(facts.unit).width;
  const gap = 6 * S, left = cx - (valueW + gap + unitW) / 2;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = type(700, 64);
  spaced(ctx, facts.value, left, cy + 62, tracking, 'left');
  ctx.fillStyle = 'rgba(255,255,255,0.72)';
  ctx.font = type(500, 22);
  // `spaced` hands back centred text.
  ctx.textAlign = 'left';
  ctx.fillText(facts.unit, left + valueW + gap, cy + 62);
  ctx.fillStyle = 'rgba(255,255,255,0.72)';
  ctx.font = type(600, 12);
  spaced(ctx, facts.kicker.toUpperCase(), cx, cy + 128, 1.6 * S, 'center');

  // The stats, as on the screen: an icon and the number, the label under it, a hairline between.
  const statsY = MOON_TOP + MOON + 125;
  facts.stats.forEach((stat, i) => {
    const x = W / 2 + (i === 0 ? -1 : 1) * 64 * S;
    ctx.font = type(700, 22);
    const vw = ctx.measureText(stat.value).width;
    const iconW = 15 * S, iconGap = 6 * S;
    const start = x - (iconW + iconGap + vw) / 2;
    icon(ctx, stat.icon, start + iconW / 2, statsY - 8 * S, iconW);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(stat.value, start + iconW + iconGap, statsY);
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = type(400, 12);
    ctx.fillText(stat.label, x, statsY + 20 * S);
  });
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  ctx.fillRect(W / 2 - 1, statsY - 24 * S, 2, 32 * S);

  // The week: letters, then a circle each, the mornings got up filled with a check.
  const dayY = statsY + 62 * S, step = 46 * S, r = 17 * S;
  facts.days.forEach((day, i) => {
    const x = W / 2 + (i - 3) * step;
    ctx.textAlign = 'center';
    ctx.fillStyle = day.today ? '#FFFFFF' : 'rgba(255,255,255,0.55)';
    ctx.font = type(day.today ? 600 : 400, 13);
    ctx.fillText(day.letter, x, dayY);
    const y = dayY + 30 * S;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    if (day.done) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      // The check, in the sky's navy.
      const k = r / 17;
      ctx.strokeStyle = '#101A33';
      ctx.lineWidth = 2.2 * k;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(x - 5.5 * k, y + 0.5 * k);
      ctx.lineTo(x - 1.5 * k, y + 4.5 * k);
      ctx.lineTo(x + 6 * k, y - 4 * k);
      ctx.stroke();
    } else {
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 1.2 * S;
      ctx.stroke();
    }
  });

  // Loc on the panel's edge, as he was at the top of his yell: his canvas is transparent round
  // him and he stands on its bottom edge, so it's scaled about its bottom middle. It's drawn
  // sharper than the screen (LocStage SNAP_SCALE), so here it only ever shrinks.
  if (locImg) {
    const scale = (W * LOC_SHARE) / (locImg.width * LOC_IN_CANVAS);
    const w = locImg.width * scale, h = locImg.height * scale;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(locImg, (W - w) / 2, panelBottom - h + 2, w, h);
  }
  ctx.restore();

  // The strip: the name, and where to get it.
  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = type(700, 17);
  spaced(ctx, 'Locturne', W / 2, panelBottom + 100, 0.2 * S, 'center');
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.font = type(400, 11);
  ctx.fillText('locturne.com', W / 2, panelBottom + 145);

  return canvas.toDataURL('image/png');
}

/** How wide `spaced` draws `text`: letter by letter, so measured the same way. */
function spacedWidth(ctx: CanvasRenderingContext2D, text: string, spacing: number) {
  return [...text].reduce((sum, c) => sum + ctx.measureText(c).width, 0) + spacing * (text.length - 1);
}

/** Text with letter spacing, a letter at a time (canvas letterSpacing isn't everywhere), from `x` as `align`. */
function spaced(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, spacing: number, align: 'left' | 'center') {
  const widths = [...text].map((c) => ctx.measureText(c).width);
  const total = spacedWidth(ctx, text, spacing);
  let at = align === 'center' ? x - total / 2 : x;
  ctx.textAlign = 'left';
  [...text].forEach((c, i) => {
    ctx.fillText(c, at, y);
    at += widths[i] + spacing;
  });
  ctx.textAlign = 'center';
}

/** The stats' symbols, drawn as SF's sunrise.fill and calendar read at this size: `size` wide, centred on x, y. */
function icon(ctx: CanvasRenderingContext2D, kind: 'sunrise' | 'calendar', x: number, y: number, size: number) {
  const u = size / 16;
  ctx.save();
  ctx.fillStyle = ctx.strokeStyle = 'rgba(255,255,255,0.62)';
  ctx.lineWidth = 1.5 * u;
  ctx.lineCap = 'round';
  if (kind === 'sunrise') {
    // A sun half up over the horizon, three rays, the horizon line.
    ctx.beginPath();
    ctx.arc(x, y + 3 * u, 4.5 * u, Math.PI, 0);
    ctx.fill();
    for (const a of [-Math.PI / 2, -Math.PI / 4, (-3 * Math.PI) / 4]) {
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * 6.5 * u, y + 3 * u + Math.sin(a) * 6.5 * u);
      ctx.lineTo(x + Math.cos(a) * 8.5 * u, y + 3 * u + Math.sin(a) * 8.5 * u);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(x - 7.5 * u, y + 5 * u);
    ctx.lineTo(x + 7.5 * u, y + 5 * u);
    ctx.stroke();
  } else {
    // A page with a bar across its top.
    ctx.beginPath();
    ctx.roundRect(x - 7 * u, y - 6 * u, 14 * u, 13 * u, 2.5 * u);
    ctx.stroke();
    ctx.fillRect(x - 7 * u, y - 6 * u, 14 * u, 3.5 * u);
  }
  ctx.restore();
}
