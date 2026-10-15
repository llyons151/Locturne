import { Asset } from 'expo-asset';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LeaveRoute } from '@/components/leave-route';
import LocStudio from '@/features/dev/loc-studio/loc-studio';

/** The art Loc is made from, for the studio's Images page. */
const IMAGES = [
  { title: 'The peek, traced from', note: 'assets/images/loc/loc-peek-source.png. Potrace turned this into the silhouette path.', module: require('@/assets/images/loc/loc-peek-source.png') },
  { title: 'Painted: sitting', note: 'assets/onboarding/raccoon-sitting.png. The older painted direction, before the silhouette.', module: require('@/assets/onboarding/raccoon-sitting.png') },
  { title: 'Painted: draped', note: 'assets/onboarding/raccoon-draped.png. The older painted direction.', module: require('@/assets/onboarding/raccoon-draped.png') },
  { title: 'Painted: from the back', note: 'assets/onboarding/raccoon-back.png. The older painted direction.', module: require('@/assets/onboarding/raccoon-back.png') },
  { title: 'Painted: asleep', note: 'assets/onboarding/raccoon-asleep.jpg. The older painted direction.', module: require('@/assets/onboarding/raccoon-asleep.jpg') },
];

function close() {
  if (router.canGoBack()) router.back();
  else router.dismissTo('/');
}

/**
 * Dev tool: Loc's studio, at /loc-studio. Every move frame by frame, his style, his model sheet
 * and his art (features/dev/loc-studio). Best in a browser (`npx expo start`, press w); it also
 * runs in the app. Kept out of the App Store build like the other labs.
 */
export default function LocStudioRoute() {
  const insets = useSafeAreaInsets();
  if (!__DEV__ && process.env.EXPO_PUBLIC_DEV_LABS !== '1') return <LeaveRoute />;
  const images = IMAGES.map(({ title, note, module }) => ({ title, note, uri: Asset.fromModule(module).uri }));
  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <LocStudio images={images} onClose={close} dom={{ style: { flex: 1 }, scrollEnabled: true, bounces: false }} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0E0F13' },
});
