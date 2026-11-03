'use no memo';
// Reads the App Group stores during render (passes, mornings, the trial…), which change outside
// React, so the React Compiler stays out (settings-actions.ts).

import { SymbolView } from 'expo-symbols';
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SwitchRow } from '@/components/controls';
import { Section, sym, ValueRow } from '@/components/grouped-list';
import { Text } from '@/components/text';
import * as haptic from '@/lib/haptics';
import { LEGAL_URLS } from '@/lib/links';
import { DisplayFont, Gap, Nocturne, Space, Type } from '@/theme';

import { openMoons } from '@/features/moons/moon-collection';

import { SIGN_OFF } from './fire-loc';
import { LocProfile } from './loc-profile';
import {
  appVersion,
  cancelSubscription,
  devLabs,
  fireLoc,
  helpOrFeedback,
  moonsLabel,
  open,
  openDeveloper,
  openDiagnostics,
  openPasses,
  PLAN_LABEL,
  rate,
  SETTINGS_BG,
  subscribe,
  useSettings,
  whyNoDeleting,
} from './settings-actions';

export { SETTINGS_BG };

/**
 * Settings in the web preview, which can't draw SwiftUI: the iPhone page (you-screen.ios.tsx),
 * a SwiftUI Form, laid out the same on the app's smoked cards. Subscription opens in place here,
 * where the iPhone pushes it.
 */
export function YouScreen({ onClose }: { onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const s = useSettings();
  const [subscription, setSubscription] = useState(false);
  const row = (ios: Parameters<typeof sym>[0], android: Parameters<typeof sym>[1]) => ({ iconTint: Nocturne.text, icon: sym(ios, android) });

  return (
    <ScrollView
      bounces={false}
      overScrollMode="never"
      showsVerticalScrollIndicator={false}
      style={styles.screen}
      contentInsetAdjustmentBehavior="never"
      contentContainerStyle={[styles.content, { paddingTop: insets.top + Space.xl, paddingBottom: insets.bottom + Gap.section }]}
    >
      <Head
        title={subscription ? 'Subscription' : 'Settings'}
        back={subscription}
        onPress={() => (subscription ? setSubscription(false) : onClose())}
      />

      {subscription ? (
        <>
          <Section>
            <View style={styles.plan}>
              <Text style={styles.planName}>{s.plan ? `${PLAN_LABEL[s.plan]}${s.inTrial ? ' trial' : ''}` : ' '}</Text>
              <Text style={styles.planNote}>{s.planNote}</Text>
            </View>
          </Section>
          <Section>
            <ValueRow {...row('arrow.left.arrow.right', 'swap_horiz')} title="Change plan" value="" onPress={s.manage} last={!s.inTrial} />
            {s.inTrial ? <SwitchRow {...row('bell', 'notifications')} title="Trial reminder" value={s.alerts.trial} onChange={s.toggle('trial')} last /> : null}
          </Section>
          <QuietRow title="Restore purchases" value={s.restoring ? 'Checking…' : undefined} onPress={s.restorePurchases} />
          <RedRow title="Cancel subscription" onPress={cancelSubscription} />
        </>
      ) : (
        <>
          <LocProfile mornings={s.mornings} onLongPress={openDiagnostics} />
          <View style={styles.firstGap} />

          <Section>
            <ValueRow {...row('moon', 'dark_mode')} title="Moons" value={moonsLabel(s.moons)} onPress={openMoons} />
            <ValueRow {...row('ticket', 'confirmation_number')} title="Passes" value={`${s.passesLeft} left`} onPress={openPasses} last />
          </Section>

          <Heading>Notifications</Heading>
          <Section>
            <SwitchRow {...row('bell', 'notifications')} title="Bedtime heads-up" value={s.alerts.bedtime} onChange={s.toggle('bedtime')} />
            <SwitchRow {...row('sunrise', 'wb_twilight')} title="Morning nudge" value={s.alerts.morning} onChange={s.toggle('morning')} last />
          </Section>

          <Heading>Help</Heading>
          <Section>
            <ValueRow {...row('trash.slash', 'delete_forever')} title="Why can't I delete apps?" value="" onPress={whyNoDeleting} />
            <ValueRow {...row('lifepreserver', 'support')} title="Help & feedback" value="" onPress={helpOrFeedback} />
            <ValueRow {...row('star', 'star')} title="Rate Locturne" value="" onPress={rate} last />
          </Section>

          <Section>
            {s.plan === null ? (
              <ValueRow {...row('sparkles', 'auto_awesome')} title="Subscribe" value="" onPress={subscribe} last />
            ) : (
              <ValueRow {...row('sparkles', 'auto_awesome')} title="Subscription" value={s.planValue} onPress={() => setSubscription(true)} last />
            )}
          </Section>

          {devLabs ? (
            <Section>
              <ValueRow iconTint={Nocturne.text2} icon={sym('hammer', 'build')} title="Developer" value="" onPress={openDeveloper} last />
            </Section>
          ) : null}

          <QuietRow title="Restore purchases" value={s.restoring ? 'Checking…' : undefined} onPress={s.restorePurchases} />
          <QuietRow title="Privacy Policy" onPress={() => open(LEGAL_URLS.privacy)} />
          <QuietRow title="Terms of Use" onPress={() => open(LEGAL_URLS.terms)} />

          <Text style={styles.signOff}>
            Locturne {appVersion()}
            {'\n'}
            {SIGN_OFF}
          </Text>
          <RedRow title="Fire Loc" onPress={fireLoc} />
        </>
      )}
    </ScrollView>
  );
}

/** The title bar: the way out (down for the page, back for Subscription), the title, nothing on the right. */
function Head({ title, back, onPress }: { title: string; back: boolean; onPress: () => void }) {
  return (
    <View style={styles.head}>
      <View style={styles.side}>
        <Pressable
          onPress={() => {
            haptic.tap();
            onPress();
          }}
          accessibilityRole="button"
          accessibilityLabel={back ? 'Back' : 'Close'}
          hitSlop={8}
          style={({ pressed }) => [styles.close, pressed && styles.pressed]}
        >
          <SymbolView
            name={back ? sym('chevron.left', 'chevron_left') : sym('chevron.down', 'expand_more')}
            size={13}
            weight="bold"
            tintColor={Nocturne.text2}
          />
        </Pressable>
      </View>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      <View style={styles.side} />
    </View>
  );
}

const Heading = ({ children }: { children: ReactNode }) => (
  <Text style={styles.heading} accessibilityRole="header">
    {children}
  </Text>
);

/** A row in grey with no icon and no card, for what's rarely needed. */
function QuietRow({ title, value, onPress }: { title: string; value?: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      accessibilityRole="link"
      style={({ pressed }) => [styles.quiet, pressed && styles.pressed]}
    >
      <Text style={styles.quietText}>{title}</Text>
      {value ? <Text style={styles.quietValue}>{value}</Text> : null}
      <SymbolView name={sym('chevron.right', 'chevron_right')} size={13} weight="semibold" tintColor={Nocturne.text3} />
    </Pressable>
  );
}

function RedRow({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      accessibilityRole="button"
      style={({ pressed }) => [styles.redRow, pressed && styles.pressed]}
    >
      <Text style={styles.redText}>{title}</Text>
    </Pressable>
  );
}

const CLOSE = 30;
const SIDE = 72;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: SETTINGS_BG },
  content: { paddingHorizontal: Gap.gutter },
  pressed: { opacity: 0.7 },

  head: { flexDirection: 'row', alignItems: 'center', minHeight: CLOSE, marginBottom: Gap.block },
  close: { width: CLOSE, height: CLOSE, borderRadius: CLOSE / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: Nocturne.frost },
  title: { ...DisplayFont, flex: 1, color: Nocturne.text, fontSize: 22, lineHeight: 28, textAlign: 'center' },
  side: { width: SIDE },

  firstGap: { height: Space.xl },
  heading: { ...Type.secondary, color: Nocturne.text2, textAlign: 'center', marginBottom: Space.s },

  plan: { alignItems: 'center', gap: Space.xs, paddingVertical: Space.l, paddingHorizontal: Space.l },
  planName: { ...DisplayFont, color: Nocturne.text, fontSize: 22, lineHeight: 28 },
  planNote: { ...Type.secondary, color: Nocturne.text2, textAlign: 'center' },

  quiet: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: Space.s, paddingHorizontal: Space.l },
  quietText: { flex: 1, color: Nocturne.text2, fontSize: 17 },
  quietValue: { color: Nocturne.text3, fontSize: 17 },

  signOff: { color: Nocturne.text3, ...Type.caption, textAlign: 'center', marginTop: Gap.section, marginBottom: Space.l },
  redRow: { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: Space.m },
  redText: { color: '#FF453A', fontSize: 17 },
});
