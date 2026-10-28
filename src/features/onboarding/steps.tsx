'use no memo';
// Reads the App Group during render through `methodCopy` (the step goal, a saved scan code),
// which changes outside React: the React Compiler would cache it (#130), so it stays out here.

import type { ReactNode } from 'react';
import { Linking, Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, Keyframe, LayoutAnimationConfig, useReducedMotion } from 'react-native-reanimated';
import { Text } from '@/components/text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppsCard, type LivePicks } from '@/components/app-picker';
import { PrimaryButton, TextButton } from '@/components/buttons';
import { DayRow } from '@/components/day-picker';
import { Reveal } from '@/components/motion';
import { quizContentTop } from '@/components/night-sky';
import { TimeList } from '@/components/time-wheel';
import type { ArmFailure, ArmResult } from '@/lib/arm';
import { LEGAL_URLS } from '@/lib/links';
import { type NotificationPermission } from '@/lib/notifications';
import { reminderDay, type Offers, type PurchaseTarget } from '@/lib/purchases';
import { getScanEditRefusal, type ScanCode } from '@/lib/scan';
import { methodInUse } from '@/lib/scan-code';
import type { WakeMethod } from '@/lib/routine';
import type { Night } from '@/lib/lock-state';
import { scheduleCopy } from './schedule-copy';
import { noOrphan } from '@/lib/text';
import { DisplayFont, Gap, Nocturne, Space, Type, VoiceSize } from '@/theme';

import {
  AGE,
  WORST_TIME,
  BUILD,
  feelingOffer,
  FOUND,
  FOUNDER,
  LIGHT_OFFER_HEADLINE,
  SKIPPED_TIME_BACK,
  methodChoices,
  morningGoals,
  methodCopy,
  morningMinuteChoices,
  NIGHT_FEEL,
  nightMinuteChoices,
  NEW_YEAR,
  OFFER_HEADLINES,
  PAIN,
  REPLY_BUTTON,
  timeBackChoices,
  timeBackQuestion,
  triedChoices,
  type Answers,
  type ExitOffer,
  type Pain,
  type StepId,
} from './content';
import type { MotionAccess } from './motion';
import {
  dateFromToday,
  formatClock,
  formatHoursFromMinutes,
  formatWhen,
  LEAD_WHERE,
  leadFor,
  weeklyAmount,
  weeklyParts,
  type Estimate,
} from './estimate';
import { DEAL_CARD_BUILD_MS, ScheduleCard } from './schedule-card';
import { declinedStep, plansStep, storeStep } from './screens/paywall';
import { BuildChapter } from './screens/build-chapter';
import { RevealScreen } from './screens/reveal-screen';
import { SCAN_CODE_HEADLINE, ScanCodeShown, ScanCodeSwitch, ScanCodeWords } from './screens/scan-code';
import { RollingCount } from './rolling-count';
import { TomorrowDemo, type NightPrelude } from './screens/tomorrow-demo';
import { Body, Eyebrow, HoldButton, Options, page, PreviewNote, Ready, Reply, Title, Voice } from './ui';
import { wakeDayFor } from './wake-day';

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
  /** Opens the code setup or the place map for a scan or place morning; moves on once it's saved. */
  setUpMethod: () => void;
  /** `scan-code`: which code, the QR it shows, and the camera that registers it. */
  scanSource: ScanCode['kind'];
  setScanSource: (source: ScanCode['kind']) => void;
  scanQr: string;
  /** The QR has been through the print sheet, here or on an earlier visit: the button moves on to the camera. */
  scanPrinted: boolean;
  printScanCode: () => void;
  openScanner: () => void;

  /** Screen Time access on this step: asked, and if refused, said plainly. */
  screenTime: 'idle' | 'asking' | 'refused';
  askScreenTime: () => void;
  /** Skips access and the app list for now: `armed` asks for both after the purchase. */
  setUpLater: () => void;
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
  /** Motion & Fitness: answered on `armed`. Null while iOS would still ask. */
  motion: MotionAccess | null;
  /** iOS will still ask for the wake-up way's camera or location on `armed`. */
  methodAsks: boolean;
  /** Notifications, as iOS has them once `armed` is shown. Null until checked. */
  notifications: NotificationPermission | null;
  /** When the trial bought in this session ends; null for no trial (monthly, restore). */
  trialEnds: Date | null;
  /** `armed`'s Continue: iOS's notification prompt, then Motion's, whichever are still unasked. */
  askPermissions: () => void;
  /** iOS's prompts are up: Continue waits, so a double tap can't skip a step. */
  asking: boolean;
  /** The reveal's or the demo's payoff has played (or the backstop ran out): its button wakes. */
  payoff: boolean;
  onPayoff: () => void;
  /** Reduce Motion is on: the demo plays as still states, and sooner. */
  reduced: boolean;
};

/**
 * The opener's lines come into focus top to bottom, buttons and fine print included, this far
 * apart: Mercury's hero step (docs/MERCURY_MOTION.md). Then the moon rises (intro.tsx).
 */
const OPENER_LINE_MS = 150;

/** The cold open. Same line at every hour; New Year week has its own (`NEW_YEAR`). */
const HELLO = { head: 'No apps until you’re out of bed.', sub: 'I’m Loc. Raccoon. I don’t do mornings well either.' };

/** `commit`: the card starts building once the title's in, and the line under it once it's built. */
const DEAL_CARD_AT_MS = 700;
const DEAL_AFTER_MS = DEAL_CARD_AT_MS + DEAL_CARD_BUILD_MS;

/** What one step puts on screen. The flow places these in the page frame (ui.tsx Shell). */
export type StepView = {
  body: ReactNode;
  footer?: ReactNode;
  /** One text link, shown just under the primary button. */
  secondary?: ReactNode;
};

/** What each step shows. One case per step, in the order of STEPS in content.ts. */
export function renderStep(ctx: StepContext): StepView {
  const { step, answers, numbers, set, next, edit, exit, lateNight, compact, editing, openPicker, putToSleep, onIconRef, live, offers } = ctx;
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
  // The quiz's button is their reply to him: always at the bottom, greyed out until there's an answer.
  // "Skip for now" always under it (user, 2026-10-26): every question has a default to fall back on.
  const replyButton = (answered: boolean, label = REPLY_BUTTON[step] ?? 'Continue') => ({
    // Plain "Next" until they pick; their reply to him only once there's an answer to reply with.
    footer: <PrimaryButton label={answered ? label : 'Next'} disabled={!answered} onPress={next} />,
    secondary: <TextButton label="Skip for now" onPress={next} />,
  });
  const nightMinutes = answers.nightMinutes ?? 0;
  // Which end of the night this visit leads with (docs/ONBOARDING_BRANCHES.md), and the number
  // it leads with: theirs, or both ends when theirs is too small.
  const pain = answers.pain ?? 'all';
  const lead = leadFor(numbers, answers.pain, answers.worstTime);
  const phoneDown = formatWhen(numbers.phoneDown);
  // The morning branch asks the alarm first, so bedtime is still the default on `wake`.
  const bedtimeAsked = pain !== 'morning' || editing;

  switch (step) {
    case 'hello': {
      const hello = ctx.newYear ? NEW_YEAR.hello : HELLO;
      return {
        body: (
          // Ahead's opener (user, 2026-10-26): the moon up top, then the name and one line just
          // above the buttons, and the fine print under them.
          <View style={styles.opener}>
            <Reveal>
              <Text style={styles.wordmark} accessibilityRole="header" maxFontSizeMultiplier={1.2}>
                Locturne
              </Text>
            </Reveal>
            <View style={page.gapHeadline} />
            <Voice text={hello.head} size={20} center delay={OPENER_LINE_MS} />
          </View>
        ),
        footer: (
          // No accounts, so no "Sign in" (a reviewer would ask for demo credentials): it's a restore.
          <View>
            <Reveal delay={OPENER_LINE_MS * 2}>
              <PrimaryButton label="Get started" onPress={next} />
            </Reveal>
            <Reveal delay={OPENER_LINE_MS * 3}>
              <TextButton lead="Already subscribed?" label="Restore purchase" onPress={ctx.restorePurchases} />
            </Reveal>
          </View>
        ),
        secondary: (
          <Reveal delay={OPENER_LINE_MS * 4}>
            <Text style={styles.openerFine}>
              {'By continuing, you agree to Locturne’s\n'}
              <FineLink label="Terms of Service" url={LEGAL_URLS.terms} /> and <FineLink label="Privacy Policy" url={LEGAL_URLS.privacy} />
            </Text>
          </Reveal>
        ),
      };
    }

    case 'pain':
      // On the sunk moon: rising it here would bob it down again for the times.
      return {
        ...moonQuestion(
          'Which one sounds like you?',
          <Options options={PAIN} value={answers.pain} onChoose={(value) => set('pain', value)} tone="moon" />,
          { risen: false },
        ),
        ...replyButton(answers.pain !== undefined),
      };

    case 'found':
      // A quiz question now (docs/PAYWALL_PRIMING.md), on the risen moon like its neighbours.
      return {
        ...moonQuestion(
          'How’d you find me?',
          <Options options={FOUND} value={answers.found} onChoose={(value) => set('found', value)} tone="moon" dense />,
        ),
        ...replyButton(answers.found !== undefined),
      };

    case 'night-feel':
      return {
        ...moonQuestion(
          'What’s the late scrolling, mostly?',
          <Options options={NIGHT_FEEL} value={answers.nightFeel} onChoose={(value) => set('nightFeel', value)} tone="moon" dense />,
        ),
        ...replyButton(answers.nightFeel !== undefined),
      };

    case 'worst-time':
      return {
        ...moonQuestion(
          'When does it get you worst?',
          <Options options={WORST_TIME} value={answers.worstTime} onChoose={(value) => set('worstTime', value)} tone="moon" dense />,
        ),
        ...replyButton(answers.worstTime !== undefined),
      };

    case 'founder':
      // Plain and first person, no Loc aside: the only screen not in his voice, so it reads as a real note.
      return {
        body: (
          <View style={page.top}>
            <Eyebrow>{FOUNDER.eyebrow}</Eyebrow>
            <View style={styles.founder}>
              {FOUNDER.lines.map((line) => (
                <Body key={line}>{line}</Body>
              ))}
              <Text style={styles.founderSign}>{`— ${FOUNDER.sign}`}</Text>
            </View>
          </View>
        ),
        // Ask to Buy approved while they were back here: finish instead of selling the offer again.
        footer: <PrimaryButton label="Continue" onPress={ctx.entitled ? ctx.finishSetup : next} />,
      };

    case 'build':
      return {
        body: <BuildChapter title={BUILD[pain]} />,
        footer: <PrimaryButton label="Let’s go" onPress={next} />,
      };

    case 'night-minutes':
      return {
        ...moonQuestion(
          `In bed at ${formatWhen(answers.bedtime)}. When does the phone actually go down?`,
          <Options
            options={nightMinuteChoices(answers.bedtime)}
            value={answers.nightMinutes}
            onChoose={(value) => set('nightMinutes', value)}
            tone="moon"
            dense
          />,
        ),
        ...replyButton(answers.nightMinutes !== undefined),
      };

    case 'nights-per-week': {
      const days = answers.scrollDays ?? [];
      // The running total starts here and keeps adding up to the reveal (Imprint, Cal AI).
      // Counted like the reveal's lead (`leadFor`), so the reveal never says less than this did.
      const morningMinutes = answers.morningMinutes ?? 0;
      const soFar = leadFor({
        ...numbers,
        weeklyMinutes: (nightMinutes + morningMinutes) * days.length,
        nightWeeklyMinutes: nightMinutes * days.length,
        morningWeeklyMinutes: morningMinutes * days.length,
      }, answers.pain, answers.worstTime).minutes;
      return {
        ...moonQuestion(
          // A night and its morning come as a pair, so the count multiplies both either way.
          pain === 'morning' ? 'Which mornings does that happen?' : 'Which nights does that happen?',
          <DayRow
            unit={pain === 'morning' ? 'morning' : 'night'}
            value={days}
            onChange={(picked) => {
              set('scrollDays', picked);
              set('nightsPerWeek', picked.length);
            }}
          />,
          {
            sub: 'Be honest. Weekends count too.',
            // "X hours lost", changing with every day picked, in place: only the number rolls (user, 2026-10-26).
            // Both scroll questions skipped: no count, since any number here would be made up.
            reply: days.length === 0 || numbers.skipped ? undefined : <SoFar minutes={soFar} />,
          },
        ),
        ...replyButton(days.length > 0),
      };
    }

    case 'bedtime':
      return {
        body: (
          <View style={page.top}>
            <Title>{pain === 'morning' && !editing ? 'And when do you get into bed?' : 'When do you get into bed?'}</Title>
            <Body style={styles.sub}>
              {pain === 'night' ? 'The time you really get in. You keep everything before it.' : 'Getting in. Not falling asleep. Those are different.'}
            </Body>
            <View style={styles.timeWrap}>
              <TimeList
                value={answers.bedtime}
                onChange={(v) => set('bedtime', v)}
                label="Bedtime"
                icon="moon"
              />
            </View>
            {/* Wake time isn't set yet here (except in the morning branch, which asked it first),
                so only warn when it is. */}
            {(editing || pain === 'morning') && numbers.scheduleLooksWrong ? <ScheduleWarning minutes={numbers.timeInBed} /> : null}
          </View>
        ),
        footer: <PrimaryButton label={editing ? 'Save' : (REPLY_BUTTON.bedtime ?? 'Continue')} onPress={next} />,
        // The wheel already holds a time, so later just keeps it; Routine changes it any time.
        secondary: editing ? undefined : <TextButton label="Set up later" onPress={next} />,
      };

    case 'wake':
      return {
        body: (
          <View style={page.top}>
            <Title>When does your alarm go off?</Title>
            <Body style={styles.sub}>You can change this any time.</Body>
            <View style={styles.timeWrap}>
              <TimeList value={answers.wake} onChange={(v) => set('wake', v)} label="Alarm time" />
            </View>
            {bedtimeAsked && numbers.scheduleLooksWrong ? <ScheduleWarning minutes={numbers.timeInBed} /> : null}
          </View>
        ),
        footer: <PrimaryButton label={editing ? 'Save' : (REPLY_BUTTON.wake ?? 'Continue')} onPress={next} />,
        // The wheel already holds a time, so later just keeps it; Routine changes it any time.
        secondary: editing ? undefined : <TextButton label="Set up later" onPress={next} />,
      };

    case 'method': {
      // Every way on one list, steps first. Skip keeps 200 steps; Routine changes it later.
      return {
        body: (
          <View style={page.top}>
            <Title>How will you show me you’re up?</Title>
            <Body style={styles.sub}>Change it anytime.</Body>
            <View style={styles.methodOptions}>
              <Options
                options={methodChoices(goals.steps, goals.reps)}
                value={answers.method}
                onChoose={(value) => set('method', value)}
                tone="moon"
                dense={compact}
              />
            </View>
          </View>
        ),
        footer: (
          <PrimaryButton
            label={editing ? 'Save' : answers.method ? (REPLY_BUTTON.method ?? 'Continue') : 'Next'}
            disabled={!answers.method}
            onPress={next}
          />
        ),
        // Not sure yet: the default carries them through, and nothing here is final.
        secondary: editing ? undefined : (
          <TextButton
            label={answers.method ? 'Set up later' : `Skip for now. ${goals.steps} steps it is.`}
            onPress={() => {
              // Already picked one: later keeps it. Only an empty page falls back to steps.
              if (!answers.method) set('method', 'steps');
              next();
            }}
          />
        ),
      };
    }

    case 'morning-minutes': {
      return {
        ...moonQuestion(
          `Alarm at ${formatWhen(answers.wake)}. When do your feet hit the floor?`,
          <Options
            options={morningMinuteChoices(answers.wake)}
            value={answers.morningMinutes}
            onChoose={(value) => set('morningMinutes', value)}
            tone="moon"
            dense
          />,
        ),
        ...replyButton(answers.morningMinutes !== undefined),
      };
    }

    case 'tried': {
      return {
        ...moonQuestion(
          'What have you tried?',
          <Options options={triedChoices(answers.pain)} value={answers.tried} onChoose={(value) => set('tried', value)} tone="moon" dense />,
        ),
        ...replyButton(answers.tried !== undefined),
      };
    }

    case 'age':
      return {
        ...moonQuestion(
          'How old are you?',
          <Options options={AGE} value={answers.age} onChoose={(value) => set('age', value)} tone="moon" dense />,
        ),
        ...replyButton(answers.age !== undefined),
      };

    case 'time-back':
      return {
        ...moonQuestion(
          numbers.skipped
            ? SKIPPED_TIME_BACK
            : numbers.lightUser
              ? 'Say you got those minutes back. What would you do with them?'
              : timeBackQuestion(weeklyAmount(lead.minutes)),
          <Options options={timeBackChoices(answers.pain)} value={answers.timeBack} onChoose={(value) => set('timeBack', value)} tone="moon" dense />,
        ),
        ...replyButton(answers.timeBack !== undefined),
      };

    case 'reveal':
      return {
        body: <RevealScreen numbers={numbers} answers={answers} onPayoff={ctx.onPayoff} />,
        footer: (
          <Ready ready={ctx.payoff}>
            <PrimaryButton
              label={numbers.lightUser && !numbers.skipped ? 'Keep it that way' : 'Let’s fix this'}
              disabled={!ctx.payoff}
              onPress={next}
            />
          </Ready>
        ),
      };

    case 'tomorrow': {
      // A scan code or a place still to set up gets its page next (user, 2026-10-26).
      const setUp = answers.method !== undefined && methodInUse(answers.method) !== answers.method;
      return {
        body: (
          <TomorrowDemo
            when={`${wakeDay}, ${wake}`}
            clock={wake.replace(/\s?[AP]M$/i, '')}
            // Night people see their half first: the reach at bedtime, the night shield, then the morning.
            night={pain === 'night' ? nightPrelude(answers.bedtime, numbers.phoneDown, answers.wake) : undefined}
            method={answers.method ?? 'steps'}
            reps={goals.reps}
            onPayoff={ctx.onPayoff}
          />
        ),
        // A plain button, tappable from the start (user, 2026-10-26: not a progress bar).
        footer: <PrimaryButton label="Set it up" onPress={setUp ? ctx.setUpMethod : next} />,
        // Not now: 200 steps wakes them until the code or place is set in Routine.
        secondary: setUp && !editing ? <TextButton label="Set up later" onPress={next} /> : undefined,
      };
    }

    case 'scan-code': {
      // The code setup as one more page (user, 2026-10-26), read top down: the headline, the
      // choice, its line, the code. The button is the next thing to do: print the code, then
      // open the camera. Later: 200 steps until it's set in Routine.
      const qr = ctx.scanSource === 'qr';
      return {
        body: (
          <View style={page.top}>
            <Voice text={SCAN_CODE_HEADLINE} size={VoiceSize.headline} header />
            <View style={page.gapHeadline} />
            <ScanCodeSwitch source={ctx.scanSource} onSource={ctx.setScanSource} />
            <View style={page.gapBlock} />
            <ScanCodeWords source={ctx.scanSource} />
            <ScanCodeShown source={ctx.scanSource} qr={ctx.scanQr} printed={ctx.scanPrinted} onPrint={ctx.printScanCode} />
          </View>
        ),
        footer:
          qr && !ctx.scanPrinted ? (
            <PrimaryButton label="Print it" onPress={ctx.printScanCode} />
          ) : (
            <PrimaryButton label={qr ? 'It’s up. Scan it' : 'Scan a barcode'} onPress={ctx.openScanner} />
          ),
        secondary: <TextButton label="Set up later" onPress={next} />,
      };
    }

    case 'screen-time':
      if (ctx.screenTime === 'refused') {
        // Clear when it matters (VOICE.md): the problem and the fix, then one small aside.
        return {
          body: (
            <View style={page.top}>
              <Voice text="No access, no sleeping apps." size={VoiceSize.headline} header />
              <View style={page.gapHeadline} />
              <Body>
                Without Screen Time access I can’t put anything to sleep. Try again whenever you’re ready, or turn it on
                in <SettingsLink />. If a parent manages Screen Time on this iPhone, they have to approve it.
              </Body>
              <View style={page.gapAside} />
              <Voice text="I’ll wait. I’m good at lying down." size={VoiceSize.aside} delay={600} />
            </View>
          ),
          footer: <PrimaryButton label="Try again" onPress={ctx.askScreenTime} />,
          // Never a dead end: if iOS won't ask again, the rest of setup still goes on (no X before `commit`).
          secondary: editing ? undefined : <TextButton label="Set up later" onPress={ctx.setUpLater} />,
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
            <Voice text="Apple’s paperwork. Not mine." size={VoiceSize.aside} delay={600} />
          </View>
        ),
        // iOS asks for Face ID or the passcode after Apple's Continue.
        footer: <PrimaryButton label="Fine. Ask Apple." disabled={ctx.screenTime === 'asking'} onPress={ctx.askScreenTime} />,
        secondary: editing ? undefined : <TextButton label="Set up later" onPress={ctx.setUpLater} />,
      };

    case 'apps': {
      const picked = pickCount > 0;
      // Native rows can't fly into the moon, so on an iPhone the page simply moves on.
      const sleep = live ? next : putToSleep;
      return {
        body: (
          <View style={page.top}>
            <Title>{pain === 'overall' ? 'Which apps eat the most time?' : 'Which apps keep you up?'}</Title>
            <Body style={styles.sub}>
              {pain === 'overall'
                ? 'They sleep at bedtime and wake once you’re up. Daytime limits are in the Apps tab later.'
                : 'They sleep at bedtime and wake once you’re up.'}
            </Body>
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
                />
              </>
            ) : null}
          </View>
        ),
        footer: (
          <PrimaryButton
            // On an iPhone nothing sleeps until bedtime, so the button confirms the list; the
            // preview's falling-asleep animation keeps its own label.
            label={!picked ? 'Add apps' : editing ? 'Save' : live ? 'That’s the list' : `Put ${pickCount} to sleep`}
            // Editing from the summary just saves; the first time, they watch them fall asleep.
            onPress={!picked ? openPicker : editing ? next : sleep}
          />
        ),
        // Same way out as Screen Time's, always under the button so every page keeps its shape:
        // on without the falling-asleep bit, and the list (if any) stays; changed later in the Apps tab.
        secondary: editing ? undefined : <TextButton label="Set up later" onPress={next} />,
      };
    }

    case 'commit':
      // The summary and the deal on one page (D4): the schedule stays editable right up to the hold.
      return {
        // Top to bottom (user 2026-10-27): the eyebrow and title, then the card builds itself once
        // the title is in (ScheduleCard's `enterAt`), then the line under it.
        body: (
          <View style={page.top}>
            {/* Short phones: the card and the title are the deal, so the eyebrow and the passes line go. */}
            {compact ? null : <Eyebrow>{ctx.newYear ? `${NEW_YEAR.commit} ${new Date().getFullYear()}` : 'The deal'}</Eyebrow>}
            <Title>{`Phone down at ${bed}. ${method.commit}`}</Title>
            <ScheduleCard
              bedtime={answers.bedtime}
              wake={answers.wake}
              method={answers.method ?? 'steps'}
              apps={answers.apps}
              liveCount={live?.count}
              compact={compact}
              onChange={edit}
              enterAt={DEAL_CARD_AT_MS}
            />
            {lateNight ? (
              <Body delay={DEAL_AFTER_MS}>
                {compact ? 'I start the second you’re in.' : `It’s already past ${bed}. I start the second you’re in.`}
              </Body>
            ) : compact ? null : (
              // Night: the rested self sets the rule, and can change it anytime they're awake
              // (the schedule-edits rule), which answers "it's a punishment".
              <Body delay={DEAL_AFTER_MS}>
                {pain === 'night'
                  ? 'Your rule. Change it anytime you’re awake. Two passes a month for bad days.'
                  : 'Two passes a month for bad days. Tap anything to change it.'}
              </Body>
            )}
          </View>
        ),
        // Already subscribed (restored on the first screen): no paywall, straight to arming.
        footer: <HoldButton label="Hold to agree" doneLabel="Fine. Deal." onComplete={ctx.entitled ? ctx.finishSetup : next} />,
        // TEMP (2026-10-26): the hold doesn't work in the browser preview. Web only; remove later.
        secondary:
          Platform.OS === 'web' ? <TextButton label="Skip (web only)" onPress={ctx.entitled ? ctx.finishSetup : next} /> : undefined,
      };

    case 'offer': {
      if (!offers) return storeStep(ctx);
      // The morning they said they don't have comes first; the plans page then spends the
      // hours on what they'd do with them, so the two money screens echo different answers.
      const headline =
        feelingOffer(answers, phoneDown) ??
        (numbers.lightUser && !numbers.skipped ? LIGHT_OFFER_HEADLINE : (OFFER_HEADLINES[answers.timeBack ?? 'else'] ?? OFFER_HEADLINES.else));
      const trialDays = offers.annual.trialDays;
      return {
        body: (
          <View style={page.top}>
            <Voice text={headline} size={VoiceSize.headline} header />
            <View style={page.gapHeadline} />
            <Body>{noOrphan(pain === 'night' ? `Phone down at ${bed}. You keep the evening. ${method.offer}` : method.offer)}</Body>
            {/* Short phones keep the timeline whole and drop this line: the paywall headline says it next. */}
            {numbers.lightUser || compact ? null : (
              <>
                <View style={page.gapAside} />
                <Body>{`Week one: about ${weeklyAmount(lead.minutes)} back.`}</Body>
              </>
            )}
            {trialDays ? (
              // The trial timeline (Blinkist pattern): the most replicated paywall win in
              // docs/sub-club/themes/02-paywall-design-and-copy.md. Morning-first (TODO §4): the
              // first wake-up is a stop of its own, on every phone. The reminder day matches the
              // paywall's toggle. Filled stops are what the free week does; hollow ones are the deal.
              <View style={[styles.trail, compact && styles.trailCompact]}>
                {ctx.scheduledNight ? (
                  <>
                    {/* Past bedtime already, arming shields at once (`commit` said so too). */}
                    {/* Their end of the night reads brighter: weight only, no colour. */}
                    <TrailStop
                      title={schedule.when === 'Now' ? 'Now' : `${schedule.when}, ${schedule.bedAt}`}
                      body={schedule.when === 'Now' ? 'Your apps sleep as soon as you’re in. $0 today.' : 'Your apps go to sleep. $0 today.'}
                      filled
                      strong={pain === 'night'}
                    />
                    <TrailStop
                      title={`${schedule.wakeWhen}, ${schedule.wakeAt}`}
                      body={`They stay asleep until ${method.until}.`}
                      filled
                      strong={pain === 'morning'}
                    />
                  </>
                ) : (
                  <TrailStop title="Today" body={`${schedule.sleep} $0 today.`} filled />
                )}
                <TrailStop
                  title={`Day ${reminderDay(trialDays)} · ${dateFromToday(reminderDay(trialDays))}`}
                  body="I remind you. Grudgingly."
                />
                <TrailStop
                  title={`Day ${trialDays} · ${dateFromToday(trialDays)}`}
                  body={`${offers.annual.priceString} for the year, unless you cancel before then.`}
                  last
                />
              </View>
            ) : (
              <View style={styles.plan}>
                {!numbers.lightUser ? (
                  <PlanRow when="Now" what={`About ${weeklyAmount(lead.minutes)} a week ${LEAD_WHERE[lead.scope]}.`} />
                ) : null}
                <PlanRow when="Schedule" what={schedule.sleep} />
              </View>
            )}
            <Reveal>
              <Text style={styles.reassure}>{noOrphan('Only the apps you pick. Two passes a month for bad days.')}</Text>
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
                      ? `First, iOS asks about notifications, so I can remind you two days before your free trial ends on ${trialDay(ctx.trialEnds)}.`
                      : 'First, iOS asks about notifications. Just bedtime and morning.'}
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
      // The last screen (merged with the first-morning plan, 2026-10-26): tonight, the morning,
      // then what each iOS prompt is for before it shows (decided 2026-10-03), and only the ones
      // iOS will really show. One Continue opens them, per Apple's pre-permission guidance.
      const asksNotifications = notifications === 'undetermined';
      const reminds = answers.remindTrial && trialEnds !== null;
      const way = answers.method ?? 'steps';
      const asks = [
        asksNotifications && { name: 'notifications', for: reminds ? ['bedtime', 'morning', 'your trial reminder'] : ['bedtime', 'morning'] },
        motion === null && { name: 'motion', for: [way === 'downstairs' ? 'stairs' : 'steps'] },
        ctx.methodAsks ? METHOD_ACCESS[way] : undefined,
      ].filter((ask): ask is Ask => !!ask);
      // What a "Don't Allow" breaks, said here instead of at 7am. Once iOS has answered these
      // replace the asks, and the page stays up so they're read (`morningWarnings`).
      const warnings = morningWarnings({ notifications, motion, remindTrial: answers.remindTrial, trialEnds, method: way });
      // The label is when the first one is: "Tomorrow 7:00 AM".
      const wakeWhen = schedule.wakeWhen && schedule.wakeAt ? `${schedule.wakeWhen}, ${schedule.wakeAt}` : (method.morning.when ?? 'Morning');
      const started = ctx.scheduledNight !== null && ctx.scheduledNight.start <= new Date();
      return {
        body: (
          <View style={page.top}>
            <Voice
              text={startsNow ? 'Armed. Starting now. Put it down.' : schedule.armed}
              size={VoiceSize.headline}
              header
            />
            {/* One beat: the morning. Setup and what iOS turned down sit under it, quieter. */}
            <View style={styles.plan}>
              <PlanRow when={wakeWhen} what={method.morning.line} />
              {method.morning.note ? <Body style={styles.planNote}>{method.morning.note}</Body> : null}
              {warnings.map((row) => (
                <Body key={row.when} style={styles.planNote}>{row.what}</Body>
              ))}
            </View>
            {asks.length > 0 ? null : (
              <Voice text={started ? 'That’s it. Go to sleep.' : lastWord(answers, pain, bed)} size={VoiceSize.aside} delay={600} />
            )}
            {arm.status === 'preview' ? (
              <>
                <View style={page.gapBlock} />
                <PreviewNote>No Screen Time here, so nothing was handed to iOS. On an iPhone this only shows once iOS confirms tonight.</PreviewNote>
              </>
            ) : null}
          </View>
        ),
        // Waits for iOS's answers so far, so the copy above is right before anything is asked.
        footer:
          asks.length > 0 ? (
            <PrimaryButton label="Continue" disabled={notifications === null || ctx.asking} onPress={ctx.askPermissions} />
          ) : (
            <PrimaryButton label={lateNight && !morningSoon ? 'Good night' : 'Done'} onPress={exit} />
          ),
        // What iOS asks next sits under Continue, like a secondary line (user, 2026-10-26).
        secondary:
          asks.length > 0 ? (
            <Body style={styles.planNote}>{asksLine(asks)}</Body>
          ) : motion === 'denied' ? (
            <TextButton label="Open Settings" onPress={() => Linking.openSettings().catch(() => {})} />
          ) : undefined,
      };
    }
  }
}

/**
 * A list question on the risen moon: centred title and hint at the top, the black option
 * pills straight under them, his reply under the answers, and the button alone at the bottom.
 */
/**
 * A quiz page: one question, four answers, no hint and no reply from him. Only the day picker
 * keeps a hint (it's multi-select) and its running total.
 */
function moonQuestion(
  title: string,
  options: ReactNode,
  {
    sub,
    reply,
    risen = true,
  }: {
    sub?: string;
    /** His line under the answers; a node when it changes in place (`SoFar`). */
    reply?: string | ReactNode;
    /** False off the quiz (`pain`): the moon has sunk, so the page starts at the top. */
    risen?: boolean;
  } = {},
) {
  return {
    body: (
      <View style={styles.moonQuestion}>
        <MoonQuestionHead title={title} sub={sub} risen={risen} />
        {options}
        {typeof reply === 'string' ? <Reply text={reply} /> : reply ? <Reply>{reply}</Reply> : <Reply />}
      </View>
    ),
  };
}

const COUNT_WORDS = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
const countWord = (n: number) => COUNT_WORDS[n] ?? String(n);

/** The question sits up near the top bar, above the moon's curve, not on the moon. */
/** `nights-per-week`'s running total. The line stays put as days are picked; only the number rolls. */

function SoFar({ minutes }: { minutes: number }) {
  const { count, unit } = weeklyParts(minutes);
  const reduced = useReducedMotion();
  // Crossing between minutes and hours, the digits and the word would change at once. So the
  // whole thing just fades over as one piece instead of rolling.
  const scale = unit === 'minutes' ? 'minutes' : 'hours';
  return (
    // The number is the result, so it's the big thing; the words sit small under it like the day count.
    <View style={styles.soFar} accessible accessibilityLabel={`${count} ${unit} lost a week.`}>
      <LayoutAnimationConfig skipEntering>
        <Animated.View
          key={scale}
          entering={reduced ? undefined : soFarSwap('in')}
          exiting={reduced ? undefined : soFarSwap('out')}
          style={styles.soFarFace}
        >
          <RollingCount value={count} size={56} style={styles.soFarCount} />
          <Text style={styles.soFarUnit}>{`${unit} lost a week`}</Text>
        </Animated.View>
      </LayoutAnimationConfig>
    </View>
  );
}

/** `SoFar`'s swap between minutes and hours: the old line fades out, then the new one fades in. */
function soFarSwap(way: 'in' | 'out') {
  return way === 'in'
    ? new Keyframe({ 0: { opacity: 0 }, 100: { opacity: 1, easing: Easing.out(Easing.quad) } }).duration(260).delay(120)
    : new Keyframe({ 0: { opacity: 1 }, 100: { opacity: 0, easing: Easing.in(Easing.quad) } }).duration(140);
}

function MoonQuestionHead({ title, sub, risen }: { title: string; sub?: string; risen: boolean }) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  return (
    // Extra room under the question so it doesn't run into the answers.
    <View style={{ marginTop: risen ? 60 - quizContentTop(height, insets.top) : Gap.section, marginBottom: Space.l }}>
      <Title style={styles.moonTitle}>{title}</Title>
      {sub ? <Body style={[styles.sub, styles.moonSub]}>{sub}</Body> : null}
    </View>
  );
}

/** One beat of the plan, centred like the rest of onboarding: the label over its line. */
function PlanRow({ when, what }: { when: string; what: string }) {
  return (
    <Reveal style={styles.planRow}>
      <Text style={styles.planWhen}>{when}</Text>
      <Text style={styles.planWhat}>{noOrphan(what)}</Text>
    </Reveal>
  );
}

/**
 * His last word on `armed` when iOS has nothing left to ask: the time they confessed to, from their end of the night.
 * Night echoes the phone going down; overall whichever end they gave; the rest the feet.
 */
function lastWord(answers: Answers, pain: Pain, bed: string): string {
  const feet = answers.morningMinutes !== undefined && answers.morningMinutes > 3;
  const late = answers.nightMinutes !== undefined && answers.nightMinutes > 5;
  const nightEcho = `You said phone down around ${formatWhen(answers.bedtime + (answers.nightMinutes ?? 0))}. Tonight it’s ${bed}.`;
  const feetEcho = `You said feet down around ${formatWhen(answers.wake + (answers.morningMinutes ?? 0))}. We’ll see.`;
  if (pain === 'night' && late) return nightEcho;
  if (feet) return feetEcho;
  if (pain === 'overall' && late) return nightEcho;
  return 'I’ll be asleep. Don’t wake me.';
}

/**
 * The night branch's opening to the demo: the reach a little after getting into bed (or when
 * the phone usually goes down, if that's sooner), the night shield, then tomorrow morning.
 */
function nightPrelude(bedtime: number, phoneDown: number, wake: number): NightPrelude {
  const at = Math.min(bedtime + 22, Math.max(bedtime + 5, phoneDown));
  const clock = formatClock(at);
  return { when: `Tonight, ${clock}`, clock: clock.replace(/\s?[AP]M$/i, ''), wake };
}

/** One stop on the trial timeline: a dot on the rail, the day in white, what happens under it. */
function TrailStop({
  title,
  body,
  filled,
  last,
  strong,
}: {
  title: string;
  body: string;
  filled?: boolean;
  last?: boolean;
  /** Their end of the night: the line under it reads in full white. */
  strong?: boolean;
}) {
  return (
    <Reveal style={styles.stop}>
      <View style={styles.rail}>
        <View style={[styles.dot, filled && styles.dotFilled]} />
        {last ? null : <View style={styles.railLine} />}
      </View>
      <View style={[styles.stopText, !last && styles.stopGap]}>
        <Text style={styles.stopTitle}>{title}</Text>
        <Text style={[styles.stopBody, strong && styles.stopBodyStrong]}>{body}</Text>
      </View>
    </Reveal>
  );
}

/** Shown when bedtime to wake is implausibly long or short, which is usually AM/PM mixed up. */
function ScheduleWarning({ minutes }: { minutes: number }) {
  return <Body style={styles.warning}>That’s {formatHoursFromMinutes(minutes)} hours in bed. Check AM and PM.</Body>;
}

/** One iOS prompt on `armed`: what iOS calls it, and what it's for. */
type Ask = { name: string; for: string[] };

/** The wake-up way's own prompt on `armed`, after Motion (method-access.ts). */
const METHOD_ACCESS: Partial<Record<WakeMethod, Ask>> = {
  place: { name: 'location', for: ['checking in'] },
  scan: { name: 'the camera', for: ['your code'] },
  pushups: { name: 'the camera', for: ['push-ups'] },
};

/** "iOS asks about notifications and motion next. Just for bedtime, morning, and steps." */
function asksLine(asks: Ask[]): string {
  return `iOS asks about ${listed(asks.map((ask) => ask.name))} next. Just for ${listed(asks.flatMap((ask) => ask.for))}.`;
}

function listed(items: string[]): string {
  if (items.length < 3) return items.join(' and ');
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

/** "Fri, Oct 10": the trial's last day, the way the reminder would have said it. */
function trialDay(ends: Date): string {
  return ends.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

type PlanLine = { when: string; what: string };

/**
 * The rows on `armed` for what iOS turned down: the trial reminder that can't come, Motion off,
 * or no step counter (an iPad, which still has a barometer for stairs). The flow reads it too,
 * to stay on the page after the prompts when there's something to read.
 */
export function morningWarnings({
  notifications,
  motion,
  remindTrial,
  trialEnds,
  method,
}: {
  notifications: NotificationPermission | null;
  motion: MotionAccess | null;
  remindTrial: boolean | undefined;
  trialEnds: Date | null;
  method: WakeMethod;
}): PlanLine[] {
  const rows: PlanLine[] = [];
  if (notifications === 'denied' && remindTrial && trialEnds) rows.push({ when: 'Free trial', what: noReminderLine(trialEnds) });
  if (motion === 'denied')
    rows.push({ when: 'Motion', what: 'It’s off, so I can’t feel stairs or count steps. Turn on Motion & Fitness for Locturne in Settings.' });
  if (motion === 'unavailable' && method === 'steps')
    rows.push({ when: 'This device', what: 'It can’t count steps. Set up a scan code from the You tab, or use a pass.' });
  return rows;
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

/** A link in the opener's fine print. */
/** "Settings" inside a line, opening Locturne's page there. */
function SettingsLink() {
  return (
    <Text accessibilityRole="link" style={styles.fineLink} onPress={() => Linking.openSettings().catch(() => {})}>
      Settings
    </Text>
  );
}

function FineLink({ label, url }: { label: string; url: string }) {
  return (
    <Text accessibilityRole="link" style={styles.fineLink} onPress={() => Linking.openURL(url).catch(() => {})}>
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  // Standalone text on the quiz moon starts just under its curve, never down by the buttons.
  moonTop: { flex: 1 },
  opener: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: Space.xl },
  wordmark: { ...DisplayFont, color: Nocturne.text, fontSize: 40, letterSpacing: -1 },
  openerFine: { color: Nocturne.text2, ...Type.legal, textAlign: 'center', paddingTop: Space.s },
  fineLink: { color: Nocturne.text },
  gap8: { height: Space.s },
  // The grey line under a page's title (Type.headingSub).
  sub: { marginTop: Space.m, color: Nocturne.text2, ...Type.headingSub },
  moonQuestion: { flex: 1, gap: Gap.block, paddingBottom: Space.s },
  moonTitle: { textAlign: 'center' },
  moonSub: { textAlign: 'center' },
  // Fixed height: during a swap both faces lie over each other here instead of stacking.
  soFar: { alignSelf: 'stretch', height: 62 + 20, marginTop: Gap.block },
  soFarFace: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center' },
  soFarCount: { ...DisplayFont, color: Nocturne.text, fontSize: 56, lineHeight: 62, letterSpacing: -1 },
  soFarUnit: { color: Nocturne.text2, fontSize: 15, lineHeight: 20, fontWeight: '500' },
  // The wheel sits midway between the question and the button.
  timeWrap: { flex: 1, justifyContent: 'center', marginVertical: Gap.block },
  warning: { marginTop: Gap.block, textAlign: 'center', color: Nocturne.text },
  appsCard: { marginTop: Gap.block },
  methodOptions: { marginTop: Gap.block, marginBottom: Space.l },
  plan: { marginVertical: Gap.block, gap: Space.m },
  planRow: { alignItems: 'center', gap: 2 },
  planWhen: { ...Type.rowKey, fontVariant: ['tabular-nums'], textAlign: 'center' },
  planWhat: { color: Nocturne.text, ...Type.body, textAlign: 'center' },
  planNote: { color: Nocturne.text2, ...Type.secondary, textAlign: 'center' },
  reassure: { color: Nocturne.text2, ...Type.secondary, textAlign: 'center' },
  // A timeline reads down its rail, so its rows start at the rail; the block itself sits centred.
  trail: { marginVertical: Gap.block, alignSelf: 'center' },
  trailCompact: { marginVertical: Space.l },
  stop: { flexDirection: 'row', gap: Space.m },
  // The dot sits on the title's first line; the line runs down to the next stop's dot.
  rail: { width: 12, alignItems: 'center', paddingTop: 6 },
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: Nocturne.text2 },
  dotFilled: { backgroundColor: Nocturne.text, borderColor: Nocturne.text },
  railLine: { flex: 1, width: 2, marginVertical: 4, borderRadius: 1, backgroundColor: Nocturne.edge },
  stopText: { flex: 1 },
  stopGap: { paddingBottom: Space.m },
  stopTitle: { color: Nocturne.text, ...Type.body, fontWeight: '600', fontVariant: ['tabular-nums'] },
  stopBody: { color: Nocturne.text2, ...Type.secondary, marginTop: 2 },
  stopBodyStrong: { color: Nocturne.text },
  founder: { marginTop: Gap.headline, gap: Space.l },
  founderSign: { ...Type.body, color: Nocturne.text, fontStyle: 'italic', textAlign: 'center' },
  shiftRow: { marginTop: Space.l, flexDirection: 'row', justifyContent: 'center', marginBottom: Space.m },
});
