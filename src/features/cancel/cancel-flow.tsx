'use no memo';
// Reads the App Group (mornings won, the offer shown) during render, which changes outside React.

import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { OutlineButton, PrimaryButton, TextButton } from '@/components/buttons';
import { GlassCard } from '@/components/glass-card';
import { MoonSurface } from '@/components/moon-surface';
import { NightSky, QUIZ_RISE_MS } from '@/components/night-sky';
import { Text } from '@/components/text';
import { track } from '@/lib/analytics';
import * as haptic from '@/lib/haptics';
import { SUPPORT_EMAIL } from '@/lib/links';
import { getMorningsWon } from '@/lib/morning-proof';
import { ATTRIBUTES, claimSaveOffer, getSaveOffer, manageSubscriptions, setAttributes, type SaveOffer } from '@/lib/purchases';
import { sharedGet, sharedSet } from '@/lib/screen-time';
import { DisplayFont, Gap, Nocturne, NUMBER_FONT, Space, Type } from '@/theme';

import { Body, FooterEnter, Options, page, PreviewNote, Shell, StepEnter, useSwap, Voice } from '../onboarding/ui';
import { fixFor, offerTerms, REASONS, recordLine, sampleOffer, WHAT_STOPS, type CancelReason } from './cancel-copy';

/**
 * The cancel flow, opened from You → Cancel subscription (docs/CANCEL_FLOW.md). Apple does the
 * cancelling; this is the stop on the way there, after the Mobbin teardown (Headspace, Headway,
 * Blinkist, Strava) and the retention research:
 *
 * 1. **Before you go:** their record and, plainly, what stops. Keep, or continue.
 * 2. **Why:** one tap, skippable. It picks what comes next.
 * 3. **A fix** for reasons money doesn't answer: too hard, not using it, sorted, broken.
 * 4. **One offer, last:** half off the plan they're on, from the next renewal, once per install.
 *    Only for someone who still wants to go after all that.
 * 5. **Apple's sheet,** then a calm "over to Apple" page.
 *
 * "Continue to cancel" is on every screen. `?preview=1` (You → Developer) walks it with a
 * sample offer and never charges, cancels or records anything.
 */

type Step = 'stay' | 'why' | 'fix' | 'offer' | 'done' | 'claimed';

/** Set once the offer has been shown: one per install, so cancelling isn't a coupon. */
const OFFER_SHOWN_KEY = 'locturne.saveOfferShown';

/** Steps the bar counts: before you go, why, last thing. A fix shares "why"'s place. */
const BAR: Partial<Record<Step, number>> = { stay: 0, why: 1, fix: 1, offer: 2 };

export function CancelFlow() {
  const { preview: previewParam } = useLocalSearchParams<{ preview?: string }>();
  const preview = previewParam === '1';
  const close = () => (router.canGoBack() ? router.back() : router.replace('/settings'));

  const [step, setStep] = useState<Step>('stay');
  const [history, setHistory] = useState<Step[]>([]);
  const [reason, setReason] = useState<CancelReason | null>(null);
  const [priced, setOffer] = useState<SaveOffer | null | undefined>(undefined);
  /** Shown once already on this install: no offer this time. */
  const [usedUp] = useState(() => !preview && sharedGet<boolean>(OFFER_SHOWN_KEY) === true);
  const offer = usedUp ? null : priced;
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [mornings] = useState(getMorningsWon);
  const offerShown = useRef(false);
  /** Apple's sheet reports the outcome once, however often it's reopened. */
  const ended = useRef(false);

  // Priced while they read the first screens, so the last one never waits.
  useEffect(() => {
    if (usedUp) return;
    getSaveOffer()
      .then((found) => setOffer(found ?? (preview ? sampleOffer() : null)))
      .catch(() => setOffer(preview ? sampleOffer() : null));
  }, [preview, usedUp]);

  // Once per step: picking a reason isn't a step of its own.
  useEffect(() => {
    track('cancel_flow_step', { step, reason, preview });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, preview]);

  const go = (next: Step) => {
    setHistory((h) => [...h, step]);
    setStep(next);
  };
  const back = () => {
    const previous = history.at(-1);
    if (!previous) return close();
    setHistory((h) => h.slice(0, -1));
    setStep(previous);
  };

  const end = (outcome: 'kept' | 'helped' | 'claimed_offer' | 'to_apple') => {
    track('cancel_flow_ended', { outcome, reason, offer_shown: offerShown.current, preview });
    if (!preview) setAttributes({ [ATTRIBUTES.cancelOutcome]: outcome, [ATTRIBUTES.cancelReason]: reason ?? 'skipped' });
  };

  /** Apple's manage-subscriptions sheet, or its web page where there's no sheet. */
  const toApple = () => {
    if (!ended.current) end('to_apple');
    ended.current = true;
    if (preview) return go('done');
    const pageUrl = () => Linking.openURL('https://apps.apple.com/account/subscriptions').catch(() => {});
    manageSubscriptions()
      .then((shown) => (shown ? null : pageUrl()))
      .catch(pageUrl)
      .finally(() => go('done'));
  };

  /** The offer if there's one to make, else straight to Apple. */
  const toOffer = () => {
    if (!offer) return toApple();
    offerShown.current = true;
    if (!preview) sharedSet(OFFER_SHOWN_KEY, true);
    go('offer');
  };

  // Picking only marks the answer; the button under it moves on, as on onboarding's questions (user 2026-11-11).
  const submitReason = () => {
    if (!reason) return;
    if (fixFor(reason)) go('fix');
    else toOffer();
  };

  const fix = fixFor(reason);
  const useFix = () => {
    if (!fix) return;
    end('helped');
    if (fix.to === 'email') {
      const subject = encodeURIComponent('Locturne: something isn’t working');
      Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${subject}`).catch(() => {});
      return close();
    }
    router.dismissTo('/routine');
  };

  const claim = async () => {
    if (claiming) return;
    setClaimError(null);
    if (preview) {
      end('claimed_offer');
      return go('claimed');
    }
    setClaiming(true);
    const result = await claimSaveOffer();
    setClaiming(false);
    if (result.status === 'purchased') {
      haptic.done();
      end('claimed_offer');
      go('claimed');
    } else if (result.status === 'failed') {
      haptic.thud();
      setClaimError(result.message);
      // The App Store never applied it, so it isn't used up on this install.
      sharedSet(OFFER_SHOWN_KEY, false);
    } else if (result.status === 'pending') {
      setClaimError('The App Store is waiting on an approval. It applies once that comes through.');
    }
  };

  // The question sits on the risen moon, as onboarding's do; the page waits while the moon moves.
  const reduced = useReducedMotion();
  const quiz = step === 'why';
  const [lastQuiz, setLastQuiz] = useState(quiz);
  const [moonMoving, setMoonMoving] = useState(0);
  if (lastQuiz !== quiz) {
    setLastQuiz(quiz);
    if (!reduced) setMoonMoving(QUIZ_RISE_MS);
  }
  useEffect(() => {
    if (!moonMoving) return;
    const timer = setTimeout(() => setMoonMoving(0), moonMoving);
    return () => clearTimeout(timer);
  }, [moonMoving, step]);

  const bar = BAR[step];
  const progress = bar === undefined ? null : { chapter: bar, value: 1, chapters: 3 };
  const note = preview ? <PreviewNote>Nothing is charged, cancelled or recorded here.</PreviewNote> : null;

  let body: React.ReactNode;
  let footer: React.ReactNode;
  let secondary: React.ReactNode = null;

  if (step === 'stay') {
    body = (
      <View style={page.top}>
        <Voice text={recordLine(mornings)} header />
        <View style={page.gapHeadline} />
        <Body>Here’s what cancelling changes, once your plan runs out.</Body>
        <View style={page.gapBlock} />
        <GlassCard dark style={styles.card}>
          {WHAT_STOPS.map((line, i) => (
            <View key={line} style={[styles.stopRow, i > 0 && styles.rowLine]}>
              <Text style={styles.stopText}>{line}</Text>
            </View>
          ))}
        </GlassCard>
        <View style={page.gapBlock} />
        {note}
      </View>
    );
    footer = (
      <PrimaryButton
        label="Keep my plan"
        onPress={() => {
          end('kept');
          close();
        }}
      />
    );
    secondary = <TextButton label="Continue to cancel" onPress={() => go('why')} />;
  } else if (step === 'why') {
    body = (
      <View style={page.top}>
        {/* One of onboarding's questions: the title, the answers on the risen moon, and a button that wakes once one is picked. */}
        <Voice text="What’s the problem?" header />
        <View style={page.gapBlock} />
        <Options options={REASONS} value={reason ?? undefined} onChoose={setReason} tone="moon" dense />
      </View>
    );
    footer = <PrimaryButton label={reason ? 'Continue' : 'Next'} disabled={!reason} onPress={submitReason} />;
    secondary = <TextButton label="Skip" onPress={toOffer} />;
  } else if (step === 'fix' && fix) {
    body = (
      <View style={page.top}>
        <Voice text={fix.title} header />
        <View style={page.gapHeadline} />
        <Body>{fix.body}</Body>
        <View style={page.gapBlock} />
        {note}
      </View>
    );
    footer = <PrimaryButton label={fix.action} onPress={useFix} />;
    secondary = <TextButton label="Continue to cancel" onPress={toOffer} />;
  } else if (step === 'offer' && offer) {
    const { price, unit, terms } = offerTerms(offer);
    body = (
      <View style={page.top}>
        <Voice text="Fine. One last thing." header />
        <View style={page.gapAside} />
        <Body>Stay for half. I’m only offering it once.</Body>
        <View style={page.gapBlock} />
        <GlassCard dark style={[styles.card, styles.offer]}>
          <Text style={styles.offerBadge}>{offer.percentOff}% OFF</Text>
          <View style={styles.priceRow}>
            <Text style={styles.price} maxFontSizeMultiplier={1.3}>
              {price}
            </Text>
            <Text style={styles.was}>{offer.fullPriceString}</Text>
          </View>
          <Text style={styles.unit}>{unit}</Text>
          <Text style={styles.terms}>{terms}</Text>
        </GlassCard>
        <View style={page.gapBlock} />
        {claimError ? <Text style={styles.error}>{claimError}</Text> : null}
        {note}
      </View>
    );
    footer = (
      <View style={styles.footer}>
        <PrimaryButton label={claiming ? 'Asking the App Store…' : `Take ${offer.percentOff}% off`} onPress={claim} disabled={claiming} />
        {/* As plain to find as the offer (California: cancel must be offered alongside it). */}
        <OutlineButton label="Continue to cancel" onPress={toApple} />
      </View>
    );
  } else if (step === 'claimed') {
    body = (
      <View style={page.top}>
        <Voice text="Half price. Don’t tell the others." header />
        <View style={page.gapHeadline} />
        <Body>It starts at your next renewal. Nothing changes tonight: the apps still go to sleep on time.</Body>
        <View style={page.gapBlock} />
        {note}
      </View>
    );
    footer = <PrimaryButton label="Done" onPress={close} />;
  } else {
    body = (
      <View style={page.top}>
        <Voice text="Over to Apple." header />
        <View style={page.gapHeadline} />
        <Body>
          If you cancelled there, I keep working until your plan runs out, then I stop. Changed your mind later? Subscribe again
          from You.
        </Body>
        <View style={page.gapBlock} />
        {note}
      </View>
    );
    footer = <PrimaryButton label="Done" onPress={close} />;
    secondary = <TextButton label="Open App Store subscriptions again" onPress={toApple} />;
  }

  const final = step === 'done' || step === 'claimed';
  // The page and its button swap as onboarding's do (useSwap): the old page fades where it stands
  // while the new one's words come into focus, instead of cutting (user 2026-11-11).
  const pages = useSwap(
    step,
    history.length,
    moonMoving
      ? null
      : {
          body: (
            // From the top, not onboarding's drop to the moon's curve: six answers and the button don't fit under it.
            <View style={styles.fill}>
              <MoonSurface value={quiz}>{body}</MoonSurface>
            </View>
          ),
          footer: { footer, secondary, wash: quiz },
        },
  );
  return (
    <View style={styles.root}>
      <NightSky quiz={quiz} />
      {/* Centred, like onboarding's pages (user 2026-11-11). */}
      <Shell
        progress={progress}
        centered
        clip={false}
        onBack={final ? undefined : back}
        footer={
          <View>
            {pages.map((entry) => (
              <FooterEnter key={entry.key} leaving={entry.leaving} alone={pages.length === 1} secondary={entry.value.footer.secondary} wash={entry.value.footer.wash}>
                {entry.value.footer.footer}
              </FooterEnter>
            ))}
          </View>
        }
      >
        <View style={styles.fill}>
          {pages.map((entry) => (
            <StepEnter key={entry.key} leaving={entry.leaving} replaced={entry.replaced} held={entry.held}>
              {entry.value.body}
            </StepEnter>
          ))}
        </View>
      </Shell>
    </View>
  );
}

const styles = StyleSheet.create({
  // Clipped: the sky's moon layers run past the screen edges (as onboarding's root).
  root: { flex: 1, backgroundColor: Nocturne.bg, overflow: 'hidden' },
  fill: { flex: 1 },
  footer: { gap: Space.s, alignItems: 'stretch' },
  card: { paddingHorizontal: Space.l, paddingVertical: Space.s },
  stopRow: { paddingVertical: Space.m },
  rowLine: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Nocturne.line },
  stopText: { ...Type.body, color: Nocturne.text, textAlign: 'center' },
  offer: { paddingVertical: Space.xl, alignItems: 'center', gap: Space.xs },
  offerBadge: { ...Type.label, color: Nocturne.text, marginBottom: Space.s },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: Space.m },
  price: { ...NUMBER_FONT, color: Nocturne.text, fontSize: 48, lineHeight: 54 },
  // The plan's real price, struck: it's what they pay now and again after the offer.
  was: { ...Type.body, color: Nocturne.text3, textDecorationLine: 'line-through' },
  unit: { ...DisplayFont, ...Type.body, color: Nocturne.text2 },
  terms: { ...Type.caption, color: Nocturne.text2, textAlign: 'center', marginTop: Space.m, paddingHorizontal: Space.s },
  error: { ...Type.secondary, color: Nocturne.text, textAlign: 'center', marginBottom: Gap.aside },
});
