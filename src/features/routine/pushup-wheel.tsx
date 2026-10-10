import { NumberWheel } from '@/components/time-wheel';
import { PUSHUP_MAX, PUSHUP_MIN } from '@/lib/routine';

import type { PushupWheelProps } from './pushup-wheel-types';

/** The web preview's stand-in for the iPhone's system wheel (`pushup-wheel.ios.tsx`). */
export function PushupWheel({ value, onChange }: PushupWheelProps) {
  return <NumberWheel value={value} onChange={onChange} min={PUSHUP_MIN} max={PUSHUP_MAX} label="Push-ups" />;
}
