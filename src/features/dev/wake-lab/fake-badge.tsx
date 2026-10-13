import { usePathname } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/text';

import { FAKE_COLOR } from './fake-tag';
import { usePushupsPreview } from './pushups-preview';
import { useWakePreview } from './wake-preview';

/**
 * Dev only: a small amber line at the bottom of the screen naming what the wake preview is
 * faking there ("FAKE: morning · pedometer · barometer"), so a screenshot is never mistaken for
 * the real thing. Shown on the morning screens, and anywhere during a pretend morning. Floats
 * over the screen and takes no taps, so it can't move the layout being tweaked. Off with
 * "FAKES badge on screen" in /wake-preview.
 */
export function FakeBadge() {
  const insets = useSafeAreaInsets();
  const p = useWakePreview();
  const pushups = usePushupsPreview();
  const path = usePathname();
  if ((!__DEV__ && process.env.EXPO_PUBLIC_DEV_LABS !== '1') || !p.badge || path === '/wake-preview') return null;
  // Only what this screen uses; the steps fallback is on every morning screen.
  const wake = path === '/wake' || path === '/wake-lab';
  const fakes = [
    p.phase !== 'real' && (p.phase === 'morning' ? 'morning' : 'morning done'),
    (wake || path === '/scan' || path === '/place') && p.steps !== 'real' && 'pedometer',
    wake && p.stairs !== 'real' && 'barometer',
    wake && (pushups.scene !== 'camera' || pushups.setup !== 'real' || pushups.phone !== 'sensor') && 'push-up camera',
    (path === '/scan' || path === '/wake-lab') && p.scan !== 'real' && 'camera',
    (path === '/place' || path === '/wake-lab') && p.place !== 'real' && 'location',
  ].filter(Boolean);
  if (!fakes.length) return null;
  return (
    <View style={[styles.wrap, { bottom: Math.max(insets.bottom - 14, 2) }]} pointerEvents="none">
      <Text style={styles.text} numberOfLines={1}>
        FAKE: {fakes.join(' · ')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    alignSelf: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  text: { color: FAKE_COLOR, fontSize: 10, lineHeight: 13, fontWeight: '700', letterSpacing: 0.6 },
});
