import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTabBarInset } from '@/components/app-tabs';
import { Section, sym } from '@/components/grouped-list';
import { formatPreset } from '@/features/onboarding/time-wheel';
import * as haptic from '@/lib/haptics';
import { settingsTakeEffectAt } from '@/lib/lock-state';
import { noOrphan } from '@/lib/text';
import { DISPLAY_MAX_SCALE, DisplayFont, Gap, Nocturne, Radius, Space, Type } from '@/theme';

import type { MenuOption } from './control-types';
import { MenuRow, NightsRow, TimeRow } from './controls';

/**
 * The Routine tab: bedtime, morning start, which nights, and how he gets woken up.
 *
 * Every change waits for the next bedtime (GAME_PLAN, decided 2026-10-01), so nothing can
 * be loosened from bed. The screen shows what's set, and says plainly when it starts.
 * Because of that, edits apply as you make them, like Settings; there's no Save step.
 *
 * Design preview: placeholder values in local state, like Home. Nothing is saved or armed.
 */

type Method = 'downstairs' | 'steps' | 'scan';

type Routine = {
  bedtime: number;
  morningStart: number;
  /** DayPicker's nights, Monday first: 0 is Monday night. */
  nights: number[];
  method: Method;
  stepGoal: number;
};

const START: Routine = {
  bedtime: 23 * 60,
  morningStart: 7 * 60,
  nights: [0, 1, 2, 3, 4, 5, 6],
  method: 'downstairs',
  stepGoal: 200,
};

/** Presets for the web preview's time wheel. On iPhone the system picker needs none. */
const BEDTIME_PRESETS = [22 * 60, 22 * 60 + 30, 23 * 60, 23 * 60 + 30];
const MORNING_PRESETS = [6 * 60 + 30, 7 * 60, 7 * 60 + 30, 8 * 60];

const STEP_GOALS: MenuOption<number>[] = [100, 200, 300, 500].map((n) => ({ value: n, label: `${n} steps` }));

const methods = (goal: number): MenuOption<Method>[] => [
  { value: 'downstairs', label: 'Go downstairs' },
  { value: 'steps', label: `Walk ${goal} steps` },
  { value: 'scan', label: 'Scan your code' },
];

const same = (a: Routine, b: Routine) => JSON.stringify(a) === JSON.stringify(b);

const SAME_TIME = "Bedtime and morning start can't be the same time.";

/** "tonight at 11 pm", "tomorrow night at 11 pm". */
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
  if (night <= 0) return `tonight at ${time}`;
  if (night === 1) return `tomorrow night at ${time}`;
  return `${at.toLocaleDateString(undefined, { weekday: 'long' })} at ${time}`;
}

export function RoutineScreen() {
  const insets = useSafeAreaInsets();
  const bottom = useTabBarInset();

  /** What tonight runs on. Fixed in the preview; the real app swaps in `saved` at bedtime. */
  const active = START;
  /** What the user has set. Becomes `active` at the next bedtime. */
  const [saved, setSaved] = useState(START);
  const set = (patch: Partial<Routine>) => setSaved((r) => ({ ...r, ...patch }));

  const pending = !same(active, saved);
  const now = new Date();
  const effective = settingsTakeEffectAt(now, {
    bedtime: active.bedtime,
    morningStart: active.morningStart,
    stepGoal: active.stepGoal,
    activeNights: active.nights.map((d) => (d + 1) % 7),
    nightApps: [],
    alwaysApps: [],
  });

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

      {pending ? (
        <View style={styles.pending} accessibilityLiveRegion="polite">
          <SymbolView name={sym('clock', 'schedule')} size={17} tintColor={Nocturne.text} style={styles.pendingIcon} />
          <Text style={styles.pendingText}>
            {noOrphan(`Your changes start ${startsWhen(effective, now)}. Until then, tonight runs as it was.`)}
          </Text>
          <Pressable
            onPress={() => {
              haptic.tap();
              setSaved(active);
            }}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Undo changes"
          >
            <Text style={styles.undo}>Undo</Text>
          </Pressable>
        </View>
      ) : null}

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

      <Section label="Wake-up" footer={wakeFooter(saved)}>
        <MenuRow
          icon={sym('figure.stairs', 'stairs')}
          title="Method"
          value={saved.method}
          options={methods(saved.stepGoal)}
          onChange={(method) => set({ method })}
        />
        <MenuRow
          icon={sym('figure.walk', 'directions_walk')}
          title="Step target"
          value={saved.stepGoal}
          options={STEP_GOALS}
          onChange={(stepGoal) => set({ stepGoal })}
          last
        />
      </Section>

      {/* Preview only, so it never implies protection is on (GAME_PLAN, "Reliability"). */}
      <Text style={styles.preview}>Preview. These settings aren&apos;t saved or armed yet.</Text>
    </ScrollView>
  );
}

function wakeVerb(r: Routine) {
  if (r.method === 'downstairs') return 'get downstairs';
  if (r.method === 'scan') return 'scan your code';
  return `walk ${r.stepGoal} steps`;
}

/** What the chosen method asks of you, and the steps fallback. Menus can't hold this detail. */
function wakeFooter(r: Routine) {
  if (r.method === 'downstairs')
    return `Go about one floor down. No stairs that morning? Walk ${r.stepGoal} steps instead.`;
  if (r.method === 'scan')
    return `Scan a code you keep in another room, like on the coffee machine. Lost it? Walk ${r.stepGoal} steps instead.`;
  return 'Steps count from your morning start, including any you take before opening the app.';
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: Gap.gutter },
  header: { gap: Gap.headline, marginBottom: Gap.block },
  title: { ...DisplayFont, color: Nocturne.text, fontSize: 34, lineHeight: 37, letterSpacing: -0.3 },
  summary: { color: Nocturne.text2, ...Type.body },

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
