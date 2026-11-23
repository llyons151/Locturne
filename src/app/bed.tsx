import { useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

import { setWakePreview, useWakePreview } from '@/features/dev/wake-lab/wake-preview';
import { PhotoScreen } from '@/features/photo/photo-screen';

/**
 * Make your bed: the camera for this morning's photo of the bed, made (wake/bed.ts). Opened from
 * Home's morning. Dev only: `?demo=1` opens it on a test morning (the camera faked in a browser).
 */
export default function BedRoute() {
  const { demo } = useLocalSearchParams<{ demo?: string }>();
  const wantDemo = __DEV__ && demo === '1';
  const phase = useWakePreview().phase;
  useEffect(() => {
    if (wantDemo) setWakePreview({ phase: 'morning', method: 'bed', since: Date.now() });
  }, [wantDemo]);
  if (wantDemo && phase !== 'morning') return null;
  return <PhotoScreen kind="bed" />;
}
