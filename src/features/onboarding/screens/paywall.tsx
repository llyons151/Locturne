'use no memo';
// Rendered from onboarding-flow, which reads the App Group during render (the React Compiler
// would cache those reads, #130): kept out with it, so nothing here is cached across them.

import { SymbolView } from 'expo-symbols';
import { useRef, useState, type ReactNode } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/text';

import { PrimaryButton, TextButton } from '@/components/buttons';
import * as haptic from '@/lib/haptics';
import { LEGAL_URLS } from '@/lib/links';
import { annualSavingsPercent, isStubbed, perMonth, reminderDay, type Offer } from '@/lib/purchases';
import { Nocturne, Radius, Space, Type, VoiceSize } from '@/theme';

import { methodCopy, plansHeadline } from '../content';
import { dateFromToday, formatWhen, leadFor, weeklyAmount, weeklyParts } from '../estimate';
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
  const remindBefore = trialDays !== null ? trialDays - reminderDay(trialDays) : 2;
  const terms = {
    annual: trialDays ? `${trialDays} days free, then ${annual}/year from ${dateFromToday(trialDays)}.` : `${annual}/year, billed today.`,
    monthly: `${monthly}/month, billed today.`,
  }[plan];
  // The trial's fear is the charge: say the reminder out loud (Calm, Jomo). "Remind me" is on by default.
  const reassure = trialPlan && answers.remindTrial ? `We’ll remind you ${remindBefore} days before. Cancel anytime.` : 'Cancel anytime.';
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
          text={numbers.lightUser ? 'Right. The boring bit.' : plansHeadline(weeklyAmount(lead.minutes), answers.timeBack)}
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
          <Text style={styles.underCtaText}>{terms}</Text>
          <Text style={styles.underCtaText}>{reassure}</Text>
        </View>
      </UnderCta>
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
            <Voice text="Don’t tell the others." size={VoiceSize.aside} delay={600} />
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
      style={[styles.planOption, selected && styles.planOptionSelected]}
    >
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
  planOption: {
    borderRadius: Radius.card,
    backgroundColor: Nocturne.surface,
    // Always 2 wide, so selecting a plan never nudges the layout.
    borderWidth: 2,
    borderColor: Nocturne.edge,
    overflow: 'hidden',
  },
  planOptionSelected: { borderColor: Nocturne.text, backgroundColor: Nocturne.raised },
  band: { backgroundColor: Nocturne.edge, paddingVertical: 4, alignItems: 'center' },
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
  // Out of the flow, so the button sits where every other page's does (user 2026-10-27).
  underCta: { position: 'absolute', top: '100%', left: 0, right: 0, marginTop: Space.s },
  underCtaText: { color: Nocturne.text, opacity: 0.85, fontSize: 12, lineHeight: 15, fontWeight: '600', textAlign: 'center' },
  link: { color: Nocturne.text, textDecorationLine: 'underline' },
});
