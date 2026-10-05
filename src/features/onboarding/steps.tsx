'use no memo';
// Reads the App Group during render through `methodCopy` (the step goal, a saved scan code),
// which changes outside React: the React Compiler would cache it (#130), so it stays out here.

import type { ReactNode } from 'react';
import { Linking, Share, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppsCard, type LivePicks } from '@/components/app-picker';
import { PrimaryButton, TextButton } from '@/components/buttons';
import { DayPicker } from '@/components/day-picker';
import { Reveal } from '@/components/motion';
import { quizContentTop } from '@/components/night-sky';
import { AgeWheel, TimeWheel } from '@/components/time-wheel';
import type { ArmFailure, ArmResult } from '@/lib/arm';
import { BEDTIME_WARNING, type NotificationPermission } from '@/lib/notifications';
import { reminderDay, type Offers, type PurchaseTarget } from '@/lib/purchases';
import type { WakeMethod } from '@/lib/routine';
import { noOrphan } from '@/lib/text';
import { DisplayFont, Gap, Nocturne, Space, Type, VoiceSize } from '@/theme';

import {
  AGE_DEFAULT,
  AGE_MAX,
  AGE_MIN,
  FOUND,
  initialAnswers,
  LIGHT_OFFER_HEADLINE,
  METHOD_CHOICES,
  METHOD_COPY,
  MORE_METHODS,
  methodCopy,
  MORNING_ECHO,
  MORNING_MINUTES,
  NIGHT_MINUTES,
  NIGHTS,
  NIGHTS_ECHO,
  NEW_YEAR,
  OFFER_HEADLINES,
  TIME_BACK,
  TRIED,
  TRIED_ECHO,
  WALK_COPY,
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
import { MathScreen } from './screens/math-screen';
import { declinedStep, plansStep, storeStep } from './screens/paywall';
import { RevealScreen } from './screens/reveal-screen';
import { WalkMeter } from './screens/walk-meter';
import { TomorrowDemo } from './screens/tomorrow-demo';
import { Body, Chip, Eyebrow, HoldButton, Options, page, PreviewNote, Title, Voice } from './ui';

/** Everything a step needs from the flow: the answers so far and the ways to move on. */
export type StepContext = {
  step: StepId;
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
  const { step, answers, numbers, set, choose, next, go, edit, exit, simulate, lateNight, compact, editing, openPicker, putToSleep, onIconRef, live, offers } = ctx;
  const bed = formatWhen(answers.bedtime);
  const wake = formatClock(answers.wake);
  // "This morning" when it's already the small hours; "Later today" for afternoon wake-ups.
  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  const wakeDay = lateNight && answers.wake > nowMinutes ? (answers.wake >= 12 * 60 ? 'Later today' : 'This morning') : 'Tomorrow';
  // Installed in the small hours with morning under an hour away: no "Go to sleep".
  const morningSoon = wakeDay === 'This morning' && answers.wake - nowMinutes < 60;
  const method = methodCopy(answers.method ?? 'downstairs');
  // How many picks: the real count on an iPhone, the stand-in names in the preview.
  const pickCount = live ? live.count : answers.apps.length;

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
              <Beat label="Up means up" text="Downstairs or a short walk. They wake up. I do too, unfortunately." />
            </View>
            {/* Was its own screen ("intro"). Folded in so the first tap comes one screen sooner. */}
            <View style={page.gapSection} />
            {/* Quiz answers go to analytics (docs/ANALYTICS.md), so no "stays on your phone" here. What's true: no account, and the picked apps never leave the phone. */}
            <Body>{`First, a few questions. Then I do math on your nights. About two minutes. No name, no email, and the apps you pick never leave your phone.${ctx.newYear ? ` ${NEW_YEAR.deal}` : ''}`}</Body>
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
          <View style={page.top}>
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
            {answers.shift ? <Voice text="Nights are your days. I’ll adjust. Grudgingly." size={VoiceSize.aside} sub /> : null}
          </View>
        ),
        footer: <PrimaryButton label={editing ? 'Save' : 'Continue'} onPress={next} />,
      };

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
            {numbers.scheduleLooksWrong ? <ScheduleWarning minutes={numbers.timeInBed} /> : null}
          </View>
        ),
        footer: <PrimaryButton label={editing ? 'Save' : 'Continue'} onPress={next} />,
      };

    case 'method': {
      // One question, not a menu (GAME_PLAN). The third way stays behind a link until asked for.
      const showAll = answers.method === 'scan' || ctx.showMoreMethods;
      return {
        body: (
          <View style={page.top}>
            <Title>Are there stairs between your bed and your coffee?</Title>
            <Body style={styles.sub}>That’s how you’ll show me you’re up.</Body>
            <View style={styles.methodOptions}>
              <Options
                options={showAll ? [...METHOD_CHOICES, ...MORE_METHODS] : METHOD_CHOICES}
                value={answers.method}
                // No auto-advance: his reaction is worth a beat, then Continue.
                onChoose={(value) => set('method', value)}
              />
            </View>
            {answers.method ? (
              <Voice key={answers.method} text={METHOD_COPY[answers.method].echo} size={VoiceSize.aside} sub />
            ) : null}
          </View>
        ),
        footer: (
          <PrimaryButton
            label={answers.method ? (editing ? 'Save' : 'Continue') : 'Pick one'}
            disabled={!answers.method}
            onPress={next}
          />
        ),
        secondary: showAll ? undefined : <TextButton label="Other ways to wake them" onPress={ctx.showMethods} />,
      };
    }

    case 'morning-minutes':
      return moonQuestion('In the morning, how long are you on your phone before you get up?', 'Counting from the first alarm.', (
        <Options options={MORNING_MINUTES} value={answers.morningMinutes} onChoose={choose('morningMinutes')} tone="moon" />
      ));

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
          <View style={page.top}>
            <Voice text="Thirteen and up. Those are the rules." size={VoiceSize.headline} header />
            <View style={page.gapHeadline} />
            <Body>Locturne isn’t for under-13s. Go to bed, though.</Body>
          </View>
        ),
        footer: <PrimaryButton label="Exit" onPress={exit} />,
      };

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
            <View style={page.gapHeadline} />
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
      return {
        body: (
          <MathScreen
            line={NIGHTS_ECHO[answers.nights ?? ''] ?? 'Counting. Don’t watch me.'}
            morningLine={MORNING_ECHO[answers.morningMinutes ?? -1]}
            onDone={next}
          />
        ),
      };

    case 'reveal':
      return {
        body: <RevealScreen numbers={numbers} onPayoff={ctx.onPayoff} />,
        footer: (
          <PrimaryButton
            label={numbers.lightUser ? 'Keep it that way' : 'Let’s fix this'}
            disabled={!ctx.payoff}
            onPress={next}
          />
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
      const copy = WALK_COPY[answers.method ?? 'downstairs'];
      const { phase, steps } = ctx.walk;
      if (phase === 'denied' || phase === 'unavailable') {
        // Never a dead end: say what it means for tomorrow, then carry on to the price.
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
                  : 'Motion & Fitness is off, so I can’t count steps or feel stairs. Turn it on in Settings before tomorrow morning.'}
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
            <WalkMeter steps={steps} goal={WALK_GOAL} />
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
            method={answers.method ?? 'downstairs'}
            onPayoff={ctx.onPayoff}
          />
        ),
        // The walk comes next, so "try it"; late at night it's skipped and setup is next.
        footer: <PrimaryButton label={lateNight ? 'Set it up' : 'Try it'} disabled={!ctx.payoff} onPress={next} />,
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
        footer: <PrimaryButton label="Continue" disabled={ctx.screenTime === 'asking'} onPress={ctx.askScreenTime} />,
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
              method={answers.method ?? 'downstairs'}
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
            {trialDays ? (
              // The trial timeline (Blinkist pattern): the most replicated paywall win in
              // docs/sub-club/themes/02-paywall-design-and-copy.md. The reminder day matches the
              // paywall's toggle. "Morning" puts the first wake-up in the timeline (TODO §4).
              <View style={styles.plan}>
                {/* Past bedtime already, arming shields at once (`commit` said so too). */}
                <PlanRow
                  when={lateNight ? 'Now' : 'Tonight'}
                  what={lateNight ? 'Your apps sleep as soon as you’re in. $0 today.' : `Your apps sleep at ${bed}. $0 today.`}
                />
                {/* Short phones keep the original three rows so nothing scrolls. */}
                {compact ? null : <PlanRow when="Morning" what={`${wake}: they stay asleep until ${method.until}.`} />}
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
                <PlanRow when="With me" what={`Your apps can’t open from ${bed} until ${method.until}.`} />
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
              text={startsNow ? 'Armed. Starting now. Put it down.' : ctx.newYear ? NEW_YEAR.armed : `Armed. See you at ${bed}.`}
              size={VoiceSize.headline}
              header
            />
            <View style={page.gapHeadline} />
            <Body>{startsNow ? 'iOS has your schedule, and your apps are asleep.' : `iOS has your schedule. Your apps sleep at ${bed}.`}</Body>
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
                <Body>{`${asksNotifications ? 'Then' : 'Next,'} iOS asks about Motion & Fitness. It’s ${MOTION_WHY[answers.method ?? 'downstairs'].replace('{goal}', methodCopy('steps').short.split(' ')[0])}.`}</Body>
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
            <Title>{`${wakeDay} ${wake.replace(/ [AP]M$/, '')}. Your apps stay asleep until you’re up.`}</Title>
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
              text={morningSoon ? `That’s it. Morning starts at ${wake}.` : lateNight ? 'That’s it. Go to sleep.' : `That’s it. Bed at ${bed}.`}
              size={VoiceSize.aside}
              delay={700}
              sub
            />
            <View style={styles.gap8} />
            <Voice text="I’ll be asleep. Don’t wake me." size={VoiceSize.aside} delay={1300} sub />
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

function Beat({ label, text }: { label: string; text: string }) {
  return (
    <Reveal style={styles.beat}>
      <Text style={styles.beatLabel}>{label}</Text>
      <Text style={styles.beatText}>{text}</Text>
    </Reveal>
  );
}

function PlanRow({ when, what }: { when: string; what: string }) {
  return (
    <Reveal style={styles.planRow}>
      <Text style={styles.planWhen}>{when}</Text>
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
  planWhen: { width: 78, ...Type.rowKey, fontVariant: ['tabular-nums'] },
  planWhat: { flex: 1, color: Nocturne.text, ...Type.body },
  reassure: { color: Nocturne.text2, ...Type.secondary },
  shiftRow: { marginTop: Space.l, flexDirection: 'row', justifyContent: 'center', marginBottom: Space.m },
});
