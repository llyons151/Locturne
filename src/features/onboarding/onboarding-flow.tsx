import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  Share,
  Switch,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppPickerSheet, AppsCard, MORE_TILE } from '@/components/app-picker';
import { PrimaryButton, TextButton } from '@/components/buttons';
import { Reveal, type TextMotion } from '@/components/motion';
import { FLIGHT_MS, NightSky, QUIZ_RISE_MS, quizContentTop } from '@/components/night-sky';
import { useCompact } from '@/hooks/use-compact';
import * as haptic from '@/lib/haptics';
import { noOrphan } from '@/lib/text';
import { DisplayFont, Gap, Nocturne, NUMBER_FONT, Radius, Space, Type, VoiceSize } from '@/theme';

import {
  AGE_DEFAULT,
  AGE_MAX,
  AGE_MIN,
  ALARM,
  ALARM_ECHO,
  DEFAULT_EXIT_OFFER,
  EXIT_OFFERS,
  FOUND,
  initialAnswers,
  LIGHT_OFFER_HEADLINE,
  MORNING_MINUTES,
  NIGHT_MINUTES,
  NIGHTS,
  NIGHTS_ECHO,
  MORNING_ECHO,
  OFFER_HEADLINES,
  PRICES,
  annualSavings,
  money,
  PROGRESS_STEPS,
  STEPS,
  TIME_BACK,
  TRIED,
  TRIED_ECHO,
  type Answers,
  type ExitOffer,
  type StepId,
} from './content';
import {
  dateFromToday,
  estimate,
  formatClock,
  formatHalves,
  formatHoursFromMinutes,
  formatWhen,
  isInsideBedtime,
  lifetimeSentence,
  yearAmount,
  yearSentence,
  weeklyAmount,
  type Estimate,
} from './estimate';
import { RollingNumber } from './rolling-number';
import { fitSquares, RevealGrid } from './reveal-grid';
import {
  Body,
  Chip,
  Eyebrow,
  FooterEnter,
  HoldButton,
  MoonSurface,
  Options,
  PreviewNote,
  Shell,
  StepEnter,
  Title,
  Voice,
} from './ui';
import { AgeWheel, TimeWheel } from './time-wheel';
import { AppleAlertPicture } from './apple-alert';
import { SleepDrop, type IconOrigin } from './sleep-drop';
import { DayPicker } from './day-picker';
import { ScheduleCard } from './schedule-card';
import { TomorrowDemo } from './screens/tomorrow-demo';

const ADVANCE_AFTER_CHOICE_MS = 280;
// Four presets: one row under the time wheel.
const BEDTIME_PRESETS = [22 * 60, 23 * 60, 23 * 60 + 30, 0];
const WAKE_PRESETS = [6 * 60, 7 * 60, 7 * 60 + 30, 8 * 60];
// Night-shift schedules: sleep in the morning, up in the afternoon.
const SHIFT_BEDTIME_PRESETS = [7 * 60, 8 * 60, 9 * 60, 10 * 60];
const SHIFT_WAKE_PRESETS = [14 * 60, 15 * 60, 16 * 60, 17 * 60];

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

type Simulated = { message: string; then: () => void };

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

function appSummary(apps: string[]): string {
  if (apps.length === 0) return 'Your apps';
  if (apps.length <= 2) return apps.join(' and ');
  return `${apps[0]}, ${apps[1]} and ${apps.length - 2} more`;
}

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

  // "Put N to sleep": the picked icons fall into the moon and come back up asleep (sleep-drop.tsx).
  // The page fades out around them while it plays.
  // Plain holders rather than refs: they're only read in event handlers, but renderStep
  // receives the handlers during render, which the React Compiler flags for refs.
  const [views] = useState(() => new Map<string, View>());
  const ROOT = '__root';
  const [sleepFrom, setSleepFrom] = useState<Record<string, IconOrigin> | null>(null);
  const pageFade = useSharedValue(1);
  const pageStyle = useAnimatedStyle(() => ({ opacity: pageFade.value }));
  const onIconRef = (app: string, view: View | null) => {
    if (view) views.set(app, view);
    else views.delete(app);
  };
  const measure = (view: View | null | undefined) =>
    new Promise<{ x: number; y: number; w: number; h: number } | null>((resolve) => {
      if (!view) return resolve(null);
      view.measureInWindow((x, y, w, h) => resolve({ x, y, w, h }));
    });
  const putToSleep = async () => {
    if (sleepFrom) return;
    const root = (await measure(views.get(ROOT))) ?? { x: 0, y: 0 };
    const from: Record<string, IconOrigin> = {};
    for (const app of answers.apps) {
      const box = await measure(views.get(app) ?? views.get(MORE_TILE));
      if (box) from[app] = { x: box.x - root.x + box.w / 2, y: box.y - root.y + box.h / 2, size: box.w };
    }
    pageFade.set(withTiming(0, { duration: 260 }));
    setSleepFrom(from);
  };
  // The next screen comes in while the last icon is still sinking; the overlay clears after.
  const wokeUp = () => {
    next();
    pageFade.set(withTiming(1, { duration: 450 }));
    setTimeout(() => setSleepFrom(null), 600);
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
    <View
      ref={(view) => onIconRef(ROOT, view)}
      style={styles.root}
    >
      <NightSky opening={opening} quiz={quiz} />
      <Animated.View style={[styles.fill, pageStyle]} pointerEvents={sleepFrom ? 'none' : 'auto'}>
      <Shell progress={progressFor(step)} onBack={back} onExit={leave} footer={screen.footer && !moonMoving ? <FooterEnter key={`${step}-${history.length}`} secondary={screen.secondary}>{screen.footer}</FooterEnter> : undefined}
      >
        {moonMoving ? null : (
          <StepEnter key={`${step}-${history.length}`} motion={MOTION[step] ?? 'drift'}>
            <View
              style={[
                styles.fill,
                quiz && { paddingTop: quizContentTop(height, insets.top) },
              ]}
            >
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

type StepContext = {
  step: StepId;
  answers: Answers;
  numbers: Estimate;
  set: <K extends keyof Answers>(key: K, value: Answers[K]) => void;
  choose: <K extends keyof Answers>(key: K) => (value: Answers[K]) => void;
  next: () => void;
  go: (to: StepId) => void;
  edit: (to: StepId) => void;
  exit: () => void;
  simulate: (message: string, then: () => void) => void;
  purchased: () => void;
  /** Short phone: layouts tighten so nothing scrolls. */
  compact: boolean;
  /** Onboarding is happening inside the bedtime window, e.g. at 12:40 AM. */
  lateNight: boolean;
  /** Which exit offer `declined` shows. Never `none` there: that arm skips the screen. */
  exitArm: ExitOffer;
  editing: boolean;
  /** Opens the stand-in for Apple's app picker. */
  openPicker: () => void;
  /** Plays the apps falling asleep into the moon, then moves on. */
  putToSleep: () => void;
  onIconRef: (app: string, view: View | null) => void;
};

/** The cold open. Same line at every hour. */
const HELLO = { head: 'No apps until you’re out of bed.', sub: 'I’m Loc. Raccoon. I don’t do mornings well either.' };

type StepView = {
  body: ReactNode;
  footer?: ReactNode;
  /** One text link, shown just above the primary button so the button stays at the bottom. */
  secondary?: ReactNode;
};

function renderStep(ctx: StepContext): StepView {
  const { step, answers, numbers, set, choose, next, go, edit, exit, simulate, purchased, lateNight, compact, exitArm, editing, openPicker, putToSleep, onIconRef } = ctx;
  const bed = formatWhen(answers.bedtime);
  const wake = formatClock(answers.wake);
  // "This morning" when it's already the small hours; "Later today" for afternoon wake-ups.
  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  const wakeDay = lateNight && answers.wake > nowMinutes ? (answers.wake >= 12 * 60 ? 'Later today' : 'This morning') : 'Tomorrow';
  const apps = appSummary(answers.apps);

  switch (step) {
    case 'hello': {
      return {
        body: (
          <View style={styles.bottomStack}>
            <Voice text={HELLO.head} size={VoiceSize.hero} />
            <View style={styles.gapHeadline} />
            <Voice text={HELLO.sub} size={24} delay={800} sub />
          </View>
        ),
        footer: <PrimaryButton label="Go on" onPress={next} />,
        secondary: (
          <TextButton
            label="Already subscribed? Restore"
            onPress={() => simulate('Restore Purchases runs here and skips straight to your setup.', () => {})}
          />
        ),
      };
    }

    case 'deal':
      return {
        body: (
          <View style={styles.top}>
            <Title>Here’s the deal.</Title>
            <View style={styles.beats}>
              <Beat label="Bedtime" text="Your apps go to sleep. So do I." />
              <Beat label="Morning" text="They stay asleep until you’re up. Same as me." />
              <Beat label="200 steps" text="About two minutes of walking. They wake up. I do too, unfortunately." />
            </View>
            {/* Was its own screen ("intro"). Folded in so the first tap comes one screen sooner. */}
            <View style={styles.gapSection} />
            <Body>First, a few questions. Then I do math on your nights. About two minutes, and your answers stay on your phone.</Body>
          </View>
        ),
        footer: <PrimaryButton label="Ask away" onPress={next} />,
      };

    case 'nights':
      return moonQuestion('What happens most nights?', undefined, (
        <Options options={NIGHTS} value={answers.nights} onChoose={choose('nights')} tone="moon" />
      ));

    case 'night-minutes':
      return moonQuestion('After you get into bed, how long are you on your phone?', 'A rough guess is fine.', (
        <Options options={NIGHT_MINUTES} value={answers.nightMinutes} onChoose={choose('nightMinutes')} tone="moon" />
      ));

    case 'nights-per-week': {
      const days = answers.scrollDays ?? [];
      return {
        ...moonQuestion(
          'Which nights does that happen?',
          'Tap every one that counts.',
          <DayPicker
            value={days}
            onChange={(picked) => {
              set('scrollDays', picked);
              set('nightsPerWeek', picked.length);
            }}
          />,
        ),
        footer: (
          <PrimaryButton
            label={days.length === 0 ? 'Tap at least one' : 'Continue'}
            disabled={days.length === 0}
            onPress={next}
          />
        ),
      };
    }

    case 'bedtime':
      return {
        body: (
          <View style={styles.top}>
            <Title>When do you get into bed?</Title>
            <Body style={styles.sub}>Getting in. Not falling asleep. Those are different.</Body>
            <View style={styles.timeWrap}>
              <TimeWheel
                value={answers.bedtime}
                onChange={(v) => set('bedtime', v)}
                presets={answers.shift ? SHIFT_BEDTIME_PRESETS : BEDTIME_PRESETS}
              />
            </View>
            {/* Wake time isn't set yet here, so only warn when editing a finished schedule. */}
            {editing && !answers.shift && numbers.scheduleLooksWrong ? (
              <Body style={styles.warning}>
                That’s {formatHoursFromMinutes(numbers.timeInBed)} hours in bed. Check AM and PM.
              </Body>
            ) : null}
            <View style={styles.shiftRow}>
              <Chip
                label="I work nights"
                selected={answers.shift === true}
                onPress={() => {
                  const shift = !answers.shift;
                  set('shift', shift);
                  set('bedtime', shift ? 8 * 60 : initialAnswers.bedtime);
                  set('wake', shift ? 15 * 60 : initialAnswers.wake);
                }}
              />
            </View>
            {answers.shift ? <Voice text="Nights are your days. I’ll adjust. Grudgingly." size={VoiceSize.aside} sub /> : null}
          </View>
        ),
        footer: <PrimaryButton label={editing ? 'Save' : 'Continue'} onPress={next} />,
      };

    case 'wake':
      return {
        body: (
          <View style={styles.top}>
            <Title>When does your alarm go off?</Title>
            <Body style={styles.sub}>The first one. Steps start counting from here.</Body>
            <View style={styles.timeWrap}>
              <TimeWheel
                value={answers.wake}
                onChange={(v) => set('wake', v)}
                presets={answers.shift ? SHIFT_WAKE_PRESETS : WAKE_PRESETS}
              />
            </View>
            {numbers.scheduleLooksWrong ? (
              <Body style={styles.warning}>
                That’s {formatHoursFromMinutes(numbers.timeInBed)} hours in bed. Check AM and PM.
              </Body>
            ) : null}
          </View>
        ),
        footer: <PrimaryButton label={editing ? 'Save' : 'Continue'} onPress={next} />,
      };

    case 'morning-minutes':
      return moonQuestion('In the morning, how long are you on your phone before you get up?', 'Counting from the first alarm.', (
        <Options options={MORNING_MINUTES} value={answers.morningMinutes} onChoose={choose('morningMinutes')} tone="moon" />
      ));

    case 'stat':
      return {
        body: (
          <View style={styles.moonTop}>
            <Reveal>
              <Text style={styles.statNumber} maxFontSizeMultiplier={1.3}>
                85%
              </Text>
            </Reveal>
            <Body style={styles.statText}>of U.S. adults check their phone within 10 minutes of waking.</Body>
            <View style={styles.gapBlock} />
            <Voice text={MORNING_ECHO[answers.morningMinutes ?? -1] ?? 'Not just you, then.'} size={VoiceSize.aside} delay={600} sub />
          </View>
        ),
        footer: <PrimaryButton label="Continue" onPress={next} />,
      };

    case 'age':
      return {
        ...moonQuestion(
          'How old are you?',
          'Sleep needs change with age.',
          // Centred in the space under the title, not pinned above the button like list answers.
          <View style={styles.center}>
            <AgeWheel value={answers.age ?? AGE_DEFAULT} onChange={(age) => set('age', age)} min={AGE_MIN} max={AGE_MAX} />
          </View>,
        ),
        footer: (
          <PrimaryButton
            label="Continue"
            onPress={() => {
              const age = answers.age ?? AGE_DEFAULT;
              set('age', age);
              if (age < 13) go('under-13');
              else next();
            }}
          />
        ),
      };

    case 'under-13':
      return {
        body: (
          <View style={styles.top}>
            <Voice text="Thirteen and up. Those are the rules." size={VoiceSize.headline} header />
            <View style={styles.gapHeadline} />
            <Body>Locturne isn’t for under-13s. Go to bed, though.</Body>
          </View>
        ),
        footer: <PrimaryButton label="Exit" onPress={exit} />,
      };

    case 'alarm':
      return moonQuestion('How do you feel when your alarm goes off?', undefined, (
        <Options options={ALARM} value={answers.alarm} onChoose={choose('alarm')} tone="moon" />
      ));

    case 'tried':
      return moonQuestion('What have you tried?', 'Pick the one that lasted longest.', (
        <Options options={TRIED} value={answers.tried} onChoose={choose('tried')} tone="moon" />
      ));

    case 'tried-echo': {
      const echo = TRIED_ECHO[answers.tried ?? ''] ?? TRIED_ECHO.nothing;
      return {
        body: (
          <View style={styles.moonTop}>
            <Voice text={echo.line} size={VoiceSize.headline} header />
            <View style={styles.gapHeadline} />
            <Body>{echo.body}</Body>
          </View>
        ),
        footer: <PrimaryButton label="Continue" onPress={next} />,
      };
    }

    case 'time-back':
      return moonQuestion('Say you got those minutes back. What would you do with them?', undefined, (
        <Options options={TIME_BACK} value={answers.timeBack} onChoose={choose('timeBack')} tone="moon" />
      ));

    case 'found':
      return moonQuestion('How’d you find me?', 'Be honest. I won’t be hurt. Much.', (
        <Options options={FOUND} value={answers.found} onChoose={choose('found')} tone="moon" />
      ));

    case 'math':
      return { body: <MathScreen line={NIGHTS_ECHO[answers.nights ?? ''] ?? 'Counting. Don’t watch me.'} onDone={next} /> };

    case 'reveal':
      return {
        body: <RevealScreen numbers={numbers} />,
        footer: <PrimaryButton label={numbers.lightUser ? 'Keep it that way' : 'Let’s fix this'} onPress={next} />,
        secondary: (
          <TextButton
            label="Share this"
            onPress={() => {
              const message = `About ${weeklyAmount(numbers.weeklyMinutes)} a week on my phone in bed. My raccoon is disappointed.`;
              Share.share({ message }).catch(() => simulate(`The share sheet opens here: “${message}”`, () => {}));
            }}
          />
        ),
      };

    case 'tomorrow':
      return {
        body: <TomorrowDemo when={`${wakeDay}, ${wake}`} clock={wake.replace(/\s?[AP]M$/i, '')} />,
        footer: <PrimaryButton label="Set it up" onPress={next} />,
      };

    case 'screen-time':
      return {
        body: (
          <View style={styles.top}>
            <Voice text="I need Screen Time access." size={VoiceSize.headline} header />
            <View style={styles.gapHeadline} />
            <Body>It’s how I put apps to sleep. What you use stays on your phone. I never see it.</Body>
            <AppleAlertPicture
              title="“Locturne” Would Like to Access Screen Time"
              message="Providing “Locturne” access to Screen Time may allow it to see your activity data, restrict content, and limit the usage of apps and websites."
              buttons={['Continue', 'Don’t Allow']}
              point={0}
            />
            {compact ? null : <Voice text="Apple’s box is boring. So am I." size={VoiceSize.aside} delay={600} sub />}
          </View>
        ),
        footer: (
          <PrimaryButton
            label="Continue"
            onPress={() =>
              simulate('iOS asks for Screen Time access here. The real prompt needs Apple’s Family Controls approval.', next)
            }
          />
        ),
      };

    case 'apps': {
      const picked = answers.apps.length > 0;
      return {
        body: (
          <View style={styles.top}>
            <Title>Which apps keep you up?</Title>
            <Body style={styles.sub}>They sleep at bedtime and wake after your walk. Calls and texts aren’t touched.</Body>
            <View style={styles.appsCard}>
              <AppsCard apps={answers.apps} onOpen={openPicker} maxRows={compact ? 4 : 6} onIconRef={onIconRef} />
            </View>
          </View>
        ),
        footer: (
          <PrimaryButton
            label={!picked ? 'Add apps' : editing ? 'Save' : `Put ${answers.apps.length} to sleep`}
            // Editing from the summary just saves; the first time, they watch them fall asleep.
            onPress={!picked ? openPicker : editing ? next : putToSleep}
          />
        ),
      };
    }

    case 'ready':
      return {
        body: (
          <View style={styles.top}>
            <Title>Tonight’s lock is ready.</Title>
            <ScheduleCard
              bedtime={answers.bedtime}
              wake={answers.wake}
              apps={answers.apps}
              compact={compact}
              onChange={edit}
            />
            <Body>{lateNight ? `It’s already past ${bed}. I start the second you’re in.` : 'It isn’t on yet.'}</Body>
            <View style={styles.gapAside} />
            <Voice text="I’m ready. Emotionally, less so." size={VoiceSize.aside} delay={700} sub />
          </View>
        ),
        footer: <PrimaryButton label="Looks right" onPress={next} />,
      };

    case 'commit':
      return {
        body: (
          <View style={styles.top}>
            <Eyebrow>The deal</Eyebrow>
            <Title>{`Phone down at ${bed}. Up for 200\u00A0steps.`}</Title>
            <View style={styles.gapHeadline} />
            <Body>
              {apps} sleep until you’ve walked. Passes cover sick days and travel. Change anything later.
            </Body>
          </View>
        ),
        footer: <HoldButton label="Hold to agree" doneLabel="Fine. Deal." onComplete={next} />,
      };

    case 'offer': {
      const headline = numbers.lightUser
        ? LIGHT_OFFER_HEADLINE
        : (OFFER_HEADLINES[answers.timeBack ?? 'else'] ?? OFFER_HEADLINES.else);
      return {
        body: (
          <View style={styles.top}>
            <Voice text={headline} size={VoiceSize.headline} header />
            <View style={styles.gapHeadline} />
            <Body>{ALARM_ECHO[answers.alarm ?? ''] ?? 'I guard them at night. You do the walking.'}</Body>
            {PRICES.trialEligible ? (
              // The trial timeline (Blinkist pattern): the most replicated paywall win in
              // docs/sub-club/themes/02-paywall-design-and-copy.md. Day 5 matches the reminder toggle.
              <View style={styles.plan}>
                <PlanRow when="Tonight" what={`${apps} sleep at ${bed}. $0 today.`} />
                <PlanRow when="Day 5" what="I remind you. Grudgingly." />
                <PlanRow
                  when={`Day ${PRICES.trialDays}`}
                  what={`${dateFromToday(PRICES.trialDays)}: ${money(PRICES.annual)} for the year, unless you cancel before then.`}
                />
              </View>
            ) : (
              <View style={styles.plan}>
                {!numbers.lightUser ? (
                  <PlanRow when="Now" what={`About ${weeklyAmount(numbers.weeklyMinutes)} a week on your phone in bed.`} />
                ) : null}
                <PlanRow when="With me" what={`${apps} can’t open from ${bed} until you’ve walked 200 steps.`} />
              </View>
            )}
            <Reveal>
              <Text style={styles.reassure}>{noOrphan('Only the apps you pick. Emergency unlock, anytime.')}</Text>
            </Reveal>
          </View>
        ),
        footer: <PrimaryButton label={PRICES.trialEligible ? 'See the free week' : 'See plans'} onPress={next} />,
      };
    }

    case 'plans':
      return plansStep(answers, set, purchased, simulate, compact, bed);

    case 'declined':
      return declinedStep(exitArm, purchased, simulate, exit);

    case 'armed':
      return {
        body: (
          <View style={styles.top}>
            <Voice text={lateNight ? 'Armed. Starting now. Put it down.' : `Armed. See you at ${bed}.`} size={VoiceSize.headline} header />
            <View style={styles.gapHeadline} />
            <Body>
              {answers.plan === 'annual' && PRICES.trialEligible && answers.remindTrial
                ? 'A heads-up before bedtime. And a warning two days before your trial bills, if you let me send notifications.'
                : 'A heads-up before bedtime. That’s it. I’m not chatty.'}
            </Body>
            <View style={styles.gapBlock} />
            <PreviewNote>
              In the real app, “Armed” only shows once tonight’s schedule is confirmed. If it can’t be set, it says so.
            </PreviewNote>
          </View>
        ),
        footer: (
          <PrimaryButton
            label="Continue"
            onPress={() => simulate('iOS asks for notification permission here. “Don’t Allow” is always an option.', next)}
          />
        ),
      };

    case 'first-morning':
      // The last screen: what tomorrow looks like, then bed.
      return {
        body: (
          <View style={styles.top}>
            <Title>{`${wakeDay}, ${wake}.`}</Title>
            <View style={styles.plan}>
              <PlanRow when="Steps" what={`Count from ${wake}. Bathroom, kitchen, it all counts.`} />
              <PlanRow when="At 200" what="Open a sleeping app and tap Check steps. Or just open me." />
              <PlanRow when="Bad day" what="Use a pass. No walking." />
            </View>
            <Voice text={lateNight ? 'That’s it. Go to sleep.' : `That’s it. Bed at ${bed}.`} size={VoiceSize.aside} delay={700} sub />
            <View style={styles.gap8} />
            <Voice text="I’ll be asleep. Don’t wake me." size={VoiceSize.aside} delay={1300} sub />
          </View>
        ),
        footer: <PrimaryButton label="Finish preview" onPress={exit} />,
      };
  }
}

/**
 * A list question on the risen moon, after Headspace's "What's on your mind?": centred
 * title and hint at the top of the moon's surface, black option pills anchored at the
 * bottom where thumbs are.
 */
function moonQuestion(title: string, sub: string | undefined, options: ReactNode) {
  return {
    body: (
      <View style={styles.moonQuestion}>
        <MoonQuestionHead title={title} sub={sub} />
        {options}
      </View>
    ),
  };
}

/** The question sits up near the top bar, above the moon's curve, not on the moon. */
function MoonQuestionHead({ title, sub }: { title: string; sub?: string }) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ marginTop: 60 - quizContentTop(height, insets.top) }}>
      <Title style={styles.moonTitle}>{title}</Title>
      {sub ? <Body style={[styles.sub, styles.moonSub]}>{sub}</Body> : null}
    </View>
  );
}

/**
 * The paywall, after the user's two references: a dark card paywall (title, checklist,
 * radio plan rows) with the plant app's plan list (Annual, Monthly, reminder toggle).
 * Lifetime was dropped: at $99.99 next to a $59.99 annual it skipped the trial and capped LTV. Annual is selected by default and shows its per-month price. Apple 3.1.2: the
 * billed amount stays the biggest price on each card, and per-month sits under it.
 * No struck-through "was" prices: there was never a higher price to strike.
 */
function plansStep(
  answers: Answers,
  set: StepContext['set'],
  purchase: () => void,
  simulate: StepContext['simulate'],
  compact: boolean,
  bed: string,
): StepView {
  // One line in the checklist: the first app by name, the rest as a count.
  const [first, ...rest] = answers.apps;
  const apps = !first ? 'Your apps' : rest.length ? `${first} and ${rest.length} more` : first;
  const trial = PRICES.trialEligible;
  const annual = money(PRICES.annual);
  const monthly = money(PRICES.monthly);
  const plan = answers.plan;
  const trialPlan = plan === 'annual' && trial;
  const link = (label: string, message: string) => (
    <Text accessibilityRole="link" style={styles.link} onPress={() => simulate(message, () => {})}>
      {label}
    </Text>
  );
  const cta = {
    annual: trial
      ? { title: `Start ${PRICES.trialDays}-day free trial`, sub: 'No payment due now · cancel anytime' }
      : { title: `Subscribe for ${annual}/year`, sub: 'Cancel anytime in Settings' },
    monthly: { title: `Subscribe for ${monthly}/month`, sub: 'Billed today · cancel anytime' },
  }[plan];
  const summary = {
    annual: trial
      ? `Free until ${dateFromToday(PRICES.trialDays)}, then ${annual}/year.`
      : `${annual}/year. Cancel anytime.`,
    monthly: `${monthly} today, then monthly. Cancel anytime.`,
  }[plan];
  const terms = {
    annual: `${trial ? `${PRICES.trialDays} days free, then ${annual}/year from ${dateFromToday(PRICES.trialDays)}` : `${annual}/year`}. Auto-renews unless cancelled at least 24 hours before renewal.`,
    monthly: `${monthly}/month. Auto-renews unless cancelled at least 24 hours before renewal.`,
  }[plan];
  return {
    body: (
      <View style={[styles.paywall, compact && styles.paywallCompact]}>
        <Reveal>
          <Text style={[styles.paywallTitle, compact && styles.paywallTitleCompact]} accessibilityRole="header">
            {trial ? 'Try Locturne free' : 'Pick a plan'}
          </Text>
        </Reveal>
        {compact ? null : (
          <View style={styles.paywallVoice}>
            <Voice
              text={trial ? 'Seven nights free. I’ll sleep through most of them.' : 'Fine. I’ll get up for this.'}
              size={VoiceSize.aside}
              delay={500}
              sub
              center
            />
          </View>
        )}
        <View style={[styles.checks, compact && styles.checksCompact]}>
          <Check text={`${apps} sleep at ${bed}`} />
          <Check text="Awake again after 200 morning steps" />
          <Check text="Passes for sick days and travel" />
        </View>
        <View accessibilityRole="radiogroup" style={styles.planCards}>
          <PlanCard
            selected={plan === 'annual'}
            onPress={() => set('plan', 'annual')}
            title="Annual"
            // The billed amount is the big number (App Review 3.1.2); the monthly equivalent is the detail.
            price={`${annual}/year`}
            detail={`${money(PRICES.annual / 12)}/month${trial ? ` · ${PRICES.trialDays} days free` : ''}`}
            badge={`Save ${annualSavings()}%`}
            compact={compact}
          />
          <PlanCard
            selected={plan === 'monthly'}
            onPress={() => set('plan', 'monthly')}
            title="Monthly"
            price={`${monthly}/month`}
            detail="No free trial"
            compact={compact}
          />
        </View>
        {/* One plain sentence about what happens next, at reading size rather than in the fine print. */}
        <Text style={styles.planSummary}>{summary}</Text>
        {/* Only the trial has an end to be reminded about. Keeps its height so the page doesn't jump. */}
        <View style={[styles.remindRow, !trialPlan && styles.hiddenBlock, { pointerEvents: trialPlan ? 'auto' : 'none' }]}>
          <Text style={styles.remindLabel}>Remind me 2 days before it ends</Text>
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
            accessibilityLabel="Remind me 2 days before the trial ends"
          />
        </View>
      </View>
    ),
    // The terms sit right above the button that buys, so the button keeps the same spot as every other screen.
    footer: (
      <>
        <Text style={styles.paywallFine}>
          {terms} Preview: nothing is charged.{' '}
          {link('Restore', 'Restore Purchases runs here, for anyone who already subscribed.')} ·{' '}
          {link('Terms', 'Your Terms of Use open here.')} · {link('Privacy', 'Your Privacy Policy opens here.')}
        </Text>
        <TwoLineCta title={cta.title} sub={cta.sub} onPress={purchase} />
      </>
    ),
  };
}

/**
 * One real offer for people who closed the paywall, picked by the exit-offer test
 * (`EXIT_OFFERS` in content.ts): half-price annual, or full-price annual with a longer
 * trial. Shown once (a second exit really exits), and no timer. The full price is named
 * as a plain comparison, never struck through. The real app must remember it was shown,
 * so the offer can't be farmed by reinstalling onboarding.
 */
function declinedStep(
  arm: ExitOffer,
  purchase: () => void,
  simulate: StepContext['simulate'],
  exit: () => void,
): StepView {
  const longer = arm === 'longer-trial';
  // `longer-trial` only reaches this screen for trial-eligible users.
  const trial = PRICES.trialEligible;
  const days = longer ? PRICES.extendedTrialDays : PRICES.trialDays;
  const full = money(PRICES.annual);
  const price = longer ? full : money(PRICES.annualOffer);
  const link = (label: string, message: string) => (
    <Text accessibilityRole="link" style={styles.link} onPress={() => simulate(message, () => {})}>
      {label}
    </Text>
  );
  return {
    body: (
      <View style={styles.top}>
        <Voice text={longer ? 'Fair. Two free weeks, then.' : 'Fair. Half price, then.'} size={VoiceSize.headline} header />
        <View style={styles.gapHeadline} />
        <Body>
          {longer
            ? `${days} days free instead of ${PRICES.trialDays}, then ${full} a year. This only shows up here, once.`
            : `Annual for ${price} a year instead of ${full}${trial ? `, still with ${days} days free` : ''}. This price only shows up here, once.`}
        </Body>
        <View style={styles.gapAside} />
        <Voice text="Don’t tell the others." size={VoiceSize.aside} delay={600} sub />
        <View style={styles.gapSection} />
        <Body>Or leave. Your setup is saved, and nothing locks unless you start.</Body>
      </View>
    ),
    footer: (
      <>
        <Text style={styles.paywallFine}>
          {`${trial ? `${days} days free, then ${price}/year from ${dateFromToday(days)}` : `${price}/year`}. Auto-renews at ${price}/year unless cancelled at least 24 hours before renewal.`}{' '}
          Preview: nothing is charged. {link('Terms', 'Your Terms of Use open here.')} ·{' '}
          {link('Privacy', 'Your Privacy Policy opens here.')}
        </Text>
        <TwoLineCta
          title={trial ? `Start ${days}-day free trial` : `Subscribe for ${price}/year`}
          sub={trial ? `Then ${price}/year · cancel anytime` : 'Cancel anytime in Settings'}
          onPress={purchase}
        />
      </>
    ),
    secondary: <TextButton label="No thanks" onPress={exit} />,
  };
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

function MathScreen({ line, onDone }: { line: string; onDone: () => void }) {
  // Only what the number is made of: bedtime and wake come after it, in setup.
  const lines = ['Nights in bed with your phone', 'Mornings before you get up', 'Nights a week'];
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const timers = lines.map((_, i) =>
      setTimeout(() => {
        haptic.tick();
        setShown(i + 1);
      }, 500 + i * 650),
    );
    timers.push(setTimeout(onDone, 500 + lines.length * 650 + 300));
    return () => timers.forEach(clearTimeout);
    // Runs once per visit to this step.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.top}>
      <Voice text={line} size={VoiceSize.headline} header />
      <View style={styles.mathList}>
        {lines.map((line, i) => (
          <Reveal key={line} style={[styles.mathRow, i >= shown && styles.faded]}>
            <View style={[styles.mathDot, i < shown && styles.mathDotDone]} />
            <Text style={styles.mathLabel}>{line}</Text>
          </Reveal>
        ))}
      </View>
    </View>
  );
}

/** Above this many hour-squares the grid switches to one square per day. */
const MAX_HOUR_SQUARES = 1000;
const CAPTION_SPACE = 34;
const DAYS_PER_MONTH = 30.44;

function RevealScreen({ numbers }: { numbers: Estimate }) {
  const [landed, setLanded] = useState(false);
  const [filled, setFilled] = useState(false);
  const [area, setArea] = useState({ width: 0, height: 0 });
  const compact = useCompact();

  // The rest of their life, one box per month, with the months on the phone in bed lit.
  // Without an age there's no lifetime, so fall back to one year of hours or days.
  // The caption sits right under the squares, so leave room for it.
  const gridHeight = area.height - CAPTION_SPACE;
  const lifeMonths = numbers.yearsLeft * 12;
  const litMonths = Math.max(1, Math.round(numbers.lifetimeDays / DAYS_PER_MONTH));
  const lifeFit = lifeMonths > 0 && numbers.lifetimeDays > 0 ? fitSquares(lifeMonths, area.width, gridHeight) : null;
  const hourFit =
    !lifeFit && numbers.yearlyHours <= MAX_HOUR_SQUARES ? fitSquares(numbers.yearlyHours, area.width, gridHeight) : null;
  const unit: 'hour' | 'day' = hourFit ? 'hour' : 'day';
  const squares = lifeFit ? lifeMonths : hourFit ? numbers.yearlyHours : Math.max(1, numbers.yearlyDays);
  const yearSquares = hourFit ? numbers.yearlyHours : Math.max(1, numbers.yearlyDays);
  const fit = lifeFit ?? hourFit ?? fitSquares(squares, area.width, gridHeight);
  const lifetime = lifetimeSentence(numbers.lifetimeDays);

  if (numbers.lightUser) {
    return (
      <View style={styles.top}>
        <Voice text="You’re barely on it." size={VoiceSize.headline} header />
        <View style={styles.gapHeadline} />
        <Body>
          About {weeklyAmount(numbers.weeklyMinutes)} a week on your phone in bed. So I’ll mostly handle mornings.
          Apps stay asleep until you’re up.
        </Body>
        <View style={styles.gapAside} />
        <Voice text="You’re already ahead. I’ll keep it that way." size={VoiceSize.aside} delay={700} sub />
      </View>
    );
  }

  const onArea = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setArea((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
  };

  return (
    <View style={styles.revealWrap}>
      <Reveal>
        <Body style={styles.revealLead}>Based on your answers, you spend about…</Body>
      </Reveal>
      <View
        accessible
        accessibilityRole="header"
        accessibilityLabel={`About ${weeklyAmount(numbers.weeklyMinutes)} a week on your phone in bed`}
      >
        <RollingNumber
          value={numbers.weeklyHours}
          format={(v) => `${formatHalves(v)} ${v === 1 ? 'hour' : 'hours'}`}
          onLanded={setLanded}
          rowHeight={compact ? 44 : 60}
          fontSize={compact ? 40 : 54}
        />
      </View>
      <Body style={styles.revealSub}>…a week on your phone in bed.</Body>

      <View style={styles.gridArea} onLayout={onArea}>
        {landed && fit ? (
          <>
            {/* The payoff carries the meaning for VoiceOver; the squares are decoration. */}
            <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <RevealGrid squares={squares} lit={lifeFit ? litMonths : squares} fit={fit} onFilled={() => setFilled(true)} />
            </View>
            <FadeWhen visible={filled}>
              <Text style={styles.gridCaption}>
                {lifeFit ? 'The rest of your life. Each box is 1 month.' : `One year. Each box is 1 ${unit}.`}
              </Text>
            </FadeWhen>
          </>
        ) : null}
      </View>

      <FadeWhen visible={filled}>
        {/* With the life grid, the lifetime line leads and the year line backs it up. */}
        {lifeFit && lifetime ? (
          <>
            <Text style={styles.payoff}>{lifetime}</Text>
            <Text style={styles.payoffLifetime}>{yearAmount(numbers.yearlyDays, 'day')}</Text>
          </>
        ) : (
          <>
            <Text style={styles.payoff}>{yearSentence(yearSquares, unit)}</Text>
            {lifetime ? <Text style={styles.payoffLifetime}>{lifetime}</Text> : null}
          </>
        )}
      </FadeWhen>
    </View>
  );
}

function FadeWhen({ visible, children }: { visible: boolean; children: ReactNode }) {
  const reduced = useReducedMotion();
  if (!visible) return <View style={styles.hiddenBlock}>{children}</View>;
  if (reduced) return <View>{children}</View>;
  return (
    <Animated.View
      style={{
        animationName: { from: { opacity: 0, transform: [{ translateY: 8 }] }, to: { opacity: 1, transform: [{ translateY: 0 }] } },
        animationDuration: '420ms',
        animationTimingFunction: 'ease-out',
      }}
    >
      {children}
    </Animated.View>
  );
}

function Beat({ label, text }: { label: string; text: string }) {
  return (
    <Reveal style={styles.beat}>
      <Text style={styles.beatLabel}>{label}</Text>
      <Text style={styles.beatText}>{text}</Text>
    </Reveal>
  );
}

function PlanRow({ when, what, onChange }: { when: string; what: string; onChange?: () => void }) {
  return (
    <Reveal style={styles.planRow}>
      <Text style={styles.planWhen}>{when}</Text>
      <Text style={styles.planWhat}>{what}</Text>
      {onChange ? (
        <Pressable onPress={onChange} accessibilityRole="button" accessibilityLabel={`Change ${when}`} hitSlop={10}>
          <Text style={styles.change}>Change</Text>
        </Pressable>
      ) : null}
    </Reveal>
  );
}

/** Blinkist's pinned button: the action on top, the reassurance underneath, in one pill. */
function TwoLineCta({ title, sub, onPress }: { title: string; sub: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${sub}`}
      style={({ pressed }) => [styles.twoLineCta, pressed && styles.pressedCta]}
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

function SimulatedPrompt({ prompt, onContinue }: { prompt: Simulated | null; onContinue: () => void }) {
  return (
    <Modal visible={prompt !== null} transparent animationType="fade" onRequestClose={onContinue}>
      <PromptCard message={prompt?.message ?? ''} onContinue={onContinue} />
    </Modal>
  );
}

function PromptCard({ message, onContinue }: { message: string; onContinue: () => void }) {
  return (
    <View style={styles.modalScrim}>
      <View style={styles.modalCard}>
        <Text style={styles.modalLabel}>PREVIEW</Text>
        <Text style={styles.modalText}>{message}</Text>
        <PrimaryButton label="Continue" onPress={onContinue} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Clipped: the sky's moon layers run past the screen edges, which on web widened the
  // page so full-screen sheets and prompts spilled off the right side.
  root: { flex: 1, backgroundColor: Nocturne.bg, overflow: 'hidden' },
  fill: { flex: 1 },
  // Every dark-sky page anchors here, so headlines start at the same height on each one.
  top: { flex: 1, paddingTop: Gap.pageTop },
  center: { flex: 1, justifyContent: 'center' },
  // Standalone text on the quiz moon starts just under its curve, never down by the buttons.
  moonTop: { flex: 1 },
  bottomStack: { flex: 1, justifyContent: 'flex-end', paddingBottom: Space.xl },
  gap8: { height: Space.s },
  gapHeadline: { height: Gap.headline },
  gapAside: { height: Gap.aside },
  gapBlock: { height: Gap.block },
  gapSection: { height: Gap.section },
  sub: { marginTop: Gap.headline },
  moonQuestion: { flex: 1, justifyContent: 'space-between', gap: Space.xl, paddingBottom: Space.s },
  moonTitle: { textAlign: 'center', ...Type.quizTitle },
  moonSub: { textAlign: 'center', color: Nocturne.text },
  timeWrap: { marginTop: Gap.block },
  warning: { marginTop: Gap.block, textAlign: 'center', color: Nocturne.text },
  beats: { marginTop: Gap.block, gap: Space.xl },
  beat: { gap: Space.s },
  beatLabel: Type.label,
  beatText: { ...DisplayFont, color: Nocturne.text, fontSize: 26, lineHeight: 30 },
  // Numbers use the serif upright. Italic serif always means Loc is talking.
  // The stat sits on the quiz moon, centred like the rest of the moon pages.
  statNumber: { ...NUMBER_FONT, color: Nocturne.accent ?? Nocturne.text, fontSize: 108, lineHeight: 112, letterSpacing: -1, textAlign: 'center' },
  statText: { color: Nocturne.text, ...Type.body, marginTop: Gap.headline, textAlign: 'center' },
  mathList: { marginTop: Gap.block, gap: Space.l },
  mathRow: { flexDirection: 'row', alignItems: 'center', gap: Space.m },
  faded: { opacity: 0.35 },
  mathDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 1.5, borderColor: Nocturne.text2 },
  mathDotDone: { backgroundColor: Nocturne.text, borderColor: Nocturne.text },
  mathLabel: { color: Nocturne.text, ...Type.body },
  revealWrap: { flex: 1, paddingTop: Gap.pageTop },
  revealLead: { textAlign: 'center', color: Nocturne.text, ...Type.body, marginBottom: Space.s },
  revealSub: { marginTop: Space.s, textAlign: 'center' },
  gridArea: { flex: 1, justifyContent: 'center', marginVertical: Space.l, minHeight: 80 },
  gridCaption: { color: Nocturne.text2, ...Type.secondary, marginTop: Space.m, textAlign: 'center' },
  hiddenBlock: { opacity: 0 },
  appsCard: { marginTop: Gap.block },
  plan: { marginVertical: Gap.block, gap: Space.m },
  planRow: { flexDirection: 'row', gap: Space.m, alignItems: 'baseline' },
  planWhen: { width: 78, ...Type.rowKey, fontVariant: ['tabular-nums'] },
  planWhat: { flex: 1, color: Nocturne.text, ...Type.body },
  change: { color: Nocturne.text2, fontSize: 14, fontWeight: '600', textDecorationLine: 'underline' },
  reassure: { color: Nocturne.text2, ...Type.secondary },
  shiftRow: { marginTop: Space.l, flexDirection: 'row', justifyContent: 'center', marginBottom: Space.m },
  payoff: { ...NUMBER_FONT, color: Nocturne.accent ?? Nocturne.text, fontSize: 26, lineHeight: 32, letterSpacing: 0.2, textAlign: 'center' },
  payoffLifetime: { color: Nocturne.text2, ...Type.body, marginTop: Space.s, textAlign: 'center' },

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
  paywallFine: { color: Nocturne.text2, ...Type.legal, textAlign: 'center' },
  link: { color: Nocturne.text, textDecorationLine: 'underline' },

  modalScrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: Gap.gutter,
  },
  modalCard: { backgroundColor: Nocturne.raised, borderRadius: Radius.card, padding: Space.xl, gap: Space.m },
  modalLabel: Type.label,
  modalText: { color: Nocturne.text, ...Type.body },
});
