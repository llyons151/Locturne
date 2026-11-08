import { MoonWheel } from '@/features/moons/moon-wheel-sheet';
import { SleepSheet } from '@/features/nap/sleep-sheet';

/** Home's moon opens the moon wheel in the Sleep sheet's floating glass card (features/moons/moon-wheel-sheet.tsx). */
export default function MoonWheelRoute() {
  return (
    <SleepSheet>
      <MoonWheel />
    </SleepSheet>
  );
}
