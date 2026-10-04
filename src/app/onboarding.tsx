import { useLocalSearchParams } from 'expo-router';
import { Platform } from 'react-native';

import { OnboardingFlow } from '@/features/onboarding/onboarding-flow';

export default function OnboardingScreen() {
  // `?step=<id>` jumps straight to a screen while reviewing the draft; `?exit=<arm>` picks
  // the exit-offer test arm (none, half-price, longer-trial).
  // Review tools only: in the App Store build a `locturne://onboarding?step=declined&exit=…`
  // link would open the one-time exit offer for anyone, as often as they liked.
  const { step, exit, resume } = useLocalSearchParams<{ step?: string; exit?: string; resume?: string }>();
  const review = __DEV__ || Platform.OS === 'web';
  // `?resume=paywall` (the You tab and Home's Subscribe): straight to the plans with the
  // saved setup, for someone who left at the paywall or whose subscription ended.
  if (resume === 'paywall') return <OnboardingFlow resumeAtPaywall />;
  return <OnboardingFlow initialStep={review ? step : undefined} exitOffer={review ? exit : undefined} />;
}
