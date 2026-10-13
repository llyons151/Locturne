import { LeaveRoute } from '@/components/leave-route';
import { WakePreviewScreen } from '@/features/dev/wake-lab/wake-preview-screen';

/**
 * Dev tool: every wake-up method's real morning screen at any hour, with fake sensors, at
 * /wake-preview. Works in a browser (`npx expo start`, press w). Kept out of the App Store
 * build like the other labs.
 */
export default function WakePreviewRoute() {
  if (!__DEV__ && process.env.EXPO_PUBLIC_DEV_LABS !== '1') return <LeaveRoute />;
  return <WakePreviewScreen />;
}
