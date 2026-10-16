import { LeaveRoute } from '@/components/leave-route';
import { OnboardingPreview } from '@/features/dev/onboarding-preview/onboarding-preview';

/**
 * Dev tool: the whole onboarding in phone frames, at /onboarding-preview. Browser only
 * (`npx expo start`, press w). Kept out of the App Store build like the other labs.
 */
export default function OnboardingPreviewRoute() {
  if (!__DEV__ && process.env.EXPO_PUBLIC_DEV_LABS !== '1') return <LeaveRoute />;
  return <OnboardingPreview />;
}
