import { LeaveRoute } from '@/components/leave-route';
import { AskingLab } from '@/features/dev/asking-lab/asking-lab';

/** Dev tool: the "Asking Apple…" orb on every permission button, at /asking-lab. Development builds only (App Review 2.3.1). */
export default function AskingLabRoute() {
  if (!__DEV__ && process.env.EXPO_PUBLIC_DEV_LABS !== '1') return <LeaveRoute />;
  return <AskingLab />;
}
