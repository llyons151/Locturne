import { create } from 'qrcode';
import { useMemo } from 'react';
import Svg, { Path, Rect } from 'react-native-svg';

/**
 * The person's QR, drawn from the `qrcode` library's module grid so the screen and the
 * printout are the same picture. Black on white with the standard 4-module quiet zone:
 * cameras need the contrast, whatever the app's colours.
 */

const QUIET = 4;

/** One SVG path covering every dark module, in module units. */
function modulePath(data: string): { size: number; d: string } {
  // Medium error correction survives a creased or slightly smudged printout.
  const { modules } = create(data, { errorCorrectionLevel: 'M' });
  let d = '';
  for (let row = 0; row < modules.size; row++) {
    for (let col = 0; col < modules.size; col++) {
      if (modules.get(row, col)) d += `M${col + QUIET} ${row + QUIET}h1v1h-1z`;
    }
  }
  return { size: modules.size + QUIET * 2, d };
}

export function QrCode({ data, size }: { data: string; size: number }) {
  const { size: units, d } = useMemo(() => modulePath(data), [data]);
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${units} ${units}`} accessibilityLabel="Your wake-up code">
      <Rect width={units} height={units} fill="#FFFFFF" />
      <Path d={d} fill="#000000" />
    </Svg>
  );
}

/**
 * A printable page: the code big enough to scan from arm's length, and one plain line
 * saying what it is. Goes to `expo-print` as HTML.
 */
export function printableHtml(data: string): string {
  const { size: units, d } = modulePath(data);
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    body { font-family: -apple-system, Helvetica, sans-serif; text-align: center; margin: 0; padding-top: 96px; color: #000; }
    svg { width: 340px; height: 340px; }
    h1 { font-family: ui-serif, Georgia, serif; font-style: italic; font-weight: 800; font-size: 30px; margin: 40px 0 8px; }
    p { font-size: 15px; color: #444; margin: 0; }
  </style></head><body>
    <svg viewBox="0 0 ${units} ${units}" shape-rendering="crispEdges"><rect width="${units}" height="${units}" fill="#fff"/><path d="${d}" fill="#000"/></svg>
    <h1>If you&rsquo;re reading this, you&rsquo;re up.</h1>
    <p>Locturne wake-up code. Keep it out of the bedroom.</p>
  </body></html>`;
}
