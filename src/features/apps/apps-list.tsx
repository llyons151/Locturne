'use no memo';
// Reads the App Group stores during render (routine, passes, limits…), which change outside
// React. The React Compiler would cache those reads from the first render (Home mounts under
// onboarding before a routine exists, and showed the defaults after), so it stays out here.

import { router, useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/text';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlockedAppsView, isBlockedAppsViewAvailable, removePick, type RemovedPick } from 'blocked-apps';

import {
  AppTile,
  BrandIcon,
  SystemIcon,
  type BrandName,
  type SystemName,
} from '@/components/app-icons';
import { AddTile, AppPickerSheet } from '@/components/app-picker';
import { GlassCard } from '@/components/glass-card';
import { useTabBarInset } from '@/components/app-tabs';
import { sym } from '@/components/grouped-list';
import { Segmented } from '@/components/segmented';
import { ScreenTimePicker } from '@/components/screen-time-picker';
import { armIfPaid } from '@/hooks/use-app-start';
import { useTopOnLeave } from '@/hooks/use-top-on-leave';
import { useProtection } from '@/hooks/use-protection';
import {
  editLimit,
  freeLimitId,
  isLimitId,
  LIMIT_CHOICES,
  limitLabel,
  MAX_LIMITS,
  type DailyLimit,
  type LimitId,
} from '@/lib/daily-limits';
import { getNightPause, pauseWording } from '@/lib/emergency';
import * as haptic from '@/lib/haptics';
import { rescheduleNotifications } from '@/lib/notifications';
import { looserEditsStartAt, onLockChange, readLock } from '@/lib/lock-controller';
import {
  armLimit,
  beginListEdit,
  clearSelection,
  draftId,
  editedSelection,
  finishListEdit,
  getArmedNight,
  getLimits,
  isScreenTimeAvailable,
  isStoodDown,
  limitUsedUpToday,
  listChangeLandsAt,
  listChangeStarts,
  reapplyStandingBlocks,
  requestAccess,
  saveLimits,
  selectionSize,
  type SelectionId,
  type StandingList,
} from '@/lib/screen-time';
import { DISPLAY_MAX_SCALE, DisplayFont, Gap, Nocturne, Space, Type } from '@/theme';

import { APPS, type AppEntry } from './catalog';
import { LimitMenu } from './limit-menu';
import { isPickerSettling, settlePicker } from './picker-settle';
import { pauseNote, removalNote, startsLabel } from './pending-note';

/**
 * The Apps tab: a Bedtime / Daily limit switcher, + and Edit buttons top right, then the
 * state first and the list second (docs/UI_INSPIRATION.md): each list is a titled section with its count, whose rows are just icon and name, as in Settings. The
 * time isn't repeated on every row. Rows swipe to delete, as in any iOS list; removals
 * still wait for bedtime. The + and the cards' edit rows open Apple's FamilyActivityPicker.
 *
 * On an iPhone the rows are the real picks, drawn natively by `BlockedAppsView`. Off iOS
 * (the web preview) there is no Screen Time, so a stand-in list from `catalog.ts` shows
 * the same layout.
 */

const ICON = 36;
const ROW_PAD = 16;
const ROW_HEIGHT = 56;

type Tab = 'bedtime' | 'limit';
const TABS: { value: Tab; label: string }[] = [
  { value: 'bedtime', label: 'Bedtime' },
  { value: 'limit', label: 'Daily limit' },
];

export function AppsList() {
  return isScreenTimeAvailable() ? <LiveAppsList /> : <PreviewAppsList />;
}

const LIVE_GROUPS: { key: 'night' | 'always'; label: string; about: string }[] = [
  { key: 'night', label: 'Sleep at bedtime', about: 'Asleep from bedtime until your wake-up is done.' },
  { key: 'always', label: 'Always asleep', about: 'Asleep all day, every day.' },
];

/** The title: "Apps", centred. Adding and removing live in each list's own rows. */
function TitleRow() {
  return (
    <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={DISPLAY_MAX_SCALE}>
      Apps
    </Text>
  );
}

/**
 * One list: an optional title with its count (Mercury's and GitHub's section headers) and
 * a line saying what the list does, above a single rounded card, then any note.
 */
function ListCard({
  label,
  count,
  about,
  children,
  note,
}: {
  label?: string;
  count?: number;
  about?: string;
  children: ReactNode;
  note?: ReactNode;
}) {
  return (
    <View style={styles.section}>
      {label ? (
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle} accessibilityRole="header">
              {label}
            </Text>
            {count ? <Text style={styles.sectionCount}>{count}</Text> : null}
          </View>
          {about ? <Text style={styles.sectionAbout}>{about}</Text> : null}
        </View>
      ) : null}
      <GlassCard dark>{children}</GlassCard>
      {note}
    </View>
  );
}

/** "1 pick", "3 picks". A whole category is one pick: iOS won't say how many apps it holds. */
const countPicks = (n: number) => (n === 1 ? '1 pick' : `${n} picks`);

/**
 * Removals wait for bedtime (GAME_PLAN), so say when, and whether they're asleep until then.
 * Limits say it in their header instead.
 */
function PendingNote({ list }: { list: 'night' | 'always' }) {
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

function LiveAppsList() {
  const insets = useSafeAreaInsets();
  const bottom = useTabBarInset();
  const scroll = useRef<ScrollView>(null);
  useTopOnLeave(scroll);

  // Not just the cached access flag: iOS keeps reporting "approved" after a revoke.
  const [protection, recheckProtection] = useProtection();
  const [editing, setEditing] = useState<StandingList | null>(null);
  const [tab, setTab] = useState<Tab>('bedtime');
  // Bumped whenever the picks may have changed, so counts and native rows re-read them.
  const [revision, setRevision] = useState(0);
  const [limits, setLimits] = useState(getLimits);
  const refresh = useCallback(() => {
    recheckProtection();
    setLimits(getLimits());
    setRevision((r) => r + 1);
  }, [recheckProtection]);

  // Onboarding or the Screen Time lab can change the picks while this tab is hidden.
  useFocusEffect(refresh);
  // And after each sync: settling limits on return awaits iOS per limit, so the rows read on
  // `active` can be one step behind (a used-up mark not yet forgotten, or a re-fire just in).
  useEffect(() => onLockChange(() => refresh()), [refresh]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => state === 'active' && refresh());
    return () => sub.remove();
  }, [refresh]);

  const sizes = useMemo(
    // The lists as last chosen, a waiting change included (`editedSelection`).
    () => ({ night: editedSelection('night'), always: editedSelection('always') }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-read on every revision
    [revision],
  );

  const [limitError, setLimitError] = useState<string | null>(null);
  const armingLimits = useRef(new Set<LimitId>());

  const saveAndArm = async (next: DailyLimit[], arm?: DailyLimit) => {
    setLimitError(null);
    // Saved before arming: iOS can report a tightened limit as used up the moment it's armed,
    // and the extension judges that against the saved minutes (a stale-threshold check), so
    // the old, looser number must already be gone.
    const before = getLimits().find((l) => l.id === arm?.id);
    saveLimits(next);
    setLimits(next);
    if (arm) {
      armingLimits.current.add(arm.id);
      try {
        await armLimit(arm);
      } catch {
        // Never imply a limit is on when iOS refused it (GAME_PLAN, "Reliability"): this one
        // goes back to what iOS is still enforcing, on disk and on screen. Only this one: an
        // edit to another limit may have landed meanwhile.
        // In place, so the rows keep their order.
        const reverted = before
          ? getLimits().map((l) => (l.id === arm.id ? before : l))
          : getLimits().filter((l) => l.id !== arm.id);
        saveLimits(reverted);
        setLimits(reverted);
        setLimitError("iOS wouldn't start that limit. Try again in a moment.");
        return;
      } finally {
        armingLimits.current.delete(arm.id);
      }
    }
    setLimits(getLimits());
  };

  /** Stricter edits start now; looser ones wait for bedtime (`editLimit`). */
  const setMinutes = (id: LimitId, minutes: number | null) => {
    haptic.tap();
    if (armingLimits.current.has(id) || isPickerSettling(id)) {
      setLimitError("Still saving this limit. Try again in a moment.");
      return;
    }
    const now = new Date();
    const current = getLimits();
    const next = editLimit(current, id, minutes, looserEditsStartAt(now), now);
    const after = next.find((l) => l.id === id);
    const before = current.find((l) => l.id === id);
    saveAndArm(next, after && after.minutes !== before?.minutes ? after : undefined);
  };

  /**
   * Apple's picker closed on a list's draft. Added apps join now; removed ones wait for
   * bedtime (`finishListEdit`). Newly added apps may need shielding straight away.
   */
  const pickedList = (list: StandingList) => {
    finishListEdit(list, looserEditsStartAt(new Date(), list));
    if (isLimitId(list)) pickedLimit(list);
    reapplyStandingBlocks();
    // An empty bedtime list left the night unarmed (`armIfPaid` skips it): arm it now, as the
    // Routine tab's save does, or the apps just added stay awake until Locturne is reopened.
    if (list === 'night' && !getArmedNight()) armIfPaid();
    // Tonight's bedtime warning and the morning note only come when apps will sleep: re-plan
    // them for the list as it stands at bedtime (an emptied or refilled list changes that).
    if (list === 'night') rescheduleNotifications().catch(() => {});
    refresh();
  };

  // A limit's list changed: a new limit starts at 30 minutes; an existing one is re-armed,
  // because iOS keeps its own copy of the picks.
  const pickedLimit = (id: LimitId) => {
    const current = getLimits();
    const existing = current.find((l) => l.id === id);
    if (existing) return saveAndArm(current, existing);
    if (selectionSize(id) === 0) return clearSelection(id);
    const created: DailyLimit = { id, minutes: 30 };
    saveAndArm([...current, created], created);
  };

  /** Opens Apple's picker on a draft of the list. Only here, never on render. */
  const edit = async (list: StandingList) => {
    haptic.tap();
    // Onboarding always gets access, so this is only a revoke (or a stale first launch):
    // ask again first, since Apple's picker needs it.
    if (protection !== 'on' && !(await askAccess())) return;
    if (isPickerSettling(list) || (isLimitId(list) && armingLimits.current.has(list))) {
      setLimitError("Still saving this limit. Try again in a moment.");
      return;
    }
    beginListEdit(list);
    setEditing(list);
  };

  const addLimit = () => {
    const id = freeLimitId(getLimits());
    if (id) edit(id);
  };

  /**
   * A row swiped away (or deleted in Edit mode). The same path as the picker: the draft
   * loses the pick, then `pickedList` saves it, so the removal still waits for bedtime.
   */
  const removed = (list: StandingList, pick: RemovedPick) => {
    haptic.tap();
    if (isPickerSettling(list) || (isLimitId(list) && armingLimits.current.has(list))) {
      setLimitError('Still saving this limit. Try again in a moment.');
      refresh();
      return;
    }
    beginListEdit(list);
    if (!removePick(draftId(list), pick)) {
      refresh();
      return;
    }
    pickedList(list);
  };

  // The repair path when protection is off: once access is back, put the shields back.
  const askAccess = async (): Promise<boolean> => {
    setLimitError(null);
    try {
      if ((await requestAccess()) !== 'approved') throw new Error('refused');
      reapplyStandingBlocks();
      return true;
    } catch {
      setLimitError("Screen Time access wasn't turned on. You can try again when you're ready.");
      return false;
    } finally {
      refresh();
    }
  };
  const allow = () => {
    haptic.tap();
    askAccess();
  };

  // Onboarding can't be finished without access, so the page is always the finished one.
  // Only a revoke in Settings (`off`) adds the row to turn it back on.
  const revoked = protection === 'off';
  // No subscription: picks and limits are kept, but nothing sleeps (standDown).
  const unpaid = !revoked && isStoodDown();

  return (
    <>
      <ScrollView
        ref={scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + Gap.pageTop, paddingBottom: bottom }]}
      >
        <View style={styles.header}>
          <TitleRow />
          {unpaid || revoked ? (
            <Text style={styles.summary}>
              {unpaid
                ? 'No subscription, so nothing here sleeps. Your picks and limits are kept for when you’re back.'
                : 'Screen Time access is off, so nothing is asleep. Turn it back on to put them to sleep again.'}
            </Text>
          ) : null}
          <Segmented value={tab} options={TABS} onChange={setTab} label="Which apps" />
        </View>

        {revoked ? (
          <ListCard note={limitError ? <Text style={styles.footer}>{limitError}</Text> : null}>
            <EditRow label="Turn Screen Time access back on" onPress={allow} />
          </ListCard>
        ) : null}
        {unpaid ? (
          <ListCard>
            <EditRow label="See plans" onPress={() => router.push('/onboarding?resume=paywall')} />
          </ListCard>
        ) : null}

        {tab === 'bedtime' &&
          LIVE_GROUPS.map((group) => {
            const size = sizes[group.key].size;
            return (
              <ListCard
                key={group.key}
                label={group.label}
                count={size}
                about={group.about}
                note={<PendingNote list={group.key} />}
              >
                <EditRow
                  label={size ? 'Add or remove apps' : 'Add apps'}
                  onPress={() => edit(group.key)}
                  divided={size > 0}
                />
                {size > 0 && !isBlockedAppsViewAvailable && (
                  // A build from before modules/blocked-apps existed can't draw the rows.
                  <View style={[styles.rowBody, styles.separator, styles.note]}>
                    <Text style={styles.noteText}>{countPicks(size)}. Install the latest build to see them.</Text>
                  </View>
                )}
                {isBlockedAppsViewAvailable && (
                  <PickedRows
                    selectionId={sizes[group.key].id}
                    count={size}
                    revision={revision}
                    editing={false}
                    onRemove={(pick) => removed(group.key, pick)}
                  />
                )}
              </ListCard>
            );
          })}

        {tab === 'limit' && (
          <View style={styles.section}>
            {limits.map((limit) => {
              const usedUp = limitUsedUpToday(limit.id);
              return (
                <ListCard key={limit.id}>
                  <LimitHeader
                    limit={limit}
                    usedUp={usedUp}
                    appsChangeAt={listChangeStarts(limit.id)}
                    onChange={(m) => setMinutes(limit.id, m)}
                    onRemove={() => setMinutes(limit.id, null)}
                  />
                  <EditRow label="Add or remove apps" onPress={() => edit(limit.id)} divided={editedSelection(limit.id).size > 0} />
                  {isBlockedAppsViewAvailable && (
                    <PickedRows
                      selectionId={editedSelection(limit.id).id}
                      count={editedSelection(limit.id).size}
                      revision={revision}
                      editing={false}
                      onRemove={(pick) => removed(limit.id, pick)}
                    />
                  )}
                </ListCard>
              );
            })}
            {freeLimitId(limits) ? (
              <ListCard>
                <EditRow label="Add a limit" onPress={addLimit} />
              </ListCard>
            ) : null}
          </View>
        )}
        {/* Both tabs: the bedtime lists can fail to save or need access too. */}
        {!revoked && limitError ? <Text style={styles.footer}>{limitError}</Text> : null}
      </ScrollView>

      {editing && (
        <ScreenTimePicker
          // A draft of the list, so removals can wait for bedtime (`beginListEdit`).
          list={draftId(editing)}
          // The library saves the new picks 0.1s after Done (a debounce), so refreshing on
          // close alone reads the old list. It reports once the save lands; refresh then.
          onPicked={refresh}
          onClose={() => {
            const closed = editing;
            setEditing(null);
            refresh();
            // In case the picker unmounts before its report arrives.
            settlePicker(closed, () => pickedList(closed));
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
function PickedRows({
  selectionId,
  count,
  revision,
  editing,
  onRemove,
}: {
  selectionId: SelectionId;
  count: number;
  revision: number;
  editing: boolean;
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
        editing={editing}
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
 * A limit's first row: the time per day as a menu, and what's happening with it today.
 * The used-up and waiting states are spelled out, never implied (GAME_PLAN, "Reliability").
 */
function LimitHeader({
  limit,
  usedUp,
  appsChangeAt,
  onChange,
  onRemove,
}: {
  limit: Pick<DailyLimit, 'minutes' | 'pending'>;
  usedUp: boolean;
  /** When apps removed from this limit leave it. */
  appsChangeAt?: Date | null;
  onChange: (minutes: number) => void;
  onRemove: () => void;
}) {
  const { pending } = limit;
  // Used up comes first: it's why the apps are asleep right now, whatever waits for bedtime.
  const parts: string[] = [];
  if (usedUp) parts.push('Used up today. Back at midnight.');
  // `from` is the next bedtime, or midnight with nothing armed (`looserEditsStartAt`): name it.
  const when = pending ? startsLabel(new Date(pending.from), new Date()) : '';
  // Applied by the app (`settleLimitChanges`), so on the first open after then.
  if (pending?.minutes === null) parts.push(`Ends ${when}, when you next open Locturne.`);
  else if (pending) parts.push(`Goes up to ${limitLabel(pending.minutes)} ${when}, when you next open Locturne.`);
  let status: string | null = parts.length ? parts.join(' ') : null;
  if (appsChangeAt) {
    // The app applies a limit's removals (with iOS's count), so on the first open after that time.
    const leave = `Removed apps leave ${startsLabel(appsChangeAt, new Date()).replace(/^at /, 'after ')}, when you next open Locturne.`;
    status = status ? `${status} ${leave}` : leave;
  }

  return (
    <View style={styles.row}>
      <View style={[styles.symbolTile, styles.limitTile]}>
        <SymbolView name={{ ios: 'hourglass', android: 'hourglass_empty', web: 'hourglass_empty' }} size={ICON * 0.56} tintColor="#FFFFFF" />
      </View>
      <View style={[styles.rowBody, styles.separator]}>
        <View style={styles.limitText}>
          <Text style={styles.rowLabel} numberOfLines={1}>
            Time per day
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

const GROUPS: { key: Group; label: string; about: string; picker: string }[] = [
  {
    key: 'bedtime',
    label: 'Sleep at bedtime',
    about: LIVE_GROUPS[0].about,
    picker: 'Pick the apps that keep you up. They sleep at bedtime and wake after your walk.',
  },
  {
    key: 'always',
    label: 'Always asleep',
    about: LIVE_GROUPS[1].about,
    picker: 'Pick the apps you never want to open. They stay asleep all day and night.',
  },
];

const byName = new Map(APPS.map((app) => [app.name, app]));
const initial = (group: Group) =>
  APPS.filter((app) => app.rule === group)
    .map((app) => app.name)
    .sort((a, b) => a.localeCompare(b));

function PreviewAppsList() {
  const insets = useSafeAreaInsets();
  const bottom = useTabBarInset();
  const scroll = useRef<ScrollView>(null);
  useTopOnLeave(scroll);

  const [picks, setPicks] = useState<Record<Group, string[]>>(() => ({
    bedtime: initial('bedtime'),
    always: initial('always'),
  }));
  const [editing, setEditing] = useState<Group | null>(null);
  const [tab, setTab] = useState<Tab>('bedtime');
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
        ref={scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + Gap.pageTop, paddingBottom: bottom }]}
      >
        <View style={styles.header}>
          <TitleRow />
          <Segmented value={tab} options={TABS} onChange={setTab} label="Which apps" />
        </View>

        {tab === 'bedtime' &&
          GROUPS.map((group) => {
            const apps = picks[group.key];
            return (
              <ListCard key={group.key} label={group.label} count={apps.length} about={group.about}>
                <EditRow
                  label={apps.length ? 'Add or remove apps' : 'Add apps'}
                  onPress={() => {
                    haptic.tap();
                    setEditing(group.key);
                  }}
                  divided={apps.length > 0}
                />
                {apps.map((name, i) => (
                  <AppRow
                    key={name}
                    name={name}
                    last={i === apps.length - 1}
                  />
                ))}
              </ListCard>
            );
          })}

        {tab === 'limit' && (
          <View style={styles.section}>
            {limits.map((limit, index) => (
              <ListCard key={index}>
                <LimitHeader
                  limit={limit}
                  usedUp={false}
                  onChange={(minutes) => setLimits((ls) => ls.map((l, i) => (i === index ? { ...l, minutes } : l)))}
                  onRemove={() => setLimits((ls) => ls.filter((_, i) => i !== index))}
                />
                <EditRow
                  label="Add or remove apps"
                  onPress={() => {
                    haptic.tap();
                    setEditingLimit(index);
                  }}
                  divided
                />
                {limit.apps.map((name, i) => (
                  <AppRow
                    key={name}
                    name={name}
                    last={i === limit.apps.length - 1}
                  />
                ))}
              </ListCard>
            ))}
            {limits.length < MAX_LIMITS ? (
              <ListCard>
                <EditRow
                  label="Add a limit"
                  onPress={() => {
                    haptic.tap();
                    setEditingLimit(limits.length);
                  }}
                />
              </ListCard>
            ) : null}
          </View>
        )}
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

/** The web preview's version of the native `detailed` rows. */
function AppRow({
  name,
  last,
  onRemove,
}: {
  name: string;
  /** The card's last row: no separator under it, as in Settings. */
  last: boolean;
  /** Edit mode: iOS's red delete button before the icon. */
  onRemove?: () => void;
}) {
  const app = byName.get(name);
  return (
    <View style={styles.row}>
      {onRemove ? (
        <Pressable onPress={onRemove} accessibilityRole="button" accessibilityLabel={`Remove ${name}`} hitSlop={8}>
          <SymbolView name={sym('minus.circle.fill', 'do_not_disturb_on')} size={22} tintColor="#FF3B30" />
        </Pressable>
      ) : null}
      <View style={styles.roundIcon}>
        {app ? <AppIconView app={app} /> : <AppTile name={name} size={ICON} />}
        <View style={styles.iconRing} pointerEvents="none" />
      </View>
      <View style={[styles.rowBody, !last && styles.separator]} accessible accessibilityLabel={name}>
        <Text style={[styles.rowLabel, styles.flex]} numberOfLines={1}>
          {name}
        </Text>
      </View>
    </View>
  );
}

/**
 * The first row of each list, so adding or removing apps is never below the fold (user's
 * ask, October 8, 2026). `divided` draws the separator above the rows that follow.
 */
function EditRow({ label, onPress, divided }: { label: string; onPress: () => void; divided?: boolean }) {
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
  content: { paddingHorizontal: Gap.gutter },
  header: { gap: Gap.headline, marginBottom: Gap.block },
  title: { ...DisplayFont, color: Nocturne.text, fontSize: 34, lineHeight: 37, letterSpacing: -0.3, textAlign: 'center' },
  summary: { color: Nocturne.text2, ...Type.body },

  section: { marginBottom: Gap.section },
  sectionHeader: { gap: 2, marginHorizontal: Space.xs, marginBottom: Space.m },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'baseline', gap: Space.s },
  sectionTitle: { color: Nocturne.text, fontSize: 20, lineHeight: 25, fontWeight: '600', letterSpacing: -0.2 },
  sectionCount: { color: Nocturne.text3, fontSize: 17, fontWeight: '500', fontVariant: ['tabular-nums'] },
  sectionAbout: { ...Type.caption, color: Nocturne.text2 },

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
  limitText: { flex: 1, paddingVertical: Space.s },
  limitStatus: { ...Type.caption, color: Nocturne.text2 },
  footer: { ...Type.caption, color: Nocturne.text2, marginHorizontal: Space.l, marginTop: Space.s },
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
  note: { paddingLeft: ROW_PAD },
  noteText: { flex: 1, color: Nocturne.text2, ...Type.body },
  symbolTile: {
    width: ICON,
    height: ICON,
    borderRadius: ICON / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
