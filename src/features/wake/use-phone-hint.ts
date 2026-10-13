import { Accelerometer } from 'expo-sensors';
import { useEffect, useRef, useState } from 'react';

import { readPhone, type PhoneHint, type PhoneTurn } from '@/lib/wake/phone-hint';

/** A reading has to hold this long before it changes, so a nudge doesn't flicker it. */
const HOLD_MS = 600;

const key = (r: { turn: PhoneTurn | null; hint: PhoneHint | null }) => `${r.turn}/${r.hint}`;

/**
 * How the phone is standing (phone-hint.ts), while `active`: which way it's turned, kept through
 * a moment lying flat, and what to tell you about it. Null `turn` where there's no accelerometer
 * (the web preview) or before the first steady reading. Needs no permission on iOS.
 */
export function usePhone(active: boolean): { turn: PhoneTurn | null; hint: PhoneHint | null } {
  const [turn, setTurn] = useState<PhoneTurn | null>(null);
  const [hint, setHint] = useState<PhoneHint | null>(null);
  const pending = useRef<{ key: string; since: number } | null>(null);

  useEffect(() => {
    if (!active) return;
    let subscription: { remove: () => void } | null = null;
    let stopped = false;
    Accelerometer.isAvailableAsync()
      .then((available) => {
        if (!available || stopped) return;
        Accelerometer.setUpdateInterval(200);
        subscription = Accelerometer.addListener((g) => {
          const next = readPhone(g);
          if (!next) return;
          const now = Date.now();
          if (pending.current?.key !== key(next)) pending.current = { key: key(next), since: now };
          else if (now - pending.current.since >= HOLD_MS) {
            if (next.turn) setTurn(next.turn);
            setHint(next.hint);
          }
        });
      })
      .catch(() => {});
    return () => {
      stopped = true;
      subscription?.remove();
      pending.current = null;
      setHint(null);
    };
  }, [active]);

  return { turn, hint: active ? hint : null };
}
