import { useEffect, type RefObject } from 'react';

import { useTabSelected } from './use-tab-selected';

type Scrollable = { scrollTo: (options: { y: number; animated: boolean }) => void };

/**
 * A tab page always opens at its top (user's ask, 2026-10-09). Reset as the page is left for
 * another tab, while it fades out, so coming back never shows a jump. A sheet opened over it
 * leaves it where it was.
 */
export function useTopOnLeave(ref: RefObject<Scrollable | null>) {
  const selected = useTabSelected();
  useEffect(() => {
    if (!selected) ref.current?.scrollTo({ y: 0, animated: false });
  }, [selected, ref]);
}
