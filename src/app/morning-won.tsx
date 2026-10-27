'use no memo';
// Reads the App Group stores during render (the proofs, the routine), which change outside
// React, so the React Compiler stays out of here.

import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

import { LeaveRoute } from '@/components/leave-route';
import { PayoffScreen, type PayoffFacts } from '@/features/wake/payoff-screen';
import { currentProof, routineAt } from '@/lib/lock-controller';
import { dateKey } from '@/lib/lock-state';
import { weekDays } from '@/features/home/week';
import { getMorningsWon, getProofs, type MorningProof } from '@/lib/morning-proof';
import type { WakeMethod } from '@/lib/routine';

/**
 * The morning payoff, after a wake-up wakes the apps (features/wake/payoff-screen.tsx). Home
 * opens it once per morning. `?demo=1` (the wake preview, dev) shows made-up facts instead:
 * `method`, `at`, `start` and `earliest` (minutes since midnight), `mornings`, `week` (days got
 * up so far this week, today included).
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
  const facts = cold ? null : params.demo && labs ? demoFacts(params) : realFacts();
  if (cold) return null;
  // Back to the tabs already open: a `<Redirect>` would stack a second Home.
  if (!facts) return <LeaveRoute />;
  return <PayoffScreen facts={facts} />;
}

/** Home's own entrance finishes before the payoff goes over it. */
const OVER_HOME_MS = 1500;

function realFacts(): PayoffFacts | null {
  const now = new Date();
  const proof = currentProof(now);
  if (!proof || proof.kind === 'pass' || proof.kind === 'emergency') return null;
  const at = new Date(proof.at);
  const ups = getProofs().filter((p) => p.kind !== 'pass' && p.kind !== 'emergency');
  return {
    method: proof.kind,
    upAt: at.getHours() * 60 + at.getMinutes(),
    start: routineAt(now).morningStart,
    mornings: Math.max(1, getMorningsWon()),
    today: proof.morningKey,
    won: new Set(ups.map((p) => p.morningKey)),
    earliest: earliestThisWeek(ups, proof.morningKey, at.getHours() * 60 + at.getMinutes()),
    sayKey: '',
  };
}

const METHODS: readonly WakeMethod[] = ['downstairs', 'steps', 'scan', 'place', 'pushups'];
const isWakeMethod = (value: unknown): value is WakeMethod => METHODS.includes(value as WakeMethod);

function demoFacts(p: Record<string, string>): PayoffFacts {
  const today = new Date();
  const num = (value: string | undefined, fallback: number) => (value && Number.isFinite(Number(value)) ? Number(value) : fallback);
  // The last `week` days up to today, within this week (Sunday first).
  const week = Math.min(num(p.week, 3), today.getDay() + 1);
  const won = new Set<string>();
  for (let i = 0; i < week; i++) won.add(dateKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() - i)));
  return {
    method: isWakeMethod(p.method) ? p.method : 'steps',
    upAt: num(p.at, 7 * 60 + 6),
    start: num(p.start, 7 * 60),
    mornings: Math.max(1, num(p.mornings, 12)),
    today: dateKey(today),
    won,
    earliest: Math.min(num(p.at, 7 * 60 + 6), num(p.earliest, 6 * 60 + 52)),
    sayKey: null,
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
