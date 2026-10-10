'use no memo';
// Reads the App Group stores during render (routine, passes, limits…), which change outside
// React. The React Compiler would cache those reads from the first render (Home mounts under
// onboarding before a routine exists, and showed the defaults after), so it stays out here.

import { router } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/text';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlockedAppsView, isBlockedAppsViewAvailable, type RemovedPick } from 'blocked-apps';

import {
  AppTile,
  BrandIcon,
  SystemIcon,
  type BrandName,
  type SystemName,
} from '@/components/app-icons';
import { AddTile, AppPickerSheet } from '@/components/app-picker';
import { GlassCard } from '@/components/glass-card';
import { sym } from '@/components/grouped-list';
import { Segmented } from '@/components/segmented';
import { useTopOnLeave } from '@/hooks/use-top-on-leave';
import { freeLimitId, limitLabel, MAX_LIMITS, type DailyLimit } from '@/lib/daily-limits';
import { getNightPause, heldPhase, pauseWording } from '@/lib/emergency';
import * as haptic from '@/lib/haptics';
import { nextBedtime, readLock } from '@/lib/lock-controller';
import {
  editedSelection,
  getArmedNight,
  isScreenTimeAvailable,
  isStoodDown,
  limitUsedUpToday,
  listChangeLandsAt,
  listChangeStarts,
  type SelectionId,
} from '@/lib/screen-time';
import { Gap, Nocturne, Space, Type } from '@/theme';

import { APPS, type AppEntry } from './catalog';
import { useListActions } from './list-actions';
import { pauseNote, removalNote, startsLabel } from './pending-note';
import { openLimitSheet } from './limit-sheet';
import {
  removePreviewLimit,
  savePreviewLimitApps,
  setPreviewLimitMinutes,
  usePreviewLists,
  type PreviewGroup,
} from './preview-lists';

/**
 * The Apps tab: a Bedtime / Daily limit switcher, then each list as one tile (the bedtime and
 * always lists, then each daily limit): a few of its icons, what it does and how it stands now
 * (docs/DAILY_LIMITS_LAYOUTS.md, options C and E). A tile opens the list's own page
 * (`list-page.tsx`), which shows every app in it, so none are buried (user, 2026-10-10).
 *
 * On an iPhone the icons are the real picks, drawn natively by `BlockedAppsView`. Off iOS
 * (the web preview) there is no Screen Time, so a stand-in list from `catalog.ts` shows
 * the same layout.
 */

export const ICON = 36;
const ROW_PAD = 16;
const ROW_HEIGHT = 56;

type Tab = 'bedtime' | 'limit';
const TABS: { value: Tab; label: string }[] = [
  { value: 'bedtime', label: 'Bedtime' },
  { value: 'limit', label: 'Daily limit' },
];
/** The tab switcher: a plain segmented control at the top of both tabs (docs/DAILY_LIMITS_LAYOUTS.md). */
function TabSwitch({ tab, onChange }: { tab: Tab; onChange: (tab: Tab) => void }) {
  return (
    <View style={styles.switcher}>
      <Segmented value={tab} options={TABS} onChange={onChange} label="Which apps" />
    </View>
  );
}

export function AppsList() {
  return isScreenTimeAvailable() ? <LiveAppsList /> : <PreviewAppsList />;
}

export const LIVE_GROUPS: { key: 'night' | 'always'; label: string; about: string; when: string }[] = [
  { key: 'night', label: 'Sleep at bedtime', about: 'Asleep from bedtime until your wake-up is done.', when: 'bedtime to wake-up' },
  { key: 'always', label: 'Always asleep', about: 'Asleep all day, every day.', when: 'all day, every day' },
];

/** Opens a list's page (`app/list.tsx`): the bedtime or always list, or a daily limit. */
export function openList(id: string) {
  haptic.tap();
  router.push({ pathname: '/list', params: { id } });
}

/** "1 pick", "3 picks". A whole category is one pick: iOS won't say how many apps it holds. */
export const countPicks = (n: number) => (n === 1 ? '1 pick' : `${n} picks`);

/**
 * Removals wait for bedtime (GAME_PLAN), so say when, and whether they're asleep until then.
 * Limits say it in their note instead.
 */
export function PendingNote({ list }: { list: 'night' | 'always' }) {
  const now = new Date();
  // The moment the phone really swaps the list: the first iOS interval start at or after the
  // change's `from` (a night window, or a limit's midnight), or the next open with neither armed.
  const lands = listChangeLandsAt(list, now);
  if (!lands) return null;
  if (list === 'night') {
    // Parked by an emergency unlock until the next night that's on (`pauseWording`).
    const paused = getNightPause(now);
    if (paused) return <Text style={styles.footer}>{pauseNote(pauseWording(paused, now), readLock(now).phase === 'night')}</Text>;
  }
  // Asleep now: the always list (unless a lapse stood everything down), or the bedtime list
  // at night and through the morning. The bedtime list in the day is awake, and its removals
  // land before the next bedtime's shields, so they never sleep, unless a night window starts
  // before the swap: then they sleep from it until the change starts.
  const phase = readLock(now).phase;
  const asleep = !isStoodDown() && (list === 'always' || phase === 'night' || phase === 'morning' || lands.sleepsFirst);
  return <Text style={styles.footer}>{removalNote(lands.at, now, { asleep, waitsForOpen: lands.waitsForOpen })}</Text>;
}

export type TileStatus = { icon: SymbolViewProps['name']; text: string };

/**
 * How a bedtime-tab list stands right now, for its tile and page. Only what's sure: nothing
 * when a lapse stood everything down or the list is empty (the tile's detail says so).
 */
export function listStatus(list: 'night' | 'always', size: number, now = new Date()): TileStatus | null {
  if (size === 0 || isStoodDown()) return null;
  const asleep: TileStatus = { icon: sym('lock.fill', 'lock'), text: 'Asleep now.' };
  if (list === 'always') return asleep;
  const phase = heldPhase(readLock(now).phase, now);
  if (phase === 'night' || phase === 'morning') return asleep;
  const moon = sym('moon.fill', 'bedtime');
  if (getNightPause(now)) return { icon: moon, text: 'Awake after an emergency unlock.' };
  if (!getArmedNight()) return null;
  return { icon: moon, text: `Awake now. Asleep ${startsLabel(nextBedtime(now), now)}.` };
}

function LiveAppsList() {
  const insets = useSafeAreaInsets();
  const scroll = useRef<ScrollView>(null);
  useTopOnLeave(scroll);

  const actions = useListActions();
  const { revision, limits, limitError, revoked, unpaid } = actions;
  const [tab, setTab] = useState<Tab>('bedtime');

  const sizes = useMemo(
    // The lists as last chosen, a waiting change included (`editedSelection`).
    () => ({ night: editedSelection('night'), always: editedSelection('always') }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-read on every revision
    [revision],
  );

  /**
   * A list's first two picks (three crowd the title on a small phone), or its own symbol while
   * it has none. The limit popup has the room for `most`.
   */
  const icons = (id: SelectionId, size: number, empty: ReactNode, most = 2) => {
    const shown = Math.min(most, size);
    return isBlockedAppsViewAvailable && shown > 0 ? (
      <BlockedAppsView
        selectionId={id}
        revision={revision}
        iconsOnly
        style={{ width: shown * ICON + Math.max(0, shown - 1) * Space.xs, height: ICON }}
      />
    ) : (
      empty
    );
  };

  return (
    <>
      <ScrollView
        ref={scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + Gap.pageTop }]}
      >
        <TabSwitch tab={tab} onChange={setTab} />
        {unpaid || revoked ? (
          <View style={styles.header}>
            <Text style={styles.summary}>
              {unpaid
                ? 'No subscription, so nothing here sleeps. Your picks and limits are kept for when you’re back.'
                : 'Screen Time access is off, so nothing is asleep. Turn it back on to put them to sleep again.'}
            </Text>
          </View>
        ) : null}

        {revoked ? (
          <ListCard note={limitError ? <Text style={styles.footer}>{limitError}</Text> : null}>
            <EditRow label="Turn Screen Time access back on" onPress={actions.allow} />
          </ListCard>
        ) : null}
        {unpaid ? (
          <ListCard>
            <EditRow label="See plans" onPress={() => router.push('/onboarding?resume=paywall')} />
          </ListCard>
        ) : null}

        {tab === 'bedtime' && (
          <View style={styles.tiles}>
            <PageHeading title="Bedtime" about="Tap one to see all its apps." />
            {LIVE_GROUPS.map((group) => {
              const size = sizes[group.key].size;
              return (
                <ListTile
                  key={group.key}
                  icons={icons(sizes[group.key].id, size, <ListSymbol list={group.key} />)}
                  title={group.label}
                  detail={size ? `${countPicks(size)} · ${group.when}` : 'No apps yet'}
                  status={listStatus(group.key, size)}
                  onPress={() => openList(group.key)}
                />
              );
            })}
          </View>
        )}

        {tab === 'limit' && (
          <View style={styles.tiles}>
            <PageHeading
              title="Daily limits"
              about={
                limits.length === 0
                  ? 'Give apps a time a day. Once it’s used up, they sleep until midnight.'
                  : 'Tap one to change it.'
              }
            />
            {limits.map((limit) => {
              const usedUp = limitUsedUpToday(limit.id);
              const picks = editedSelection(limit.id);
              const pending = limit.pending ? (limit.pending.minutes === null ? 'ends tonight' : 'changes tonight') : null;
              return (
                <ListTile
                  key={limit.id}
                  icons={icons(picks.id, picks.size, <ListSymbol list="limit" />)}
                  title={`${limitLabel(limit.minutes)} a day`}
                  // Screen Time only tells the app when a limit is used up, not the minutes so
                  // far, so the meter shows just that: full once it's gone.
                  detail={[countPicks(picks.size), usedUp ? 'asleep until midnight' : pending].filter(Boolean).join(' · ')}
                  used={usedUp ? 1 : null}
                  // Brick's Edit mode sheet (user, 2026-10-10); its Apps row opens the full list page.
                  onPress={() => {
                    haptic.tap();
                    openLimitSheet({
                      start: limit.pending?.minutes ?? limit.minutes,
                      chosen: limit.pending ? limit.pending.minutes : limit.minutes,
                      onChange: (m) => actions.setMinutes(limit.id, m),
                      // Already ending: a second Delete would change nothing.
                      onRemove: limit.pending?.minutes === null ? undefined : () => actions.setMinutes(limit.id, null),
                      // No name row: iOS won't name the picks, and the time is on the wheels.
                      note: liveLimitNote(limit),
                      apps: {
                        summary: countPicks(picks.size),
                        onEdit: () => openList(limit.id),
                        icons: icons(picks.id, picks.size, null, 6),
                      },
                    });
                  }}
                />
              );
            })}
            {freeLimitId(limits) ? <NewLimitButton onPress={actions.addLimit} /> : null}
          </View>
        )}
        {/* Both tabs: the bedtime lists can fail to save or need access too. */}
        {!revoked && limitError ? <Text style={[styles.footer, styles.trailingFooter]}>{limitError}</Text> : null}
      </ScrollView>

      {actions.picker}
    </>
  );
}

/** One list as a rounded card, then any note under it. */
export function ListCard({ children, note }: { children: ReactNode; note?: ReactNode }) {
  return (
    <View>
      <GlassCard dark>{children}</GlassCard>
      {note}
    </View>
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
export function PickedRows({
  selectionId,
  count,
  revision,
  onRemove,
}: {
  selectionId: SelectionId;
  count: number;
  revision: number;
  onRemove: (pick: RemovedPick) => void;
}) {
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
        detailed
        removable
        onRemove={(event) => onRemove(event.nativeEvent)}
        rowHeight={ROW_HEIGHT}
        iconSize={ICON}
        textColor={Nocturne.text}
        secondaryColor={Nocturne.text2}
        separatorColor={Nocturne.edge}
        style={{ height: target }}
      />
    </Animated.View>
  );
}

/**
 * What's happening with a limit today, spelled out, never implied (GAME_PLAN, "Reliability").
 * Used up comes first: it's why the apps are asleep right now, whatever waits for bedtime.
 */
export function limitNote(limit: Pick<DailyLimit, 'pending'>, usedUp: boolean, appsChangeAt?: Date | null): string | null {
  const { pending } = limit;
  const parts: string[] = [];
  if (usedUp) parts.push('Used up today. Back at midnight.');
  // `from` is the next bedtime, or midnight with nothing armed (`looserEditsStartAt`): name it.
  const when = pending ? startsLabel(new Date(pending.from), new Date()) : '';
  // Applied by the app (`settleLimitChanges`), so on the first open after then.
  if (pending?.minutes === null) parts.push(`Ends ${when}, when you next open Locturne.`);
  else if (pending) parts.push(`Goes up to ${limitLabel(pending.minutes)} ${when}, when you next open Locturne.`);
  // The app applies a limit's removals (with iOS's count), so on the first open after that time.
  if (appsChangeAt) {
    parts.push(`Removed apps leave ${startsLabel(appsChangeAt, new Date()).replace(/^at /, 'after ')}, when you next open Locturne.`);
  }
  return parts.length ? parts.join(' ') : null;
}

/** A live limit's note, as its page shows it. */
export const liveLimitNote = (limit: DailyLimit) =>
  limitNote(limit, limitUsedUpToday(limit.id), listChangeStarts(limit.id));

/** A tab's title, and what to do with the tiles under it. */
function PageHeading({ title, about }: { title: string; about: string }) {
  return (
    <View style={styles.pageHeading}>
      <Text style={styles.pageTitle} accessibilityRole="header">
        {title}
      </Text>
      <Text style={styles.pageAbout}>{about}</Text>
    </View>
  );
}

/** A list's symbol in place of its icons while it has no apps: a moon, a lock or an hourglass. */
function ListSymbol({ list }: { list: 'night' | 'always' | 'limit' }) {
  const symbol =
    list === 'night' ? sym('moon.fill', 'bedtime') : list === 'always' ? sym('lock.fill', 'lock') : sym('hourglass', 'hourglass_empty');
  return (
    <View style={[styles.symbolTile, list === 'limit' ? styles.limitTile : styles.listTile]}>
      <SymbolView name={symbol} size={ICON * 0.5} tintColor="#FFFFFF" />
    </View>
  );
}

/**
 * One list as a tappable tile (docs/DAILY_LIMITS_LAYOUTS.md, options C and E): its apps,
 * what it does, then how it stands now (a status line, or a thin meter of a limit's time).
 * A tap opens the list's page.
 */
function ListTile({
  icons,
  title,
  detail,
  status,
  used,
  onPress,
}: {
  icons: ReactNode;
  title: string;
  detail: string;
  status?: TileStatus | null;
  /** How much of today's time is gone, 0 to 1. Null when iOS doesn't say. */
  used?: number | null;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[title, detail, status?.text].filter(Boolean).join(', ')}
      accessibilityHint="Shows all its apps"
      style={({ pressed }) => pressed && styles.pressed}
    >
      <GlassCard dark>
        <View style={styles.tile}>
          <View style={styles.tileRow}>
            {icons}
            <View style={styles.tileText}>
              <Text style={styles.tileTitle} numberOfLines={1}>
                {title}
              </Text>
              <Text style={styles.tileDetail} numberOfLines={2}>
                {detail}
              </Text>
            </View>
            <SymbolView
              name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
              size={14}
              weight="semibold"
              tintColor={Nocturne.text3}
            />
          </View>
          {status ? (
            <View style={styles.status}>
              <SymbolView name={status.icon} size={13} tintColor={Nocturne.text2} />
              <Text style={styles.tileDetail}>{status.text}</Text>
            </View>
          ) : null}
          {used != null ? (
            <View style={styles.meter}>
              <View style={[styles.meterFill, { width: `${Math.round(Math.min(1, Math.max(0, used)) * 100)}%` }]} />
            </View>
          ) : null}
        </View>
      </GlassCard>
    </Pressable>
  );
}

/** The limit tab's "New limit" capsule, under the tiles. */
function NewLimitButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.newLimit, pressed && styles.pressed]}
    >
      <Text style={styles.newLimitLabel}>New limit</Text>
    </Pressable>
  );
}

const STACK_STEP = 24;

/** The preview's first two apps, the second tucked behind the first, as on the live tiles. */
function StackedIcons({ names }: { names: string[] }) {
  const shown = names.slice(0, 2);
  return (
    <View style={[styles.stack, { width: ICON + Math.max(0, shown.length - 1) * STACK_STEP }]}>
      {shown
        .map((name, i) => (
          <View key={name} style={[styles.stacked, { left: i * STACK_STEP }]}>
            <AppIcon name={name} />
          </View>
        ))
        .reverse()}
    </View>
  );
}

/** The preview's lists, as the tiles and `list-page.tsx` show them. */
export const PREVIEW_GROUPS: { key: PreviewGroup; label: string; about: string; when: string; picker: string }[] = [
  {
    key: 'bedtime',
    label: LIVE_GROUPS[0].label,
    about: LIVE_GROUPS[0].about,
    when: LIVE_GROUPS[0].when,
    picker: 'Pick the apps that keep you up. They sleep at bedtime and wake after your walk.',
  },
  {
    key: 'always',
    label: LIVE_GROUPS[1].label,
    about: LIVE_GROUPS[1].about,
    when: LIVE_GROUPS[1].when,
    picker: 'Pick the apps you never want to open. They stay asleep all day and night.',
  },
];
export const LIMIT_PICKER_HEADER = 'Pick the apps that share this limit. Once their time is used up, they sleep until midnight.';

const byName = new Map(APPS.map((app) => [app.name, app]));

/** "Instagram", "YouTube + 2 more": a preview list named by its apps (an iPhone can't name them). */
export const namedBy = (apps: string[]) =>
  apps.length > 1 ? `${apps[0]} + ${apps.length - 1} more` : (apps[0] ?? 'No apps');

/** "1 app", "3 apps": the preview knows its apps by name, so it counts apps, not picks. */
export const countApps = (n: number) => (n === 1 ? '1 app' : `${n} apps`);

function PreviewAppsList() {
  const insets = useSafeAreaInsets();
  const scroll = useRef<ScrollView>(null);
  useTopOnLeave(scroll);

  const { picks, limits } = usePreviewLists();
  const [tab, setTab] = useState<Tab>('bedtime');
  // A new limit starts with its apps, as on an iPhone: the picker first, then its tile.
  const [adding, setAdding] = useState(false);

  return (
    <>
      <ScrollView
        ref={scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + Gap.pageTop }]}
      >
        <TabSwitch tab={tab} onChange={setTab} />
        {tab === 'bedtime' && (
          <View style={styles.tiles}>
            <PageHeading title="Bedtime" about="Tap one to see all its apps." />
            {PREVIEW_GROUPS.map((group) => {
              const apps = picks[group.key];
              return (
                <ListTile
                  key={group.key}
                  icons={apps.length ? <StackedIcons names={apps} /> : <ListSymbol list={group.key === 'bedtime' ? 'night' : 'always'} />}
                  title={group.label}
                  detail={apps.length ? `${countApps(apps.length)} · ${group.when}` : 'No apps yet'}
                  status={previewStatus(group.key, apps.length)}
                  onPress={() => openList(group.key)}
                />
              );
            })}
          </View>
        )}

        {tab === 'limit' && (
          <View style={styles.tiles}>
            <PageHeading
              title="Daily limits"
              about={
                limits.length === 0
                  ? 'Give apps a time a day. Once it’s used up, they sleep until midnight.'
                  : 'Tap one to change it.'
              }
            />
            {limits.map((limit, index) => {
              const usedUp = limit.used >= limit.minutes;
              return (
                <ListTile
                  key={index}
                  icons={<StackedIcons names={limit.apps} />}
                  title={namedBy(limit.apps)}
                  detail={`${limitLabel(limit.minutes)} a day · ${usedUp ? 'asleep until midnight' : `${limitLabel(limit.minutes - limit.used)} left`}`}
                  used={limit.used / limit.minutes}
                  onPress={() => {
                    haptic.tap();
                    openLimitSheet({
                      start: limit.minutes,
                      chosen: limit.minutes,
                      onChange: (minutes) => setPreviewLimitMinutes(index, minutes),
                      onRemove: () => removePreviewLimit(index),
                      title: namedBy(limit.apps),
                      note: usedUp ? 'Used up today. Back at midnight.' : null,
                      apps: {
                        summary: countApps(limit.apps.length),
                        onEdit: () => openList(`limit-${index}`),
                        icons: limit.apps.slice(0, 6).map((name) => <AppIcon key={name} name={name} />),
                      },
                    });
                  }}
                />
              );
            })}
            {limits.length < MAX_LIMITS ? (
              <NewLimitButton
                onPress={() => {
                  haptic.tap();
                  setAdding(true);
                }}
              />
            ) : null}
          </View>
        )}
      </ScrollView>

      <AppPickerSheet
        open={adding}
        apps={[]}
        header={LIMIT_PICKER_HEADER}
        onDone={(apps) => {
          haptic.done();
          savePreviewLimitApps(limits.length, apps);
          setAdding(false);
        }}
        onClose={() => setAdding(false)}
      />
    </>
  );
}

/** The preview's stand-in for `listStatus`: a sample bedtime, since there's no routine to read. */
export function previewStatus(group: PreviewGroup, size: number): TileStatus | null {
  if (!size) return null;
  return group === 'always'
    ? { icon: sym('lock.fill', 'lock'), text: 'Asleep now.' }
    : { icon: sym('moon.fill', 'bedtime'), text: 'Awake now. Asleep at 11:00 PM.' };
}

/** The web preview's version of the native rows' round icon. */
export function AppIcon({ name }: { name: string }) {
  const app = byName.get(name);
  return (
    <View style={styles.roundIcon}>
      {app ? <AppIconView app={app} /> : <AppTile name={name} size={ICON} />}
      <View style={styles.iconRing} pointerEvents="none" />
    </View>
  );
}

/** The web preview's version of the native `detailed` rows. */
export function AppRow({
  name,
  last,
}: {
  name: string;
  /** The card's last row: no separator under it, as in Settings. */
  last: boolean;
}) {
  return (
    <View style={styles.row}>
      <AppIcon name={name} />
      <View style={[styles.rowBody, !last && styles.separator]} accessible accessibilityLabel={name}>
        <Text style={[styles.rowLabel, styles.flex]} numberOfLines={1}>
          {name}
        </Text>
      </View>
    </View>
  );
}

/**
 * A list's action row: a white + tile, its label and a chevron. `divided` draws the separator
 * above the rows that follow.
 */
export function EditRow({ label, onPress, divided }: { label: string; onPress: () => void; divided?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={styles.roundIcon}>
        <AddTile size={ICON} />
      </View>
      <View style={[styles.rowBody, divided && styles.separator]}>
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
  // Lists spaced by the gap, not their own margins, so the last one ends one gutter above
  // the panel's bottom edge: the same distance as from its sides.
  content: { paddingHorizontal: Gap.gutter, paddingBottom: Gap.gutter, gap: Gap.section },
  header: { gap: Gap.headline },
  tiles: { gap: Space.m },
  switcher: { alignSelf: 'center', width: '100%', maxWidth: 340 },
  pageHeading: { gap: Space.xs, alignItems: 'center', marginBottom: Space.s },
  pageTitle: { color: Nocturne.text, fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: -0.4, textAlign: 'center' },
  pageAbout: { ...Type.body, color: Nocturne.text2, textAlign: 'center' },
  tile: { padding: ROW_PAD, gap: 14 },
  tileRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  tileText: { flex: 1, gap: 2 },
  tileTitle: { color: Nocturne.text, fontSize: 17, lineHeight: 22, fontWeight: '600' },
  tileDetail: { ...Type.caption, color: Nocturne.text2 },
  status: { flexDirection: 'row', alignItems: 'center', gap: Space.s },
  // Moon white on the palette's progress track, like the rest of the app's meters.
  meter: { height: 4, borderRadius: 2, backgroundColor: Nocturne.progressTrack, overflow: 'hidden' },
  meterFill: { height: 4, borderRadius: 2, backgroundColor: Nocturne.accent ?? Nocturne.cta },
  stack: { height: ICON },
  // Each icon ringed in the card's colour, so the one behind reads as tucked under it.
  stacked: { position: 'absolute', top: -2, padding: 2, borderRadius: ICON / 2 + 2, backgroundColor: '#0B0E16' },
  newLimit: {
    alignSelf: 'center',
    minHeight: 48,
    paddingHorizontal: 24,
    marginTop: Space.s,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Nocturne.surface,
  },
  newLimitLabel: { color: Nocturne.text, fontSize: 16, fontWeight: '600' },
  summary: { color: Nocturne.text2, ...Type.body },

  pressed: { opacity: 0.7 },
  flex: { flex: 1 },

  roundIcon: { width: ICON, height: ICON, borderRadius: ICON / 2, overflow: 'hidden' },
  // A faint edge, so black icons (Netflix, X, Threads) keep their shape on the black card.
  iconRing: {
    ...StyleSheet.absoluteFill,
    borderRadius: ICON / 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  rowsClip: { overflow: 'hidden' },
  // Screen Time's own App Limits tile: an hourglass on system orange.
  limitTile: { backgroundColor: '#FF9F0A' },
  listTile: { backgroundColor: Nocturne.surface },
  footer: { ...Type.caption, color: Nocturne.text2, marginHorizontal: Space.l, marginTop: Space.s, textAlign: 'center' },
  // Under the last list rather than inside it: pulled back up past the gap between lists.
  trailingFooter: { marginTop: Space.s - Gap.section },
  row: { flexDirection: 'row', alignItems: 'center', paddingLeft: ROW_PAD, gap: 14 },
  rowPressed: { backgroundColor: 'rgba(255, 255, 255, 0.06)' },
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
  rowLabel: { color: Nocturne.text, fontSize: 17, fontWeight: '500' },
  editLabel: { flex: 1, fontWeight: '600' },
  symbolTile: {
    width: ICON,
    height: ICON,
    borderRadius: ICON / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
