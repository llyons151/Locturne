import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import * as haptic from '@/lib/haptics';
import { Nocturne, Radius, Space, Type } from '@/theme';

import { AppTile } from './app-icons';
import { Reveal } from './motion';

/**
 * The app-picking step, shaped like the real flow so Apple's picker drops in later:
 * a card that opens the picker as a sheet, then the picks as a row of icons.
 *
 * Every Screen Time blocker we could check (ScreenZen, Opal, one sec, StepTok) uses
 * Apple's FamilyActivityPicker, whose look can't be changed, and gets back tokens it can
 * only draw as icons. So the preview sheet copies Apple's picker (a grouped list of
 * categories with check circles and disclosure arrows) in iOS system colours, and the
 * card only ever shows icons and counts. See docs/APP_PICKER_RESEARCH.md.
 */

/** Preview categories, in the picker's order. An empty list is a category picked whole. */
const CATEGORIES: { name: string; symbol: string; apps: string[] }[] = [
  { name: 'Social', symbol: 'bubble.left.and.bubble.right.fill', apps: ['Instagram', 'Snapchat', 'X', 'Reddit'] },
  { name: 'Entertainment', symbol: 'popcorn.fill', apps: ['TikTok', 'YouTube', 'Netflix'] },
  { name: 'Games', symbol: 'gamecontroller.fill', apps: [] },
];

/** Every pickable entry: single apps, plus categories picked whole. */
const ALL = CATEGORIES.flatMap((c) => (c.apps.length ? c.apps : [c.name]));
const isCategory = (entry: string) => CATEGORIES.some((c) => c.name === entry && c.apps.length === 0);

/** Must match the text passed to the real picker's headerText and footerText. */
const HEADER = 'Pick the apps that keep you up. They sleep at bedtime and wake after your walk.';
const FOOTER = 'Preview. The real app shows Apple’s picker, with the apps actually on your phone.';

/** "5 apps, 1 category", the way the real card will count tokens. */
export function pickedSummary(apps: string[]): string {
  const categories = apps.filter(isCategory).length;
  const singles = apps.length - categories;
  const parts = [];
  if (singles) parts.push(`${singles} app${singles === 1 ? '' : 's'}`);
  if (categories) parts.push(`${categories} categor${categories === 1 ? 'y' : 'ies'}`);
  return parts.join(', ');
}

const ROW_ICON = 32;

/** A white "+" tile: the card's tap-me cue, sized like the app icons beside it. */
export function AddTile({ size }: { size: number }) {
  return (
    <View style={[styles.add, { width: size, height: size, borderRadius: size * 0.225 }]}>
      <SymbolView name={{ ios: 'plus', android: 'add', web: 'add' }} size={size * 0.46} weight="semibold" tintColor="#000000" />
    </View>
  );
}

function Chevron() {
  return (
    <SymbolView
      name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
      size={15}
      weight="semibold"
      tintColor={Nocturne.text2}
    />
  );
}

/**
 * The card on the page. Empty, it reads as a button: a white "+" tile, "Add apps" and a
 * chevron. Once apps are picked, it becomes a list of them, ending in "Add or remove apps".
 * On short phones pass a smaller `maxRows`; extra picks fold into a "+N more" row.
 */
/** Key for the "+N more" tile when registering icon views: hidden picks fly out of it. */
export const MORE_TILE = '__more';

export function AppsCard({
  apps,
  onOpen,
  maxRows = 6,
  onIconRef,
}: {
  apps: string[];
  onOpen: () => void;
  maxRows?: number;
  /** Receives each icon's view, so the sleep animation can start from where the icons are. */
  onIconRef?: (app: string, view: View | null) => void;
}) {
  const picked = apps.length > 0;
  const press = () => {
    haptic.tap();
    onOpen();
  };

  if (!picked) {
    return (
      <Reveal>
        <Pressable
          onPress={press}
          accessibilityRole="button"
          accessibilityLabel="Add apps"
          style={({ pressed }) => [styles.card, styles.emptyCard, pressed && styles.pressed]}
        >
          <AddTile size={52} />
          <View style={styles.emptyText}>
            <Text style={styles.cardTitle}>Add apps</Text>
            <Text style={styles.cardSub}>TikTok, Instagram, games…</Text>
          </View>
          <Chevron />
        </Pressable>
      </Reveal>
    );
  }

  // Picked: an iOS grouped list, one row per pick. The real app draws the same rows with
  // Label(token), which shows each app's icon and name.
  const rows = apps.length > maxRows ? apps.slice(0, maxRows - 1) : apps;
  const hidden = apps.length - rows.length;
  return (
    <Reveal>
      <Text style={styles.listHeader}>{pickedSummary(apps).toUpperCase()}</Text>
      <View style={styles.list}>
        {rows.map((app) => (
          <View key={app} style={styles.listRow}>
            <View ref={(view) => onIconRef?.(app, view)} collapsable={false}>
              <AppTile name={app} size={ROW_ICON} />
            </View>
            <Text style={styles.listLabel} numberOfLines={1}>
              {app}
            </Text>
            {isCategory(app) ? <Text style={styles.listNote}>Category</Text> : null}
          </View>
        ))}
        {hidden > 0 ? (
          <View style={styles.listRow}>
            <View
              ref={(view) => onIconRef?.(MORE_TILE, view)}
              collapsable={false}
              style={[styles.more, { width: ROW_ICON, height: ROW_ICON, borderRadius: ROW_ICON * 0.225 }]}
            >
              <Text style={styles.moreText}>+{hidden}</Text>
            </View>
            <Text style={styles.listLabel}>{hidden} more</Text>
          </View>
        ) : null}
        <Pressable
          onPress={press}
          accessibilityRole="button"
          accessibilityLabel="Add or remove apps"
          style={({ pressed }) => [styles.listRow, styles.lastRow, pressed && styles.rowPressed]}
        >
          <AddTile size={ROW_ICON} />
          <Text style={[styles.listLabel, styles.addLabel]}>Add or remove apps</Text>
          <Chevron />
        </Pressable>
      </View>
    </Reveal>
  );
}

/**
 * A stand-in for Apple's picker sheet. Changes apply on Done; Cancel throws them away,
 * as the real sheet does.
 */
export function AppPickerSheet({
  open,
  apps,
  onDone,
  onClose,
  header = HEADER,
}: {
  open: boolean;
  apps: string[];
  onDone: (apps: string[]) => void;
  onClose: () => void;
  /** The line above the list. The real picker takes the same text as headerText. */
  header?: string;
}) {
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState(apps);
  const [expanded, setExpanded] = useState<string | null>('Social');
  // Start from the saved picks each time it opens.
  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (open) setDraft(apps);
  }

  const has = (entry: string) => draft.includes(entry);
  const toggle = (entries: string[]) => {
    haptic.tap();
    const all = entries.every(has);
    setDraft(all ? draft.filter((e) => !entries.includes(e)) : [...draft, ...entries.filter((e) => !has(e))]);
  };

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.scrim} />
      <View style={[styles.sheet, { marginTop: insets.top + 12 }]}>
        <View style={styles.navBar}>
          <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button" style={styles.navButton}>
            <Text style={styles.navText}>Cancel</Text>
          </Pressable>
          <Text style={styles.navTitle} accessibilityRole="header">
            Choose Activities
          </Text>
          <Pressable
            onPress={() => onDone(draft)}
            hitSlop={8}
            accessibilityRole="button"
            style={[styles.navButton, styles.navRight]}
          >
            <Text style={[styles.navText, styles.navDone]}>Done</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
          <Text style={styles.groupText}>{header}</Text>
          <View style={styles.search}>
            <SymbolView name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }} size={16} tintColor={Sys.label2} />
            <Text style={styles.searchText}>Search</Text>
          </View>

          <View style={styles.group}>
            <Row
              label="All Apps & Categories"
              checked={ALL.every(has)}
              partial={draft.length > 0}
              onCheck={() => toggle(ALL)}
            />
            {CATEGORIES.map((category) => {
              const entries = category.apps.length ? category.apps : [category.name];
              const open = expanded === category.name;
              return (
                <View key={category.name}>
                  <Row
                    label={category.name}
                    symbol={category.symbol}
                    checked={entries.every(has)}
                    partial={entries.some(has)}
                    onCheck={() => toggle(entries)}
                    expandable={category.apps.length > 0}
                    expanded={open}
                    onExpand={() => setExpanded(open ? null : category.name)}
                  />
                  {open
                    ? category.apps.map((app) => (
                        <Row key={app} label={app} app={app} indent checked={has(app)} onCheck={() => toggle([app])} />
                      ))
                    : null}
                </View>
              );
            })}
          </View>
          <Text style={styles.groupText}>{FOOTER}</Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

function Row({
  label,
  symbol,
  app,
  checked,
  partial,
  indent,
  onCheck,
  expandable,
  expanded,
  onExpand,
}: {
  label: string;
  symbol?: string;
  app?: string;
  checked: boolean;
  partial?: boolean;
  indent?: boolean;
  onCheck: () => void;
  expandable?: boolean;
  expanded?: boolean;
  onExpand?: () => void;
}) {
  return (
    <View style={[styles.row, indent && styles.rowIndent]}>
      <Pressable
        onPress={onCheck}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: checked ? true : partial ? 'mixed' : false }}
        accessibilityLabel={label}
        style={styles.rowMain}
      >
        <SymbolView
          name={
            checked
              ? { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }
              : partial
                ? { ios: 'minus.circle.fill', android: 'remove_circle', web: 'remove_circle' }
                : { ios: 'circle', android: 'radio_button_unchecked', web: 'radio_button_unchecked' }
          }
          size={22}
          tintColor={checked || partial ? Sys.tint : Sys.label3}
        />
        {app ? <AppTile name={app} size={29} /> : null}
        {symbol ? (
          <View style={styles.categoryIcon}>
            <SymbolView name={{ ios: symbol as never, android: 'apps', web: 'apps' }} size={15} tintColor="#FFFFFF" />
          </View>
        ) : null}
        <Text style={styles.rowLabel} numberOfLines={1}>
          {label}
        </Text>
      </Pressable>
      {expandable ? (
        <Pressable
          onPress={onExpand}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`${expanded ? 'Hide' : 'Show'} ${label} apps`}
          style={styles.disclosure}
        >
          <SymbolView
            name={{ ios: expanded ? 'chevron.down' : 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
            size={13}
            tintColor={Sys.label3}
          />
        </Pressable>
      ) : null}
    </View>
  );
}

/** iOS dark-mode system colours, so the stand-in looks like Apple's sheet, not ours. */
const Sys = {
  sheet: '#1C1C1E',
  cell: '#2C2C2E',
  fill: 'rgba(118,118,128,0.24)',
  separator: 'rgba(84,84,88,0.65)',
  label: '#FFFFFF',
  label2: 'rgba(235,235,245,0.6)',
  label3: 'rgba(235,235,245,0.3)',
  tint: '#0A84FF',
};

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.card,
    backgroundColor: Nocturne.surface,
    borderWidth: 1,
    borderColor: Nocturne.edge,
    padding: Space.l,
    gap: Space.l,
  },
  pressed: { opacity: 0.75 },
  emptyCard: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  emptyText: { flex: 1, gap: 3 },
  cardSub: { color: Nocturne.text2, fontSize: 15 },
  add: { backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  listHeader: { ...Type.label, marginLeft: Space.l, marginBottom: Space.s },
  list: { borderRadius: Radius.card, backgroundColor: Nocturne.surface, borderWidth: 1, borderColor: Nocturne.edge, overflow: 'hidden' },
  listRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Nocturne.edge,
  },
  lastRow: { borderBottomWidth: 0 },
  rowPressed: { backgroundColor: Nocturne.edge },
  listLabel: { flex: 1, color: Nocturne.text, fontSize: 17 },
  listNote: { color: Nocturne.text2, fontSize: 15 },
  addLabel: { fontWeight: '600' },
  more: { backgroundColor: '#3A3A3C', alignItems: 'center', justifyContent: 'center' },
  moreText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  cardTitle: { color: Nocturne.text, fontSize: 17, fontWeight: '600' },

  scrim: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { flex: 1, backgroundColor: Sys.sheet, borderTopLeftRadius: 12, borderTopRightRadius: 12, overflow: 'hidden' },
  navBar: { height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
  navButton: { minWidth: 64, minHeight: 44, justifyContent: 'center' },
  navRight: { alignItems: 'flex-end' },
  navTitle: { flex: 1, textAlign: 'center', color: Sys.label, fontSize: 17, fontWeight: '600' },
  navText: { color: Sys.tint, fontSize: 17 },
  navDone: { fontWeight: '600' },
  content: { paddingHorizontal: 16, gap: 12 },
  groupText: { color: Sys.label2, fontSize: 13, lineHeight: 18, paddingHorizontal: 16 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    borderRadius: 10,
    backgroundColor: Sys.fill,
    paddingHorizontal: 8,
  },
  searchText: { color: Sys.label2, fontSize: 17 },
  group: { borderRadius: 10, backgroundColor: Sys.cell, overflow: 'hidden' },
  row: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Sys.separator,
  },
  rowIndent: { paddingLeft: 48 },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 },
  rowLabel: { flex: 1, color: Sys.label, fontSize: 17 },
  categoryIcon: {
    width: 29,
    height: 29,
    borderRadius: 7,
    backgroundColor: '#636366',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disclosure: { width: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
});
