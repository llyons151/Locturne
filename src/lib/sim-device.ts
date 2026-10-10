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

type Clock = { hour: number; minute: number; second?: number; year?: number; month?: number; day?: number };
type Schedule = { intervalStart: Clock; intervalEnd: Clock; repeats?: boolean };
type MonitorEvent = { familyActivitySelection: string; threshold: { hour: number; minute: number }; eventName: string };
type Action = { type: string; familyActivitySelectionId?: string; shieldId?: string };

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
const LIMIT_REACHED_AT_PREFIX = 'locturne.limitReachedAt.';
const PENDING_LISTS_KEY = 'locturne.pendingLists';
const HEARTBEAT_KEY = 'locturne.heartbeat';
const HEARTBEAT_KEEP = 100;
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
    /**
     * What the extension did with the last night window's start: shielded the bedtime list,
     * skipped it (a night off, which wakes the list), or ignored it (changes nothing).
     */
    lastWindow: null as 'shield' | 'skip' | 'ignore' | null,
    /**
     * iOS's cap on monitored activities (about 20): a new one past it is refused. Null (the
     * default) for no cap.
     */
    cap: null as number | null,
    /** Registrations finish after a turn of the event loop, as the real bridge's do. */
    asyncRegistration: false,
    nativeGeneration: 0,
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

  /**
   * The first instant whose local wall clock reads at least this date and time. A time the
   * spring clock change skips (02:30 when 02:00 jumps to 03:00) fires at the end of the gap
   * (03:00), as Calendar's next-time matching does, not where JavaScript dates put it (03:30).
   */
  function wallInstant(y: number, mo: number, d: number, h: number, mi: number, sec: number): number {
    const wanted = Date.UTC(y, mo, d, h, mi, sec);
    const wall = (t: number) => {
      const x = new Date(t);
      return Date.UTC(x.getFullYear(), x.getMonth(), x.getDate(), x.getHours(), x.getMinutes(), x.getSeconds());
    };
    const naive = new Date(y, mo, d, h, mi, sec).getTime();
    if (wall(naive) === wanted) return naive;
    // Skipped: search the few hours before for where the wall clock first passes it.
    let lo = naive - 4 * 3_600_000;
    let hi = naive;
    while (hi - lo > 1000) {
      const mid = Math.floor((lo + hi) / 2);
      if (wall(mid) >= wanted) hi = mid;
      else lo = mid;
    }
    return hi;
  }

  /** Where an interval starting on local day `day` (at 00:00) starts and ends, as real instants. */
  function occurrence(schedule: Schedule, day: Date) {
    const { intervalStart: a, intervalEnd: b } = schedule;
    const start = wallInstant(day.getFullYear(), day.getMonth(), day.getDate(), a.hour, a.minute, a.second ?? 0);
    // A one-off with a full end date (the list settle) ends then, even before its start.
    if (!schedule.repeats && b.year !== undefined && b.month !== undefined && b.day !== undefined) {
      return { start, end: wallInstant(b.year, b.month - 1, b.day, b.hour, b.minute, b.second ?? 0) };
    }
    const crosses = b.hour * 3600 + b.minute * 60 + (b.second ?? 0) <= a.hour * 3600 + a.minute * 60 + (a.second ?? 0);
    const end = wallInstant(day.getFullYear(), day.getMonth(), day.getDate() + (crosses ? 1 : 0), b.hour, b.minute, b.second ?? 0);
    return { start, end };
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
    setWebContentFilterPolicy: () => {},
    clearWebContentFilterPolicy: () => {},
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
      if (s.asyncRegistration) await Promise.resolve();
      if (s.cap !== null && !s.monitored.has(name) && s.monitored.size >= s.cap) throw new Error('excessiveActivities');
      const t = now();
      const m: Monitored = { name, schedule: copy(schedule), events: copy(events), registeredAt: t };
      // A one-off with a date (the list settle) runs on that day; without one (Block now), today.
      const a = schedule.intervalStart;
      if (!schedule.repeats) m.once = occurrence(schedule, a.year !== undefined && a.month !== undefined && a.day !== undefined ? new Date(a.year, a.month - 1, a.day) : new Date(t));
      // iOS refuses an interval that ends before it starts.
      if (m.once && m.once.end <= m.once.start) throw new Error('invalidDateComponents');
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

  /** Local midnight of the day `t` falls on, like `calendar.startOfDay(for:)`. */
  const startOfDay = (t: number) => {
    const d = new Date(t);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  };

  /** A limit's minutes from `locturne.limits`, if it's there with a number. */
  function limitMinutes(id: string): number | undefined {
    const minutes = (get<{ id?: unknown; minutes?: unknown }[]>(LIMITS_KEY) ?? []).find((l) => l.id === id)?.minutes;
    return typeof minutes === 'number' ? minutes : undefined;
  }

  /**
   * `locturneLimitUsedUpToday`: by the moment it was used up, against local midnight `t`, at
   * least the limit's minutes after it (#126) and less than 26 h ahead (#127). A mark without
   * the moment goes by the day (#124).
   */
  function limitUsedUpToday(id: string, t = now()): boolean {
    const at = get<unknown>(`${LIMIT_REACHED_AT_PREFIX}${id}`);
    if (typeof at === 'number') {
      const minutes = limitMinutes(id) ?? 0;
      return at >= startOfDay(t) + minutes * 60_000 && at < t + 26 * 60 * 60_000;
    }
    return get<string>(`${LIMIT_REACHED_PREFIX}${id}`) === dayKey(new Date(t));
  }

  /** `locturneLimitThresholdIsStale`: N minutes can't be used in under N minutes of today. */
  function limitThresholdIsStale(id: string, t = now()): boolean {
    const minutes = limitMinutes(id);
    if (minutes === undefined) return false;
    return t - startOfDay(t) < minutes * 60_000;
  }

  /** `reapplyLocturneBlocks`. */
  function reapply() {
    if (get<boolean>(STOOD_DOWN_KEY) === true) return;
    const held = ['always'];
    if (get<boolean>(NIGHT_HELD_KEY) === true) held.push('night');
    const nap = get<{ end: number; list: string }>(NAP_KEY);
    if (nap && typeof nap.end === 'number' && typeof nap.list === 'string' && now() < nap.end) held.push(nap.list);
    for (const limit of get<{ id?: unknown }[]>(LIMITS_KEY) ?? []) {
      if (typeof limit.id === 'string' && limitUsedUpToday(limit.id)) held.push(limit.id);
    }
    for (const id of held) block(id);
  }

  /**
   * `recordLocturneHeartbeat`: the extension's log in the App Group, newest first, which the
   * app's self-check (heartbeat.ts) reads and `locturneNightWindowRan` searches.
   */
  function recordHeartbeat(activity: string, callback: string) {
    const entry = {
      activity,
      callback,
      at: Math.round(now()),
      shielded: s.shielded.size > 0,
      nightPicked: appsOfId('night').length > 0,
    };
    const earlier = get<unknown[]>(HEARTBEAT_KEY);
    set(HEARTBEAT_KEY, [entry, ...(Array.isArray(earlier) ? earlier.slice(0, HEARTBEAT_KEEP - 1) : [])]);
  }

  /** `locturneNightWindowRan`: did any night window start since `since`? From the heartbeat log. */
  function nightWindowRan(since: number): boolean {
    const log = get<unknown[]>(HEARTBEAT_KEY);
    return (Array.isArray(log) ? log : []).some((raw) => {
      const e = raw as { activity?: unknown; callback?: unknown; at?: unknown } | null;
      return (
        !!e &&
        typeof e.activity === 'string' &&
        typeof e.at === 'number' &&
        e.activity.startsWith(NIGHT_PREFIX) &&
        (e.callback === 'intervalDidStart' || e.callback === 'scheduleHandoff') &&
        e.at >= since
      );
    });
  }

  /** `settleLocturneLists`, with its two minutes' slack. */
  function settleLists() {
    const pending = get<Record<string, { from: number; empty?: boolean }>>(PENDING_LISTS_KEY);
    if (!pending) return;
    const t = now() + 120_000;
    let changed = false;
    for (const [list, entry] of Object.entries(pending)) {
      // A daily limit's picks wait for the app (`settleLocturneLists`).
      if (list.startsWith(LIMIT_PREFIX)) continue;
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
      // An early callback after midnight still belongs to the preceding evening.
      const afterMidnight = minute < times.morningStart;
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

  const appArmingKey = 'locturne.nightArmingAt';
  const nativeArmingKey = 'locturne.nativeNightArmingAt';
  const nativePrefix = 'night-native-';
  type NativeRoutine = { bedtime: number; morningStart: number; activeNights: number[] };
  type NativeArmed = NativeRoutine & { armedAt: string; since?: string; timesSince?: string; nativeWindowPrefix?: string; windows: number };

  function armingRecently(key: string) {
    const at = get<number>(key);
    return typeof at === 'number' && now() - at >= 0 && now() - at < 120_000;
  }

  function obsoleteNightCallback(activity: string) {
    if (!activity.startsWith(NIGHT_PREFIX)) return false;
    if (armingRecently(nativeArmingKey)) return true;
    if (armingRecently(appArmingKey)) return activity.startsWith(nativePrefix);
    const prefix = get<NativeArmed>(ARMED_KEY)?.nativeWindowPrefix;
    return prefix ? !activity.startsWith(prefix) : activity.startsWith(nativePrefix);
  }

  function nightEdges(times: { bedtime: number; morningStart: number }) {
    const length = (times.morningStart - times.bedtime + 1440) % 1440;
    if (length < 15) return [];
    const count = Math.min(16, Math.max(1, Math.floor(length / 15)), Math.ceil(length / 45));
    const edge = (i: number) => (times.bedtime + Math.round(i * length / count)) % 1440;
    return Array.from({ length: count }, (_, i) => ({ start: edge(i), end: edge(i + 1) }));
  }

  function stopGeneration(prefix: string) {
    const names = [...s.monitored.keys()].filter((name) => name.startsWith(prefix));
    exports.stopMonitoring(names);
    for (const name of new Set([...names, ...Array.from({ length: 16 }, (_, i) => `${prefix}${i}`)])) {
      for (const callback of ['intervalDidStart', 'intervalDidEnd', 'intervalWillStartWarning', 'intervalWillEndWarning']) {
        s.actions.delete(`actions_for_${name}_${callback}`);
        delete s.store[`events_${name}_${callback}`];
      }
    }
  }

  function installNativeNight(times: { bedtime: number; morningStart: number }, prefix: string, before: NativeArmed) {
    const windows = nightEdges(times);
    if (s.monitored.size + windows.length > 20 && s.monitored.has('locturne-settle')) {
      s.monitored.delete('locturne-settle');
      delete s.store['locturne.settleAt'];
    }
    if (s.monitored.size + windows.length > 20) throw new Error('noRoom');
    const clock = (m: number) => ({ hour: Math.floor(m / 60), minute: m % 60 });
    windows.forEach((window, i) => {
      if (get(STOOD_DOWN_KEY) === true || armingRecently(appArmingKey) || !handoffStillOwned(before)) throw new Error('cancelled');
      const name = `${prefix}${i}`;
      s.actions.set(`actions_for_${name}_intervalDidStart`, [{ type: 'blockSelection', familyActivitySelectionId: 'night', shieldId: 'locturne-night' }]);
      // Native DeviceActivityCenter is synchronous; the app bridge alone is async.
      const monitored: Monitored = { name, schedule: { intervalStart: clock(window.start), intervalEnd: clock(window.end), repeats: true }, events: [], registeredAt: now() };
      if (s.cap !== null && s.monitored.size >= s.cap) throw new Error('excessiveActivities');
      s.monitored.set(name, monitored);
      if (s.startsOnRegister && insideNow(monitored, now())) intervalDidStart(name);
    });
    if (get(STOOD_DOWN_KEY) === true || armingRecently(appArmingKey) || !handoffStillOwned(before)) throw new Error('cancelled');
    const changed = before.bedtime !== times.bedtime || before.morningStart !== times.morningStart;
    const at = new Date(now()).toISOString();
    set(ARMED_KEY, { ...before, ...times, windows: windows.length, since: before.since ?? before.armedAt ?? at,
      armedAt: changed ? at : before.armedAt ?? at,
      ...(changed ? { timesSince: at } : {}), nativeWindowPrefix: prefix });
  }

  function handoffStillOwned(before: NativeArmed) {
    return JSON.stringify(get(ARMED_KEY)) === JSON.stringify(before);
  }

  function releaseUnrunMorning(target: NativeRoutine, prior: NativeRoutine | undefined, from: number) {
    const d = new Date(now());
    const minute = minuteOf(d);
    const offset = target.bedtime < target.morningStart ? (minute >= target.bedtime ? 0 : -1) : (minute >= target.bedtime ? 1 : 0);
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate() + offset);
    const instant = (minute: number, offset = 0) => wallInstant(day.getFullYear(), day.getMonth(), day.getDate() + offset, Math.floor(minute / 60), minute % 60, 0);
    if (instant(target.morningStart) > from) return;
    const evening = new Date(day.getFullYear(), day.getMonth(), day.getDate() - 1).getDay();
    if (prior && prior.activeNights.includes(evening) && instant(prior.bedtime, prior.bedtime < prior.morningStart ? 0 : -1) < from) return;
    set(NIGHT_HELD_KEY, false);
    unblock('night');
  }

  function applyHandoffNight() {
    const times = nightTimes();
    if (!times || !inside(minuteOf(new Date(now())), times)) return;
    const window = windowNight();
    const held = nightIsOn(window.evening) && !subscriptionLapsed(window.evening);
    set(NIGHT_HELD_KEY, held);
    if (!held) unblock('night');
  }

  function handoffNight() {
    const before = get<NativeArmed>(ARMED_KEY);
    const stored = get<{ active: NativeRoutine; pending?: { routine: NativeRoutine; from: number }; since?: number; prior?: NativeRoutine }>(ROUTINE_KEY);
    if (get(STOOD_DOWN_KEY) === true || armingRecently(appArmingKey) || armingRecently(nativeArmingKey) || !before || !stored) return false;
    let target: NativeRoutine, prior: NativeRoutine | undefined, from: number;
    if (stored.pending) {
      if (!(stored.pending.from <= now() + 120_000)) return false;
      ({ routine: target, from } = stored.pending);
      prior = stored.active;
    } else {
      if (stored.since === undefined || !(Date.parse(before.armedAt) < stored.since)) return false;
      target = stored.active; prior = stored.prior; from = stored.since;
    }
    const start = (t: { bedtime: number; morningStart: number }) => t.bedtime < t.morningStart ? t.bedtime : t.bedtime - 1440;
    const disjoint = Math.max(start(before), start(target)) >= Math.min(before.morningStart, target.morningStart);
    if (!disjoint || !nightEdges(target).length || !Array.isArray(target.activeNights)) return false;
    set(nativeArmingKey, now());
    const prefix = `${nativePrefix}${++s.nativeGeneration}-`;
    try {
      stopGeneration(NIGHT_PREFIX);
      try {
        installNativeNight(target, prefix, before);
        delete s.store['locturne.nativeNightArmingError'];
        releaseUnrunMorning(target, prior, from);
        applyHandoffNight();
      } catch {
        stopGeneration(prefix);
        if (get(STOOD_DOWN_KEY) === true || armingRecently(appArmingKey) || !handoffStillOwned(before)) return true;
        const rollback = `${nativePrefix}${++s.nativeGeneration}-`;
        try { installNativeNight(before, rollback, before); applyHandoffNight(); }
        catch {
          stopGeneration(rollback);
          if (get(STOOD_DOWN_KEY) === true || armingRecently(appArmingKey) || !handoffStillOwned(before)) return true;
          set(ARMED_KEY, before); applyHandoffNight();
        }
        set('locturne.nativeNightArmingError', now());
      }
    } finally { delete s.store[nativeArmingKey]; }
    return true;
  }

  // Shield words aren't modelled (`updateShield` is a no-op), so `restoreLocturneFallbackShield`
  // and the morning's `updateShield` are marked where the Swift calls them but do nothing.
  // `persistToUserDefaults` and `notifyAppWithName` are the library's and aren't modelled either.

  function intervalDidStart(activity: string) {
    if (obsoleteNightCallback(activity)) { s.lastWindow = 'ignore'; return; }
    // First, so a bedtime window shields the edited list, not the old one.
    settleLists();
    if (activity.startsWith(NIGHT_PREFIX) && handoffNight()) {
      s.lastWindow = 'ignore';
      reapply();
      recordHeartbeat(activity, 'scheduleHandoff');
      return;
    }

    // A limit's day starting, maybe a few seconds before midnight: yesterday's mark goes now
    // (#128). An arm in the middle of the day keeps its mark.
    if (activity.startsWith(LIMIT_PREFIX) && !limitUsedUpToday(activity, now() + 120_000)) {
      delete s.store[`${LIMIT_REACHED_PREFIX}${activity}`];
      delete s.store[`${LIMIT_REACHED_AT_PREFIX}${activity}`];
    }

    if (activity.startsWith(NIGHT_PREFIX)) {
      if (get(STOOD_DOWN_KEY) === true) {
        ignoreWindow(activity);
        return;
      }
      const window = windowNight();
      if (window.outside && nightWindowRan(window.bedtime)) {
        ignoreWindow(activity);
        return;
      }
      if (!nightIsOn(window.evening) || subscriptionLapsed(window.evening)) {
        if (insideNightInForce()) skipNight(activity);
        else ignoreWindow(activity);
        return;
      }
      set(NIGHT_HELD_KEY, true);
      s.lastWindow = 'shield';
    }

    execActions(activity, 'intervalDidStart');
    // (A limit's start: `restoreLocturneFallbackShield`, words only.)
    reapply();
    recordHeartbeat(activity, 'intervalDidStart');
  }

  /** `skipLocturneNight`: a night that's off releases the hold and wakes the bedtime list. */
  function skipNight(activity: string) {
    s.lastWindow = 'skip';
    set(NIGHT_HELD_KEY, false);
    unblock('night');
    // (`restoreLocturneFallbackShield`, words only.)
    reapply();
    recordHeartbeat(activity, 'intervalDidStart');
  }

  /** `ignoreLocturneWindow`: changes nothing, but is still noted in the heartbeat. */
  function ignoreWindow(activity: string) {
    if (activity.startsWith(NIGHT_PREFIX)) s.lastWindow = 'ignore';
    reapply();
    recordHeartbeat(activity, 'intervalDidStart');
  }

  function intervalDidEnd(activity: string) {
    if (obsoleteNightCallback(activity)) return;
    // A delayed prior end must not finish a replacement nap under the same name.
    const nap = get<{ end: number }>(NAP_KEY);
    if (activity === NAP_ACTIVITY && nap && nap.end > now() + 120_000) return;
    // The nap is over: forget it first, so the re-apply doesn't shield it again.
    if (activity === NAP_ACTIVITY) delete s.store[NAP_KEY];
    execActions(activity, 'intervalDidEnd');
    showMorningShield(activity);
    // (A nap's end: `restoreLocturneFallbackShield`, words only.)
    reapply();
    recordHeartbeat(activity, 'intervalDidEnd');
  }

  /**
   * `showLocturneMorningShield`: at the last window's end (morning start, give or take), a night
   * with no bedtime picks left (an emergency pause, a list emptied at bedtime) lets go of its
   * hold, held or not (#113, #114). A held night with picks gets the morning words.
   */
  function showMorningShield(activity: string) {
    const morningStart = get<{ morningStart?: unknown }>(ARMED_KEY)?.morningStart;
    if (!activity.startsWith(NIGHT_PREFIX) || typeof morningStart !== 'number') return;
    const sinceMorning = (minuteOf(new Date(now())) - Math.trunc(morningStart) + 1440) % 1440;
    if (!(sinceMorning <= 30 || sinceMorning >= 1440 - 5)) return;
    if (ids().night === undefined) {
      set(NIGHT_HELD_KEY, false);
      // (`restoreLocturneFallbackShield`, words only.)
      return;
    }
    if (get<boolean>(NIGHT_HELD_KEY) !== true) return;
    // (`updateShield` with the morning words, words only.)
  }

  function eventDidReachThreshold(activity: string) {
    if (get<boolean>(STOOD_DOWN_KEY) === true) return;
    // A daily limit is used up: the day and the moment (#124). Unless it's yesterday's,
    // delivered late (`locturneLimitThresholdIsStale`).
    const isLimit = activity.startsWith(LIMIT_PREFIX);
    if (isLimit && !(get<{ id: string }[]>(LIMITS_KEY) ?? []).some((limit) => limit.id === activity)) return;
    const stale = isLimit && limitThresholdIsStale(activity);
    if (isLimit && !stale) {
      set(`${LIMIT_REACHED_PREFIX}${activity}`, dayKey(new Date(now())));
      set(`${LIMIT_REACHED_AT_PREFIX}${activity}`, Math.round(now()));
    }
    if (!stale) execActions(activity, 'eventDidReachThreshold', 'used-up');
    reapply();
    recordHeartbeat(activity, 'eventDidReachThreshold');
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
        // A one-off registered ahead of its start (the list settle) starts then; Block now's
        // starts as it's registered, which the app handles itself.
        if (m.once.start > m.registeredAt) push(m.once.start, m.name, 'intervalDidStart');
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
    s.lastWindow = null;
    s.cap = null;
    s.asyncRegistration = false;
    s.nativeGeneration = 0;
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
