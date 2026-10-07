import { NapScreen } from '@/features/nap/nap-screen';
import { SleepSheet } from '@/features/nap/sleep-sheet';

/** Block now, opened by the Sleep button beside the tab bar, in its floating sheet. */
export default function SleepRoute() {
  return (
    <SleepSheet>
      <NapScreen />
    </SleepSheet>
  );
}
