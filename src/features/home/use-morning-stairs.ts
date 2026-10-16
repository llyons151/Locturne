import { useEffect, useState } from 'react';
import { AppState, Linking } from 'react-native';

import * as haptic from '@/lib/haptics';
import { DOWNSTAIRS, heightProgress, holdProgress, type DownstairsSession } from '@/lib/wake/downstairs';
import { downstairsLine } from '@/lib/wake/lines';

import { useDownstairs } from '../wake/use-downstairs';
import { useProveMorning } from '../wake/use-prove-morning';
import type { HomeMorning } from './home-content';
import { WALK_INSTEAD } from './morning';
import type { MorningWalk } from './use-morning-walk';

/**
 * Home's morning when the wake-up is "go downstairs" (docs/HOME_INTERACTIVE.md): the barometer
 * listens as soon as Home shows the morning, with no Start to tap (user, 2026-10-15), then the
 * height meter fills right on Home, then the five-second hold, and the morning is proved in
 * place. A session that finds no floor in five minutes starts again from where the phone is
 * then, so it keeps listening for as long as Home is open. Null while `enabled` is false.
 * `walk` is the steps fallback, counted underneath.
 */
export function useMorningStairs(enabled: boolean, walk: MorningWalk | null): HomeMorning | null {
  const { access, session, start, stop } = useDownstairs(enabled);
  const prove = useProveMorning();
  const status = session?.status;
  const met = enabled && status === 'met';
  const active = useActive();

  // Listening starts by itself, and starts again after five minutes with no floor or a trip to
  // the background (iOS pauses the barometer there, so the watch drops the session). Only in
  // the foreground: a session begun in the background would judge a gap.
  const idle = !session || status === 'timedOut';
  useEffect(() => {
    if (enabled && active && access === 'ready' && idle) void start();
  }, [enabled, active, access, idle, start]);

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
  if (access === 'denied')
    return {
      icon,
      hero: {
        title: "I can't feel the stairs",
        body: 'Motion & Fitness is off for Locturne, so I can’t tell when you change floors. Turn it on in Settings, under Privacy & Security.',
      },
      action: { label: 'Open Settings', onPress: () => Linking.openSettings() },
      alt: WALK_INSTEAD,
    };

  if (broken)
    return {
      icon,
      hero: {
        title: 'The stairs aren’t reading',
        body: access === 'unavailable' ? 'This phone has no barometer I can read.' : 'It may be the sensor, or the phone.',
        aside: downstairsLine('flat', 0),
      },
      action:
        access === 'unavailable'
          ? WALK_INSTEAD
          : { label: 'Try the stairs again', onPress: start },
      alt: access === 'unavailable' ? undefined : WALK_INSTEAD,
    };

  const line = downstairsLine(status ?? 'idle', session ? heightProgress(session) : 0);
  const running = !!session && status !== 'met' && status !== 'timedOut';

  // Not listening yet (the barometer's being checked, or Motion & Fitness asked for), or
  // listening with the height still: the meter shows once it starts to move. The screen stays
  // on while listening, since a locked phone pauses the barometer and would lose the baseline.
  if (!session || status === 'timedOut' || status === 'waiting')
    return {
      icon,
      hero: { title: 'Go down a floor', body: bodyFor(undefined), aside: line },
      action: WALK_INSTEAD,
      keepAwake: running,
    };

  return {
    icon,
    hero: { title: meterLabel(session), body: bodyFor(status), aside: line },
    meter: heightMeter(session),
    action: WALK_INSTEAD,
    keepAwake: running,
  };
}

/** Whether the app is in the foreground, as it changes. */
function useActive() {
  const [active, setActive] = useState(AppState.currentState === 'active');
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => setActive(state === 'active'));
    return () => sub.remove();
  }, []);
  return active;
}

function bodyFor(status: DownstairsSession['status'] | undefined): string {
  switch (status) {
    case undefined:
      return 'Take the stairs with your phone. One floor down, or up, and stay there for five seconds.';
    case 'holding':
      return 'Stay on this floor for five seconds.';
    case 'met':
      return 'Floor reached.';
    case 'timedOut':
      return 'Nothing like a floor yet. Still listening.';
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
