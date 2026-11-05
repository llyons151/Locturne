import { LeaveRoute } from '@/components/leave-route';
import { DeveloperSettings } from '@/features/you/developer-settings';

/** Settings' Developer page (dev and preview builds): the test tools, off the Settings page itself. */
export default function DeveloperScreen() {
  // Release builds: a locturne://developer link must not reach "Earn every moon" or fake mornings.
  if (!__DEV__ && process.env.EXPO_PUBLIC_DEV_LABS !== '1') return <LeaveRoute />;
  return <DeveloperSettings />;
}
