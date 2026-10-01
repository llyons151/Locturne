import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppPickerSheet } from '@/components/app-picker';
import type { TextMotion } from '@/components/motion';
import { FLIGHT_MS, NightSky, QUIZ_RISE_MS, quizContentTop } from '@/components/night-sky';
import { useCompact } from '@/hooks/use-compact';
import { Nocturne } from '@/theme';

import {
  DEFAULT_EXIT_OFFER,
  EXIT_OFFERS,
  initialAnswers,
  PRICES,
  PROGRESS_STEPS,
  STEPS,
  type Answers,
  type ExitOffer,
  type StepId,
} from './content';
import { estimate, isInsideBedtime } from './estimate';
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
  apps: ['TikTok', 'Instagram', 'YouTube'],
};

function isExitOffer(value: string | undefined): value is ExitOffer {
  return (EXIT_OFFERS as readonly string[]).includes(value ?? '');
}

/** The exit offer a user actually gets: an extra free week means nothing without trial eligibility. */
function resolveExitOffer(arm: ExitOffer): ExitOffer {
  return arm === 'longer-trial' && !PRICES.trialEligible ? 'none' : arm;
}

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
 * (next, back, edit and return, the paywall exit); steps.tsx owns what each step shows.
 */
export function OnboardingFlow({ initialStep, exitOffer }: { initialStep?: string; exitOffer?: string }) {
  const exitArm = resolveExitOffer(isExitOffer(exitOffer) ? exitOffer : DEFAULT_EXIT_OFFER);
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
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

  const go = (to: StepId) => setHistory((stack) => [...stack, to]);
  // After purchase there's no way back to the paywall.
  const purchased = () => setHistory(['armed']);
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
  // The age gate can't be re-answered with Back.
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
  const exit = () => (router.canGoBack() ? router.back() : router.replace('/'));
  // Leaving the paywall lands on one honest "Fair." screen, once (unless the test arm has
  // no offer). A second exit really exits.
  const leave =
    PAYWALL.includes(step) && exitArm !== 'none' && !history.includes('declined')
      ? () => go('declined')
      : exit;
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
  const simulate = (message: string, then: () => void) => setSimulated({ message, then });
  const [pickerOpen, setPickerOpen] = useState(false);

  // "Put N to sleep": the picked icons fall into the moon and come back up asleep.
  const { from: sleepFrom, pageStyle, onIconRef, rootRef, start: putToSleep, finish: wokeUp } = useSleepDrop(answers.apps, next);

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
    purchased,
    lateNight,
    compact,
    exitArm,
    editing: returnTo !== null,
    openPicker: () => setPickerOpen(true),
    putToSleep,
    onIconRef,
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
      <AppPickerSheet
        open={pickerOpen}
        apps={answers.apps}
        onClose={() => setPickerOpen(false)}
        onDone={(picked) => {
          set('apps', picked);
          setPickerOpen(false);
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
