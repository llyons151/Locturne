import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, ChoiceRow, sym, ValueRow } from '@/components/grouped-list';
import { Text } from '@/components/text';
import { Gap, Nocturne, Space, Type } from '@/theme';

import { FakeTag } from '../wake-lab/fake-tag';
import { APP_STATES, GROUPS, pickAppState, usePickedAppState, type StateGroup } from './app-states';

const ICONS: Record<StateGroup, ReturnType<typeof sym>> = {
  Status: sym('lock.shield.fill', 'shield'),
  'Needs attention': sym('exclamationmark.triangle.fill', 'warning'),
  Day: sym('sun.max.fill', 'light_mode'),
  'Woken up': sym('sunrise.fill', 'wb_twilight'),
  Trial: sym('calendar', 'event'),
  Week: sym('circle.grid.3x3.fill', 'calendar_view_week'),
  Nap: sym('moon.zzz.fill', 'bedtime'),
  Night: sym('moon.stars.fill', 'nights_stay'),
  Morning: sym('alarm.fill', 'alarm'),
};

/** Back to Home, wherever this was opened from (You → Developer, or Home's bar). */
function showHome() {
  if (router.canGoBack()) router.back();
  router.navigate('/');
}

/**
 * Dev tool, /app-states: every state Home can be in, made up (app-states.ts). Pick one and
 * Home shows it; the arrows on Home's bar step through the rest. “Not on Home yet” marks a
 * state the app gets into that Home has no words for.
 */
export function AppStatesScreen() {
  const insets = useSafeAreaInsets();
  const picked = usePickedAppState();
  const pick = (id: string | null) => {
    pickAppState(id);
    showHome();
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + Space.l, paddingBottom: insets.bottom + Space.xxl }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.head}>
        <Text style={styles.title}>App states</Text>
        <Text style={styles.note}>
          Home shows the state you pick, with nothing real changed: no shields, no stores, no notifications. Mornings run the
          wake preview’s fake sensors. On Home, the arrows step through the list and the tag opens it again.
        </Text>
        <FakeTag what="on Home while one is picked" style={styles.centered} />
      </View>

      <Card>
        <ChoiceRow title="Real" detail="Home as the app really is." selected={!picked} onPress={() => pick(null)} last />
      </Card>

      {GROUPS.map((group) => {
        const states = APP_STATES.filter((s) => s.group === group);
        return (
          <Card key={group} icon={ICONS[group]} title={group}>
            {states.map((s, i) => (
              <ChoiceRow
                key={s.id}
                title={s.label}
                detail={s.gap ? `Not on Home yet. ${s.note}` : s.note}
                selected={picked?.id === s.id}
                onPress={() => pick(s.id)}
                last={i === states.length - 1}
              />
            ))}
          </Card>
        );
      })}

      <Card>
        <ValueRow title="Close" value="" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} last />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Nocturne.bg },
  content: { paddingHorizontal: Gap.gutter, gap: Gap.block },
  head: { alignItems: 'center', gap: Space.s },
  title: { ...Type.title, color: Nocturne.text },
  note: { ...Type.secondary, color: Nocturne.text2, textAlign: 'center' },
  centered: { alignSelf: 'center' },
});
