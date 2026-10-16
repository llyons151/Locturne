import { router } from 'expo-router';

import type { HomeAction, HomeMorning } from './home-content';

/**
 * Pieces shared by Home's morning hooks (use-morning-stairs, use-morning-place,
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
