import { SleepSheet } from '@/features/nap/sleep-sheet';
import { MethodSheet } from '@/features/routine/method-sheet';

/** How you get up, a grid of cards opened from the Routine tab, in the Sleep sheet's floating card. */
export default function WakeMethodRoute() {
  return (
    <SleepSheet>
      <MethodSheet />
    </SleepSheet>
  );
}
