import { useFocusEffect } from 'expo-router';
import { useCallback, type RefObject } from 'react';

type Scrollable = { scrollTo: (options: { y: number; animated: boolean }) => void };

/**
 * A tab page always opens at its top (user's ask, 2026-10-09). Reset as the page is left,
 * while it fades out, so coming back never shows a jump.
 */
export function useTopOnLeave(ref: RefObject<Scrollable | null>) {
  useFocusEffect(useCallback(() => () => ref.current?.scrollTo({ y: 0, animated: false }), [ref]));
}
