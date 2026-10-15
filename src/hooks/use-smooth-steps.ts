import { useEffect, useState } from 'react';

import { addReading, nextTick, startSmooth, step, type Smooth } from '@/lib/wake/smooth-steps';

/**
 * The step count to show: each batch from the pedometer walked out a step at a time
 * (wake/smooth-steps.ts), so the number moves while they walk. Null stays null (still
 * reading). Only for showing: prove the morning on the raw count.
 */
export function useSmoothSteps(count: number | null): number | null {
  const [smooth, setSmooth] = useState<Smooth | null>(() => (count === null ? null : startSmooth(count)));
  // A new reading, folded in during render (as use-step-count.ts resets), so the shown count is
  // never a frame behind a drop or a jump.
  const [seen, setSeen] = useState(count);
  if (seen !== count) {
    setSeen(count);
    setSmooth((s) => (count === null ? null : s ? addReading(s, count, Date.now()) : startSmooth(count)));
  }

  const delay = smooth ? nextTick(smooth) : null;
  useEffect(() => {
    if (delay === null) return;
    const id = setTimeout(() => setSmooth((s) => (s ? step(s) : s)), delay);
    return () => clearTimeout(id);
  }, [delay, smooth?.shown]);

  return smooth ? smooth.shown : null;
}
