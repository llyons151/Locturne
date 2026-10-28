import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useRef, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, View, type TextStyle } from 'react-native';

import { SwitchRow, TimeRow } from '@/components/controls';
import { DayStrip } from '@/components/day-strip';
import { sym } from '@/components/grouped-list';
import { Text, TextInput } from '@/components/text';
import { closeSleepSheet, SHEET_PADDING } from '@/features/nap/sleep-sheet';
import * as haptic from '@/lib/haptics';
import { blockAt, PRESETS, type ScheduleId } from '@/lib/schedules';
import { DisplayFont, Nocturne, Radius, Space, Type } from '@/theme';

import { saveSchedule, scheduleAsSet, type ScheduleDraft } from './schedule-actions';

type ScheduleRequest = {
  id: ScheduleId;
  /** A new schedule: the sheet opens on the presets, and its apps' page follows. */
  isNew: boolean;
  /** What the apps row says ("3 picks"), for one that exists. */
  apps?: string;
};

// The schedule being edited. The route borrows it, as the limit sheet does.
let request: ScheduleRequest | null = null;

/** Opens the schedule sheet (`app/schedule.tsx`). */
export function openScheduleSheet(next: ScheduleRequest) {
  request = next;
  router.push('/schedule');
}

/** iOS won't watch a block shorter than this (DeviceActivity's floor). */
const SHORTEST = 15;
const NAME_MAX = 24;

const blank = (): ScheduleDraft => {
  const custom = PRESETS[0];
  return { name: custom.name, start: custom.start, end: custom.end, days: custom.days };
};

/** Why the schedule can't be saved as it stands, or null. */
function problem(d: ScheduleDraft): string | null {
  if (d.days.length === 0) return 'Pick at least one day.';
  const length = (((d.end - d.start) % 1440) + 1440) % 1440;
  // Equal times would block the whole day, every day picked, with loosening waiting for days.
  if (!d.allDay && length === 0) return 'From and To are the same. Use All day for a whole day.';
  if (!d.allDay && length < SHORTEST) return 'A block needs at least 15 minutes.';
  return null;
}

/** Monday first, as the day circles store them; schedules keep `Date.getDay()`, Sunday first. */
const toStrip = (days: number[]) => days.map((d) => (d + 6) % 7);
const fromStrip = (days: number[]) => days.map((d) => (d + 1) % 7).sort((a, b) => a - b);

/**
 * An app schedule in the Sleep sheet's floating card, laid out like the daily limit sheet: a
 * title with a round close button, the presets for a new one (user's pick, 2026-10-14), its
 * name, one card with All day, From and To (Apple's time pickers) and the days, then Done and a
 * quieter Delete. It saves however it closes, Done, the close button or a swipe (user,
 * 2026-10-14: "it should just always automatically save"); a looser edit made while it's
 * blocking waits for the block's end (`editSchedule`). A new schedule's apps' page opens after.
 */
export function ScheduleSheet() {
  const [req] = useState(() => request);
  const [draft, setDraft] = useState<ScheduleDraft>(() => (req && !req.isNew && scheduleAsSet(req.id)) || blank());
  const [preset, setPreset] = useState<string | null>(req?.isNew ? PRESETS[0].key : null);
  const latest = useRef({ draft, deleted: false });
  useEffect(() => {
    latest.current.draft = draft;
  }, [draft]);
  const afterClose = useRef<(() => void) | null>(null);

  // Opened with nothing to edit (a reload on the web preview): there's nothing to show.
  useEffect(() => {
    if (!req) closeSleepSheet();
  }, [req]);
  // Saved as the sheet goes, whichever way it's closed, then the apps' page for a new one.
  useEffect(
    () => () => {
      if (!req) return;
      const { draft: last, deleted } = latest.current;
      if (deleted) saveSchedule(req.id, null);
      else if (!problem(last)) saveSchedule(req.id, last);
      afterClose.current?.();
    },
    [req],
  );
  if (!req) return null;

  const set = (patch: Partial<ScheduleDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const pickPreset = (key: string) => {
    const p = PRESETS.find((x) => x.key === key)!;
    haptic.tap();
    setPreset(key);
    setDraft({ name: p.name, start: p.start, end: p.end, days: p.days, ...(p.allDay ? { allDay: true } : {}) });
  };
  const wrong = problem(draft);
  const done = () => {
    haptic.done();
    if (req.isNew) afterClose.current = () => router.push({ pathname: '/list', params: { id: req.id } });
    closeSleepSheet();
  };
  const remove = () => {
    haptic.tap();
    latest.current.deleted = true;
    closeSleepSheet();
  };
  const askRemove = () => {
    if (Platform.OS === 'web') return remove();
    // Mid-block, a delete waits for the block's end (`editSchedule`).
    const saved = scheduleAsSet(req.id);
    const blocking = saved !== null && blockAt(saved, new Date()) !== null;
    const why = blocking ? 'It keeps its apps asleep until this block is over, then it’s gone.' : 'Its apps stay awake at these times again.';
    Alert.alert('Delete this schedule?', why, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: remove },
    ]);
  };
  const openApps = () => {
    haptic.tap();
    // Apple's picker can't open over this sheet: the apps' page opens once it has gone.
    afterClose.current = () => router.push({ pathname: '/list', params: { id: req.id } });
    closeSleepSheet();
  };

  return (
    <View style={styles.sheet}>
      <View style={styles.head}>
        <Text style={styles.title} accessibilityRole="header">
          {req.isNew ? 'New schedule' : 'Edit schedule'}
        </Text>
        <Pressable
          onPress={closeSleepSheet}
          accessibilityRole="button"
          accessibilityLabel="Close"
          hitSlop={8}
          style={({ pressed }) => [styles.close, pressed && styles.pressed]}
        >
          <SymbolView name={sym('xmark', 'close')} size={13} weight="bold" tintColor={Nocturne.text2} />
        </Pressable>
      </View>

      {req.isNew ? (
        <View style={styles.presets} accessibilityRole="radiogroup" accessibilityLabel="Start from">
          {PRESETS.map((p) => {
            const on = p.key === preset;
            return (
              <Pressable
                key={p.key}
                onPress={() => pickPreset(p.key)}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                accessibilityHint={p.about}
                style={({ pressed }) => [styles.preset, on && styles.presetOn, pressed && styles.pressed]}
              >
                <Text style={[styles.presetLabel, on && styles.presetLabelOn]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                  {p.name || 'Custom'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <View style={styles.nameRow}>
        <Text style={styles.nameKey}>Name</Text>
        <TextInput
          value={draft.name}
          onChangeText={(name) => set({ name })}
          placeholder="Schedule"
          placeholderTextColor={Nocturne.text3}
          maxLength={NAME_MAX}
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="done"
          selectionColor={Nocturne.text}
          accessibilityLabel="Name"
          style={styles.nameValue}
        />
      </View>

      <View style={styles.card}>
        <SwitchRow title="All day" value={!!draft.allDay} onChange={(allDay) => set({ allDay: allDay || undefined })} last={!!draft.allDay} />
        {draft.allDay ? null : (
          <>
            <TimeRow title="From" value={draft.start} onChange={(start) => set({ start })} immediate />
            <TimeRow title="To" value={draft.end} onChange={(end) => set({ end })} immediate last />
          </>
        )}
        <View style={styles.days}>
          <Text style={styles.daysLabel}>Repeat on</Text>
          <DayStrip value={toStrip(draft.days)} tonight={-1} days onChange={(days) => set({ days: fromStrip(days) })} />
        </View>
        {req.apps !== undefined ? (
          <Pressable
            onPress={openApps}
            accessibilityRole="button"
            accessibilityLabel={`Apps, ${req.apps}`}
            accessibilityHint="Opens the schedule's apps"
            style={({ pressed }) => [styles.apps, pressed && styles.pressed]}
          >
            <SymbolView name={sym('square.grid.2x2', 'apps')} size={15} tintColor={Nocturne.text2} />
            <Text style={styles.appsLabel}>Apps</Text>
            <Text style={styles.appsValue} numberOfLines={1}>
              {req.apps}
            </Text>
            <SymbolView name={sym('chevron.right', 'chevron_right')} size={13} weight="semibold" tintColor={Nocturne.text3} />
          </Pressable>
        ) : null}
      </View>
      {wrong ? <Text style={styles.problem}>{wrong}</Text> : null}

      <View style={styles.actions}>
        <Pressable
          onPress={done}
          disabled={!!wrong}
          accessibilityRole="button"
          accessibilityState={{ disabled: !!wrong }}
          style={({ pressed }) => [styles.button, wrong && styles.disabled, pressed && styles.pressed]}
        >
          <Text style={styles.buttonLabel}>{req.isNew ? 'Next: pick apps' : 'Done'}</Text>
        </Pressable>
        {req.isNew ? null : (
          <Pressable onPress={askRemove} accessibilityRole="button" hitSlop={8} style={({ pressed }) => [styles.remove, pressed && styles.pressed]}>
            <Text style={styles.removeLabel}>Delete schedule</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const CLOSE = 30;
/** The boxes are a light veil of the sheet's own glass, as in the limit sheet. */
const FILL = 'rgba(255, 255, 255, 0.06)';

const styles = StyleSheet.create({
  sheet: { paddingHorizontal: SHEET_PADDING, paddingTop: Space.m, gap: Space.m },
  head: { minHeight: CLOSE, alignItems: 'center', justifyContent: 'center' },
  title: { ...DisplayFont, color: Nocturne.text, fontSize: 19, lineHeight: 24, textAlign: 'center' },
  close: {
    position: 'absolute',
    right: 0,
    width: CLOSE,
    height: CLOSE,
    borderRadius: CLOSE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Nocturne.frost,
  },
  // The four share one row.
  presets: { flexDirection: 'row', gap: Space.s },
  preset: {
    flex: 1,
    minHeight: 36,
    paddingHorizontal: Space.xs,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderCurve: 'continuous',
    backgroundColor: FILL,
  },
  presetOn: { backgroundColor: 'rgba(255, 255, 255, 0.16)' },
  presetLabel: { ...Type.secondary, color: Nocturne.text2, fontWeight: '500' },
  presetLabelOn: { color: Nocturne.text, fontWeight: '600' },
  nameRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.m,
    paddingHorizontal: Space.l,
    borderRadius: 26,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Nocturne.edge,
    backgroundColor: FILL,
  },
  nameKey: { ...Type.body, color: Nocturne.text2 },
  nameValue: {
    ...Type.body,
    flex: 1,
    minWidth: 0,
    alignSelf: 'stretch',
    color: Nocturne.text,
    fontWeight: '500',
    textAlign: 'right',
    // A line height on a one-line field pushes its text down on iOS, below the "Name" beside it.
    lineHeight: undefined,
    ...Platform.select({ web: { outlineStyle: 'none' } as unknown as TextStyle }),
  },
  card: {
    borderRadius: Radius.card,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Nocturne.edge,
    backgroundColor: FILL,
    overflow: 'hidden',
  },
  days: { padding: Space.l, gap: Space.m, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Nocturne.line },
  daysLabel: { ...Type.body, color: Nocturne.text, fontWeight: '500' },
  apps: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.s,
    paddingHorizontal: Space.l,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Nocturne.line,
  },
  appsLabel: { ...Type.body, color: Nocturne.text, fontWeight: '500' },
  appsValue: { ...Type.body, flex: 1, color: Nocturne.text2, textAlign: 'right' },
  problem: { ...Type.caption, color: Nocturne.text2, textAlign: 'center' },
  actions: { gap: Space.xs, marginTop: Space.s },
  button: { minHeight: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 28, backgroundColor: Nocturne.cta },
  buttonLabel: { color: Nocturne.onCta, fontSize: 17, fontWeight: '600' },
  disabled: { opacity: 0.4 },
  remove: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  removeLabel: { color: Nocturne.text2, fontSize: 17, fontWeight: '500' },
  pressed: { opacity: 0.7 },
});
