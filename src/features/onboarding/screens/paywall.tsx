'use no memo';
// Rendered from onboarding-flow, which reads the App Group during render (the React Compiler
// would cache those reads, #130): kept out with it, so nothing here is cached across them.

import { SymbolView } from 'expo-symbols';
import { useRef, useState, type ReactNode } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/text';

import { PrimaryButton } from '@/components/buttons';
import { GlassCard } from '@/components/glass-card';
import * as haptic from '@/lib/haptics';
import { LEGAL_URLS } from '@/lib/links';
import { annualSavingsPercent, perMonth, type Offer } from '@/lib/purchases';
import { Nocturne, Space, Type, VoiceSize } from '@/theme';

import { methodCopy, plansHeadline } from '../content';
import { formatWhen, leadFor, weeklyAmount, weeklyParts } from '../estimate';
import { AverageCompare } from './average-compare';
import { NightCompare } from './night-compare';
import { PaywallLoc } from './paywall-loc';
import type { StepContext, StepView } from '../steps';
import { Body, page, Voice } from '../ui';

/*
 * The two money screens: the plan picker, and the one-time offer for people who close it.
 * Each returns a StepView like the cases in steps.tsx. Every price and trial string comes
 * from the store's offers (`getOffers` in src/lib/purchases.ts), never a constant.
 */

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
  const { answers, numbers, set, buy, busy, compact, offers } = ctx;
  if (!offers) return storeStep(ctx);
  // A light user (or one who skipped) has no night worth comparing: the average week instead (user 2026-10-27).
  const compare = numbers.lightUser ? <AverageCompare /> : (
    <NightCompare
      bedtime={answers.bedtime}
      wake={answers.wake}
      nightMinutes={answers.nightMinutes ?? 0}
      morningMinutes={answers.morningMinutes ?? 0}
      method={answers.method ?? 'steps'}
      morningFirst={answers.pain === 'morning'}
    />
  );
  const method = methodCopy(answers.method ?? 'steps');
  // The branch's own end of the night, when it's big enough to lead with (`leadFor`).
  const lead = leadFor(numbers, answers.pain, answers.worstTime);
  const firstCheck = !ctx.scheduledNight
    ? 'Turn nights on in Routine anytime'
    : answers.pain === 'night'
      ? `Asleep from ${formatWhen(answers.bedtime)} on your nights`
      : method.check;
  const trialDays = offers.annual.trialDays;
  const annual = offers.annual.priceString;
  const monthly = offers.monthly.priceString;
  const plan = answers.plan;
  const trialPlan = plan === 'annual' && trialDays !== null;
  // The billed price is the line right under the button (Calm, Cal AI), not on it.
  const cta = trialPlan ? 'Try free and subscribe' : 'Subscribe';
  // One line under the button (user 2026-11-05): the billed price after the trial (Apple 3.1.2), then the
  // Terms, Privacy and Restore links under it, small, like the reference.
  const terms = {
    annual: trialDays ? `${trialDays} days free, then ${annual}/year. Cancel anytime.` : `${annual}/year. Cancel anytime.`,
    monthly: `${monthly}/month. Cancel anytime.`,
  }[plan];
  return {
    body: (
      <FitPage style={styles.paywall}>
        {(tight) => (
          <>
        {/* The payoff where they decide: their own hours, spent on what they picked on
            `time-back` (docs/ONBOARDING_MOBBIN.md). No trial wording up here: Apple 3.1.2 wants
            the billed price at least as clear as "free", so "free" stays on the button with the
            price right under it. A light user has no hours to sell. */}
        <Voice
          // No number of their own to lead with: the outcome instead (user 2026-11-05: "The boring bit" won't convert).
          text={numbers.lightUser ? 'Your apps sleep. So do you.' : plansHeadline(weeklyAmount(lead.minutes))}
          // Their number in the reveal's blue, so it reads as the same number they saw there.
          accent={numbers.lightUser ? undefined : String(weeklyParts(lead.minutes).count)}
          size={compact ? 26 : 30}
          header
          center
        />
        {/* Their usual night next to the night with him: what the price buys, in their times.
            One heading only (Cal AI, user 2026-10-27): the plans and the button do the rest. */}
        {compare ? <View style={[styles.compare, compact && styles.compareCompact]}>{compare}</View> : null}
        {/* Short phones have room for one of the two: the comparison says more. So does a
            long headline that wraps (`FitPage`): the plans are never the ones clipped. */}
        {(compact || tight) && compare ? null : (
          <View style={[styles.checks, compact && styles.checksCompact]}>
            {/* Never an app's name: Apple's picker only hands back opaque tokens. Bedtime is in
                his line above, so the list starts at the morning, then the way out. */}
            <Check text={firstCheck} />
            {/* Two passes a month are the only way out early (PASSES_PER_MONTH, decided 2026-10-14). */}
            <Check text="Two passes a month for bad days" />
            {/* Overall: the daytime half is real in v1 (GAME_PLAN, Daytime controls), so say it once. */}
            <Check text={answers.pain === 'overall' ? 'Daytime schedules and limits too' : 'Only the apps you pick'} />
          </View>
        )}
        {/* The plans sit on the button, as Cal AI's do: the chosen one full, the other one slim. */}
        <View style={styles.fill} />
        {/* Drawn before the cards, so the Annual card's top edge covers his base like a ledge. */}
        {compact ? null : <PaywallLoc plan={plan} />}
        <View accessibilityRole="radiogroup" style={[styles.planCards, !compact && styles.planCardsUnderLoc]}>
          <PlanCard
            selected={plan === 'annual'}
            onPress={() => set('plan', 'annual')}
            name="Annual"
            // The billed amount is the big number (App Review 3.1.2); the monthly equivalent sits at the side.
            price={`${annual}/year`}
            detail={`Save ${annualSavingsPercent(offers)}%`}
            side={`${perMonth(offers.annual)}/mo`}
            band={trialDays ? `${trialDays} days free` : undefined}
          />
          <PlanCard
            selected={plan === 'monthly'}
            onPress={() => set('plan', 'monthly')}
            name="Monthly"
            price={`${monthly}/month`}
            detail={offers.monthly.trialDays ? `${offers.monthly.trialDays} days free` : 'No free trial'}
          />
        </View>
          </>
        )}
      </FitPage>
    ),
    // Calm's pairing (user 2026-10-27): the button says try free, the price sits right under it.
    footer: (
      <UnderCta>
        <PrimaryButton label={cta} disabled={busy} onPress={() => buy(plan)} />
        <View style={styles.underCta}>
          <Text style={styles.underCtaText} numberOfLines={1} adjustsFontSizeToFit>
            {terms}
          </Text>
          <Text style={styles.legal}>
            <Text accessibilityRole="link" onPress={() => Linking.openURL(LEGAL_URLS.terms).catch(() => {})}>
              Terms of Use
            </Text>
            {'  ·  '}
            <Text accessibilityRole="link" onPress={() => Linking.openURL(LEGAL_URLS.privacy).catch(() => {})}>
              Privacy Policy
            </Text>
            {'  ·  '}
            <Text accessibilityRole="button" onPress={ctx.restorePurchases}>
              Restore
            </Text>
          </Text>
        </View>
      </UnderCta>
    ),
  };
}

/**
 * One real offer for people who closed the paywall, picked by the exit-offer test
 * (`EXIT_OFFERS` in content.ts): half-price annual, or full-price annual with a longer
 * trial. Shown once per install (`markExitOfferShown`; a second exit really exits), and no
 * timer. Half price strikes the full annual price through, as Sunlitt does (user 2026-11-05).
 */
export function declinedStep(ctx: StepContext): StepView {
  const { exitArm, buy, busy, offers } = ctx;
  const offer: Offer | undefined = offers && exitArm !== 'none' ? offers.exitOffers[exitArm] : undefined;
  if (!offers || exitArm === 'none' || !offer) return storeStep(ctx);
  const longer = exitArm === 'longer-trial';
  const days = offer.trialDays;
  const full = offers.annual.priceString;
  const price = offer.priceString;
  const monthly = perMonth(offer);
  // Sunlitt's one-time offer (user 2026-11-05): eyebrow, headline, the price alone mid-screen,
  // one "gone forever" line over the button, "Cancel anytime" under it. The top bar's Exit is the way out.
  return {
    body: (
      <View style={[page.top, styles.offerPage]}>
        <Text style={styles.offerEyebrow}>One-time offer</Text>
        <Voice text={longer ? 'Fair. Take longer to decide.' : 'Half price, every year.'} size={VoiceSize.headline} header />
        {/* Longer trial: the free days are the big line, the monthly price under it (user 2026-11-05). */}
        <View style={styles.offerMiddle}>
          {longer ? null : <Text style={styles.offerWas}>{full}</Text>}
          {longer ? (
            <Text style={styles.offerPrice}>{`${days} days free`}</Text>
          ) : (
            <Text style={styles.offerPrice}>
              {price}
              <Text style={styles.offerPer}>/year</Text>
            </Text>
          )}
          <Text style={styles.offerSub}>
            {longer
              ? `Just ${monthly.replace(/[.,]00$/, '')} a month after`
              : `It's less than ${monthly}/month${days ? `,\nstill ${days} days free` : ''}.`}
          </Text>
        </View>
      </View>
    ),
    footer: (
      <>
        <Text style={styles.offerGone}>Close this page, and it’s gone forever.</Text>
        <PrimaryButton label="Continue" disabled={busy} onPress={() => buy(exitArm)} />
      </>
    ),
    secondary: (
      <View style={styles.cancelAnytime}>
        <SymbolView name={{ ios: 'checkmark', android: 'check', web: 'check' }} size={12} weight="semibold" tintColor={Nocturne.text2} />
        <Text style={styles.cancelAnytimeText}>Cancel anytime</Text>
      </View>
    ),
  };
}

/** The footer's bottom space under the button: the shell's own padding plus the footer's (ui.tsx). */
const UNDER_ROOM = Space.xl;
/** The two small lines under the button (no links: user 2026-10-27), with their gap above. */
const UNDER_HEIGHT = Space.s + 2 * 15;

/**
 * The button where every page has it, with the price lines hung below it in the bottom space.
 * A phone without a home bar has less of that space, so there the button lifts just enough.
 */
function UnderCta({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const room = UNDER_ROOM + Math.max(insets.bottom, Space.l);
  return <View style={{ marginBottom: Math.max(0, UNDER_HEIGHT - room) }}>{children}</View>;
}

/**
 * The page at its natural height, told whether it's taller than the space it has: the copy
 * changes with the answers (a goal that wraps the headline), so a fixed layout can't promise
 * a fit (user's phone, 2026-10-27). Once tight it stays tight, so dropping a block can't flip it back.
 */
function FitPage({ style, children }: { style: object; children: (tight: boolean) => ReactNode }) {
  // Either layout can land first, so both are kept and either one checks.
  const size = useRef({ room: 0, page: 0 });
  const [tight, setTight] = useState(false);
  // At least the room's height, so a spacer inside can push the plans down onto the button.
  const [room, setRoom] = useState(0);
  const measure = (next: Partial<typeof size.current>) => {
    const both = (size.current = { ...size.current, ...next });
    if (both.room > 0 && both.page > both.room + 1) setTight(true);
  };
  return (
    <View
      style={styles.room}
      onLayout={(e) => {
        setRoom(e.nativeEvent.layout.height);
        measure({ room: e.nativeEvent.layout.height });
      }}
    >
      <View style={[style, styles.natural, { minHeight: room }]} onLayout={(e) => measure({ page: e.nativeEvent.layout.height })}>
        {children(tight)}
      </View>
    </View>
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


/**
 * One plan on the paywall, after Cal AI's: the chosen plan is a full card (a band on top when it
 * has a trial), the other a slim, dimmed row. Billed price biggest (3.1.2), per-month at the side.
 */
function PlanCard({
  selected,
  onPress,
  name,
  price,
  detail,
  side,
  band,
}: {
  selected: boolean;
  onPress: () => void;
  name: string;
  price: string;
  detail: string;
  side?: string;
  band?: string;
}) {
  return (
    <Pressable
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${name}, ${price}. ${detail}${band ? `. ${band}` : ''}`}
    >
      {/* The smoked card the rest of the app uses (user 2026-11-05: the grey boxes looked cheap). */}
      <GlassCard dark rim={selected ? Nocturne.text : undefined} rimWidth={selected ? 2 : undefined}>
      {band ? (
        <View style={[styles.band, selected && styles.bandSelected]}>
          <Text style={[styles.bandText, selected && styles.bandTextSelected]}>{band}</Text>
        </View>
      ) : null}
      <View style={[styles.planRow, !selected && styles.planRowDim]}>
        <View style={[styles.radio, selected && styles.radioOn]}>
          {selected ? (
            <SymbolView name={{ ios: 'checkmark', android: 'check', web: 'check' }} size={12} weight="bold" tintColor={Nocturne.onCta} />
          ) : null}
        </View>
        {/* Not chosen: one slim line, its name and its billed price (Cal AI's Monthly row). */}
        {selected ? (
          <>
            <View style={styles.fill}>
              <Text style={styles.planOptionPrice}>{price}</Text>
              <Text style={styles.planOptionDetail}>{`${name} · ${detail}`}</Text>
            </View>
            {side ? <Text style={styles.planSide}>{side}</Text> : null}
          </>
        ) : (
          <>
            <Text style={[styles.planName, styles.fill]}>{name}</Text>
            <Text style={styles.planSide}>{price}</Text>
          </>
        )}
      </View>
      </GlassCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  hiddenBlock: { opacity: 0 },

  // The paywall: centred like the quiz, but anchored at the top like every other page.
  // Heading right under the top bar, as Calm's sits under its X, then a little higher (user 2026-10-27).
  paywall: { flex: 1, marginTop: -Space.m },
  // Inside `FitPage`: its own height, so it can be measured against the room.
  natural: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto' },
  // The height the page has, never its content's (web lets a flex child grow past it).
  room: { flex: 1, minHeight: 0 },
  paywallTitle: { color: Nocturne.text, ...Type.heading, textAlign: 'center' },
  paywallTitleCompact: Type.headingCompact,
  // Room to breathe: the plans sit on the button now, so the top half has height to spare.
  compare: { marginTop: Space.xl },
  compareCompact: { marginTop: Space.m },
  checks: { gap: Space.m, marginTop: Space.l, alignSelf: 'center' },
  checksCompact: { marginTop: Space.s, gap: Space.xs },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: Space.s },
  checkText: { color: Nocturne.text, ...Type.body, flexShrink: 1 },
  planCards: { gap: Space.s, marginTop: Space.m },
  // Loc's base is the card's top edge: no gap between them.
  planCardsUnderLoc: { marginTop: 0 },
  // The card clips the band to its corners; the rim is drawn over both.
  band: { backgroundColor: 'rgba(255,255,255,0.10)', paddingVertical: 4, alignItems: 'center' },
  bandSelected: { backgroundColor: Nocturne.text },
  bandText: { color: Nocturne.text, fontSize: 12, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
  bandTextSelected: { color: Nocturne.onCta },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: Space.m, paddingHorizontal: Space.l, paddingVertical: Space.m },
  // Quieter than the chosen plan, never hidden: too dim reads as burying the cheaper option.
  planRowDim: { opacity: 0.75 },
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
  // Apple 3.1.2: the billed price is the largest; the per-month price at the side is smaller.
  planOptionPrice: { color: Nocturne.text, fontSize: 18, fontWeight: '700', fontVariant: ['tabular-nums'] },
  planOptionDetail: { color: Nocturne.text, opacity: 0.75, fontSize: 14, marginTop: 1 },
  planName: { color: Nocturne.text, fontSize: 17, fontWeight: '600' },
  planSide: { color: Nocturne.text2, fontSize: 14, fontVariant: ['tabular-nums'] },
  offerPage: { alignItems: 'center' },
  offerEyebrow: {
    color: Nocturne.text2,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: Space.s,
  },
  offerMiddle: { flex: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', paddingBottom: Space.xl },
  offerWas: { color: Nocturne.text2, fontSize: 17, textDecorationLine: 'line-through', fontVariant: ['tabular-nums'] },
  offerPrice: { color: Nocturne.text, fontSize: 44, lineHeight: 52, fontWeight: '700', fontVariant: ['tabular-nums'], textAlign: 'center' },
  offerPer: { fontSize: 20, fontWeight: '600', color: Nocturne.text2 },
  offerSub: { color: Nocturne.text2, fontSize: 14, lineHeight: 19, textAlign: 'center', marginTop: Space.s },
  offerGone: { color: Nocturne.text, opacity: 0.85, fontSize: 15, textAlign: 'center', marginBottom: Space.m },
  cancelAnytime: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  cancelAnytimeText: { color: Nocturne.text2, fontSize: 14, fontWeight: '500' },
  // Out of the flow, so the button sits where every other page's does (user 2026-10-27).
  underCta: { position: 'absolute', top: '100%', left: 0, right: 0, marginTop: Space.s },
  underCtaText: { color: Nocturne.text, opacity: 0.85, fontSize: 12, lineHeight: 15, fontWeight: '600', textAlign: 'center' },
  legal: { color: Nocturne.text2, fontSize: 11, lineHeight: 14, textAlign: 'center', marginTop: Space.xs },
});
