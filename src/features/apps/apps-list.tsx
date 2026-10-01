import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AppTile,
  BrandIcon,
  SystemIcon,
  type BrandName,
  type SystemName,
} from '@/components/app-icons';
import { AddTile, AppPickerSheet } from '@/components/app-picker';
import { useTabBarInset } from '@/components/app-tabs';
import * as haptic from '@/lib/haptics';
import { DISPLAY_MAX_SCALE, DisplayFont, Gap, Nocturne, Radius, Space, Type } from '@/theme';

import { APPS, type AppEntry } from './catalog';

/**
 * The Apps tab: the picked apps in Settings-style rows, one group per Screen Time
 * selection. Each group ends in an edit row that opens the picker for that group, the
 * way the live app will reopen Apple's FamilyActivityPicker (which has its own search).
 */

const ICON = 30;
const ROW_PAD = 16;

type Group = 'bedtime' | 'always';

const GROUPS: { key: Group; label: string; picker: string }[] = [
  {
    key: 'bedtime',
    label: 'Sleep at bedtime',
    picker: 'Pick the apps that keep you up. They sleep at bedtime and wake after your walk.',
  },
  {
    key: 'always',
    label: 'Always asleep',
    picker: 'Pick the apps you never want to open. They stay asleep all day and night.',
  },
];

const byName = new Map(APPS.map((app) => [app.name, app]));
const initial = (group: Group) =>
  APPS.filter((app) => app.rule === group)
    .map((app) => app.name)
    .sort((a, b) => a.localeCompare(b));

/** "1 app sleeps", "3 apps sleep". */
const countApps = (n: number, verb: string) => (n === 1 ? `1 app ${verb}s` : `${n} apps ${verb}`);

export function AppsList() {
  const insets = useSafeAreaInsets();
  const bottom = useTabBarInset();

  const [picks, setPicks] = useState<Record<Group, string[]>>(() => ({
    bedtime: initial('bedtime'),
    always: initial('always'),
  }));
  const [editing, setEditing] = useState<Group | null>(null);
  const editingGroup = GROUPS.find((g) => g.key === editing);

  // An app lives in one group: picking it for one takes it out of the other.
  const save = (group: Group, apps: string[]) => {
    haptic.done();
    setPicks((current) => {
      const next = { ...current, [group]: [...apps].sort((a, b) => a.localeCompare(b)) };
      for (const other of GROUPS) {
        if (other.key !== group) next[other.key] = current[other.key].filter((app) => !apps.includes(app));
      }
      return next;
    });
    setEditing(null);
  };

  return (
    <>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + Gap.pageTop, paddingBottom: bottom }]}
      >
        <View style={styles.header}>
          <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={DISPLAY_MAX_SCALE}>
            Apps
          </Text>
          <Text style={styles.summary}>
            {countApps(picks.bedtime.length, 'sleep')} at bedtime, {countApps(picks.always.length, 'stay')} asleep all day.
          </Text>
        </View>

        {GROUPS.map((group) => (
          <View key={group.key} style={styles.section}>
            <Text style={styles.sectionLabel}>{group.label}</Text>
            <View style={styles.group}>
              {picks[group.key].map((name) => (
                <AppRow key={name} name={name} />
              ))}
              <EditRow
                label={picks[group.key].length ? 'Add or remove apps' : 'Add apps'}
                onPress={() => {
                  haptic.tap();
                  setEditing(group.key);
                }}
              />
            </View>
          </View>
        ))}
      </ScrollView>

      <AppPickerSheet
        open={editing !== null}
        apps={editing ? picks[editing] : []}
        header={editingGroup?.picker}
        onDone={(apps) => editing && save(editing, apps)}
        onClose={() => setEditing(null)}
      />
    </>
  );
}

function AppRow({ name }: { name: string }) {
  const app = byName.get(name);
  return (
    <View style={styles.row} accessible accessibilityLabel={name}>
      {app ? <AppIconView app={app} /> : <AppTile name={name} size={ICON} />}
      <View style={[styles.rowBody, styles.separator]}>
        <Text style={styles.rowLabel} numberOfLines={1}>
          {name}
        </Text>
      </View>
    </View>
  );
}

/** The last row of each group, like "Add or remove apps" on the onboarding card. */
function EditRow({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <AddTile size={ICON} />
      <View style={styles.rowBody}>
        <Text style={[styles.rowLabel, styles.editLabel]} numberOfLines={1}>
          {label}
        </Text>
        <SymbolView
          name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
          size={14}
          weight="semibold"
          tintColor={Nocturne.text3}
        />
      </View>
    </Pressable>
  );
}

function AppIconView({ app }: { app: AppEntry }) {
  const { icon } = app;
  if (icon.kind === 'brand') return <BrandIcon name={app.name as BrandName} size={ICON} />;
  if (icon.kind === 'system') return <SystemIcon name={app.name as SystemName} size={ICON} />;
  return (
    <View style={[styles.symbolTile, { backgroundColor: icon.bg }]}>
      <SymbolView
        name={{ ios: icon.ios as never, android: icon.web as never, web: icon.web as never }}
        size={ICON * 0.56}
        tintColor="#FFFFFF"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: Gap.gutter },
  header: { gap: Gap.headline, marginBottom: Gap.block },
  title: { ...DisplayFont, color: Nocturne.text, fontSize: 34, lineHeight: 37, letterSpacing: -0.3 },
  summary: { color: Nocturne.text2, ...Type.body },

  section: { marginBottom: Gap.section },
  sectionLabel: { ...Type.label, marginLeft: Space.l, marginBottom: Space.s },
  group: {
    borderRadius: Radius.card,
    backgroundColor: Nocturne.surface,
    borderWidth: 1,
    borderColor: Nocturne.edge,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingLeft: ROW_PAD, gap: 14 },
  rowPressed: { backgroundColor: Nocturne.raised },
  // The separator starts at the label, not the icon, as in Settings.
  rowBody: {
    flex: 1,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.s,
    paddingRight: ROW_PAD,
  },
  separator: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Nocturne.edge },
  rowLabel: { flex: 1, color: Nocturne.text, fontSize: 17 },
  editLabel: { fontWeight: '600' },
  symbolTile: {
    width: ICON,
    height: ICON,
    borderRadius: ICON * 0.225,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
