import { SleepSheet } from '@/features/nap/sleep-sheet';
import { PushupsSheet } from '@/features/routine/pushups-sheet';

/** The squat count, opened from the Routine tab, in the Sleep sheet's floating card, as push-ups'. */
export default function SquatsRoute() {
  return (
    <SleepSheet>
      <PushupsSheet exercise="squats" />
    </SleepSheet>
  );
}
