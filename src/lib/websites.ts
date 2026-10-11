/**
 * Websites typed in by hand, kept beside the bedtime and always lists. Apple's picker only offers
 * sites from Safari's history, so these are plain domains ("reddit.com") that iOS blocks with its
 * web content filter, in Safari and every app's web views. They sleep with their list: the always
 * list's all the time, the bedtime list's while the night holds it (`applyWebsiteFilter` in
 * screen-time.ts, and `reapplyLocturneBlocks` in the monitor extension: keep the two in step).
 *
 * The filter only blocks; it has no shield words or button, so iOS shows its own "restricted" page.
 *
 * Like the apps (GAME_PLAN), an added site sleeps at once and a removed one keeps sleeping until
 * the next bedtime (`looserEditsStartAt`): the removal waits in `SITES_PENDING_KEY` and is swapped
 * in here when the app opens after it (`settleSites`), or by the extension at the first interval
 * start after it (`settleLocturneSites`). Like a list's removal, it remembers when it was made
 * (`dated`, and `awake` for the bedtime list), so it moves with the apps when the windows or a
 * waiting routine edit change (`delaySiteChanges`, from `redateLooserEdits` in lock-controller.ts).
 */
import {
  bedtimeListAwakeAt,
  SETTLE_SLACK_MS,
  sharedGet,
  sharedSet,
  SITES_KEY,
  SITES_PENDING_KEY,
  type SiteList,
} from './screen-time.ts';

export type { SiteList };

/** iOS's web filter takes at most 50 domains at once, across every list. */
export const MAX_SITES = 50;

type Sites = Partial<Record<SiteList, string[]>>;
/** `dated`: when `from` was worked out. `awake`: for the bedtime list, whether it was awake then. */
type PendingSites = Partial<Record<SiteList, { sites: string[]; from: number; dated?: number; awake?: boolean }>>;

const live = (): Sites => sharedGet<Sites>(SITES_KEY) ?? {};
const pending = (): PendingSites => sharedGet<PendingSites>(SITES_PENDING_KEY) ?? {};

/**
 * The domain someone means by what they typed, or null if it can't be one: "https://www.Reddit.com/r/x"
 * is "reddit.com". iOS's filter also blocks every subdomain, so "www." is dropped.
 */
export function normalizeSite(input: string): string | null {
  let s = input.trim().toLowerCase();
  s = s.replace(/^[a-z][a-z0-9+.-]*:\/\//, '');
  s = s.split(/[/?#]/)[0];
  s = s.replace(/^[^@]*@/, '').replace(/:\d+$/, '');
  s = s.replace(/^www\d*\./, '').replace(/\.+$/, '');
  if (s.length > 253 || !s.includes('.')) return null;
  const labels = s.split('.');
  if (!labels.every((l) => /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(l))) return null;
  // A top-level domain is letters ("com", "co.uk"'s "uk"), or punycode.
  if (!/^([a-z]{2,63}|xn--[a-z0-9-]+)$/.test(labels[labels.length - 1])) return null;
  return s;
}

/** The sites as the person last chose them: a waiting removal's list, else the live one. */
export function getSites(list: SiteList): string[] {
  return pending()[list]?.sites ?? live()[list] ?? [];
}

/** Sites still asleep but already removed, waiting for `sitesChangeAt`. */
export function sitesWaking(list: SiteList): string[] {
  const shown = new Set(getSites(list));
  return (live()[list] ?? []).filter((s) => !shown.has(s));
}

/** When a list's removed sites wake, or null if none wait. */
export function sitesChangeAt(list: SiteList): Date | null {
  const waiting = pending()[list];
  return waiting ? new Date(waiting.from) : null;
}

/** Every domain the filter may hold: both lists, removals still asleep included. */
function allSites(): Set<string> {
  const all = new Set<string>();
  for (const list of ['night', 'always'] as const) {
    for (const s of live()[list] ?? []) all.add(s);
    for (const s of pending()[list]?.sites ?? []) all.add(s);
  }
  return all;
}

export type AddSiteResult = { ok: true; site: string } | { ok: false; reason: 'invalid' | 'duplicate' | 'full' };

/** Adds a site to a list. It sleeps straight away if the list does (only tightens). */
export function addSite(list: SiteList, input: string): AddSiteResult {
  const site = normalizeSite(input);
  if (!site) return { ok: false, reason: 'invalid' };
  if (getSites(list).includes(site)) return { ok: false, reason: 'duplicate' };
  if (!allSites().has(site) && allSites().size >= MAX_SITES) return { ok: false, reason: 'full' };
  const sites = live();
  if (!(sites[list] ?? []).includes(site)) sharedSet(SITES_KEY, { ...sites, [list]: [...(sites[list] ?? []), site] });
  const waiting = pending()[list];
  if (waiting) sharedSet(SITES_PENDING_KEY, { ...pending(), [list]: { ...waiting, sites: [...waiting.sites, site] } });
  return { ok: true, site };
}

/**
 * Removes a site from a list. It keeps sleeping until `takeEffectAt` (`looserEditsStartAt`), or
 * until removals already waiting land, whichever is later. A second removal never pulls a
 * waiting one forward, and keeps its `dated` and `awake` (as `finishListEdit` does for apps).
 */
export function removeSite(list: SiteList, site: string, takeEffectAt: Date, now = new Date()): void {
  const waiting = pending()[list];
  const sites = getSites(list).filter((s) => s !== site);
  const from = Math.max(waiting?.from ?? 0, takeEffectAt.getTime());
  const kept = !!waiting && waiting.from > takeEffectAt.getTime();
  const dated = kept ? waiting.dated : now.getTime();
  const awake = kept ? waiting.awake : list === 'night' && dated !== undefined ? bedtimeListAwakeAt(new Date(dated)) : undefined;
  const entry = { sites, from, ...(dated === undefined ? {} : { dated }), ...(awake === undefined ? {} : { awake }) };
  sharedSet(SITES_PENDING_KEY, { ...pending(), [list]: entry });
}

/**
 * Moves waiting removals to `dueAt(list, dated, awake, from)`, the rule `delayListChanges` applies
 * to the apps (screen-time.ts), so a removed site never wakes before the apps removed with it:
 * only ever later, unless `dueAt` says `earlier`, and never before now. Skips one the extension
 * may be settling (`SETTLE_SLACK_MS`) or saved without `dated` (an older build). Returns the
 * lists now due, for `settleSites`.
 */
export function delaySiteChanges(
  dueAt: (list: SiteList, dated: Date, awake: boolean | undefined, from: Date) => { at: Date; earlier?: boolean },
  now = new Date(),
): SiteList[] {
  const dueNow: SiteList[] = [];
  for (const list of Object.keys(pending()) as SiteList[]) {
    // Read again for each list: the monitor extension may have settled it a moment ago.
    const waiting = pending()[list];
    if (!waiting || waiting.dated === undefined || waiting.from <= now.getTime() + SETTLE_SLACK_MS) continue;
    const due = dueAt(list, new Date(waiting.dated), waiting.awake, new Date(waiting.from));
    const at = due.earlier ? Math.max(due.at.getTime(), now.getTime()) : due.at.getTime();
    if (at > waiting.from || (due.earlier && at < waiting.from)) {
      sharedSet(SITES_PENDING_KEY, { ...pending(), [list]: { ...waiting, from: at } });
      if (at <= now.getTime()) dueNow.push(list);
    }
  }
  return dueNow;
}

/** Swaps in each list's waiting removals whose time has come. Returns whether any did. */
export function settleSites(now = new Date()): boolean {
  const waiting = pending();
  const due = (Object.keys(waiting) as SiteList[]).filter((list) => waiting[list]!.from <= now.getTime());
  if (due.length === 0) return false;
  const sites = { ...live() };
  const rest = { ...waiting };
  for (const list of due) {
    sites[list] = rest[list]!.sites;
    delete rest[list];
  }
  sharedSet(SITES_KEY, sites);
  sharedSet(SITES_PENDING_KEY, rest);
  return true;
}
