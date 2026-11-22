import { requireOptionalNativeModule } from 'expo';

const Native = requireOptionalNativeModule<{ cameraAccess?: () => string; knownExercises?: () => string[] }>('PoseCamera');

/**
 * The camera is restricted on this phone (Screen Time or a profile), which Settings can't turn on;
 * expo-camera reports it as plain denied. False on web and on a build before this existed.
 */
export function isCameraRestricted(): boolean {
  try {
    return Native?.cameraAccess?.() === 'restricted';
  } catch {
    return false;
  }
}

/**
 * Does this build's native side (its shield and monitor extensions) know a camera exercise?
 * Pull-ups and the bench press came 2026-11-21: on an older build the extensions take them for a walk, so
 * they're only offered once the build says it knows them. Push-ups and dance always.
 */
export function buildKnowsExercise(exercise: string): boolean {
  if (exercise === 'pushups' || exercise === 'dance') return true;
  try {
    return Native?.knownExercises?.().includes(exercise) ?? false;
  } catch {
    return false;
  }
}
