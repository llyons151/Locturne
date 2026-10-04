import { Redirect, useLocalSearchParams } from 'expo-router';

import { AppBackground } from '@/components/app-background';
import { WakeScreen, type WakeMethodShown } from '@/features/wake/wake-screen';
import { getRoutine } from '@/lib/routine';
import { getScanCode } from '@/lib/scan';

/**
 * The morning wake-up. `?method=downstairs|steps` opens that method (the shield tap or a
 * notification can pick one); without it the routine's method opens, and a scan routine
 * goes straight to the scan screen, or to steps while no code is set up yet.
 */
export default function WakeRoute() {
  const { method } = useLocalSearchParams<{ method?: string }>();
  const chosen: WakeMethodShown | undefined =
    method === 'downstairs' || method === 'steps' ? method : undefined;
  const scan = !chosen && getRoutine().method === 'scan';
  if (scan && getScanCode()) return <Redirect href="/scan?mode=morning" />;
  return (
    <AppBackground>
      <WakeScreen method={scan ? 'steps' : chosen} />
    </AppBackground>
  );
}
