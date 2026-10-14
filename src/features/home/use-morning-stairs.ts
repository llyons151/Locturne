import { useEffect } from 'react';
import { Linking } from 'react-native';

import * as haptic from '@/lib/haptics';
import { DOWNSTAIRS, heightProgress, holdProgress, type DownstairsSession } from '@/lib/wake/downstairs';
import { downstairsLine } from '@/lib/wake/lines';

import { useDownstairs } from '../wake/use-downstairs';
import { useProveMorning } from '../wake/use-prove-morning';
import type { HomeMorning } from './home-content';
import { orWalk, OTHER_WAYS } from './morning';
import type { MorningWalk } from './use-morning-walk';

/**
 * Home's morning when the wake-up is "go downstairs" (docs/HOME_INTERACTIVE.md): Start in bed,
 * then the height meter fills right on Home, then the five-second hold, and the morning is
 * proved in place. What downstairs-view.tsx does on the wake screen, drawn as Home's hero.
 * Null while `enabled` is false. `walk` is the steps fallback, counted underneath.
 */
export function useMorningStairs(enabled: boolean, walk: MorningWalk | null): HomeMorning | null {
  const { access, session, start, stop, cancel } = useDownstairs(enabled);
  const prove = useProveMorning();
  const status = session?.status;
  const met = enabled && status === 'met';

  useEffect(() => {
    if (met) prove('downstairs');
  }, [met, prove]);

  // A light tap when the hold begins, so they know to stop walking.
  const holding = status === 'holding';
  useEffect(() => {
    if (holding) haptic.tick();
  }, [holding]);

  // A silent sensor: stop listening, and say so.
  const broken = access === 'unavailable' || status === 'noSignal' || status === 'flat';
  useEffect(() => {
    if (broken) stop();
  }, [broken, stop]);

  if (!enabled) return null;
  const icon = { ios: 'figure.stairs', android: 'stairs' };
  const instead = orWalk(walk);

  if (access === 'denied')
    return {
      icon,
      hero: {
        title: "I can't feel the stairs",
        body: `Motion & Fitness is off for Locturne, so I can’t tell when you change floors. Turn it on in Settings, under Privacy & Security.${instead}`,
      },
      action: { label: 'Open Settings', onPress: () => Linking.openSettings() },
    };

  if (broken)
    return {
      icon,
      hero: {
        title: 'The stairs aren’t reading',
        body: access === 'unavailable' ? `This phone has no barometer I can read.${instead}` : `It may be the sensor, or the phone.${instead}`,
        aside: downstairsLine('flat', 0),
      },
      action:
        access === 'unavailable'
          ? OTHER_WAYS
          : { label: 'Try the stairs again', onPress: start },
    };

  const line = downstairsLine(status ?? 'idle', session ? heightProgress(session) : 0);
  const running = !!session && status !== 'met' && status !== 'timedOut';

  if (!session || status === 'timedOut')
    return {
      icon,
      hero: {
        title: session ? 'No stairs yet' : 'Go down a floor',
        body: `${bodyFor(status)}${instead}`,
        aside: line,
      },
      // Start asks for Motion & Fitness the first time; until the barometer's checked it waits.
      action: { label: session ? 'Start again' : 'Start', onPress: access === 'checking' ? () => {} : start },
      alt: OTHER_WAYS,
    };

  return {
    icon,
    hero: { title: meterLabel(session), body: bodyFor(status), aside: line },
    meter: heightMeter(session),
    action: running ? { label: 'Stop', onPress: cancel } : { label: 'Start', onPress: start },
    keepAwake: running,
  };
}

function bodyFor(status: DownstairsSession['status'] | undefined): string {
  switch (status) {
    case undefined:
      return 'Tap Start, then take the stairs with your phone. One floor down, or up, and stay there for five seconds.';
    case 'holding':
      return 'Stay on this floor for five seconds.';
    case 'met':
      return 'Floor reached.';
    case 'timedOut':
      return 'Nothing like a floor in five minutes. Start again on the stairs.';
    default:
      return 'Keep the screen on and take the stairs. Up counts too.';
  }
}

const secondsLeft = (session: DownstairsSession) =>
  Math.max(0, Math.ceil(((1 - holdProgress(session)) * DOWNSTAIRS.holdMs) / 1000));

/** The count is metres moved; once a floor's reached, the track turns into the hold. */
function heightMeter(session: DownstairsSession) {
  const holding = session.status === 'holding' || session.status === 'met';
  const direction = session.change < -0.2 ? 'down ' : session.change > 0.2 ? 'up ' : '';
  return {
    value: Math.abs(session.change).toFixed(1),
    caption: holding ? (session.status === 'met' ? 'Floor reached' : `Hold ${secondsLeft(session)} s`) : `m ${direction}of ${DOWNSTAIRS.threshold} m`,
    progress: holding ? holdProgress(session) : heightProgress(session),
  };
}

/** For VoiceOver, in place of the count. */
function meterLabel(session: DownstairsSession): string {
  if (session.status === 'met') return 'Floor reached';
  if (session.status === 'holding') {
    const left = secondsLeft(session);
    return `Floor reached. Hold for ${left} more ${left === 1 ? 'second' : 'seconds'}.`;
  }
  return `${Math.abs(session.change).toFixed(1)} of ${DOWNSTAIRS.threshold} metres`;
}
