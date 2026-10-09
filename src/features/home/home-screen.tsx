'use no memo';
// Reads the App Group stores during render (the morning proofs), which change outside
// React, so the React Compiler stays out of here.

import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Linking, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTabBarInset } from '@/components/app-tabs';
import { useHealth } from '@/hooks/use-health';
import { getNightPause, heldPhase, pauseWording } from '@/lib/emergency';
import { nextBedtime } from '@/lib/lock-controller';
import { getProofs } from '@/lib/morning-proof';
import { nextNightOn } from '@/lib/routine';
import { methodInUse } from '@/lib/scan-code';
import { clockLabel } from '@/lib/shield-copy';
import { Gap, Space } from '@/theme';

import { HomeContent } from './home-content';
import { duration, useMinute } from './night-meter';
import { useReviewPrompt } from './review-prompt';
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
  // Bumped each time Home opens, so today's screen time redraws.
  const [visit, setVisit] = useState(0);
  useFocusEffect(useCallback(() => setVisit((v) => v + 1), []));

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
  // subtract (HOME_10.md #7). The store keeps the last 30 proofs, so a lifetime count still
  // needs its own counter.
  const won = new Set(getProofs().filter((p) => p.kind !== 'pass' && p.kind !== 'emergency').map((p) => p.morningKey));
  // MOCK (dev only, remove when done looking): every day this week counts as got up, so the
  // week strip shows the mist dots without real mornings.
  if (MOCK_WEEK) for (const day of weekDays(lock.morningKey, won)) won.add(day.key);
  const mornings = won.size;
  // The next night that will really sleep: not `lock.nextChange`, which is the end of the
  // window during an unheld night, and the start of a night that's switched off by day.
  const next = nextNightOn(pause ?? nextBedtime(now), now);
  const sleepsAt = next && pause && next < pause ? pause : next;
  const target = phase === 'day' ? sleepsAt : lock.nextChange;
  const minutes = target ? Math.round((target.getTime() - now.getTime()) / 60_000) : null;

  const hero = unprotected
    ? { title: health.title, body: health.detail }
    : pause && lock.phase === 'night'
      ? pausedHero(pause, now)
      : heroFor(phase, minutes === null ? null : duration(minutes), sleepsAt, clockLabel(routine.morningStart));
  const action = unprotected
    ? health.protection === 'notSetUp'
      ? { label: 'Set up Screen Time', onPress: () => router.push('/apps') }
      : { label: 'Open Settings', onPress: () => Linking.openSettings() }
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

function heroFor(phase: string, until: string | null, sleepsAt: Date | null, wake: string) {
  switch (phase) {
    case 'night':
      return { title: 'Your apps are asleep', body: `They wake at ${wake}, once you're up and moving. Phone down.` };
    case 'morning':
      return { title: 'Time to get up', body: 'Your apps stay asleep until you get out of bed.' };
    case 'off':
      return { title: 'Night off', body: "Nothing sleeps tonight. I'm sleeping anyway." };
    default:
      if (!sleepsAt || !until) return { title: 'No bedtime scheduled', body: 'Every night is switched off, so nothing sleeps.' };
      return { title: `Bedtime in ${until}`, body: `Your apps go to sleep at ${clockAt(sleepsAt)}. Start winding down before then.` };
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
