import { Pedometer } from 'expo-sensors';

export type MotionAccess = 'granted' | 'denied' | 'unavailable';

/**
 * Motion & Fitness, asked after purchase (TODO §4). Steps and the barometer behind
 * "go downstairs" both sit behind this one iOS permission. `unavailable` off iOS and on
 * devices without a step counter.
 */
export async function requestMotion(): Promise<MotionAccess> {
  try {
    if (!(await Pedometer.isAvailableAsync())) return 'unavailable';
    const current = await Pedometer.getPermissionsAsync();
    if (current.granted) return 'granted';
    const answer = await Pedometer.requestPermissionsAsync();
    return answer.granted ? 'granted' : 'denied';
  } catch {
    return 'unavailable';
  }
}
