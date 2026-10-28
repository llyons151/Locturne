import { useLocalSearchParams } from 'expo-router';

import { ScanScreen, type ScanMode } from '@/features/scan/scan-screen';

export default function ScanRoute() {
  // `?mode=setup` to set up or change the code, `?mode=morning` to scan it. Without one, the
  // screen picks: the morning scan when the apps are waiting for it, setup otherwise.
  // `?source=qr&expect=…` (or `?source=barcode`): straight to the camera for a code chosen on
  // the code sheet (`/code`), and back to it after.
  const { mode, source, expect } = useLocalSearchParams<{ mode?: ScanMode; source?: string; expect?: string }>();
  const start = source === 'qr' || source === 'barcode' ? { source: source as 'qr' | 'barcode', expect } : undefined;
  return <ScanScreen mode={mode === 'setup' || mode === 'morning' ? mode : undefined} start={start} />;
}
