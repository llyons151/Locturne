import { useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

import { AppBackground } from '@/components/app-background';
import { LeaveRoute } from '@/components/leave-route';
import { setPushupsPreview, type PushupsPreview } from '@/features/dev/wake-lab/pushups-preview';
import { LAB_METHODS, WakeLab } from '@/features/dev/wake-lab/wake-lab';

/**
 * Dev tool: test one wake-up method at any hour, at /wake-lab?method=dance|steps|scan|place|pushups|downtime.
 * `&scene=danceTour` (any drawn-body scene) picks the camera's pretend body, as Wake preview does.
 * `&lock=1` runs it against a real test lock on the bedtime apps (You → Test the lock).
 * Nothing it does records a proof, but it stays out of the App Store build like the other labs.
 */
export default function WakeLabScreen() {
  const { method, lock, scene } = useLocalSearchParams<{ method?: string; lock?: string; scene?: string }>();
  useEffect(() => {
    if (scene) setPushupsPreview({ scene: scene as PushupsPreview['scene'] });
  }, [scene]);
  if (!__DEV__ && process.env.EXPO_PUBLIC_DEV_LABS !== '1') return <LeaveRoute />;
  const chosen = LAB_METHODS.find((m) => m.value === method)?.value ?? 'steps';
  return (
    <AppBackground>
      <WakeLab method={chosen} lock={lock === '1'} />
    </AppBackground>
  );
}
