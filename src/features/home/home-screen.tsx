'use no memo';
// Reads the App Group stores during render (the morning proofs), which change outside
// React, so the React Compiler stays out of here.

import { router } from 'expo-router';
import { Linking, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTabBarInset } from '@/components/app-tabs';
import { useHealth } from '@/hooks/use-health';
import { getNightPause, heldPhase, pauseWording } from '@/lib/emergency';
import { lapseStillCovers, nextBedtime, subscriptionEnded } from '@/lib/lock-controller';
import { dateKey } from '@/lib/lock-state';
import { getMorningsWon, getProofs } from '@/lib/morning-proof';
import { getTrialEnd } from '@/lib/notifications';
import { manageSubscriptions } from '@/lib/purchases';
import { nextNightOn, nightAt } from '@/lib/routine';
import { methodInUse } from '@/lib/scan-code';
import { isScreenTimeAvailable, isStoodDown, nightLockArmed, selectionSize } from '@/lib/screen-time';
import { clockLabel } from '@/lib/shield-copy';
import { trialNotice } from '@/lib/trial-notice';
import { Gap, Space } from '@/theme';

import { awakeLine, dayHero, napHero, offHero, trialHero } from './awake-line';
import { HomeContent } from './home-content';
import { duration, useMinute } from './night-meter';
import { useReviewPrompt } from './review-prompt';
import { useVisit } from './use-visit';
import { useHomeState } from './use-home-state';
import { weekDays } from './week';

/** Dev only: fill the whole week with won days to preview the mist. */
const MOCK_WEEK = __DEV__;

/**
 * Home, mocked up after Oura's "Bedtime's approaching" (docs/design-references/home-moon,
 * 01-oura-bedtime): the moon is the floor of the screen, so everything lives in the sky
 * above it. The top (home-top) holds the mornings count,
 * today's screen time and this week's dots (option B in the README); then one centred headline,
 * one sentence and one quiet button. Nothing sits over the moon.
 */

const MORNING_ACTION = { downstairs: 'Go downstairs', steps: 'Start walking', scan: 'Scan my code' } as const;

export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const tabInset = useTabBarInset();
  const { width } = useWindowDimensions();
  const { lock, routine, proof } = useHomeState();
  useReviewPrompt(lock, proof);
  const now = useMinute();
  // Bumped each time Home opens, the app returns to the foreground or the day rolls over, so
  // today's screen time redraws.
  const visit = useVisit(dateKey(now));

  // Honest status (health.ts): access off or never given replaces everything. Also keeps the
  // notifications in line when protection changes while Home is open.
  const [health] = useHealth();
  const unprotected = health.protection === 'off' || health.protection === 'notSetUp';
  // An emergency unlock paused tonight: the windows still run, so the clock says night.
  const pause = getNightPause(now);
  // Nothing is asleep on a night that isn't held (never bought, stood down, arming failed,
  // paused, or past a lapse's last paid night), so `heldPhase` reads it as day.
  const phase = heldPhase(lock.phase, now);
  const method = methodInUse(routine.method);
  // Mornings you got up: a wake-up method's proof. Passes and emergencies neither count nor
  // subtract (HOME_10.md #7). The store keeps the last 30 proofs, enough for this week's dots;
  // the lifetime count is its own counter (`getMorningsWon`).
  const won = new Set(getProofs().filter((p) => p.kind !== 'pass' && p.kind !== 'emergency').map((p) => p.morningKey));
  // MOCK (dev only, remove when done looking): every day this week counts as got up, so the
  // week strip shows the mist dots without real mornings.
  if (MOCK_WEEK) for (const day of weekDays(lock.morningKey, won)) won.add(day.key);
  const mornings = MOCK_WEEK ? Math.max(getMorningsWon(), won.size) : getMorningsWon();
  // The next night that will really sleep: not `lock.nextChange`, which is the end of the
  // window during an unheld night, and the start of a night that's switched off by day.
  const next = nextNightOn(pause ?? nextBedtime(now), now);
  const sleepsAt = next && pause && next < pause ? pause : next;
  const target = phase === 'day' ? sleepsAt : lock.nextChange;
  const minutes = target ? Math.round((target.getTime() - now.getTime()) / 60_000) : null;
  // Tonight switched off: `sleepsAt` is a later night's bedtime, so say tonight is off and
  // name that night's weekday rather than count down as if it were tonight's. A pause still
  // pending by day (the day after a night-time emergency) doesn't change that; only the paused
  // night itself has its own hero.
  const offTonight =
    !(pause && lock.phase === 'night') && sleepsAt && !nightAt(nextBedtime(now), now).on ? sleepsAt.toLocaleDateString('en-US', { weekday: 'long' }) : null;

  // By day (or a night nothing holds), never name a bedtime that won't lock: no subscription,
  // Ask to Buy waiting, arming failed or a lapse say so instead, and offer the plans when
  // that's the fix.
  const paused = !!pause && lock.phase === 'night';
  const attention = !unprotected && !paused && phase === 'day' && health.level === 'attention';
  const armed = nightLockArmed();
  const stoodDown = isStoodDown() || (subscriptionEnded() && lapseStillCovers(now) === null);
  // A Block now running by day, on a night off or on a night an emergency paused is what's
  // asleep, so it leads over the countdown to bedtime and the paused night's "Awake tonight"
  // (a status that needs attention still comes first).
  const napping = !attention && lock.blockNowUntil && lock.blockNowUntil > now ? lock.blockNowUntil : null;
  const alwaysSleeps = !isScreenTimeAvailable() || selectionSize('always') > 0;
  // The trial's last days (B4): the paywall's "I remind you", kept even without notifications.
  // Leads by day, behind anything that needs fixing.
  const trial = !unprotected && !attention && !paused && phase === 'day' ? trialNotice(getTrialEnd(), now) : null;
  const hero = unprotected
    ? { title: health.title, body: health.detail }
    : pause && lock.phase === 'night' && !napping
      ? pausedHero(pause, now)
      : trial
        ? trialHero(trial)
        : (phase === 'day' || phase === 'off') && napping
        ? napHero(clockAt(napping))
        : phase === 'off'
        ? offHero(alwaysSleeps && !stoodDown)
        : phase === 'day'
          ? dayHero({
              attention: attention ? health : null,
              scheduled: armed && !stoodDown,
              line: awakeLine({
                armed,
                stoodDown,
                tonightAt: sleepsAt && !offTonight ? clockAt(sleepsAt) : null,
                alwaysSleeps,
              }),
              until: minutes === null ? null : duration(minutes),
              sleepsAt: sleepsAt ? clockAt(sleepsAt) : null,
              offTonight,
              alwaysSleeps: alwaysSleeps && !stoodDown,
            })
          : heroFor(phase, clockLabel(routine.morningStart));
  const action = unprotected
    ? health.protection === 'notSetUp'
      ? { label: 'Set up Screen Time', onPress: () => router.push('/apps') }
      : { label: 'Open Settings', onPress: () => Linking.openSettings() }
    : attention && health.needsSubscription
      ? { label: 'See plans', onPress: () => router.push('/onboarding?resume=paywall') }
      : trial
        ? { label: 'Manage subscription', onPress: manageTrial }
        : phase === 'morning'
          ? { label: MORNING_ACTION[method], onPress: () => router.push({ pathname: '/wake', params: { method } }) }
          : { label: 'Edit schedule', onPress: () => router.push('/routine') };

  // How much of the resting moon pokes above the panel's edge (night-sky.tsx): keep clear of it.
  const moonArc = width * 0.9 * 0.36;

  return (
    <View style={[styles.container, { paddingTop: insets.top + Space.l, paddingBottom: tabInset + moonArc }]}>
      <HomeContent
        mornings={mornings}
        today={lock.morningKey}
        won={won}
        revision={visit}
        hero={hero}
        heroKey={minutes ?? 0}
        action={action}
      />
    </View>
  );
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

/** After an emergency unlock: awake tonight, and when they sleep again. */
function pausedHero(pause: Date, now: Date) {
  const words = pauseWording(pause, now);
  const back = words.resumes ? clockAt(words.resumes) : null;
  return {
    title: 'Awake tonight',
    body: !back
      ? `Emergency unlock: your apps are awake tonight and ${words.morning}. Every night is switched off, so they stay awake.`
      : `Emergency unlock: your apps are awake tonight and ${words.morning}. They sleep again at ${words.weekday ? `${back} on ${words.weekday}` : back}.`,
  };
}

const clockAt = (date: Date) => clockLabel(date.getHours() * 60 + date.getMinutes());

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: Gap.gutter },
});
