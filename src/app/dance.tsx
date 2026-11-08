import { SleepSheet } from '@/features/nap/sleep-sheet';
import { PushupsSheet } from '@/features/routine/pushups-sheet';

/** Dance's seconds straight, opened from the Routine tab, in the Sleep sheet's floating card, as push-ups'. */
export default function DanceRoute() {
  return (
    <SleepSheet>
      <PushupsSheet exercise="dance" />
    </SleepSheet>
  );
}
