import { DurationWheel } from '@/components/time-wheel';
import { LIMIT_MAX } from '@/lib/daily-limits';

import type { LimitWheelProps } from './limit-wheel-types';

/** The web preview's stand-in for the iPhone's system wheels (`limit-wheel.ios.tsx`). */
export function LimitWheel({ value, onChange }: LimitWheelProps) {
  return <DurationWheel value={value} onChange={onChange} maxHours={Math.floor(LIMIT_MAX / 60)} />;
}
