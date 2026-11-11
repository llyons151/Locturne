import { StripPage } from '@/components/strip-page';
import { SETTINGS_BG, YouScreen } from '@/features/you/you-screen';

/** Settings as its own page, grown up out of the tab strip like the moons (user, 2026-11-02). */
export default function SettingsRoute() {
  return <StripPage background={SETTINGS_BG}>{(close, closePulled) => <YouScreen onClose={close} onPullClose={closePulled} />}</StripPage>;
}
