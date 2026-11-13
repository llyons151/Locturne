import { useSyncExternalStore, type PropsWithChildren } from 'react';
import { SafeAreaInsetsContext, useSafeAreaInsets } from 'react-native-safe-area-context';

import { getReelFrame, subscribeReelFrame } from '@/lib/reel-frame';

/**
 * On a phone the real safe areas stand (preview-insets.web.tsx is the browser's), except in the Reel
 * frame: its 9:16 box sits below the Dynamic Island, but iOS still reports the full screen's top inset
 * for the shrunk window, so every page started ~60 points low (user 2026-11-12, "too much space at the
 * top"). There the top is 0, as the device studio's Reel frame has it; the bottom (home bar) stays.
 */
export function PreviewInsets({ children }: PropsWithChildren) {
  const reel = useSyncExternalStore(subscribeReelFrame, getReelFrame);
  const insets = useSafeAreaInsets();
  if (!reel) return <>{children}</>;
  return <SafeAreaInsetsContext.Provider value={{ ...insets, top: 0 }}>{children}</SafeAreaInsetsContext.Provider>;
}
