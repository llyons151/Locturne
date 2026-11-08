import { router } from 'expo-router';
import { useRef, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ASKING_APPLE, PrimaryButton, TextButton } from '@/components/buttons';
import { Text } from '@/components/text';
import { EditRow, ListCard } from '@/features/apps/apps-list';
import { Nocturne, Space, Type } from '@/theme';

/** About how long Apple's Screen Time sheet takes to come up on a phone (user, 2026-11-08). */
const APPLE_MS = 1100;

/**
 * Dev tool: every button that asks Apple for a permission, in its real component, showing the
 * orb and "Asking Apple…" while the sheet comes up. Tap one: it waits as long as Apple does.
 * "Hold" keeps them all waiting to compare.
 */
export function AskingLab() {
  const insets = useSafeAreaInsets();
  const [waiting, setWaiting] = useState<Set<string>>(new Set());
  const [hold, setHold] = useState(false);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const tap = (id: string) => () => {
    setWaiting((w) => new Set(w).add(id));
    clearTimeout(timers.current.get(id));
    timers.current.set(
      id,
      setTimeout(() => {
        setWaiting((w) => {
          const next = new Set(w);
          next.delete(id);
          return next;
        });
      }, APPLE_MS),
    );
  };
  const busy = (id: string) => (hold || waiting.has(id) ? ASKING_APPLE : undefined);

  return (
    <ScrollView style={styles.page} contentContainerStyle={[styles.content, { paddingTop: insets.top + Space.l, paddingBottom: insets.bottom + Space.xxl }]}>
      <View style={styles.top}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} hitSlop={8}>
          <Text style={styles.close}>Close</Text>
        </Pressable>
        <Pressable onPress={() => setHold((h) => !h)} hitSlop={8} accessibilityRole="switch" accessibilityState={{ checked: hold }}>
          <Text style={styles.close}>{hold ? 'Release all' : 'Hold all waiting'}</Text>
        </Pressable>
      </View>
      <Text style={styles.title}>Asking Apple</Text>
      <Text style={styles.note}>Tap any button: it waits {APPLE_MS / 1000} s, like Apple's Screen Time sheet, then goes back.</Text>

      <Section title="Onboarding · Add apps, Pick apps, Open Routine, Try again, the method page" note="Screen Time, notifications, Motion & Fitness">
        <PrimaryButton label="Add apps" busy={busy('onboarding')} onPress={tap('onboarding')} />
      </Section>

      <Section title="Home · access off" note="Screen Time. Same white pill on Home (native on iPhone).">
        <PrimaryButton label="Turn Screen Time back on" busy={busy('home')} onPress={tap('home')} />
      </Section>

      <Section title="Apps tab · access off" note="Screen Time">
        <ListCard>
          <EditRow label="Turn Screen Time access back on" busy={busy('apps')} onPress={tap('apps')} />
        </ListCard>
      </Section>

      <Section title="A list's Add apps, access off" note="Screen Time, then Apple's picker">
        <ListCard>
          <EditRow label="Add apps" busy={busy('list')} onPress={tap('list')} />
        </ListCard>
      </Section>

      <Section title="Websites · Add website, access off" note="Screen Time">
        <ListCard>
          <EditRow label="Add website" busy={busy('sites')} onPress={tap('sites')} />
        </ListCard>
      </Section>

      <Section title="Nap · access off during a nap" note="Screen Time. A text link there.">
        <TextButton label="Turn Screen Time access back on" busy={busy('nap')} onPress={tap('nap')} />
      </Section>
    </ScrollView>
  );
}

function Section({ title, note, children }: { title: string; note: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionNote}>{note}</Text>
      <View style={styles.sample}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: Nocturne.bg },
  content: { paddingHorizontal: Space.l, gap: Space.l },
  top: { flexDirection: 'row', justifyContent: 'space-between' },
  close: { ...Type.secondary, color: Nocturne.text2, fontWeight: '600' },
  title: { ...Type.title, color: Nocturne.text, textAlign: 'center' },
  note: { ...Type.secondary, color: Nocturne.text2, textAlign: 'center' },
  section: { gap: Space.xs, paddingTop: Space.m },
  sectionTitle: { ...Type.secondary, color: Nocturne.text, fontWeight: '600', textAlign: 'center' },
  sectionNote: { ...Type.legal, color: Nocturne.text3, textAlign: 'center' },
  sample: { paddingTop: Space.s },
});
