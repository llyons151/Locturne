import { TextWheel } from '@/components/time-wheel';

import type { MoonWheelProps } from './moon-wheel-types';

/** The web preview's stand-in for the iPhone's system wheel (`moon-wheel.ios.tsx`). */
export function MoonWheel({ rows, value, onChange }: MoonWheelProps) {
  return (
    <TextWheel
      items={rows.map((row) => row.label)}
      index={Math.max(0, rows.findIndex((row) => row.id === value))}
      onIndex={(i) => onChange(rows[i].id)}
      label="Moon"
    />
  );
}
