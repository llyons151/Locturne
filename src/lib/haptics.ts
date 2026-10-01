import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// Haptics are a no-op on web, and a failed haptic must never break the flow.
const run = (fn: () => Promise<void>) => {
  if (Platform.OS === 'web') return;
  fn().catch(() => {});
};

export const tap = () => run(() => Haptics.selectionAsync());
export const tick = () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
export const thud = () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
export const done = () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
