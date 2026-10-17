import { useEffect, useSyncExternalStore } from 'react';

import { attitude, onExit, onMorning, onSmallHours, onVisit, readMind, writeMind, type Mind } from '@/lib/loc-mind';
import type { Phase } from '@/lib/lock-state';
import type { MorningProof } from '@/lib/morning-proof';
import type { Tone } from '@/lib/tone';

import type { LocMoment, MomentKind } from './loc-lines';

/** Mornings where you go up a stage with him, and what he calls it. */
const STAGE_UP: Record<number, MomentKind> = { 7: 'roommate', 30: 'accomplice', 100: 'rideOrDie' };

// The mind as Home last saw it, shared with whatever shows it (the You tab), so a change shows
// everywhere at once without re-reading storage on every render.
let cached: Mind | null = null;
const listeners = new Set<() => void>();
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => void listeners.delete(l);
};
const snapshot = () => (cached ??= readMind());
/** Saves `mind` and tells everyone showing it. */
export function commitMind(mind: Mind) {
  writeMind(mind);
  cached = mind;
  listeners.forEach((l) => l());
}
/** The mind, kept up to date. */
export const useMind = () => useSyncExternalStore(subscribe, snapshot, snapshot);

type Input = {
  /** A made-up state (the app-states lab): nothing is recorded, and keys get this in front. */
  sayKey: string;
  phase: Phase;
  morningKey: string;
  todayKey: string;
  proof: MorningProof | null;
  mornings: number;
  now: Date;
  /** Bumps each time Home is opened (use-visit). */
  visit: number;
  /** Home is the screen showing: the app coming back on another tab isn't a visit to him. */
  focused: boolean;
  tone: Tone;
};

/**
 * What Loc remembers about you (lib/loc-mind.ts), brought up to date as Home sees things happen:
 * a morning proved, a pass or emergency, Home opened in the small hours or after days away.
 * Returns how that colours him (`proud`, `wary`) and the remembered moment he has to say, if any.
 * A made-up state records nothing.
 */
export function useLocMind({ sayKey, phase, morningKey, todayKey, proof, mornings, now, visit, focused, tone }: Input) {
  const mind = useMind();
  const real = sayKey === '';
  const hour = now.getHours();
  const proofKey = proof ? `${proof.kind}:${proof.morningKey}` : '';

  useEffect(() => {
    if (!real || !focused) return;
    let next = readMind();
    next = onVisit(next, Date.now(), todayKey);
    commitMind(next);
    // Once per visit to Home.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [real, visit, focused]);

  useEffect(() => {
    if (!real) return;
    let next = readMind();
    if (proof) next = proof.kind === 'pass' || proof.kind === 'emergency' ? onExit(next, proof.morningKey) : onMorning(next, proof.morningKey);
    commitMind(next);
    // proofKey stands in for `proof`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [real, proofKey]);

  // Home open in the small hours, on Home itself (once an hour, `onSmallHours`).
  useEffect(() => {
    if (!real || !focused || phase !== 'night') return;
    commitMind(onSmallHours(readMind(), morningKey, hour));
  }, [real, focused, phase, morningKey, hour, visit]);

  const { proud, wary } = attitude(mind, tone);
  let moment: LocMoment | null = null;
  const exit = proof && (proof.kind === 'pass' || proof.kind === 'emergency');
  if (phase === 'day' && proof && !exit) {
    // The morning's own news: a first, a new stage, or (once he respects you) a grudging line.
    const stage = STAGE_UP[mornings];
    if (mornings === 1) moment = { kind: 'firstMorning', key: `${sayKey}mind:first` };
    else if (stage) moment = { kind: stage, key: `${sayKey}mind:stage:${mornings}` };
    else if (proud) moment = { kind: 'wakeProud', key: `${sayKey}woke:${proof.morningKey}` };
  } else if (phase === 'day' && exit) {
    moment = { kind: 'exitAfter', key: `${sayKey}mind:exit:${proof.morningKey}` };
  }
  if (!moment && mind.back === todayKey) moment = { kind: 'welcomeBack', key: `${sayKey}mind:back:${todayKey}` };
  if (!moment && phase === 'night' && hour >= 1 && hour < 5) moment = { kind: 'smallHours', key: `${sayKey}mind:late:${morningKey}` };

  return { mind, proud, wary, moment };
}
