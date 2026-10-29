import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import { LeaveRoute } from '@/components/leave-route';
import { PREVIEW_PHONES, type PushupsPreview } from '@/features/dev/wake-lab/pushups-preview';
import { PushupsCamera } from '@/features/wake/pushups-view';
import type { DemoScene } from '@/lib/wake/pose-demo';

type Phone = keyof typeof PREVIEW_PHONES;

/** A finished set starts again after this long, so the frame keeps playing. */
const AGAIN_MS = 2500;

/**
 * Dev tool: the push-up camera screen on its own, with the pretend body, for the push-ups
 * preview's phone frames (features/dev/pushups-preview). `?phone=upright|sideways|sidewaysOther`,
 * `&scene=pushups|nobody|standing|shallow|quick`, `&goal=10`, `&insets=59,34`. The frame's page
 * turns the phone by posting `{ pushupsPhone }`, as the accelerometer would. Silent unless `&sound=1`.
 */
export default function PushupsFrame() {
  const params = useLocalSearchParams<{ phone?: string; scene?: string; goal?: string; insets?: string; sound?: string }>();
  const [phone, setPhone] = useState<Phone>(params.phone && params.phone in PREVIEW_PHONES ? (params.phone as Phone) : 'sideways');
  const [run, setRun] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (params.sound !== '1' && typeof speechSynthesis !== 'undefined') speechSynthesis.speak = () => {};
    const onMessage = (e: MessageEvent) => {
      const next = e.data?.pushupsPhone;
      if (typeof next === 'string' && next in PREVIEW_PHONES) setPhone(next as Phone);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [params.sound]);

  if (!__DEV__ && process.env.EXPO_PUBLIC_DEV_LABS !== '1') return <LeaveRoute />;
  const preview: PushupsPreview = {
    scene: (params.scene as DemoScene) ?? 'pushups',
    phone,
    setup: 'real',
    goal: 0,
    fastTimeout: false,
    readout: false,
  };
  const [top, bottom] = (params.insets ?? '59,34').split(',').map(Number);
  const again = () => setTimeout(() => setRun((r) => r + 1), AGAIN_MS);
  return (
    <SafeAreaInsetsContext.Provider value={{ top, bottom, left: 0, right: 0 }}>
      <View style={{ flex: 1, backgroundColor: '#000000' }}>
        <PushupsCamera key={run} target={Number(params.goal) || 10} preview={preview} onMet={again} onClose={again} onError={() => {}} />
      </View>
    </SafeAreaInsetsContext.Provider>
  );
}
