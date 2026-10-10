import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, View, type TextStyle } from 'react-native';

import { Text, TextInput } from '@/components/text';
import { sym } from '@/components/grouped-list';
import { closeSleepSheet, SHEET_PADDING } from '@/features/nap/sleep-sheet';
import { LIMIT_MAX } from '@/lib/daily-limits';
import * as haptic from '@/lib/haptics';
import { DisplayFont, Nocturne, Radius, Space, Type } from '@/theme';

import { LimitWheel } from './limit-wheel';

type LimitRequest = {
  /** The minutes the wheels start on, including a waiting looser edit. */
  start: number;
  /** What's saved now, so an unchanged Save saves nothing. */
  chosen: number | null;
  onChange: (minutes: number) => void;
  /** Deleting the limit, where the sheet offers it (the list page has its own button). */
  onRemove?: () => void;
  /**
   * The name row, where the limit can be named: what it's called now (blank for none), what it
   * goes by without one ("Instagram", "30 min a day"), and where a changed name is saved.
   */
  name?: { value: string; fallback: string; onRename: (name: string) => void };
  /** What's happening with it today: used up, or an edit waiting for bedtime. */
  note?: string | null;
  /**
   * The apps row's count ("3 picks"), what it opens once the sheet has gone, and the
   * apps' own icons drawn under it, as the Apps tab draws them on the limit's tile.
   */
  apps?: { summary: string; onEdit: () => void; icons?: ReactNode };
};

// The limit being edited. The edit lives with the Apps tab's state, so the route borrows its handlers.
let request: LimitRequest | null = null;

/** Opens the daily limit sheet (`app/limit.tsx`) for one limit. */
export function openLimitSheet(next: LimitRequest) {
  request = next;
  router.push('/limit');
}

/** Long enough for "Social and games", short enough for a tile's title. */
const NAME_MAX = 24;

/**
 * A daily limit in the Sleep sheet's floating card, laid out like Brick's Edit mode sheet
 * (user's reference, 2026-10-10) in Locturne's colours: a title with a round close button,
 * the limit's name to type over, one grouped card with the time per day (hour and minute wheels that set
 * any time) over the limit's apps, then Save and a quieter Delete. Opened from a limit's tile
 * on the Apps tab. Only Save saves, since a stricter limit starts at once; the close button
 * and a swipe down keep it as it was.
 */
export function LimitSheet() {
  const [req] = useState(() => request);
  const [minutes, setMinutes] = useState(() => req?.start ?? 30);
  const [name, setName] = useState(() => req?.name?.value ?? '');
  const total = Math.min(minutes, LIMIT_MAX);
  // Apple's picker can't open over this sheet, so editing the apps waits until it has gone.
  const afterClose = useRef<(() => void) | null>(null);

  // Opened with nothing to edit (a reload on the web preview): there's nothing to show.
  useEffect(() => {
    if (!req) closeSleepSheet();
  }, [req]);
  useEffect(() => () => afterClose.current?.(), []);
  if (!req) return null;
  const { apps } = req;

  const save = () => {
    haptic.done();
    // Named first, so the minutes' save keeps the new name.
    if (req.name && name.trim() !== req.name.value.trim()) req.name.onRename(name);
    if (total !== req.chosen) req.onChange(total);
    closeSleepSheet();
  };
  const { onRemove } = req;
  const remove = () => {
    haptic.tap();
    onRemove?.();
    closeSleepSheet();
  };
  // Asked first on a phone, like deleting an alarm; the web preview has no alert to ask with.
  const askRemove = () =>
    Platform.OS === 'web'
      ? remove()
      : Alert.alert('Delete this limit?', 'These apps stay awake all day again.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: remove },
        ]);

  return (
    <View style={styles.sheet}>
      <View style={styles.head}>
        <Text style={styles.title} accessibilityRole="header">
          Edit limit
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

      {req.name ? (
        <View style={styles.nameRow}>
          <Text style={styles.nameKey}>Name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={req.name.fallback}
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
      ) : null}

      <View style={styles.card}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Time per day</Text>
          <Text style={styles.sectionAbout}>{req.note ?? 'How long these apps stay awake. Resets at midnight.'}</Text>
          <LimitWheel value={minutes} onChange={setMinutes} />
        </View>
        {apps ? (
          <Pressable
            onPress={() => {
              haptic.tap();
              afterClose.current = apps.onEdit;
              closeSleepSheet();
            }}
            accessibilityRole="button"
            accessibilityLabel={`Apps, ${apps.summary}`}
            accessibilityHint="Opens the app picker"
            style={({ pressed }) => [styles.apps, pressed && styles.pressed]}
          >
            <View style={styles.appsRow}>
              <SymbolView name={sym('square.grid.2x2', 'apps')} size={15} tintColor={Nocturne.text2} />
              <Text style={styles.appsLabel}>Apps</Text>
              <Text style={styles.appsValue} numberOfLines={1}>
                {apps.summary}
              </Text>
              <SymbolView name={sym('chevron.right', 'chevron_right')} size={13} weight="semibold" tintColor={Nocturne.text3} />
            </View>
            {apps.icons ? <View style={styles.icons}>{apps.icons}</View> : null}
          </Pressable>
        ) : null}
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={save}
          disabled={total === 0}
          accessibilityRole="button"
          accessibilityState={{ disabled: total === 0 }}
          style={({ pressed }) => [styles.button, total === 0 && styles.disabled, pressed && styles.pressed]}
        >
          <Text style={styles.buttonLabel}>Save limit</Text>
        </Pressable>
        {onRemove ? (
          <Pressable
            onPress={askRemove}
            accessibilityRole="button"
            hitSlop={8}
            style={({ pressed }) => [styles.remove, pressed && styles.pressed]}
          >
            <Text style={styles.removeLabel}>Delete limit</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const CLOSE = 30;
/** The boxes are a light veil of the sheet's own glass, so they take its colour, not a flat grey. */
const FILL = 'rgba(255, 255, 255, 0.06)';

const styles = StyleSheet.create({
  // Sized to its contents inside the card, padded like the Sleep sheet.
  sheet: { paddingHorizontal: SHEET_PADDING, paddingTop: Space.m, gap: Space.m },
  // The title centred on the sheet, the close button over its right edge.
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
  // The whole rest of the row is the field, so a tap anywhere on it starts typing.
  nameValue: {
    ...Type.body,
    flex: 1,
    minWidth: 0,
    alignSelf: 'stretch',
    color: Nocturne.text,
    fontWeight: '500',
    textAlign: 'right',
    // The browser's focus ring; the caret shows where typing goes, as on a phone.
    ...Platform.select({ web: { outlineStyle: 'none' } as unknown as TextStyle }),
  },
  // One grouped card for the settings, its sections split by a hairline.
  card: {
    borderRadius: Radius.card,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Nocturne.edge,
    backgroundColor: FILL,
    overflow: 'hidden',
  },
  section: { padding: Space.l, paddingBottom: Space.s, gap: 2 },
  sectionTitle: { ...Type.body, color: Nocturne.text, fontWeight: '600' },
  sectionAbout: { ...Type.caption, color: Nocturne.text2, marginBottom: Space.xs },
  apps: {
    padding: Space.l,
    gap: Space.m,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Nocturne.line,
  },
  appsRow: { flexDirection: 'row', alignItems: 'center', gap: Space.s },
  appsLabel: { ...Type.body, color: Nocturne.text, fontWeight: '500' },
  appsValue: { ...Type.body, flex: 1, color: Nocturne.text2, textAlign: 'right' },
  icons: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.s },
  actions: { gap: Space.xs, marginTop: Space.s },
  button: {
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
    backgroundColor: Nocturne.cta,
  },
  buttonLabel: { color: Nocturne.onCta, fontSize: 17, fontWeight: '600' },
  disabled: { opacity: 0.4 },
  remove: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  // Quiet, as in the reference: the alert after it is where it turns red.
  removeLabel: { color: Nocturne.text2, fontSize: 17, fontWeight: '500' },
  pressed: { opacity: 0.7 },
});
