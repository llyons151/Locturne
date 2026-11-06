import { SleepSheet } from '@/features/nap/sleep-sheet';
import { DowntimeSheet } from '@/features/routine/downtime-sheet';

/** Step away's timer (its steps are fixed), opened from the Routine tab, in the Sleep sheet's floating card. */
export default function DowntimeRoute() {
  return (
    <SleepSheet>
      <DowntimeSheet part="minutes" />
    </SleepSheet>
  );
}
