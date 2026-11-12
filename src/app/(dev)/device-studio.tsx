import { LeaveRoute } from '@/components/leave-route';
import { DeviceStudio } from '@/features/dev/device-studio/device-studio';

/**
 * Dev tool, browser only: the app's main screens on every iPhone size side by side, and in the Reel
 * frame's 9:16 box (features/dev/device-studio/device-studio.web.tsx). Kept out of the App Store build.
 */
export default function DeviceStudioRoute() {
  if (!__DEV__ && process.env.EXPO_PUBLIC_DEV_LABS !== '1') return <LeaveRoute />;
  return <DeviceStudio />;
}
