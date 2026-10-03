import Constants from 'expo-constants';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTabBarInset } from '@/components/app-tabs';
import { PrimaryButton } from '@/components/buttons';
import { Section, sym, ValueRow } from '@/components/grouped-list';
import { SwitchRow } from '@/features/routine/controls';
import { useProtection } from '@/hooks/use-protection';
import { getPassesLeft } from '@/lib/passes';
import { type Protection } from '@/lib/screen-time';
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
 * Passes, the emergency unlock and the scan code are real (they open the exits and scan
 * screens). The plan and the notification toggles are still placeholders.
 */

const STATUS: Record<Protection, { icon: string; android: string; line: string }> = {
  on: { icon: 'lock.fill', android: 'lock', line: 'Screen Time access is on. Your apps sleep on schedule.' },
  // VOICE.md, "Access revoked": clear first, one small wink.
  off: {
    icon: 'exclamationmark.triangle.fill',
    android: 'warning',
    line: 'Screen Time access is off, so I can’t block anything. Turn it back on in Settings. Until then I’m just a raccoon.',
  },
  notSetUp: {
    icon: 'exclamationmark.triangle.fill',
    android: 'warning',
    line: 'Screen Time access isn’t on yet, so I can’t block anything. Allow it from the Apps tab.',
  },
  unavailable: { icon: 'iphone', android: 'smartphone', line: 'Blocking needs Screen Time, which only iPhone has.' },
};

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

  // Checks the schedules and shields too, since iOS keeps reporting access as on after
  // it's revoked, until the app restarts.
  const [status] = useProtection();

  const [alerts, setAlerts] = useState({ bedtime: true, morning: true, trial: true });
  const toggle = (key: keyof typeof alerts) => (on: boolean) => setAlerts((a) => ({ ...a, [key]: on }));

  // Re-read on every render; the tab re-renders when it's focused again.
  const passesLeft = getPassesLeft();

  const s = STATUS[status];
  const version = Constants.expoConfig?.version;

  return (
    <ScrollView
      contentContainerStyle={[styles.content, { paddingTop: insets.top + Gap.pageTop, paddingBottom: bottom }]}
    >
      <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={DISPLAY_MAX_SCALE}>
        You
      </Text>

      <View style={[styles.status, (status === 'off' || status === 'notSetUp') && styles.statusOff]} accessibilityLiveRegion="polite">
        <View style={styles.statusRow}>
          <SymbolView name={sym(s.icon, s.android)} size={18} tintColor={Nocturne.text} style={styles.statusIcon} />
          <Text style={styles.statusText}>{noOrphan(s.line)}</Text>
        </View>
        {status === 'off' ? <PrimaryButton label="Open Settings" onPress={() => Linking.openSettings()} /> : null}
      </View>

      <Section label="Ways out" footer={`Passes refill on ${refillDate(new Date())}. For sick days, travel, or a baby asleep in the room.`}>
        <ValueRow
          icon={sym('ticket.fill', 'confirmation_number')}
          title="Passes"
          value={`${passesLeft} left`}
          onPress={() => router.push('/exits')}
        />
        <ValueRow icon={sym('lock.open.fill', 'lock_open')} title="Emergency unlock" value="" onPress={() => router.push('/exits')} />
        <ValueRow
          icon={sym('figure.roll', 'accessible')}
          title="Can’t walk or use stairs"
          value=""
          onPress={() => router.push({ pathname: '/scan', params: { mode: 'setup' } })}
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
        <ValueRow icon={sym('doc.text.fill', 'description')} title="Terms of Use" value="" onPress={() => notLive('Terms of Use')} />
        {/* For beta testers: what iOS ran overnight, to paste into a bug report. */}
        <ValueRow icon={sym('stethoscope', 'troubleshoot')} title="Beta diagnostics" value="" onPress={() => router.push('/diagnostics')} last />
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
        Locturne{version ? ` ${version}` : ''} · Preview. The plan is a placeholder.
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
