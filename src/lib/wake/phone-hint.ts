/**
 * How the phone itself is standing, for push-ups: the camera only works upright in portrait,
 * leaning back a little at most. Lying flat it sees the ceiling; on its side (landscape) the
 * picture reaches Apple Vision turned 90° and the plank reads as standing. Both are easy
 * mistakes on a sleepy floor, so the screen says so before "I can't see you".
 *
 * Pure: `g` is the accelerometer's reading in g (expo-sensors), gravity included. iOS axes:
 * upright portrait is y = -1, landscape is x = ±1, face-up flat is z = -1.
 */
export type PhoneHint = 'flat' | 'sideways' | 'upsideDown';

/** Leaning back further than about 50° from upright and the front camera misses the floor. */
const FLAT_Z = 0.77;
/** Turned this far toward landscape counts as on its side. */
const SIDEWAYS_X = 0.6;

export function phoneHint(g: { x: number; y: number; z: number }): PhoneHint | null {
  const length = Math.hypot(g.x, g.y, g.z);
  // Mid-throw or shaken: no opinion.
  if (length < 0.6 || length > 1.4) return null;
  const x = g.x / length, y = g.y / length, z = g.z / length;
  if (Math.abs(z) >= FLAT_Z) return 'flat';
  if (Math.abs(x) >= SIDEWAYS_X && Math.abs(x) > Math.abs(y)) return 'sideways';
  if (y > SIDEWAYS_X) return 'upsideDown';
  return null;
}
