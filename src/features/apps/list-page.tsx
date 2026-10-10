'use no memo';
// Reads the App Group stores during render (picks, limits), which change outside React, so it
// stays out of the React Compiler like the Apps tab.

import { router, Stack, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { isBlockedAppsViewAvailable } from 'blocked-apps';

import { AppPickerSheet } from '@/components/app-picker';
import { Text } from '@/components/text';
import { isLimitId, limitLabel } from '@/lib/daily-limits';
import * as haptic from '@/lib/haptics';
import { editedSelection, isScreenTimeAvailable } from '@/lib/screen-time';
import { WebsitesCard } from '@/features/websites/websites-card';
import { Gap, Nocturne, Space, Type } from '@/theme';

import {
  AppRow,
  countPicks,
  EditRow,
  LIMIT_PICKER_HEADER,
  ListCard,
  listStatus,
  liveLimitNote,
  LIVE_GROUPS,
  namedBy,
  PendingNote,
  PickedRows,
  PREVIEW_GROUPS,
  previewStatus,
  type TileStatus,
} from './apps-list';
import { openLimitSheet } from './limit-sheet';
import { useListActions } from './list-actions';
import { removePreviewLimit, savePreviewLimitApps, savePreviewPicks, setPreviewLimitMinutes, usePreviewLists } from './preview-lists';

/**
 * One list's own page, pushed from its tile on the Apps tab (user, 2026-10-10: "how do you see
 * every app if they are buried"): every app in it, an Add or remove apps row, and for a daily
 * limit its time and a Remove limit button. A plain page with the system back button, like a
 * limit's page in Screen Time.
 *
 * `id` is the list: `night` or `always` (`bedtime` or `always` in the web preview), or a
 * limit's id (`limit-0`, the preview's limits by index).
 */
export function ListPage() {
  const { id = '' } = useLocalSearchParams<{ id?: string }>();
  return isScreenTimeAvailable() ? <LiveListPage id={id} /> : <PreviewListPage id={id} />;
}

function LiveListPage({ id }: { id: string }) {
  const actions = useListActions();
  const { revision, limits, limitError, picker } = actions;
  const limit = isLimitId(id) ? limits.find((l) => l.id === id) : undefined;
  const group = LIVE_GROUPS.find((g) => g.key === id);
  const list = group?.key ?? (limit ? limit.id : null);
  // Removed with nothing to wait for (`editLimit`), or a link to a list that isn't there: back to the tab.
  const gone = list === null;
  useEffect(() => {
    if (gone && router.canGoBack()) router.back();
  }, [gone]);
  if (!list) return null;

  // Re-read on every revision: the picker or a swipe changes them outside React.
  void revision;
  const picks = editedSelection(list);
  const title = group ? group.label : `${limitLabel(limit!.minutes)} a day`;

  const rows = (
    <ListCard note={group ? <PendingNote list={group.key} /> : null}>
      <EditRow label={picks.size ? 'Add or remove apps' : 'Add apps'} onPress={() => actions.edit(list)} divided={picks.size > 0} />
      {picks.size > 0 && !isBlockedAppsViewAvailable ? (
        // A build from before modules/blocked-apps existed can't draw the rows.
        <Text style={styles.oldBuild}>{countPicks(picks.size)}. Install the latest build to see them.</Text>
      ) : null}
      {isBlockedAppsViewAvailable ? (
        <PickedRows selectionId={picks.id} count={picks.size} revision={revision} onRemove={(pick) => actions.removed(list, pick)} />
      ) : null}
    </ListCard>
  );

  return (
    <Page
      title={title}
      about={group ? group.about : 'Once their time is used up today, these apps sleep until midnight.'}
      status={group ? listStatus(group.key, picks.size) : null}
      footer={limitError}
      overlay={picker}
    >
      {limit ? (
        <TimeCard
          minutes={limit.minutes}
          note={liveLimitNote(limit)}
          onPress={() =>
            openLimitSheet({
              start: limit.pending?.minutes ?? limit.minutes,
              chosen: limit.pending ? limit.pending.minutes : limit.minutes,
              onChange: (m) => actions.setMinutes(limit.id, m),
              note: liveLimitNote(limit),
            })
          }
        />
      ) : null}
      <Section label={`Apps · ${picks.size}`}>{rows}</Section>
      {group ? (
        <Section label="Websites">
          <WebsitesCard list={group.key} />
        </Section>
      ) : null}
      {/* Already ending: a second tap would change nothing. */}
      {limit && limit.pending?.minutes !== null ? <RemoveButton onPress={() => actions.setMinutes(limit.id, null)} /> : null}
    </Page>
  );
}

function PreviewListPage({ id }: { id: string }) {
  const { picks, limits } = usePreviewLists();
  const [picking, setPicking] = useState(false);
  const group = PREVIEW_GROUPS.find((g) => g.key === id);
  const index = id.startsWith('limit-') ? Number(id.slice('limit-'.length)) : -1;
  const limit = limits[index];
  const gone = !group && !limit;
  useEffect(() => {
    if (gone && router.canGoBack()) router.back();
  }, [gone]);
  if (gone) return null;

  const apps = group ? picks[group.key] : limit.apps;
  const usedUp = limit ? limit.used >= limit.minutes : false;
  const edit = () => {
    haptic.tap();
    setPicking(true);
  };

  return (
    <Page
      title={group ? group.label : namedBy(limit.apps)}
      about={group ? group.about : 'Once their time is used up today, these apps sleep until midnight.'}
      status={group ? previewStatus(group.key, apps.length) : null}
      overlay={
        <AppPickerSheet
          open={picking}
          apps={apps}
          header={group ? group.picker : LIMIT_PICKER_HEADER}
          onDone={(next) => {
            haptic.done();
            if (group) savePreviewPicks(group.key, next);
            else savePreviewLimitApps(index, next);
            setPicking(false);
          }}
          onClose={() => setPicking(false)}
        />
      }
    >
      {limit ? (
        <TimeCard
          minutes={limit.minutes}
          note={usedUp ? 'Used up today. Back at midnight.' : `${limitLabel(limit.minutes - limit.used)} left today.`}
          onPress={() =>
            openLimitSheet({
              start: limit.minutes,
              chosen: limit.minutes,
              onChange: (minutes) => setPreviewLimitMinutes(index, minutes),
              title: namedBy(limit.apps),
              note: usedUp ? 'Used up today. Back at midnight.' : null,
            })
          }
        />
      ) : null}
      <Section label={`Apps · ${apps.length}`}>
        <ListCard>
          <EditRow label={apps.length ? 'Add or remove apps' : 'Add apps'} onPress={edit} divided={apps.length > 0} />
          {apps.map((name, i) => (
            <AppRow key={name} name={name} last={i === apps.length - 1} />
          ))}
        </ListCard>
      </Section>
      {group ? <PreviewWebsites list={group.key === 'bedtime' ? 'night' : 'always'} /> : null}
      {limit ? (
        <RemoveButton
          onPress={() => {
            haptic.tap();
            removePreviewLimit(index);
          }}
        />
      ) : null}
    </Page>
  );
}

/** A bedtime or always list's websites, which the preview keeps in memory like the phone's App Group. */
function PreviewWebsites({ list }: { list: 'night' | 'always' }) {
  return (
    <Section label="Websites">
      <WebsitesCard list={list} />
    </Section>
  );
}

/** The page: the system header with its back button, what the list does, then its sections. */
function Page({
  title,
  about,
  status,
  footer,
  overlay,
  children,
}: {
  title: string;
  about: string;
  status?: TileStatus | null;
  footer?: string | null;
  overlay?: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <Stack.Screen options={{ title }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <View style={styles.head}>
          <Text style={styles.about}>{about}</Text>
          {status ? (
            <View style={styles.status}>
              <SymbolView name={status.icon} size={13} tintColor={Nocturne.text2} />
              <Text style={styles.statusText}>{status.text}</Text>
            </View>
          ) : null}
        </View>
        {children}
        {footer ? <Text style={styles.footer}>{footer}</Text> : null}
      </ScrollView>
      {overlay}
    </>
  );
}

/** A titled section: a small centred caption over its card. */
function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View>
      <Text style={styles.sectionLabel} accessibilityRole="header">
        {label}
      </Text>
      {children}
    </View>
  );
}

/** A limit's time: one row that opens the time sheet, and what's happening with it today. */
function TimeCard({ minutes, note, onPress }: { minutes: number; note: string | null; onPress: () => void }) {
  return (
    <ListCard note={note ? <Text style={styles.footer}>{note}</Text> : null}>
      <Pressable
        onPress={() => {
          haptic.tap();
          onPress();
        }}
        accessibilityRole="button"
        accessibilityLabel={`Time per day, ${limitLabel(minutes)}`}
        accessibilityHint="Changes the time"
        style={({ pressed }) => [styles.timeRow, pressed && styles.rowPressed]}
      >
        <Text style={styles.timeLabel}>Time per day</Text>
        <Text style={styles.timeValue}>{limitLabel(minutes)}</Text>
        <SymbolView
          name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
          size={14}
          weight="semibold"
          tintColor={Nocturne.text3}
        />
      </Pressable>
    </ListCard>
  );
}

function RemoveButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" hitSlop={8} style={({ pressed }) => [styles.remove, pressed && styles.pressed]}>
      <Text style={styles.removeLabel}>Remove limit</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: Gap.gutter, paddingTop: Space.l, paddingBottom: Gap.section, gap: Gap.section },
  head: { gap: Space.s, alignItems: 'center' },
  about: { ...Type.body, color: Nocturne.text2, textAlign: 'center' },
  status: { flexDirection: 'row', alignItems: 'center', gap: Space.s },
  statusText: { ...Type.caption, color: Nocturne.text2 },
  sectionLabel: { ...Type.label, textAlign: 'center', marginBottom: Space.m },
  timeRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: Space.s, paddingHorizontal: 16 },
  timeLabel: { flex: 1, color: Nocturne.text, fontSize: 17, fontWeight: '500' },
  timeValue: { ...Type.body, color: Nocturne.text2 },
  rowPressed: { backgroundColor: 'rgba(255, 255, 255, 0.06)' },
  oldBuild: { ...Type.body, color: Nocturne.text2, padding: 16 },
  footer: { ...Type.caption, color: Nocturne.text2, marginHorizontal: Space.l, marginTop: Space.s, textAlign: 'center' },
  remove: { minHeight: 44, alignSelf: 'center', justifyContent: 'center' },
  // iOS's dark-mode system red, as on a destructive action.
  removeLabel: { color: '#FF453A', fontSize: 17, fontWeight: '500' },
  pressed: { opacity: 0.7 },
});
