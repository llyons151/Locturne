import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

import { LeaveRoute } from '@/components/leave-route';
import { LAB_METHODS } from '@/features/dev/wake-lab/wake-lab';
import { setWakePreview } from '@/features/dev/wake-lab/wake-preview';
import { WakePreviewScreen } from '@/features/dev/wake-lab/wake-preview-screen';

/**
 * Dev tool: every wake-up method's real morning screen at any hour, with fake sensors, at
 * /wake-preview. Works in a browser (`npx expo start`, press w). Kept out of the App Store
 * build like the other labs. `/wake-preview?home=dance` (any method) goes straight to Home on
 * that morning, like the card's "Open the morning (Home)", so it opens from a link.
 */
export default function WakePreviewRoute() {
  const { home } = useLocalSearchParams<{ home?: string }>();
  const allowed = __DEV__ || process.env.EXPO_PUBLIC_DEV_LABS === '1';
  useEffect(() => {
    const method = LAB_METHODS.find((m) => m.value === home)?.value;
    if (!allowed || !method) return;
    setWakePreview({ phase: 'morning', method });
    router.dismissTo('/');
  }, [allowed, home]);
  if (!allowed) return <LeaveRoute />;
  return <WakePreviewScreen />;
}
