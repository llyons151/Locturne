import { Camera } from 'expo-camera';
import * as Location from 'expo-location';

import type { WakeMethod } from '../../lib/routine.ts';

/**
 * The iOS permission a wake-up way needs beyond Motion & Fitness, asked on the `walk` page's
 * "Start walking" right after Motion: the camera for a scan code or push-ups, When-In-Use
 * location for a place. Steps and stairs need only Motion. Never blocks the walk: a no here
 * is handled where the permission is used (the scanner, the push-up camera, the place check).
 */
export async function requestMethodAccess(method: WakeMethod): Promise<void> {
  try {
    if (method === 'scan' || method === 'pushups') await Camera.requestCameraPermissionsAsync();
    else if (method === 'place') await Location.requestForegroundPermissionsAsync();
  } catch {
    // Asked again where it's used.
  }
}
