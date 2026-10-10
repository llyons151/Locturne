import { SleepSheet } from '@/features/nap/sleep-sheet';
import { PushupsSheet } from '@/features/routine/pushups-sheet';

/** The push-up count, opened from the Routine tab, in the Sleep sheet's floating card. */
export default function PushupsRoute() {
  return (
    <SleepSheet>
      <PushupsSheet />
    </SleepSheet>
  );
}
