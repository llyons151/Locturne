import { router, type Href } from 'expo-router';
import { Alert } from 'react-native';

import { devEarnAll, openMoons } from '@/features/moons/moon-collection';
import * as haptic from '@/lib/haptics';
import type { WakeMethod } from '@/lib/routine';

import { rehearse } from '../rehearsal/rehearsal';
import { pickAppState } from '../state-lab/app-states';
import { setPushupsPreview } from '../wake-lab/pushups-preview';
import { setWakePreview } from '../wake-lab/wake-preview';
import { setScreenshotMode } from './screenshot-mode';

/**
 * You → Developer → Screenshot pages (user, 2026-11-02): every screen the App Store set and the
 * marketing need, one tap each, on the phone so they're real native screenshots. Each one turns on
 * screenshot mode (no FAKE markings), makes up the state it needs (app-states.ts, the wake
 * preview, the payoff's demo) and opens the page. "Back to the real app" undoes all of it.
 * The panel numbers are docs/APP_STORE_SCREENSHOTS.md's set.
 */

export type Shot = { label: string; open: () => void };
export type ShotGroup = { title: string; shots: Shot[] };

/** Long enough for the settings page to go before the next one comes up over Home. */
const AFTER_HOME_MS = 450;

/** Closes the settings page these rows sit on, back to the tabs under it. */
function leaveSettings() {
  if (router.canGoBack()) router.back();
}

/** Home, showing a made-up state (`pickAppState`), with the settings page closed. */
function home(state: string) {
  setScreenshotMode(true);
  pickAppState(state);
  leaveSettings();
  setTimeout(() => router.navigate('/'), AFTER_HOME_MS);
}

/** A page or sheet over Home, with Home behind it in `state`. */
function over(state: string, href: Href) {
  home(state);
  setTimeout(() => router.push(href), AFTER_HOME_MS * 2);
}

/** A tab, with its real contents. */
function tab(href: Href) {
  setScreenshotMode(true);
  pickAppState(null);
  leaveSettings();
  setTimeout(() => router.navigate(href), AFTER_HOME_MS);
}

/** The morning payoff, as after a real wake-up: this method, `mornings` mornings in, `newMoon` rising. */
function payoff(method: WakeMethod, mornings: number, newMoon?: string) {
  home('look-day');
  setTimeout(
    () =>
      router.push({
        pathname: '/morning-won',
        params: { demo: '1', method, at: String(7 * 60 + 4), start: String(7 * 60), mornings: String(mornings), ...(newMoon ? { newMoon } : {}) },
      }),
    AFTER_HOME_MS * 2,
  );
}

/** An onboarding page on its own, with made-up answers (onboarding.tsx's `?step=`). */
function onboarding(step: string) {
  over('look-day', `/onboarding?step=${step}` as Href);
}

/** The push-up morning on Home with a drawn body instead of the camera, so Start counts reps on its own. */
function pushups() {
  setPushupsPreview({ scene: 'pushups' });
  home('morning-pushups');
}

/** A real night from iOS on a copy of the bedtime apps, for the shields themselves (they're iOS's, not ours). */
function realShield() {
  rehearse('steps')
    .then(() => {
      haptic.done();
      Alert.alert(
        'Shield on its way',
        'iOS starts the night in a minute or two. Swipe Locturne away and open a bedtime app: the night shield first, the morning one ("No.") about 15 minutes later.',
      );
    })
    .catch((e: Error) => Alert.alert('Can’t start it', e.message));
}

export const SHOT_GROUPS: ShotGroup[] = [
  {
    title: 'App Store set',
    shots: [
      { label: '1 · The night shield (real)', open: realShield },
      { label: '2 · Walking the steps', open: () => home('morning-steps') },
      { label: '3 · The payoff, a new moon rising', open: () => payoff('steps', 3, 'harvest') },
      { label: '4 · Routine', open: () => tab('/routine') },
      { label: '5 · Going downstairs', open: () => home('morning-downstairs') },
      { label: '6 · Push-ups (tap Start: a drawn body counts)', open: pushups },
      { label: '7 · Passes', open: () => over('look-night', '/exits') },
      { label: '8 · Home in the day', open: () => home('look-day') },
    ],
  },
  {
    title: 'Home',
    shots: [
      { label: 'Close to bedtime', open: () => home('look-evening') },
      { label: 'Asleep', open: () => home('look-night') },
      { label: 'Close to morning', open: () => home('look-wake-soon') },
      { label: 'Just got up', open: () => home('look-done') },
      { label: 'A full week', open: () => home('week-full') },
      { label: 'Steps, halfway', open: () => home('morning-steps-halfway') },
      { label: 'Scan your code', open: () => home('morning-scan') },
      { label: 'Go to your place', open: () => home('morning-place') },
    ],
  },
  {
    title: 'Pages',
    shots: [
      { label: 'Apps', open: () => tab('/apps') },
      { label: 'Sleep (Block now)', open: () => over('look-day', '/sleep') },
      {
        label: 'Moons',
        open: () => {
          home('look-day');
          setTimeout(openMoons, AFTER_HOME_MS * 2);
        },
      },
      {
        label: 'Moons, all earned (really earns them)',
        open: () => {
          devEarnAll();
          home('look-day');
          setTimeout(openMoons, AFTER_HOME_MS * 2);
        },
      },
      { label: 'Payoff, no new moon', open: () => payoff('downstairs', 12) },
      { label: 'Set up a code', open: () => over('look-day', '/code') },
      { label: 'Pick a place', open: () => over('look-day', '/place-pick') },
      { label: 'Passes', open: () => over('look-day', '/exits') },
    ],
  },
  {
    title: 'Onboarding',
    shots: [
      { label: 'Welcome', open: () => over('look-day', '/onboarding?paywall=1') },
      { label: 'Which one sounds like you?', open: () => onboarding('pain') },
      { label: 'Your number (reveal)', open: () => onboarding('reveal') },
      { label: 'Loc says hi', open: () => onboarding('build') },
      { label: 'Pick your morning', open: () => onboarding('method') },
      { label: 'Tomorrow morning (demo)', open: () => onboarding('tomorrow') },
      { label: 'The deal', open: () => onboarding('commit') },
      { label: 'From the maker', open: () => onboarding('founder') },
      { label: 'Plans (paywall)', open: () => onboarding('plans') },
      { label: 'All set', open: () => onboarding('armed') },
    ],
  },
];

/** Undoes every shot: the real Home, the real sensors, the FAKE markings back. */
export function backToRealApp() {
  pickAppState(null);
  setWakePreview({ phase: 'real', method: 'routine' });
  setPushupsPreview({ scene: 'camera' });
  setScreenshotMode(false);
}
