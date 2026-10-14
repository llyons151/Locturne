import { useCallback } from 'react';
import { AccessibilityInfo } from 'react-native';

import * as haptic from '@/lib/haptics';
import { proveMorning, readLock } from '@/lib/lock-controller';
import type { LockState } from '@/lib/lock-state';
import { askForNotifications, shouldAskForNotifications } from '@/lib/notifications';

import { pretendWoke, useWakePreview } from '../dev/wake-lab/wake-preview';
import { awakeStatus } from './awake-status';
import type { WakeMethodShown } from './wake-screen';

/**
 * A wake-up method met: record the proof (`proveMorning`, which syncs the shields), the success
 * haptic, a VoiceOver line, and the first proven morning's notification ask. Returns the new
 * state, or null when nothing was recorded (bedtime came round, or the night was off). Shared by
 * the wake screen and Home's morning walk.
 *
 * In the wake preview's pretend morning (/wake-preview) nothing is recorded: it moves to "done".
 */
export function useProveMorning() {
  const pretend = useWakePreview().phase !== 'real';
  return useCallback(
    (kind: WakeMethodShown): LockState | null => {
      if (pretend) {
        haptic.done();
        pretendWoke();
        return { ...readLock(), phase: 'day' };
      }
      const state = proveMorning(kind) ?? readLock();
      if (state.phase !== 'day') return null;
      announceWoke(state);
      return state;
    },
    [pretend],
  );
}

/**
 * The moment after a proof is recorded, however it was (`proveMorning`, a place check-in, a
 * scan): the success haptic, a VoiceOver line, and the first proven morning's notification ask.
 */
export function announceWoke(state: LockState) {
  haptic.done();
  // The control VoiceOver was on goes away with the swap; say what happened.
  AccessibilityInfo.announceForAccessibility(`I'm up. ${awakeStatus(state)}`);
  // The first proven morning is the moment to ask (GAME_PLAN); iOS shows its own prompt once.
  shouldAskForNotifications()
    .then((ask) => (ask ? askForNotifications() : false))
    .catch(() => {});
}
