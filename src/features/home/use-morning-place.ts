import { useState } from 'react';
import { Linking } from 'react-native';

import * as haptic from '@/lib/haptics';
import { readLock } from '@/lib/lock-controller';
import { distanceMeters, PLACE_RADIUS_M, submitPlaceFix, type MorningPlace } from '@/lib/place';

import { shownPlace } from '../dev/wake-lab/stand-ins';
import { pretendPhase } from '../dev/wake-lab/wake-preview';
import { readFix } from '../place/locate';
import { pretendCheck } from '../place/place-screen';
import { formatDistance, placeWords, settingsCanFix, type Stage } from '../place/place-stage';
import { usesMiles } from '../place/units';
import { useLiveFix } from '../place/use-live-fix';
import { nextLockedMorning } from '../scan/next-locked-morning';
import { announceWoke } from '../wake/use-prove-morning';
import type { HomeMorning } from './home-content';
import { orWalk, OTHER_WAYS } from './morning';
import type { MorningWalk } from './use-morning-walk';

/** The morning's own stages of the place flow (place-stage.ts). */
type Check = Extract<Stage, { kind: 'morning' | 'checking' | 'notThere' | 'unsure' | 'noFix' }>;

/**
 * Home's morning when the wake-up is "leave the house" (docs/HOME_INTERACTIVE.md): how far is
 * left to the place, live, and Check in right on Home. One location read decides it, as on the
 * place screen (`submitPlaceFix`); the live distance is only for show. No map: a distance does
 * the job here. Null while `enabled` is false. `walk` is the steps fallback, counted underneath.
 */
export function useMorningPlace(enabled: boolean, walk: MorningWalk | null, stepGoal: number): HomeMorning | null {
  const [stage, setStage] = useState<Check>({ kind: 'morning' });
  // A fresh morning starts clean, not on yesterday's "not there yet". Reset during render, as
  // use-step-count.ts does.
  const [wasEnabled, setWasEnabled] = useState(enabled);
  if (wasEnabled !== enabled) {
    setWasEnabled(enabled);
    if (!enabled) setStage({ kind: 'morning' });
  }
  const you = useLiveFix(enabled, stage.kind);

  if (!enabled) return null;
  // The wake preview's pretend morning can stand in a place, and its check-in records nothing.
  const place = shownPlace();
  if (!place) return null;

  const onCheckIn = async () => {
    setStage({ kind: 'checking' });
    const located = await readFix();
    if (!located.ok) {
      haptic.thud();
      setStage({ kind: 'noFix', why: located.why });
      return;
    }
    const pretend = pretendPhase() !== null;
    const result = pretend ? pretendCheck(located.fix) : submitPlaceFix(located.fix);
    // Home turns to day by itself (the lock changed); notMorning and noPlace leave this hero too.
    if (result.kind === 'unlocked') {
      if (pretend) haptic.done();
      else announceWoke(readLock());
    }
    else if (result.kind === 'notThere') {
      haptic.thud();
      setStage({ kind: 'notThere', distance: result.distance });
    } else if (result.kind === 'unsure') {
      haptic.thud();
      setStage({ kind: 'unsure' });
    } else setStage({ kind: 'morning' });
  };

  const now = new Date();
  const imperial = usesMiles();
  const { line, body } = placeWords(stage, {
    place: place.name,
    awake: '',
    next: nextLockedMorning(now),
    morningStart: '',
    stepGoal,
    imperial,
    now,
  });
  const away = you ? distanceMeters(you, place) : null;
  const here = away !== null && away <= PLACE_RADIUS_M;
  // The live distance is right above, so a miss doesn't repeat the check-in's older one.
  const said = stage.kind === 'notThere' && away !== null ? 'Not there yet. Keep going, then try again.' : body;
  // Those that can't check in at all already offer the walk.
  const offersWalk = stage.kind === 'noFix' && stage.why !== 'failed' && stage.why !== 'vague';

  return {
    icon: { ios: 'location.fill', android: 'location_on' },
    hero: { title: titleFor(stage, place, away, imperial), body: here && stage.kind === 'morning' ? 'Tap Check in.' : `${said}${offersWalk ? '' : orWalk(walk)}`, aside: line },
    meter: away !== null && away > PLACE_RADIUS_M ? { value: formatDistance(away - PLACE_RADIUS_M, imperial), caption: `to ${place.name}` } : undefined,
    action:
      stage.kind === 'noFix' && settingsCanFix(stage.why)
        ? { label: 'Open Settings', onPress: () => Linking.openSettings() }
        : stage.kind === 'checking'
          ? { label: 'Checking…', onPress: () => {} }
          : { label: stage.kind === 'morning' ? 'Check in' : 'Try again', onPress: () => void onCheckIn() },
    alt: OTHER_WAYS,
  };
}

/** The headline, and the meter's VoiceOver label while it shows. */
function titleFor(stage: Check, place: MorningPlace, away: number | null, imperial: boolean): string {
  if (away !== null && away <= PLACE_RADIUS_M) return 'You’re here';
  if (away !== null) return `${formatDistance(away - PLACE_RADIUS_M, imperial)} to ${place.name}`;
  if (stage.kind === 'checking') return 'Looking';
  return `Get to ${place.name}`;
}
