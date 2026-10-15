import { router } from 'expo-router';
import { useEffect } from 'react';

import { openKnockLab } from '@/features/dev/knock-lab/store';

/**
 * Dev tool: the knock lab, at /knock-lab. Opens its panel over the real Home, where the nav strip
 * is, and leaves this route at once (features/dev/knock-lab). Kept out of the App Store build like
 * the other labs.
 */
export default function KnockLabRoute() {
  useEffect(() => {
    if (__DEV__ || process.env.EXPO_PUBLIC_DEV_LABS === '1') openKnockLab(true);
    router.dismissTo('/');
  }, []);
  return null;
}
