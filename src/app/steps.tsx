import { SleepSheet } from '@/features/nap/sleep-sheet';
import { StepsSheet } from '@/features/routine/steps-sheet';

/** The step target, opened from the Routine tab, in the Sleep sheet's floating card. */
export default function StepsRoute() {
  return (
    <SleepSheet>
      <StepsSheet />
    </SleepSheet>
  );
}
