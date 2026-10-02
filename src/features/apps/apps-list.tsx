import { useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlockedAppsView, isBlockedAppsViewAvailable } from 'blocked-apps';

import {
  AppTile,
  BrandIcon,
  SystemIcon,
  type BrandName,
  type SystemName,
} from '@/components/app-icons';
import { AddTile, AppPickerSheet } from '@/components/app-picker';
import { useTabBarInset } from '@/components/app-tabs';
import { ScreenTimePicker } from '@/components/screen-time-picker';
import {
  editLimit,
  freeLimitId,
  isLimitId,
  LIMIT_CHOICES,
  limitLabel,
  MAX_LIMITS,
  looserEditsStart,
  type DailyLimit,
  type LimitId,
} from '@/lib/daily-limits';
import * as haptic from '@/lib/haptics';
import {
  armLimit,
  clearSelection,
  getAccess,
  getArmedNight,
  getLimits,
  isScreenTimeAvailable,
  limitUsedUpToday,
  requestAccess,
  saveLimits,
  selectionSize,
  type SelectionId,
} from '@/lib/screen-time';
import { DISPLAY_MAX_SCALE, DisplayFont, Gap, Nocturne, Radius, Space, Type } from '@/theme';

import { APPS, type AppEntry } from './catalog';
import { LimitMenu } from './limit-menu';

/**
 * The Apps tab: the picked apps in Settings-style rows, one group per Screen Time
 * selection. Each group ends in an edit row that reopens Apple's FamilyActivityPicker.
 *
 * On an iPhone the rows are the real picks, drawn natively by `BlockedAppsView`. Off iOS
 * (the web preview) there is no Screen Time, so a stand-in list from `catalog.ts` shows
 * the same layout.
 */

const ICON = 30;
const ROW_PAD = 16;
const ROW_HEIGHT = 52;

export function AppsList() {
  return isScreenTimeAvailable() ? <LiveAppsList /> : <PreviewAppsList />;
}

const LIVE_GROUPS: { key: 'night' | 'always'; label: string }[] = [
  { key: 'night', label: 'Sleep at bedtime' },
  { key: 'always', label: 'Always asleep' },
];

/** "1 pick", "3 picks". A whole category is one pick: iOS won't say how many apps it holds. */
const countPicks = (n: number) => (n === 1 ? '1 pick' : `${n} picks`);

function LiveAppsList() {
  const insets = useSafeAreaInsets();
  const bottom = useTabBarInset();

  const [access, setAccess] = useState(getAccess);
  const [editing, setEditing] = useState<SelectionId | null>(null);
  // Bumped whenever the picks may have changed, so counts and native rows re-read them.
  const [revision, setRevision] = useState(0);
  const [limits, setLimits] = useState(getLimits);
  const refresh = useCallback(() => {
    setAccess(getAccess());
    setLimits(getLimits());
    setRevision((r) => r + 1);
  }, []);

  // Onboarding or the Screen Time lab can change the picks while this tab is hidden.
  useFocusEffect(refresh);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => state === 'active' && refresh());
    return () => sub.remove();
  }, [refresh]);

  const sizes = useMemo(
    () => ({ night: selectionSize('night'), always: selectionSize('always') }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-read on every revision
    [revision],
  );

  const [limitError, setLimitError] = useState<string | null>(null);

  const saveAndArm = async (next: DailyLimit[], arm?: DailyLimit) => {
    saveLimits(next);
    setLimits(next);
    setLimitError(null);
    if (!arm) return;
    try {
      await armLimit(arm);
    } catch {
      // Never imply a limit is on when iOS refused it (GAME_PLAN, "Reliability").
      setLimitError("iOS wouldn't start that limit. Try again in a moment.");
    }
  };

  /** Stricter edits start now; looser ones wait for bedtime (`editLimit`). */
  const setMinutes = (id: LimitId, minutes: number | null) => {
    haptic.tap();
    const next = editLimit(limits, id, minutes, looserEditsStart(new Date(), getArmedNight()));
    const after = next.find((l) => l.id === id);
    const before = limits.find((l) => l.id === id);
    saveAndArm(next, after && after.minutes !== before?.minutes ? after : undefined);
  };

  // Apple's picker closed on a limit's list: a new limit starts at 30 minutes; an existing
  // one is re-armed, because iOS keeps its own copy of the picks.
  const pickedLimit = (id: LimitId) => {
    const existing = limits.find((l) => l.id === id);
    if (existing) return saveAndArm(limits, existing);
    if (selectionSize(id) === 0) return clearSelection(id);
    const created: DailyLimit = { id, minutes: 30 };
    saveAndArm([...limits, created], created);
  };

  const addLimit = () => {
    const id = freeLimitId(limits);
    if (!id) return;
    haptic.tap();
    setEditing(id);
  };

  const allow = async () => {
    haptic.tap();
    setAccess(await requestAccess());
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
            {access === 'approved'
              ? `${countPicks(sizes.night)} sleep at bedtime, ${countPicks(sizes.always)} stay asleep all day.`
              : 'Locturne needs Screen Time access to put apps to sleep.'}
          </Text>
        </View>

        {access !== 'approved' ? (
          <View style={styles.group}>
            <EditRow label="Allow Screen Time access" onPress={allow} />
          </View>
        ) : (
          <>
            {LIVE_GROUPS.map((group) => (
              <View key={group.key} style={styles.section}>
                <Text style={styles.sectionLabel}>{group.label}</Text>
                <View style={styles.group}>
                  {sizes[group.key] > 0 && !isBlockedAppsViewAvailable && (
                    // A build from before modules/blocked-apps existed can't draw the rows.
                    <View style={[styles.rowBody, styles.separator, styles.note]}>
                      <Text style={styles.noteText}>
                        {countPicks(sizes[group.key])}. Install the latest build to see them.
                      </Text>
                    </View>
                  )}
                  {isBlockedAppsViewAvailable && (
                    <PickedRows selectionId={group.key} count={sizes[group.key]} revision={revision} />
                  )}
                  <EditRow
                    label={sizes[group.key] ? 'Add or remove apps' : 'Add apps'}
                    onPress={() => {
                      haptic.tap();
                      setEditing(group.key);
                    }}
                  />
                </View>
              </View>
            ))}

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Daily limits</Text>
              {limits.map((limit) => (
                <View key={limit.id} style={[styles.group, styles.limitGroup]}>
                  <LimitHeader
                    limit={limit}
                    usedUp={limitUsedUpToday(limit.id)}
                    onChange={(m) => setMinutes(limit.id, m)}
                    onRemove={() => setMinutes(limit.id, null)}
                  />
                  {isBlockedAppsViewAvailable && (
                    <PickedRows selectionId={limit.id} count={selectionSize(limit.id)} revision={revision} />
                  )}
                  <EditRow
                    label="Add or remove apps"
                    onPress={() => {
                      haptic.tap();
                      setEditing(limit.id);
                    }}
                  />
                </View>
              ))}
              {freeLimitId(limits) && (
                <View style={styles.group}>
                  <EditRow label="Add a daily limit" onPress={addLimit} />
                </View>
              )}
              <Text style={styles.footer}>
                {limitError ??
                  "Once the time's used up, those apps sleep until midnight. A tighter limit starts now; a looser one waits for bedtime."}
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      {editing && (
        <ScreenTimePicker
          list={editing}
          // The library saves the new picks 0.1s after Done (a debounce), so refreshing on
          // close alone reads the old list. It reports once the save lands; refresh then.
          onPicked={refresh}
          onClose={() => {
            const closed = editing;
            setEditing(null);
            refresh();
            // In case the picker unmounts before its report arrives.
            setTimeout(() => {
              refresh();
              if (isLimitId(closed)) pickedLimit(closed);
            }, 500);
          }}
        />
      )}
    </>
  );
}

// The same curve the native rows fade on (BlockedAppsModule.swift), so the group's edge and
// its rows move as one.
const RESIZE = { duration: 350, easing: Easing.bezier(0.2, 0.9, 0.3, 1) };

/**
 * One list's native rows. The group grows or shrinks smoothly when picks change instead of
 * snapping, while the native view, already at its full height underneath, fades the changed
 * rows. Stays mounted at zero picks so the first pick animates in too.
 */
function PickedRows({ selectionId, count, revision }: { selectionId: SelectionId; count: number; revision: number }) {
  const reduceMotion = useReducedMotion();
  const target = count * ROW_HEIGHT;
  const height = useSharedValue(target);

  useEffect(() => {
    height.value = reduceMotion ? target : withTiming(target, RESIZE);
  }, [height, target, reduceMotion]);

  const clip = useAnimatedStyle(() => ({ height: height.value }));

  return (
    <Animated.View style={[styles.rowsClip, clip]}>
      <BlockedAppsView
        selectionId={selectionId}
        revision={revision}
        rowHeight={ROW_HEIGHT}
        textColor={Nocturne.text}
        separatorColor={Nocturne.edge}
        style={{ height: target }}
      />
    </Animated.View>
  );
}

/**
 * A limit's first row: the time per day as a menu, and what's happening with it today.
 * The used-up and waiting states are spelled out, never implied (GAME_PLAN, "Reliability").
 */
function LimitHeader({
  limit,
  usedUp,
  onChange,
  onRemove,
}: {
  limit: Pick<DailyLimit, 'minutes' | 'pending'>;
  usedUp: boolean;
  onChange: (minutes: number) => void;
  onRemove: () => void;
}) {
  const { pending } = limit;
  let status: string | null = null;
  if (pending?.minutes === null) status = 'Ends at bedtime.';
  else if (pending) status = `Goes up to ${limitLabel(pending.minutes)} at bedtime.`;
  else if (usedUp) status = 'Used up today. Back at midnight.';

  return (
    <View style={styles.row}>
      <View style={[styles.symbolTile, styles.limitTile]}>
        <SymbolView name={{ ios: 'hourglass', android: 'hourglass_empty', web: 'hourglass_empty' }} size={ICON * 0.56} tintColor="#FFFFFF" />
      </View>
      <View style={[styles.rowBody, styles.separator]}>
        <View style={styles.limitText}>
          <Text style={styles.rowLabel} numberOfLines={1}>
            Daily limit
          </Text>
          {status ? <Text style={styles.limitStatus}>{status}</Text> : null}
        </View>
        <LimitMenu
          minutes={limit.minutes}
          chosen={pending ? pending.minutes : limit.minutes}
          choices={LIMIT_CHOICES}
          onChange={onChange}
          onRemove={onRemove}
        />
      </View>
    </View>
  );
}

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

function PreviewAppsList() {
  const insets = useSafeAreaInsets();
  const bottom = useTabBarInset();

  const [picks, setPicks] = useState<Record<Group, string[]>>(() => ({
    bedtime: initial('bedtime'),
    always: initial('always'),
  }));
  const [editing, setEditing] = useState<Group | null>(null);
  const editingGroup = GROUPS.find((g) => g.key === editing);

  // Limits in the preview apply at once: there's no bedtime to wait for.
  const [limits, setLimits] = useState([{ minutes: 30, apps: ['Instagram'] }]);
  const [editingLimit, setEditingLimit] = useState<number | null>(null);
  const saveLimit = (index: number, apps: string[]) => {
    haptic.done();
    setLimits((current) =>
      index < current.length
        ? current.map((l, i) => (i === index ? { ...l, apps } : l))
        : apps.length
          ? [...current, { minutes: 30, apps }]
          : current,
    );
    setEditingLimit(null);
  };

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

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Daily limits</Text>
          {limits.map((limit, index) => (
            <View key={index} style={[styles.group, styles.limitGroup]}>
              <LimitHeader
                limit={limit}
                usedUp={false}
                onChange={(minutes) => setLimits((ls) => ls.map((l, i) => (i === index ? { ...l, minutes } : l)))}
                onRemove={() => setLimits((ls) => ls.filter((_, i) => i !== index))}
              />
              {limit.apps.map((name) => (
                <AppRow key={name} name={name} />
              ))}
              <EditRow
                label="Add or remove apps"
                onPress={() => {
                  haptic.tap();
                  setEditingLimit(index);
                }}
              />
            </View>
          ))}
          {limits.length < MAX_LIMITS && (
            <View style={styles.group}>
              <EditRow
                label="Add a daily limit"
                onPress={() => {
                  haptic.tap();
                  setEditingLimit(limits.length);
                }}
              />
            </View>
          )}
          <Text style={styles.footer}>
            Once the time&apos;s used up, those apps sleep until midnight. A tighter limit starts now; a looser one
            waits for bedtime.
          </Text>
        </View>
      </ScrollView>

      <AppPickerSheet
        open={editingLimit !== null}
        apps={editingLimit !== null ? (limits[editingLimit]?.apps ?? []) : []}
        header="Pick the apps that share this limit. Once their time is used up, they sleep until midnight."
        onDone={(apps) => editingLimit !== null && saveLimit(editingLimit, apps)}
        onClose={() => setEditingLimit(null)}
      />

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
  rowsClip: { overflow: 'hidden' },
  limitGroup: { marginBottom: Space.m },
  // Screen Time's own App Limits tile: an hourglass on system orange.
  limitTile: { backgroundColor: '#FF9F0A' },
  limitText: { flex: 1, paddingVertical: Space.s },
  limitStatus: { ...Type.caption, color: Nocturne.text2 },
  footer: { ...Type.caption, color: Nocturne.text2, marginHorizontal: Space.l, marginTop: Space.s },
  row: { flexDirection: 'row', alignItems: 'center', paddingLeft: ROW_PAD, gap: 14 },
  rowPressed: { backgroundColor: Nocturne.raised },
  // The separator starts at the label, not the icon, as in Settings.
  rowBody: {
    flex: 1,
    minHeight: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.s,
    paddingRight: ROW_PAD,
  },
  separator: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Nocturne.edge },
  rowLabel: { flex: 1, color: Nocturne.text, fontSize: 17 },
  editLabel: { fontWeight: '600' },
  note: { paddingLeft: ROW_PAD },
  noteText: { flex: 1, color: Nocturne.text2, ...Type.body },
  symbolTile: {
    width: ICON,
    height: ICON,
    borderRadius: ICON * 0.225,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
