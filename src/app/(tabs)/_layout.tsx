import { AppBackground } from '@/components/app-background';
import AppTabs from '@/components/app-tabs';
import { Recede } from '@/components/recede';
import { useAppStart } from '@/hooks/use-app-start';

export default function TabsLayout() {
  useAppStart();
  return (
    // The page shrinks back a little behind the Sleep sheet; the sky stays put behind it, so
    // the edges show the sky rather than black.
    <AppBackground panel>
      <Recede>
        <AppTabs />
      </Recede>
    </AppBackground>
  );
}
