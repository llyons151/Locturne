/**
 * The panel's outline, all the way round: the edge Loc's lump runs along in the ultra zoomies
 * (loc-ultra.ts). Measured in points along it from the middle of the bottom edge (where he
 * lives), growing to the right: along the bottom, round the panel's bottom corner, up the
 * screen's right side, round the top corner, across the top, and down the left side back home.
 * Plain math, so Loc's rig (in the webview) plans with it and the overlay (components/loc-rim)
 * draws with it on the UI thread.
 */
export type Rim = {
  /** The screen's width. */
  W: number;
  /** The panel's height: where its bottom edge, the covers, is. */
  H: number;
  /** The panel's bottom corners (PANEL_RADIUS in app-tabs.tsx). */
  Rb: number;
  /** The top corners, close to the phone's own, so he rounds them instead of vanishing into them. */
  Rt: number;
};

/** The phone's own top corners, near enough on every recent iPhone. */
export const RIM_TOP_CORNER = 48;

/** Where each stretch of the right half starts, and the whole loop's length `L`. */
export function rimMarks(r: Rim) {
  'worklet';
  const flat = r.W / 2 - r.Rb;
  const wallUp = flat + (Math.PI / 2) * r.Rb;
  const cornerT = wallUp + Math.max(0, r.H - r.Rb - r.Rt);
  const topIn = cornerT + (Math.PI / 2) * r.Rt;
  const L = 2 * (topIn + r.W / 2 - r.Rt);
  return { flat, wallUp, cornerT, topIn, L };
}

/**
 * The point `u` points round the rim, and the unit normal pointing in from the edge, into the
 * panel: [x, y, nx, ny], y growing down. Any `u` works; it wraps round the loop.
 */
export function rimPoint(u: number, r: Rim): [number, number, number, number] {
  'worklet';
  const { flat, wallUp, cornerT, topIn, L } = rimMarks(r);
  let m = ((u % L) + L) % L;
  // The left half is the right half mirrored.
  const left = m > L / 2;
  if (left) m = L - m;
  let x: number, y: number, nx: number, ny: number;
  if (m <= flat) {
    x = r.W / 2 + m; y = r.H; nx = 0; ny = -1;
  } else if (m <= wallUp) {
    const a = (m - flat) / r.Rb, dx = Math.sin(a), dy = Math.cos(a);
    x = r.W - r.Rb + r.Rb * dx; y = r.H - r.Rb + r.Rb * dy; nx = -dx; ny = -dy;
  } else if (m <= cornerT) {
    x = r.W; y = r.H - r.Rb - (m - wallUp); nx = -1; ny = 0;
  } else if (m <= topIn) {
    const a = (m - cornerT) / r.Rt, dx = Math.cos(a), dy = -Math.sin(a);
    x = r.W - r.Rt + r.Rt * dx; y = r.Rt + r.Rt * dy; nx = -dx; ny = -dy;
  } else {
    x = r.W - r.Rt - (m - topIn); y = 0; nx = 0; ny = 1;
  }
  return left ? [r.W - x, y, -nx, ny] : [x, y, nx, ny];
}
