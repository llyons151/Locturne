'use no memo';
// Reads the reps saved this morning during render (`getRepsDone`), which change outside React:
// the React Compiler would cache the first read, so Home would say 0 after a set.

import { useState, type ReactNode } from 'react';
import { Linking } from 'react-native';

import { ASKING_APPLE } from '@/components/buttons';
import { isTimed, type Exercise } from '@/lib/wake/pushups';
import { getRepsDone } from '@/lib/wake/pushups-done';

import { isPoseCameraAvailable, type PoseCameraError } from '../../../modules/pose-camera';
import { useCameraAccess } from '../wake/camera-access';
import { EXERCISE_NOUN, PushupsCamera } from '../wake/pushups-view';
import { useProveMorning } from '../wake/use-prove-morning';
import type { HomeMorning } from './home-content';
import { WALK_INSTEAD } from './morning';

const ICONS = {
  pushups: { ios: 'figure.strengthtraining.functional', android: 'fitness_center' },
  dance: { ios: 'figure.dance', android: 'taunt' },
  pullups: { ios: 'figure.climbing', android: 'sports_gymnastics' },
  bench: { ios: 'figure.strengthtraining.traditional', android: 'exercise' },
} as const satisfies Record<Exercise, { ios: string; android: string }>;

/**
 * How he asks for the setup: push-ups, the phone on the floor; dance, standing up facing you;
 * pull-ups, standing up under the bar looking up at it; the bench press, on its side by the bench.
 */
const SETUP: Record<Exercise, string> = {
  pushups: 'Lean me on the floor, facing you or side-on.',
  dance: 'Stand me up facing you, about four steps back, so I can see all of you.',
  pullups: 'Stand me up a few steps from the bar, so I see your hands on it.',
  bench: 'Lay me on my side by the bench, so I see you side-on.',
};

/**
 * Home's morning when the wake-up is push-ups (docs/HOME_INTERACTIVE.md): the count so far is
 * the hero, with the setup under it, and Start opens the camera straight away, full screen, as
 * the scan does. The set proves the morning when the camera closes, and the apps wake on Home.
 * What pushups-view.tsx does on the wake screen. Null while `enabled` is false. Walking instead
 * is Home's own button, under Start; the camera has none.
 */
export function useMorningPushups(
  enabled: boolean,
  target: number,
  morning: string,
  exercise: Exercise = 'pushups',
): { morning: HomeMorning; camera: ReactNode } | null {
  const camera = useCameraAccess();
  const prove = useProveMorning();
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState<PoseCameraError | null>(null);
  /** Waiting on Apple's camera prompt, which takes about a second to come up. */
  const [asking, setAsking] = useState(false);

  if (!enabled) {
    // Proved another way (the walk) or the morning over with the camera up: shut it, so the next
    // morning doesn't open on the camera, or on yesterday's "I can't see you".
    if (open) setOpen(false);
    if (failed) setFailed(null);
    if (asking) setAsking(false);
    return null;
  }

  // Read each render: closing the camera re-renders Home with the total so far.
  // Dance is seconds straight: nothing carries over, so there's never a "so far".
  const timed = isTimed(exercise);
  const done = timed ? 0 : Math.min(target, getRepsDone(morning, exercise));
  const noun = EXERCISE_NOUN[exercise];
  const ICON = ICONS[exercise];
  const restricted = camera.access === 'restricted' || failed === 'restricted';
  const denied = camera.access === 'denied' || (failed === 'denied' && camera.access !== 'granted');
  const meter = { value: String(done), caption: `of ${target} ${noun}`, progress: target > 0 ? done / target : 1 };

  // No camera to count with: walking (counted right here) or the other ways.
  if (!isPoseCameraAvailable || restricted || failed === 'noCamera' || failed === 'model') {
    const why = !isPoseCameraAvailable
      ? `This build of the app can’t count ${noun} yet.`
      : restricted
        ? 'The camera is restricted on this phone, by Screen Time or a profile.'
        : failed === 'model'
          ? 'The pose model didn’t load. Check the connection and try again.'
          : 'The front camera wouldn’t start.';
    const retry = failed && !restricted;
    return {
      morning: {
        icon: ICON,
        hero: { title: "I can't see you", body: why },
        action: retry ? { label: 'Try again', onPress: () => setFailed(null) } : WALK_INSTEAD,
        alt: retry ? WALK_INSTEAD : undefined,
      },
      camera: null,
    };
  }

  if (denied) {
    return {
      morning: {
        icon: ICON,
        hero: {
          title: 'I need the camera for this',
          body: `Camera access is off for Locturne, so I can’t count ${noun}. Turn it on in Settings.`,
        },
        action: { label: 'Open Settings', onPress: () => Linking.openSettings().catch(() => {}) },
        alt: WALK_INSTEAD,
      },
      camera: null,
    };
  }

  const begin = async () => {
    if (camera.access !== 'granted') {
      setAsking(true);
      const granted = await camera.request().finally(() => setAsking(false));
      if (!granted) return;
    }
    setFailed(null);
    setOpen(true);
  };

  return {
    morning: {
      icon: ICON,
      hero: asking
        ? // What Apple's prompt is for, while it's up (user, 2026-11-16).
          { title: timed ? `Dance ${target} seconds` : `${done} of ${target} ${noun}`, body: `Apple needs camera access for you to ${timed ? 'dance' : `do ${noun}`}.` }
        : timed
        ? // Short (user, 2026-11-07): the camera screen says where to stand.
          { title: `Dance ${target} seconds`, body: 'Stop and it’s back to zero.' }
        : {
            // Read out for the meter, which stands in for the headline (home-content).
            title: `${done} of ${target} ${noun}`,
            // One line (user, 2026-11-16): the meter has the count, and the camera coaches the rest.
            body: SETUP[exercise],
          },
      meter: timed ? undefined : meter,
      // The phone lies on the floor untouched through the set: auto-lock would stop the camera.
      keepAwake: open,
      // The set's own name even before Apple has asked for the camera: the tap starts the set and
      // Apple's prompt comes in context, so Continue (onboarding's word for a page that only leads
      // to a prompt) reads wrong here (user, 2026-11-16). The orb covers the second before it shows.
      action: {
        label: timed ? 'Start dancing' : done > 0 ? 'Keep going' : `Start ${noun}`,
        onPress: () => {
          if (camera.access !== 'checking' && !asking) begin();
        },
        busy: asking ? ASKING_APPLE : undefined,
        opens: true,
      },
      alt: WALK_INSTEAD,
    },
    camera: open ? (
      <PushupsCamera
        target={target}
        morning={morning}
        exercise={exercise}
        onMet={() => {
          setOpen(false);
          prove(exercise);
        }}
        onClose={() => setOpen(false)}
        onError={(reason) => {
          setOpen(false);
          setFailed(reason);
        }}
      />
    ) : null,
  };
}
