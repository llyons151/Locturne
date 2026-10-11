'use no memo';
// Reads the App Group stores during render (routine, passes, limits…), which change outside
// React. The React Compiler would cache those reads from the first render (Home mounts under
// onboarding before a routine exists, and showed the defaults after), so it stays out here.

import { router, useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, AppState, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { ScrollView } from 'react-native-gesture-handler';
import { Text } from '@/components/text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { nightsLabel } from '@/components/control-types';
import { DayStrip } from '@/components/day-strip';
import { GlassCard } from '@/components/glass-card';
import { Card, ChoiceRow, sym, ValueRow, type Symbol } from '@/components/grouped-list';
import { useTabSelected } from '@/hooks/use-tab-selected';
import { useTopOnLeave } from '@/hooks/use-top-on-leave';
import * as haptic from '@/lib/haptics';
import { onLockChange } from '@/lib/lock-controller';
import {
  getPendingRoutine,
  getRoutine,
  pushupGoalOf,
  type Routine as StoredRoutine,
  type WakeMethod,
} from '@/lib/routine';
import { getMorningPlace, getPlaceEditRefusal } from '@/lib/place';
import { getScanCode, getScanEditRefusal } from '@/lib/scan';
import { methodInUse } from '@/lib/scan-code';
import { sharedGet, sharedSet } from '@/lib/screen-time';
import { formatPreset, noOrphan } from '@/lib/text';
import {
  DISPLAY_MAX_SCALE,
  APP_FONT,
  Gap,
  Nocturne,
  Space,
  Type,
} from '@/theme';

import { NightDial } from './night-dial';
import { nightsToWeekdays, weekdaysToNights } from './nights';
import { applyRoutineEdit } from './apply-edit';
import { pendingLine } from './pending-line';
import { ShadowLoc } from './shadow-loc';

/**
 * The Routine tab: how he gets woken up, then bedtime, morning start and which nights.
 *
 * The wake-up method leads the screen (DOWNSTAIRS_METHOD.md): it's the part of the routine
 * nobody else has, so it gets a heading and a full list of choices, not a menu row.
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

const HINT_SEEN = 'locturne.dialHintSeen';

/** The screen's shape. Nights are Monday first, like onboarding's day picker (`nights.ts`). */
type Routine = {
  bedtime: number;
  morningStart: number;
  /** DayPicker's nights, Monday first: 0 is Monday night. */
  nights: number[];
  method: Method;
  stepGoal: number;
  pushupGoal?: number;
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

/** Steps first: it's the default, and works in any home (user's ask, 2026-10-10). */
const methods = (
  goal: number,
  place: string | null,
  reps: number,
  wake: number,
): { value: Method; icon: Symbol; title: string; detail: string }[] => [
  {
    value: 'steps',
    icon: sym('figure.walk', 'directions_walk'),
    title: `Walk ${goal} steps`,
    detail: `From ${formatPreset(wake)} · Recommended`,
  },
  {
    value: 'downstairs',
    icon: sym('figure.stairs', 'stairs'),
    title: 'Go downstairs',
    detail: 'One floor',
  },
  {
    value: 'scan',
    icon: sym('barcode.viewfinder', 'barcode_scanner'),
    title: 'Scan a code',
    detail: 'A code in another room',
  },
  {
    value: 'place',
    icon: sym('mappin.and.ellipse', 'location_on'),
    title: 'Get to a place',
    detail: place ?? 'The gym, campus, the café',
  },
  {
    value: 'pushups',
    icon: sym('figure.strengthtraining.functional', 'fitness_center'),
    title: `Do ${reps} push-ups`,
    detail: 'The camera counts them',
  },
];

const same = (a: Routine, b: Routine) =>
  a.bedtime === b.bedtime &&
  a.morningStart === b.morningStart &&
  a.method === b.method &&
  a.stepGoal === b.stepGoal &&
  pushupGoalOf(a) === pushupGoalOf(b) &&
  a.nights.join() === b.nights.join();

export function RoutineScreen() {
  const insets = useSafeAreaInsets();
  const scroll = useRef<ScrollView>(null);
  useTopOnLeave(scroll);
  const reduced = useReducedMotion();

  /** The wake-up card fades in each time the tab is picked. */
  const shown = useSharedValue(1);
  const fade = useAnimatedStyle(() => ({ opacity: shown.value }));
  // On the tab being picked, not on focus: a sheet opened over the page leaves it alone.
  const selected = useTabSelected();
  useEffect(() => {
    if (!selected || reduced) return;
    shown.set(0);
    shown.set(withTiming(1, { duration: 300 }));
  }, [selected, reduced, shown]);

  const [{ active, saved, from }, setLoaded] = useState<Loaded>(load);
  // Onboarding, or a bedtime passing, can change it while the tab is away, or while the app
  // sits in the background on this tab.
  useFocusEffect(useCallback(() => setLoaded(load()), []));
  // TESTING (user, October 10, 2026): Loc in the dark plays on every visit while it's tried out.
  const [visit, setVisit] = useState(0);
  const [titleWidth, setTitleWidth] = useState(0);
  useFocusEffect(useCallback(() => setVisit((n) => n + 1), []));
  // Home keeps the boundary timer alive while this tab is open: reload when it settles edits.
  useEffect(() => onLockChange(() => setLoaded(load())), []);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => state === 'active' && setLoaded(load()));
    return () => sub.remove();
  }, []);

  const commit = (next: Routine) => {
    const wasWaiting = load().from !== null;
    const armed = applyRoutineEdit(toStored(next));
    const loaded = load();
    setLoaded(loaded);
    // The note appears above the control VoiceOver is on, and iOS has no live regions. Said in
    // the banner's words once arming settles: an earlier bedtime whose night has begun shields
    // at once, and the bare waiting note would still name the old bedtime.
    if (loaded.from !== null && !wasWaiting)
      armed.finally(() => {
        const latest = load();
        if (latest.from) AccessibilityInfo.announceForAccessibility(pendingLine(latest.from, latest.saved.bedtime, new Date()));
      });
  };
  // From the store, not this render's `saved`: leaving the app mid-edit saves both time rows in
  // one AppState event, before React renders again, and the second would undo the first.
  const set = (patch: Partial<Routine>) => commit({ ...load().saved, ...patch });

  const place = getMorningPlace();
  const reps = pushupGoalOf(saved);
  const options = methods(saved.stepGoal, place?.name ?? null, reps, saved.morningStart);
  // A scan with no code, or a place with none picked, wakes with steps until it's set up (as
  // Home's "Tomorrow" says), so the picked row says so rather than looking like it's in force.
  const fallsBack = methodInUse(saved.method) !== saved.method;
  // The dial's how-to, until the first change (user's ask, October 9, 2026).
  const [hintSeen, setHintSeen] = useState(() => sharedGet<boolean>(HINT_SEEN) === true);
  const edited = <T,>(apply: (value: T) => void) => (value: T) => {
    if (!hintSeen) {
      sharedSet(HINT_SEEN, true);
      setHintSeen(true);
    }
    apply(value);
  };
  // Push-ups picked: how many. Like every routine edit, a change waits for bedtime while armed.
  const offerReps = saved.method === 'pushups';
  // Scan picked with no code saved: the setup, offered only when it's allowed (not from bed).
  const offerCodeSetup = saved.method === 'scan' && !getScanCode() && !getScanEditRefusal();
  // Place picked: pick one, or change it, only while it's allowed (not from bed).
  const offerPlaceSetup = saved.method === 'place' && !getPlaceEditRefusal();
  const setupRow = offerCodeSetup || offerPlaceSetup || offerReps;
  // "Get to a place" with no place yet: straight to the picker, which selects it once one is
  // saved. Closing it leaves the routine alone, so nobody ends up on a place they don't have.
  const pick = (method: Method) => {
    if (method === 'place' && saved.method !== 'place' && !place && !getPlaceEditRefusal()) {
      haptic.tap();
      router.push({ pathname: '/place-pick', params: { select: '1' } });
      return;
    }
    set({ method });
  };

  const now = new Date();

  // An earlier bedtime saved in the day governs its own first night once that starts (#137).
  const bannerNote = pendingLine(from ?? now, saved.bedtime, now);

  return (
    <ScrollView
      ref={scroll}
      // Scrolled to the end, the card sits a gutter above the panel's edge, as at its sides.
      contentContainerStyle={[styles.content, { paddingTop: insets.top + Gap.pageTop, paddingBottom: Gap.gutter }]}
    >
      {/* The night on a 24-hour dial, as set (a waiting edit included), edited by dragging. */}
      <View style={styles.night}>
        <ShadowLoc visit={visit} titleWidth={titleWidth} />
        <Text
          style={styles.title}
          onLayout={(e) => setTitleWidth(e.nativeEvent.layout.width)}
          accessibilityRole="header"
          maxFontSizeMultiplier={DISPLAY_MAX_SCALE}
        >
          Routine
        </Text>
        <NightDial
          bedtime={saved.bedtime}
          morningStart={saved.morningStart}
          nightsLabel={saved.nights.length === 0 ? 'Every night off' : nightsLabel(saved.nights)}
          off={saved.nights.length === 0}
          onChange={edited((times: { bedtime: number; morningStart: number }) => set(times))}
          scrollRef={scroll}
        />
      </View>

      {/* The nights in the methods' card, so the screen's controls share one edge and surface. */}
      <Card solid style={styles.daysCard}>
        <View style={styles.days}>
          <DayStrip value={saved.nights} onChange={edited((nights: number[]) => set({ nights }))} />
        </View>
      </Card>
      {hintSeen ? null : (
        <Text style={styles.hint}>
          {noOrphan('Drag the moon or sun. Tap a day to skip it.')}
        </Text>
      )}

      {from ? (
        <GlassCard dark style={styles.pendingCard}>
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
        </GlassCard>
      ) : null}

      <Text style={styles.section} accessibilityRole="header" maxFontSizeMultiplier={1.3}>
        How you get up
      </Text>

      {/* The heading sits above the card, so the card has none; each method carries its own icon. */}
      <Animated.View style={[styles.methods, fade]}>
      <Card solid>
        {options.map((o, i) => (
          <ChoiceRow
            key={o.value}
            icon={o.icon}
            last={i === options.length - 1 && !setupRow}
            title={o.title}
            detail={o.value === saved.method && fallsBack ? `Not set up yet, so ${saved.stepGoal} steps for now` : o.detail}
            selected={o.value === saved.method}
            onPress={() => pick(o.value)}
          />
        ))}
        {offerCodeSetup ? (
          <ValueRow
            title="Set up your code"
            value=""
            onPress={() => router.push({ pathname: '/scan', params: { mode: 'setup' } })}
            last
          />
        ) : null}
        {offerPlaceSetup ? (
          <ValueRow
            title={place ? 'Change your place' : 'Pick your place'}
            value=""
            onPress={() => router.push('/place-pick')}
            last
          />
        ) : null}
        {offerReps ? (
          // A wheel in the floating sheet: any count, not a short menu (user's ask, 2026-10-10).
          <ValueRow title="Push-ups" value={`${reps}`} onPress={() => router.push('/pushups')} last />
        ) : null}
      </Card>
      </Animated.View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: Gap.gutter },
  // Cancels the card's own bottom margin, so only the gutter is left under it.
  methods: { marginBottom: -Space.l },
  night: { marginBottom: Space.l, gap: Space.m },
  // Fully round ends, like Home's "Tomorrow" pill.
  daysCard: { borderRadius: 999 },
  days: { paddingHorizontal: Space.m, paddingVertical: Space.s },
  // Home's headline ("Bedtime in 3h 28m"): large and light (user's ask, October 9, 2026).
  title: { ...APP_FONT, color: Nocturne.text, fontSize: 38, lineHeight: 44, fontWeight: '300', letterSpacing: -0.6, textAlign: 'center', alignSelf: 'center' },

  // A section label under the one page title, not a second title (centred, user's preference).
  // Home's line under the headline, and Loc's quieter line under that.
  // Card to heading matches the gap between the dial and the nights' card.
  section: { ...APP_FONT, ...Type.body, color: Nocturne.text2, textAlign: 'center', marginTop: Space.s, marginBottom: Space.m },
  // Under the nights' card, like a card footer.
  hint: { ...APP_FONT, ...Type.secondary, color: Nocturne.text3, textAlign: 'center', marginTop: -Space.s, marginBottom: Space.l },

  pendingCard: { marginBottom: Gap.section },
  pending: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Space.m,
    padding: Space.l,
  },
  // Centres the icon on the first line of text.
  pendingIcon: { marginTop: 2 },
  pendingText: { flex: 1, color: Nocturne.text, ...Type.secondary },
  undo: { color: Nocturne.text, fontSize: 15, fontWeight: '600', lineHeight: 20 },

});
