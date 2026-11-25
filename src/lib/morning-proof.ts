/**
 * How a morning was unlocked. Every wake-up method, a pass and the emergency unlock all end
 * the same way: a proof recorded for that morning's key. `lock-controller.ts` reads it and
 * wakes the apps, so adding a method never touches the lock rules.
 */
import { currentMorning, dateKey, nightInto, type Morning } from './lock-state.ts';
import { getRoutine, getRoutineChange, nightRanUnder, toLockSettings, type Routine, type WakeMethod } from './routine.ts';
import { sharedGet, sharedSet } from './screen-time.ts';

export type ProofKind = WakeMethod | 'pass' | 'emergency';

export type MorningProof = {
  /** `LockState.morningKey` of the morning this unlocks. */
  morningKey: string;
  kind: ProofKind;
  /** When it was recorded, in ms. */
  at: number;
  /**
   * The bedtime and morning start of the routine `recordProof` judged it under, in minutes
   * since midnight. `proofUnlocks` finds the night into `morningKey` from these, so a routine
   * saved since can't move it. Missing on proofs saved before they were kept.
   */
  bedtime?: number;
  morningStart?: number;
  /**
   * A scan morning's registered code, the one the scan matched, as it was that morning (the
   * Coca-Cola secret moon reads it: a code saved since can't change what was scanned). Missing on
   * other methods and on scan proofs saved before it was kept.
   */
  code?: { data: string; type: string };
};

/**
 * Pure: the morning start of the morning this proof unlocks, under the routine it was judged
 * by (its saved times), or null for a proof saved without them. A routine edited since can't
 * move it.
 */
export function proofMorningStart(proof: MorningProof): Date | null {
  const { bedtime, morningStart } = proof;
  if (bedtime === undefined || morningStart === undefined) return null;
  return nightInto(proof.morningKey, { bedtime, morningStart }).end;
}

const KEY = 'locturne.morningProofs';
/** Enough history for the share card and diagnostics, without growing forever. */
const KEEP = 30;

const listeners = new Set<() => void>();

/**
 * Pure: may this proof be recorded for `morning`, the morning its moment belongs to? Bedtime
 * wins (GAME_PLAN, "Core loop"), so a dance, steps or a scan only count once the morning has
 * started: a walk at 23:30 must not unlock tomorrow. A pass or an emergency unlock is a
 * deliberate choice and counts whenever it was made (a pass used the night before covers the
 * morning).
 *
 * Timing is judged here, when `recordProof` saves the proof. Afterwards a saved proof is read
 * by `proofUnlocks`, which asks a weaker question: re-reading its time against a morning start
 * computed later would take back a morning proven legitimately, after a flight west (07:30 New
 * York is before 07:00 in LA) or an edit that moved morning start later.
 */
export function proofCounts(proof: MorningProof, morning: Morning): boolean {
  if (proof.morningKey !== morning.key) return false;
  if (proof.kind === 'pass' || proof.kind === 'emergency') return true;
  return proof.at >= morning.start.getTime();
}

/**
 * Pure: does this saved proof unlock `morning`, as worked out in the zone and routine of now?
 * Its timing against morning start was judged when it was saved (`proofCounts`). A dance,
 * steps or scan proof still has to come after the start of the night that leads into
 * `morning`: no bedtime may have begun here since it. A flight west over the date line (07:30
 * Oct 6 in Sydney, then LA's Oct 5 23:00 to Oct 6 07:00) replays the same morning key after a
 * whole new night, and that morning needs its own wake-up. A same-day flight west keeps the
 * proof: LA's night began at 02:00 New York time, before a 07:30 walk there.
 *
 * That night is the one the proof was made under: its routine's times (saved by
 * `recordProof`), in the zone of now. A switch to a night shift (08:00 to 16:00) that applies
 * after the walk names the same morning again, with a night that started at 08:00 that day,
 * after the 07:30 walk; that night was never slept under the new routine, so it doesn't take
 * the morning back. A proof saved without the times goes by `morning.nightStart`.
 *
 * A pass or an emergency unlock can be intended before its own bedtime. It covers that
 * morning, but not a later night that really ran under new routine times and reused its key.
 */
export function proofUnlocks(proof: MorningProof, morning: JudgedMorning): boolean {
  if (proof.morningKey !== morning.key) return false;
  const { bedtime, morningStart } = proof;
  if (proof.kind === 'pass' || proof.kind === 'emergency') {
    const originalNight = bedtime === undefined || morningStart === undefined
      ? null
      : nightInto(proof.morningKey, { bedtime, morningStart });
    // Keep deliberately early exits and existing travel semantics. Only a genuinely new
    // routine night after both the original night and this exit needs another wake-up.
    return !(morning.ran === true && originalNight && morning.nightStart > originalNight.start && proof.at < morning.nightStart.getTime());
  }
  // A night that really ran under the routine governing now (`nightRanUnder`, routine.ts) and began
  // after the proof needs its own wake-up, whatever routine the proof was made under: a same-day
  // night (20:00 to 22:00) held early after a 07:30 walk names the walk's morning again.
  const nightStart =
    morning.ran === true || bedtime === undefined || morningStart === undefined
      ? morning.nightStart
      : nightInto(proof.morningKey, { bedtime, morningStart }).start;
  return proof.at >= nightStart.getTime();
}

/**
 * A morning as `proofUnlocks` judges it. `ran`: did its night really run under the routine
 * governing now (`nightRanUnder`)? Then that night's start is the one a proof must come after.
 * Otherwise, or when not known, the night under the routine the proof was made under.
 */
export type JudgedMorning = Pick<Morning, 'key' | 'nightStart'> & { ran?: boolean };

export function getProofs(): MorningProof[] {
  return sharedGet<MorningProof[]>(KEY) ?? [];
}

/** A real wake-up (a method's proof): passes and emergencies don't count (HOME_10.md #7). */
const isWin = (proof: MorningProof) => proof.kind !== 'pass' && proof.kind !== 'emergency';

const WON_KEY = 'locturne.morningsWon';

/** Pure: the mornings with a real wake-up among `proofs`, counted once each. */
function winsIn(proofs: MorningProof[]): Set<string> {
  return new Set(proofs.filter(isWin).map((p) => p.morningKey));
}

/**
 * Mornings you got up, ever: Home's count, which never resets. The proofs list keeps only the
 * last 30, and a pass or emergency joining it would push a real one out, so the count lives
 * in its own counter that only a real wake-up adds to. Before the counter existed, the proofs
 * on hand are the count.
 */
export function getMorningsWon(): number {
  return sharedGet<number>(WON_KEY) ?? winsIn(getProofs()).size;
}

const FIRST_KEY = 'locturne.firstMorning';

/**
 * The morning streak's run (lib/streak.ts): its length (0 once a morning broke it), the morning key
 * of its last wake-up, and the last morning already judged (`checked`), whose verdict stands.
 */
export type Streak = { count: number; key: string; checked?: string };
const STREAK_KEY = 'locturne.streak';

/** The streak as last saved (lib/streak.ts reads and settles it), or null before one. */
export function getSavedStreak(): Streak | null {
  const saved = sharedGet<Streak>(STREAK_KEY);
  return saved && typeof saved.count === 'number' && typeof saved.key === 'string' && (saved.checked === undefined || typeof saved.checked === 'string') ? saved : null;
}

/** Saved without telling the proof listeners: lib/streak.ts saves it from one of them. */
export function saveStreak(streak: Streak | null) {
  sharedSet(STREAK_KEY, streak);
}

/**
 * The morning key of the first morning you got up (the You tab's "since"), or null before
 * one. Kept on its own like the count: the proofs list drops its oldest. Before it was kept,
 * the oldest real wake-up on hand.
 */
export function getFirstMorning(): string | null {
  const saved = sharedGet<string>(FIRST_KEY);
  if (saved) return saved;
  const keys = [...winsIn(getProofs())].sort();
  return keys[0] ?? null;
}

/**
 * The proof that unlocked `morning` (`currentMorning` under the routine governing now), or
 * null. `currentProof` (lock-controller.ts) asks it for the morning under way.
 */
export function getProof(morning: JudgedMorning): MorningProof | null {
  return getProofs().find((p) => proofUnlocks(p, morning)) ?? null;
}

/**
 * Records the first proof for a morning and returns true. Returns false, and records
 * nothing, when the morning already has a proof or this one wouldn't count under the routine
 * in force at `proof.at` (a walk before morning start). Checking here, not only in the
 * screens, means no method can poison a morning by recording too early.
 */
export function recordProof(proof: MorningProof, governing?: { routine: Routine; ran: boolean }): boolean {
  const at = new Date(proof.at);
  // The routine that governs `at`: in force, unless the caller knows better (`judgedAt` in
  // lock-controller.ts, which imports this file: a waiting edit's early first night, or windows
  // iOS still runs for older times).
  const judged = governing?.routine ?? getRoutine(at);
  const found = currentMorning(at, toLockSettings(judged));
  const morning = { ...found, ran: governing ? governing.ran : nightRanUnder(found, getRoutineChange(at)) === 'routine' };
  if (!proofCounts(proof, morning)) return false;
  // Saved with the times it was judged under, for `proofUnlocks`.
  const saved: MorningProof = { ...proof, bedtime: judged.bedtime, morningStart: judged.morningStart };
  const all = getProofs();
  // A saved proof that still unlocks this morning means it's already unlocked. One from before
  // this morning's night began (the date replayed after a flight west) doesn't block this one.
  if (all.some((p) => proofUnlocks(p, morning))) return false;
  // Counted, and saved, before the list drops its oldest (a pass too, so it can't drop the
  // count the first time the counter is written): once per morning key, as a key replayed
  // after a flight west is still one morning.
  const won = isWin(saved) && !winsIn(all).has(saved.morningKey) ? 1 : 0;
  if (won && !sharedGet<string>(FIRST_KEY)) sharedSet(FIRST_KEY, getFirstMorning() ?? saved.morningKey);
  sharedSet(WON_KEY, getMorningsWon() + won);
  sharedSet(KEY, [saved, ...all].slice(0, KEEP));
  for (const listener of listeners) listener();
  return true;
}

/**
 * Dev and preview builds (Developer → Make up mornings, for recording demos): a made-up history
 * of `count` mornings got up in a row, the last one yesterday, under the routine in force now.
 * Replaces every saved proof from before today; today's and later ones are kept and counted in
 * `count`, so the morning under way is left as it really is. Returns the morning keys of all
 * `count` mornings, the oldest first (moon-collection.ts dates the ladder's moons by them).
 */
export function devSeedMornings(count: number, now = new Date()): string[] {
  const routine = getRoutine(now);
  const today = dateKey(now);
  const kept = getProofs().filter((p) => p.morningKey >= today);
  const keptWins = [...winsIn(kept)].sort();
  const made: MorningProof[] = [];
  for (let back = 1; back <= count - keptWins.length; back++) {
    const morningKey = dateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - back));
    const start = nightInto(morningKey, routine).end.getTime();
    // A few minutes after morning start, not the same minute every day.
    const at = start + (2 + ((back * 7) % 11)) * 60_000;
    made.push({ morningKey, kind: routine.method, at, bedtime: routine.bedtime, morningStart: routine.morningStart });
  }
  const keys = [...made.map((p) => p.morningKey).reverse(), ...keptWins];
  sharedSet(FIRST_KEY, keys[0] ?? null);
  sharedSet(WON_KEY, keys.length);
  // The made-up mornings are one run, ending yesterday or with today's wake-up.
  saveStreak(keys.length ? { count: keys.length, key: keys[keys.length - 1], checked: keys[keys.length - 1] } : null);
  sharedSet(KEY, [...kept, ...made].slice(0, KEEP));
  for (const listener of listeners) listener();
  return keys;
}

/** Pure: the morning key `days` after `key` (before it, for a negative `days`). */
function shiftKey(key: string, days: number): string {
  const [y, m, d] = key.split('-').map(Number);
  return dateKey(new Date(y, m - 1, d + days));
}

/**
 * Dev and preview builds (Developer → Demo data, and the counted test wake-ups, for recording
 * posts that line up): a made-up history of `mornings` got up, the last `streak` of them in a row
 * ending the morning before `today` (`LockState.morningKey`), one missed morning before those
 * when the run is shorter than the count, and the rest in a row before that.
 *
 * `keepToday`: `today`'s proofs stay and a wake-up among them is the newest of the `mornings`
 * (Developer's rows: the morning under way is left as it really is). Otherwise they're taken
 * out and handed back as `held` (a counted test: its win is `today`'s wake-up, and leaving the
 * test unwon puts them back, `devPutBackProofs`). Returns the morning keys of all the mornings,
 * the oldest first (moon-collection.ts dates the ladder's moons by them).
 */
export function devSeedRun(mornings: number, streak: number, today: string, keepToday: boolean, now = new Date()): { keys: string[]; held: MorningProof[] } {
  const routine = getRoutine(now);
  const later = getProofs().filter((p) => p.morningKey >= today);
  const kept = keepToday ? later : [];
  const keptWins = [...winsIn(kept)].sort();
  const total = Math.max(0, Math.floor(mornings), keptWins.length);
  // A wake-up today is part of the run: it can't be shorter than that, or longer than the count.
  const run = Math.min(total, Math.max(0, Math.floor(streak), keptWins.length));
  const made: MorningProof[] = [];
  let back = 1;
  for (let i = 0; i < total - keptWins.length; i++, back++) {
    // The run's mornings, then one missed, then the rest.
    if (i === run - keptWins.length && run < total) back++;
    const morningKey = shiftKey(today, -back);
    const start = nightInto(morningKey, routine).end.getTime();
    // A few minutes after morning start, not the same minute every day.
    const at = start + (2 + ((back * 7) % 11)) * 60_000;
    made.push({ morningKey, kind: routine.method, at, bedtime: routine.bedtime, morningStart: routine.morningStart });
  }
  const keys = [...made.map((p) => p.morningKey).reverse(), ...keptWins];
  const last = keys[keys.length - 1];
  sharedSet(FIRST_KEY, keys[0] ?? null);
  sharedSet(WON_KEY, keys.length);
  // Judged through yesterday: the run, or 0 after the missed morning.
  saveStreak(last ? { count: run, key: last, checked: last > shiftKey(today, -1) ? last : shiftKey(today, -1) } : null);
  sharedSet(KEY, [...kept, ...made].slice(0, KEEP));
  for (const listener of listeners) listener();
  return { keys, held: keepToday ? [] : later };
}

/**
 * Dev and preview builds: a counted test wake-up won (wake-preview.ts), recorded as a real one
 * for `morningKey` at `at`, whatever the hour: the real payoff, moon and streak follow from it.
 */
export function devWinMorning(morningKey: string, kind: WakeMethod, at: number) {
  const routine = getRoutine(new Date(at));
  const all = getProofs().filter((p) => p.morningKey !== morningKey);
  const won = winsIn(all).has(morningKey) ? 0 : 1;
  if (!sharedGet<string>(FIRST_KEY)) sharedSet(FIRST_KEY, getFirstMorning() ?? morningKey);
  sharedSet(WON_KEY, getMorningsWon() + won);
  sharedSet(KEY, [{ morningKey, kind, at, bedtime: routine.bedtime, morningStart: routine.morningStart }, ...all].slice(0, KEEP));
  for (const listener of listeners) listener();
}

/** Dev and preview builds: a counted test left unwon puts back the morning's real proofs it took out (`devSeedRun`). */
export function devPutBackProofs(held: MorningProof[]) {
  if (!held.length) return;
  const keys = new Set(held.map((p) => p.morningKey));
  const rest = getProofs().filter((p) => !keys.has(p.morningKey));
  sharedSet(WON_KEY, getMorningsWon() + [...winsIn(held)].filter((k) => !winsIn(rest).has(k)).length);
  sharedSet(KEY, [...held, ...rest].slice(0, KEEP));
  for (const listener of listeners) listener();
}

/** The progress backup (features/moons/progress-backup.ts): the count, first morning and proofs, as kept. */
export function getSavedMornings(): { won: number; first: string | null; proofs: MorningProof[]; streak: Streak | null } {
  return { won: getMorningsWon(), first: getFirstMorning(), proofs: getProofs(), streak: getSavedStreak() };
}

/**
 * The progress backup brought back more than the phone has (after a reinstall, say): saved over
 * the phone's own, and everything listening told, as after a wake-up.
 */
export function restoreMornings(saved: { won: number; first: string | null; proofs: MorningProof[]; streak: Streak | null }) {
  sharedSet(WON_KEY, saved.won);
  saveStreak(saved.streak);
  sharedSet(FIRST_KEY, saved.first);
  sharedSet(KEY, saved.proofs.slice(0, KEEP));
  for (const listener of listeners) listener();
}

export function onProofChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
