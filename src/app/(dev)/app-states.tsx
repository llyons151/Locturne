import { LeaveRoute } from '@/components/leave-route';
import { AppStatesScreen } from '@/features/dev/state-lab/app-states-screen';

/**
 * Dev tool: every state Home can be in, made up, at /app-states (features/dev/state-lab). Kept
 * out of the App Store build like the other labs.
 */
export default function AppStatesRoute() {
  if (!__DEV__ && process.env.EXPO_PUBLIC_DEV_LABS !== '1') return <LeaveRoute />;
  return <AppStatesScreen />;
}
