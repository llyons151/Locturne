import { LimitSheet } from '@/features/apps/limit-sheet';
import { SleepSheet } from '@/features/nap/sleep-sheet';

/** A daily limit's time, opened from the Apps tab, in the Sleep sheet's floating card. */
export default function LimitRoute() {
  return (
    <SleepSheet>
      <LimitSheet />
    </SleepSheet>
  );
}
