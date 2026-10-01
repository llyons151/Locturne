import { useLocalSearchParams } from 'expo-router';

import { OnboardingFlow } from '@/features/onboarding/onboarding-flow';

export default function OnboardingScreen() {
  // `?step=<id>` jumps straight to a screen while reviewing the draft; `?exit=<arm>` picks
  // the exit-offer test arm (none, half-price, longer-trial).
  const { step, exit } = useLocalSearchParams<{ step?: string; exit?: string }>();
  return <OnboardingFlow initialStep={step} exitOffer={exit} />;
}
