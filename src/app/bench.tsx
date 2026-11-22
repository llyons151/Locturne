import { SleepSheet } from '@/features/nap/sleep-sheet';
import { PushupsSheet } from '@/features/routine/pushups-sheet';

/** How many bench press reps a morning takes, opened from the Routine tab, in the Sleep sheet's floating card, as push-ups'. */
export default function BenchRoute() {
  return (
    <SleepSheet>
      <PushupsSheet exercise="bench" />
    </SleepSheet>
  );
}
