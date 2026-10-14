'use no memo';
// Reads the App Group stores during render (routine, passes, limits…), which change outside
// React. The React Compiler would cache those reads from the first render (Home mounts under
// onboarding before a routine exists, and showed the defaults after), so it stays out here.

import { Redirect, useLocalSearchParams } from 'expo-router';

import { AppBackground } from '@/components/app-background';
import { WakeScreen, type WakeMethodShown } from '@/features/wake/wake-screen';
import { getRoutine } from '@/lib/routine';
import { methodInUse } from '@/lib/scan-code';
import { shownPlace, shownScanCode } from '@/features/dev/wake-lab/stand-ins';
import { getWakePreview } from '@/features/dev/wake-lab/wake-preview';

/**
 * The morning wake-up. `?method=steps|pushups` opens that method (the shield tap or a
 * notification can pick one); without it the routine's method opens, and a scan routine goes
 * straight to its camera. A walk, the stairs and the place check-in happen on Home itself
 * (docs/HOME_INTERACTIVE.md), so a shield tap or notification lands there; `?method=steps` is
 * still this page, the "walk instead" of push-ups and the scan. The wake preview's pretend
 * morning can still open `?method=downstairs` here.
 */
export default function WakeRoute() {
  const { method } = useLocalSearchParams<{ method?: string }>();
  // A pretend morning (/wake-preview) can open any method whatever the routine says.
  const pretend = getWakePreview().phase !== 'real';
  // Steps always (the fallback every morning offers); downstairs or push-ups only for their own routine.
  const chosen: WakeMethodShown | undefined =
    method === 'steps' || ((method === 'downstairs' || method === 'pushups') && (pretend || getRoutine().method === method))
      ? method
      : undefined;
  // Walks, the stairs and the place check-in all happen on Home now; push-ups and the scan
  // camera keep their own screens.
  const homeMethod = methodInUse(getRoutine().method);
  if (!chosen && (homeMethod === 'steps' || homeMethod === 'downstairs' || homeMethod === 'place')) return <Redirect href="/" />;
  if (chosen === 'downstairs' && !pretend) return <Redirect href="/" />;
  const scan = !chosen && getRoutine().method === 'scan';
  if (scan && shownScanCode()) return <Redirect href="/scan?mode=morning" />;
  const place = !chosen && getRoutine().method === 'place';
  if (place && shownPlace()) return <Redirect href="/place?mode=morning" />;
  return (
    <AppBackground>
      <WakeScreen method={scan || place ? 'steps' : chosen} />
    </AppBackground>
  );
}
