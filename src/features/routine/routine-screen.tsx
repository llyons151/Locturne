'use no memo';
// Reads the App Group stores during render (routine, passes, limits…), which change outside
// React. The React Compiler would cache those reads from the first render (Home mounts under
// onboarding before a routine exists, and showed the defaults after), so it stays out here.

import { router, useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, AppState, Pressable, StyleSheet, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { Text } from '@/components/text';
import Animated, { FadeIn, LayoutAnimationConfig } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTabBarInset } from '@/components/app-tabs';
import { nightsLabel, type MenuOption } from '@/components/control-types';
import { MenuRow, NightsRow, TimeRow } from '@/components/controls';
import { Card, ChoiceRow, sym, ValueRow } from '@/components/grouped-list';
import { armIfPaid } from '@/hooks/use-app-start';
import * as haptic from '@/lib/haptics';
import { armRoutine, inPendingFirstNight, onLockChange, routineAt, syncLock } from '@/lib/lock-controller';
import { nightsAround } from '@/lib/lock-state';
import { MIN_WINDOW } from '@/lib/night-plan';
import { rescheduleNotifications } from '@/lib/notifications';
import {
  getPendingRoutine,
  getRoutine,
  hasRoutine,
  nightAt,
  saveRoutine,
  toLockSettings,
  type Routine as StoredRoutine,
  type WakeMethod,
} from '@/lib/routine';
import { getArmedNight, isScreenTimeAvailable } from '@/lib/screen-time';
import { getScanCode, getScanEditRefusal } from '@/lib/scan';
import { formatPreset, noOrphan } from '@/lib/text';
import {
  DisplayFont,
  Gap,
  italicOverhang,
  Nocturne,
  Radius,
  Space,
  Type,
  VoiceSize,
} from '@/theme';

import { NightDial } from './night-dial';
import { nightsToWeekdays, weekdaysToNights } from './nights';
import { pendingNote } from './starts-when';

/**
 * The Routine tab: how he gets woken up, then bedtime, morning start and which nights.
 *
 * The wake-up method leads the screen (DOWNSTAIRS_METHOD.md): it's the part of the routine
 * nobody else has, so it gets his line and a full list of choices, not a menu row.
 *
 * Every change waits for the next bedtime (GAME_PLAN, decided 2026-10-01), so nothing can
 * be loosened from bed. The screen shows what's set, and says plainly when it starts.
 * Because of that, edits apply as you make them, like Settings; there's no Save step.
 *
 * The routine is the shared one (`src/lib/routine.ts`). The screen edits what the person has
 * set: the pending edit if there is one, otherwise the routine in force. Each change is
 * saved at once, and `saveRoutine` holds it until the next bedtime.
 */

type Method = WakeMethod;

/** The screen's shape. Nights are Monday first, like onboarding's day picker (`nights.ts`). */
type Routine = {
  bedtime: number;
  morningStart: number;
  /** DayPicker's nights, Monday first: 0 is Monday night. */
  nights: number[];
  method: Method;
  stepGoal: number;
};

const fromStored = ({ activeNights, ...rest }: StoredRoutine): Routine => ({
  ...rest,
  nights: weekdaysToNights(activeNights),
});

const toStored = ({ nights, ...rest }: Routine): StoredRoutine => ({
  ...rest,
  activeNights: nightsToWeekdays(nights),
});

type Loaded = {
  /** What tonight runs on. */
  active: Routine;
  /** What the person has set. Becomes `active` at `from`. */
  saved: Routine;
  /** When `saved` takes over, or null when nothing is waiting. */
  from: Date | null;
};

function load(): Loaded {
  const now = new Date();
  const active = fromStored(getRoutine(now));
  const pending = getPendingRoutine(now);
  // An edit undone by hand leaves a pending copy of what's already running: nothing to say.
  if (!pending || same(fromStored(pending.routine), active)) return { active, saved: active, from: null };
  return { active, saved: fromStored(pending.routine), from: new Date(pending.from) };
}

/** Presets for the web preview's time wheel. On iPhone the system picker needs none. */
const BEDTIME_PRESETS = [22 * 60, 22 * 60 + 30, 23 * 60, 23 * 60 + 30];
const MORNING_PRESETS = [6 * 60 + 30, 7 * 60, 7 * 60 + 30, 8 * 60];

const STEP_GOALS: MenuOption<number>[] = [100, 200, 300, 500].map((n) => ({ value: n, label: `${n} steps` }));

/** Downstairs first: it's the hero method, and the default for anyone with stairs. */
const methods = (goal: number): { value: Method; title: string; detail: string; line: string }[] => [
  {
    value: 'downstairs',
    title: 'Go downstairs',
    detail: 'About one floor down. Takes 20 seconds and can’t be faked from bed.',
    line: 'Downstairs. Every morning. I’ll be at the bottom, judging.',
  },
  {
    value: 'steps',
    title: `Walk ${goal} steps`,
    detail: 'Counts from your morning start, even before you open the app.',
    line: `${goal} steps. I’ll count every one. Reluctantly.`,
  },
  {
    value: 'scan',
    title: 'Scan your code',
    detail: 'A code you keep in another room, like on the coffee machine.',
    line: 'Hide the code somewhere far. I’ll wait by it.',
  },
];

const same = (a: Routine, b: Routine) =>
  a.bedtime === b.bedtime &&
  a.morningStart === b.morningStart &&
  a.method === b.method &&
  a.stepGoal === b.stepGoal &&
  a.nights.join() === b.nights.join();

const SAME_TIME = "Bedtime and morning start can't be the same time.";
const TOO_SHORT = `Bedtime and morning start need ${MIN_WINDOW} minutes between them. iOS won't schedule a shorter night.`;

/** Why this night can't be saved: iOS won't run a window under `MIN_WINDOW`, so it would disarm. */
function nightRefusal(bedtime: number, morningStart: number): string | null {
  if (bedtime === morningStart) return SAME_TIME;
  return (morningStart - bedtime + 1440) % 1440 < MIN_WINDOW ? TOO_SHORT : null;
}

/**
 * The banner for a waiting edit: `pendingNote` for its first night as Home sees it
 * (`nightAt(from)`, the bedtime the apps really sleep at, or a night off), judged against the
 * night under the routine in force now, so one made from bed waits a day.
 */
const waitingNote = (from: Date, now: Date) =>
  pendingNote(nightAt(from, now), now, nightsAround(now, toLockSettings(routineAt(now))).latest);

export function RoutineScreen() {
  const insets = useSafeAreaInsets();
  const scroll = useRef<ScrollView>(null);
  const bottom = useTabBarInset();

  const [{ active, saved, from }, setLoaded] = useState<Loaded>(load);
  // Onboarding, or a bedtime passing, can change it while the tab is away, or while the app
  // sits in the background on this tab.
  useFocusEffect(useCallback(() => setLoaded(load()), []));
  // Home keeps the boundary timer alive while this tab is open: reload when it settles edits.
  useEffect(() => onLockChange(() => setLoaded(load())), []);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => state === 'active' && setLoaded(load()));
    return () => sub.remove();
  }, []);

  const commit = (next: Routine) => {
    // Onboarding can't be left before its setup is saved, so a routine exists by the time this
    // tab is reachable. Guarded anyway: a save here would be the first routine, and with one
    // saved onboarding never opens again (`useAppStart`).
    if (!hasRoutine()) return;
    const wasWaiting = from !== null;
    // Inside a waiting edit's early first night, that edit governs tonight: this one waits
    // for its next bedtime rather than handing tonight back to the old, later bedtime.
    const savedAt = new Date();
    saveRoutine(toStored(next), savedAt, inPendingFirstNight(savedAt));
    // The shield words the extension copies later (tonight's, the morning's) follow the saved
    // routine: rewrite them now, even when the windows stay as they are (`kept`).
    syncLock();
    const loaded = load();
    setLoaded(loaded);
    // The note appears above the control VoiceOver is on, and iOS has no live regions.
    if (loaded.from && !wasWaiting) {
      AccessibilityInfo.announceForAccessibility(waitingNote(loaded.from, new Date()));
    }
    // Every edit goes through here. `armRoutine` hands iOS the windows for the routine in
    // force at the next bedtime; if iOS refuses, the old windows stay and the next sync retries.
    // Nothing armed yet means nothing was bought yet (or the night was lost): only a
    // subscription arms it, or leaving onboarding at the paywall and saving here would lock
    // tonight for free.
    if (getArmedNight()) armRoutine().catch(() => {});
    else armIfPaid();
    rescheduleNotifications().catch(() => {});
  };
  const set = (patch: Partial<Routine>) => commit({ ...saved, ...patch });

  const options = methods(saved.stepGoal);
  // Scan picked with no code saved: the setup, offered only when it's allowed (not from bed).
  const offerCodeSetup = saved.method === 'scan' && !getScanCode() && !getScanEditRefusal();
  const chosen = options.find((o) => o.value === saved.method) ?? options[0];

  const now = new Date();

  // An earlier bedtime saved in the day governs its own first night once that starts (#137):
  // it already began, so don't say it waits for the old bedtime.
  const earlyNight = from !== null && inPendingFirstNight(now);
  const bannerNote = earlyNight
    ? `Your changes started at tonight’s new bedtime, ${formatPreset(saved.bedtime).replace(' ', '\u00a0')}.`
    : waitingNote(from ?? now, now);

  return (
    <ScrollView
      ref={scroll}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + Gap.pageTop, paddingBottom: bottom }]}
    >
      {/* The night on a 24-hour dial, as set (a waiting edit included), edited by dragging. */}
      <View style={styles.night}>
        <NightDial
          bedtime={saved.bedtime}
          morningStart={saved.morningStart}
          nightsLabel={saved.nights.length === 0 ? 'Every night off' : nightsLabel(saved.nights)}
          off={saved.nights.length === 0}
          onChange={(times) => set(times)}
          scrollRef={scroll}
        />
      </View>

      {from ? (
        <View style={styles.pending} accessibilityLiveRegion="polite">
          <SymbolView name={sym('clock', 'schedule')} size={17} tintColor={Nocturne.text} style={styles.pendingIcon} />
          <Text style={styles.pendingText}>
            {noOrphan(bannerNote)}
          </Text>
          <Pressable
            onPress={() => {
              haptic.tap();
              commit(active);
            }}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Undo changes"
          >
            <Text style={styles.undo}>Undo</Text>
          </Pressable>
        </View>
      ) : null}

      {/* His line fades when the method changes, not every time the tab opens. */}
      <LayoutAnimationConfig skipEntering>
        <Animated.View key={saved.method} entering={FadeIn.duration(400)} style={styles.wake}>
          <Text style={styles.voice} maxFontSizeMultiplier={1.3}>
            {noOrphan(chosen.line)}
          </Text>
        </Animated.View>
      </LayoutAnimationConfig>

      {/* The You tab's cards (iOS Display & Brightness): heading inside, rows without icons. */}
      <Card icon={sym('figure.stairs', 'stairs')} title="Wake-up" footer={wakeFooter(saved)}>
        {options.map((o) => (
          <ChoiceRow
            key={o.value}
            title={o.title}
            detail={o.detail}
            selected={o.value === saved.method}
            onPress={() => set({ method: o.value })}
          />
        ))}
        {offerCodeSetup ? (
          <ValueRow
            title="Set up your code"
            value=""
            onPress={() => router.push({ pathname: '/scan', params: { mode: 'setup' } })}
          />
        ) : null}
        <MenuRow
          title="Step target"
          value={saved.stepGoal}
          options={STEP_GOALS}
          onChange={(stepGoal) => set({ stepGoal })}
          last
        />
      </Card>

      <Card
        icon={sym('moon.fill', 'bedtime')}
        title="Night"
        footer="Changes start from the next bedtime, so nothing gets loosened from bed."
      >
        <TimeRow
          title="Bedtime"
          value={saved.bedtime}
          onChange={(bedtime) => set({ bedtime })}
          presets={BEDTIME_PRESETS}
          invalid={(m) => nightRefusal(m, saved.morningStart)}
        />
        <TimeRow
          title="Morning start"
          value={saved.morningStart}
          onChange={(morningStart) => set({ morningStart })}
          presets={MORNING_PRESETS}
          invalid={(m) => nightRefusal(saved.bedtime, m)}
        />
        <NightsRow value={saved.nights} onChange={(nights) => set({ nights })} last />
      </Card>

      {/* Off iPhone nothing can be armed, so never imply protection is on (GAME_PLAN, "Reliability"). */}
      {isScreenTimeAvailable() ? null : (
        <Text style={styles.preview}>Preview. Blocking needs Screen Time, which only iPhone has.</Text>
      )}
    </ScrollView>
  );
}

/** The steps fallback for the chosen method. */
function wakeFooter(r: Routine) {
  if (r.method === 'downstairs') return `No stairs that morning, like in a hotel? Walk ${r.stepGoal} steps instead.`;
  if (r.method === 'scan')
    return getScanCode()
      ? `Lost the code? Walk ${r.stepGoal} steps instead.`
      : `No code yet, so mornings are ${r.stepGoal} steps until you set one up. Not from bed: in the day.`;
  return 'Have stairs? Going down one floor is quicker, and harder to fake.';
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: Gap.gutter },
  night: { marginBottom: Gap.section },

  wake: { marginBottom: Gap.block },
  voice: {
    ...DisplayFont,
    ...italicOverhang(VoiceSize.aside + 6),
    color: Nocturne.text,
    fontSize: VoiceSize.aside + 6,
    lineHeight: (VoiceSize.aside + 6) * 1.1,
  },

  pending: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Space.m,
    padding: Space.l,
    marginBottom: Gap.section,
    borderRadius: Radius.card,
    borderCurve: 'continuous',
    backgroundColor: Nocturne.raised,
    borderWidth: 1,
    borderColor: Nocturne.edge,
  },
  // Centres the icon on the first line of text.
  pendingIcon: { marginTop: 2 },
  pendingText: { flex: 1, color: Nocturne.text, ...Type.secondary },
  undo: { color: Nocturne.text, fontSize: 15, fontWeight: '600', lineHeight: 20 },

  preview: { ...Type.caption, color: Nocturne.text3, textAlign: 'center' },
});
