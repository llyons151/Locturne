/**
 * The morning streak: mornings got up in a row (Home's pill, user 2026-11-16, docs/STREAK_LAB.md).
 * The lifetime count (`getMorningsWon`) still never resets; it shows when the pill is tapped and
 * on the moons page.
 *
 * A morning between two wake-ups keeps the run going when nothing asked anything of it, and
 * breaks it only when its night locked and nobody got up:
 * - a pass (or the emergency unlock) pauses the streak: it holds, without adding one (user's pick);
 * - a night that was off, or before the first routine, is skipped (`nightWasOn`, as Home's week
 *   dots judge it, so the dots and the number always agree);
 * - nights a lapsed subscription didn't lock are skipped (`pastLastPaid`, `lapseGaps`).
 *
 * Saved as the run's length, the morning key of its last wake-up and the last morning judged, so a
 * run longer than the 30 proofs on hand keeps counting and a verdict, once given, stands. The pure part takes its facts as arguments, for the tests.
 */
import { dateKey, nightInto } from './lock-state.ts';
import { getSavedStreak, getProofs, saveStreak, type MorningProof, type Streak } from './morning-proof.ts';
import { getRoutine, getRoutineChange, nightWasOn } from './routine.ts';
import { lapseGaps, pastLastPaid, readLock } from './lock-controller.ts';

/** Far enough back for any real gap; past it, a run is long broken. */
const MAX_GAP_DAYS = 400;

/** Pure: the morning key the day after `key`. */
export function nextKey(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return dateKey(new Date(y, m - 1, d + 1));
}

/** Pure: does every morning after `after` and before `before` (both keys, not included) keep the run? */
export function unbroken(after: string, before: string, excused: (key: string) => boolean): boolean {
  let key = nextKey(after);
  for (let i = 0; key < before; i++, key = nextKey(key)) {
    if (i >= MAX_GAP_DAYS || !excused(key)) return false;
  }
  return true;
}

/** Pure: the later of two morning keys. */
const later = (a: string, b: string | undefined) => (b !== undefined && b > a ? b : a);

/**
 * Pure: `saved` brought up to morning `today` (`LockState.morningKey`, still under way): every
 * wake-up among `proofs` not counted yet adds one, or starts it again at one after a morning that
 * broke it, and every finished morning since is judged once. The verdict is saved with the run
 * (`checked`, the last morning judged), so nothing that changes later (a routine edit, which frees
 * every morning before it in `nightWasOn`) can take back a miss or a wake-up. Today's morning is
 * never judged: it's still under way.
 */
export function settleStreak(saved: Streak | null, proofs: MorningProof[], today: string, excused: (key: string) => boolean): Streak | null {
  const wins = [...new Set(proofs.filter((p) => p.kind !== 'pass' && p.kind !== 'emergency').map((p) => p.morningKey))]
    .filter((key) => (!saved || key > later(saved.key, saved.checked)) && key <= today)
    .sort();
  let s = saved;
  for (const key of wins) {
    s = !s ? { count: 1, key, checked: key } : { count: unbroken(later(s.key, s.checked), key, excused) ? s.count + 1 : 1, key, checked: key };
  }
  if (!s) return null;
  const from = later(s.key, s.checked);
  const last = prevKey(today);
  if (from >= last) return s;
  return { ...s, count: unbroken(from, today, excused) ? s.count : 0, checked: last };
}

/** Pure: the morning key the day before `key`. */
export function prevKey(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return dateKey(new Date(y, m - 1, d - 1));
}

/** The phone's rule for a morning without a wake-up: does it leave the run alone? */
function phoneExcuses(proofs: MorningProof[]): (key: string) => boolean {
  const routine = getRoutine();
  const change = getRoutineChange();
  const gaps = lapseGaps();
  const paused = new Set(proofs.filter((p) => p.kind === 'pass' || p.kind === 'emergency').map((p) => p.morningKey));
  return (key) =>
    paused.has(key) ||
    !nightWasOn(key, routine, change) ||
    pastLastPaid(key) ||
    gaps.some((gap) => key > gap.after && nightInto(key, routine).start.getTime() < gap.until);
}

/** The streak on morning `today`, counting wake-ups not saved into it yet (from the shield, say). */
export function getStreak(today: string): number {
  const proofs = getProofs();
  return settleStreak(getSavedStreak(), proofs, today, phoneExcuses(proofs))?.count ?? 0;
}

/**
 * Saves the wake-ups on hand and the verdict on every finished morning into the streak: before
 * the proofs list drops them, and before anything in the app can be edited (at launch, on coming
 * back to the foreground), so a morning is judged under the routine it ran under.
 */
export function saveStreakNow(now = new Date()) {
  const saved = getSavedStreak();
  const proofs = getProofs();
  const next = settleStreak(saved, proofs, readLock(now).morningKey, phoneExcuses(proofs));
  if (next && (next.key !== saved?.key || next.count !== saved?.count || next.checked !== saved?.checked)) saveStreak(next);
}
