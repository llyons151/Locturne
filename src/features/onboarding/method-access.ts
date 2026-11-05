import { Camera } from 'expo-camera';
import * as Location from 'expo-location';

import type { WakeMethod } from '../../lib/routine.ts';

/**
 * The iOS permission a wake-up way needs beyond Motion & Fitness: the camera for a scan code or
 * push-ups, When-In-Use location for a place. Steps and stairs need only Motion. Asked on
 * `armed` right after Motion, so the first morning never opens on a prompt (user, 2026-10-26).
 */
export type MethodAccess = 'camera' | 'location';

export function methodAccessFor(method: WakeMethod): MethodAccess | null {
  if (method === 'scan' || method === 'pushups') return 'camera';
  if (method === 'place') return 'location';
  return null;
}

/** True while iOS would still show the prompt; false when there's nothing to ask. Never asks. */
export async function methodAccessPending(method: WakeMethod): Promise<boolean> {
  const access = methodAccessFor(method);
  try {
    if (access === 'camera') return (await Camera.getCameraPermissionsAsync()).status === 'undetermined';
    if (access === 'location') return (await Location.getForegroundPermissionsAsync()).status === 'undetermined';
  } catch {
    // Asked again where it's used.
  }
  return false;
}

/** Never blocks setup: a no is handled where it's used (the scanner, the push-up camera, the place check). */
export async function requestMethodAccess(method: WakeMethod): Promise<void> {
  const access = methodAccessFor(method);
  try {
    if (access === 'camera') await Camera.requestCameraPermissionsAsync();
    else if (access === 'location') await Location.requestForegroundPermissionsAsync();
  } catch {
    // Asked again where it's used.
  }
}
