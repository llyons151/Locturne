import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';
import { BlockedAppsView, isBlockedAppsViewAvailable } from 'blocked-apps';

import { AppTile } from '@/components/app-icons';
import { Text } from '@/components/text';
import { getNightPause, heldPhase } from '@/lib/emergency';
import { nextBedtime, onLockChange } from '@/lib/lock-controller';
import type { LockState } from '@/lib/lock-state';
import { nextNightOn } from '@/lib/routine';
import { clockLabel } from '@/lib/shield-copy';
import { isScreenTimeAvailable, shownSelection, type Protection } from '@/lib/screen-time';
import { Nocturne, Radius, Space, Type } from '@/theme';

import { APPS } from '../apps/catalog';
import { duration, useMinute } from './night-meter';

const PREVIEW = APPS.filter((app) => app.rule === 'bedtime');
const PREVIEW_ICONS = ['Instagram', 'Snapchat', 'X'];
const ICON = 32;

/** One quiet shortcut to the bedtime list. Counts include whole categories and sites. */
export function BedtimeApps({ lock, protection }: { lock: LockState; protection: Protection }) {
  'use no memo';
  const [revision, setRevision] = useState(0);
  useFocusEffect(useCallback(() => { setRevision((value) => value + 1); }, []));
  useEffect(() => onLockChange(() => setRevision((value) => value + 1)), []);
  const live = isScreenTimeAvailable();
  const selection = live ? shownSelection('night') : null;
  const count = selection?.size ?? PREVIEW.length;
  const shown = Math.min(count, 3);
  const remaining = count - (live && !isBlockedAppsViewAvailable ? 0 : shown);
  const now = useMinute();
  const pause = getNightPause(now);
  const phase = heldPhase(lock.phase, now);
  const sleeping = !pause && (phase === 'night' || phase === 'morning');
  const next = nextNightOn(pause ?? nextBedtime(now), now);
  const sleepsAt = next && pause && next < pause ? pause : next;
  const minutes = sleepsAt ? Math.max(1, Math.ceil((sleepsAt.getTime() - now.getTime()) / 60_000)) : null;
  const unavailable = live && protection !== 'on';
  const badge = !count ? 'No apps' : unavailable ? 'Not active' : sleeping ? 'Asleep' : sleepsAt ? 'Will sleep' : 'Nights off';
  const countdown = !count ? 'Choose apps to sleep at bedtime' : unavailable ? 'Set up bedtime protection' : sleeping ? (phase === 'morning' ? 'Wake up to unlock' : 'Asleep until your morning wake-up') : minutes !== null ? `Sleeps in ${duration(minutes)}` : 'No bedtime scheduled';
  // A thin day-to-bedtime meter: begins at midnight on the next scheduled evening.
  const start = sleepsAt ? new Date(sleepsAt) : null;
  start?.setHours(0, 0, 0, 0);
  const progress = !count || unavailable ? 0 : sleeping ? 1 : sleepsAt && start ? Math.min(1, Math.max(0, (now.getTime() - start.getTime()) / Math.max(1, sleepsAt.getTime() - start.getTime()))) : 0;

  return (
    <Link href="/apps" asChild>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Bedtime apps, ${count} selections.${remaining > 0 ? ` ${remaining} more selections not shown.` : ''} ${badge}. ${countdown}. View all apps.`}
        style={styles.section}
      >
        <View style={styles.header}>
          <Text style={styles.label}>Bedtime apps</Text>
          <Text style={styles.viewAll}>View all</Text>
        </View>
        <View style={styles.card}>
          <View style={styles.row}>
          <View style={styles.icons} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {selection && isBlockedAppsViewAvailable ? (
              <BlockedAppsView
                selectionId={selection.id}
                revision={revision}
                iconsOnly
                style={{ width: shown * ICON + Math.max(0, shown - 1) * Space.xs, height: ICON }}
              />
            ) : !live ? (
              PREVIEW_ICONS.slice(0, shown).map((name) => <AppTile key={name} name={name} size={ICON} />)
            ) : count > 0 ? (
              <View style={styles.tile}>
                <SymbolView name={{ ios: 'square.stack', android: 'apps', web: 'apps' }} size={20} tintColor={Nocturne.text} />
              </View>
            ) : null}
            {remaining > 0 && (
              <View style={styles.moreStack}>
                <View style={styles.moreBack} />
                <View style={styles.moreTile}>
                  <Text style={styles.moreCount} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}><Text style={styles.morePlus}>+</Text>{remaining}</Text>
                </View>
              </View>
            )}
            {count === 0 ? (
              <View style={styles.tile}>
                <SymbolView name={{ ios: 'plus', android: 'add', web: 'add' }} size={18} tintColor={Nocturne.text} />
              </View>
            ) : null}
          </View>
          <View style={styles.badge}><Text style={styles.badgeText}>{badge}</Text></View>
          </View>
          <View style={styles.footer}>
            <View style={styles.countdown}>
              <SymbolView name={{ ios: 'clock', android: 'schedule', web: 'schedule' }} size={13} tintColor={Nocturne.text2} />
              <Text style={styles.detail}>{countdown}</Text>
            </View>
            {!sleeping && !unavailable && count > 0 && sleepsAt && <Text style={styles.detail}>{clockLabel(sleepsAt.getHours() * 60 + sleepsAt.getMinutes())}</Text>}
          </View>
          <View style={styles.track} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <View style={[styles.fill, { width: `${progress * 100}%` }]} />
          </View>
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  section: {
    marginHorizontal: Space.xl,
    padding: Space.l,
    gap: Space.l,
    backgroundColor: '#000000',
    borderRadius: Radius.card,
    borderCurve: 'continuous',
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Space.m },
  card: {
    gap: Space.l,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: Space.m,
  },
  icons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.xs,
  },
  tile: {
    width: ICON,
    height: ICON,
    borderRadius: ICON * 0.225,
    borderCurve: 'continuous',
    backgroundColor: Nocturne.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  label: { ...Type.secondary, fontWeight: '600', color: Nocturne.text },
  moreStack: { width: ICON + 2, height: ICON, marginLeft: 2 },
  moreBack: { position: 'absolute', top: 3, right: 0, width: ICON - 3, height: ICON - 6, borderRadius: 7, backgroundColor: '#282A2E', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.12)' },
  moreTile: { width: ICON - 2, height: ICON, borderRadius: ICON * 0.225, borderCurve: 'continuous', backgroundColor: '#18191C', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.10)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  moreCount: { ...Type.legal, fontWeight: '700', color: '#D3D5DB', letterSpacing: -0.3, fontVariant: ['tabular-nums'] },
  morePlus: { color: '#92969F', fontWeight: '500' },
  viewAll: { ...Type.caption, color: Nocturne.text2 },
  badge: { paddingVertical: Space.xs, paddingHorizontal: Space.s, borderRadius: Radius.pill, backgroundColor: 'rgba(255,255,255,0.08)' },
  badgeText: { ...Type.legal, fontWeight: '500', color: Nocturne.text2 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: Space.s },
  countdown: { flexDirection: 'row', alignItems: 'center', gap: Space.xs, flexShrink: 1 },
  detail: { ...Type.caption, color: Nocturne.text2, flexShrink: 1, fontVariant: ['tabular-nums'] },
  track: { height: 2, borderRadius: 1, backgroundColor: Nocturne.edge, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 1, backgroundColor: Nocturne.text2 },
});
