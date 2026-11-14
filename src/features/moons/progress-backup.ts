import { AppState } from 'react-native';
import { onCloudChange, readBackup, writeBackup } from 'progress-backup';

import { getSavedMornings, onProofChange, restoreMornings } from '@/lib/morning-proof';
import { createProgressSync, type Progress } from '@/lib/progress-sync';

import { getSavedMoons, onOwnedChange, restoreMoons } from './moon-collection';

/**
 * Keeps your mornings and moons outside the App Group, so deleting and reinstalling the app gets
 * them back (docs/reports/Gamification plan.md, Phase A). The merge rules are in
 * lib/progress-sync.ts; the copies themselves in modules/progress-backup (iCloud and Keychain).
 *
 * A morning won from the shield, with the app never opened, is saved here on the next open.
 */

function readLocal(): Progress {
  const { won, first, proofs } = getSavedMornings();
  const { owned, rare } = getSavedMoons();
  return { won, first, proofs, owned, rare };
}

function applyLocal(p: Progress) {
  // Moons first: the mornings' change settles the ladder, which must see the moons already back,
  // or it would earn them again dated today.
  restoreMoons(p.owned, p.rare);
  restoreMornings({ won: p.won, first: p.first, proofs: p.proofs });
}

const sync = createProgressSync({
  readLocal,
  applyLocal,
  readStores: readBackup,
  writeStores: (json) => void writeBackup(json),
  now: () => Date.now(),
});

let started = false;
let pending: ReturnType<typeof setTimeout> | null = null;

/** A morning or a moon changes several keys in a row: one save a moment later covers them all. */
function saveSoon() {
  if (pending) return;
  pending = setTimeout(() => {
    pending = null;
    sync.save();
  }, 500);
}

function saveNow() {
  if (pending) clearTimeout(pending);
  pending = null;
  sync.save();
}

/** Once, at launch, before the first screen: brings back what a reinstall lost, then keeps the copies up to date. */
export function startProgressBackup() {
  if (started) return;
  started = true;
  try {
    sync.restore();
  } catch {
    // A broken copy never stops the app opening; the next save writes a good one.
  }
  onProofChange(saveSoon);
  onOwnedChange(saveSoon);
  onCloudChange(() => {
    try {
      sync.restore();
    } catch {}
  });
  // Shield mornings land in the App Group with the app closed: picked up whenever it comes back.
  AppState.addEventListener('change', (state) => {
    if (state === 'active') saveSoon();
    else if (state === 'background') saveNow();
  });
}

/** Dev tools that replace this phone's mornings or moons: the copies take exactly the phone's, so a relaunch doesn't merge the old ones back. */
export function replaceProgressBackup() {
  if (pending) clearTimeout(pending);
  pending = null;
  sync.replace();
}
