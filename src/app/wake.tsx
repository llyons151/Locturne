'use no memo';
// Reads the App Group stores during render (routine, passes, limits…), which change outside
// React. The React Compiler would cache those reads from the first render (Home mounts under
// onboarding before a routine exists, and showed the defaults after), so it stays out here.

import { Redirect, useLocalSearchParams } from 'expo-router';

import { AppBackground } from '@/components/app-background';
import { WakeScreen, type WakeMethodShown } from '@/features/wake/wake-screen';
import { getMorningPlace } from '@/lib/place-spot';
import { getRoutine } from '@/lib/routine';
import { getScanCode } from '@/lib/scan';
import { getPushupsPreview } from '@/features/dev/wake-lab/pushups-preview';

/**
 * The morning wake-up. `?method=downstairs|steps|pushups` opens that method (the shield tap or a
 * notification can pick one); without it the routine's method opens, and a scan or place
 * routine goes straight to its own screen, or to steps while no code or place is set up yet.
 */
export default function WakeRoute() {
  const { method } = useLocalSearchParams<{ method?: string }>();
  // A pretend morning (You → Developer) can open push-ups whatever the routine says.
  const pretend = method === 'pushups' && getPushupsPreview().phase !== 'real';
  // Steps always (the fallback every morning offers); downstairs or push-ups only for their own routine.
  const chosen: WakeMethodShown | undefined =
    method === 'steps' || pretend || ((method === 'downstairs' || method === 'pushups') && getRoutine().method === method)
      ? method
      : undefined;
  const scan = !chosen && getRoutine().method === 'scan';
  if (scan && getScanCode()) return <Redirect href="/scan?mode=morning" />;
  const place = !chosen && getRoutine().method === 'place';
  if (place && getMorningPlace()) return <Redirect href="/place?mode=morning" />;
  return (
    <AppBackground>
      <WakeScreen method={scan || place ? 'steps' : chosen} />
    </AppBackground>
  );
}
