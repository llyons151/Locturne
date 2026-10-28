import { useLocalSearchParams } from 'expo-router';

import { SleepSheet } from '@/features/nap/sleep-sheet';
import { CodeSheet } from '@/features/scan/code-sheet';

/** Setting up the wake-up code, opened from Routine or You, in the Sleep sheet's floating card. */
export default function CodeRoute() {
  // `?select=1`: opened by choosing "Scan a code" with no code yet; saving one also picks it.
  const { select } = useLocalSearchParams<{ select?: string }>();
  return (
    <SleepSheet>
      <CodeSheet select={select === '1'} />
    </SleepSheet>
  );
}
