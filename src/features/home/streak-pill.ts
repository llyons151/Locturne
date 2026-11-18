import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { tap } from '@/lib/haptics';

import { morningsLabel } from './week';

/**
 * Home's top-left pill (user 2026-11-16, docs/STREAK_LAB.md): the streak, "6 day streak"; a tap
 * flips it to the lifetime count, "23 mornings", and back. It always starts on the streak, even at
 * 0 (user 2026-11-16: "it should always start out in streak mode"), and goes back to it when the
 * app leaves the screen.
 */
export function useStreakPill(streak: number, mornings: number, opensOn: 'streak' | 'total' = 'streak') {
  const [flipped, setFlipped] = useState(false);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background') setFlipped(false);
    });
    return () => sub.remove();
  }, []);
  // The moons page opens on every morning and flips to the streak (user 2026-11-16); Home the other way.
  const total = opensOn === 'total' ? !flipped : flipped;
  return {
    total,
    canFlip: true,
    value: total ? mornings : streak,
    // Not "mornings total": beside the 200 pt screen time report it ran into it on a phone's width.
    label: total ? morningsLabel(mornings) : 'day streak',
    /** VoiceOver reads the side shown, and says a tap shows the other. */
    a11y: total ? `${mornings} ${morningsLabel(mornings)} you got up, in all` : `${streak} day streak`,
    hint: total ? 'Shows your streak' : 'Shows every morning you got up',
    flip: () => {
      tap();
      setFlipped((f) => !f);
    },
  };
}
