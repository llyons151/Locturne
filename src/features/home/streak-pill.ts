import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { tap } from '@/lib/haptics';

import { morningsLabel } from './week';

/**
 * Home's top-left pill (user 2026-11-16, docs/STREAK_LAB.md): the streak, "6 day streak"; a tap
 * flips it to the lifetime count, "23 mornings", and back. It goes back to the streak when
 * the app leaves the screen, so the streak is what you see first. With no streak running (none
 * yet, or a missed morning since), it shows the total and doesn't flip: never "0 day streak".
 */
export function useStreakPill(streak: number, mornings: number) {
  const [flipped, setFlipped] = useState(false);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background') setFlipped(false);
    });
    return () => sub.remove();
  }, []);
  const canFlip = streak > 0;
  const total = flipped || !canFlip;
  return {
    total,
    canFlip,
    value: total ? mornings : streak,
    // Not "mornings total": beside the 200 pt screen time report it ran into it on a phone's width.
    label: total ? morningsLabel(mornings) : 'day streak',
    /** VoiceOver reads the side shown, and says a tap shows the other. */
    a11y: total ? `${mornings} ${morningsLabel(mornings)} you got up, in all` : `${streak} day streak`,
    hint: canFlip ? (total ? 'Shows your streak' : 'Shows every morning you got up') : undefined,
    flip: () => {
      if (!canFlip) return;
      tap();
      setFlipped((f) => !f);
    },
  };
}
