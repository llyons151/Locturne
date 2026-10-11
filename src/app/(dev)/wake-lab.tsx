import { useLocalSearchParams } from 'expo-router';

import { AppBackground } from '@/components/app-background';
import { LeaveRoute } from '@/components/leave-route';
import { LAB_METHODS, WakeLab } from '@/features/dev/wake-lab/wake-lab';

/**
 * Dev tool: test one wake-up method at any hour, at /wake-lab?method=downstairs|steps|scan|place|pushups.
 * Nothing it does records a proof, but it stays out of the App Store build like the other labs.
 */
export default function WakeLabScreen() {
  const { method } = useLocalSearchParams<{ method?: string }>();
  if (!__DEV__ && process.env.EXPO_PUBLIC_DEV_LABS !== '1') return <LeaveRoute />;
  const chosen = LAB_METHODS.find((m) => m.value === method)?.value ?? 'steps';
  return (
    <AppBackground>
      <WakeLab method={chosen} />
    </AppBackground>
  );
}
