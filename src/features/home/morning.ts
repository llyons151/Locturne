import { router } from 'expo-router';

import type { HomeMorning } from './home-content';
import type { MorningWalk } from './use-morning-walk';

/**
 * Pieces shared by Home's morning hooks (use-morning-stairs, use-morning-place,
 * use-morning-scan): each draws its method as Home's hero (`HomeMorning`), with steps counted
 * underneath as the way out every morning offers (GAME_PLAN, "walk N steps instead").
 */

/** Passes, the scan code and the emergency unlock, in their native sheet. */
export const OTHER_WAYS = { label: 'Other ways to wake them', onPress: () => router.push('/exits'), opens: true };

/**
 * The steps fallback, said after the method's own sentence. Steps since the morning start are
 * counted all along, and the goal proves the morning by itself (`useMorningWalk`).
 */
export function orWalk(walk: MorningWalk | null): string {
  if (walk?.kind !== 'counting') return '';
  return walk.steps ? ` Or walk ${walk.goal} steps instead: ${walk.steps} so far.` : ` Or walk ${walk.goal} steps instead.`;
}

/**
 * "Scan your code" on Home (docs/HOME_INTERACTIVE.md). Aiming at a code needs the whole
 * screen, so Scan opens the camera (`/scan?mode=morning`), and a match closes it again: the
 * apps wake on Home.
 */
export function scanMorning(walk: MorningWalk | null): HomeMorning {
  return {
    icon: { ios: 'qrcode.viewfinder', android: 'qr_code_scanner' },
    hero: {
      title: 'Go find your code',
      body: `Scan it and your apps wake up. Only your code counts.${orWalk(walk)}`,
    },
    action: { label: 'Scan my code', onPress: () => router.push('/scan?mode=morning'), opens: true },
    alt: OTHER_WAYS,
  };
}
