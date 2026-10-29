import { LeaveRoute } from '@/components/leave-route';
import { PushupsPreviewWall } from '@/features/dev/pushups-preview/pushups-preview';

/**
 * Dev tool: the push-up camera screen upright, sideways, and turning between the two, at
 * /pushups-preview. Browser only (npm run pushups-preview). Kept out of the App Store build like the other labs.
 */
export default function PushupsPreviewRoute() {
  if (!__DEV__ && process.env.EXPO_PUBLIC_DEV_LABS !== '1') return <LeaveRoute />;
  return <PushupsPreviewWall />;
}
