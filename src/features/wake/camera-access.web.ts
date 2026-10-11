import type { CameraAccess } from './camera-access';

export type { CameraAccess };

/** The web preview: the browser asks when the camera starts, and a refusal comes back as `onCameraError`. */
export function useCameraAccess(): { access: CameraAccess; request: () => Promise<boolean> } {
  return { access: 'granted', request: async () => true };
}
