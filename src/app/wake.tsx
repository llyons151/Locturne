import { Redirect, useLocalSearchParams, type Href } from 'expo-router';

import { AppBackground } from '@/components/app-background';
import { WakeScreen, type WakeMethodShown } from '@/features/wake/wake-screen';
import { getRoutine } from '@/lib/routine';

/**
 * The morning wake-up. `?method=downstairs|steps` opens that method (the shield tap or a
 * notification can pick one); without it the routine's method opens, and a scan routine
 * goes straight to the scan screen.
 */
export default function WakeRoute() {
  const { method } = useLocalSearchParams<{ method?: string }>();
  const chosen: WakeMethodShown | undefined =
    method === 'downstairs' || method === 'steps' ? method : undefined;
  if (!chosen && getRoutine().method === 'scan') return <Redirect href={'/scan' as Href} />;
  return (
    <AppBackground>
      <WakeScreen method={chosen} />
    </AppBackground>
  );
}
