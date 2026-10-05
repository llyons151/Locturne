import Constants from 'expo-constants';
import * as StoreReview from 'expo-store-review';
import { useIsFocused } from 'expo-router';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { getReviewAskedVersion, markReviewAsked, shouldAskForReview } from '@/lib/first-run';
import type { LockState } from '@/lib/lock-state';
import type { MorningProof } from '@/lib/morning-proof';

/** Long enough for "You did okay" to land before Apple's sheet covers it. */
const DELAY_MS = 2500;

/**
 * Apple's rating sheet, once per app version, after a morning that worked (a real wake-up,
 * never a pass or the emergency unlock). Only Home calls this, so it never shows during
 * onboarding. iOS decides whether the sheet actually appears and caps it at three a year.
 */
export function useReviewPrompt(lock: Pick<LockState, 'phase' | 'morningKey'>, proof: MorningProof | null) {
  const version = Constants.expoConfig?.version ?? '0';
  // Home stays mounted under the wake screen, whose proof makes this due: wait until Home is
  // the screen on top, or Apple's sheet covers the wake-up (and can stack on iOS's
  // notification prompt there).
  const focused = useIsFocused();
  const due = focused && shouldAskForReview(proof, lock, getReviewAskedVersion(), version);

  useEffect(() => {
    if (!due) return;
    let live = true;
    const id = setTimeout(async () => {
      try {
        if (!(await StoreReview.isAvailableAsync()) || !live || AppState.currentState !== 'active') return;
        // Marked before asking, so a crash in the sheet can't make it ask twice.
        markReviewAsked(version);
        await StoreReview.requestReview();
      } catch {
        // A rating prompt is never worth an error.
      }
    }, DELAY_MS);
    return () => {
      live = false;
      clearTimeout(id);
    };
  }, [due, version]);
}
