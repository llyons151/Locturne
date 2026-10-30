import { LeaveRoute } from '@/components/leave-route';
import { MoonPicker } from '@/features/moons/moon-picker';

/** Dev tool: wear any moon, all unlocked (features/moons). Kept out of the App Store build like the other labs. */
export default function MoonsRoute() {
  if (!__DEV__ && process.env.EXPO_PUBLIC_DEV_LABS !== '1') return <LeaveRoute />;
  return <MoonPicker />;
}
