import { NumberWheel } from '@/components/time-wheel';
import { PUSHUP_MAX, PUSHUP_MIN } from '@/lib/routine';

import type { PushupWheelProps } from './pushup-wheel-types';

/** The web preview's stand-in for the iPhone's system wheel (`pushup-wheel.ios.tsx`). */
export function PushupWheel({ value, onChange, range = { min: PUSHUP_MIN, max: PUSHUP_MAX, by: 1 }, label = 'Push-ups' }: PushupWheelProps) {
  return <NumberWheel value={value} onChange={onChange} min={range.min} max={range.max} by={range.by} label={label} />;
}
