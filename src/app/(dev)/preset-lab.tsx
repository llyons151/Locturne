import { Redirect } from 'expo-router';

import { PresetLab } from '@/features/dev/preset-lab/preset-lab';

/** Dev tool: compare time-picker preset styles at /preset-lab. Development builds only (App Review 2.3.1). */
export default function PresetLabScreen() {
  if (!__DEV__) return <Redirect href="/" />;
  return <PresetLab />;
}
