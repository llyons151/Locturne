'use no memo';
// Reads the App Group stores during render (the proofs, the routine), which change outside
// React, so the React Compiler stays out of here.

import { Redirect, useLocalSearchParams } from 'expo-router';

import { PayoffScreen, type PayoffFacts } from '@/features/wake/payoff-screen';
import { currentProof, routineAt } from '@/lib/lock-controller';
import { dateKey } from '@/lib/lock-state';
import { getMorningsWon, getProofs } from '@/lib/morning-proof';
import type { WakeMethod } from '@/lib/routine';

/**
 * The morning payoff, after a wake-up wakes the apps (features/wake/payoff-screen.tsx). Home
 * opens it once per morning. `?demo=1` (the wake preview, dev) shows made-up facts instead:
 * `method`, `at` and `start` (minutes since midnight), `mornings`, `week` (days got up so far
 * this week, today included).
 */
export default function MorningWonRoute() {
  const params = useLocalSearchParams<Record<string, string>>();
  const facts = params.demo ? demoFacts(params) : realFacts();
  if (!facts) return <Redirect href="/" />;
  return <PayoffScreen facts={facts} />;
}

function realFacts(): PayoffFacts | null {
  const now = new Date();
  const proof = currentProof(now);
  if (!proof || proof.kind === 'pass' || proof.kind === 'emergency') return null;
  const at = new Date(proof.at);
  return {
    method: proof.kind,
    upAt: at.getHours() * 60 + at.getMinutes(),
    start: routineAt(now).morningStart,
    mornings: Math.max(1, getMorningsWon()),
    today: proof.morningKey,
    won: new Set(getProofs().filter((p) => p.kind !== 'pass' && p.kind !== 'emergency').map((p) => p.morningKey)),
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
  };
}
