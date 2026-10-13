import { useLocalSearchParams } from 'expo-router';

import { AppBackground } from '@/components/app-background';
import { PlaceScreen, type PlaceMode } from '@/features/place/place-screen';

export default function PlaceRoute() {
  // `?mode=setup` to pick or change the place, `?mode=morning` to check in there. Without one,
  // the screen picks: the morning check when the apps are waiting for it, setup otherwise.
  const { mode } = useLocalSearchParams<{ mode?: PlaceMode }>();
  // The night sky behind, as on the other morning screens (wake.tsx).
  return (
    <AppBackground>
      <PlaceScreen mode={mode === 'setup' || mode === 'morning' ? mode : undefined} />
    </AppBackground>
  );
}
