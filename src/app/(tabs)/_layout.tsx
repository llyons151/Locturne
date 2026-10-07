import { AppBackground } from '@/components/app-background';
import AppTabs from '@/components/app-tabs';
import { useAppStart } from '@/hooks/use-app-start';

export default function TabsLayout() {
  useAppStart();
  return (
    <AppBackground panel>
      <AppTabs />
    </AppBackground>
  );
}
