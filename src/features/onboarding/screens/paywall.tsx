'use no memo';
// Rendered from onboarding-flow, which reads the App Group during render (the React Compiler
// would cache those reads, #130): kept out with it, so nothing here is cached across them.

import { SymbolView } from 'expo-symbols';
import { Linking, Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { PrimaryButton, TextButton } from '@/components/buttons';
import { Reveal } from '@/components/motion';
import * as haptic from '@/lib/haptics';
import { LEGAL_URLS } from '@/lib/links';
import { annualSavingsPercent, isStubbed, perMonth, reminderDay, type Offer } from '@/lib/purchases';
import { Gap, Nocturne, Radius, Space, Type, VoiceSize } from '@/theme';

import { methodCopy, NEW_YEAR, trialVoice } from '../content';
import { dateFromToday, formatWhen } from '../estimate';
import type { StepContext, StepView } from '../steps';
import { Body, page, Voice } from '../ui';

/*
 * The two money screens: the plan picker, and the one-time offer for people who close it.
 * Each returns a StepView like the cases in steps.tsx. Every price and trial string comes
 * from the store's offers (`getOffers` in src/lib/purchases.ts), never a constant.
 */

const RENEWAL = 'Auto-renews unless cancelled at least 24 hours before renewal.';

/** While the App Store's prices load, or if they can't: never a made-up price. */
export function storeStep({ offersFailed, retryOffers }: StepContext): StepView {
  return {
    body: (
      <View style={page.top}>
        <Voice
          text={offersFailed ? 'The App Store isn’t answering.' : 'Asking the App Store for prices.'}
          size={VoiceSize.headline}
          header
        />
        {offersFailed ? (
          <>
            <View style={page.gapHeadline} />
            <Body>Check your connection and try again. Your setup is saved either way.</Body>
          </>
        ) : null}
      </View>
    ),
    footer: offersFailed ? <PrimaryButton label="Try again" onPress={retryOffers} /> : undefined,
  };
}

/**
 * The paywall, after the user's two references: a dark card paywall (title, checklist,
 * radio plan rows) with the plant app's plan list (Annual, Monthly, reminder toggle).
 * Lifetime was dropped: at $99.99 next to a $59.99 annual it skipped the trial and capped LTV. Annual is selected by default and shows its per-month price. Apple 3.1.2: the
 * billed amount stays the biggest price on each card, and per-month sits under it.
 * No struck-through "was" prices: there was never a higher price to strike.
 */
export function plansStep(ctx: StepContext): StepView {
  const { answers, set, buy, busy, restorePurchases, compact, offers } = ctx;
  if (!offers) return storeStep(ctx);
  const bed = formatWhen(answers.bedtime);
  const method = methodCopy(answers.method ?? 'downstairs');
  const trialDays = offers.annual.trialDays;
  const annual = offers.annual.priceString;
  const monthly = offers.monthly.priceString;
  const plan = answers.plan;
  const trialPlan = plan === 'annual' && trialDays !== null;
  const remindBefore = trialDays !== null ? trialDays - reminderDay(trialDays) : 2;
  // The billed price stays on the button that buys (Apple 3.1.2), as the exit offer's does.
  const cta = {
    annual: trialDays
      ? { title: `Start ${trialDays}-day free trial`, sub: `Then ${annual}/year · cancel anytime` }
      : { title: `Subscribe for ${annual}/year`, sub: 'Cancel anytime in Settings' },
    monthly: { title: `Subscribe for ${monthly}/month`, sub: 'Billed today · cancel anytime' },
  }[plan];
  const summary = {
    annual: trialDays
      ? `Free until ${dateFromToday(trialDays)}, then ${annual}/year.`
      : `${annual}/year. Cancel anytime.`,
    monthly: `${monthly} today, then monthly. Cancel anytime.`,
  }[plan];
  const terms = {
    annual: `${trialDays ? `${trialDays} days free, then ${annual}/year from ${dateFromToday(trialDays)}` : `${annual}/year`}. ${RENEWAL}`,
    monthly: `${monthly}/month. ${RENEWAL}`,
  }[plan];
  return {
    body: (
      <View style={[styles.paywall, compact && styles.paywallCompact]}>
        <Reveal>
          <Text style={[styles.paywallTitle, compact && styles.paywallTitleCompact]} accessibilityRole="header">
            {/* Never "Try free": Apple 3.1.2 rejects trial wording that's bigger than the billed price. */}
            Pick a plan
          </Text>
        </Reveal>
        {compact ? null : (
          <View style={styles.paywallVoice}>
            <Voice
              // New Year week: no sale, and he says so (D8). The trial is on the cards and the button.
              text={ctx.newYear ? NEW_YEAR.plans : trialDays ? trialVoice(trialDays) : 'Fine. I’ll get up for this.'}
              size={VoiceSize.aside}
              delay={500}
              sub
              center
            />
          </View>
        )}
        <View style={[styles.checks, compact && styles.checksCompact]}>
          {/* Never an app's name: Apple's picker only hands back opaque tokens. */}
          <Check text={`Your apps sleep at ${bed}`} />
          <Check text={method.check} />
          <Check text="Passes for sick days and travel" />
        </View>
        <View accessibilityRole="radiogroup" style={styles.planCards}>
          <PlanCard
            selected={plan === 'annual'}
            onPress={() => set('plan', 'annual')}
            title="Annual"
            // The billed amount is the big number (App Review 3.1.2); the monthly equivalent is the detail.
            price={`${annual}/year`}
            detail={`${perMonth(offers.annual)}/month${trialDays ? ` · ${trialDays} days free` : ''}`}
            badge={`Save ${annualSavingsPercent(offers)}%`}
            compact={compact}
          />
          <PlanCard
            selected={plan === 'monthly'}
            onPress={() => set('plan', 'monthly')}
            title="Monthly"
            price={`${monthly}/month`}
            detail={offers.monthly.trialDays ? `${offers.monthly.trialDays} days free` : 'No free trial'}
            compact={compact}
          />
        </View>
        {/* One plain sentence about what happens next, at reading size rather than in the fine print. */}
        <Text style={styles.planSummary}>{summary}</Text>
        {/* Only the trial has an end to be reminded about. Keeps its height so the page doesn't jump. */}
        <View style={[styles.remindRow, !trialPlan && styles.hiddenBlock, { pointerEvents: trialPlan ? 'auto' : 'none' }]}>
          <Text style={styles.remindLabel}>{`Remind me ${remindBefore} days before it ends`}</Text>
          <Switch
            value={answers.remindTrial}
            onValueChange={(on) => {
              haptic.tap();
              set('remindTrial', on);
            }}
            trackColor={{ false: Nocturne.track, true: Nocturne.cta }}
            thumbColor={answers.remindTrial ? Nocturne.onCta : Nocturne.text}
            ios_backgroundColor={Nocturne.track}
            // react-native-web colors the "on" thumb teal unless told otherwise.
            {...(Platform.OS === 'web' ? ({ activeThumbColor: Nocturne.onCta } as object) : {})}
            accessibilityLabel={`Remind me ${remindBefore} days before the trial ends`}
          />
        </View>
      </View>
    ),
    // The terms sit right above the button that buys, so the button keeps the same spot as every other screen.
    footer: (
      <>
        <Text style={styles.paywallFine}>
          {terms} {isStubbed() ? 'Preview: nothing is charged. ' : ''}
          <FineLink label="Restore" onPress={restorePurchases} /> · <FineLink label="Terms" url={LEGAL_URLS.terms} /> ·{' '}
          <FineLink label="Privacy" url={LEGAL_URLS.privacy} />
        </Text>
        <TwoLineCta title={cta.title} sub={cta.sub} busy={busy} onPress={() => buy(plan)} />
      </>
    ),
  };
}

/**
 * One real offer for people who closed the paywall, picked by the exit-offer test
 * (`EXIT_OFFERS` in content.ts): half-price annual, or full-price annual with a longer
 * trial. Shown once per install (`markExitOfferShown`; a second exit really exits), and no
 * timer. The full price is named as a plain comparison, never struck through.
 */
export function declinedStep(ctx: StepContext): StepView {
  const { exitArm, buy, busy, exit, offers, compact, restorePurchases } = ctx;
  const offer: Offer | undefined = offers && exitArm !== 'none' ? offers.exitOffers[exitArm] : undefined;
  if (!offers || exitArm === 'none' || !offer) return storeStep(ctx);
  const longer = exitArm === 'longer-trial';
  const days = offer.trialDays;
  const full = offers.annual.priceString;
  const price = offer.priceString;
  const usual = offers.annual.trialDays;
  return {
    body: (
      <View style={page.top}>
        {/* Apple 3.1.2: the billed price is the biggest number here, and no trial wording outranks it. */}
        <Voice text={longer ? 'Fair. Take longer to decide.' : 'Fair. Half price, then.'} size={VoiceSize.headline} header />
        <View style={page.gapHeadline} />
        <Text style={styles.offerPrice}>{`${price}/year`}</Text>
        <Body>
          {longer
            ? `${days} days free${usual ? ` instead of ${usual}` : ''} before it starts. This screen only shows once.`
            : `Instead of ${full}${days ? `, still with ${days} days free` : ''}. This screen only shows once.`}
        </Body>
        {/* Short phones drop his aside so the leave line isn't clipped by the price above. */}
        {compact ? null : (
          <>
            <View style={page.gapAside} />
            <Voice text="Don’t tell the others." size={VoiceSize.aside} delay={600} sub />
          </>
        )}
        <View style={page.gapSection} />
        <Body>Or leave. Your setup is saved, and nothing locks unless you start.</Body>
      </View>
    ),
    footer: (
      <>
        <Text style={styles.paywallFine}>
          {`${days ? `${days} days free, then ${price}/year from ${dateFromToday(days)}` : `${price}/year`}. Auto-renews at ${price}/year unless cancelled at least 24 hours before renewal.`}{' '}
          {isStubbed() ? 'Preview: nothing is charged. ' : ''}
          <FineLink label="Restore" onPress={restorePurchases} /> · <FineLink label="Terms" url={LEGAL_URLS.terms} /> ·{' '}
          <FineLink label="Privacy" url={LEGAL_URLS.privacy} />
        </Text>
        <TwoLineCta
          title={days ? `Start ${days}-day free trial` : `Subscribe for ${price}/year`}
          sub={days ? `Then ${price}/year · cancel anytime` : 'Cancel anytime in Settings'}
          busy={busy}
          onPress={() => buy(exitArm)}
        />
      </>
    ),
    secondary: <TextButton label="No thanks" onPress={exit} />,
  };
}

/** An underlined link in the fine print: a web page, or an action like Restore. */
function FineLink({ label, url, onPress }: { label: string; url?: string; onPress?: () => void }) {
  return (
    <Text
      accessibilityRole="link"
      style={styles.link}
      onPress={() => {
        if (onPress) onPress();
        else if (url) Linking.openURL(url).catch(() => {});
      }}
    >
      {label}
    </Text>
  );
}

function Check({ text }: { text: string }) {
  return (
    <View style={styles.checkRow}>
      <SymbolView name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }} size={20} tintColor={Nocturne.text} />
      <Text style={styles.checkText} numberOfLines={2}>
        {text}
      </Text>
    </View>
  );
}


/** Blinkist's pinned button: the action on top, the reassurance underneath, in one pill. */
function TwoLineCta({ title, sub, busy, onPress }: { title: string; sub: string; busy?: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      // While Apple's purchase sheet is up, a second tap would start a second purchase.
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${sub}`}
      accessibilityState={{ busy: !!busy, disabled: !!busy }}
      style={({ pressed }) => [styles.twoLineCta, (pressed || busy) && styles.pressedCta]}
    >
      <Text style={styles.twoLineTitle}>{title}</Text>
      <Text style={styles.twoLineSub}>{sub}</Text>
    </Pressable>
  );
}

/** One plan on the paywall: radio, name and badge on top, billed price, then the detail line. */
function PlanCard({
  selected,
  onPress,
  title,
  price,
  detail,
  badge,
  compact,
}: {
  selected: boolean;
  onPress: () => void;
  title: string;
  price: string;
  detail: string;
  badge?: string;
  compact?: boolean;
}) {
  return (
    <Pressable
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${title}, ${price}. ${detail}${badge ? `. ${badge.replace('%', ' percent')}` : ''}`}
      style={[styles.planOption, compact && styles.planOptionCompact, selected && styles.planOptionSelected]}
    >
      <View style={[styles.radio, selected && styles.radioOn]}>
        {selected ? <View style={styles.radioDot} /> : null}
      </View>
      <View style={styles.fill}>
        <View style={styles.planOptionTop}>
          <Text style={styles.planOptionTitle}>{title}</Text>
          {badge ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.planOptionPrice}>{price}</Text>
        <Text style={styles.planOptionDetail}>{detail}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  hiddenBlock: { opacity: 0 },

  // The paywall: centred like the quiz, but anchored at the top like every other page.
  paywall: { flex: 1, paddingTop: Gap.pageTop },
  // Short phones have no spare height: start right under the top bar so the title never clips.
  paywallCompact: { paddingTop: 0 },
  paywallTitle: { color: Nocturne.text, ...Type.title, textAlign: 'center' },
  paywallTitleCompact: Type.quizTitle,
  paywallVoice: { marginTop: Space.s },
  checks: { gap: Space.s, marginTop: Space.l, alignSelf: 'center' },
  checksCompact: { marginTop: Space.s, gap: Space.xs },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: Space.s },
  checkText: { color: Nocturne.text, ...Type.body, flexShrink: 1 },
  planCards: { gap: Space.m, marginTop: Space.l, marginBottom: Space.m },
  planOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.m,
    borderRadius: Radius.card,
    paddingHorizontal: Space.l,
    paddingVertical: Space.m,
    backgroundColor: Nocturne.surface,
    // Always 2 wide, so selecting a plan never nudges the layout.
    borderWidth: 2,
    borderColor: Nocturne.edge,
  },
  planOptionCompact: { paddingVertical: Space.s },
  planOptionSelected: { borderColor: Nocturne.text, backgroundColor: Nocturne.raised },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Nocturne.text2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderColor: Nocturne.text, backgroundColor: Nocturne.text },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Nocturne.onCta },
  planOptionTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Space.s },
  planOptionTitle: { color: Nocturne.text, fontSize: 17, fontWeight: '700' },
  // Apple 3.1.2: the billed price is the largest; the per-month line sits under it, smaller.
  planOptionPrice: { color: Nocturne.text, fontSize: 19, fontWeight: '700', marginTop: 2, fontVariant: ['tabular-nums'] },
  planOptionDetail: { color: Nocturne.text, opacity: 0.75, fontSize: 14, marginTop: 1, fontVariant: ['tabular-nums'] },
  badge: { backgroundColor: Nocturne.cta, borderRadius: Radius.pill, paddingHorizontal: 9, paddingVertical: 3 },
  badgeText: { color: Nocturne.onCta, fontSize: 11, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
  // One plain sentence about what happens next, white because it's the line to read first.
  planSummary: { color: Nocturne.text, ...Type.secondary, textAlign: 'center', marginBottom: Space.xs },
  // Centred as one group, like the checklist above it.
  remindRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Space.m, minHeight: 44 },
  remindLabel: { color: Nocturne.text, ...Type.secondary, flexShrink: 1 },
  twoLineCta: {
    minHeight: 60,
    borderRadius: Radius.pill,
    backgroundColor: Nocturne.cta,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  pressedCta: { opacity: 0.8 },
  twoLineTitle: { color: Nocturne.onCta, fontSize: 18, fontWeight: '700' },
  twoLineSub: { color: Nocturne.onCta, opacity: 0.7, fontSize: 13, fontWeight: '500', marginTop: 1 },
  offerPrice: { color: Nocturne.text, ...Type.title, fontVariant: ['tabular-nums'], marginBottom: Space.xs },
  paywallFine: { color: Nocturne.text2, ...Type.legal, textAlign: 'center' },
  link: { color: Nocturne.text, textDecorationLine: 'underline' },
});
