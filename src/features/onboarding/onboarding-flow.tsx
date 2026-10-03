import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppPickerSheet, PICKER_HEADER } from '@/components/app-picker';
import type { TextMotion } from '@/components/motion';
import { FLIGHT_MS, NightSky, QUIZ_RISE_MS, quizContentTop } from '@/components/night-sky';
import { ScreenTimePicker } from '@/components/screen-time-picker';
import { useCompact } from '@/hooks/use-compact';
import { settingsTakeEffectAt } from '@/lib/lock-state';
import { markPurchasePending } from '@/lib/pending-purchase';
import {
  getOffers,
  isEntitled,
  isExitArm,
  purchase,
  resolveExitArm,
  restore,
  type Offers,
  type PurchaseResult,
  type PurchaseTarget,
} from '@/lib/purchases';
import { getRoutine, toLockSettings } from '@/lib/routine';
import {
  beginListEdit,
  finishListEdit,
  getAccess,
  getArmedNight,
  isScreenTimeAvailable,
  reapplyStandingBlocks,
  requestAccess,
  selectionSize,
  type ScreenTimeAccess,
  type SelectionId,
} from '@/lib/screen-time';
import { Nocturne } from '@/theme';

import { armTonight, type ArmResult } from './arm';
import { initialAnswers, PROGRESS_STEPS, STEPS, type Answers, type ExitOffer, type StepId } from './content';
import { estimate, isInsideBedtime } from './estimate';
import { requestMotion, type MotionAccess } from './motion';
import { markExitOfferShown, saveSetup, saveTrialReminder, wasExitOfferShown } from './setup';
import { SimulatedPrompt, type Simulated } from './simulated-prompt';
import { SleepDrop, useSleepDrop } from './sleep-drop';
import { renderStep } from './steps';
import { FooterEnter, MoonSurface, Shell, StepEnter } from './ui';

const ADVANCE_AFTER_CHOICE_MS = 280;
/** Steps that can be edited from the "Tonight's lock is ready" summary. */
const EDITABLE: StepId[] = ['bedtime', 'wake', 'apps'];

/** Screens that move on by themselves. Back steps over them. */
const AUTO_ADVANCE: StepId[] = ['math'];

/** The two paywall pages. Exit from either goes to `declined` instead of closing. */
const PAYWALL: StepId[] = ['offer', 'plans'];

/** Once any of these is reached the setup is complete, so leaving saves it (unarmed). */
const SETUP_DONE: StepId[] = ['commit', 'offer', 'plans', 'declined'];

/**
 * The library saves Apple's picks about 0.1 s after Done, so counts read on close alone are
 * stale (see apps-list.tsx). Read them a beat later.
 */
const PICKER_SETTLE_MS = 500;

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
  nightMinutes: 45,
  morningMinutes: 20,
  nightsPerWeek: 7,
  scrollDays: [0, 1, 2, 3, 4, 5, 6],
  age: 22,
  alarm: 'groggy',
  tried: 'screen-time',
  timeBack: 'mornings',
  found: 'tiktok',
  method: 'downstairs',
  apps: ['TikTok', 'Instagram', 'YouTube'],
};

function isStep(value: string | undefined): value is StepId {
  return value === 'declined' || (STEPS as readonly string[]).includes(value ?? '');
}

function nextStep(step: StepId): StepId {
  if (step === 'declined') return 'plans';
  if (step === 'under-13') return 'alarm';
  const index = STEPS.indexOf(step);
  return STEPS[Math.min(index + 1, STEPS.length - 1)];
}

/** Head start so the bar never opens empty (endowed progress). */
const PROGRESS_START = 0.08;
/** Above 1, early steps fill more than late ones: fast-to-slow, which cuts drop-off. */
const PROGRESS_EASE = 1.3;

/** Fill from 0 to 1, or null on screens that hide the bar. */
function progressFor(step: StepId): number | null {
  const index = PROGRESS_STEPS.indexOf(step === 'under-13' ? 'age' : step);
  if (index < 0) return null;
  const done = (index + 1) / PROGRESS_STEPS.length;
  return PROGRESS_START + (1 - PROGRESS_START) * (1 - (1 - done) ** PROGRESS_EASE);
}

/**
 * The onboarding as a stack of steps. This file owns where you are and how you move
 * (next, back, edit and return, the paywall exit) and every call out to iOS and the store;
 * steps.tsx owns what each step shows.
 *
 * On an iPhone the prompts are real: Screen Time access, Apple's app picker, the purchase,
 * arming tonight and Motion & Fitness. Off iOS (the web preview) Screen Time doesn't exist,
 * so those stand-ins remain (`simulate`), and the store is the dev stub in purchases.ts.
 */
export function OnboardingFlow({ initialStep, exitOffer }: { initialStep?: string; exitOffer?: string }) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const screenTimeHere = isScreenTimeAvailable();
  const [history, setHistory] = useState<StepId[]>([isStep(initialStep) ? initialStep : 'hello']);
  const [answers, setAnswers] = useState<Answers>(() => ({
    ...initialAnswers,
    ...(isStep(initialStep) && initialStep !== 'hello' ? PREVIEW_ANSWERS : {}),
  }));
  const [simulated, setSimulated] = useState<Simulated | null>(null);
  // Set while editing a choice from the summary, so Continue returns there.
  const [returnTo, setReturnTo] = useState<StepId | null>(null);
  // The answers before that edit, so Back cancels it instead of keeping half a change.
  const [beforeEdit, setBeforeEdit] = useState<Answers | null>(null);

  const step = history[history.length - 1];
  const numbers = useMemo(
    () =>
      estimate({
        nightMinutes: answers.nightMinutes ?? 0,
        morningMinutes: answers.morningMinutes ?? 0,
        nightsPerWeek: answers.nightsPerWeek ?? 7,
        bedtime: answers.bedtime,
        wake: answers.wake,
        age: answers.age,
      }),
    [answers],
  );

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
    getOffers().then(setOffers, () => setOffersFailed(true));
  }, []);
  useEffect(fetchOffers, [fetchOffers]);
  const retryOffers = () => {
    setOffersFailed(false);
    fetchOffers();
  };
  const [entitled, setEntitled] = useState(false);
  useEffect(() => {
    isEntitled().then(setEntitled, () => {});
  }, []);
  const [busy, setBusy] = useState(false);

  // The exit offer shows once per install, so rerunning onboarding can't farm it.
  const [offerShownBefore] = useState(wasExitOfferShown);
  const requestedArm = isExitArm(exitOffer) ? exitOffer : undefined;
  const exitArm: ExitOffer =
    !offers || offerShownBefore ? 'none' : resolveExitArm(requestedArm ?? offers.exitArm, offers);

  const go = (to: StepId) => {
    if (to === 'declined') markExitOfferShown();
    setHistory((stack) => [...stack, to]);
  };
  const next = () => {
    if (returnTo && EDITABLE.includes(step)) {
      // Pop back to the summary instead of stacking another copy of it.
      setHistory((stack) => stack.slice(0, stack.lastIndexOf(returnTo) + 1));
      setReturnTo(null);
      setBeforeEdit(null);
      return;
    }
    go(nextStep(step));
  };
  const edit = (to: StepId) => {
    setReturnTo(step);
    setBeforeEdit(answers);
    go(to);
  };
  // The age gate can't be re-answered with Back, and there's no way back to the paywall after purchase.
  const back = history.length > 1 && step !== 'under-13'
    ? () => {
        cancelAdvance();
        if (returnTo && EDITABLE.includes(step)) {
          if (beforeEdit) setAnswers(beforeEdit);
          setReturnTo(null);
          setBeforeEdit(null);
        }
        // Skip screens that advance on their own, or Back would bounce straight forward again.
        setHistory((stack) => {
          let to = stack.length - 1;
          while (to > 1 && AUTO_ADVANCE.includes(stack[to - 1])) to -= 1;
          return stack.slice(0, to);
        });
      }
    : undefined;
  const exit = () => {
    // The declined path (ONBOARDING_CONVERSION): keep the setup, arm nothing.
    if (history.some((s) => SETUP_DONE.includes(s))) saveSetup(answers);
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };
  // Leaving the paywall lands on one honest "Fair." screen, once (unless the test arm has
  // no offer). A second exit really exits.
  const leave = PAYWALL.includes(step) && exitArm !== 'none' && !history.includes('declined') ? () => go('declined') : exit;
  const set = <K extends keyof Answers>(key: K, value: Answers[K]) =>
    setAnswers((current) => ({ ...current, [key]: value }));
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
        setScreenTime('refused');
        return;
      }
    }
    setScreenTime('idle');
    next();
  };

  /* Apple's picker for the night list (the preview's stand-in off iOS). */
  const [picks, setPicks] = useState(() => (screenTimeHere ? selectionSize('night') : 0));
  const [pickRevision, setPickRevision] = useState(0);
  // Which list the picker writes: the night list itself, or a draft of it when a night is
  // already armed, so removals wait for bedtime like every other loosening.
  const [pickerList, setPickerList] = useState<SelectionId | null>(null);
  const [previewPickerOpen, setPreviewPickerOpen] = useState(false);
  const openPicker = () => {
    if (!screenTimeHere) {
      setPreviewPickerOpen(true);
      return;
    }
    setPickerList(getArmedNight() ? beginListEdit('night') : 'night');
  };
  const pickerClosed = (list: SelectionId) => {
    setPickerList(null);
    setTimeout(() => {
      if (list !== 'night') {
        finishListEdit('night', settingsTakeEffectAt(new Date(), toLockSettings(getRoutine())));
        reapplyStandingBlocks();
      }
      setPicks(selectionSize('night'));
      setPickRevision((r) => r + 1);
      // Arming failed for want of apps: try again now there are some.
      if (step === 'armed') runArm();
    }, PICKER_SETTLE_MS);
  };

  // "Put N to sleep": the picked icons fall into the moon and come back up asleep. Preview
  // only: on an iPhone the rows are native and the page just moves on.
  const { from: sleepFrom, pageStyle, onIconRef, rootRef, start: putToSleep, finish: wokeUp } = useSleepDrop(answers.apps, next);

  /* After purchase: arm tonight, then Motion & Fitness. */
  const [arm, setArm] = useState<ArmResult | { status: 'working' }>({ status: screenTimeHere ? 'working' : 'preview' });
  const runArm = async () => {
    setArm({ status: 'working' });
    setArm(await armTonight());
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
  /** Saves the setup and arms. Only ever after a purchase or a restored subscription. */
  const finishSetup = () => {
    saveSetup(answers);
    saveTrialReminder(answers.plan === 'annual' && answers.remindTrial);
    setEntitled(true);
    setHistory(['armed']);
    runArm();
  };
  const buy = async (target: PurchaseTarget) => {
    if (busy) return;
    setBusy(true);
    let result: PurchaseResult;
    try {
      result = await purchase(target);
    } catch {
      result = { status: 'failed', message: 'The App Store didn’t answer.' };
    }
    setBusy(false);
    if (result.status === 'purchased') finishSetup();
    else if (result.status === 'pending') {
      saveSetup(answers);
      markPurchasePending();
      say('Waiting for approval', 'Once the purchase is approved, open Locturne and I’ll set tonight. Nothing is asleep until then.');
    } else if (result.status === 'failed') {
      say('That didn’t go through', `${result.message} Nothing is set up yet. Try again in a moment.`);
    }
    // Cancelled: they closed Apple's sheet. Say nothing.
  };
  const restorePurchases = async () => {
    if (busy) return;
    setBusy(true);
    let found: boolean;
    try {
      found = (await restore()).entitled;
    } catch {
      setBusy(false);
      say('The App Store isn’t answering', 'Check your connection and try again.');
      return;
    }
    setBusy(false);
    setEntitled(found);
    if (!found) {
      say('Nothing to restore', 'There’s no Locturne subscription on this Apple ID.');
      return;
    }
    if (PAYWALL.includes(step) || step === 'declined') {
      finishSetup();
      return;
    }
    // From the first screen: set up the nights, then arm without a paywall.
    say('You’re subscribed', 'Set up your nights and I’ll arm them. No paywall.', () => {
      if (step === 'hello') go('bedtime');
    });
  };
  const [motion, setMotion] = useState<MotionAccess | null>(null);
  const askMotion = async () => {
    if (!screenTimeHere) {
      simulate('iOS asks for Motion & Fitness here. “Don’t Allow” is always an option.', next);
      return;
    }
    setMotion(await requestMotion());
    next();
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

  const lateNight = isInsideBedtime(answers.bedtime, answers.wake);
  const compact = useCompact();
  const screen = renderStep({
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
    finishSetup,
    screenTime,
    askScreenTime,
    live: screenTimeHere ? { selectionId: 'night', count: picks, revision: pickRevision } : null,
    openPicker,
    putToSleep,
    onIconRef,
    arm,
    retryArm,
    motion,
    askMotion,
  });

  return (
    <View ref={rootRef} style={styles.root}>
      <NightSky opening={opening} quiz={quiz} />
      <Animated.View style={[styles.fill, pageStyle]} pointerEvents={sleepFrom ? 'none' : 'auto'}>
        <Shell
          progress={progressFor(step)}
          onBack={back}
          onExit={leave}
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
