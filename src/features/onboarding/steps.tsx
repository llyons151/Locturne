import type { ReactNode } from 'react';
import { Share, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppsCard } from '@/components/app-picker';
import { PrimaryButton, TextButton } from '@/components/buttons';
import { Reveal } from '@/components/motion';
import { quizContentTop } from '@/components/night-sky';
import { noOrphan } from '@/lib/text';
import { DisplayFont, Gap, Nocturne, NUMBER_FONT, Space, Type, VoiceSize } from '@/theme';

import { AppleAlertPicture } from './apple-alert';
import {
  AGE_DEFAULT,
  AGE_MAX,
  AGE_MIN,
  ALARM,
  ALARM_ECHO,
  FOUND,
  initialAnswers,
  LIGHT_OFFER_HEADLINE,
  MORNING_ECHO,
  MORNING_MINUTES,
  money,
  NIGHT_MINUTES,
  NIGHTS,
  NIGHTS_ECHO,
  OFFER_HEADLINES,
  PRICES,
  TIME_BACK,
  TRIED,
  TRIED_ECHO,
  type Answers,
  type ExitOffer,
  type StepId,
} from './content';
import { DayPicker } from './day-picker';
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
import { declinedStep, plansStep } from './screens/paywall';
import { RevealScreen } from './screens/reveal-screen';
import { TomorrowDemo } from './screens/tomorrow-demo';
import { AgeWheel, TimeWheel } from './time-wheel';
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

// Four presets: one row under the time wheel.
const BEDTIME_PRESETS = [22 * 60, 23 * 60, 23 * 60 + 30, 0];
const WAKE_PRESETS = [6 * 60, 7 * 60, 7 * 60 + 30, 8 * 60];
// Night-shift schedules: sleep in the morning, up in the afternoon.
const SHIFT_BEDTIME_PRESETS = [7 * 60, 8 * 60, 9 * 60, 10 * 60];
const SHIFT_WAKE_PRESETS = [14 * 60, 15 * 60, 16 * 60, 17 * 60];

/** The cold open. Same line at every hour. */
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
  const { step, answers, numbers, set, choose, next, go, edit, exit, simulate, lateNight, compact, editing, openPicker, putToSleep, onIconRef } = ctx;
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
            <View style={page.gapHeadline} />
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
          <View style={page.top}>
            <Title>Here’s the deal.</Title>
            <View style={styles.beats}>
              <Beat label="Bedtime" text="Your apps go to sleep. So do I." />
              <Beat label="Morning" text="They stay asleep until you’re up. Same as me." />
              <Beat label="200 steps" text="About two minutes of walking. They wake up. I do too, unfortunately." />
            </View>
            {/* Was its own screen ("intro"). Folded in so the first tap comes one screen sooner. */}
            <View style={page.gapSection} />
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
            <Body style={styles.sub}>The first one. Steps start counting from here.</Body>
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
            <View style={page.gapBlock} />
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
          <View style={page.top}>
            <Voice text="Thirteen and up. Those are the rules." size={VoiceSize.headline} header />
            <View style={page.gapHeadline} />
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
          <View style={page.top}>
            <Voice text="I need Screen Time access." size={VoiceSize.headline} header />
            <View style={page.gapHeadline} />
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
          <View style={page.top}>
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
          <View style={page.top}>
            <Title>Tonight’s lock is ready.</Title>
            <ScheduleCard
              bedtime={answers.bedtime}
              wake={answers.wake}
              apps={answers.apps}
              compact={compact}
              onChange={edit}
            />
            <Body>{lateNight ? `It’s already past ${bed}. I start the second you’re in.` : 'It isn’t on yet.'}</Body>
            <View style={page.gapAside} />
            <Voice text="I’m ready. Emotionally, less so." size={VoiceSize.aside} delay={700} sub />
          </View>
        ),
        footer: <PrimaryButton label="Looks right" onPress={next} />,
      };

    case 'commit':
      return {
        body: (
          <View style={page.top}>
            <Eyebrow>The deal</Eyebrow>
            <Title>{`Phone down at ${bed}. Up for 200\u00A0steps.`}</Title>
            <View style={page.gapHeadline} />
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
          <View style={page.top}>
            <Voice text={headline} size={VoiceSize.headline} header />
            <View style={page.gapHeadline} />
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
      return plansStep(ctx);

    case 'declined':
      return declinedStep(ctx);

    case 'armed':
      return {
        body: (
          <View style={page.top}>
            <Voice text={lateNight ? 'Armed. Starting now. Put it down.' : `Armed. See you at ${bed}.`} size={VoiceSize.headline} header />
            <View style={page.gapHeadline} />
            <Body>
              {answers.plan === 'annual' && PRICES.trialEligible && answers.remindTrial
                ? 'A heads-up before bedtime. And a warning two days before your trial bills, if you let me send notifications.'
                : 'A heads-up before bedtime. That’s it. I’m not chatty.'}
            </Body>
            <View style={page.gapBlock} />
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
          <View style={page.top}>
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

function appSummary(apps: string[]): string {
  if (apps.length === 0) return 'Your apps';
  if (apps.length <= 2) return apps.join(' and ');
  return `${apps[0]}, ${apps[1]} and ${apps.length - 2} more`;
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center' },
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
  // Numbers use the serif upright. Italic serif always means Loc is talking.
  // The stat sits on the quiz moon, centred like the rest of the moon pages.
  statNumber: { ...NUMBER_FONT, color: Nocturne.accent ?? Nocturne.text, fontSize: 108, lineHeight: 112, letterSpacing: -1, textAlign: 'center' },
  statText: { color: Nocturne.text, ...Type.body, marginTop: Gap.headline, textAlign: 'center' },
  appsCard: { marginTop: Gap.block },
  plan: { marginVertical: Gap.block, gap: Space.m },
  planRow: { flexDirection: 'row', gap: Space.m, alignItems: 'baseline' },
  planWhen: { width: 78, ...Type.rowKey, fontVariant: ['tabular-nums'] },
  planWhat: { flex: 1, color: Nocturne.text, ...Type.body },
  reassure: { color: Nocturne.text2, ...Type.secondary },
  shiftRow: { marginTop: Space.l, flexDirection: 'row', justifyContent: 'center', marginBottom: Space.m },
});
