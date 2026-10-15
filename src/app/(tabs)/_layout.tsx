import { AppBackground } from '@/components/app-background';
import AppTabs from '@/components/app-tabs';
import { Recede } from '@/components/recede';
import { KnockLab } from '@/features/dev/knock-lab';
import { Loc } from '@/features/home/loc';
import { useAppStart } from '@/hooks/use-app-start';

export default function TabsLayout() {
  useAppStart();
  return (
    // The page shrinks back a little behind the Sleep sheet; the sky stays put behind it, so
    // the edges show the sky rather than black.
    <AppBackground panel>
      <Recede>
        <AppTabs />
        {/* Over every tab, so he can be seen diving under the covers as Home fades out. */}
        <Loc />
        {/* Dev only, while open: tunes how the nav buttons bounce as Loc burrows. */}
        <KnockLab />
      </Recede>
    </AppBackground>
  );
}
