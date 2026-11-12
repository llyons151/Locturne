import { LeaveRoute } from '@/components/leave-route';
import { PayoffStudio } from '@/features/wake/payoff-studio';

/**
 * Dev tool, browser only: the payoff's pieces placed by hand in the Reel frame's box or the whole
 * phone (features/wake/payoff-studio.web.tsx). Kept out of the App Store build like the other labs.
 */
export default function PayoffStudioRoute() {
  if (!__DEV__ && process.env.EXPO_PUBLIC_DEV_LABS !== '1') return <LeaveRoute />;
  return <PayoffStudio />;
}
