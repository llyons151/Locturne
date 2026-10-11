'use no memo';
// Reads the App Group during render through `methodCopy` (the step goal, a saved scan code),
// which changes outside React: the React Compiler would cache it (#130), so it stays out here.

import type { ReactNode } from 'react';
import { Linking, Share, StyleSheet, useWindowDimensions, View } from 'react-native';
import { GlassCard } from '@/components/glass-card';
import { Text } from '@/components/text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppsCard, type LivePicks } from '@/components/app-picker';
import { PrimaryButton, TextButton } from '@/components/buttons';
import { DayPicker } from '@/components/day-picker';
import { Reveal } from '@/components/motion';
import { quizContentTop } from '@/components/night-sky';
import { TimeWheel } from '@/components/time-wheel';
import type { ArmFailure, ArmResult } from '@/lib/arm';
import { BEDTIME_WARNING, TONE_COPY, type NotificationPermission } from '@/lib/notifications';
import { reminderDay, type Offers, type PurchaseTarget } from '@/lib/purchases';
import { getScanEditRefusal } from '@/lib/scan';
import type { WakeMethod } from '@/lib/routine';
import type { Night } from '@/lib/lock-state';
import { shieldCopy } from '@/lib/shield-copy';
import { TONE_LABEL, TONES } from '@/lib/tone';
import { scheduleCopy } from './schedule-copy';
import { noOrphan } from '@/lib/text';
import { DisplayFont, Gap, Nocturne, Radius, Space, Type, VoiceSize } from '@/theme';

import {
  FOUND,
  FOUND_REPLY,
  initialAnswers,
  LIGHT_OFFER_HEADLINE,
  METHOD_CHOICES,
  METHOD_COPY,
  moreMethods,
  morningGoals,
  methodCopy,
  MORNING_MINUTES_REPLY,
  morningMinuteChoices,
  NIGHT_MINUTES_REPLY,
  nightMinuteChoices,
  NIGHTS,
  NIGHTS_REPLY,
  NEW_YEAR,
  OFFER_HEADLINES,
  REPLY_BUTTON,
  TIME_BACK,
  TIME_BACK_REPLY,
  timeBackQuestion,
  TONE_STEP,
  TRIED,
  TRIED_REPLY,
  WALK_GOAL,
  walkLine,
  type Answers,
  type ExitOffer,
  type StepId,
} from './content';
import type { MotionAccess } from './motion';
import {
  dateFromToday,
  formatClock,
  formatHoursFromMinutes,
  formatWhen,
  weeklyAmount,
  type Estimate,
} from './estimate';
import { ScheduleCard } from './schedule-card';
import { declinedStep, plansStep, storeStep } from './screens/paywall';
import { RevealScreen } from './screens/reveal-screen';
import { WalkMeter } from './screens/walk-meter';
import { ToneSlider } from './tone/tone-slider';
import { TomorrowDemo } from './screens/tomorrow-demo';
import { Body, Chip, Eyebrow, HoldButton, NotePreview, Options, page, PreviewNote, Ready, Reply, Title, TonightStrip, Voice } from './ui';
import { wakeDayFor, walkCopy } from './walk-copy';

/** Everything a step needs from the flow: the answers so far and the ways to move on. */
export type StepContext = {
  step: StepId;
  scheduledNight: Night | null;
  answers: Answers;
  numbers: Estimate;
  set: <K extends keyof Answers>(key: K, value: Answers[K]) => void;
  choose: <K extends keyof Answers>(key: K) => (value: Answers[K]) => void;
  next: () => void;
  go: (to: StepId) => void;
  edit: (to: StepId) => void;
  exit: () => void;
  /** Web preview only: stands in for what only an iPhone can do. */
  simulate: (message: string, then: () => void) => void;
  /** Short phone: layouts tighten so nothing scrolls. */
  compact: boolean;
  /** The stairs question's "Other ways" link was tapped. */
  showMoreMethods: boolean;
  showMethods: () => void;
  /** Onboarding is happening inside the bedtime window, e.g. at 12:40 AM. */
  lateNight: boolean;
  /** January 1–9: the New Year copy (`isNewYearWeek`), or `?newyear=1` in review. */
  newYear: boolean;
  /** Which exit offer `declined` shows. Never `none` there: that arm skips the screen. */
  exitArm: ExitOffer;
  editing: boolean;

  /** The store's plans and trials (`getOffers`). Null while loading or after a failure. */
  offers: Offers | null;
  offersFailed: boolean;
  retryOffers: () => void;
  /** Buys a plan or the exit offer. On success the setup is saved and tonight arms. */
  buy: (target: PurchaseTarget) => void;
  /** A purchase or restore is in flight. */
  busy: boolean;
  restorePurchases: () => void;
  /** Already subscribed (restored): setup skips the paywall and arms. */
  entitled: boolean;
  /** Saves the setup and arms tonight, for someone already entitled. */
  finishSetup: () => void;

  /** Screen Time access on this step: asked, and if refused, said plainly. */
  screenTime: 'idle' | 'asking' | 'refused';
  askScreenTime: () => void;
  /** On an iPhone, the real night list, drawn natively; null in the web preview. */
  live: LivePicks | null;
  /** Opens Apple's picker on iOS, or the stand-in in the preview. */
  openPicker: () => void;
  /** Plays the apps falling asleep into the moon, then moves on. Preview only. */
  putToSleep: () => void;
  onIconRef: (app: string, view: View | null) => void;

  /** Handing tonight to iOS after purchase. `working` until iOS answers. */
  arm: ArmResult | { status: 'working' };
  retryArm: () => void;
  /** Asks for notifications if iOS still would, then leaves for the Routine tab (`arm` came back `nights-off`). */
  openRoutine: () => void;
  /** Motion & Fitness: answered on the walk or on `armed`. Null while iOS would still ask. */
  motion: MotionAccess | null;
  /** Notifications, as iOS has them once `armed` is shown. Null until checked. */
  notifications: NotificationPermission | null;
  /** When the trial bought in this session ends; null for no trial (monthly, restore). */
  trialEnds: Date | null;
  /** `armed`'s Continue: iOS's notification prompt, then Motion's, whichever are still unasked. */
  askPermissions: () => void;
  /** iOS's prompts are up: Continue waits, so a double tap can't skip a step. */
  asking: boolean;
  /** The 20-step walk, right after the demo: live on an iPhone, faked in the web preview. */
  walk: WalkState;
  /** How long the walk took, once it's done. */
  walkSeconds: number | null;
  /** Starts counting; iOS asks for Motion & Fitness at this moment. */
  startWalk: () => void;
  /** The reveal's or the demo's payoff has played (or the backstop ran out): its button wakes. */
  payoff: boolean;
  onPayoff: () => void;
};

export type WalkState = {
  phase: 'idle' | 'counting' | 'done' | 'denied' | 'unavailable';
  steps: number;
};

// Four presets: one row under the time wheel.
const BEDTIME_PRESETS = [22 * 60, 23 * 60, 23 * 60 + 30, 0];
const WAKE_PRESETS = [6 * 60, 7 * 60, 7 * 60 + 30, 8 * 60];
// Night-shift schedules: sleep in the morning, up in the afternoon.
const SHIFT_BEDTIME_PRESETS = [7 * 60, 8 * 60, 9 * 60, 10 * 60];
const SHIFT_WAKE_PRESETS = [14 * 60, 15 * 60, 16 * 60, 17 * 60];

/** The cold open. Same line at every hour; New Year week has its own (`NEW_YEAR`). */
const HELLO = { head: 'No apps until you’re out of bed.', sub: 'I’m Loc. Raccoon. I don’t do mornings well either.' };

/** What one step puts on screen. The flow places these in the page frame (ui.tsx Shell). */
export type StepView = {
  body: ReactNode;
  footer?: ReactNode;
  /** One text link, shown just above the primary button so the button stays at the bottom. */
  secondary?: ReactNode;
};

/** What each step shows. One case per step, in the order of STEPS in content.ts. */
export function renderStep(ctx: StepContext): StepView {
  const { step, answers, numbers, set, next, edit, exit, simulate, lateNight, compact, editing, openPicker, putToSleep, onIconRef, live, offers } = ctx;
  const schedule = scheduleCopy(ctx.scheduledNight, new Date());
  const bed = formatWhen(answers.bedtime);
  const wake = formatClock(answers.wake);
  // The first locked morning's day: this morning, later today or tomorrow (`wakeDayFor`).
  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  const wakeDay = wakeDayFor({ bedtime: answers.bedtime, wake: answers.wake, now: nowMinutes, lateNight });
  // Installed in the small hours with morning under an hour away: no "Go to sleep".
  const morningSoon = wakeDay === 'This morning' && answers.wake - nowMinutes < 60;
  // A scan code can't be set while the apps sleep, so finishing at night or in an unproved
  // morning, it waits for the day after the first morning (`getScanEditRefusal`).
  const method = methodCopy(answers.method ?? 'steps', { codeWaits: lateNight || getScanEditRefusal() !== null, wake: answers.wake });
  // The step target and push-up count the first morning runs on: a rerun keeps Routine's.
  const goals = morningGoals();
  // How many picks: the real count on an iPhone, the stand-in names in the preview.
  const pickCount = live ? live.count : answers.apps.length;
  // The quiz's button is their reply to him, and waits, invisible, for an answer.
  const replyButton = (answered: boolean, label = REPLY_BUTTON[step] ?? 'Continue') => (
    <Ready ready={answered}>
      <PrimaryButton label={label} disabled={!answered} onPress={next} />
    </Ready>
  );
  const nightMinutes = answers.nightMinutes ?? 0;
  // Tonight, filling in as setup goes: the times, how they'll prove they're up, the apps.
  const tonight = (upTo: 'times' | 'method' | 'apps') => [
    `${formatClock(answers.bedtime)} → ${wake}`,
    upTo === 'times' ? null : method.short,
    upTo === 'apps' && pickCount > 0 ? `${pickCount} ${pickCount === 1 ? 'app' : 'apps'}` : null,
  ];

  switch (step) {
    case 'hello': {
      const hello = ctx.newYear ? NEW_YEAR.hello : HELLO;
      return {
        body: (
          <View style={styles.bottomStack}>
            <Voice text={hello.head} size={VoiceSize.hero} />
            <View style={page.gapHeadline} />
            <Voice text={hello.sub} size={24} delay={800} sub />
          </View>
        ),
        footer: <PrimaryButton label="Go on" onPress={next} />,
        secondary: (
          <TextButton label="Already subscribed? Restore" onPress={ctx.restorePurchases} />
        ),
      };
    }

    case 'deal':
      return {
        body: (
          <View style={page.top}>
            <Title>Here’s the deal.</Title>
            <View style={styles.beats}>
              <Beat label="Bedtime" text="Your apps go to sleep. So do I." />
              <Beat label="Morning" text="They stay asleep until you’re up. Same as me." />
              <Beat label="Up means up" text="A trip downstairs or a short walk. Then we all wake up." />
            </View>
            {/* Was its own screen ("intro"). Folded in so the first tap comes one screen sooner;
                kept to one line so screen 2 isn't a wall. The picked apps staying on the phone
                is said where it matters, on `screen-time`. Quiz answers go to analytics
                (docs/ANALYTICS.md), so no "stays on your phone" here. */}
            <View style={page.gapSection} />
            <Body>{`Two minutes of questions first. No name, no email.${ctx.newYear ? ` ${NEW_YEAR.deal}` : ''}`}</Body>
          </View>
        ),
        footer: <PrimaryButton label="Ask away" onPress={next} />,
      };

    case 'voice': {
      // CARROT's personality slider: his words from here on, shown as the real morning shield.
      const tone = TONE_STEP[answers.tone];
      const shield = shieldCopy('morning', { morningStart: answers.wake, method: 'downstairs', stepGoal: 200 }, null, answers.tone);
      return {
        body: (
          <View style={page.top}>
            <Title>How grumpy should I be?</Title>
            <Body style={styles.sub}>It’s how I talk to you at bedtime and in the morning. Change it anytime in You.</Body>
            <View style={styles.toneSlider}>
              <ToneSlider value={answers.tone} onChange={(value) => set('tone', value)} />
              <View style={styles.toneLabels}>
                {TONES.map((t) => (
                  <Text key={t} style={[styles.toneLabel, t === answers.tone && styles.toneLabelOn]}>
                    {TONE_LABEL[t]}
                  </Text>
                ))}
              </View>
            </View>
            <Reply text={tone.line} />
            <View style={styles.shieldPreview} accessible accessibilityLabel={`Your morning screen will say: ${shield.title}`}>
              <Text style={styles.shieldEyebrow}>WHAT YOUR APPS SAY AT 7 AM</Text>
              <Text key={shield.title} style={styles.shieldTitle}>{shield.title}</Text>
              <View style={styles.shieldButton}>
                <Text style={styles.shieldButtonText}>{shield.button}</Text>
              </View>
            </View>
          </View>
        ),
        footer: <PrimaryButton label={tone.button} onPress={next} />,
      };
    }

    case 'found':
      return {
        body: (
          <View style={page.top}>
            <Title>How’d you find me?</Title>
            <Body style={styles.sub}>Be honest. I won’t be hurt. Much.</Body>
            <View style={styles.foundOptions}>
              <Options options={FOUND} value={answers.found} onChoose={(value) => set('found', value)} dense={compact} />
            </View>
            <View style={page.gapHeadline} />
            <Reply text={answers.found ? FOUND_REPLY[answers.found] : undefined} />
          </View>
        ),
        footer: replyButton(answers.found !== undefined),
      };

    case 'nights':
      return {
        ...moonQuestion(
          `It’s ${formatWhen(answers.bedtime)}. You’re in bed. Then what?`,
          undefined,
          <Options options={NIGHTS} value={answers.nights} onChoose={(value) => set('nights', value)} tone="moon" dense />,
          answers.nights ? NIGHTS_REPLY[answers.nights] : undefined,
          undefined,
          compact,
        ),
        footer: replyButton(answers.nights !== undefined),
      };

    case 'night-minutes':
      return {
        ...moonQuestion(
          `In bed at ${formatWhen(answers.bedtime)}. When does the phone actually go down?`,
          undefined,
          <Options
            options={nightMinuteChoices(answers.bedtime)}
            value={answers.nightMinutes}
            onChoose={(value) => set('nightMinutes', value)}
            tone="moon"
            dense
          />,
          answers.nightMinutes !== undefined ? NIGHT_MINUTES_REPLY[answers.nightMinutes] : undefined,
          undefined,
          compact,
        ),
        footer: replyButton(answers.nightMinutes !== undefined),
      };

    case 'nights-per-week': {
      const days = answers.scrollDays ?? [];
      // The running total starts here and keeps adding up to the reveal (Imprint, Cal AI).
      const soFar = nightMinutes * days.length;
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
          days.length === 0
            ? undefined
            : soFar < 30
              ? 'Hardly anything. Mornings, then.'
              : `So far: about ${weeklyAmount(soFar)} a week.`,
          undefined,
          compact,
        ),
        footer: replyButton(days.length > 0),
      };
    }

    case 'bedtime': {
      // What he'll send fifteen minutes before, live as the wheel turns (Headway).
      const note = TONE_COPY[answers.tone].bedtime;
      return {
        body: (
          <View style={page.top}>
            <Title>When do you get into bed?</Title>
            <Body style={styles.sub}>Getting in. Not falling asleep. Those are different.</Body>
            <View style={styles.timeWrap}>
              <TimeWheel
                value={answers.bedtime}
                onChange={(v) => set('bedtime', v)}
                presets={answers.shift ? SHIFT_BEDTIME_PRESETS : BEDTIME_PRESETS}
                // Room for the notification preview under it (short phones are five rows anyway).
                short
              />
            </View>
            {/* Wake time isn't set yet here, so only warn when editing a finished schedule. */}
            {editing && !answers.shift && numbers.scheduleLooksWrong ? <ScheduleWarning minutes={numbers.timeInBed} /> : null}
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
            {answers.shift ? (
              <Voice text="Nights are your days. I’ll adjust. Grudgingly." size={VoiceSize.aside} sub />
            ) : compact ? null : (
              <NotePreview time={formatClock(answers.bedtime - BEDTIME_WARNING)} title={note.title} body={note.body} />
            )}
          </View>
        ),
        footer: <PrimaryButton label={editing ? 'Save' : (REPLY_BUTTON.bedtime ?? 'Continue')} onPress={next} />,
      };
    }

    case 'wake':
      return {
        body: (
          <View style={page.top}>
            <Title>When does your alarm go off?</Title>
            <Body style={styles.sub}>The first one. Your apps stay asleep from here until you’re up.</Body>
            <View style={styles.timeWrap}>
              <TimeWheel
                value={answers.wake}
                onChange={(v) => set('wake', v)}
                presets={answers.shift ? SHIFT_WAKE_PRESETS : WAKE_PRESETS}
              />
            </View>
            {numbers.scheduleLooksWrong ? (
              <ScheduleWarning minutes={numbers.timeInBed} />
            ) : (
              <View style={styles.stripGap}>
                <TonightStrip parts={[...tonight('times').slice(0, 1), `${formatHoursFromMinutes(numbers.timeInBed)} hours in bed`]} />
              </View>
            )}
          </View>
        ),
        footer: <PrimaryButton label={editing ? 'Save' : (REPLY_BUTTON.wake ?? 'Continue')} onPress={next} />,
      };

    case 'method': {
      // One question, not a menu (GAME_PLAN). The third way stays behind a link until asked for.
      const showAll =
        answers.method === 'scan' || answers.method === 'place' || answers.method === 'pushups' || ctx.showMoreMethods;
      return {
        body: (
          <View style={page.top}>
            <Title>Are there stairs between your bed and your coffee?</Title>
            <Body style={styles.sub}>That’s how you’ll show me you’re up.</Body>
            <View style={styles.methodOptions}>
              <Options
                options={showAll ? [...METHOD_CHOICES, ...moreMethods(goals.reps)] : METHOD_CHOICES}
                value={answers.method}
                // No auto-advance: his reaction is worth a beat, then Continue.
                onChoose={(value) => set('method', value)}
              />
            </View>
            {answers.method ? (
              <Voice key={answers.method} text={METHOD_COPY[answers.method].echo} size={VoiceSize.aside} sub />
            ) : null}
            {answers.method && !compact ? (
              <View style={styles.stripGap}>
                <TonightStrip parts={tonight('method')} />
              </View>
            ) : null}
          </View>
        ),
        footer: (
          <Ready ready={answers.method !== undefined}>
            <PrimaryButton
              label={editing ? 'Save' : (REPLY_BUTTON.method ?? 'Continue')}
              disabled={!answers.method}
              onPress={next}
            />
          </Ready>
        ),
        secondary: showAll ? undefined : <TextButton label="Other ways to wake them" onPress={ctx.showMethods} />,
      };
    }

    case 'morning-minutes': {
      const total = numbers.weeklyMinutes;
      const reply = answers.morningMinutes !== undefined ? MORNING_MINUTES_REPLY[answers.morningMinutes] : undefined;
      return {
        ...moonQuestion(
          `Alarm at ${formatWhen(answers.wake)}. When do your feet hit the floor?`,
          'Enough about nights. Mornings are worse.',
          <Options
            options={morningMinuteChoices(answers.wake)}
            value={answers.morningMinutes}
            onChoose={(value) => set('morningMinutes', value)}
            tone="moon"
            dense
          />,
          reply,
          reply && total >= 30 ? `Running total: about ${weeklyAmount(total)} a week.` : undefined,
          compact,
        ),
        footer: replyButton(answers.morningMinutes !== undefined),
      };
    }

    case 'tried': {
      const reply = answers.tried ? TRIED_REPLY[answers.tried] : undefined;
      return {
        ...moonQuestion(
          'What have you tried?',
          'Pick the one that lasted longest.',
          <Options options={TRIED} value={answers.tried} onChoose={(value) => set('tried', value)} tone="moon" dense />,
          reply?.line,
          reply?.body,
          compact,
        ),
        footer: replyButton(answers.tried !== undefined),
      };
    }

    case 'time-back':
      return {
        ...moonQuestion(
          numbers.lightUser
            ? 'Say you got those minutes back. What would you do with them?'
            : timeBackQuestion(weeklyAmount(numbers.weeklyMinutes)),
          undefined,
          <Options options={TIME_BACK} value={answers.timeBack} onChoose={(value) => set('timeBack', value)} tone="moon" dense />,
          answers.timeBack ? TIME_BACK_REPLY[answers.timeBack] : undefined,
          undefined,
          compact,
          false,
        ),
        footer: replyButton(answers.timeBack !== undefined),
      };

    case 'reveal':
      return {
        body: <RevealScreen numbers={numbers} onPayoff={ctx.onPayoff} />,
        footer: (
          <Ready ready={ctx.payoff}>
            <PrimaryButton
              label={numbers.lightUser ? 'Keep it that way' : 'Let’s fix this'}
              disabled={!ctx.payoff}
              onPress={next}
            />
          </Ready>
        ),
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

    case 'walk': {
      const copy = walkCopy(answers.method ?? 'steps', wakeDay, goals);
      const { phase, steps } = ctx.walk;
      if (phase === 'denied' || phase === 'unavailable') {
        // Never a dead end: say what it means for the first morning, then carry on to the price.
        const noCounter = phase === 'unavailable';
        return {
          body: (
            <View style={page.top}>
              <Voice text={noCounter ? 'I can’t count steps on this.' : 'No motion, no counting.'} size={VoiceSize.headline} header />
              <View style={page.gapHeadline} />
              <Body>
                {noCounter
                  ? answers.method === 'steps'
                    ? 'This device has no step counter, so steps can’t wake your apps here. Stairs or a scan code can.'
                    : 'This device has no step counter. Stairs and a scan code still work.'
                  : 'Motion & Fitness is off, so I can’t count steps or feel stairs. Turn it on in Settings before bed.'}
              </Body>
            </View>
          ),
          footer: <PrimaryButton label="Continue" onPress={next} />,
          secondary: noCounter ? (
            answers.method === 'steps' ? <TextButton label="Pick another way" onPress={() => edit('method')} /> : undefined
          ) : (
            <TextButton label="Open Settings" onPress={() => Linking.openSettings().catch(() => {})} />
          ),
        };
      }
      if (phase === 'idle') {
        return {
          body: (
            <View style={page.top}>
              <Voice text="Wake me up a bit." size={VoiceSize.headline} header />
              <View style={page.gapHeadline} />
              <Body>{copy.intro}</Body>
              <View style={page.gapBlock} />
              <Body>iOS will ask for Motion &amp; Fitness. That’s how I count steps, and it stays on your phone.</Body>
            </View>
          ),
          footer: <PrimaryButton label="Start walking" onPress={ctx.startWalk} />,
          secondary: <TextButton label="Not now" onPress={next} />,
        };
      }
      const done = phase === 'done';
      return {
        body: (
          <View style={page.top}>
            <Voice text={walkLine(steps)} size={VoiceSize.headline} header />
            <View style={page.gapHeadline} />
            {done ? <Body>{copy.done}</Body> : null}
            <View style={styles.walkSpacer} />
            {done ? (
              // The result card (Duolingo's lesson card): what they just did, in numbers.
              <Ready ready>
                <GlassCard dark style={styles.resultCard}>
                <View style={styles.result} accessible accessibilityLabel={`${WALK_GOAL} steps${ctx.walkSeconds ? ` in ${ctx.walkSeconds} seconds` : ''}. Proven: you can stand.`}>
                  <View style={styles.resultRow}>
                    <ResultCell value={String(WALK_GOAL)} label="Steps" />
                    {ctx.walkSeconds ? <ResultCell value={formatSeconds(ctx.walkSeconds)} label="Time" /> : null}
                    <ResultCell value="Yes" label="Up" />
                  </View>
                  <Text style={styles.resultLine}>Proven: you can stand.</Text>
                </View>
                </GlassCard>
              </Ready>
            ) : (
              <WalkMeter steps={steps} goal={WALK_GOAL} />
            )}
          </View>
        ),
        footer: done ? (
          <PrimaryButton label="Set it up" onPress={next} />
        ) : (
          <PrimaryButton label={`${WALK_GOAL - steps} to go`} disabled onPress={() => {}} />
        ),
        secondary: done ? undefined : <TextButton label="Skip" onPress={next} />,
      };
    }

    case 'tomorrow':
      return {
        body: (
          <TomorrowDemo
            when={`${wakeDay}, ${wake}`}
            clock={wake.replace(/\s?[AP]M$/i, '')}
            method={answers.method ?? 'steps'}
            reps={goals.reps}
            tone={answers.tone}
            onPayoff={ctx.onPayoff}
          />
        ),
        // The walk comes next, so "try it"; late at night it's skipped and setup is next.
        footer: (
          <Ready ready={ctx.payoff}>
            <PrimaryButton label={lateNight ? 'Set it up' : 'Try it'} disabled={!ctx.payoff} onPress={next} />
          </Ready>
        ),
      };

    case 'screen-time':
      if (ctx.screenTime === 'refused') {
        // Clear when it matters (VOICE.md): the problem and the fix, then one small aside.
        return {
          body: (
            <View style={page.top}>
              <Voice text="No access, no sleeping apps." size={VoiceSize.headline} header />
              <View style={page.gapHeadline} />
              <Body>
                Without Screen Time access I can’t put anything to sleep. Try again whenever you’re ready. If a parent
                manages Screen Time on this iPhone, they have to approve it.
              </Body>
              <View style={page.gapAside} />
              <Voice text="I’ll wait. I’m good at lying down." size={VoiceSize.aside} delay={600} sub />
            </View>
          ),
          footer: <PrimaryButton label="Try again" onPress={ctx.askScreenTime} />,
          secondary: <TextButton label="Open Settings" onPress={() => Linking.openSettings().catch(() => {})} />,
        };
      }
      return {
        body: (
          <View style={page.top}>
            <Voice text="I need Screen Time access." size={VoiceSize.headline} header />
            <View style={page.gapHeadline} />
            {/* Words, not a picture: HIG forbids an image of the system alert or a cue toward its
                Allow button (App Review 5.1.1(iv)). Warning about Face ID still cuts surprise drop-off. */}
            <Body>
              It’s how I put apps to sleep. Apple will ask next, then want your Face ID or passcode. What you use stays
              on your phone. I never see it.
            </Body>
            <View style={page.gapAside} />
            <Voice text="Apple’s paperwork. Not mine." size={VoiceSize.aside} delay={600} sub />
          </View>
        ),
        // iOS asks for Face ID or the passcode after Apple's Continue.
        footer: <PrimaryButton label="Fine. Ask Apple." disabled={ctx.screenTime === 'asking'} onPress={ctx.askScreenTime} />,
      };

    case 'apps': {
      const picked = pickCount > 0;
      // Native rows can't fly into the moon, so on an iPhone the page simply moves on.
      const sleep = live ? next : putToSleep;
      return {
        body: (
          <View style={page.top}>
            <Title>Which apps keep you up?</Title>
            <Body style={styles.sub}>They sleep at bedtime and wake once you’re up. Phone calls always get through.</Body>
            <View style={styles.appsCard}>
              <AppsCard
                apps={answers.apps}
                live={live ?? undefined}
                onOpen={openPicker}
                maxRows={compact ? 4 : 6}
                onIconRef={onIconRef}
              />
            </View>
            {picked && !editing ? (
              <>
                <View style={page.gapAside} />
                <Voice
                  key={pickCount}
                  text={pickCount === 1 ? 'One. I’ll take it.' : pickCount <= 5 ? `${countWord(pickCount)}. I’ll take them.` : `${countWord(pickCount)}. Greedy. I like it.`}
                  size={VoiceSize.aside}
                  sub
                />
              </>
            ) : null}
            {picked && !compact ? (
              <View style={styles.stripGap}>
                <TonightStrip parts={tonight('apps')} />
              </View>
            ) : null}
          </View>
        ),
        footer: (
          <PrimaryButton
            label={!picked ? 'Add apps' : editing ? 'Save' : live ? 'Put them to sleep' : `Put ${pickCount} to sleep`}
            // Editing from the summary just saves; the first time, they watch them fall asleep.
            onPress={!picked ? openPicker : editing ? next : sleep}
          />
        ),
      };
    }

    case 'commit':
      // The summary and the deal on one page (D4): the schedule stays editable right up to the hold.
      return {
        body: (
          <View style={page.top}>
            {/* Short phones: the card and the title are the deal, so the eyebrow and the passes line go. */}
            {compact ? null : (
              <Eyebrow>{ctx.newYear ? `${NEW_YEAR.commit} ${new Date().getFullYear()}` : 'The deal'}</Eyebrow>
            )}
            <Title>{`Phone down at ${bed}. ${method.commit}`}</Title>
            <ScheduleCard
              bedtime={answers.bedtime}
              wake={answers.wake}
              method={answers.method ?? 'steps'}
              apps={answers.apps}
              liveCount={live?.count}
              compact={compact}
              onChange={edit}
            />
            {lateNight ? (
              <Body>{compact ? 'I start the second you’re in.' : `It’s already past ${bed}. I start the second you’re in.`}</Body>
            ) : compact ? null : (
              <Body>Passes cover sick days and travel. Tap anything to change it.</Body>
            )}
            {compact ? null : (
              <>
                <View style={page.gapAside} />
                <Voice text="I’m ready. Emotionally, less so." size={VoiceSize.aside} delay={700} sub />
              </>
            )}
          </View>
        ),
        // Already subscribed (restored on the first screen): no paywall, straight to arming.
        footer: <HoldButton label="Hold to agree" doneLabel="Fine. Deal." onComplete={ctx.entitled ? ctx.finishSetup : next} />,
      };

    case 'offer': {
      if (!offers) return storeStep(ctx);
      const headline = numbers.lightUser
        ? LIGHT_OFFER_HEADLINE
        : (OFFER_HEADLINES[answers.timeBack ?? 'else'] ?? OFFER_HEADLINES.else);
      const trialDays = offers.annual.trialDays;
      return {
        body: (
          <View style={page.top}>
            <Voice text={headline} size={VoiceSize.headline} header />
            <View style={page.gapHeadline} />
            <Body>{noOrphan(method.offer)}</Body>
            {numbers.lightUser ? null : (
              <>
                <View style={page.gapAside} />
                <Body>{`Week one: about ${weeklyAmount(numbers.weeklyMinutes)} back.`}</Body>
              </>
            )}
            {trialDays ? (
              // The trial timeline (Blinkist pattern): the most replicated paywall win in
              // docs/sub-club/themes/02-paywall-design-and-copy.md. The reminder day matches the
              // paywall's toggle. "Morning" puts the first wake-up in the timeline (TODO §4).
              <View style={styles.plan}>
                {/* Past bedtime already, arming shields at once (`commit` said so too). */}
                <PlanRow
                  when={schedule.when}
                  what={`${schedule.sleep} $0 today.`}
                />
                {/* Short phones keep the original three rows so nothing scrolls. */}
                {compact || !ctx.scheduledNight ? null : <PlanRow when="Wake-up" what={schedule.morning} />}
                <PlanRow when={`Day ${reminderDay(trialDays)}`} what="I remind you. Grudgingly." />
                <PlanRow
                  when={`Day ${trialDays}`}
                  what={`${dateFromToday(trialDays)}: ${offers.annual.priceString} for the year, unless you cancel before then.`}
                />
              </View>
            ) : (
              <View style={styles.plan}>
                {!numbers.lightUser ? (
                  <PlanRow when="Now" what={`About ${weeklyAmount(numbers.weeklyMinutes)} a week on your phone in bed.`} />
                ) : null}
                <PlanRow when="Schedule" what={schedule.sleep} />
              </View>
            )}
            <Reveal>
              <Text style={styles.reassure}>{noOrphan('Only the apps you pick. Emergency unlock, anytime.')}</Text>
            </Reveal>
          </View>
        ),
        footer: (
          <PrimaryButton
            label={!trialDays ? 'See plans' : trialDays === 7 ? 'See the free week' : `See the ${trialDays} free days`}
            onPress={next}
          />
        ),
      };
    }

    case 'plans':
      return plansStep(ctx);

    case 'declined':
      return declinedStep(ctx);

    case 'armed': {
      const { arm } = ctx;
      if (arm.status === 'working') {
        return {
          body: (
            <View style={page.top}>
              <Voice text="Setting tonight." size={VoiceSize.headline} header />
              <View style={page.gapHeadline} />
              <Body>Handing your schedule to iOS. A second.</Body>
            </View>
          ),
        };
      }
      if (arm.status === 'nights-off') {
        // Subscribed, but there's nothing to schedule: not a failure, and no retry fixes it.
        return {
          body: (
            <View style={page.top}>
              <Voice text="Nothing to set tonight." size={VoiceSize.headline} header />
              <View style={page.gapHeadline} />
              <Body>Every night is off in Routine. Turn one on and I’ll schedule it.</Body>
              <View style={page.gapAside} />
              <Body>You’re subscribed. Nothing sleeps at bedtime until then.</Body>
              {ctx.notifications === 'undetermined' ? (
                <>
                  <View style={page.gapBlock} />
                  <Body>
                    {answers.remindTrial && ctx.trialEnds !== null
                      ? `First, iOS asks if I can send notifications. At least two days before your free trial ends on ${trialDay(ctx.trialEnds)}, I’ll remind you, so the charge is never a surprise.`
                      : 'First, iOS asks if I can send notifications. Bedtime and morning, once a night is on. That’s it.'}
                  </Body>
                </>
              ) : null}
            </View>
          ),
          footer: <PrimaryButton label="Open Routine" disabled={ctx.notifications === null || ctx.asking} onPress={ctx.openRoutine} />,
        };
      }
      if (arm.status === 'failed') {
        // Never imply protection that isn't there (GAME_PLAN, "Reliability"). Plain first.
        const fail = ARM_FAILURES[arm.reason];
        return {
          body: (
            <View style={page.top}>
              <Voice text="Tonight isn’t set." size={VoiceSize.headline} header />
              <View style={page.gapHeadline} />
              <Body>{fail.body}</Body>
              <View style={page.gapAside} />
              <Body>You’re subscribed either way. Nothing is asleep until this works.</Body>
            </View>
          ),
          footer: <PrimaryButton label={fail.button} onPress={arm.reason === 'no-apps' ? openPicker : ctx.retryArm} />,
          secondary: arm.reason === 'no-access' ? <TextButton label="Open Settings" onPress={() => Linking.openSettings().catch(() => {})} /> : undefined,
        };
      }
      const startsNow = arm.status === 'armed' ? arm.now : lateNight;
      const { notifications, motion, trialEnds } = ctx;
      // Say what each prompt is for before iOS shows it (decided 2026-10-03), and only the ones
      // iOS will really show. One Continue opens them, per Apple's pre-permission guidance.
      const asksNotifications = notifications === 'undetermined';
      const reminds = answers.remindTrial && trialEnds !== null;
      return {
        body: (
          <View style={page.top}>
            <Voice
              text={startsNow ? 'Armed. Starting now. Put it down.' : schedule.armed}
              size={VoiceSize.headline}
              header
            />
            <View style={page.gapHeadline} />
            <Body>{startsNow ? 'iOS has your schedule, and your apps are asleep.' : `iOS has your schedule. ${schedule.sleep}`}</Body>
            {asksNotifications ? (
              <>
                <View style={page.gapBlock} />
                <Body>
                  {reminds
                    ? `Next, iOS asks if I can send notifications. Bedtime in ${BEDTIME_WARNING} minutes. Morning’s started. And at least two days before your free trial ends on ${trialDay(trialEnds)}, so the charge is never a surprise.`
                    : `Next, iOS asks if I can send notifications. Two kinds: bedtime in ${BEDTIME_WARNING} minutes, and morning’s started. That’s it.`}
                </Body>
              </>
            ) : null}
            {notifications === 'denied' && reminds ? (
              <>
                <View style={page.gapBlock} />
                <Body>{noReminderLine(trialEnds)}</Body>
              </>
            ) : null}
            {motion === null ? (
              <>
                <View style={page.gapBlock} />
                <Body>{`${asksNotifications ? 'Then' : 'Next,'} iOS asks about Motion & Fitness. It’s ${MOTION_WHY[answers.method ?? 'steps'].replace('{goal}', methodCopy('steps').short.split(' ')[0])}.`}</Body>
              </>
            ) : null}
            {asksNotifications && !compact ? (
              <>
                <View style={page.gapBlock} />
                <NotePreview
                  time={formatClock(answers.bedtime - BEDTIME_WARNING)}
                  title={TONE_COPY[answers.tone].bedtime.title}
                  body={TONE_COPY[answers.tone].bedtime.body}
                />
              </>
            ) : null}
            {asksNotifications ? (
              <>
                <View style={page.gapAside} />
                <Voice text="I’m not chatty. I’m a raccoon." size={VoiceSize.aside} delay={600} sub />
              </>
            ) : null}
            {arm.status === 'preview' ? (
              <>
                <View style={page.gapBlock} />
                <PreviewNote>No Screen Time here, so nothing was handed to iOS. On an iPhone this only shows once iOS confirms tonight.</PreviewNote>
              </>
            ) : null}
          </View>
        ),
        // Waits for iOS's answers so far, so the copy above is right before anything is asked.
        footer: <PrimaryButton label="Continue" disabled={notifications === null || ctx.asking} onPress={ctx.askPermissions} />,
      };
    }

    case 'first-morning':
      // The last screen ends on tomorrow morning (TODO §4), then bed.
      return {
        body: (
          <View style={page.top}>
            <Title>{schedule.morning}</Title>
            <View style={styles.plan}>
              {method.morning.map((row) => (
                <PlanRow key={row.when} when={row.when} what={row.what} />
              ))}
              <PlanRow when="Bad day" what="Use a pass. No walking." />
              {/* The paywall promised a reminder. Without notifications it can't come, so say the date now. */}
              {ctx.notifications === 'denied' && answers.remindTrial && ctx.trialEnds ? (
                <PlanRow when="Free trial" what={noReminderLine(ctx.trialEnds)} />
              ) : null}
              {ctx.motion === 'denied' ? (
                <PlanRow when="Motion" what="It’s off, so I can’t feel stairs or count steps. Turn on Motion & Fitness for Locturne in Settings." />
              ) : null}
              {/* No step counter (an iPad, which still has a barometer for stairs): say so now, not at 7am. */}
              {ctx.motion === 'unavailable' && answers.method === 'steps' ? (
                <PlanRow when="This device" what="It can’t count steps. Set up a scan code from the You tab, or use a pass." />
              ) : null}
            </View>
            <Voice
              text={ctx.scheduledNight && ctx.scheduledNight.start <= new Date() ? 'That’s it. Go to sleep.' : schedule.sleep}
              size={VoiceSize.aside}
              delay={700}
              sub
            />
            <View style={styles.gap8} />
            <Voice
              text={
                answers.morningMinutes !== undefined && answers.morningMinutes > 3
                  ? `You said feet down around ${formatWhen(answers.wake + answers.morningMinutes)}. We’ll see.`
                  : 'I’ll be asleep. Don’t wake me.'
              }
              size={VoiceSize.aside}
              delay={1300}
              sub
            />
          </View>
        ),
        footer: <PrimaryButton label={lateNight && !morningSoon ? 'Good night' : 'Done'} onPress={exit} />,
        secondary:
          ctx.motion === 'denied' ? <TextButton label="Open Settings" onPress={() => Linking.openSettings().catch(() => {})} /> : undefined,
      };
  }
}

/**
 * A list question on the risen moon, after Headspace's "What's on your mind?": centred
 * title and hint at the top of the moon's surface, black option pills anchored at the
 * bottom where thumbs are.
 */
function moonQuestion(
  title: string,
  sub: string | undefined,
  options: ReactNode,
  reply?: string,
  detail?: string,
  compact = false,
  /** False after the reveal (`time-back`): the moon has sunk, so the page starts at the top. */
  risen = true,
) {
  return {
    body: (
      <View style={styles.moonQuestion}>
        {/* Short phones: once he's replied, his line takes the hint's place, and a long detail goes. */}
        <MoonQuestionHead title={title} sub={compact && reply ? undefined : sub} risen={risen} />
        {/* His reply fills the band between the question and the answers. */}
        <Reply text={reply} detail={compact && detail && detail.length > 60 ? undefined : detail} />
        {options}
      </View>
    ),
  };
}

function ResultCell({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.resultCell}>
      <Text style={styles.resultValue}>{value}</Text>
      <Text style={styles.resultLabel}>{label.toUpperCase()}</Text>
    </View>
  );
}

/** 14 → "0:14". */
function formatSeconds(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

const COUNT_WORDS = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
const countWord = (n: number) => COUNT_WORDS[n] ?? String(n);

/** The question sits up near the top bar, above the moon's curve, not on the moon. */
function MoonQuestionHead({ title, sub, risen }: { title: string; sub?: string; risen: boolean }) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ marginTop: risen ? 60 - quizContentTop(height, insets.top) : Gap.section }}>
      <Title style={styles.moonTitle}>{title}</Title>
      {sub ? <Body style={[styles.sub, styles.moonSub]}>{sub}</Body> : null}
    </View>
  );
}

function Beat({ label, text }: { label: string; text: string }) {
  return (
    <Reveal style={styles.beat}>
      <Text style={styles.beatLabel}>{label}</Text>
      <Text style={styles.beatText}>{noOrphan(text)}</Text>
    </Reveal>
  );
}

/** The plan rows' label column at the default text size. */
const PLAN_WHEN_WIDTH = 78;

function PlanRow({ when, what }: { when: string; what: string }) {
  // The label column grows with Dynamic Type, so "Afternoon" never breaks mid-word; it keeps
  // the rows' text lined up at any size, and sizes to a longer label rather than wrapping it.
  const { fontScale } = useWindowDimensions();
  return (
    <Reveal style={styles.planRow}>
      <Text style={[styles.planWhen, { minWidth: PLAN_WHEN_WIDTH * fontScale }]}>{when}</Text>
      <Text style={styles.planWhat}>{what}</Text>
    </Reveal>
  );
}

/** Shown when bedtime to wake is implausibly long or short, which is usually AM/PM mixed up. */
function ScheduleWarning({ minutes }: { minutes: number }) {
  return <Body style={styles.warning}>That’s {formatHoursFromMinutes(minutes)} hours in bed. Check AM and PM.</Body>;
}

/** Why Motion & Fitness, on `armed`, right before iOS asks: "It's {this}." */
const MOTION_WHY: Record<WakeMethod, string> = {
  downstairs: 'how I feel the stairs, and count steps on days without them',
  steps: 'how I count your steps. Nothing else',
  // The goal in use is filled in (`methodCopy`'s rule): a rerun keeps Routine's.
  scan: 'how {goal} steps can stand in for your code',
  place: 'how {goal} steps can stand in on days you stay in',
  // The camera counts the push-ups (no Motion needed); Motion counts the steps that stand in.
  pushups: 'how {goal} steps can stand in when your arms say no',
};

/** "Fri, Oct 10": the trial's last day, the way the reminder would have said it. */
function trialDay(ends: Date): string {
  return ends.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

/** The paywall's reminder can't arrive without notifications, so the date goes on screen instead. */
function noReminderLine(ends: Date): string {
  return `Notifications are off, so I can’t remind you. Your free trial ends ${trialDay(ends)}. Cancel in Settings before then if you want out.`;
}

/** What went wrong handing tonight to iOS, and the one thing that fixes it. */
const ARM_FAILURES: Record<ArmFailure, { body: string; button: string }> = {
  'no-access': {
    // HIG: a button that opens Apple's prompt never says "Allow" (App Review 5.1.1(iv)).
    body: 'Screen Time access is off, so iOS won’t let me put anything to sleep. Try again, or turn it on in Settings.',
    button: 'Try again',
  },
  'no-apps': { body: 'No apps are picked, so there’s nothing to put to sleep.', button: 'Pick apps' },
  'too-short': {
    body: 'Bedtime and your alarm are less than 15 minutes apart, and iOS won’t schedule a night that short. Change either in Routine.',
    button: 'Try again',
  },
  refused: { body: 'iOS didn’t accept tonight’s schedule. That’s usually brief.', button: 'Try again' },
};

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center' },
  walkSpacer: { flex: 1, minHeight: Space.xl },
  // Standalone text on the quiz moon starts just under its curve, never down by the buttons.
  moonTop: { flex: 1 },
  bottomStack: { flex: 1, justifyContent: 'flex-end', paddingBottom: Space.xl },
  gap8: { height: Space.s },
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
  appsCard: { marginTop: Gap.block },
  methodOptions: { marginTop: Gap.block, marginBottom: Space.l },
  plan: { marginVertical: Gap.block, gap: Space.m },
  planRow: { flexDirection: 'row', gap: Space.m, alignItems: 'baseline' },
  // Never squeezed by the text beside it; at the largest sizes it stops at half the row.
  planWhen: { flexShrink: 0, maxWidth: '50%', ...Type.rowKey, fontVariant: ['tabular-nums'] },
  planWhat: { flex: 1, color: Nocturne.text, ...Type.body },
  reassure: { color: Nocturne.text2, ...Type.secondary },
  shiftRow: { marginTop: Space.l, flexDirection: 'row', justifyContent: 'center', marginBottom: Space.m },
  stripGap: { marginTop: Gap.block },
  foundOptions: { marginTop: Gap.block },
  toneSlider: { marginTop: Gap.section, gap: Space.s },
  toneLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  toneLabel: { color: Nocturne.text3, fontSize: 15, fontWeight: '600' },
  toneLabelOn: { color: Nocturne.text },
  // A small drawing of the shield at the chosen tone: iOS's own look, system font.
  shieldPreview: {
    marginTop: Gap.block,
    alignItems: 'center',
    gap: Space.m,
    paddingVertical: Space.xl,
    paddingHorizontal: Space.l,
    borderRadius: Radius.card,
    backgroundColor: '#0B0B0C',
    borderWidth: 1,
    borderColor: Nocturne.line,
  },
  shieldEyebrow: { ...Type.label, fontSize: 11 },
  shieldTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '700', textAlign: 'center' },
  shieldButton: { backgroundColor: '#FFFFFF', borderRadius: 14, paddingVertical: 10, paddingHorizontal: 40 },
  shieldButtonText: { color: '#0B0B0C', fontSize: 16, fontWeight: '600' },
  resultCard: { marginBottom: Space.l },
  result: { padding: Space.l, gap: Space.m },
  resultRow: { flexDirection: 'row', justifyContent: 'space-around' },
  resultCell: { alignItems: 'center', gap: 2 },
  resultValue: { color: Nocturne.text, fontSize: 28, fontWeight: '700', fontVariant: ['tabular-nums'] },
  resultLabel: { ...Type.label, fontSize: 11 },
  resultLine: { ...DisplayFont, color: Nocturne.text, fontSize: 20, textAlign: 'center' },
});
