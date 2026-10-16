import { useLocalSearchParams } from 'expo-router';
import { Platform } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import { OnboardingFlow } from '@/features/onboarding/onboarding-flow';
import { hasRoutine } from '@/lib/routine';

export default function OnboardingScreen() {
  // `?step=<id>` jumps straight to a screen while reviewing the draft; `?exit=<arm>` picks
  // the exit-offer test arm (none, half-price, longer-trial); `?newyear=1` shows the New Year
  // week copy on any date; `?pain=night` makes a `?step=` jump land inside that branch
  // (docs/ONBOARDING_BRANCHES.md).
  // Review tools only: in the App Store build a `locturne://onboarding?step=declined&exit=…`
  // link would open the one-time exit offer for anyone, as often as they liked.
  const { step, exit, resume, newyear, insets, pain } = useLocalSearchParams<{
    step?: string;
    pain?: string;
    exit?: string;
    resume?: string;
    newyear?: string;
    insets?: string;
  }>();
  const review = __DEV__ || Platform.OS === 'web';
  // `?resume=paywall` (the You tab and Home's Subscribe): straight to the plans with the
  // saved setup, for someone who left at the paywall or whose subscription ended.
  // Only with a saved setup: someone who left before `commit` gets the questions, not the
  // defaults (and leaving the offer would save those, ending onboarding for good).
  if (resume === 'paywall' && hasRoutine()) return <OnboardingFlow resumeAtPaywall />;
  const flow = (
    <OnboardingFlow
      initialStep={review ? step : undefined}
      exitOffer={review ? exit : undefined}
      newYear={review && newyear === '1'}
      pain={review ? pain : undefined}
    />
  );
  // `?insets=59,34` (top,bottom): an iPhone's safe areas inside the onboarding preview's
  // phone frames, where the browser reports none (features/dev/onboarding-preview).
  const [top, bottom] = review && insets ? insets.split(',').map(Number) : [];
  if (!Number.isFinite(top) || !Number.isFinite(bottom)) return flow;
  return <SafeAreaInsetsContext.Provider value={{ top, bottom, left: 0, right: 0 }}>{flow}</SafeAreaInsetsContext.Provider>;
}
