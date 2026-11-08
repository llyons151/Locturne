'use no memo';
// Rendered from onboarding-flow, which reads the App Group during render (the React Compiler
// would cache those reads, #130): kept out with it, so nothing here is cached across them.

import { SymbolView } from 'expo-symbols';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Reveal } from '@/components/motion';
import { Text } from '@/components/text';

import { PrimaryButton } from '@/components/buttons';
import * as haptic from '@/lib/haptics';
import { LEGAL_URLS } from '@/lib/links';
import { formatPrice, perMonth, type Offer } from '@/lib/purchases';
import { Gap, Nocturne, Space, Type, VoiceSize } from '@/theme';

import { methodCopy, painHeadline, plansHeadline } from '../content';
import { formatWhen, leadFor, weeklyAmount, weeklyParts } from '../estimate';
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
 * The paywall, copied from Calm Sleep's (user 2026-11-08, Mobbin: "copy this ... with Locturne's style"): the
 * headline centred at the top, three promises each with its icon and a bold lead, hairlines between them, then
 * Yearly and Monthly side by side over the button, the billed price under it. Locturne's own look: the night sky,
 * the smoked cards, white for the chosen plan (no blue), and Loc on the cards' top edge.
 * Lifetime was dropped: at $99.99 next to a $59.99 annual it skipped the trial and capped LTV. Yearly is chosen
 * by default. Apple 3.1.2: the billed amount is the biggest price on each card, per-month sits under it.
 * No struck-through "was" prices: there was never a higher price to strike.
 */
export function plansStep(ctx: StepContext): StepView {
  const { answers, numbers, set, buy, busy, compact, offers } = ctx;
  if (!offers) return storeStep(ctx);
  const method = methodCopy(answers.method ?? 'steps');
  // The branch's own end of the night, when it's big enough to lead with (`leadFor`).
  const lead = leadFor(numbers, answers.pain, answers.worstTime);
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
  // The three promises, Calm's "Fall asleep faster with ..." shape: a bold lead, then the rest of the line.
  // Never an app's name: Apple's picker only hands back opaque tokens.
  const wakeLine = method.check.replace(/^Awake again\s*/, '');
  const promises: Pledge[] = [
    {
      icon: { ios: 'moon.zzz.fill', android: 'bedtime', web: 'bedtime' },
      lead: 'Asleep at bedtime',
      rest: !ctx.scheduledNight
        ? 'once you turn your nights on in Routine.'
        : `from ${formatWhen(answers.bedtime)} on your nights, only the apps you pick.`,
    },
    {
      icon: { ios: 'sunrise.fill', android: 'wb_twilight', web: 'wb_twilight' },
      lead: 'Awake again',
      rest: `${wakeLine}, not before.`,
    },
    answers.pain === 'overall'
      ? { icon: { ios: 'hourglass', android: 'hourglass_empty', web: 'hourglass_empty' }, lead: 'Daytime too', rest: 'with schedules and daily limits.' }
      : { icon: { ios: 'ticket.fill', android: 'confirmation_number', web: 'confirmation_number' }, lead: 'Two passes a month', rest: 'for sick days and travel.' },
  ];
  return {
    body: (
      <FitPage style={styles.paywall}>
        {(tight) => (
          <>
            {/* The payoff where they decide: their own hours back (docs/ONBOARDING_MOBBIN.md). No trial wording
                up here: Apple 3.1.2 wants the billed price at least as clear as "free", so "free" stays on the
                button with the price right under it. A light user has no hours to sell. */}
            <Voice
              // No number of their own to lead with: the outcome instead (user 2026-11-05: "The boring bit" won't convert).
              text={numbers.lightUser ? painHeadline(answers.pain) : plansHeadline(weeklyAmount(lead.minutes))}
              // Their number in the reveal's blue, so it reads as the same number they saw there.
              accent={numbers.lightUser ? undefined : String(weeklyParts(lead.minutes).count)}
              size={compact ? 26 : 30}
              header
              center
            />
            {/* Each row fades and rises in its turn after the headline, as on every other page. A long headline
                on a short phone (`FitPage`) drops the last row, never the plans. */}
            <View style={[styles.promises, compact && styles.promisesCompact]}>
              {(tight ? promises.slice(0, 2) : promises).map((item, i) => (
                <Reveal rise key={item.lead}>
                  {i > 0 ? <View style={[styles.rule, compact && styles.ruleCompact]} /> : null}
                  <PromiseRow item={item} />
                </Reveal>
              ))}
            </View>
            {/* The plans sit on the button, as Calm's do. */}
            <View style={styles.fill} />
            {/* Calm Sleep's two cards, copied as they are (user 2026-11-08: "just copy it"): Yearly with its trial
                tab sitting on top of it, per month first, then a year of Monthly struck through beside the real
                yearly price; Monthly just its name and price. White where Calm is blue. */}
            <Reveal rise>
              <PlanPicker
                plan={plan}
                onPick={(next) => set('plan', next)}
                yearly={{
                  // Per month first, as Calm Sleep's (user 2026-11-08: keep it, though App Review 3.1.2 prefers the
                  // billed amount biggest; Calm ships this way). The billed price is the small line under it.
                  price: `${perMonth(offers.annual)}/mo`,
                  // What a year of Monthly costs, struck through: a real price, the one Yearly saves on.
                  was: formatPrice(offers.monthly.price * 12, offers.monthly.currencyCode),
                  billed: `${annual}/yr`,
                }}
                monthly={`${monthly}/mo`}
                trial={trialDays ? `${trialDays}-Day Free Trial` : undefined}
              />
            </Reveal>
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

type Pledge = { icon: { ios: string; android: string; web: string }; lead: string; rest: string };

/** One of the three promises: its glyph on the left, a bold lead and the rest of the line beside it (Calm Sleep's rows). */
function PromiseRow({ item }: { item: Pledge }) {
  return (
    <View style={styles.promise} accessible accessibilityLabel={`${item.lead} ${item.rest}`}>
      <View style={styles.promiseIcon}>
        <SymbolView name={item.icon as never} size={26} tintColor={Nocturne.text} />
      </View>
      <Text style={styles.promiseText}>
        <Text style={styles.promiseLead}>{item.lead}</Text>
        {` ${item.rest}`}
      </Text>
    </View>
  );
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



/** How long the ring takes to slide to the other plan, and the trial tab to go or come back. */
const SWITCH_MS = 320;
/** The trial tab's height, and how far it runs down over the ring: to the ring's inner edge (it sits 2pt out, 3pt wide). */
const TAB = 26;
const TAB_OVERLAP = 1;
const SWITCH_EASING = Easing.bezier(0.22, 1, 0.36, 1);

/**
 * Calm Sleep's two plans in one faint box (user 2026-11-08). One white ring marks the chosen plan and slides
 * across when you switch, rather than one card's ring vanishing as the other's appears; the trial tab on
 * Yearly's top edge drops away while Monthly is chosen (no trial there) and rises back with Yearly.
 */
function PlanPicker({
  plan,
  onPick,
  yearly,
  monthly,
  trial,
}: {
  plan: 'annual' | 'monthly';
  onPick: (plan: 'annual' | 'monthly') => void;
  yearly: { price: string; was: string; billed: string };
  monthly: string;
  trial?: string;
}) {
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const at = useSharedValue(plan === 'annual' ? 0 : 1);
  useEffect(() => {
    const to = plan === 'annual' ? 0 : 1;
    at.set(reduced ? to : withTiming(to, { duration: SWITCH_MS, easing: SWITCH_EASING }));
  }, [plan, reduced, at]);
  const half = width / 2;
  const ring = useAnimatedStyle(() => ({ transform: [{ translateX: at.get() * half }] }));
  // Down behind the box's edge and faded, as the tab tucks away; up and in as it comes back.
  const tab = useAnimatedStyle(() => ({ opacity: 1 - at.get(), transform: [{ translateY: at.get() * (TAB + TAB_OVERLAP) }] }));
  return (
    <View>
      {/* The tab sits on Yearly's top edge, over the left half, in front of the ring so the two join as one white
          shape; its row clips at the ring, so going it slides down into the card's edge. */}
      <View style={styles.tabRow} pointerEvents="none">
        <View style={styles.tabHalf}>
          {trial ? (
            <Animated.View style={[styles.tab, tab]}>
              <Text style={styles.tabText}>{trial}</Text>
            </Animated.View>
          ) : null}
        </View>
        <View style={styles.tabHalf} />
      </View>
      <View accessibilityRole="radiogroup" style={styles.planCards} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width ? <Animated.View pointerEvents="none" style={[styles.ring, { width: half + 4 }, ring]} /> : null}
        <PlanCard selected={plan === 'annual'} onPress={() => onPick('annual')} name="Yearly" price={yearly.price} was={yearly.was} billed={yearly.billed} trial={trial} />
        <PlanCard selected={plan === 'monthly'} onPress={() => onPick('monthly')} name="Monthly" price={monthly} />
      </View>
    </View>
  );
}

/**
 * One plan, as Calm Sleep's: half of the plans' box (the ring is `PlanPicker`'s). Name, then the price;
 * the yearly card adds a struck-through year of Monthly and its billed price under.
 */
function PlanCard({
  selected,
  onPress,
  name,
  price,
  was,
  billed,
  trial,
}: {
  selected: boolean;
  onPress: () => void;
  name: string;
  price: string;
  was?: string;
  billed?: string;
  trial?: string;
}) {
  return (
    <Pressable
      style={styles.planCard}
      onPress={() => {
        if (selected) return;
        haptic.tap();
        onPress();
      }}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${name}, ${price}${billed ? `, billed ${billed}` : ''}${trial ? `. ${trial}` : ''}`}
    >
      <Text style={styles.planName}>{name}</Text>
      <Text style={styles.planPrice} numberOfLines={1} adjustsFontSizeToFit>
        {price}
      </Text>
      {billed ? (
        <Text style={styles.planBilled} numberOfLines={1} adjustsFontSizeToFit>
          {was ? <Text style={styles.planWas}>{was}</Text> : null}
          {was ? '  ' : ''}
          {billed}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  hiddenBlock: { opacity: 0 },

  // The headline starts where the offer page's does, every page's top (user 2026-11-08: "should match the
  // spacing of this page"); it used to sit up in the top bar (2026-10-27).
  paywall: { flex: 1, paddingTop: Gap.pageTop },
  // Inside `FitPage`: its own height, so it can be measured against the room.
  natural: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto' },
  // The height the page has, never its content's (web lets a flex child grow past it).
  room: { flex: 1, minHeight: 0 },
  paywallTitle: { color: Nocturne.text, ...Type.heading, textAlign: 'center' },
  paywallTitleCompact: Type.headingCompact,
  // Calm's rows: a little under the headline, hairlines between them, the glyph in its own column.
  promises: { marginTop: Space.xxxl + Space.l, alignSelf: 'stretch' },
  promisesCompact: { marginTop: Space.l },
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: Nocturne.edge, marginVertical: Space.l },
  ruleCompact: { marginVertical: Space.s },
  promise: { flexDirection: 'row', alignItems: 'center', gap: Space.l },
  promiseIcon: { width: 32, alignItems: 'center' },
  promiseText: { flex: 1, color: Nocturne.text, opacity: 0.86, fontSize: 16, lineHeight: 22 },
  promiseLead: { fontWeight: '700', opacity: 1 },
  // Under the box in the stacking order, so the tab tucks behind its edge as it goes.
  // Its foot covers the ring's top edge, so tab and ring read as one white shape (user 2026-11-08: "make this blend").
  tabRow: { flexDirection: 'row', height: TAB + 2 + TAB_OVERLAP, marginTop: Space.m, marginBottom: -(2 + TAB_OVERLAP), overflow: 'hidden', zIndex: 1 },
  tabHalf: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  tab: { height: TAB + 2 + TAB_OVERLAP, paddingBottom: 2 + TAB_OVERLAP, paddingHorizontal: Space.m, justifyContent: 'center', borderTopLeftRadius: 10, borderTopRightRadius: 10, backgroundColor: Nocturne.text },
  tabText: { color: Nocturne.onCta, fontSize: 13, fontWeight: '700' },
  planCards: {
    flexDirection: 'row',
    borderRadius: 24,
    borderCurve: 'continuous',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  planCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 108,
    paddingHorizontal: Space.s,
    paddingVertical: Space.m,
  },
  // The chosen plan's ring, half the box, out over its edge so the two line up.
  ring: {
    position: 'absolute',
    top: -2,
    bottom: -2,
    left: -2,
    borderRadius: 24,
    borderCurve: 'continuous',
    borderWidth: 3,
    borderColor: Nocturne.text,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  planName: { color: Nocturne.text, fontSize: 18, fontWeight: '700' },
  planPrice: { color: Nocturne.text, fontSize: 18, lineHeight: 24, fontVariant: ['tabular-nums'] },
  planBilled: { color: Nocturne.text, fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'], marginTop: Space.s },
  // White, a little quieter than the price beside it: grey sank into the bright sky behind (user 2026-11-08).
  planWas: { textDecorationLine: 'line-through', fontWeight: '500', color: Nocturne.text, opacity: 0.7 },
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
