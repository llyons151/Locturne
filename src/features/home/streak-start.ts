import { AppState } from 'react-native';

import { onProofChange } from '@/lib/morning-proof';
import { beforeRoutineSave } from '@/lib/routine';
import { saveStreakNow } from '@/lib/streak';

let started = false;

/**
 * Once, at launch (app/_layout.tsx): saves the streak now, after every new proof, whenever the app
 * comes back and just before a routine edit, so each finished morning is judged under the routine
 * it ran under.
 */
export function startStreak() {
  if (started) return;
  started = true;
  const save = (now?: Date) => {
    try {
      saveStreakNow(now);
    } catch {}
  };
  save();
  onProofChange(() => save());
  beforeRoutineSave(save);
  AppState.addEventListener('change', (state) => {
    if (state === 'active') save();
  });
}
