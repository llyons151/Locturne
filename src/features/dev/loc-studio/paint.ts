import { LOC_VIEW } from '@/features/home/loc-rig';

/** What's behind him. "Moon" is Home: he's black in front of the moon, on the nav strip's edge. */
export type Backdrop = 'moon' | 'night' | 'paper' | 'gray' | 'checker';
export const BACKDROPS: { id: Backdrop; label: string }[] = [
  { id: 'moon', label: 'Moon (Home)' },
  { id: 'night', label: 'Night sky' },
  { id: 'paper', label: 'Paper' },
  { id: 'gray', label: 'Mid gray' },
  { id: 'checker', label: 'Checker' },
];

const SKY = '#11131C';
const MOON = '#D8D5E2';
const STRIP = '#000000';

/** His canvas's height for a width, at `share` of the width: just his view box, sitting on the ledge. */
export const locHeight = (width: number, share: number) => Math.round(((width * share) / LOC_VIEW.width) * LOC_VIEW.height);

/**
 * Paints the backdrop into `w` x `h`, with the strip (`strip` px) along the bottom. `ledge` is
 * where his canvas's bottom sits and `size` is his width, so the moon sits behind him.
 */
export function paintBackdrop(ctx: CanvasRenderingContext2D, w: number, h: number, backdrop: Backdrop, ledge: number, size: number, strip: number) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);
  if (backdrop === 'checker') {
    const c = Math.max(6, Math.round(w / 48));
    for (let y = 0; y < h; y += c) for (let x = 0; x < w; x += c) {
      ctx.fillStyle = ((x + y) / c) % 2 === 0 ? '#CFCFCF' : '#F2F2F2';
      ctx.fillRect(x, y, c, c);
    }
  } else {
    ctx.fillStyle = backdrop === 'paper' ? '#F3F1EC' : backdrop === 'gray' ? '#8C8C8C' : SKY;
    ctx.fillRect(0, 0, w, h);
  }
  if (backdrop === 'moon') {
    // Behind his head, cut off by the strip, like Home's moon.
    ctx.fillStyle = MOON;
    ctx.beginPath();
    ctx.arc(w / 2, ledge - size * 0.32, size * 0.62, 0, Math.PI * 2);
    ctx.fill();
  }
  if (strip > 0) {
    ctx.fillStyle = STRIP;
    ctx.fillRect(0, ledge, w, Math.max(strip, h - ledge));
  }
}

/** Saves a canvas as a PNG download. */
export function download(canvas: HTMLCanvasElement, name: string) {
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = name;
  a.click();
}
