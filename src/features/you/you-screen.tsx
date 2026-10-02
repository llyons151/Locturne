import Constants from 'expo-constants';
import { router, useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTabBarInset } from '@/components/app-tabs';
import { PrimaryButton } from '@/components/buttons';
import { Section, sym, ValueRow } from '@/components/grouped-list';
import { SwitchRow } from '@/features/routine/controls';
import { getAccess, isScreenTimeAvailable } from '@/lib/screen-time';
import { noOrphan } from '@/lib/text';
import { DISPLAY_MAX_SCALE, DisplayFont, Gap, Nocturne, Radius, Space, Type } from '@/theme';

/**
 * The You tab: everything that isn't tonight. Routine holds the schedule and the wake-up
 * method, Apps holds both lists, so this is where you check he's working, find the ways
 * out, and manage notifications and the subscription.
 *
 * Order (GAME_PLAN): honest status first, then the humane exits, then account things. No
 * stats or charts; history lives on the morning share card.
 *
 * Design preview: passes, the plan and the toggles are placeholders. Screen Time access is
 * real on iPhone.
 */

type Protection = 'on' | 'off' | 'unavailable';

function protection(): Protection {
  if (!isScreenTimeAvailable()) return 'unavailable';
  return getAccess() === 'approved' ? 'on' : 'off';
}

const STATUS: Record<Protection, { icon: string; android: string; line: string }> = {
  on: { icon: 'lock.fill', android: 'lock', line: 'Screen Time access is on. Your apps sleep on schedule.' },
  // VOICE.md, "Access revoked": clear first, one small wink.
  off: {
    icon: 'exclamationmark.triangle.fill',
    android: 'warning',
    line: 'Screen Time access is off, so I can’t block anything. Turn it back on in Settings. Until then I’m just a raccoon.',
  },
  unavailable: { icon: 'iphone', android: 'smartphone', line: 'Blocking needs Screen Time, which only iPhone has.' },
};

/** Placeholders until passes exist (TODO.md: count and length still to decide). */
const PASSES_LEFT = 3;

function refillDate(now: Date) {
  return new Date(now.getFullYear(), now.getMonth() + 1, 1).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
  });
}

const notLive = (what: string) => Alert.alert(what, 'This isn’t live yet. It arrives before launch.');

export function YouScreen() {
  const insets = useSafeAreaInsets();
  const bottom = useTabBarInset();

  const [status, setStatus] = useState<Protection>(protection);
  // Access can be switched off in Settings while we're away, so check on every visit.
  useFocusEffect(useCallback(() => setStatus(protection()), []));

  const [alerts, setAlerts] = useState({ bedtime: true, morning: true, trial: true });
  const toggle = (key: keyof typeof alerts) => (on: boolean) => setAlerts((a) => ({ ...a, [key]: on }));

  const usePass = () =>
    Alert.alert('Use a pass?', `It wakes your apps this morning without the walk. ${PASSES_LEFT - 1} left after this.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Use pass', onPress: () => notLive('Passes') },
    ]);

  const emergency = () =>
    Alert.alert('Emergency unlock', 'I’ll allow it. This once. Maybe.\n\nYour always-asleep apps stay asleep.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Unlock', style: 'destructive', onPress: () => notLive('Emergency unlock') },
    ]);

  const s = STATUS[status];
  const version = Constants.expoConfig?.version;

  return (
    <ScrollView
      contentContainerStyle={[styles.content, { paddingTop: insets.top + Gap.pageTop, paddingBottom: bottom }]}
    >
      <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={DISPLAY_MAX_SCALE}>
        You
      </Text>

      <View style={[styles.status, status === 'off' && styles.statusOff]} accessibilityLiveRegion="polite">
        <View style={styles.statusRow}>
          <SymbolView name={sym(s.icon, s.android)} size={18} tintColor={Nocturne.text} style={styles.statusIcon} />
          <Text style={styles.statusText}>{noOrphan(s.line)}</Text>
        </View>
        {status === 'off' ? <PrimaryButton label="Open Settings" onPress={() => Linking.openSettings()} /> : null}
      </View>

      <Section label="Ways out" footer={`Passes refill on ${refillDate(new Date())}. For sick days, travel, or a baby asleep in the room.`}>
        <ValueRow icon={sym('ticket.fill', 'confirmation_number')} title="Passes" value={`${PASSES_LEFT} left`} onPress={usePass} />
        <ValueRow icon={sym('lock.open.fill', 'lock_open')} title="Emergency unlock" value="" onPress={emergency} />
        <ValueRow
          icon={sym('figure.roll', 'accessible')}
          title="Can’t walk or use stairs"
          value=""
          onPress={() => notLive('Another way to wake him')}
          last
        />
      </Section>

      <Section label="Notifications" footer="He keeps it short. No streaks, no guilt.">
        <SwitchRow icon={sym('moon.fill', 'bedtime')} title="Bedtime heads-up" value={alerts.bedtime} onChange={toggle('bedtime')} />
        <SwitchRow icon={sym('sunrise.fill', 'wb_twilight')} title="Morning nudge" value={alerts.morning} onChange={toggle('morning')} />
        <SwitchRow icon={sym('calendar', 'calendar_month')} title="Trial reminder" value={alerts.trial} onChange={toggle('trial')} last />
      </Section>

      <Section label="Subscription">
        <ValueRow
          icon={sym('creditcard.fill', 'credit_card')}
          title="Manage subscription"
          value="Annual"
          onPress={() => Linking.openURL('https://apps.apple.com/account/subscriptions')}
        />
        <ValueRow icon={sym('arrow.clockwise', 'refresh')} title="Restore purchases" value="" onPress={() => notLive('Restore purchases')} last />
      </Section>

      <Section label="Help">
        <ValueRow icon={sym('questionmark.circle.fill', 'help')} title="Help" value="" onPress={() => notLive('Help')} />
        <ValueRow icon={sym('envelope.fill', 'mail')} title="Send feedback" value="" onPress={() => notLive('Feedback')} />
        <ValueRow icon={sym('star.fill', 'star')} title="Rate Locturne" value="" onPress={() => notLive('Ratings')} />
        <ValueRow icon={sym('hand.raised.fill', 'privacy_tip')} title="Privacy Policy" value="" onPress={() => notLive('Privacy Policy')} />
        <ValueRow icon={sym('doc.text.fill', 'description')} title="Terms of Use" value="" onPress={() => notLive('Terms of Use')} last />
      </Section>

      {__DEV__ ? (
        <Section label="Developer">
          <ValueRow
            icon={sym('hammer.fill', 'build')}
            title="Screen Time lab"
            value=""
            onPress={() => router.push('/screen-time-lab')}
            last
          />
        </Section>
      ) : null}

      <Text style={styles.footer}>
        {/* Preview only, so it never implies passes or a plan exist (GAME_PLAN, "Reliability"). */}
        Locturne{version ? ` ${version}` : ''} · Preview. Passes and the plan are placeholders.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: Gap.gutter },
  title: { ...DisplayFont, color: Nocturne.text, fontSize: 34, lineHeight: 37, letterSpacing: -0.3, marginBottom: Gap.block },

  status: {
    gap: Space.l,
    padding: Space.l,
    marginBottom: Gap.section,
    borderRadius: Radius.card,
    borderCurve: 'continuous',
    backgroundColor: Nocturne.raised,
    borderWidth: 1,
    borderColor: Nocturne.edge,
  },
  statusOff: { borderColor: Nocturne.text2 },
  statusRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Space.m },
  // Centres the icon on the first line of text.
  statusIcon: { marginTop: 2 },
  statusText: { flex: 1, color: Nocturne.text, ...Type.secondary },

  footer: { ...Type.caption, color: Nocturne.text3, textAlign: 'center' },
});
