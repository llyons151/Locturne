import { useCameraPermissions } from 'expo-camera';
import { useCallback, useEffect } from 'react';
import { AppState, Linking } from 'react-native';

export type CameraAccess = 'checking' | 'ask' | 'granted' | 'denied';

/**
 * Camera access for push-ups, read again on the way back from Settings (as the scanner does).
 * `ask` shows Continue before Apple's prompt; `denied` sends to Settings.
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
      : permission.canAskAgain
        ? 'ask'
        : 'denied';

  const request = useCallback(async () => {
    if (access === 'denied') {
      await Linking.openSettings().catch(() => {});
      return false;
    }
    const answer = await requestPermission().catch(() => null);
    return !!answer?.granted;
  }, [access, requestPermission]);

  return { access, request };
}
