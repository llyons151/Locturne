import { useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, LayoutAnimationConfig } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTabBarInset } from '@/components/app-tabs';
import { ChoiceRow, Section, sym } from '@/components/grouped-list';
import { formatPreset } from '@/features/onboarding/time-wheel';
import * as haptic from '@/lib/haptics';
import {
  getPendingRoutine,
  getRoutine,
  saveRoutine,
  type Routine as StoredRoutine,
  type WakeMethod,
} from '@/lib/routine';
import { isScreenTimeAvailable } from '@/lib/screen-time';
import { noOrphan } from '@/lib/text';
import {
  DISPLAY_MAX_SCALE,
  DisplayFont,
  Gap,
  italicOverhang,
  Nocturne,
  Radius,
  Space,
  Type,
  VoiceSize,
} from '@/theme';

import type { MenuOption } from './control-types';
import { MenuRow, NightsRow, TimeRow } from './controls';
import { nightsToWeekdays, weekdaysToNights } from './nights';

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

/** "from tonight's bedtime, 11 pm", "from tomorrow night at 11 pm", "from Friday at 11 pm". */
function startsWhen(at: Date, now: Date) {
  const days = Math.round(
    (new Date(at.getFullYear(), at.getMonth(), at.getDate()).getTime() -
      new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) /
      86_400_000,
  );
  // A no-break space keeps "11 pm" on one line.
  const time = formatPreset(at.getHours() * 60 + at.getMinutes()).replace(' ', ' ');
  // A bedtime after midnight belongs to the evening before it.
  const night = at.getHours() < 12 ? days - 1 : days;
  if (night <= 0) return `from tonight’s bedtime, ${time}`;
  if (night === 1) return `from tomorrow night at ${time}`;
  if (night < 7) return `from ${at.toLocaleDateString(undefined, { weekday: 'long' })} at ${time}`;
  return `from ${at.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })} at ${time}`;
}

export function RoutineScreen() {
  const insets = useSafeAreaInsets();
  const bottom = useTabBarInset();

  const [{ active, saved, from }, setLoaded] = useState<Loaded>(load);
  // Onboarding, or a bedtime passing, can change it while the tab is away.
  useFocusEffect(useCallback(() => setLoaded(load()), []));

  const commit = (next: Routine) => {
    saveRoutine(toStored(next));
    setLoaded(load());
    // TODO(armRoutine): re-arm the night windows for the new routine here, once
    // `armRoutine()` is merged. This is the one call site: every edit goes through `commit`.
  };
  const set = (patch: Partial<Routine>) => commit({ ...saved, ...patch });

  const options = methods(saved.stepGoal);
  const chosen = options.find((o) => o.value === saved.method) ?? options[0];

  const now = new Date();

  return (
    <ScrollView
      contentContainerStyle={[styles.content, { paddingTop: insets.top + Gap.pageTop, paddingBottom: bottom }]}
    >
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={DISPLAY_MAX_SCALE}>
          Routine
        </Text>
        <Text style={styles.summary}>
          {saved.nights.length === 0
            ? 'Every night is off. Only the always-asleep apps stay asleep.'
            : `Apps sleep at ${formatPreset(saved.bedtime)} and wake when you ${wakeVerb(saved)}.`}
        </Text>
      </View>

      {from ? (
        <View style={styles.pending} accessibilityLiveRegion="polite">
          <SymbolView name={sym('clock', 'schedule')} size={17} tintColor={Nocturne.text} style={styles.pendingIcon} />
          <Text style={styles.pendingText}>
            {noOrphan(`Your changes apply ${startsWhen(from, now)}. Until then, the old routine stays.`)}
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

      <Section label="Wake-up" footer={wakeFooter(saved)}>
        {options.map((o, i) => (
          <ChoiceRow
            key={o.value}
            title={o.title}
            detail={o.detail}
            selected={o.value === saved.method}
            onPress={() => set({ method: o.value })}
            last={i === options.length - 1}
          />
        ))}
      </Section>

      <Section>
        <MenuRow
          icon={sym('figure.walk', 'directions_walk')}
          title="Step target"
          value={saved.stepGoal}
          options={STEP_GOALS}
          onChange={(stepGoal) => set({ stepGoal })}
          last
        />
      </Section>

      <Section label="Night" footer="Changes start from the next bedtime, so nothing gets loosened from bed.">
        <TimeRow
          icon={sym('moon.fill', 'bedtime')}
          title="Bedtime"
          value={saved.bedtime}
          onChange={(bedtime) => set({ bedtime })}
          presets={BEDTIME_PRESETS}
          invalid={(m) => (m === saved.morningStart ? SAME_TIME : null)}
        />
        <TimeRow
          icon={sym('sunrise.fill', 'wb_twilight')}
          title="Morning start"
          value={saved.morningStart}
          onChange={(morningStart) => set({ morningStart })}
          presets={MORNING_PRESETS}
          invalid={(m) => (m === saved.bedtime ? SAME_TIME : null)}
        />
        <NightsRow icon={sym('calendar', 'calendar_month')} value={saved.nights} onChange={(nights) => set({ nights })} last />
      </Section>

      {/* Off iPhone nothing can be armed, so never imply protection is on (GAME_PLAN, "Reliability"). */}
      {isScreenTimeAvailable() ? null : (
        <Text style={styles.preview}>Preview. Blocking needs Screen Time, which only iPhone has.</Text>
      )}
    </ScrollView>
  );
}

function wakeVerb(r: Routine) {
  if (r.method === 'downstairs') return 'get downstairs';
  if (r.method === 'scan') return 'scan your code';
  return `walk ${r.stepGoal} steps`;
}

/** The steps fallback for the chosen method. */
function wakeFooter(r: Routine) {
  if (r.method === 'downstairs') return `No stairs that morning, like in a hotel? Walk ${r.stepGoal} steps instead.`;
  if (r.method === 'scan') return `Lost the code? Walk ${r.stepGoal} steps instead.`;
  return 'Have stairs? Going down one floor is quicker, and harder to fake.';
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: Gap.gutter },
  header: { gap: Gap.headline, marginBottom: Gap.block },
  title: { ...DisplayFont, color: Nocturne.text, fontSize: 34, lineHeight: 37, letterSpacing: -0.3 },
  summary: { color: Nocturne.text2, ...Type.body },

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
