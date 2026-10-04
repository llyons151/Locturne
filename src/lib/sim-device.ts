/**
 * A simulated iPhone for the multi-day lock simulation (lock-controller.sim.test.ts): a fake of
 * react-native-device-activity that keeps a real blocklist, iOS's scheduler for monitored
 * activities, and a port of the monitor extension (targets/ActivityMonitorExtension/
 * DeviceActivityMonitorExtension.swift) that runs with the app closed.
 *
 * Unlike fake-device-activity.ts, which only logs calls, this one answers "which apps are
 * shielded right now?" the way iOS would: one blocklist for the whole app, `blockSelection`
 * adds a list's apps to it and `unblockSelection` removes them, even apps another rule holds.
 * A selection token is the list's app names, comma-separated, so tests can read the picks.
 *
 * Use it before importing anything that imports screen-time.ts:
 *
 *   const device = simDevice();
 *   mock.module('react-native-device-activity', { namedExports: device.exports });
 *
 * The port of the extension mirrors the Swift as of this commit. If the Swift changes, change
 * `intervalDidStart`, `intervalDidEnd`, `eventDidReachThreshold` and the helpers below with it.
 */
import { assertPlist } from './fake-device-activity.ts';

type Clock = { hour: number; minute: number; second?: number };
type Schedule = { intervalStart: Clock; intervalEnd: Clock; repeats?: boolean };
type MonitorEvent = { familyActivitySelection: string; threshold: { hour: number; minute: number }; eventName: string };
type Action = { type: string; familyActivitySelectionId?: string };

export type Monitored = {
  name: string;
  schedule: Schedule;
  events: MonitorEvent[];
  registeredAt: number;
  /** A one-off interval (a nap): its real start and end. */
  once?: { start: number; end: number };
  /** The day (YYYY-MM-DD) the threshold event was last queued for this registration. */
  firedOn?: string;
  /** The day the extension last ran that event for this registration. */
  deliveredOn?: string;
};

export type Callback = 'intervalDidStart' | 'intervalDidEnd' | 'eventDidReachThreshold';
export type DueEvent = { at: number; activity: string; callback: Callback };

const NIGHT_PREFIX = 'night-';
const LIMIT_PREFIX = 'limit-';
const NAP_ACTIVITY = 'locturne-nap';
const NAP_KEY = 'locturne.nap';
const NIGHT_HELD_KEY = 'locturne.nightHeld';
const LIMITS_KEY = 'locturne.limits';
const LIMIT_REACHED_PREFIX = 'locturne.limitReached.';
const PENDING_LISTS_KEY = 'locturne.pendingLists';
const ROUTINE_KEY = 'locturne.routine';
const STOOD_DOWN_KEY = 'locturne.stoodDown';
const ARMED_KEY = 'locturne.armedNight';
const SUBSCRIPTION_ENDED_KEY = 'locturne.subscriptionEnded';
const ENDED_MORNING_KEY = 'locturne.subscriptionEndedMorning';
const IDS_KEY = 'familyActivitySelectionIds';

/** YYYY-MM-DD in local time, like `dateKey` in lock-state.ts and `locturneDayKey` in Swift. */
export function dayKey(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

export const token = (apps: Iterable<string>) => [...new Set(apps)].sort().join(',');
export const appsOf = (tok: string | undefined) => (tok ? tok.split(',').filter(Boolean) : []);

/** Property lists are copies: nothing read back aliases what was written. */
const copy = <T>(value: T): T => (value === undefined ? value : (JSON.parse(JSON.stringify(value)) as T));

export function simDevice() {
  const s = {
    store: {} as Record<string, unknown>,
    /** iOS's one blocklist: the app names shielded right now. */
    shielded: new Set<string>(),
    monitored: new Map<string, Monitored>(),
    actions: new Map<string, Action[]>(),
    /** Callbacks iOS runs straight after the app's call returns (a registration inside its interval). */
    queue: [] as { activity: string; callback: Callback }[],
    /** Minutes each limit's apps were used, by `${day}|${limitId}`. */
    usage: new Map<string, number>(),
    /** iOS runs a repeating interval's start as soon as it's registered inside it. */
    startsOnRegister: true,
    /** Every callback the extension ran, for the reproduction log. */
    trace: [] as string[],
  };

  const ids = (): Record<string, string> => (s.store[IDS_KEY] ??= {}) as Record<string, string>;
  const appsOfId = (id: string) => appsOf(ids()[id]);
  const block = (id: string) => appsOfId(id).forEach((a) => s.shielded.add(a));
  const unblock = (id: string) => appsOfId(id).forEach((a) => s.shielded.delete(a));
  const get = <T>(key: string) => copy(s.store[key]) as T | undefined;
  const set = (key: string, value: unknown) => {
    assertPlist(value, key);
    s.store[key] = copy(value);
  };
  const now = () => Date.now();

  /** Where an interval starting on local day `day` (at 00:00) starts and ends, as real instants. */
  function occurrence(schedule: Schedule, day: Date) {
    const { intervalStart: a, intervalEnd: b } = schedule;
    const start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), a.hour, a.minute, a.second ?? 0);
    const crosses = b.hour * 3600 + b.minute * 60 + (b.second ?? 0) <= a.hour * 3600 + a.minute * 60 + (a.second ?? 0);
    const end = new Date(day.getFullYear(), day.getMonth(), day.getDate() + (crosses ? 1 : 0), b.hour, b.minute, b.second ?? 0);
    return { start: start.getTime(), end: end.getTime() };
  }

  function insideNow(m: Monitored, t: number): boolean {
    if (m.once) return t >= m.once.start && t < m.once.end;
    const today = new Date(t);
    for (const offset of [-1, 0]) {
      const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset);
      const o = occurrence(m.schedule, day);
      if (t >= o.start && t < o.end) return true;
    }
    return false;
  }

  /** Has a limit's usage today reached a threshold iOS was given? Queues the event if so. */
  function checkThreshold(m: Monitored) {
    if (!m.name.startsWith(LIMIT_PREFIX) || !m.events.length) return;
    const today = dayKey(new Date(now()));
    if (m.firedOn === today) return;
    const used = s.usage.get(`${today}|${m.name}`) ?? 0;
    const { hour, minute } = m.events[0].threshold;
    if (used >= hour * 60 + minute) {
      m.firedOn = today;
      s.queue.push({ activity: m.name, callback: 'eventDidReachThreshold' });
    }
  }

  const exports = {
    AuthorizationStatus: { notDetermined: 0, denied: 1, approved: 2 },
    isAvailable: () => true,
    getAuthorizationStatus: () => 2,
    requestAuthorization: async () => {},
    pollAuthorizationStatus: async () => 2,
    onAuthorizationStatusChange: () => ({ remove: () => {} }),
    getFamilyActivitySelectionId: (id: string) => ids()[id],
    setFamilyActivitySelectionId: ({ id, familyActivitySelection }: { id: string; familyActivitySelection: string }) => {
      set(IDS_KEY, { ...ids(), [id]: familyActivitySelection });
    },
    activitySelectionMetadata: ({ activitySelectionId }: { activitySelectionId: string }) => ({
      applicationCount: appsOfId(activitySelectionId).length,
      categoryCount: 0,
      webdomainCount: 0,
      includeEntireCategory: false,
    }),
    intersection: (a: { activitySelectionId: string }, b: { activitySelectionId: string }) => {
      const other = new Set(appsOfId(b.activitySelectionId));
      return {
        applicationCount: appsOfId(a.activitySelectionId).filter((app) => other.has(app)).length,
        categoryCount: 0,
        webdomainCount: 0,
        includeEntireCategory: false,
      };
    },
    union: (
      a: { activitySelectionId: string },
      b: { activitySelectionId: string },
      options?: { persistAsActivitySelectionId?: string },
    ) => {
      const tok = token([...appsOfId(a.activitySelectionId), ...appsOfId(b.activitySelectionId)]);
      if (options?.persistAsActivitySelectionId) set(IDS_KEY, { ...ids(), [options.persistAsActivitySelectionId]: tok });
      return undefined;
    },
    blockSelection: ({ activitySelectionId }: { activitySelectionId: string }) => block(activitySelectionId),
    unblockSelection: ({ activitySelectionId }: { activitySelectionId: string }) => unblock(activitySelectionId),
    isShieldActive: () => s.shielded.size > 0,
    updateShield: () => {},
    updateShieldWithId: () => {},
    configureActions: ({
      activityName,
      callbackName,
      eventName,
      actions,
    }: {
      activityName: string;
      callbackName: string;
      eventName?: string;
      actions: Action[];
    }) => {
      s.actions.set(`actions_for_${activityName}_${callbackName}${eventName ? `_${eventName}` : ''}`, copy(actions));
    },
    startMonitoring: async (name: string, schedule: Schedule, events: MonitorEvent[]) => {
      const t = now();
      const m: Monitored = { name, schedule: copy(schedule), events: copy(events), registeredAt: t };
      if (!schedule.repeats) m.once = occurrence(schedule, new Date(t));
      s.monitored.set(name, m);
      if (s.startsOnRegister && schedule.repeats && insideNow(m, t)) {
        s.queue.push({ activity: name, callback: 'intervalDidStart' });
      }
      checkThreshold(m);
    },
    stopMonitoring: (names?: string[]) => {
      for (const name of names ?? [...s.monitored.keys()]) s.monitored.delete(name);
    },
    cleanUpAfterActivity: (name: string) => {
      for (const key of [...s.actions.keys()]) if (key.startsWith(`actions_for_${name}`)) s.actions.delete(key);
    },
    getActivities: () => [...s.monitored.keys()],
    getEvents: () => [],
    // Like the real bridge: a missing key is null, not undefined.
    userDefaultsGet: (key: string) => get(key) ?? null,
    userDefaultsSet: (key: string, value: unknown) => set(key, value),
    userDefaultsRemove: (key: string) => {
      delete s.store[key];
    },
  };

  /* The monitor extension, ported from DeviceActivityMonitorExtension.swift. */

  function execActions(activity: string, callback: string, eventName?: string) {
    const actions = s.actions.get(`actions_for_${activity}_${callback}${eventName ? `_${eventName}` : ''}`) ?? [];
    for (const action of actions) {
      if (!action.familyActivitySelectionId) continue;
      if (action.type === 'blockSelection') block(action.familyActivitySelectionId);
      else if (action.type === 'unblockSelection') unblock(action.familyActivitySelectionId);
    }
  }

  /** `reapplyLocturneBlocks`. */
  function reapply() {
    if (get<boolean>(STOOD_DOWN_KEY) === true) return;
    const held = ['always'];
    if (get<boolean>(NIGHT_HELD_KEY) === true) held.push('night');
    const nap = get<{ end: number; list: string }>(NAP_KEY);
    if (nap && now() < nap.end) held.push(nap.list);
    const today = dayKey(new Date(now()));
    for (const limit of get<{ id: string }[]>(LIMITS_KEY) ?? []) {
      if (get<string>(`${LIMIT_REACHED_PREFIX}${limit.id}`) === today) held.push(limit.id);
    }
    for (const id of held) block(id);
  }

  /** `settleLocturneLists`, with its two minutes' slack. */
  function settleLists() {
    const pending = get<Record<string, { from: number; empty?: boolean }>>(PENDING_LISTS_KEY);
    if (!pending) return;
    const t = now() + 120_000;
    let changed = false;
    for (const [list, entry] of Object.entries(pending)) {
      if (!(entry.from <= t)) continue;
      const next = ids()[`${list}-next`];
      if (next !== undefined || entry.empty === true) {
        if (ids()[list] !== undefined) unblock(list);
        const all = { ...ids() };
        if (next !== undefined) all[list] = next;
        else delete all[list];
        delete all[`${list}-next`];
        set(IDS_KEY, all);
      }
      delete pending[list];
      changed = true;
    }
    if (changed) set(PENDING_LISTS_KEY, pending);
  }

  type Times = { bedtime?: number; morningStart?: number };
  const timesOf = (t: Times | undefined) =>
    t?.bedtime !== undefined && t.morningStart !== undefined ? { bedtime: t.bedtime, morningStart: t.morningStart } : null;
  const minuteOf = (d: Date) => d.getHours() * 60 + d.getMinutes();
  const inside = (minute: number, t: { bedtime: number; morningStart: number }) => {
    const length = (t.morningStart - t.bedtime + 1440) % 1440;
    const since = (minute - t.bedtime + 1440) % 1440;
    return since < length || since >= 1440 - 2;
  };

  /** `locturneNightTimes`: the armed times the windows were laid out from, else the routine's. */
  function nightTimes() {
    return timesOf(get<Times>(ARMED_KEY)) ?? timesOf(get<{ active?: Times }>(ROUTINE_KEY)?.active);
  }

  /** `locturneRoutineInForce`: a waiting edit once due (two minutes early), else the active one. */
  function routineInForce(): (Times & { activeNights?: number[] }) | undefined {
    type R = Times & { activeNights?: number[] };
    const stored = get<{ active?: R; pending?: { from?: number; routine?: R } }>(ROUTINE_KEY);
    if (stored?.pending?.from !== undefined && stored.pending.from <= now() + 120_000 && stored.pending.routine) {
      return stored.pending.routine;
    }
    return stored?.active;
  }

  /** `locturneInsideNightInForce`. */
  function insideNightInForce(): boolean {
    const t = timesOf(routineInForce());
    return t ? inside(minuteOf(new Date(now())), t) : true;
  }

  /** `locturneWindowNight`: the evening a window starting now belongs to, by the armed times. */
  function windowNight(): { evening: Date; outside: boolean; bedtime: number } {
    const t = now();
    const d = new Date(t);
    const minute = minuteOf(d);
    const day = (offset: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + offset, d.getHours(), d.getMinutes());
    const times = nightTimes();
    if (!times) return { evening: d, outside: false, bedtime: t };
    const length = (times.morningStart - times.bedtime + 1440) % 1440;
    const since = (minute - times.bedtime + 1440) % 1440;
    const early = since >= 1440 - 2;
    if (since < length || early) {
      const afterMidnight = minute < times.morningStart && !early;
      return { evening: afterMidnight ? day(-1) : d, outside: false, bedtime: t - (early ? 0 : since * 60_000) };
    }
    const sinceMorning = (minute - times.morningStart + 1440) % 1440;
    return {
      evening: minute >= times.morningStart ? day(-1) : day(-2),
      outside: true,
      bedtime: t - (sinceMorning + length + 60) * 60_000,
    };
  }

  /** `locturneNightIsOn`: is the night of `evening` switched on? */
  function nightIsOn(evening: Date): boolean {
    const nights = routineInForce()?.activeNights;
    return nights ? nights.includes(evening.getDay()) : true;
  }

  /** `locturneSubscriptionLapsed`: did the subscription end before the night of `evening`? */
  function subscriptionLapsed(evening: Date): boolean {
    const ended = get<string>(ENDED_MORNING_KEY);
    if (get(SUBSCRIPTION_ENDED_KEY) === undefined || ended === undefined) return false;
    return dayKey(new Date(evening.getFullYear(), evening.getMonth(), evening.getDate() + 1)) > ended;
  }

  /** When each night window started, for `locturneNightWindowRan` (the heartbeat log). */
  const nightStarts: number[] = [];

  function intervalDidStart(activity: string) {
    settleLists();
    if (activity.startsWith(NIGHT_PREFIX)) {
      if (get(STOOD_DOWN_KEY) === true) {
        reapply();
        return;
      }
      const window = windowNight();
      const ran = nightStarts.some((at) => at >= window.bedtime);
      nightStarts.push(now());
      // `ignoreLocturneWindow`: changes nothing.
      if (window.outside && ran) {
        reapply();
        return;
      }
      if (!nightIsOn(window.evening) || subscriptionLapsed(window.evening)) {
        if (insideNightInForce()) {
          // `skipLocturneNight`
          set(NIGHT_HELD_KEY, false);
          unblock('night');
        }
        reapply();
        return;
      }
      set(NIGHT_HELD_KEY, true);
    }
    execActions(activity, 'intervalDidStart');
    reapply();
  }

  function intervalDidEnd(activity: string) {
    if (activity === NAP_ACTIVITY) delete s.store[NAP_KEY];
    execActions(activity, 'intervalDidEnd');
    reapply();
  }

  function eventDidReachThreshold(activity: string) {
    // `locturneLimitThresholdIsStale`: N minutes can't be used in under N minutes of today.
    const limit = (get<{ id: string; minutes: number }[]>(LIMITS_KEY) ?? []).find((l) => l.id === activity);
    const t = new Date(now());
    const sinceMidnight = t.getTime() - new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime();
    const stale = limit !== undefined && sinceMidnight < limit.minutes * 60_000;
    if (activity.startsWith(LIMIT_PREFIX) && !stale) set(`${LIMIT_REACHED_PREFIX}${activity}`, dayKey(t));
    if (!stale) execActions(activity, 'eventDidReachThreshold', 'used-up');
    reapply();
  }

  /** Runs one callback in the extension, if iOS is still monitoring the activity. */
  function fire(activity: string, callback: Callback) {
    if (!s.monitored.has(activity)) return;
    s.trace.push(`${new Date(now()).toISOString()} ${activity} ${callback}`);
    if (callback === 'intervalDidStart') intervalDidStart(activity);
    else if (callback === 'intervalDidEnd') intervalDidEnd(activity);
    else {
      s.monitored.get(activity)!.deliveredOn = dayKey(new Date(now()));
      eventDidReachThreshold(activity);
    }
  }

  /** The callbacks iOS would run in (t0, t1], in order: ends before starts at the same instant. */
  function dueEvents(t0: number, t1: number): DueEvent[] {
    const due: DueEvent[] = [];
    const push = (at: number, activity: string, callback: Callback) => {
      if (at > t0 && at <= t1) due.push({ at, activity, callback });
    };
    for (const m of s.monitored.values()) {
      if (m.once) {
        push(m.once.end, m.name, 'intervalDidEnd');
        continue;
      }
      const first = new Date(t0);
      for (let i = -1; ; i++) {
        const day = new Date(first.getFullYear(), first.getMonth(), first.getDate() + i);
        if (day.getTime() > t1) break;
        const o = occurrence(m.schedule, day);
        if (o.start >= m.registeredAt) push(o.start, m.name, 'intervalDidStart');
        push(o.end, m.name, 'intervalDidEnd');
      }
    }
    const rank = (c: Callback) => (c === 'intervalDidEnd' ? 0 : c === 'intervalDidStart' ? 1 : 2);
    return due.sort((a, b) => a.at - b.at || rank(a.callback) - rank(b.callback) || a.activity.localeCompare(b.activity));
  }

  /** Someone used a limit's apps for `minutes` (only possible while none of them is shielded). */
  function use(limitId: string, minutes: number): boolean {
    const apps = appsOfId(limitId);
    if (!apps.length || apps.some((a) => s.shielded.has(a))) return false;
    const t = new Date(now());
    const key = `${dayKey(t)}|${limitId}`;
    // Like a real phone: no more use today than time since midnight.
    const sinceMidnight = (t.getTime() - new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime()) / 60_000;
    s.usage.set(key, Math.min((s.usage.get(key) ?? 0) + minutes, Math.floor(sinceMidnight)));
    const m = s.monitored.get(limitId);
    if (m) checkThreshold(m);
    return true;
  }

  function reset() {
    s.store = {};
    s.shielded.clear();
    s.monitored.clear();
    s.actions.clear();
    s.queue.length = 0;
    s.usage.clear();
    s.trace.length = 0;
    nightStarts.length = 0;
  }

  return { state: s, exports, ids, appsOfId, fire, dueEvents, use, reset, get };
}

/** A small seeded PRNG (mulberry32), so every run replays exactly from its seed. */
export function prng(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1)),
    chance: (p: number) => next() < p,
    pick: <T>(items: readonly T[]): T => items[Math.floor(next() * items.length)],
    subset: <T>(items: readonly T[], min = 0): T[] => {
      const out = items.filter(() => next() < 0.5);
      while (out.length < min) {
        const item = items[Math.floor(next() * items.length)];
        if (!out.includes(item)) out.push(item);
      }
      return out;
    },
  };
}

/** A stable hash of a string to [0, 1), for decisions that must replay without the PRNG (dropped events). */
export function hash01(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967296;
}
