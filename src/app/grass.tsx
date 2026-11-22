import { useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

import { setWakePreview, useWakePreview } from '@/features/dev/wake-lab/wake-preview';
import { PhotoScreen } from '@/features/photo/photo-screen';

/**
 * Grass: the camera for this morning's photo (wake/photo.ts). Opened from Home's morning.
 * Dev only: `?demo=1` opens it on a test morning (the camera faked in a browser). The morning
 * starts once the page is up, so the screen waits for it rather than read the real lock first.
 */
export default function GrassRoute() {
  const { demo } = useLocalSearchParams<{ demo?: string }>();
  const wantDemo = __DEV__ && demo === '1';
  const phase = useWakePreview().phase;
  useEffect(() => {
    if (wantDemo) setWakePreview({ phase: 'morning', method: 'grass', since: Date.now() });
  }, [wantDemo]);
  if (wantDemo && phase !== 'morning') return null;
  return <PhotoScreen kind="grass" />;
}
