import { router } from 'expo-router';

import type { HomeAction, HomeMorning } from './home-content';

/**
 * Pieces shared by Home's morning hooks (use-morning-place,
 * use-morning-scan): each draws its method as Home's hero (`HomeMorning`), with steps counted
 * underneath as the way out every morning offers (GAME_PLAN, "walk N steps instead").
 */

/**
 * Where a morning offers walking instead. A placeholder: Home swaps in "Walk 200 steps
 * instead", which turns Home into the walk (home-screen.tsx), or drops it when steps can't be
 * counted. Never the passes: they stay in You, and the morning never prompts one (user,
 * 2026-10-15).
 */
export const WALK_INSTEAD: HomeAction = { label: 'Walk instead', onPress: () => {} };

/**
 * "Scan your code" on Home (docs/HOME_INTERACTIVE.md). Aiming at a code needs the whole
 * screen, so Scan opens the camera (`/scan?mode=morning`), and a match closes it again: the
 * apps wake on Home.
 */
export function scanMorning(): HomeMorning {
  return {
    icon: { ios: 'qrcode.viewfinder', android: 'qr_code_scanner' },
    hero: {
      title: 'Go find your code',
      body: 'Scan it and your apps wake up. Only your code counts.',
    },
    action: { label: 'Scan my code', onPress: () => router.push('/scan?mode=morning'), opens: true },
    alt: WALK_INSTEAD,
  };
}

/**
 * Touch grass, Sunlight, Pet your pet and Make your bed on Home (wake/photo.ts, pet.ts, bed.ts): like
 * the scan, the photo needs the whole screen, so the button opens the camera (`/grass`, `/sun`, `/pet`,
 * `/bed`) and a photo that passes closes it again. A bed morning with no setup photo walks (`methodInUse`).
 */
export function photoMorning(kind: 'grass' | 'sun' | 'pet' | 'bed'): HomeMorning {
  if (kind === 'bed')
    return {
      icon: { ios: 'bed.double', android: 'bed' },
      hero: { title: 'Make your bed', body: 'Covers up, pillows on. Then a photo of it from your usual spot, and your apps wake up.' },
      action: { label: 'Take the photo', onPress: () => router.push('/bed'), opens: true },
      alt: WALK_INSTEAD,
    };
  if (kind === 'pet')
    return {
      icon: { ios: 'pawprint', android: 'pets' },
      hero: { title: 'Go pet your pet', body: 'Out of bed. Find your cat or dog and take a photo of your hand on them.' },
      action: { label: 'Take the photo', onPress: () => router.push('/pet'), opens: true },
      alt: WALK_INSTEAD,
    };
  return kind === 'grass'
    ? {
        icon: { ios: 'leaf', android: 'grass' },
        hero: { title: 'Go touch grass', body: 'Real grass, outside. Take a photo of it and your apps wake up.' },
        action: { label: 'Take the photo', onPress: () => router.push('/grass'), opens: true },
        alt: WALK_INSTEAD,
      }
    : {
        icon: { ios: 'sun.max', android: 'wb_sunny' },
        hero: { title: 'Go find the sun', body: 'Step outside and take a photo of the sun, or the brightest bit of sky.' },
        action: { label: 'Take the photo', onPress: () => router.push('/sun'), opens: true },
        alt: WALK_INSTEAD,
      };
}
