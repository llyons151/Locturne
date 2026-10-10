import { useLocalSearchParams } from 'expo-router';

import { PlacePick } from '@/features/place/place-pick';

export default function PlacePickRoute() {
  // `?select=1`: opened by choosing "Get to a place" with no place yet; saving also picks it.
  const { select } = useLocalSearchParams<{ select?: string }>();
  return <PlacePick select={select === '1'} />;
}
