import { router } from 'expo-router';

import { TextButton } from '@/components/buttons';
import { PlaceholderScreen } from '@/components/placeholder-screen';

export default function ProfileScreen() {
  return (
    <PlaceholderScreen title="You" description="Your account, permissions, and settings.">
      {__DEV__ && <TextButton label="Screen Time lab" onPress={() => router.push('/screen-time-lab')} />}
    </PlaceholderScreen>
  );
}
