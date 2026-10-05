import { LeaveRoute } from '@/components/leave-route';
import { TextLab } from '@/features/dev/text-lab/text-lab';

/** Dev tool: audition onboarding text entrances at /text-lab. Development builds only (App Review 2.3.1). */
export default function TextLabScreen() {
  if (!__DEV__) return <LeaveRoute />;
  return <TextLab />;
}
