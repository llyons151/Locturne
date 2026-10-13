/**
 * How the phone itself is standing, for push-ups. Sideways (landscape) is the main way: a plank
 * is long and low, and a phone on its long edge sees all of it from two steps and stands steadier
 * on the floor. Upright (portrait) still counts, with a nudge to turn it. Lying flat it sees the
 * ceiling, and upside down the picture reaches Apple Vision the wrong way up.
 *
 * `turn` is which way the screen and the camera's picture are turned (UIDeviceOrientation names,
 * so the Swift side can match it): `landscapeLeft` is turned anticlockwise from upright, its right
 * edge up; `landscapeRight` clockwise, its left edge up.
 *
 * Pure: `g` is the accelerometer's reading in g (expo-sensors), gravity included. iOS axes:
 * upright portrait is y = -1, right edge up is x = -1, face-up flat is z = -1.
 */
export type PhoneTurn = 'portrait' | 'landscapeLeft' | 'landscapeRight';

/** `tall`: upright, which works, but sideways sees more of you. */
export type PhoneHint = 'flat' | 'upsideDown' | 'tall';

export type PhoneReading = { turn: PhoneTurn | null; hint: PhoneHint | null };

/** Leaning back further than about 50° from upright and the front camera misses the floor. */
const FLAT_Z = 0.77;
/** Turned this far toward landscape counts as on its side. */
const SIDEWAYS_X = 0.6;

/** Null mid-throw or shaken: no opinion. A null `turn` keeps the last one. */
export function readPhone(g: { x: number; y: number; z: number }): PhoneReading | null {
  const length = Math.hypot(g.x, g.y, g.z);
  if (length < 0.6 || length > 1.4) return null;
  const x = g.x / length, y = g.y / length, z = g.z / length;
  if (Math.abs(z) >= FLAT_Z) return { turn: null, hint: 'flat' };
  if (Math.abs(x) >= SIDEWAYS_X && Math.abs(x) > Math.abs(y)) return { turn: x < 0 ? 'landscapeLeft' : 'landscapeRight', hint: null };
  if (y > SIDEWAYS_X) return { turn: null, hint: 'upsideDown' };
  return { turn: 'portrait', hint: 'tall' };
}

/** How far the screen's content turns, in degrees clockwise, to stand upright on a phone turned `turn`. */
export const TURN_DEG: Record<PhoneTurn, number> = { portrait: 0, landscapeLeft: 90, landscapeRight: -90 };
