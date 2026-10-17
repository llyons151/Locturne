'use no memo';
// Reads the App Group stores during render (the morning proofs), which change outside
// React, so the React Compiler stays out of here.

import { useKeepAwake } from 'expo-keep-awake';
import { router, useIsFocused } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTabBarInset } from '@/components/app-tabs';
import { useHealth } from '@/hooks/use-health';
import { askAccessAgain } from '@/lib/ask-access';
import { getNightPause, heldPhase, pauseWording } from '@/lib/emergency';
import { lapseStillCovers, nextBedtime, routineAt, subscriptionEnded } from '@/lib/lock-controller';
import type { Health } from '@/lib/health';
import { dateKey, type LockState, type Phase } from '@/lib/lock-state';
import { getTone } from '@/lib/tone';
import { getMorningsWon, getProofs, type MorningProof } from '@/lib/morning-proof';
import { getTrialEnd } from '@/lib/notifications';
import { manageSubscriptions } from '@/lib/purchases';
import { getRoutineChange, nextNightOn, nightAt, nightWasOn, pushupGoalOf, type Routine, type WakeMethod } from '@/lib/routine';
import { methodInUse } from '@/lib/scan-code';
import {
  bedtimeAppCount,
  isScreenTimeAvailable,
  isStoodDown,
  sharedGet,
  sharedSet,
  listChangeLandsAt,
  nightLockArmed,
  nightPickCount,
  nightPickCountAfterChange,
  selectionSize,
  shownSelection,
} from '@/lib/screen-time';
import { getSites } from '@/lib/websites';
import { clockLabel } from '@/lib/shield-copy';
import { trialNotice } from '@/lib/trial-notice';
import { Gap, Space } from '@/theme';

import { awakeLine, dayHero, napHero, offHero, trialHero } from './awake-line';
import { HomeContent, type HomeAction, type HomeMeter } from './home-content';
import type { HomeLook } from './home-look';
import { LocCue, markLocSaid } from './loc';
import type { LocMoment } from './loc-lines';
import { bigClock, duration, useMinute } from './night-meter';
import { useReviewPrompt } from './review-prompt';
import { useLocMind } from './use-loc-mind';
import { useVisit } from './use-visit';
import { useHomeState } from './use-home-state';
import { useMoonSink } from './use-moon-sink';
import { useCatchingUp } from './catch-up';
import { scanMorning, WALK_INSTEAD } from './morning';
import { useMorningPlace } from './use-morning-place';
import { useMorningPushups } from './use-morning-pushups';
import { useMorningStairs } from './use-morning-stairs';
import { useMorningWalk, type MorningWalk } from './use-morning-walk';
import { useHomeMock } from '../dev/state-lab/app-states';
import { MockBar, MockSwipe } from '../dev/state-lab/mock-bar';
import { pretendMethod, useWakePreview } from '../dev/wake-lab/wake-preview';
import { weekDays } from './week';

/** Dev only: fill Sunday through today with won days to preview the mist. */
const MOCK_WEEK = __DEV__;

/**
 * Home, mocked up after Oura's "Bedtime's approaching" (docs/design-references/home-moon,
 * 01-oura-bedtime): the moon is the floor of the screen, so everything lives in the sky
 * above it. The top (home-top) holds the mornings count,
 * today's screen time and this week's dots (option B in the README); then one centred headline,
 * one sentence and one quiet button. Over the moon only Loc, peeking over the panel's edge.
 */

const MORNING_ACTION = { downstairs: 'Go downstairs', steps: 'Start walking', scan: 'Scan my code', place: 'Check in', pushups: 'Start push-ups' } as const;
/** The evening button names tomorrow's wake-up, the part of the night that's still to come. */
const METHOD_NAME = { downstairs: 'Downstairs', steps: '200 steps', scan: 'Scan my code', place: 'Leave the house', pushups: 'Push-ups' } as const;

/** `pauseWording`'s answer: the paused night's words. */
type PauseWords = ReturnType<typeof pauseWording>;

/**
 * Everything Home reads from the stores, gathered in one place so the app-states lab (dev,
 * features/dev/state-lab) can swap the lot for a made-up state. The rest of Home only turns
 * these into words.
 */
export type HomeFacts = {
  lock: Pick<LockState, 'phase' | 'morningKey' | 'nextChange' | 'blockNowUntil'>;
  routine: Routine;
  /** This morning's proof, if it's been unlocked. */
  proof: MorningProof | null;
  health: Health;
  /** `heldPhase`: the clock's phase as far as what's asleep (a night nothing holds is day). */
  held: Phase;
  /** An emergency unlock paused the night until then (`getNightPause`), and its words. */
  pause: Date | null;
  pauseWords: PauseWords | null;
  /** The wake-up Home's morning shows. */
  method: WakeMethod;
  /** The week strip: mornings got up, past mornings no night locked, and the lifetime count. */
  won: Set<string>;
  free: Set<string>;
  mornings: number;
  /** The next night that will really sleep, or null when every night is off. */
  sleepsAt: Date | null;
  /** Tonight's night is switched on in the routine (`nightAt`). */
  tonightOn: boolean;
  /** A bedtime-list change lands before the next bedtime, so the count isn't known yet. */
  listChanges: boolean;
  /** The bedtime list has apps at the next bedtime (or now, during a night). */
  bedtimeApps: boolean;
  /** A night lock is scheduled (`nightLockArmed`). */
  armed: boolean;
  /** No subscription, so nothing sleeps. */
  stoodDown: boolean;
  /** The always list has apps in it (or there's no Screen Time to ask). */
  alwaysSleeps: boolean;
  trialEnd: Date | null;
  /** Bedtime apps and typed-in websites, or null while a list change is still to land. */
  apps: number | null;
  websites: number | null;
  /** Put before Loc's moment keys, so a made-up state never uses up a real night's line. */
  sayKey: string;
};

/** Home's facts as the stores have them now. */
function readHomeFacts(now: Date, { lock, routine, proof }: ReturnType<typeof useHomeState>, health: Health): HomeFacts {
  // An emergency unlock paused tonight: the windows still run, so the clock says night.
  const pause = getNightPause(now);
  // Mornings you got up: a wake-up method's proof. Passes and emergencies neither count nor
  // subtract (HOME_10.md #7). The store keeps the last 30 proofs, enough for this week's dots;
  // the lifetime count is its own counter (`getMorningsWon`).
  const won = new Set(getProofs().filter((p) => p.kind !== 'pass' && p.kind !== 'emergency').map((p) => p.morningKey));
  // MOCK (dev only, remove when done looking): Sunday through today's date count as got up, so
  // the week strip shows the mist dots without real mornings. By the calendar, not
  // `morningKey`, which is already tomorrow at night. Days still to come stay plain.
  if (MOCK_WEEK)
    for (const day of weekDays(lock.morningKey, won)) if (day.key <= dateKey(now)) won.add(day.key);
  // Past mornings this week no night locked (off, or before the first save): not "missed".
  const change = getRoutineChange(now);
  const free = new Set(
    weekDays(lock.morningKey, won)
      .filter((day) => day.key < lock.morningKey && !day.done && !nightWasOn(day.key, routine, change))
      .map((day) => day.key),
  );
  // The next night that will really sleep: not `lock.nextChange`, which is the end of the
  // window during an unheld night, and the start of a night that's switched off by day.
  const next = nextNightOn(pause ?? nextBedtime(now), now);
  const sleepsAt = next && pause && next < pause ? pause : next;
  // The bedtime list as it stands at the next bedtime (or now, during a night under way): a
  // change that lands first counts, as `rescheduleNotifications` judges it. With it empty,
  // nothing sleeps at bedtime and the morning is free (`readLock`), so no bedtime is promised.
  const handoff = listChangeLandsAt('night', now);
  const bedtimeAt = lock.phase === 'night' && !pause ? now : sleepsAt;
  const listChanges = !!handoff && !handoff.waitsForOpen && !!bedtimeAt && handoff.at <= bedtimeAt;
  return {
    lock,
    routine,
    proof,
    health,
    held: heldPhase(lock.phase, now),
    pause,
    pauseWords: pause ? pauseWording(pause, now) : null,
    // The wake preview (dev) can put any method's morning on Home.
    method: pretendMethod() ?? methodInUse(routine.method),
    won,
    free,
    mornings: MOCK_WEEK ? Math.max(getMorningsWon(), won.size) : getMorningsWon(),
    sleepsAt,
    tonightOn: nightAt(nextBedtime(now), now).on,
    listChanges,
    bedtimeApps: !isScreenTimeAvailable() || (listChanges ? nightPickCountAfterChange() : nightPickCount()) > 0,
    armed: nightLockArmed(),
    stoodDown: isStoodDown() || (subscriptionEnded() && lapseStillCovers(now) === null),
    alwaysSleeps: !isScreenTimeAvailable() || selectionSize('always') > 0,
    trialEnd: getTrialEnd(),
    apps: listChanges ? null : shownSelection('night').size === 0 ? 0 : bedtimeAppCount('night'),
    websites: listChanges ? null : getSites('night').length,
    sayKey: '',
  };
}

export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const tabInset = useTabBarInset();
  const { width } = useWindowDimensions();
  const real = useHomeState();
  // The real lock and proof, even under a made-up state: Apple's review sheet is no place for a mock.
  useReviewPrompt(real.lock, real.proof);
  useMoonSink();
  const now = useMinute();
  const catchingUp = useCatchingUp();
  // Bumped each time Home opens, the app returns to the foreground or the day rolls over, so
  // today's screen time redraws.
  const visit = useVisit(dateKey(now));
  const focused = useIsFocused();

  // Honest status (health.ts): access off or never given replaces everything. Also keeps the
  // notifications in line when protection changes while Home is open.
  const [realHealth, recheckHealth] = useHealth();
  // Dev only: a made-up state from You → Developer → App states (features/dev/state-lab).
  const mock = useHomeMock();
  // The payoff opens over Home once, the moment a real wake-up wakes the apps.
  usePayoff(real.proof, !mock);
  usePretendPayoff(!mock);
  const facts = mock ? mock.facts(now, real.routine) : readHomeFacts(now, real, realHealth);
  const { lock, routine, proof, health, pause, method, won, free, mornings, sleepsAt, bedtimeApps } = facts;
  const unprotected = health.protection === 'off' || health.protection === 'notSetUp';
  // Nothing is asleep on a night that isn't held (never bought, stood down, arming failed,
  // paused, past a lapse's last paid night, or an empty bedtime list), so it reads as day.
  const phase = facts.held === 'night' && !bedtimeApps ? 'day' : facts.held;
  // The morning happens right here (docs/HOME_INTERACTIVE.md): a walk is counted on Home, the
  // stairs and the place check-in run on it, and the scan and push-ups open only their camera
  // (push-ups used to open the old wake page; user, 2026-10-15). Steps count under every
  // method, and prove the morning by themselves (GAME_PLAN: walking always works instead).
  const morningHere = !unprotected && phase === 'morning';
  const walked = useMorningWalk(morningHere, routine);
  // "Walk 200 steps instead" turns this morning's Home into the walk (user, 2026-10-15). Kept
  // per morning, so tomorrow starts on the routine's own method again.
  const [walkingFor, setWalkingFor] = useState<string | null>(null);
  const canWalk = walked?.kind === 'counting';
  const walkingInstead = morningHere && method !== 'steps' && canWalk && walkingFor === lock.morningKey;
  const walkInstead = canWalk && method !== 'steps' ? { label: `Walk ${walked.goal} steps instead`, onPress: () => setWalkingFor(lock.morningKey) } : undefined;
  const walk = method === 'steps' || walkingInstead ? walked : null;
  const own = morningHere && !walkingInstead;
  const stairs = useMorningStairs(own && method === 'downstairs', walked);
  const place = useMorningPlace(own && method === 'place', walked, routine.stepGoal);
  const pushups = useMorningPushups(own && method === 'pushups', walked, pushupGoalOf(routine), lock.morningKey, () => walkInstead?.onPress());
  const morningHero = stairs ?? place ?? pushups?.morning ?? (own && method === 'scan' ? scanMorning() : null);
  // The method's "walk instead" placeholder, made real; never the passes (they stay in You).
  const made = (a: HomeAction | null | undefined) => (a === WALK_INSTEAD ? walkInstead : (a ?? undefined));
  const here = morningHero && { ...morningHero, action: made(morningHero.action) ?? null, alt: made(morningHero.alt) };
  const target = phase === 'day' ? sleepsAt : lock.nextChange;
  const minutes = target ? Math.round((target.getTime() - now.getTime()) / 60_000) : null;
  // Tonight switched off: `sleepsAt` is a later night's bedtime, so say tonight is off and
  // name that night's weekday rather than count down as if it were tonight's. A pause still
  // pending by day (the day after a night-time emergency) doesn't change that; only the paused
  // night itself has its own hero.
  const offTonight =
    !(pause && lock.phase === 'night') && sleepsAt && !facts.tonightOn ? sleepsAt.toLocaleDateString('en-US', { weekday: 'long' }) : null;

  // By day (or a night nothing holds), never name a bedtime that won't lock: no subscription,
  // Ask to Buy waiting, arming failed or a lapse say so instead, and offer the plans when
  // that's the fix.
  const paused = !!pause && lock.phase === 'night';
  const attention = !unprotected && !paused && phase === 'day' && health.level === 'attention';
  const { armed, stoodDown, alwaysSleeps } = facts;
  // A Block now running by day, on a night off or on a night an emergency paused is what's
  // asleep, so it leads over the countdown to bedtime and the paused night's "Awake tonight"
  // (a status that needs attention still comes first).
  const napping = !attention && lock.blockNowUntil && lock.blockNowUntil > now ? lock.blockNowUntil : null;
  // The trial's last days (B4): the paywall's "I remind you", kept even without notifications.
  // Leads by day, behind anything that needs fixing.
  const trial = !unprotected && !attention && !paused && phase === 'day' ? trialNotice(facts.trialEnd, now) : null;
  const hero = unprotected
    ? { title: health.title, body: health.detail }
    : pause && lock.phase === 'night' && !napping && facts.pauseWords
      ? pausedHero(facts.pauseWords)
      : trial
        ? trialHero(trial)
        : (phase === 'day' || phase === 'off') && napping
        ? napHero(clockAt(napping))
        : phase === 'off'
        ? offHero(alwaysSleeps && !stoodDown)
        : phase === 'day'
          ? dayHero({
              attention: attention ? health : null,
              scheduled: armed && !stoodDown && bedtimeApps,
              line: awakeLine({
                armed,
                stoodDown,
                noBedtimeApps: !bedtimeApps,
                tonightAt: sleepsAt && !offTonight ? clockAt(sleepsAt) : null,
                alwaysSleeps,
              }),
              until: minutes === null ? null : duration(minutes),
              sleepsAt: sleepsAt ? clockAt(sleepsAt) : null,
              offTonight,
              alwaysSleeps: alwaysSleeps && !stoodDown,
              // A change still to land would make today's count wrong, so it just says "Your apps".
              // With only typed-in websites there's no selection to count: none, not unknown.
              apps: facts.apps,
              websites: facts.websites,
            })
          : walk
            ? walkHero(walk)
            : here
              ? here.hero
              : heroFor(phase, clockLabel(routine.morningStart));
  // Tomorrow's morning will hold (tonight sleeps, or is asleep), so the button says how it
  // ends rather than offering the schedule. Nights off and nothing scheduled keep Edit schedule,
  // which is the fix there.
  const tomorrowLocked =
    !stoodDown && armed && (phase === 'night' || (phase === 'day' && !attention && !!sleepsAt && !offTonight));
  // Asks right here (askAccessAgain), which offers Settings only if it's refused again.
  const turnAccessOn = () => askAccessAgain().then(recheckHealth);
  // A walk with Motion & Fitness off: Settings, with the other ways under it.
  const walkSettings = walk?.kind === 'denied' ? { label: 'Open Settings', onPress: () => Linking.openSettings().catch(() => {}) } : null;
  // The locked morning's method and time. "Tomorrow" until midnight; past it, the morning is
  // today, by night or by day (a bedtime after midnight: at 0:30 the 7:00 morning is this one).
  // In its last hour the line above already gives the time, so just the method.
  const nextMorningLabel = () => {
    const today = now.getHours() * 60 + now.getMinutes() < routine.morningStart;
    const name = method === 'steps' ? `${routine.stepGoal} steps` : METHOD_NAME[method];
    if (today && phase === 'night' && minutes !== null && minutes <= 60) return `This morning: ${name}`;
    return `${today ? 'This morning' : 'Tomorrow'}: ${name} at ${clockLabel(routine.morningStart)}`;
  };
  const action = unprotected
    ? health.protection === 'notSetUp'
      ? { label: 'Turn on Screen Time', onPress: turnAccessOn }
      : { label: 'Turn Screen Time back on', onPress: turnAccessOn }
    : attention && health.needsSubscription
      ? { label: 'See plans', onPress: () => router.push('/onboarding?resume=paywall') }
      : trial
        ? { label: 'Manage subscription', onPress: manageTrial }
        : walkSettings
          ? walkSettings
        : walk
          ? null
        : here
          ? here.action
        : phase === 'morning'
          ? { label: MORNING_ACTION[method], onPress: () => router.push({ pathname: '/wake', params: { method } }) }
          : !bedtimeApps && !stoodDown
            ? { label: 'Pick bedtime apps', onPress: () => router.push('/apps') }
            : tomorrowLocked
              ? { label: nextMorningLabel(), onPress: () => router.push('/routine'), opens: true }
              : { label: 'Edit schedule', onPress: () => router.push('/routine') };

  // Each state's look (`HomeLook`), so they differ by more than their words.
  const problem = unprotected || (attention && health.needsSubscription) || (attention && !napping);
  // The morning just won with a wake-up (not a pass), for three hours after.
  const wonAt = phase === 'day' && proof && proof.kind !== 'pass' && proof.kind !== 'emergency' && now.getTime() - proof.at < DONE_FOR ? proof : null;
  // The countdown to a bedtime that will really sleep: the day's plain "Bedtime in" hero.
  const countdown = phase === 'day' && !problem && !attention && !paused && !trial && !napping && !offTonight && armed && !stoodDown && bedtimeApps && minutes !== null && !!sleepsAt;
  const asleep = phase === 'night' && !paused && !napping && !unprotected;
  const look: HomeLook = problem
    ? 'problem'
    : phase === 'morning'
      ? 'morning'
      : asleep
        ? 'night'
        : wonAt && !trial && !napping
          ? 'done'
          : countdown
            ? minutes <= 60
              ? 'evening'
              : 'day'
            : 'plain';
  const wake = bigClock(routine.morningStart);
  // The last hour before wake-up: like the last hour before bedtime, the countdown is the big
  // number over a track filling toward it, and the wake time moves into the line under it
  // ("Asleep until 7:00 am", a lone "in 26m", then the line, read as scraps: user, 2026-10-15).
  const wakeSoon = look === 'night' && minutes !== null && minutes <= 60;
  const face: HomeMeter | undefined = wakeSoon
    ? { kicker: 'Wake-up in', value: duration(minutes ?? 0), progress: 1 - (minutes ?? 0) / 60, countsDown: true }
    : look === 'day' || look === 'evening'
      ? {
          kicker: 'Bedtime in',
          value: duration(minutes ?? 0),
          countsDown: true,
          // The last hour fills toward bedtime.
          progress: look === 'evening' ? 1 - (minutes ?? 0) / 60 : undefined,
        }
      : look === 'night'
        ? { kicker: 'Asleep until', value: wake.value, unit: wake.unit }
        : look === 'done' && wonAt
          ? { kicker: 'Up at', ...bigClock(new Date(wonAt.at).getHours() * 60 + new Date(wonAt.at).getMinutes()) }
          : undefined;
  // The words under the big number: what it doesn't already say.
  const shown = wakeSoon
    // Not "your apps wake at": they stay asleep past wake-up until you're up (a proof).
    ? { title: hero.title, body: `Phone down. Wake-up at ${clockLabel(routine.morningStart)}. They wake once you’re up and moving.` }
    : look === 'night'
      ? { title: hero.title, body: 'Phone down. They wake once you’re up and moving.' }
      : look === 'done' && wonAt
        ? { title: `Up at ${clockAt(new Date(wonAt.at))}`, body: `${DONE_WORDS[wonAt.kind as WakeMethod]}. Your apps are awake.` }
        : hero;

  // Loc sleeps when the apps do (a held night, or Block now), is groggy through the locked
  // morning, and is up by day.
  const baseMood = (phase === 'night' && !paused) || napping ? 'asleep' : phase === 'morning' ? 'groggy' : 'awake';
  // What he remembers about you (lib/loc-mind.ts, docs/LOC_PERSONALITY.md): respect makes him
  // smug by day, slipping out makes him wary, and some days he has something to bring up.
  const mind = useLocMind({
    sayKey: facts.sayKey,
    phase,
    morningKey: lock.morningKey,
    todayKey: dateKey(now),
    proof,
    mornings,
    now,
    visit,
    focused,
    tone: getTone(),
  });
  const mood = baseMood === 'awake' && mind.proud ? 'smug' : baseMood;
  // What Loc has something to say about (loc-lines.ts), once each: bedtime within the hour, the
  // apps just gone to sleep, this morning's wake-up done. Keyed so each is said once per night.
  const quiet = unprotected || attention || paused || stoodDown;
  const moment: LocMoment | null = quiet
    ? null
    : mind.moment
      ? mind.moment
      : phase === 'night'
      ? { kind: 'appsAsleep', key: `${facts.sayKey}asleep:${lock.morningKey}` }
      : phase === 'day' && proof && proof.kind !== 'pass' && proof.kind !== 'emergency'
        ? { kind: 'wakeDone', key: `${facts.sayKey}woke:${proof.morningKey}` }
        : phase === 'day' && armed && bedtimeApps && !offTonight && !napping && minutes !== null && minutes > 0 && minutes <= 60
          ? { kind: 'bedtimeSoon', key: `${facts.sayKey}soon:${lock.morningKey}` }
          : null;

  // How much of the resting moon pokes above the panel's edge (night-sky.tsx): keep clear of it.
  const moonArc = width * 0.9 * 0.36;

  const screen = (
    <View style={[styles.container, { paddingTop: insets.top + Space.l, paddingBottom: tabInset + moonArc }]}>
      <HomeContent
        mornings={mornings}
        today={lock.morningKey}
        won={won}
        free={free}
        revision={visit}
        hero={shown}
        look={look}
        catchingUp={catchingUp}
        heroKey={walk?.kind === 'counting' ? (walk.steps ?? 0) : here?.meter ? Number.parseFloat(here.meter.value) || 0 : (minutes ?? 0)}
        meter={walk?.kind === 'counting' ? walkMeter(walk) : (here?.meter ?? face)}
        icon={walk ? WALK_ICON : here?.icon}
        searching={!walk && here?.searching}
        action={action}
        alt={here && action === here.action && here.alt !== here.action ? here.alt : undefined}
      />
      {/* Loc's bubble keeps under the space held for the moon, so it never reaches the button. */}
      <LocCue mood={mood} wary={mind.wary} moment={moment} floor={tabInset + moonArc} />
      {here?.keepAwake ? <StayAwake /> : null}
      {pushups?.camera}
      {mock ? <MockBar label={mock.label} top={insets.top + Space.l + 148} /> : null}
    </View>
  );
  // Dev only: a made-up state's list is a swipe up away.
  return mock ? <MockSwipe>{screen}</MockSwipe> : screen;
}

/** How long after the wake-up Home keeps showing it (`done`), in milliseconds. */
const DONE_FOR = 3 * 3_600_000;
/** The done look's line: what got them up. */
const DONE_WORDS: Record<WakeMethod, string> = {
  downstairs: 'Down the stairs',
  steps: 'Steps walked',
  scan: 'Code scanned',
  place: 'Out the door',
  pushups: 'Push-ups done',
};

const WALK_ICON = { ios: 'figure.walk', android: 'directions_walk' };

/** A wake-up older than this, found on opening the app, gets Home's done look but no payoff. */
const PAYOFF_FOR = 15 * 60_000;
/** The morning key whose payoff was last shown: each morning's opens once. */
const PAYOFF_KEY = 'locturne.payoffShown';

/**
 * Opens the morning payoff (/morning-won) once per morning, as soon as Home is on top after a
 * real wake-up (not a pass): straight away for a walk or the stairs on Home, after the camera
 * closes for a scan or push-ups. Loc's wake-up line on Home counts as said: the payoff is the moment.
 */
function usePayoff(proof: MorningProof | null, live: boolean) {
  const focused = useIsFocused();
  const won = !!proof && proof.kind !== 'pass' && proof.kind !== 'emergency';
  const key = won ? proof.morningKey : null;
  const at = won ? proof.at : 0;
  useEffect(() => {
    if (!live || !focused || !key || Date.now() - at > PAYOFF_FOR || sharedGet<string>(PAYOFF_KEY) === key) return;
    sharedSet(PAYOFF_KEY, key);
    markLocSaid(`woke:${key}`);
    router.push('/morning-won');
  }, [live, focused, key, at]);
}

/** The pretend morning's win last opened (its `won.at`): each opens the payoff once. */
let pretendShown = 0;

/**
 * Dev: a pretend morning won in the wake preview records nothing, so `usePayoff` never sees
 * it. Opens the payoff with made-up facts for the method that won, the time now and the real
 * count plus this one.
 */
function usePretendPayoff(live: boolean) {
  const focused = useIsFocused();
  const { won } = useWakePreview();
  useEffect(() => {
    if (!live || !focused || !won || pretendShown === won.at) return;
    pretendShown = won.at;
    const at = new Date(won.at);
    const upAt = at.getHours() * 60 + at.getMinutes();
    // A pretend morning runs at any hour: past three hours after the real morning start, call it on time.
    const start = routineAt(at).morningStart;
    router.push({
      pathname: '/morning-won',
      params: {
        demo: '1',
        method: won.method,
        at: String(upAt),
        start: String(upAt >= start && upAt - start <= 180 ? start : upAt),
        mornings: String(getMorningsWon() + 1),
      },
    });
  }, [live, focused, won]);
}

/** The phone is in hand on the stairs; don't let it lock mid-session. */
function StayAwake() {
  useKeepAwake();
  return null;
}

/** Apple's sheet (cancel, or switch plans); its web page where there's no sheet. Same as the You tab. */
function manageTrial() {
  const page = () => Linking.openURL('https://apps.apple.com/account/subscriptions').catch(() => {});
  manageSubscriptions()
    .then((shown) => (shown ? null : page()))
    .catch(page);
}

/** Night and morning; the day is `dayHero`, a night off `offHero`. */
function heroFor(phase: string, wake: string) {
  switch (phase) {
    case 'night':
      return { title: 'Your apps are asleep', body: `They wake at ${wake}, once you're up and moving. Phone down.` };
    default:
      return { title: 'Time to get up', body: 'Your apps stay asleep until you get out of bed.' };
  }
}

/** The morning walk on Home: the count is the hero (`walkMeter`), with no Loc line under it. */
function walkHero(walk: MorningWalk) {
  if (walk.kind === 'denied')
    return {
      title: "I can't hear you walking",
      body: 'Motion & Fitness is off for Locturne, so I can’t count your steps. Turn it on in Settings, under Privacy & Security.',
    };
  if (walk.kind !== 'counting')
    return {
      title: "I can't count steps on this",
      body: 'Steps need the iPhone’s motion sensor, and this device doesn’t have one I can read.',
    };
  const left = walk.goal - (walk.steps ?? 0);
  return {
    title: `${walk.steps ?? 0} of ${walk.goal} steps`,
    body: left > 0 ? `${left} more and your apps wake up.` : 'That will do.',
  };
}

function walkMeter(walk: Extract<MorningWalk, { kind: 'counting' }>) {
  return {
    value: walk.steps === null ? '–' : String(walk.steps),
    caption: `of ${walk.goal} steps`,
    progress: walk.goal > 0 ? (walk.steps ?? 0) / walk.goal : 1,
  };
}

/** After a night pass: awake tonight, and when they sleep again. */
function pausedHero(words: PauseWords) {
  const back = words.resumes ? clockAt(words.resumes) : null;
  return {
    title: 'Awake tonight',
    body: !back && words.ended
      ? `Pass used: your apps are awake tonight and ${words.morning}. There’s no subscription, so nothing sleeps after that.`
      : !back && words.noApps
      ? `Pass used: your apps are awake tonight and ${words.morning}. No bedtime apps are picked, so nothing sleeps after that.`
      : !back
      ? `Pass used: your apps are awake tonight and ${words.morning}. Every night is switched off, so they stay awake.`
      : `Pass used: your apps are awake tonight and ${words.morning}. They sleep again at ${words.weekday ? `${back} on ${words.weekday}` : back}.`,
  };
}

const clockAt = (date: Date) => clockLabel(date.getHours() * 60 + date.getMinutes());

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: Gap.gutter },
});
