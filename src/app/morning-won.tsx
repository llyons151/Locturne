'use no memo';
// Reads the App Group stores during render (the proofs, the routine), which change outside
// React, so the React Compiler stays out of here.

import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useLayoutEffect } from 'react';
import { Platform } from 'react-native';

import { LeaveRoute } from '@/components/leave-route';
import { settleMoons, unpresented } from '@/features/moons/moon-collection';
import { MOONS } from '@/features/moons/moon-data';
import { markPayoffShown, wonProof } from '@/features/wake/open-payoff';
import { PayoffLab } from '@/features/wake/payoff-lab';
import { PayoffScreen, type PayoffFacts } from '@/features/wake/payoff-screen';
import { revealApp } from '@/lib/launch-splash';
import { currentProof, routineAt } from '@/lib/lock-controller';
import { dateKey } from '@/lib/lock-state';
import { weekDays } from '@/features/home/week';
import { getMorningsWon, getProofs, type MorningProof } from '@/lib/morning-proof';
import { getRoutineChange, isWakeMethod, nightWasOn } from '@/lib/routine';

/**
 * The morning payoff, after a wake-up wakes the apps (features/wake/payoff-screen.tsx). Home
 * opens it once per morning. `?demo=1` (the wake preview, dev) shows made-up facts instead:
 * `method`, `at`, `start` and `earliest` (minutes since midnight; `earliest` defaults to `at`,
 * today the week's earliest), `mornings`, `week` (days got up so far this week, today included; all of them by default),
 * `newMoon` (a new moon's id).
 */
export default function MorningWonRoute() {
  const params = useLocalSearchParams<Record<string, string>>();
  // Made-up facts only where the dev labs are: a release deep link can't fake a morning.
  const labs = __DEV__ || process.env.EXPO_PUBLIC_DEV_LABS === '1';
  // Opened straight from a link (the browser preview), there's no Home under it to hand back
  // to, so Done would load Home from cold. Open Home first, then the payoff over it, as in the app.
  const cold = !!params.demo && labs && !params.over && !router.canGoBack();
  useEffect(() => {
    if (!cold) return;
    // `demo` rides along so Home's launch doesn't send a fresh browser to onboarding (use-app-start.ts).
    router.replace({ pathname: '/', params: { demo: '1' } });
    // Not cleared: replacing unmounts this route before the push.
    setTimeout(() => router.push({ pathname: '/morning-won', params: { ...params, over: '1' } }), OVER_HOME_MS);
    // Once, on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const demo = !!params.demo && labs;
  const facts = cold ? null : demo ? demoFacts(params) : realFacts(params.key);
  // A real morning's payoff counts as shown once it's up, not when Home asked for it (open-payoff.ts).
  const shownKey = !demo && facts ? facts.today : null;
  useEffect(() => {
    if (shownKey) markPayoffShown(shownKey);
  }, [shownKey]);
  // Opened at launch under the launch screen (`openDuePayoff`): lift it now the payoff is drawn.
  // A no-op once the app is showing (revealApp runs once).
  useLayoutEffect(() => {
    if (!cold) revealApp();
  }, [cold]);
  if (cold) return null;
  // Back to the tabs already open: a `<Redirect>` would stack a second Home.
  if (!facts) return <LeaveRoute />;
  // `cut`: taking a camera's place, with no fade in (open-payoff.ts).
  // `lab=1` (browser, made-up facts): the entrance's timings on sliders, with a Replay (payoff-lab.web.tsx).
  const lab = demo && params.lab === '1' && Platform.OS === 'web';
  const cut = params.cut === '1';
  if (!lab) return <PayoffScreen facts={facts} cut={cut} />;
  return (
    <>
      <PayoffScreen facts={facts} cut={cut} fadeIn={!cut} />
      <PayoffLab params={params} />
    </>
  );
}

/** Home's own entrance finishes before the payoff goes over it. */
const OVER_HOME_MS = 1500;

/** `key`: the morning Home opened it for (open-payoff.ts), maybe an earlier one; else this morning's. */
function realFacts(key?: string): PayoffFacts | null {
  const proof = key ? wonProof(key) : currentProof(new Date());
  // That morning's own clock: its routine and week, not today's, when it's opened a day or more later.
  const now = proof ? new Date(proof.at) : new Date();
  if (!proof || proof.kind === 'pass' || proof.kind === 'emergency') return null;
  const at = new Date(proof.at);
  const ups = getProofs().filter((p) => p.kind !== 'pass' && p.kind !== 'emergency');
  // Any moon this morning brought (features/moons); earning is safe to repeat.
  settleMoons();
  return {
    method: proof.kind,
    upAt: at.getHours() * 60 + at.getMinutes(),
    start: routineAt(now).morningStart,
    mornings: Math.max(1, getMorningsWon()),
    today: proof.morningKey,
    won: new Set(ups.map((p) => p.morningKey)),
    earliest: earliestThisWeek(ups, proof.morningKey, at.getHours() * 60 + at.getMinutes()),
    free: freeThisWeek(proof.morningKey, new Set(ups.map((p) => p.morningKey)), now),
    sayKey: '',
    newMoons: unpresented(proof.morningKey).map((m) => m.id),
  };
}


function demoFacts(p: Record<string, string>): PayoffFacts {
  const today = new Date();
  const num = (value: string | undefined, fallback: number) => (value && Number.isFinite(Number(value)) ? Number(value) : fallback);
  // The last `week` days up to today, within this week (Sunday first).
  // Every day so far by default, as Home's dev week (home-screen.tsx MOCK_WEEK), so the two
  // weeks match when the payoff's lands on Home's.
  const week = Math.min(num(p.week, 7), today.getDay() + 1);
  const won = new Set<string>();
  for (let i = 0; i < week; i++) won.add(dateKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() - i)));
  return {
    method: isWakeMethod(p.method) ? p.method : 'steps',
    upAt: num(p.at, 7 * 60 + 6),
    start: num(p.start, 7 * 60),
    mornings: Math.max(1, num(p.mornings, 12)),
    today: dateKey(today),
    won,
    earliest: Math.min(num(p.at, 7 * 60 + 6), num(p.earliest, num(p.at, 7 * 60 + 6))),
    free: new Set(),
    sayKey: null,
    // `newMoon=<id>`: a made-up new moon (the wake preview). Not `moon`, which the web uses to wear one.
    newMoons: p.newMoon && MOONS.some((m) => m.id === p.newMoon) ? [p.newMoon] : [],
  };
}

/** The earliest of this week's wake-ups (Sunday first, as the week strip), this morning's included. */
function earliestThisWeek(ups: MorningProof[], today: string, upAt: number): number {
  const week = new Set(weekDays(today, new Set()).map((d) => d.key));
  return ups
    .filter((p) => week.has(p.morningKey))
    .reduce((min, p) => {
      const d = new Date(p.at);
      return Math.min(min, d.getHours() * 60 + d.getMinutes());
    }, upAt);
}

/** This week's past mornings no night locked, as Home works them out (home-screen.tsx), so the payoff's week matches Home's. */
function freeThisWeek(today: string, won: Set<string>, now: Date): Set<string> {
  const routine = routineAt(now);
  const change = getRoutineChange(now);
  return new Set(
    weekDays(today, won)
      .filter((day) => day.key < today && !day.done && !nightWasOn(day.key, routine, change))
      .map((day) => day.key),
  );
}
