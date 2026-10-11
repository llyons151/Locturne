import { Accelerometer } from 'expo-sensors';
import { useEffect, useRef, useState } from 'react';

import { phoneHint, type PhoneHint } from '@/lib/wake/phone-hint';

/** A reading has to hold this long before the hint changes, so a nudge doesn't flicker it. */
const HOLD_MS = 600;

/**
 * How the phone is standing (phone-hint.ts), while `active`. Null where there's no
 * accelerometer (the web preview) or it's standing right. Needs no permission on iOS.
 */
export function usePhoneHint(active: boolean): PhoneHint | null {
  const [hint, setHint] = useState<PhoneHint | null>(null);
  const pending = useRef<{ hint: PhoneHint | null; since: number } | null>(null);

  useEffect(() => {
    if (!active) return;
    let subscription: { remove: () => void } | null = null;
    let stopped = false;
    Accelerometer.isAvailableAsync()
      .then((available) => {
        if (!available || stopped) return;
        Accelerometer.setUpdateInterval(200);
        subscription = Accelerometer.addListener((g) => {
          const next = phoneHint(g);
          const now = Date.now();
          if (pending.current?.hint !== next) pending.current = { hint: next, since: now };
          else if (now - pending.current.since >= HOLD_MS) setHint(next);
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

  return active ? hint : null;
}
