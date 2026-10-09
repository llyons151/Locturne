import { AppBackground } from '@/components/app-background';
import AppTabs from '@/components/app-tabs';
import { Recede } from '@/components/recede';
import { useAppStart } from '@/hooks/use-app-start';

export default function TabsLayout() {
  useAppStart();
  return (
    // Shrinks back a little behind the Sleep sheet.
    <Recede>
      <AppBackground panel>
        <AppTabs />
      </AppBackground>
    </Recede>
  );
}
