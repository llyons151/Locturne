import { useEffect, useState } from 'react';
import { AppState, Linking } from 'react-native';

import * as haptic from '@/lib/haptics';
import { readLock } from '@/lib/lock-controller';
import { distanceMeters, PLACE_RADIUS_M, sharpFix, submitPlaceFix, type MorningPlace } from '@/lib/place';

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
import { WALK_INSTEAD } from './morning';
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
  // Back from Settings (location turned on, or Precise Location): start over, so Check in and
  // the live distance come back instead of Open Settings for the rest of the morning.
  const stuck = stage.kind === 'noFix';
  useEffect(() => {
    if (!stuck) return;
    // Only after the background (a trip to Settings): the location alert itself only makes the
    // app inactive for a moment.
    let away = false;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background') away = true;
      else if (state === 'active' && away) setStage({ kind: 'morning' });
    });
    return () => sub.remove();
  }, [stuck]);

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

  // Only a fix sharp enough for Check in to say yes: a fuzzy one could say "You're here" from bed.
  const away = you && sharpFix(you) ? distanceMeters(you, place) : null;
  const here = away !== null && away <= PLACE_RADIUS_M;
  // Got there since a check-in said "not there yet": that miss is old news, so it's Check in again.
  const shown: Check = here && stage.kind === 'notThere' ? { kind: 'morning' } : stage;

  const now = new Date();
  const imperial = usesMiles();
  const { line, body } = placeWords(shown, {
    place: place.name,
    awake: '',
    next: nextLockedMorning(now),
    morningStart: '',
    stepGoal,
    imperial,
    now,
  });
  // The live distance is right above, so a miss doesn't repeat the check-in's older one.
  const said = shown.kind === 'notThere' && away !== null ? 'Not there yet. Keep going, then try again.' : body;

  return {
    icon: { ios: 'location.fill', android: 'location_on' },
    searching: shown.kind === 'checking',
    hero: { title: titleFor(shown, place, away, imperial), body: here && shown.kind === 'morning' ? 'Tap Check in.' : said, aside: line },
    meter: away !== null && away > PLACE_RADIUS_M ? { value: formatDistance(away - PLACE_RADIUS_M, imperial), caption: `to ${place.name}` } : undefined,
    action:
      shown.kind === 'noFix' && settingsCanFix(shown.why)
        ? { label: 'Open Settings', onPress: () => Linking.openSettings().catch(() => {}) }
        : shown.kind === 'checking'
          ? { label: 'Checking…', onPress: () => {} }
          : { label: shown.kind === 'morning' ? 'Check in' : 'Try again', onPress: () => void onCheckIn() },
    alt: WALK_INSTEAD,
  };
}

/** The headline, and the meter's VoiceOver label while it shows. */
function titleFor(stage: Check, place: MorningPlace, away: number | null, imperial: boolean): string {
  if (away !== null && away <= PLACE_RADIUS_M) return 'You’re here';
  if (away !== null) return `${formatDistance(away - PLACE_RADIUS_M, imperial)} to ${place.name}`;
  if (stage.kind === 'checking') return 'Looking';
  return `Get to ${place.name}`;
}
