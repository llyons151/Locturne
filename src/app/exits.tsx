import { ExitsScreen } from '@/features/exits/exits-screen';
import { SleepSheet } from '@/features/nap/sleep-sheet';

/** Passes: the only way out early. Slides up in the Sleep sheet's floating card, like Block now (user 2026-11-02). */
export default function ExitsRoute() {
  return (
    <SleepSheet>
      <ExitsScreen />
    </SleepSheet>
  );
}
