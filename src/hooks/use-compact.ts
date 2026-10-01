import { useWindowDimensions } from 'react-native';

/**
 * Onboarding pages never scroll, so short phones (iPhone SE: 375×667) get a tighter
 * layout: smaller numbers, fewer squares, shorter spacing. Taller phones get the full one.
 */
export function useCompact(): boolean {
  const { height } = useWindowDimensions();
  return height < 760;
}
