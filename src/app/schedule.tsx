import { ScheduleSheet } from '@/features/apps/schedule-sheet';
import { SleepSheet } from '@/features/nap/sleep-sheet';

/** An app schedule's times, opened from the Apps tab, in the Sleep sheet's floating card. */
export default function ScheduleRoute() {
  return (
    <SleepSheet>
      <ScheduleSheet />
    </SleepSheet>
  );
}
