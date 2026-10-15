'use no memo';
// Reads the App Group stores during render (routine, passes, limits…), which change outside
// React. The React Compiler would cache those reads from the first render (Home mounts under
// onboarding before a routine exists, and showed the defaults after), so it stays out here.

import { router } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { createContext, use, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
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
import { appsMoonRoom } from '@/components/night-sky';
import { sym } from '@/components/grouped-list';
import { useTopOnLeave } from '@/hooks/use-top-on-leave';
import { freeLimitId, limitLabel, MAX_LIMITS, type DailyLimit } from '@/lib/daily-limits';
import { getNightPause, heldPhase, pauseWording } from '@/lib/emergency';
import * as haptic from '@/lib/haptics';
import { nextBedtime, onLockChange, readLock } from '@/lib/lock-controller';
import {
  editedSelection,
  getArmedNight,
  getSchedules,
  isScreenTimeAvailable,
  isStoodDown,
  limitUsedUpToday,
  listChangeLandsAt,
  listChangeStarts,
  selectionSize,
  type SelectionId,
} from '@/lib/screen-time';
import { APP_FONT, DISPLAY_MAX_SCALE, Gap, Nocturne, Space, Type } from '@/theme';

import { APPS, type AppEntry } from './catalog';
import { useListActions } from './list-actions';
import { pauseNote, removalNote, startsLabel } from './pending-note';
import { openLimitSheet } from './limit-sheet';
import { newScheduleId, scheduleStatus, scheduleSummary, schedulePendingNote } from './schedule-actions';
import { openScheduleSheet } from './schedule-sheet';
import { MAX_SCHEDULES, type ScheduleId } from '@/lib/schedules';
import {
  removePreviewLimit,
  savePreviewLimitApps,
  setPreviewLimitMinutes,
  setPreviewLimitName,
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
/** Tiles that still leave room under them for the raised moon (`appsMoonRoom`). */
const MOON_ROOM_TILES = 2;

/**
 * Tells the sky whether this tab leaves room under its tiles for the raised moon. `alwaysTile`:
 * the all-day list shows (it has apps). Schedules are re-read as their sheet saves them.
 */
function useMoonRoom(tab: Tab, limits: number, alwaysTile: boolean) {
  const [, redraw] = useState(0);
  useEffect(() => onLockChange(() => redraw((n) => n + 1)), []);
  const tiles = tab === 'bedtime' ? 1 + (alwaysTile ? 1 : 0) + getSchedules(new Date()).length : limits;
  const room = tiles <= MOON_ROOM_TILES;
  useEffect(() => appsMoonRoom.set(room), [room]);
  useEffect(() => () => appsMoonRoom.set(true), []);
}

/**
 * One fixed tile height per tab, worked out so the most tiles it can hold fill the page
 * exactly (user, 2026-10-14): Sleep at bedtime and four schedules, or four limits. Fewer
 * leave room below; tiles never change size with the count. Null until the page is measured.
 */
const TileHeight = createContext<number | null>(null);

function useTileHeight(tab: Tab) {
  const [page, setPage] = useState(0);
  const [top, setTop] = useState(0);
  const most = tab === 'bedtime' ? 1 + MAX_SCHEDULES : MAX_LIMITS;
  // The page under the title, less the bottom gutter (`styles.content`) and the gaps between.
  const room = page - top - Gap.gutter - (most - 1) * TILE_GAP;
  return {
    height: page && top ? Math.floor(room / most) : null,
    onPage: (e: LayoutChangeEvent) => setPage(e.nativeEvent.layout.height),
    onTiles: (e: LayoutChangeEvent) => setTop(e.nativeEvent.layout.y),
  };
}

/** How many icons a tile shows before its "+N". */
/** iOS's icons-only view draws three, 32 pt (BlockedAppsModule). */
const TILE_ICONS = 3;
const TILE_ICON = 32;
const TILE_GAP = Space.m;

const TABS: { value: Tab; label: string }[] = [
  // Bedtime's list, the all-day list and each app schedule (user, 2026-10-14).
  { value: 'bedtime', label: 'Schedules' },
  { value: 'limit', label: 'Limits' },
];
/**
 * The page title is the tab switcher: both tabs' names in Routine's large, light title, the
 * chosen one white and the other dimmed, a tap away, with a faint rule between them so it
 * reads as a switch (user's pick, 2026-10-10; it replaced a segmented control under no title).
 */
function TabSwitch({ tab, onChange }: { tab: Tab; onChange: (tab: Tab) => void }) {
  return (
    <View style={styles.switcher} accessibilityRole="tablist">
      {TABS.map((t, i) => {
        const on = t.value === tab;
        return [
          i > 0 ? <View key="rule" style={styles.switchRule} /> : null,
          <Pressable
            key={t.value}
            onPress={() => {
              if (on) return;
              haptic.tap();
              onChange(t.value);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            hitSlop={Space.s}
          >
            <Text style={[styles.switchLabel, !on && styles.switchOff]} maxFontSizeMultiplier={DISPLAY_MAX_SCALE}>
              {t.label}
            </Text>
          </Pressable>,
        ];
      })}
    </View>
  );
}

export function AppsList() {
  return isScreenTimeAvailable() ? <LiveAppsList /> : <PreviewAppsList />;
}

export const LIVE_GROUPS: { key: 'night' | 'always'; label: string; about: string; when: string }[] = [
  { key: 'night', label: 'Sleep at bedtime', about: 'Asleep from bedtime until your wake-up is done.', when: 'bedtime to wake-up' },
  // "Always asleep" until 2026-10-14: now the all-day one among the schedules (docs/LOCK_V2.md).
  { key: 'always', label: 'All day', about: 'Asleep all day, every day.', when: 'all day, every day' },
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
  useMoonRoom(tab, limits.length, sizes.always.size > 0 || selectionSize('always') > 0);
  const tile = useTileHeight(tab);

  /**
   * A list's first picks on their own row of the tile (four and a "+N" fit a small phone), or
   * its own symbol while it has none. The limit popup has the room for `most`.
   */
  const icons = (id: SelectionId, size: number, empty: ReactNode, most = TILE_ICONS) => {
    const shown = Math.min(most, size);
    return isBlockedAppsViewAvailable && shown > 0 ? (
      <BlockedAppsView
        selectionId={id}
        revision={revision}
        iconsOnly
        style={{ width: shown * TILE_ICON + Math.max(0, shown - 1) * Space.xs, height: TILE_ICON }}
      />
    ) : (
      empty
    );
  };
  const tileIcons = (id: SelectionId, size: number, empty: ReactNode) => (
    <IconStrip>{icons(id, size, empty)}</IconStrip>
  );

  return (
    <TileHeight.Provider value={tile.height}>
      <ScrollView
        ref={scroll}
        onLayout={tile.onPage}
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
          <View style={styles.tiles} onLayout={tile.onTiles}>
            {LIVE_GROUPS.map((group) => {
              const size = sizes[group.key].size;
              // All day isn't a schedule of its own any more (a schedule's All day switch is): it
              // shows only while it still holds apps, or removals waiting to land.
              if (group.key === 'always' && size === 0 && selectionSize('always') === 0) return null;
              return (
                <ListTile
                  key={group.key}
                  icons={tileIcons(sizes[group.key].id, size, <ListSymbol list={group.key} />)}
                  title={group.label}
                  detail={size ? `${countPicks(size)} · ${group.when}` : 'No apps yet'}
                  status={listStatus(group.key, size)}
                  onPress={() => openList(group.key)}
                />
              );
            })}
            <ScheduleTiles
              revision={revision}
              icons={(id) => {
                const picks = editedSelection(id);
                return { size: picks.size, node: tileIcons(picks.id, picks.size, <ListSymbol list="schedule" />) };
              }}
            />
          </View>
        )}

        {tab === 'limit' && (
          <View style={styles.tiles} onLayout={tile.onTiles}>
            {limits.length === 0 ? <Text style={styles.empty}>{LIMITS_ABOUT}</Text> : null}
            {limits.map((limit) => {
              const usedUp = limitUsedUpToday(limit.id);
              const picks = editedSelection(limit.id);
              // When it lands, never a plain "tonight": an edit from bed after bedtime waits a night.
              const when = limit.pending ? startsLabel(new Date(limit.pending.from), new Date()) : '';
              const pending = limit.pending ? `${limit.pending.minutes === null ? 'ends' : 'changes'} ${when}` : null;
              const daily = `${limitLabel(limit.minutes)} a day`;
              return (
                <ListTile
                  key={limit.id}
                  icons={tileIcons(picks.id, picks.size, <ListSymbol list="limit" />)}
                  // Named, the time moves down into the detail.
                  title={limit.name ?? daily}
                  // Screen Time only tells the app when a limit is used up, not the minutes so
                  // far, so the meter shows just that: full once it's gone.
                  detail={[limit.name ? daily : null, countPicks(picks.size), usedUp ? 'asleep until midnight' : pending]
                    .filter(Boolean)
                    .join(' · ')}
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
                      // iOS won't name the picks, so unnamed it goes by its time.
                      name: { value: limit.name ?? '', fallback: daily, onRename: (n) => actions.setName(limit.id, n) },
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
    </TileHeight.Provider>
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

/** The limit tab with no limits yet: what one does, above the New limit button. */
const LIMITS_ABOUT = 'Give apps a time a day. Once it’s used up, they sleep until midnight.';

/** A tile's first icons. Its detail line already counts the picks, so no "+N" (room for the title). */
function IconStrip({ children }: { children: ReactNode }) {
  return <View style={styles.strip}>{children}</View>;
}

/** A list's symbol in place of its icons while it has no apps: a moon, a lock or an hourglass. */
function ListSymbol({ list }: { list: 'night' | 'always' | 'limit' | 'schedule' }) {
  const symbol =
    list === 'night'
      ? sym('moon.fill', 'bedtime')
      : list === 'always'
        ? sym('lock.fill', 'lock')
        : list === 'schedule'
          ? sym('calendar.badge.clock', 'schedule')
          : sym('hourglass', 'hourglass_empty');
  return (
    <View style={[styles.symbolTile, styles.tileSymbol, list === 'limit' ? styles.limitTile : styles.listTile]}>
      <SymbolView name={symbol} size={TILE_ICON * 0.5} tintColor="#FFFFFF" />
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
  const height = use(TileHeight);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[title, detail, status?.text].filter(Boolean).join(', ')}
      accessibilityHint="Shows all its apps"
      style={({ pressed }) => [height !== null && { minHeight: height }, pressed && styles.pressed]}
    >
      <GlassCard dark style={height !== null && styles.flex}>
        <View style={[styles.tile, height !== null && styles.flex]}>
          {/* The title beside its apps, so four schedules or limits fit one screen (user, 2026-10-14). */}
          <View style={styles.tileTop}>
            <Text style={styles.tileTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
              {title}
            </Text>
            {icons}
            <SymbolView
              name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
              size={15}
              weight="semibold"
              tintColor={Nocturne.text3}
            />
          </View>
          {/* The title stays at the top and the rest settles at the bottom. */}
          {height !== null ? <View style={styles.flex} /> : null}
          <Text style={styles.tileDetail} numberOfLines={1}>
            {detail}
          </Text>
          {status ? (
            <View style={styles.status}>
              <SymbolView name={status.icon} size={14} tintColor={Nocturne.text2} />
              <Text style={styles.statusText}>{status.text}</Text>
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
function NewLimitButton({ onPress, label = 'New limit' }: { onPress: () => void; label?: string }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.newLimit, pressed && styles.pressed]}
    >
      <Text style={styles.newLimitLabel}>{label}</Text>
    </Pressable>
  );
}

/**
 * Each app schedule as a tile under the bedtime and all-day lists, then New schedule while
 * there's room (`MAX_SCHEDULES`). A tile opens its sheet, whose Apps row opens its page, as a
 * daily limit's does. `icons` draws a schedule's picks (none in the web preview).
 */
function ScheduleTiles({ revision, icons }: { revision: number; icons: (id: ScheduleId) => { size: number; node: ReactNode } }) {
  void revision;
  // A schedule is saved as its sheet goes (`saveSchedule`), which syncs the lock: redraw then.
  const [, redraw] = useState(0);
  useEffect(() => onLockChange(() => redraw((n) => n + 1)), []);
  const now = new Date();
  const schedules = [...getSchedules(now)].sort((a, b) => a.id.localeCompare(b.id));
  const free = schedules.length < MAX_SCHEDULES ? newScheduleId(now) : null;
  return (
    <>
      {schedules.map((schedule) => {
        const { size, node } = icons(schedule.id);
        const status = scheduleStatus(schedule, now);
        const waiting = schedulePendingNote(schedule, now);
        return (
          <ListTile
            key={schedule.id}
            icons={node}
            title={schedule.name || 'Schedule'}
            detail={[size ? countPicks(size) : 'No apps yet', scheduleSummary(schedule)].join(' · ')}
            status={
              waiting
                ? { icon: sym('clock', 'schedule'), text: waiting }
                : status && size
                  ? { icon: status.asleep ? sym('lock.fill', 'lock') : sym('calendar', 'calendar_today'), text: status.text }
                  : null
            }
            onPress={() => {
              haptic.tap();
              openScheduleSheet({ id: schedule.id, isNew: false, apps: size ? countPicks(size) : 'None yet' });
            }}
          />
        );
      })}
      {free ? (
        <NewLimitButton
          label="New schedule"
          onPress={() => {
            haptic.tap();
            openScheduleSheet({ id: free, isNew: true });
          }}
        />
      ) : null}
    </>
  );
}

/** The preview's first apps in a row, then a "+N", as on the live tiles. */
function PreviewIcons({ names }: { names: string[] }) {
  return (
    <IconStrip>
      {names.slice(0, TILE_ICONS).map((name) => (
        <AppIcon key={name} name={name} />
      ))}
    </IconStrip>
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
  useMoonRoom(tab, limits.length, picks.always.length > 0);
  const tile = useTileHeight(tab);
  // A new limit starts with its apps, as on an iPhone: the picker first, then its tile.
  const [adding, setAdding] = useState(false);

  return (
    <TileHeight.Provider value={tile.height}>
      <ScrollView
        ref={scroll}
        onLayout={tile.onPage}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + Gap.pageTop }]}
      >
        <TabSwitch tab={tab} onChange={setTab} />
        {tab === 'bedtime' && (
          <View style={styles.tiles} onLayout={tile.onTiles}>
            {PREVIEW_GROUPS.map((group) => {
              const apps = picks[group.key];
              if (group.key === 'always' && apps.length === 0) return null;
              return (
                <ListTile
                  key={group.key}
                  icons={apps.length ? <PreviewIcons names={apps} /> : <ListSymbol list={group.key === 'bedtime' ? 'night' : 'always'} />}
                  title={group.label}
                  detail={apps.length ? `${countApps(apps.length)} · ${group.when}` : 'No apps yet'}
                  status={previewStatus(group.key, apps.length)}
                  onPress={() => openList(group.key)}
                />
              );
            })}
            <ScheduleTiles revision={0} icons={() => ({ size: 0, node: <ListSymbol list="schedule" /> })} />
          </View>
        )}

        {tab === 'limit' && (
          <View style={styles.tiles} onLayout={tile.onTiles}>
            {limits.length === 0 ? <Text style={styles.empty}>{LIMITS_ABOUT}</Text> : null}
            {limits.map((limit) => {
              const usedUp = limit.used >= limit.minutes;
              return (
                <ListTile
                  key={limit.id}
                  icons={<PreviewIcons names={limit.apps} />}
                  title={limit.name ?? namedBy(limit.apps)}
                  detail={`${limitLabel(limit.minutes)} a day · ${usedUp ? 'asleep until midnight' : `${limitLabel(limit.minutes - limit.used)} left`}`}
                  used={limit.used / limit.minutes}
                  onPress={() => {
                    haptic.tap();
                    openLimitSheet({
                      start: limit.minutes,
                      chosen: limit.minutes,
                      onChange: (minutes) => setPreviewLimitMinutes(limit.id, minutes),
                      onRemove: () => removePreviewLimit(limit.id),
                      name: {
                        value: limit.name ?? '',
                        fallback: namedBy(limit.apps),
                        onRename: (n) => setPreviewLimitName(limit.id, n),
                      },
                      note: usedUp ? 'Used up today. Back at midnight.' : null,
                      apps: {
                        summary: countApps(limit.apps.length),
                        onEdit: () => openList(`limit-${limit.id}`),
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
          savePreviewLimitApps(null, apps);
          setAdding(false);
        }}
        onClose={() => setAdding(false)}
      />
    </TileHeight.Provider>
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
  tiles: { gap: TILE_GAP },
  // The two names and the rule centred as one group. (Halving the row put the rule at the
  // screen's centre, but "Bedtime" is wider than "Limits", so the title read as off-centre.)
  switcher: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Space.l + Space.xs },
  switchRule: { width: StyleSheet.hairlineWidth * 2, height: 28, borderRadius: 1, backgroundColor: Nocturne.edge },
  // Routine's title: large and light.
  switchLabel: { ...APP_FONT, color: Nocturne.text, fontSize: 36, lineHeight: 44, fontWeight: '300', letterSpacing: -0.6 },
  switchOff: { color: Nocturne.text3 },
  empty: { ...Type.body, color: Nocturne.text2, textAlign: 'center', marginHorizontal: Space.l },
  tile: { paddingHorizontal: Space.l, paddingVertical: Space.m, gap: Space.xs },
  tileTop: { flexDirection: 'row', alignItems: 'center', gap: Space.s, marginBottom: Space.xs },
  strip: { flexDirection: 'row', alignItems: 'center', gap: Space.xs + 2 },
  tileTitle: { flex: 1, color: Nocturne.text, fontSize: 18, lineHeight: 23, fontWeight: '700', letterSpacing: -0.3 },
  tileDetail: { ...Type.secondary, color: Nocturne.text2 },
  // How it stands now, set off from what it is by a hairline.
  status: { flexDirection: 'row', alignItems: 'center', gap: Space.s },
  statusText: { ...Type.secondary, flex: 1, color: Nocturne.text },
  // Moon white on the palette's progress track, like the rest of the app's meters.
  meter: { height: 6, borderRadius: 3, backgroundColor: Nocturne.progressTrack, overflow: 'hidden' },
  meterFill: { height: 6, borderRadius: 3, backgroundColor: Nocturne.accent ?? Nocturne.cta },
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
  tileSymbol: { width: TILE_ICON, height: TILE_ICON, borderRadius: TILE_ICON / 2 },
  symbolTile: {
    width: ICON,
    height: ICON,
    borderRadius: ICON / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
