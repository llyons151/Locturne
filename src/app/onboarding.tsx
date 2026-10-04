import { useLocalSearchParams } from 'expo-router';
import { Platform } from 'react-native';

import { OnboardingFlow } from '@/features/onboarding/onboarding-flow';

export default function OnboardingScreen() {
  // `?step=<id>` jumps straight to a screen while reviewing the draft; `?exit=<arm>` picks
  // the exit-offer test arm (none, half-price, longer-trial).
  // Review tools only: in the App Store build a `locturne://onboarding?step=declined&exit=…`
  // link would open the one-time exit offer for anyone, as often as they liked.
  const { step, exit } = useLocalSearchParams<{ step?: string; exit?: string }>();
  const review = __DEV__ || Platform.OS === 'web';
  return <OnboardingFlow initialStep={review ? step : undefined} exitOffer={review ? exit : undefined} />;
}
