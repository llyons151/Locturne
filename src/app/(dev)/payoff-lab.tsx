import { LeaveRoute } from '@/components/leave-route';
import { PayoffLabSimulator } from '@/features/wake/payoff-lab';

/**
 * Dev tool, browser only: the payoff's entrance in a phone frame with its timings on sliders beside
 * it, and a Replay (features/wake/payoff-lab.web.tsx). Kept out of the App Store build like the other labs.
 */
export default function PayoffLabRoute() {
  if (!__DEV__ && process.env.EXPO_PUBLIC_DEV_LABS !== '1') return <LeaveRoute />;
  return <PayoffLabSimulator />;
}
