'use no memo';
// Reads the App Group stores during render (routine, passes, limits…), which change outside
// React. The React Compiler would cache those reads from the first render (Home mounts under
// onboarding before a routine exists, and showed the defaults after), so it stays out here.

import { router, useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Alert, AppState, Pressable, StyleSheet, View } from 'react-native';
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
import { nightsAround, wallClock } from '@/lib/lock-state';
import {
  getPendingRoutine,
  getRoutine,
  pushupGoalOf,
  toLockSettings,
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
import { fromWeekday, nightsToWeekdays, weekdaysToNights } from './nights';
import { applyRoutineEdit, ASLEEP_NOTE, routineEditRefusal, sleepsAtOnce } from './apply-edit';
import { pendingLine } from './pending-line';
import { ShadowLoc } from './shadow-loc';

/** Loc in the dark beside the dial (shadow-loc.tsx). Off for now (user, 2026-10-14). */
const SHADOW_LOC = false;

/**
 * The Routine tab: how he gets woken up, then bedtime, morning start and which nights.
 *
 * The wake-up method leads the screen (DOWNSTAIRS_METHOD.md): it's the part of the routine
 * nobody else has, so it gets a heading and a full list of choices, not a menu row.
 *
 * Awake, every change applies at once, like Settings; there's no Save step. While the apps are
 * asleep (a held night, or a morning not yet proven) the controls are locked, so nothing can be
 * loosened from bed (user, 2026-10-15, replacing "every change waits for the next bedtime",
 * which kept a banner up for a day after an edit made just past bedtime). A change that would
 * put the apps to sleep this moment asks first.
 *
 * The routine is the shared one (`src/lib/routine.ts`). The screen edits what the person has
 * set: an edit still waiting from before (the banner, with Undo) if there is one, otherwise the
 * routine in force.
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

/**
 * Which night VoiceOver calls "tonight", Monday first: the night in progress under the routine
 * tonight runs on, or else the next one. After midnight that's still the evening before's.
 */
function tonightOf(routine: Routine, now: Date): number {
  const { latest, next } = nightsAround(now, toLockSettings(toStored(routine)));
  const night = now < latest.end ? latest : next;
  // Named after its evening (nights.ts): the day before the morning it leads into.
  return fromWeekday(wallClock(night.end, 0, -1).getDay());
}

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

  // Bumped to put the dial back where the routine is, after a change that was turned down.
  const [dialKey, setDialKey] = useState(0);
  const commit = (next: Routine) => {
    if (routineEditRefusal()) {
      haptic.thud();
      setLoaded(load());
      setDialKey((k) => k + 1);
      return;
    }
    // With nothing saved yet (onboarding left by its Exit) the tab shows the default routine,
    // and the first edit is saved over it as the first routine. It used to stay unsaved on the
    // tab, so switching tabs threw it away (user, 2026-10-13: "it still needs to save").
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
  const set = (patch: Partial<Routine>) => {
    const next = { ...load().saved, ...patch };
    const moved = sleepsAtOnce(toStored(next));
    if (!moved) return commit(next);
    // Its night has already begun (a bedtime moved before now, a morning moved past now): say
    // so before the apps sleep.
    const why = moved === 'morning'
      ? 'Your new wake-up time hasn’t come yet, so your apps sleep until then.'
      : 'Your new bedtime has already passed, so tonight starts now.';
    Alert.alert('This puts your apps to sleep now', why, [
      { text: 'Cancel', style: 'cancel', onPress: () => setDialKey((k) => k + 1) },
      { text: 'Sleep now', onPress: () => commit(next) },
    ]);
  };

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
  // While the apps are asleep the routine is locked (`routineEditRefusal`).
  const asleep = routineEditRefusal(now) !== null;

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
        {SHADOW_LOC ? <ShadowLoc visit={visit} titleWidth={titleWidth} /> : null}
        <Text
          style={styles.title}
          onLayout={(e) => setTitleWidth(e.nativeEvent.layout.width)}
          accessibilityRole="header"
          maxFontSizeMultiplier={DISPLAY_MAX_SCALE}
        >
          Routine
        </Text>
        <View pointerEvents={asleep ? 'none' : 'auto'} style={asleep && styles.locked} accessibilityState={{ disabled: asleep }}>
        <NightDial
          key={dialKey}
          bedtime={saved.bedtime}
          morningStart={saved.morningStart}
          nightsLabel={saved.nights.length === 0 ? 'Every night off' : nightsLabel(saved.nights)}
          off={saved.nights.length === 0}
          onChange={edited((times: { bedtime: number; morningStart: number }) => set(times))}
          scrollRef={scroll}
        />
        </View>
      </View>

      {/* The nights in a card like the methods', so the screen's controls share one surface. */}
      <Card style={[styles.daysCard, asleep && styles.locked]}>
        <View style={styles.days} pointerEvents={asleep ? 'none' : 'auto'}>
          <Text style={styles.daysLabel} maxFontSizeMultiplier={1.4}>
            Repeat on
          </Text>
          <DayStrip
            value={saved.nights}
            tonight={tonightOf(active, now)}
            onChange={edited((nights: number[]) => set({ nights }))}
          />
        </View>
      </Card>
      {asleep ? (
        <GlassCard dark style={styles.pendingCard}>
          <View style={styles.pending}>
            <SymbolView name={sym('moon.zzz.fill', 'bedtime')} size={17} tintColor={Nocturne.text} style={styles.pendingIcon} />
            <Text style={styles.pendingText}>{noOrphan(ASLEEP_NOTE)}</Text>
          </View>
        </GlassCard>
      ) : null}
      {hintSeen || asleep ? null : (
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
      <Animated.View style={[styles.methods, fade, asleep && styles.locked]} pointerEvents={asleep ? 'none' : 'auto'}>
      <Card>
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
  // Eight Sleep's "Repeat on" card (user's reference, 2026-10-13): a small label over the row.
  daysCard: { borderRadius: 22 },
  days: { paddingHorizontal: Space.m, paddingTop: Space.m, paddingBottom: Space.m, gap: Space.m },
  daysLabel: { ...APP_FONT, ...Type.secondary, color: Nocturne.text, paddingHorizontal: Space.xs },
  // Home's headline ("Bedtime in 3h 28m"): large and light (user's ask, October 9, 2026).
  title: { ...APP_FONT, color: Nocturne.text, fontSize: 38, lineHeight: 44, fontWeight: '300', letterSpacing: -0.6, textAlign: 'center', alignSelf: 'center' },

  // A section label under the one page title, not a second title (centred, user's preference).
  // Home's line under the headline, and Loc's quieter line under that.
  // Card to heading matches the gap between the dial and the nights' card.
  section: { ...APP_FONT, ...Type.body, color: Nocturne.text2, textAlign: 'center', marginTop: Space.s, marginBottom: Space.m },
  // Under the nights' card, like a card footer.
  hint: { ...APP_FONT, ...Type.secondary, color: Nocturne.text3, textAlign: 'center', marginTop: -Space.s, marginBottom: Space.l },

  pendingCard: { marginBottom: Gap.section },
  // The controls while the apps are asleep: still readable, plainly not for touching.
  locked: { opacity: 0.45 },
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
