import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useEffect, useState, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, interpolate, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { GLASS_RADIUS, GlassCard } from '@/components/glass-card';
import { Text } from '@/components/text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import * as haptic from '@/lib/haptics';
import { Gap, Nocturne, Radius, Space, Type } from '@/theme';

/**
 * Settings-style grouped lists, as on the Apps tab: an uppercase label, one rounded group
 * of rows with hairlines between them, and an optional grey footer that explains it.
 */

export type Symbol = SymbolViewProps['name'];
export const sym = (ios: string, android: string): Symbol => ({ ios, android, web: android }) as Symbol;

const ROW_HEIGHT = 52;

export function Section({ label, footer, children }: { label?: string; footer?: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <GlassCard dark>{children}</GlassCard>
      {footer ? <Text style={styles.footer}>{footer}</Text> : null}
    </View>
  );
}

/**
 * A Settings card in the style of iOS's Display & Brightness: the heading sits inside the
 * card with its icon, the rows follow without icons of their own, and the grey note that
 * explains them closes the card instead of hanging under it.
 */
export function Card({
  icon,
  title,
  footer,
  warn,
  solid,
  style,
  children,
}: {
  /** Left out with `title` when the rows carry their own icons, as in a pick-one list. */
  icon?: Symbol;
  title?: string;
  footer?: string;
  /** An edge in grey instead of the hairline: something here needs fixing. */
  warn?: boolean;
  /** Home's "Tomorrow" pill's grey, mostly opaque, instead of smoked glass (the Routine tab's cards). */
  solid?: boolean;
  style?: object;
  children?: ReactNode;
}) {
  const Frame = solid ? SolidCard : GlassCard;
  return (
    <Frame dark rim={warn ? Nocturne.text2 : undefined} style={[styles.card, style]}>
      {icon && title ? (
        <View style={styles.cardHeader} accessible accessibilityRole="header">
          <SymbolView name={icon} size={15} weight="semibold" tintColor={Nocturne.accent ?? Nocturne.text} />
          <Text style={styles.cardTitle}>{title}</Text>
        </View>
      ) : null}
      {children}
      {footer ? <Text style={styles.cardFooter}>{footer}</Text> : null}
    </Frame>
  );
}

function SolidCard({ children, style, rim }: { children: ReactNode; style?: object; dark?: boolean; rim?: string }) {
  return <View style={[styles.solid, rim ? { borderWidth: StyleSheet.hairlineWidth, borderColor: rim } : null, style]}>{children}</View>;
}

/**
 * A row whose trailing side is a control (a native time button, a pull-down menu). The
 * control handles its own taps, so the row itself doesn't.
 */
export function ControlRow({
  icon,
  title,
  children,
  last,
}: {
  icon?: Symbol;
  title: string;
  children: ReactNode;
  last?: boolean;
}) {
  return (
    <View style={styles.row}>
      {icon ? <SymbolView name={icon} size={18} tintColor={Nocturne.text2} style={styles.icon} /> : null}
      <View style={[styles.rowBody, !last && styles.separator]}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        {children}
      </View>
    </View>
  );
}

/** One tappable row: icon, title, the current value in grey, and a chevron. */
export function ValueRow({
  icon,
  title,
  value,
  onPress,
  hint,
  last,
}: {
  /** Left out inside a `Card`, whose header carries the icon. */
  icon?: Symbol;
  title: string;
  value: string;
  onPress: () => void;
  /** VoiceOver's hint, only where it's true (an editor sheet). Most rows open a screen or page. */
  hint?: string;
  last?: boolean;
}) {
  return (
    <Pressable
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${value}`}
      accessibilityHint={hint}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      {icon ? <SymbolView name={icon} size={18} tintColor={Nocturne.text2} style={styles.icon} /> : null}
      <View style={[styles.rowBody, !last && styles.separator]}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.value} numberOfLines={2}>
          {value}
        </Text>
        <SymbolView name={sym('chevron.right', 'chevron_right')} size={13} weight="semibold" tintColor={Nocturne.text3} />
      </View>
    </Pressable>
  );
}

/**
 * A row in a pick-one list: title, a grey detail line, and a checkmark when chosen. Given an
 * icon, it takes the larger form: the icon on a rounded tile and a radio instead of the check.
 */
export function ChoiceRow({
  icon,
  title,
  detail,
  selected,
  onPress,
  last,
}: {
  icon?: Symbol;
  title: string;
  detail?: string;
  selected: boolean;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      style={({ pressed }) => [styles.choice, icon && styles.tileChoice, pressed && styles.rowPressed]}
    >
      {icon ? (
        // Every tile alike: the radio alone says which is picked (MoonPay's theme list,
        // docs/design-references/wake-methods).
        <View style={styles.tile}>
          <SymbolView name={icon} size={17} tintColor={Nocturne.text} />
        </View>
      ) : null}
      <View style={[styles.choiceBody, icon && styles.tileChoiceBody, !last && styles.separator]}>
        <View style={styles.choiceText}>
          <Text style={styles.title}>{title}</Text>
          {detail ? <Text style={styles.detail}>{detail}</Text> : null}
        </View>
        {icon ? (
          <SymbolView
            name={selected ? sym('largecircle.fill.circle', 'radio_button_checked') : sym('circle', 'radio_button_unchecked')}
            size={22}
            tintColor={selected ? Nocturne.text : Nocturne.text3}
          />
        ) : selected ? (
          <SymbolView name={sym('checkmark', 'check')} size={16} weight="semibold" tintColor={Nocturne.text} />
        ) : null}
      </View>
    </Pressable>
  );
}

/**
 * A bottom sheet with Cancel and Done, for editing one setting. The caller keeps the
 * draft; Cancel throws it away.
 */
export function EditSheet({
  open,
  title,
  onCancel,
  onDone,
  children,
}: {
  open: boolean;
  title: string;
  onCancel: () => void;
  onDone: () => void;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  // The dimming fades where it is while only the sheet slides (user, 2026-10-10: "the darkened
  // background drops with the popup ... it should just disappear"), so the Modal itself doesn't
  // animate; it stays up until the sheet is gone.
  const [mounted, setMounted] = useState(open);
  if (open && !mounted) setMounted(true);
  const shown = useSharedValue(0);
  useEffect(() => {
    shown.set(
      withTiming(open ? 1 : 0, { duration: open ? 320 : 220, easing: Easing.out(Easing.cubic) }, (finished) => {
        if (finished && !open) scheduleOnRN(setMounted, false);
      }),
    );
  }, [open, shown]);
  const scrim = useAnimatedStyle(() => ({ opacity: shown.value }));
  const sheet = useAnimatedStyle(() => ({ transform: [{ translateY: interpolate(shown.value, [0, 1], [height, 0]) }] }));
  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onCancel}>
      <Animated.View style={[styles.scrim, scrim]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} accessibilityLabel="Cancel" />
      </Animated.View>
      <Animated.View style={[styles.sheet, { paddingBottom: insets.bottom + Space.l }, sheet]}>
        <View style={styles.navBar}>
          <Pressable onPress={onCancel} hitSlop={8} accessibilityRole="button" style={styles.navButton}>
            <Text style={styles.navText}>Cancel</Text>
          </Pressable>
          <Text style={styles.navTitle} accessibilityRole="header">
            {title}
          </Text>
          <Pressable
            onPress={() => {
              haptic.done();
              onDone();
            }}
            hitSlop={8}
            accessibilityRole="button"
            style={[styles.navButton, styles.navRight]}
          >
            <Text style={[styles.navText, styles.navDone]}>Done</Text>
          </Pressable>
        </View>
        <ScrollView bounces={false} contentContainerStyle={styles.sheetContent}>
          {children}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: Gap.section },
  label: { ...Type.label, marginLeft: Space.l, marginBottom: Space.s },
  footer: { ...Type.caption, color: Nocturne.text2, marginHorizontal: Space.l, marginTop: Space.s },

  // Smoked glass, like the Apps tab's lists: the sky shows through instead of flat grey.
  card: { marginBottom: Space.l },
  // Home's "Tomorrow" pill's grey, but mostly opaque: its 10% white wash let too much sky
  // behind the rows, so only a hint shows through (user's ask, 2026-10-10).
  solid: {
    backgroundColor: 'rgba(40, 43, 54, 0.8)',
    borderRadius: GLASS_RADIUS,
    overflow: 'hidden',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Space.s, paddingHorizontal: Space.l, paddingTop: Space.l, paddingBottom: Space.xs },
  cardTitle: { color: Nocturne.text, fontSize: 15, fontWeight: '600' },
  cardFooter: { ...Type.caption, color: Nocturne.text2, paddingHorizontal: Space.l, paddingBottom: Space.l },

  row: { flexDirection: 'row', alignItems: 'center', paddingLeft: Space.l },
  rowPressed: { backgroundColor: Nocturne.frost },
  icon: { width: 22, marginRight: 14 },
  // The separator starts at the title, not the icon, as in Settings.
  rowBody: {
    flex: 1,
    minHeight: ROW_HEIGHT,
    // A title that wraps at large text sizes stays off the separator.
    paddingVertical: Space.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.s,
    paddingRight: Space.l,
  },
  separator: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Nocturne.edge },
  title: { flex: 1, color: Nocturne.text, fontSize: 17 },
  // Capped so a long value ("Nothing asleep") can't squeeze the title to a few letters; it
  // wraps instead of cutting a time at large text sizes.
  value: { color: Nocturne.text2, fontSize: 17, fontVariant: ['tabular-nums'], flexShrink: 1, maxWidth: '45%', textAlign: 'right' },

  choice: { paddingLeft: Space.l },
  choiceBody: {
    minHeight: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.m,
    paddingVertical: Space.m,
    paddingRight: Space.l,
  },
  choiceText: { flex: 1, gap: 2 },
  // The tile sits beside the text; the separator starts at the text, as in Settings.
  tileChoice: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  // Takes the row's remaining width, so the detail wraps instead of running off the card.
  tileChoiceBody: { flex: 1, paddingVertical: 9 },
  tile: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderCurve: 'continuous',
    // Frosted white, part of the glass, not a grey square on it.
    backgroundColor: Nocturne.frost,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detail: { ...Type.secondary, color: Nocturne.text2 },

  scrim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    marginTop: 'auto',
    maxHeight: '88%',
    backgroundColor: Nocturne.bg,
    borderTopLeftRadius: Radius.card,
    borderTopRightRadius: Radius.card,
    borderTopWidth: 1,
    borderColor: Nocturne.edge,
  },
  navBar: { height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: Space.l },
  navButton: { minWidth: 64, minHeight: 44, justifyContent: 'center' },
  navRight: { alignItems: 'flex-end' },
  navText: { color: Nocturne.text2, fontSize: 17 },
  navDone: { color: Nocturne.text, fontWeight: '600' },
  navTitle: { flex: 1, textAlign: 'center', color: Nocturne.text, fontSize: 17, fontWeight: '600' },
  sheetContent: { paddingHorizontal: Gap.gutter, paddingTop: Space.s, paddingBottom: Space.l, gap: Space.xl },
});
