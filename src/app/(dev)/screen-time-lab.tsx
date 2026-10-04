import { Redirect } from 'expo-router';

import { ScreenTimeLab } from '@/features/dev/screen-time-lab/screen-time-lab';

/**
 * Dev tool: the device spike's Screen Time test bench at /screen-time-lab. Development and
 * preview builds only (`EXPO_PUBLIC_DEV_LABS` in eas.json's preview profile), where it's the
 * device test's "Disarm schedule" escape hatch. In the App Store build
 * `locturne://screen-time-lab` would be a hidden way to unshield apps (App Review 2.3.1), so
 * it goes home instead.
 */
export default function ScreenTimeLabScreen() {
  if (!__DEV__ && process.env.EXPO_PUBLIC_DEV_LABS !== '1') return <Redirect href="/" />;
  return <ScreenTimeLab />;
}
