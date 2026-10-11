import { requireOptionalNativeModule } from 'expo';

const Native = requireOptionalNativeModule<{ cameraAccess?: () => string }>('PoseCamera');

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
