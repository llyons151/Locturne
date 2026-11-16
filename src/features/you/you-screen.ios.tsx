'use no memo';
// Reads the App Group stores during render (passes, mornings, the trial…), which change outside
// React, so the React Compiler stays out (settings-actions.ts).

import { Host } from '@expo/ui';
import {
  Button,
  Form,
  HStack,
  Image,
  NavigationDestination,
  NavigationLink,
  NavigationStack,
  RNHostView,
  Section,
  Spacer,
  Text,
  Toggle,
  Toolbar,
  ToolbarItem,
  VStack,
} from '@expo/ui/swift-ui';
import {
  accessibilityLabel,
  background,
  font,
  foregroundStyle,
  frame,
  labelsHidden,
  listRowBackground,
  listRowInsets,
  listRowSeparator,
  multilineTextAlignment,
  navigationBarTitleDisplayMode,
  navigationTitle,
  onScrollPhaseChange,
  padding,
  scrollContentBackground,
  shapes,
} from '@expo/ui/swift-ui/modifiers';
import { useState, type ReactElement } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { SFSymbol } from 'sf-symbols-typescript';

import * as haptic from '@/lib/haptics';
import { LANGUAGES, type LanguageChoice } from '@/lib/i18n/core';
import { chooseLanguage, getLanguageChoice, systemLanguage, useT } from '@/lib/i18n/store';
import { LEGAL_URLS } from '@/lib/links';
import { Nocturne } from '@/theme';

import { openMoons } from '@/features/moons/moon-collection';

import { signOff } from './fire-loc';
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
  planLabel,
  rate,
  SETTINGS_BG,
  subscribe,
  useSettings,
  whyNoDeleting,
} from './settings-actions';

export { SETTINGS_BG };

/**
 * Settings on iPhone (the You button, grown out of the tab strip, app/settings.tsx), as Apple's
 * own grouped list: a SwiftUI Form in a NavigationStack, so the rows, their press highlight, the
 * switches, the separators, the title bar and the push to Subscription are all the system's
 * (user 2026-11-03: "make sure it's using native swift").
 *
 * The layout is the 2026-11-03 regroup (docs/SETTINGS_REDO.md): Loc and your mornings, then your
 * things (Moons, Passes), Notifications, Help, one Subscription row that opens its own page,
 * Developer in dev builds, then the quiet rows, the version and Fire Loc. The web preview's
 * stand-in, laid out the same, is you-screen.tsx.
 */

/** The rounded-square icon behind each row's symbol, as on Routine's "How you get up" list. */
const TILE = 'rgba(255,255,255,0.10)';
const TILE_SIZE = 30;
const CLEAR = 'clear';
const ROUTE_SUBSCRIPTION = 'subscription';
const ROUTE_LANGUAGE = 'language';

function Tile({ icon }: { icon: SFSymbol }) {
  return (
    <Image
      systemName={icon}
      size={15}
      color={Nocturne.text}
      modifiers={[frame({ width: TILE_SIZE, height: TILE_SIZE }), background(TILE, shapes.roundedRectangle({ cornerRadius: 8 }))]}
    />
  );
}

const Title = ({ children, grey }: { children: string; grey?: boolean }) => (
  <Text modifiers={[foregroundStyle(grey ? Nocturne.text2 : Nocturne.text)]}>{children}</Text>
);

const Value = ({ children }: { children: string }) => <Text modifiers={[foregroundStyle(Nocturne.text2)]}>{children}</Text>;

/** The system's disclosure chevron, for Buttons, which don't draw one as NavigationLink does. */
const Chevron = () => <Image systemName="chevron.right" size={13} color={Nocturne.text3} modifiers={[font({ weight: 'semibold' })]} />;

/** A tappable row: icon, title, an optional grey value, and the chevron. */
function Row({ icon, title, value, grey, onPress }: { icon?: SFSymbol; title: string; value?: string; grey?: boolean; onPress: () => void }) {
  return (
    <Button
      onPress={() => {
        haptic.tap();
        onPress();
      }}
    >
      <HStack spacing={12}>
        {icon ? <Tile icon={icon} /> : null}
        <Title grey={grey}>{title}</Title>
        <Spacer />
        {value ? <Value>{value}</Value> : null}
        <Chevron />
      </HStack>
    </Button>
  );
}

/** An on/off setting: the system switch at the end of the row. */
function SwitchRow({ icon, title, value, onChange }: { icon: SFSymbol; title: string; value: boolean; onChange: (on: boolean) => void }) {
  return (
    <HStack spacing={12}>
      <Tile icon={icon} />
      <Title>{title}</Title>
      <Spacer />
      <Toggle isOn={value} onIsOnChange={onChange} modifiers={[labelsHidden(), accessibilityLabel(title)]} />
    </HStack>
  );
}

/** A group's name above its card, centered (the user's preference for headings). */
const Heading = ({ children }: { children: string }) => (
  <Text modifiers={[font({ textStyle: 'subheadline' }), foregroundStyle(Nocturne.text2), frame({ maxWidth: 10_000 }), multilineTextAlignment('center')]}>
    {children}
  </Text>
);

/** Rows drawn straight on the black, with no card or separators: the ones you rarely need. */
const BARE = [listRowBackground(CLEAR), listRowSeparator('hidden')];

/** One full-width centered line, as a row with no card (Fire Loc, Cancel subscription). */
function CenteredButton({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Button
      role="destructive"
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      modifiers={BARE}
    >
      <Text modifiers={[foregroundStyle('#FF453A'), frame({ maxWidth: 10_000 }), multilineTextAlignment('center')]}>{title}</Text>
    </Button>
  );
}

/** The black page every screen of the stack is drawn on, with the system's title bar over it. */
const page = (title: string) => [
  navigationTitle(title),
  navigationBarTitleDisplayMode('inline'),
  scrollContentBackground('hidden'),
  background(SETTINGS_BG),
];

/** Pulled down this far past its top and let go, Settings closes, as the moons do (moon-collection-view.tsx). */
const PULL_CLOSE = 70;

/**
 * Pull down off the top and let go to close, like the moons (user 2026-11-11). The Form reports its
 * offset only as its scroll phase changes (iOS 18+), and at rest that offset is its top inset rather
 * than 0, so the first one seen (the first touch, before anything has scrolled) is the top.
 * Returns true once, on the let-go that closes.
 */
function pullCloseTracker() {
  let top: number | null = null;
  let dragging = false;
  let pulled = false;
  return (phase: string, y: number): boolean => {
    if (top === null) top = y;
    const letGo = dragging && phase !== 'interacting';
    dragging = phase === 'interacting';
    if (!letGo || pulled || y > top - PULL_CLOSE) return false;
    pulled = true;
    return true;
  };
}

export function YouScreen({ onClose, onPullClose }: { onClose: () => void; onPullClose?: () => void }) {
  const t = useT();
  const s = useSettings();
  const [language, setLanguage] = useState<LanguageChoice>(getLanguageChoice);
  const pickLanguage = (choice: LanguageChoice) => {
    haptic.tap();
    setLanguage(choice);
    chooseLanguage(choice);
  };
  // The row shows the language in use, as iOS's own Language row does; following the iPhone is the
  // checkmark on the Language page.
  const languageName = (choice: LanguageChoice) => LANGUAGES.find((l) => l.code === (choice === 'system' ? systemLanguage() : choice))!.name;
  const [pullTracker] = useState(pullCloseTracker);
  const pull = onScrollPhaseChange((phase, geometry) => {
    if (!onPullClose || !pullTracker(phase, geometry.contentOffsetY)) return;
    haptic.tap();
    onPullClose();
  });
  const planName = s.plan ? (s.inTrial ? t('subscription.planTrial', { plan: planLabel(s.plan) }) : planLabel(s.plan)) : ' ';

  const insets = useSafeAreaInsets();

  return (
    // The page lays out off screen, at the start of its slide up (StripPage), where iOS gives the
    // SwiftUI page no status bar to clear and never recounts once it lands: the title bar sat under
    // the clock, its Close out of reach (user, 2026-11-03). So SwiftUI ignores the system's safe
    // area, and the screen's is set here, from React Native's numbers, which are always right.
    <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom, backgroundColor: SETTINGS_BG }}>
      <Host style={{ flex: 1, backgroundColor: SETTINGS_BG }} colorScheme="dark" ignoreSafeArea="all">
        <NavigationStack>
          <Toolbar>
            <Form modifiers={[...page(t('settings.title')), pull]}>
              {/* Loc as the profile picture and your mornings under him, like CapWords' profile
                  (user reference, 2026-10-14). Long press the mornings for beta diagnostics. */}
              <Section>
                <HStack modifiers={[...BARE, listRowInsets({ top: 0, bottom: 8, leading: 0, trailing: 0 })]}>
                  <Spacer />
                  <RNHostView matchContents>
                    <LocProfile mornings={s.mornings} onLongPress={openDiagnostics} />
                  </RNHostView>
                  <Spacer />
                </HStack>
              </Section>

              <Section>
                <Row icon="moon" title={t('settings.moonsRow')} value={moonsLabel(s.moons)} onPress={openMoons} />
                <Row icon="ticket" title={t('settings.passes')} value={t('settings.passesLeft', { count: s.passesLeft })} onPress={openPasses} />
              </Section>

              <Section header={<Heading>{t('settings.notifications')}</Heading>}>
                <SwitchRow icon="bell" title={t('settings.bedtimeHeadsUp')} value={s.alerts.bedtime} onChange={s.toggle('bedtime')} />
                <SwitchRow icon="sunrise" title={t('settings.morningNudge')} value={s.alerts.morning} onChange={s.toggle('morning')} />
              </Section>

              {/* Its own page, as iOS's Language & Region: the iPhone's language, then each one by its own name. */}
              <Section>
                <NavigationLink value={ROUTE_LANGUAGE}>
                  <HStack spacing={12}>
                    <Tile icon="globe" />
                    <Title>{t('language.title')}</Title>
                    <Spacer />
                    <Value>{languageName(language)}</Value>
                  </HStack>
                </NavigationLink>
              </Section>

              <Section header={<Heading>{t('settings.help')}</Heading>}>
                <Row icon="trash.slash" title={t('settings.whyNoDelete')} onPress={whyNoDeleting} />
                <Row icon="lifepreserver" title={t('settings.helpFeedback')} onPress={helpOrFeedback} />
                <Row icon="star" title={t('settings.rate')} onPress={rate} />
              </Section>

              {/* Billing is one row (user 2026-11-03): the plan, and the rest one tap in. With no
                  plan, it goes straight to the paywall. */}
              <Section>
                {s.plan === null ? (
                  <Row icon="sparkles" title={t('settings.subscribe')} onPress={subscribe} />
                ) : (
                  <NavigationLink value={ROUTE_SUBSCRIPTION}>
                    <HStack spacing={12}>
                      <Tile icon="sparkles" />
                      <Title>{t('settings.subscription')}</Title>
                      <Spacer />
                      <Value>{s.planValue}</Value>
                    </HStack>
                  </NavigationLink>
                )}
              </Section>

              {/* Dev and preview builds only: every test tool, on its own page (app/(dev)/developer.tsx). */}
              {devLabs ? (
                <Section>
                  <Row icon="hammer" title={t('settings.developer')} grey onPress={openDeveloper} />
                </Section>
              ) : null}

              {/* The rows you rarely need, quieter: grey, no icons, no card. Restore stays on the
                  page, where App Review looks for it. */}
              <Section>
                <BareRow title={t('settings.restore')} value={s.restoring ? t('settings.checking') : undefined} onPress={s.restorePurchases} />
                <BareRow title={t('settings.privacy')} onPress={() => open(LEGAL_URLS.privacy)} />
                <BareRow title={t('settings.terms')} onPress={() => open(LEGAL_URLS.terms)} />
              </Section>

              {/* The version and his line, then Fire Loc last, in red with no card. */}
              <Section>
                <VStack spacing={2} modifiers={[...BARE, frame({ maxWidth: 10_000 }), padding({ top: 8 })]}>
                  <Text modifiers={[font({ textStyle: 'caption' }), foregroundStyle(Nocturne.text3)]}>{t('settings.version', { version: appVersion() })}</Text>
                  <Text modifiers={[font({ textStyle: 'caption' }), foregroundStyle(Nocturne.text3), multilineTextAlignment('center')]}>{signOff()}</Text>
                </VStack>
                <CenteredButton title={t('settings.fireLoc')} onPress={fireLoc} />
              </Section>
            </Form>
            <Toolbar.Content>
              {/* The page slid up out of the strip, so the way out points back down. */}
              <ToolbarItem placement="topBarLeading">
                <Button
                  label={t('settings.close')}
                  systemImage="chevron.down"
                  onPress={() => {
                    haptic.tap();
                    onClose();
                  }}
                  modifiers={[foregroundStyle(Nocturne.text2)]}
                />
              </ToolbarItem>
            </Toolbar.Content>
          </Toolbar>

          <NavigationDestination value={ROUTE_SUBSCRIPTION}>
            <Form modifiers={page(t('subscription.title'))}>
              {/* The plan shown, not a row: its name and what's next for it. */}
              <Section>
                <VStack spacing={4} modifiers={[frame({ maxWidth: 10_000 }), padding({ vertical: 12 })]}>
                  <Text modifiers={[font({ textStyle: 'title2', weight: 'bold' }), foregroundStyle(Nocturne.text)]}>{planName}</Text>
                  <Text modifiers={[font({ textStyle: 'subheadline' }), foregroundStyle(Nocturne.text2), multilineTextAlignment('center')]}>
                    {s.planNote}
                  </Text>
                </VStack>
              </Section>

              <Section>
                {/* Apple's sheet: switch between Annual and Monthly in the group. */}
                <Row icon="arrow.left.arrow.right" title={t('subscription.changePlan')} onPress={s.manage} />
                {/* Cancelled, not run out yet: Apple's sheet turns renewal back on. Up here with what acts
                    on the plan, so it isn't read as a second Restore (user 2026-11-11). */}
                {s.ending ? <Row icon="arrow.clockwise" title={t('subscription.resubscribe')} onPress={s.manage} /> : null}
                {/* Only someone in a trial has a reminder to switch off. */}
                {s.inTrial ? <SwitchRow icon="bell" title={t('subscription.trialReminder')} value={s.alerts.trial} onChange={s.toggle('trial')} /> : null}
              </Section>

              <Section>
                <BareRow title={t('settings.restore')} value={s.restoring ? t('settings.checking') : undefined} onPress={s.restorePurchases} />
              </Section>

              {/* The cancel flow on its way to Apple's sheet (features/cancel), last and in red. Already
                  cancelled, there's nothing to cancel (Resubscribe, above). */}
              {s.ending ? null : (
                <Section>
                  <CenteredButton title={t('subscription.cancel')} onPress={cancelSubscription} />
                </Section>
              )}
            </Form>
          </NavigationDestination>

          {/* Picked here, the app, the blocked-app screen and the notifications all switch (lib/i18n/store.ts).
              iOS's own prompts follow the iPhone's language. */}
          <NavigationDestination value={ROUTE_LANGUAGE}>
            <Form modifiers={page(t('language.title'))}>
              <Section footer={<Footnote>{t('language.footer')}</Footnote>}>
                <LanguageRow
                  title={t('language.system')}
                  detail={t('language.systemNote', { language: LANGUAGES.find((l) => l.code === systemLanguage())!.name })}
                  picked={language === 'system'}
                  onPress={() => pickLanguage('system')}
                />
              </Section>
              <Section>
                {LANGUAGES.map((l) => (
                  <LanguageRow key={l.code} title={l.name} detail={l.english} picked={language === l.code} onPress={() => pickLanguage(l.code)} />
                ))}
              </Section>
            </Form>
          </NavigationDestination>
        </NavigationStack>
      </Host>
    </View>
  );
}

/** A grey row with no icon and no card, for what's rarely needed. */
function BareRow({ title, value, onPress }: { title: string; value?: string; onPress: () => void }): ReactElement {
  return (
    <Button
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      modifiers={BARE}
    >
      <HStack>
        <Title grey>{title}</Title>
        <Spacer />
        {value ? <Value>{value}</Value> : null}
        <Chevron />
      </HStack>
    </Button>
  );
}

/** A language: its name, a grey line under it, and the system's checkmark on the one in use. */
function LanguageRow({ title, detail, picked, onPress }: { title: string; detail: string; picked: boolean; onPress: () => void }) {
  return (
    <Button onPress={onPress} modifiers={[accessibilityLabel(`${title}, ${detail}`)]}>
      <HStack spacing={12}>
        <VStack alignment="leading" spacing={2}>
          <Title>{title}</Title>
          <Text modifiers={[font({ textStyle: 'footnote' }), foregroundStyle(Nocturne.text2)]}>{detail}</Text>
        </VStack>
        <Spacer />
        {picked ? <Image systemName="checkmark" size={15} color={Nocturne.text} modifiers={[font({ weight: 'semibold' })]} /> : null}
      </HStack>
    </Button>
  );
}

/** Grey small print under a section, centered like the headings. */
const Footnote = ({ children }: { children: string }) => (
  <Text modifiers={[font({ textStyle: 'footnote' }), foregroundStyle(Nocturne.text3), frame({ maxWidth: 10_000 }), multilineTextAlignment('center')]}>
    {children}
  </Text>
);
