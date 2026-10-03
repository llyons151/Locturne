import { useLocalSearchParams } from 'expo-router';

import { ScanScreen, type ScanMode } from '@/features/scan/scan-screen';

export default function ScanRoute() {
  // `?mode=setup` to set up or change the code, `?mode=morning` to scan it. Without one, the
  // screen picks: the morning scan when the apps are waiting for it, setup otherwise.
  const { mode } = useLocalSearchParams<{ mode?: ScanMode }>();
  return <ScanScreen mode={mode === 'setup' || mode === 'morning' ? mode : undefined} />;
}
