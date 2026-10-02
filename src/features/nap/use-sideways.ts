import { Accelerometer } from 'expo-sensors';
import { useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';

/**
 * Which way the phone is turned on its side, as the rotation that sets content upright:
 * 90 when its top points left, -90 when it points right, null when it isn't sideways.
 *
 * The app is locked to portrait, so this reads gravity instead of the interface
 * orientation. To stay cheap on battery it only listens while `enabled` and the app is in
 * the foreground, a few times a second, and needs two readings in a row before it flips.
 */
export type Sideways = 90 | -90 | null;

const INTERVAL_MS = 400;

/** Gravity along the phone's short side: past ENTER it's sideways, under EXIT it's not. */
const ENTER = 0.8;
const EXIT = 0.5;

export function useSideways(enabled: boolean): Sideways {
  const [side, setSide] = useState<Sideways>(null);
  const [active, setActive] = useState(AppState.currentState === 'active');

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => setActive(s === 'active'));
    return () => sub.remove();
  }, []);

  const listening = enabled && active && Platform.OS !== 'web';

  useEffect(() => {
    if (!listening) return;
    let current: Sideways = null;
    let pending: Sideways = null;
    Accelerometer.setUpdateInterval(INTERVAL_MS);
    const sub = Accelerometer.addListener(({ x, z }) => {
      // Lying flat on a table doesn't count, whatever x says.
      const flat = Math.abs(z) > 0.75;
      let next: Sideways = current;
      if (!flat && x < -ENTER) next = 90;
      else if (!flat && x > ENTER) next = -90;
      else if (flat || Math.abs(x) < EXIT) next = null;

      if (next === current) {
        pending = null;
      } else if (next === pending) {
        current = next;
        pending = null;
        setSide(next);
      } else {
        pending = next;
      }
    });
    return () => {
      sub.remove();
      setSide(null);
    };
  }, [listening]);

  return listening ? side : null;
}
