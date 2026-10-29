'use no memo';
// Reads the reps saved this morning during render (`getRepsDone`), which change outside React:
// the React Compiler would cache the first read, so Home would say 0 after a set.

import { useState, type ReactNode } from 'react';
import { Linking } from 'react-native';

import { getRepsDone } from '@/lib/wake/pushups-done';

import { isPoseCameraAvailable, type PoseCameraError } from '../../../modules/pose-camera';
import { useCameraAccess } from '../wake/camera-access';
import { PushupsCamera } from '../wake/pushups-view';
import { useProveMorning } from '../wake/use-prove-morning';
import type { HomeMorning } from './home-content';
import { WALK_INSTEAD } from './morning';

const ICON = { ios: 'figure.strengthtraining.functional', android: 'fitness_center' };

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
): { morning: HomeMorning; camera: ReactNode } | null {
  const camera = useCameraAccess();
  const prove = useProveMorning();
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState<PoseCameraError | null>(null);

  if (!enabled) {
    // Proved another way (the walk) or the morning over with the camera up: shut it, so the next
    // morning doesn't open on the camera, or on yesterday's "I can't see you".
    if (open) setOpen(false);
    if (failed) setFailed(null);
    return null;
  }

  // Read each render: closing the camera re-renders Home with the total so far.
  const done = Math.min(target, getRepsDone(morning));
  const left = Math.max(0, target - done);
  const restricted = camera.access === 'restricted' || failed === 'restricted';
  const denied = camera.access === 'denied' || (failed === 'denied' && camera.access !== 'granted');
  const meter = { value: String(done), caption: `of ${target} push-ups`, progress: target > 0 ? done / target : 1 };

  // No camera to count with: walking (counted right here) or the other ways.
  if (!isPoseCameraAvailable || restricted || failed === 'noCamera' || failed === 'model') {
    const why = !isPoseCameraAvailable
      ? 'This build of the app can’t count push-ups yet.'
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
          body: 'Camera access is off for Locturne, so I can’t count push-ups. Turn it on in Settings.',
        },
        action: { label: 'Open Settings', onPress: () => Linking.openSettings().catch(() => {}) },
        alt: WALK_INSTEAD,
      },
      camera: null,
    };
  }

  const begin = async () => {
    if (camera.access !== 'granted' && !(await camera.request())) return;
    setFailed(null);
    setOpen(true);
  };

  return {
    morning: {
      icon: ICON,
      hero: {
        // Read out for the meter, which stands in for the headline (home-content).
        title: `${done} of ${target} push-ups`,
        body: `Lean me on my side on the floor, two steps away and side-on to you. ${
          done > 0 ? `${left} more to go.` : `${target} push-ups.`
        } I count out loud.`,
      },
      meter,
      // The phone lies on the floor untouched through the set: auto-lock would stop the camera.
      keepAwake: open,
      // HIG: the button before Apple's prompt says Continue, never "Allow" (App Review 5.1.1(iv)).
      action: {
        label: camera.access === 'ask' ? 'Continue' : done > 0 ? 'Keep going' : 'Start push-ups',
        onPress: () => {
          if (camera.access !== 'checking') begin();
        },
        opens: true,
      },
      alt: WALK_INSTEAD,
    },
    camera: open ? (
      <PushupsCamera
        target={target}
        morning={morning}
        onMet={() => {
          setOpen(false);
          prove('pushups');
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
