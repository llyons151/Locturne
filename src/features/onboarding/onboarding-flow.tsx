'use no memo';
// Reads the App Group stores during render (routine, passes, limits…), which change outside
// React. The React Compiler would cache those reads from the first render (Home mounts under
// onboarding before a routine exists, and showed the defaults after), so it stays out here.

import { useRouter } from 'expo-router';
import { useCallback, useEffect, useEffectEvent, useMemo, useReducer, useRef, useState } from 'react';
import { Alert, AppState, Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppPickerSheet, PICKER_HEADER } from '@/components/app-picker';
import { MoonSurface } from '@/components/moon-surface';
import type { TextMotion } from '@/components/motion';
import { FLIGHT_MS, NightSky, QUIZ_RISE_MS, quizContentTop } from '@/components/night-sky';
import { ScreenTimePicker } from '@/components/screen-time-picker';
import { useCompact } from '@/hooks/use-compact';
import { isPickerSettling, settlePicker } from '@/features/apps/picker-settle';
import { useStepCount } from '@/hooks/use-step-count';
import {
  answerFor,
  registerProperties,
  setPersonProperties,
  SUPER_QUESTIONS,
  track,
} from '@/lib/analytics';
import { armTonight, type ArmResult } from '@/lib/arm';
import * as haptic from '@/lib/haptics';
import { armIfPaid } from '@/hooks/use-app-start';
import { settleSubscription } from '@/lib/lock-controller';
import { askForNotifications, getNotificationPermission, rescheduleNotifications, sendFirstNote, type NotificationPermission } from '@/lib/notifications';
import { isPurchasePending, markPurchasePending, takePendingApproval } from '@/lib/pending-purchase';
import {
  getOffers,
  isEntitled,
  EXIT_OFFER_LIVE,
  isExitArm,
  isPurchasing,
  onEntitled,
  purchase,
  resolveExitArm,
  restore,
  type Offers,
  type PurchaseResult,
  type PurchaseTarget,
  currentTrialEnd,
  trialEndsAt,
} from '@/lib/purchases';
import { getPendingRoutine, getRoutine, hasRoutine, nextNightOn, nightAt, toLockSettings } from '@/lib/routine';
import { nightsAround } from '@/lib/lock-state';
import {
  getAccess,
  isScreenTimeAvailable,
  requestAccess,
  selectionSize,
  type ScreenTimeAccess,
  type SelectionId,
} from '@/lib/screen-time';
import { getTone } from '@/lib/tone';
import { Nocturne } from '@/theme';

import { firstEnabledNight, scheduleCopy } from './schedule-copy';
import { CHAPTERS, initialAnswers, isNewYearWeek, STEPS, WALK_GOAL, type Answers, type ExitOffer, type StepId } from './content';
import { estimate, isInsideBedtime } from './estimate';
import { checkMotion, requestMotion, type MotionAccess } from './motion';
import { canGoBack, currentStep, isStep, navigate, startNav } from './navigation';
import { closeNightPicker, openNightPicker } from './night-picker';
import { markExitOfferShown, saveSetup, saveTrialReminder, savedQuizAnswers, wasExitOfferShown } from './setup';
import { SimulatedPrompt, type Simulated } from './simulated-prompt';
import { SleepDrop, useSleepDrop } from './sleep-drop';
import { renderStep, type WalkState } from './steps';
import { FooterEnter, Shell, StepEnter, type Progress } from './ui';

/** Any fixed date: the walk's count is off until it starts. */
const WALK_EPOCH = new Date(0);

const ADVANCE_AFTER_CHOICE_MS = 280;
/** The two paywall pages. Exit from either goes to `declined` instead of closing. */
const PAYWALL: StepId[] = ['offer', 'plans'];

/** Once any of these is reached the setup is complete, so leaving saves it (unarmed). */
const SETUP_DONE: StepId[] = ['commit', 'offer', 'plans', 'declined'];

/**
 * The library saves Apple's picks about 0.1 s after Done, so counts read on close alone are
 * stale (see apps-list.tsx). Read them a beat later.
 */


/**
 * The quiz happens on the risen moon: it rises once at the first question and stays up
 * through the last, so it doesn't bob between screens, then sinks for the math.
 */
const MOON_QUIZ: StepId[] = STEPS.slice(STEPS.indexOf('nights'), STEPS.indexOf('time-back') + 1);

/** Text entrance per page (see motion.tsx). Anything not listed uses Word Drift. */
const MOTION: Partial<Record<StepId, TextMotion>> = {
  deal: 'moonrise',
};

// Plausible answers for jumping straight to a later screen with `?step=`.
const PREVIEW_ANSWERS: Partial<Answers> = {
  nights: 'one-more',
  nightMinutes: 60,
  morningMinutes: 20,
  nightsPerWeek: 7,
  scrollDays: [0, 1, 2, 3, 4, 5, 6],
  tried: 'screen-time',
  timeBack: 'mornings',
  found: 'tiktok',
  method: 'downstairs',
  apps: ['TikTok', 'Instagram', 'YouTube'],
};

/** Head start so a chapter's bar never opens empty (endowed progress). */
const PROGRESS_START = 0.12;

/** Which chapter and how far into it, or null on screens that hide the bar. */
function progressFor(step: StepId): Progress | null {
  const chapter = CHAPTERS.findIndex((steps) => steps.includes(step));
  if (chapter < 0) return null;
  const steps = CHAPTERS[chapter];
  const done = (steps.indexOf(step) + 1) / steps.length;
  return { chapter, value: PROGRESS_START + (1 - PROGRESS_START) * done, chapters: CHAPTERS.length };
}

/**
 * The onboarding as a stack of steps. navigation.ts has the rules for moving (next, back,
 * edit and return); this file runs them, owns the paywall exit and every call out to iOS
 * and the store; steps.tsx owns what each step shows.
 *
 * On an iPhone the prompts are real: Screen Time access, Apple's app picker, the purchase,
 * arming tonight and Motion & Fitness. Off iOS (the web preview) Screen Time doesn't exist,
 * so those stand-ins remain (`simulate`), and the store is the dev stub in purchases.ts.
 */
/** Steps whose button waits for the payoff (B6), and the most it ever waits. */
const PAYOFF_STEPS: StepId[] = ['reveal', 'tomorrow'];
const PAYOFF_BACKSTOP_MS = 12000;

export function OnboardingFlow({
  initialStep,
  exitOffer,
  resumeAtPaywall = false,
  newYear: previewNewYear = false,
}: {
  initialStep?: string;
  exitOffer?: string;
  /** Review only: the New Year week copy on any date. */
  newYear?: boolean;
  /** Open on the offer with the saved setup's times and method, skipping the quiz. */
  resumeAtPaywall?: boolean;
}) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const screenTimeHere = isScreenTimeAvailable();
  const [nav, dispatch] = useReducer(navigate, null, () => {
    if (resumeAtPaywall) {
      // A Routine edit still waiting for bedtime is the one to keep, not the one it replaces.
      const saved = getPendingRoutine()?.routine ?? getRoutine();
      // The quiz answers too, or the paywall's headline treats everyone as a light user (B5).
      return startNav('offer', {
        ...initialAnswers,
        ...savedQuizAnswers(),
        tone: getTone(),
        bedtime: saved.bedtime,
        wake: saved.morningStart,
        method: saved.method,
      });
    }
    const jump = isStep(initialStep) ? initialStep : 'hello';
    // A rerun starts from the tone they already have, so passing through `voice` keeps it.
    return startNav(jump, { ...initialAnswers, tone: getTone(), ...(jump !== 'hello' ? PREVIEW_ANSWERS : {}) });
  });
  const { history, answers, returnTo } = nav;
  const [simulated, setSimulated] = useState<Simulated | null>(null);

  const step = currentStep(nav);
  const numbers = useMemo(
    () =>
      estimate({
        nightMinutes: answers.nightMinutes ?? 0,
        morningMinutes: answers.morningMinutes ?? 0,
        nightsPerWeek: answers.nightsPerWeek ?? 7,
        bedtime: answers.bedtime,
        wake: answers.wake,
        // No age question (cut 2026-10-05): the number never needed it, only the old life grid.
        age: undefined,
      }),
    [answers],
  );

  // Onboarding inside their own bedtime window, e.g. at 12:40 AM: they're in bed, so the walk is skipped.
  const lateNight = isInsideBedtime(answers.bedtime, answers.wake);
  // Fixed for the visit, so the copy can't change mid-flow at midnight on January 9.
  const [newYear] = useState(() => previewNewYear || isNewYearWeek());

  const simulate = (message: string, then: () => void) => setSimulated({ message, then });
  /** A native alert on iOS; the preview's stand-in on the web, where `Alert` does nothing. */
  const say = (title: string, message: string, then?: () => void) => {
    if (Platform.OS === 'ios') Alert.alert(title, message, [{ text: 'OK', onPress: then }]);
    else simulate(`${title}. ${message}`, then ?? (() => {}));
  };

  /* The store. Prices load at once, so they're ready by the paywall. */
  const [offers, setOffers] = useState<Offers | null>(null);
  const [offersFailed, setOffersFailed] = useState(false);
  const fetchOffers = useCallback(() => {
    getOffers().then(
      (loaded) => {
        setOffers(loaded);
        setOffersFailed(false);
      },
      () => {
        setOffersFailed(true);
        track('offers_failed', {});
      },
    );
  }, []);
  useEffect(fetchOffers, [fetchOffers]);
  const retryOffers = () => {
    setOffersFailed(false);
    fetchOffers();
  };
  // B10: a failure minutes ago (say, a flaky network at `hello`) mustn't greet them at the
  // paywall. Ask again on reaching a money screen without prices, and on coming back to the app.
  // Quietly: the failure stays on screen until prices arrive, so nothing flickers.
  const refetchIfFailed = useEffectEvent(() => {
    if (offersFailed && offers === null) fetchOffers();
  });
  const onMoneyStep = PAYWALL.includes(step) || step === 'declined';
  useEffect(() => {
    if (onMoneyStep) refetchIfFailed();
  }, [onMoneyStep]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refetchIfFailed();
    });
    return () => sub.remove();
  }, []);
  const [entitled, setEntitled] = useState(false);
  useEffect(() => {
    isEntitled().then(setEntitled, () => {});
  }, []);
  const [busy, setBusy] = useState(false);
  /** Bought or restored in this session (`finishSetup`). */
  const [finished, setFinished] = useState(false);
  const [flowActive] = useState(() => new Set(['active']));
  useEffect(() => {
    flowActive.add('active');
    return () => { flowActive.delete('active'); };
  }, [flowActive]);

  // The exit offer shows once per install, so rerunning onboarding can't farm it.
  const [offerShownBefore] = useState(wasExitOfferShown);
  // Set once `declined` shows (Back from it mustn't bring it round again) or a purchase is
  // waiting for approval (no half price right after asking a parent for full price).
  const [noMoreExitOffer, setNoMoreExitOffer] = useState(() => isPurchasePending());
  const requestedArm = isExitArm(exitOffer) ? exitOffer : undefined;
  // Off in 1.0 (`EXIT_OFFER_LIVE`); the review tools' `?exit=` still previews each arm.
  const liveArm = requestedArm ?? (EXIT_OFFER_LIVE && offers ? offers.exitArm : 'none');
  const exitArm: ExitOffer = !offers || offerShownBefore ? 'none' : resolveExitArm(liveArm, offers);

  /*
   * Analytics (docs/ANALYTICS.md): a view per step, how long the previous one stayed open,
   * and the answer it collected. Going Back answers nothing.
   */
  const [rerun] = useState(hasRoutine);
  const lastView = useRef<{ step: StepId; at: number } | null>(null);
  const wentBack = useRef(false);
  const stepShown = useEffectEvent(() => {
    const before = lastView.current;
    const now = Date.now();
    if (!before) track('onboarding_started', { rerun, entry_step: step });
    else if (!wentBack.current) {
      const given = answerFor(before.step, answers);
      if (given) {
        track('onboarding_answered', given);
        const property = { [`onboarding_${given.question}`]: given.answer };
        setPersonProperties(property);
        if (SUPER_QUESTIONS.has(given.question)) registerProperties(property);
      }
    }
    wentBack.current = false;
    lastView.current = { step, at: now };
    track('onboarding_step_viewed', {
      step,
      step_index: (STEPS as readonly string[]).indexOf(step),
      depth: history.length,
      editing: returnTo !== null,
      previous_step: before?.step ?? null,
      ms_on_previous: before ? now - before.at : null,
    });
    if (PAYWALL.includes(step) || step === 'declined') {
      track('paywall_viewed', {
        page: step,
        // Before the offers load the arm isn't known yet; `none` would skew the arm split.
        exit_arm: offers || offerShownBefore ? exitArm : null,
        prices_loaded: offers !== null,
        // `declined` sells the exit offer, whose trial can differ (14 days on `longer-trial`).
        trial_days:
          step === 'declined'
            ? exitArm === 'none'
              ? null
              : (offers?.exitOffers[exitArm]?.trialDays ?? null)
            : (offers?.annual.trialDays ?? null),
      });
    }
  });
  useEffect(() => {
    stepShown();
  }, [step, history.length]);

  // navigation.ts has the rules; this adds the side effects.
  const go = (to: StepId) => {
    if (to === 'declined') {
      markExitOfferShown();
      setNoMoreExitOffer(true);
    }
    dispatch({ type: 'go', to });
  };
  const next = () => dispatch({ type: 'next', skip: lateNight ? ['walk'] : [], at: history.length, visit: nav.visit });
  const edit = (to: StepId) => dispatch({ type: 'edit', to });
  const back = canGoBack(nav)
    ? () => {
        cancelAdvance();
        wentBack.current = true;
        dispatch({ type: 'back' });
      }
    : undefined;
  const exit = () => {
    flowActive.delete('active');
    // The declined path (ONBOARDING_CONVERSION): keep the setup, arm nothing. After a purchase
    // the history was reset to `armed`, and `finishSetup` has saved it already.
    const setupDone = history.some((s) => SETUP_DONE.includes(s));
    if (setupDone && !finished) saveSetup(answers);
    track('onboarding_exited', {
      step,
      depth: history.length,
      setup_saved: finished || setupDone,
      saw_paywall: finished || history.some((s) => PAYWALL.includes(s)),
    });
    // Leaving unpaid: what's gated on a subscription (always list, limits, Block now) stands
    // down now, not at the next foreground.
    armIfPaid();
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };
  /** `armed` with every night off: done here, on to the Routine tab to turn one on. */
  const leaveForRoutine = () => {
    exit();
    router.navigate('/routine');
  };
  // Leaving the paywall lands on one honest "Fair." screen, once (unless the test arm has
  // no offer). A second exit really exits.
  const leave = PAYWALL.includes(step) && exitArm !== 'none' && !noMoreExitOffer ? () => go('declined') : exit;
  // A first run must reach the saved setup: the app's tabs only ever show a finished one.
  // A rerun (See plans, Redo setup) already has one, so it can always be left. Dev builds
  // can always leave too, to get between onboarding and the tabs while working on either.
  const canLeave = __DEV__ || rerun || finished || history.some((s) => SETUP_DONE.includes(s));
  const set = <K extends keyof Answers>(key: K, value: Answers[K]) =>
    dispatch({ type: 'set', answers: { [key]: value } as Partial<Answers> });
  // A second tap during the short advance delay must not skip a screen, and Back cancels it.
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelAdvance = () => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = null;
  };
  useEffect(() => cancelAdvance, []);
  const advanceOnce = (to: () => void) => {
    if (advanceTimer.current) return;
    advanceTimer.current = setTimeout(() => {
      advanceTimer.current = null;
      to();
    }, ADVANCE_AFTER_CHOICE_MS);
  };
  const choose = <K extends keyof Answers>(key: K) => (value: Answers[K]) => {
    set(key, value);
    advanceOnce(next);
  };
  const [showMoreMethods, setShowMoreMethods] = useState(false);

  /* Screen Time access: Apple's prompt, then Face ID or the passcode. */
  const [screenTime, setScreenTime] = useState<'idle' | 'asking' | 'refused'>('idle');
  const askScreenTime = async () => {
    if (!screenTimeHere) {
      simulate('iOS asks for Screen Time access here. The web preview has no Screen Time.', next);
      return;
    }
    if (getAccess() !== 'approved') {
      setScreenTime('asking');
      let access: ScreenTimeAccess;
      try {
        access = await requestAccess();
      } catch {
        // The library throws when someone taps Don't Allow or cancels the passcode.
        access = getAccess();
      }
      if (access !== 'approved') {
        track('screen_time_access', { result: 'denied' });
        setScreenTime('refused');
        return;
      }
    }
    track('screen_time_access', { result: 'granted' });
    setScreenTime('idle');
    next();
  };

  /* Apple's picker for the night list (the preview's stand-in off iOS). */
  const [picks, setPicks] = useState(() => (screenTimeHere ? selectionSize('night') : 0));
  const [pickRevision, setPickRevision] = useState(0);
  // Which list the picker writes: the night list itself, or a draft of it while anything
  // holds the list (an armed night, Block now…), so removals wait for bedtime and still wake
  // (`openNightPicker`).
  const [pickerList, setPickerList] = useState<SelectionId | null>(null);
  const [previewPickerOpen, setPreviewPickerOpen] = useState(false);
  const openPicker = () => {
    if (isPickerSettling('night')) return;
    if (!screenTimeHere) {
      setPreviewPickerOpen(true);
      return;
    }
    setPickerList(openNightPicker());
  };
  const pickerClosed = (list: SelectionId) => {
    setPickerList(null);
    settlePicker('night', () => {
      closeNightPicker(list);
      setPicks(selectionSize('night'));
      setPickRevision((r) => r + 1);
      // Closed with nothing picked isn't a pick: a 0 would count as reaching this funnel step.
      const count = selectionSize('night');
      if (count > 0) track('apps_picked', { count });
      // Arming failed for want of apps: try again now there are some.
      if (step === 'armed') runArm();
    });
  };

  // "Put N to sleep": the picked icons fall into the moon and come back up asleep. Preview
  // only: on an iPhone the rows are native and the page just moves on.
  const { from: sleepFrom, pageStyle, onIconRef, rootRef, start: putToSleep, finish: wokeUp } = useSleepDrop(answers.apps, next);

  /* After purchase: arm tonight, then Motion & Fitness. */
  const [arm, setArm] = useState<ArmResult | { status: 'working' }>({ status: screenTimeHere ? 'working' : 'preview' });
  const runArm = async () => {
    setArm({ status: 'working' });
    const result = await armTonight();
    setArm(result);
    // `saveSetup` planned before the night was armed, so it found no bedtime to warn about.
    if (result.status === 'armed') rescheduleNotifications().catch(() => {});
    track('night_armed', {
      status: result.status,
      reason: result.status === 'failed' ? result.reason : null,
      now: result.status === 'armed' && result.now,
    });
  };
  const retryArm = async () => {
    if (arm.status === 'failed' && arm.reason === 'no-access') {
      try {
        await requestAccess();
      } catch {
        // Still refused: armTonight says so again.
      }
    }
    runArm();
  };
  /** A Restore found a subscription in this session, so finishing from `commit` is a restore. */
  const [restored, setRestored] = useState(false);
  /**
   * Saves the setup and arms. Only ever after a purchase or a restored subscription, or for
   * someone already subscribed when the flow opened (`entitled`: nothing was restored).
   */
  const finishSetup = (via: 'purchase' | 'restore' | 'entitled' = restored ? 'restore' : 'entitled') => {
    // A purchase that was waiting for approval ends here, reported (or not) by this flow: the
    // app-start check mustn't count it again as an approval after the paywall.
    takePendingApproval();
    // Bought or restored: anything stood down (an earlier subscription ended) comes back.
    settleSubscription(true);
    // StoreKit can finish after this modal closes. Keep any Routine edits made since then;
    // a first setup lost through an external dismissal still needs to be saved once.
    if (!flowActive.has('active')) {
      if (!hasRoutine()) saveSetup(answers);
      // Not a Routine edit: leaving the paywall mid-purchase (its X stays live) already saved
      // the setup, and the reminder they left on must still follow this trial.
      saveTrialReminder(answers.remindTrial);
      armIfPaid();
      return;
    }
    saveSetup(answers);
    // Whatever was bought: a plan with no trial (monthly) just has no end to remind about.
    saveTrialReminder(answers.remindTrial);
    track('onboarding_completed', { via, depth: history.length });
    setFinished(true);
    setEntitled(true);
    // An approval or a restore has no offer to read the trial from: ask the store.
    currentTrialEnd()
      .then((end) => end && setTrialEnds(end))
      .catch(() => {});
    dispatch({ type: 'reset', to: 'armed' });
    runArm();
  };
  // When the trial bought just now ends, for `armed` and `first-morning` to name the date.
  const [trialEnds, setTrialEnds] = useState<Date | null>(null);
  // A purchase may span Back and another edit. Complete with the latest committed answers.
  // Event-only holder, like SleepDrop's view map: read only when the store answers.
  const [latestAnswers] = useState(() => new Map([['value', answers]]));
  useEffect(() => { latestAnswers.set('value', answers); }, [answers, latestAnswers]);
  const [finishLatest] = useState(() => new Map([['complete', finishSetup]]));
  useEffect(() => { finishLatest.set('complete', finishSetup); });
  const buy = async (target: PurchaseTarget) => {
    // `busy` hasn't rendered yet for a tap in the same frame; its `cancelled` would open the
    // exit offer under Apple's sheet.
    if (busy || isPurchasing()) return;
    setBusy(true);
    track('purchase_started', { target, page: step });
    let result: PurchaseResult;
    try {
      result = await purchase(target);
    } catch {
      result = { status: 'failed', message: 'The App Store didn’t answer.' };
    }
    setBusy(false);
    track('purchase_result', { target, page: step, status: result.status });
    if (result.status === 'purchased') {
      const offer = target === 'annual' || target === 'monthly' ? offers?.[target] : offers?.exitOffers[target];
      setTrialEnds(offer?.trialDays ? trialEndsAt(offer.trialDays) : null);
      finishLatest.get('complete')!('purchase');
    } else if (result.status === 'pending') {
      if (!flowActive.has('active')) {
        if (!hasRoutine()) saveSetup(latestAnswers.get('value')!);
        saveTrialReminder(latestAnswers.get('value')!.remindTrial);
        markPurchasePending();
        return;
      }
      saveSetup(latestAnswers.get('value')!);
      // Kept now: an approval that lands after they've left only arms (`armIfPaid`), and the
      // reminder follows the store from there (`syncTrialEnd`) if this says they wanted it.
      saveTrialReminder(latestAnswers.get('value')!.remindTrial);
      markPurchasePending();
      setNoMoreExitOffer(true);
      say('Waiting for approval', 'Once the purchase is approved, open Locturne and I’ll set tonight. Nothing is asleep until then.');
    } else if (!flowActive.has('active')) {
      return;
    } else if (result.status === 'failed') {
      // Paid but not showing yet: Restore is the advice, not trying again.
      if (result.retry === false) say('Not showing yet', result.message);
      else say('That didn’t go through', `${result.message} Nothing is set up yet. Try again in a moment.`);
    }
    // Cancelled: they closed Apple's sheet. Closest to buying of anyone who leaves, so the one
    // exit offer shows here too (once per install, same as closing the paywall). Apple allows
    // one offer after a cancelled purchase, not a loop (ONBOARDING_OPTIMIZATION §5).
    else if (result.status === 'cancelled' && PAYWALL.includes(step) && exitArm !== 'none' && !noMoreExitOffer) {
      go('declined');
    }
  };
  const restorePurchases = async () => {
    if (busy) return;
    setBusy(true);
    let found: boolean;
    try {
      found = (await restore()).entitled;
    } catch {
      setBusy(false);
      if (flowActive.has('active')) say('The App Store isn’t answering', 'Check your connection and try again.');
      return;
    }
    setBusy(false);
    if (!flowActive.has('active')) {
      if (found) {
        if (PAYWALL.includes(step) || step === 'declined') finishLatest.get('complete')!('restore');
        else {
          settleSubscription(true);
          armIfPaid();
        }
      }
      return;
    }
    setEntitled(found);
    if (found) setRestored(true);
    track('restore_result', { found, step });
    if (!found) {
      say('Nothing to restore', 'There’s no Locturne subscription on this Apple ID.');
      return;
    }
    if (PAYWALL.includes(step) || step === 'declined') {
      finishLatest.get('complete')!('restore');
      return;
    }
    // From the first screen: set up the nights, then arm without a paywall.
    say('You’re subscribed', 'Set up your nights and I’ll arm them. No paywall.', () => {
      if (step === 'hello') go('bedtime');
    });
  };
  // A purchase waiting for Ask to Buy can be approved while the paywall is still open: move
  // on as if it had just gone through. Approved anywhere else in the flow (Back to `commit`,
  // or a relaunch that synced late), remember it so `commit` finishes instead of re-selling.
  const approvedLater = useEffectEvent(() => {
    setEntitled(true);
    setNoMoreExitOffer(true);
    if (!PAYWALL.includes(step) && step !== 'declined') return;
    // The insights start from `purchase_result = purchased`: an approval is one too.
    track('purchase_result', { target: 'approved', page: step, status: 'purchased' });
    finishSetup('purchase');
  });
  useEffect(() => onEntitled(approvedLater), []);
  const [motion, setMotion] = useState<MotionAccess | null>(null);
  /* After purchase, `armed` says what notifications and Motion are for, then asks for both. */
  // The web preview has neither prompt, so it starts as unasked and plays both stand-ins.
  const [notifications, setNotifications] = useState<NotificationPermission | null>(screenTimeHere ? null : 'undetermined');
  // What iOS has already answered, so `armed` only mentions the prompts that will really show.
  const checkPermissions = useEffectEvent(() => {
    if (!screenTimeHere) return;
    getNotificationPermission().then(setNotifications, () => setNotifications('denied'));
    if (motion === null) checkMotion().then((m) => m && setMotion(m), () => {});
  });
  useEffect(() => {
    if (step === 'armed') checkPermissions();
  }, [step]);
  // A second tap while iOS's prompts are up would `next` twice.
  const [asking, setAsking] = useState(false);
  /** iOS's prompts, then `then`. With every night off there are no mornings, so no Motion. */
  const ask = async (then: () => void, withMotion: boolean) => {
    if (asking) return;
    const asksMotion = withMotion && motion === null;
    if (!screenTimeHere) {
      const asks = [notifications === 'undetermined' && 'notifications', asksMotion && 'Motion & Fitness'].filter(Boolean);
      if (asks.length === 0) return then();
      simulate(`iOS asks about ${asks.join(', then ')} here. “Don’t Allow” is always an option.`, () => {
        if (notifications === 'undetermined') setNotifications('granted');
        if (asksMotion) setMotion('granted');
        then();
      });
      return;
    }
    setAsking(true);
    try {
      if (notifications === 'undetermined') {
        const granted = await askForNotifications().catch(() => false);
        setNotifications(granted ? 'granted' : 'denied');
        // The first thing they hear from him is what the first night's will look like, on the
        // day the armed screen names. Nothing to sample with every night off or one already started.
        const when = scheduleCopy(scheduledNight, new Date()).note;
        if (granted && when) sendFirstNote(when).catch(() => {});
      }
      if (asksMotion) {
        const access = await requestMotion();
        setMotion(access);
        track('motion_access', { result: access });
      }
      then();
    } finally {
      setAsking(false);
    }
  };
  const askPermissions = () => ask(next, true);
  // The trial reminder needs notifications, and with every night off no later moment asks.
  const openRoutine = () => ask(leaveForRoutine, false);

  /*
   * The 20-step walk before the paywall, right after the demo. Counting starts on "Start walking", which is also
   * when iOS asks for Motion & Fitness (useStepCount asks). Steps from that moment only, and
   * only while the page is open. The web preview fakes a steady walk.
   */
  const [walkStart, setWalkStart] = useState<Date | null>(null);
  const [walkDone, setWalkDone] = useState(false);
  const [walkSeconds, setWalkSeconds] = useState<number | null>(null);
  const counting = walkStart !== null && !walkDone && step === 'walk';
  const realWalk = useStepCount(Platform.OS === 'ios' && counting, walkStart ?? WALK_EPOCH, WALK_GOAL);
  const [fakeSteps, setFakeSteps] = useState(0);
  useEffect(() => {
    if (Platform.OS === 'ios' || !counting) return;
    const tick = setInterval(() => setFakeSteps((n) => Math.min(WALK_GOAL, n + 1)), 450);
    return () => clearInterval(tick);
  }, [counting]);
  const walkSteps = Platform.OS === 'ios' ? realWalk.steps : fakeSteps;
  const walkStatus = Platform.OS === 'ios' ? realWalk.status : 'counting';
  // Both are set while rendering (React's "adjusting state when a prop changes"), so the
  // page never draws a frame with stale values in between.
  if (walkStart && !walkDone && walkStatus === 'counting' && walkSteps >= WALK_GOAL) {
    setWalkDone(true);
    // eslint-disable-next-line react-hooks/purity -- read once, when the walk finishes
    setWalkSeconds(Math.max(1, Math.round((Date.now() - walkStart.getTime()) / 1000)));
  }
  useEffect(() => {
    if (walkDone) haptic.done();
  }, [walkDone]);
  // The walk's answer is the Motion & Fitness answer, for the pages after it.
  const [seenWalkStatus, setSeenWalkStatus] = useState(walkStatus);
  if (walkStart && Platform.OS === 'ios' && walkStatus !== seenWalkStatus) {
    setSeenWalkStatus(walkStatus);
    if (walkStatus === 'counting') setMotion('granted');
    else if (walkStatus === 'denied' || walkStatus === 'unavailable') setMotion(walkStatus);
  }
  const walk: WalkState = !walkStart
    ? { phase: 'idle', steps: 0 }
    : walkDone
      ? { phase: 'done', steps: WALK_GOAL }
      : walkStatus === 'denied' || walkStatus === 'unavailable'
        ? { phase: walkStatus, steps: 0 }
        : { phase: 'counting', steps: Math.min(walkSteps, WALK_GOAL) };
  // How the walk ended, never the count (docs/ANALYTICS.md, "Privacy").
  const walkEnded = useEffectEvent((result: 'done' | 'denied' | 'unavailable') => {
    const seconds = walkStart ? Math.round((Date.now() - walkStart.getTime()) / 1000) : 0;
    track('walk_finished', { result, seconds });
  });
  useEffect(() => {
    if (walk.phase === 'done' || walk.phase === 'denied' || walk.phase === 'unavailable') walkEnded(walk.phase);
  }, [walk.phase]);
  const startWalk = () => {
    track('walk_started', {});
    if (Platform.OS === 'ios') return setWalkStart(new Date());
    simulate('iOS asks for Motion & Fitness here. “Don’t Allow” is always an option.', () => {
      setMotion('granted');
      setWalkStart(new Date());
    });
  };

  // While the moon moves (to or from the opener, or into and out of the quiz), the page
  // waits so text enters once it lands.
  const reducedMotion = useReducedMotion();
  const opening = step === 'hello';
  const quiz = MOON_QUIZ.includes(step);
  const moonPlace = opening ? 'opener' : quiz ? 'quiz' : 'rest';
  const [lastMoonPlace, setLastMoonPlace] = useState(moonPlace);
  const [moonMoving, setMoonMoving] = useState(0);
  if (lastMoonPlace !== moonPlace) {
    setLastMoonPlace(moonPlace);
    const flying = moonPlace === 'opener' || lastMoonPlace === 'opener';
    if (!reducedMotion) setMoonMoving(flying ? FLIGHT_MS : QUIZ_RISE_MS);
  }
  useEffect(() => {
    if (!moonMoving) return;
    const timer = setTimeout(() => setMoonMoving(0), moonMoving);
    return () => clearTimeout(timer);
  }, [moonMoving, step]);

  // B6: the reveal's and the demo's buttons wait until their payoff has played, so it can't be
  // tapped past. Keyed by visit, so coming back replays it. The timer is a backstop: a payoff
  // that never reports (no layout, a dropped callback) mustn't leave the button dead.
  const visit = `${step}-${nav.visit}`;
  const [payoffAt, setPayoffAt] = useState<string | null>(null);
  // Back lands on the same key it left, so forget the payoff on every move, not just new keys.
  const [shownVisit, setShownVisit] = useState(visit);
  if (shownVisit !== visit) {
    setShownVisit(visit);
    setPayoffAt(null);
  }
  const onPayoff = useCallback(() => setPayoffAt(visit), [visit]);
  useEffect(() => {
    if (!PAYOFF_STEPS.includes(step)) return;
    const timer = setTimeout(onPayoff, PAYOFF_BACKSTOP_MS);
    return () => clearTimeout(timer);
  }, [step, onPayoff]);

  const compact = useCompact();
  const scheduleNow = new Date();
  const savedRoutine = getPendingRoutine()?.routine ?? getRoutine();
  let scheduledNight = firstEnabledNight(answers.bedtime, answers.wake, savedRoutine.activeNights, scheduleNow);
  // After saving, use the same pending-edit and enabled-night rules as Home.
  if (finished) {
    const start = nextNightOn(scheduleNow);
    if (!start) scheduledNight = null;
    else {
      const around = nightsAround(start, toLockSettings(nightAt(start).routine));
      const night = start < around.latest.end ? around.latest : around.next;
      scheduledNight = { start, end: night.end };
    }
  }
  const screen = renderStep({
    scheduledNight,
    step,
    answers,
    numbers,
    set,
    choose,
    next,
    go,
    edit,
    exit,
    simulate,
    lateNight,
    newYear,
    compact,
    exitArm,
    editing: returnTo !== null,
    showMoreMethods,
    showMethods: () => setShowMoreMethods(true),
    offers,
    offersFailed,
    retryOffers,
    buy,
    busy,
    restorePurchases,
    entitled,
    finishSetup: () => finishSetup(),
    screenTime,
    askScreenTime,
    live: screenTimeHere ? { selectionId: 'night', count: picks, revision: pickRevision } : null,
    openPicker,
    putToSleep,
    onIconRef,
    arm,
    retryArm,
    openRoutine,
    motion,
    notifications,
    trialEnds,
    askPermissions,
    asking,
    walk,
    walkSeconds,
    startWalk,
    payoff: payoffAt === visit,
    onPayoff,
  });

  return (
    <View ref={rootRef} style={styles.root}>
      <NightSky opening={opening} quiz={quiz} />
      <Animated.View style={[styles.fill, pageStyle]} pointerEvents={sleepFrom ? 'none' : 'auto'}>
        <Shell
          progress={progressFor(step)}
          onBack={back}
          onExit={canLeave ? leave : undefined}
          footer={
            screen.footer && !moonMoving ? (
              <FooterEnter key={`${step}-${history.length}`} secondary={screen.secondary}>
                {screen.footer}
              </FooterEnter>
            ) : undefined
          }
        >
          {moonMoving ? null : (
            <StepEnter key={`${step}-${history.length}`} motion={MOTION[step] ?? 'drift'}>
              <View style={[styles.fill, quiz && { paddingTop: quizContentTop(height, insets.top) }]}>
                <MoonSurface value={quiz}>{screen.body}</MoonSurface>
              </View>
            </StepEnter>
          )}
        </Shell>
      </Animated.View>
      {sleepFrom ? <SleepDrop apps={answers.apps} from={sleepFrom} onDone={wokeUp} /> : null}
      {pickerList ? (
        <ScreenTimePicker
          list={pickerList}
          header={PICKER_HEADER}
          footer="Phone calls always get through. Leave out anything you need at night."
          onPicked={() => {
            // A draft only joins the night list on close (`finishListEdit`).
            if (pickerList !== 'night') return;
            setPicks(selectionSize('night'));
            setPickRevision((r) => r + 1);
          }}
          onClose={() => pickerClosed(pickerList)}
        />
      ) : null}
      <AppPickerSheet
        open={previewPickerOpen}
        apps={answers.apps}
        onClose={() => setPreviewPickerOpen(false)}
        onDone={(picked) => {
          set('apps', picked);
          setPreviewPickerOpen(false);
          track('apps_picked', { count: picked.length });
        }}
      />
      <SimulatedPrompt
        prompt={simulated}
        onContinue={() => {
          const then = simulated?.then;
          setSimulated(null);
          then?.();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // Clipped: the sky's moon layers run past the screen edges, which on web widened the
  // page so full-screen sheets and prompts spilled off the right side.
  root: { flex: 1, backgroundColor: Nocturne.bg, overflow: 'hidden' },
  fill: { flex: 1 },
});
