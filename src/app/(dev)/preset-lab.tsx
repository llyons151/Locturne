import { LeaveRoute } from '@/components/leave-route';
import { PresetLab } from '@/features/dev/preset-lab/preset-lab';

/** Dev tool: compare time-picker preset styles at /preset-lab. Development builds only (App Review 2.3.1). */
export default function PresetLabScreen() {
  if (!__DEV__) return <LeaveRoute />;
  return <PresetLab />;
}
