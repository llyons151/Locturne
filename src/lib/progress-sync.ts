/**
 * Your progress, kept outside the App Group so deleting the app doesn't take it
 * (docs/reports/Gamification plan.md, Phase A): the morning count, the first morning, the proofs
 * and the moons. The copy lives twice, in iCloud and the Keychain (modules/progress-backup);
 * this file is the pure part, so it runs in the tests: the saved shape, the merge, and the
 * order of restore and save. The glue that reads the real stores is
 * features/moons/progress-backup.ts.
 *
 * The merge never takes anything away. Counts take the larger, the first morning the earlier,
 * proofs and moons the union. So a stale copy, a second phone or a copy from before a reinstall
 * can only add. The one way to make it smaller on purpose is `replace` (dev tools that reset
 * the phone's mornings or moons).
 */
import type { OwnedMoon, RareState } from '../features/moons/moon-ladder.ts';
import type { MorningProof } from './morning-proof.ts';

export type Progress = {
  /** Mornings got up, ever (Home's count). */
  won: number;
  /** Morning key of the first one, or null before one. */
  first: string | null;
  /** The latest proofs, newest first, at most `KEEP_PROOFS`. */
  proofs: MorningProof[];
  owned: Record<string, OwnedMoon>;
  /** The rare-moon roll state, or null when none was saved yet. */
  rare: RareState | null;
};

/** What's saved: the progress, its shape's version and when it was written. */
export type SavedProgress = Progress & { v: 1; savedAt: number };

/** The same as morning-proof.ts keeps. */
export const KEEP_PROOFS = 30;

export const EMPTY: Progress = { won: 0, first: null, proofs: [], owned: {}, rare: null };

const isWin = (p: MorningProof) => p.kind !== 'pass' && p.kind !== 'emergency';

/** Pure: a saved copy, or null for nothing, garbage or a shape from a later version. */
export function parseProgress(json: string | null | undefined): Progress | null {
  if (!json) return null;
  try {
    const raw = JSON.parse(json) as Partial<SavedProgress> | null;
    if (!raw || typeof raw !== 'object' || raw.v !== 1) return null;
    const proofs = Array.isArray(raw.proofs)
      ? raw.proofs.filter((p): p is MorningProof => !!p && typeof p.morningKey === 'string' && typeof p.kind === 'string' && typeof p.at === 'number')
      : [];
    const owned: Record<string, OwnedMoon> = {};
    if (raw.owned && typeof raw.owned === 'object') {
      for (const [id, m] of Object.entries(raw.owned)) {
        if (m && typeof m === 'object' && typeof m.morningKey === 'string' && typeof m.at === 'number') owned[id] = { ...m, id };
      }
    }
    const rare = raw.rare && typeof raw.rare === 'object' && typeof raw.rare.seed === 'number' ? raw.rare : null;
    return {
      won: typeof raw.won === 'number' && raw.won >= 0 ? Math.floor(raw.won) : 0,
      first: typeof raw.first === 'string' ? raw.first : null,
      proofs,
      owned,
      rare,
    };
  } catch {
    return null;
  }
}

export function serializeProgress(p: Progress, now: number): string {
  const saved: SavedProgress = { v: 1, savedAt: now, ...p };
  return JSON.stringify(saved);
}

const proofId = (p: MorningProof) => `${p.morningKey}|${p.kind}|${p.at}`;

/** The earlier of two morning keys (YYYY-MM-DD sorts as text), either may be missing. */
function earlier(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return a <= b ? a : b;
}

function mergeMoon(a: OwnedMoon, b: OwnedMoon): OwnedMoon {
  // The first time it was earned is the one that counts; shown or seen on either copy stays so.
  const base = a.at <= b.at ? a : b;
  const out: OwnedMoon = { ...base };
  if (a.presented || b.presented) out.presented = true;
  if (a.seen || b.seen) out.seen = true;
  return out;
}

/**
 * The rare roll keeps one install's seed, so mornings can't be rerolled by reinstalling: the
 * copy that has rolled furthest (a fresh install's state has rolled nothing), then the first.
 */
function mergeRare(a: RareState | null, b: RareState | null): RareState | null {
  if (!a) return b;
  if (!b) return a;
  return (b.rolled ?? '') > (a.rolled ?? '') ? b : a;
}

/** Pure: both copies together, nothing taken away. `a` wins ties (pass the phone's own first). */
export function mergeProgress(a: Progress, b: Progress): Progress {
  const seen = new Set<string>();
  const proofs = [...a.proofs, ...b.proofs]
    .filter((p) => {
      const id = proofId(p);
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .sort((x, y) => y.at - x.at)
    .slice(0, KEEP_PROOFS);
  const owned: Record<string, OwnedMoon> = { ...b.owned };
  for (const [id, moon] of Object.entries(a.owned)) owned[id] = owned[id] ? mergeMoon(moon, owned[id]) : moon;
  const wins = new Set(proofs.filter(isWin).map((p) => p.morningKey));
  const firstWin = [...wins].sort()[0] ?? null;
  return {
    won: Math.max(a.won, b.won, wins.size),
    first: earlier(earlier(a.first, b.first), firstWin),
    proofs,
    owned,
    rare: mergeRare(a.rare, b.rare),
  };
}

/** Pure: the same progress (proof order and moon key order don't matter). */
export function sameProgress(a: Progress, b: Progress): boolean {
  if (a.won !== b.won || a.first !== b.first || a.proofs.length !== b.proofs.length) return false;
  const ids = new Set(a.proofs.map(proofId));
  if (b.proofs.some((p) => !ids.has(proofId(p)))) return false;
  const aIds = Object.keys(a.owned);
  if (aIds.length !== Object.keys(b.owned).length) return false;
  for (const id of aIds) {
    const x = a.owned[id];
    const y = b.owned[id];
    if (!y || x.at !== y.at || x.morningKey !== y.morningKey || !!x.presented !== !!y.presented || !!x.seen !== !!y.seen) return false;
  }
  return JSON.stringify(a.rare) === JSON.stringify(b.rare);
}

/** What the sync needs from the phone; the tests pass fakes. */
export type SyncDeps = {
  /** The progress in the App Group now. */
  readLocal(): Progress;
  /** Puts `p` into the App Group and tells the screens (only called when it differs). */
  applyLocal(p: Progress): void;
  /** Both saved copies, raw. */
  readStores(): { cloud: string | null; keychain: string | null };
  /** Saves to both copies. */
  writeStores(json: string): void;
  now(): number;
};

export type ProgressSync = {
  /**
   * On launch, and when iCloud hands over a newer copy: merges both copies into the phone's
   * progress, then saves the result back. Returns what it brought back (0s when nothing).
   */
  restore(): { won: number; moons: number; proofs: number };
  /** After a morning or a moon: merges the phone's progress into the copies. Waits for `restore`. */
  save(): void;
  /** Dev tools that reset mornings or moons: the copies become exactly the phone's. */
  replace(): void;
};

export function createProgressSync(deps: SyncDeps): ProgressSync {
  // Nothing is saved before the first restore has read the copies: a fresh install's empty
  // progress, saved first, would be merged over nothing and then look like the truth.
  let restored = false;

  const both = ({ cloud, keychain }: { cloud: string | null; keychain: string | null }): Progress =>
    mergeProgress(parseProgress(cloud) ?? EMPTY, parseProgress(keychain) ?? EMPTY);

  const write = (p: Progress, { cloud, keychain }: { cloud: string | null; keychain: string | null }) => {
    const a = parseProgress(cloud);
    const b = parseProgress(keychain);
    if (a && b && sameProgress(a, p) && sameProgress(b, p)) return;
    deps.writeStores(serializeProgress(p, deps.now()));
  };

  return {
    restore() {
      const raw = deps.readStores();
      const local = deps.readLocal();
      const merged = mergeProgress(local, both(raw));
      const back = {
        won: Math.max(0, merged.won - local.won),
        moons: Object.keys(merged.owned).length - Object.keys(local.owned).length,
        proofs: merged.proofs.length - local.proofs.length,
      };
      if (!sameProgress(merged, local)) deps.applyLocal(merged);
      restored = true;
      write(merged, raw);
      return back;
    },
    save() {
      if (!restored) return;
      const raw = deps.readStores();
      write(mergeProgress(deps.readLocal(), both(raw)), raw);
    },
    replace() {
      restored = true;
      deps.writeStores(serializeProgress(deps.readLocal(), deps.now()));
    },
  };
}
