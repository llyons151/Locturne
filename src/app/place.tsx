import { useLocalSearchParams } from 'expo-router';

import { PlaceScreen, type PlaceMode } from '@/features/place/place-screen';

export default function PlaceRoute() {
  // `?mode=setup` to pick or change the place, `?mode=morning` to check in there. Without one,
  // the screen picks: the morning check when the apps are waiting for it, setup otherwise.
  const { mode } = useLocalSearchParams<{ mode?: PlaceMode }>();
  return <PlaceScreen mode={mode === 'setup' || mode === 'morning' ? mode : undefined} />;
}
