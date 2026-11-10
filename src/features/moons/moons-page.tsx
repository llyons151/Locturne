import { StripPage } from '@/components/strip-page';

import { MOONS_BG } from './moon-collection';
import { MoonCollection } from './moon-collection-view';

/**
 * The moon collection as its own page (user, 2026-11-01): the black strip under the tabs slides up
 * to fill the screen with the moons on it (components/strip-page.tsx, shared with Settings).
 */
export function MoonsPage() {
  return <StripPage background={MOONS_BG}>{(close, closePulled) => <MoonCollection as="page" onClose={close} onPullClose={closePulled} />}</StripPage>;
}
