import { LeaveRoute } from '@/components/leave-route';
import { SleepSheet } from '@/features/nap/sleep-sheet';
import { MoonPicker } from '@/features/moons/moon-picker';

/**
 * Dev tool: wear any moon, all unlocked (features/moons), on a wheel in the Sleep sheet's floating
 * card like the step target. Kept out of the App Store build like the other labs.
 */
export default function MoonsRoute() {
  if (!__DEV__ && process.env.EXPO_PUBLIC_DEV_LABS !== '1') return <LeaveRoute />;
  return (
    <SleepSheet>
      <MoonPicker />
    </SleepSheet>
  );
}
