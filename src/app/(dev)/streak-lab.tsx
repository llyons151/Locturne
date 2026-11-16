import { LeaveRoute } from '@/components/leave-route';
import { StreakLab } from '@/features/dev/streak-lab/streak-lab';

/** Dev tool: 10 ways to show the morning streak on Home, each beside its Mobbin reference, at /streak-lab. Development builds only. */
export default function StreakLabRoute() {
  if (!__DEV__ && process.env.EXPO_PUBLIC_DEV_LABS !== '1') return <LeaveRoute />;
  return <StreakLab />;
}
