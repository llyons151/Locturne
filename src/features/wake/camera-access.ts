import { useCameraPermissions } from 'expo-camera';
import { useCallback, useEffect } from 'react';
import { AppState, Linking } from 'react-native';

import { isCameraRestricted } from '../../../modules/pose-camera';

export type CameraAccess = 'checking' | 'ask' | 'granted' | 'denied' | 'restricted';

/**
 * Camera access for push-ups, read again on the way back from Settings (as the scanner does).
 * `ask` shows Continue before Apple's prompt; `denied` sends to Settings; `restricted` (Screen
 * Time or a profile) is off where Settings can't help, so only walking is offered.
 */
export function useCameraAccess(): { access: CameraAccess; request: () => Promise<boolean> } {
  const [permission, requestPermission, getPermission] = useCameraPermissions();
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') getPermission().catch(() => {});
    });
    return () => subscription.remove();
  }, [getPermission]);

  const access: CameraAccess = !permission
    ? 'checking'
    : permission.granted
      ? 'granted'
      : isCameraRestricted()
        ? 'restricted'
        : permission.canAskAgain
          ? 'ask'
          : 'denied';

  const request = useCallback(async () => {
    if (access === 'restricted') return false;
    if (access === 'denied') {
      await Linking.openSettings().catch(() => {});
      return false;
    }
    const answer = await requestPermission().catch(() => null);
    return !!answer?.granted;
  }, [access, requestPermission]);

  return { access, request };
}
