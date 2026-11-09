import { Camera } from 'expo-camera';
import * as Location from 'expo-location';
import { Pedometer } from 'expo-sensors';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Linking } from 'react-native';

import type { WakeMethod } from '@/lib/routine';

import { wakeNeedFor, type WakeNeed } from './wake-access-words';

/** iOS's answer for the wake-up's permission: on, still askable, or only fixable in Settings. */
type Answer = 'granted' | 'ask' | 'settings';

async function read(need: WakeNeed): Promise<Answer> {
  try {
    if (need === 'motion' && !(await Pedometer.isAvailableAsync())) return 'granted';
    const p =
      need === 'motion'
        ? await Pedometer.getPermissionsAsync()
        : need === 'camera'
          ? await Camera.getCameraPermissionsAsync()
          : await Location.getForegroundPermissionsAsync();
    return p.granted ? 'granted' : p.canAskAgain ? 'ask' : 'settings';
  } catch {
    return 'granted';
  }
}

async function request(need: WakeNeed): Promise<void> {
  try {
    if (need === 'motion') await Pedometer.requestPermissionsAsync();
    else if (need === 'camera') await Camera.requestCameraPermissionsAsync();
    else await Location.requestForegroundPermissionsAsync();
  } catch {
    // Read again below either way.
  }
}

export type WakeAccess = {
  /** The permission is off, so the morning could never wake the apps. */
  off: boolean;
  /** Waiting on Apple's prompt (`fix`). */
  asking: boolean;
  /** Asks iOS right here while it still can; once refused for good, opens Settings. */
  fix: () => void;
};

/**
 * The wake-up's permission (Motion & Fitness, camera or location), read on every visit and on
 * the way back from Settings. Off covers both never answered and refused (user 2026-11-08).
 */
export function useWakeAccess(method: WakeMethod, live: boolean): WakeAccess {
  const need = wakeNeedFor(method);
  const [answer, setAnswer] = useState<Answer>('granted');
  const [asking, setAsking] = useState(false);
  const recheck = useCallback(() => {
    if (!live) return;
    let current = true;
    read(need).then((a) => current && setAnswer(a));
    return () => {
      current = false;
    };
  }, [need, live]);
  useFocusEffect(recheck);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => state === 'active' && recheck());
    return () => sub.remove();
  }, [recheck]);

  const fix = () => {
    if (asking) return;
    if (answer === 'settings') {
      Linking.openSettings().catch(() => {});
      return;
    }
    setAsking(true);
    request(need)
      .then(() => read(need))
      .then(setAnswer)
      .finally(() => setAsking(false));
  };
  return { off: live && answer !== 'granted', asking, fix };
}
