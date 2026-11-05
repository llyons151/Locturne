import { useLocalSearchParams } from 'expo-router';

import { SleepSheet } from '@/features/nap/sleep-sheet';
import { DowntimeSheet } from '@/features/routine/downtime-sheet';

/** Step away's timer (or, with `?part=steps`, its steps), opened from the Routine tab, in the Sleep sheet's floating card. */
export default function DowntimeRoute() {
  const { part } = useLocalSearchParams<{ part?: string }>();
  return (
    <SleepSheet>
      <DowntimeSheet part={part === 'steps' ? 'steps' : 'minutes'} />
    </SleepSheet>
  );
}
