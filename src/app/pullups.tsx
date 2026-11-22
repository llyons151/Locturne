import { SleepSheet } from '@/features/nap/sleep-sheet';
import { PushupsSheet } from '@/features/routine/pushups-sheet';

/** How many pull-ups a morning takes, opened from the Routine tab, in the Sleep sheet's floating card, as push-ups'. */
export default function PullupsRoute() {
  return (
    <SleepSheet>
      <PushupsSheet exercise="pullups" />
    </SleepSheet>
  );
}
