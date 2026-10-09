/**
 * The monitor extension's heartbeat: a short log, kept in the App Group, of every time iOS
 * ran one of its callbacks. It's how the app learns, the next morning, whether the bedtime
 * block really ran while it was closed. The nightly self-check (`health.ts`) reads it.
 *
 * The Swift side writes it (`recordLocturneHeartbeat` in
 * targets/ActivityMonitorExtension/DeviceActivityMonitorExtension.swift). Keep the key, the
 * entry shape and `HEARTBEAT_KEEP` in step with it.
 */
import { getEmergencyLog } from './emergency.ts';
import { lapseGaps, lastPaidMorning } from './lock-controller.ts';
import { checkNights, heartbeatCoverage, type NightCheck } from './health.ts';
import { getRoutine, getRoutineChange } from './routine.ts';
import { getArmedNight, isScreenTimeAvailable, sharedGet, sharedSet, windowStarts } from './screen-time.ts';

export type Heartbeat = {
  /** The DeviceActivity name: `night-3`, `limit-0`, `locturne-nap`. */
  activity: string;
  /** `intervalDidStart`, `intervalDidEnd`, `eventDidReachThreshold`, or a warning. */
  callback: string;
  /** When the extension ran, in ms. */
  at: number;
  /**
   * Whether any shield was up once the callback had finished. Null for entries recovered
   * from the library's own event log, which doesn't record it.
   */
  shielded: boolean | null;
  /** Whether the bedtime list had any apps. Missing from entries written before it existed. */
  nightPicked?: boolean | null;
};

export const HEARTBEAT_KEY = 'locturne.heartbeat';
/** About four nights of 16 windows plus daily limits, at roughly 100 bytes each. */
export const HEARTBEAT_KEEP = 100;

function isHeartbeat(value: unknown): value is Heartbeat {
  const h = value as Heartbeat | null;
  return !!h && typeof h.activity === 'string' && typeof h.callback === 'string' && typeof h.at === 'number';
}

function toBool(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  return null;
}

/** The extension's log, newest first. Anything malformed is skipped rather than trusted. */
export function getHeartbeats(): Heartbeat[] {
  const raw = sharedGet<unknown[]>(HEARTBEAT_KEY);
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(isHeartbeat)
    // A Swift Bool can cross the bridge as 0 or 1.
    .map((h) => ({ ...h, shielded: toBool(h.shielded as unknown), nightPicked: toBool(h.nightPicked as unknown) }))
    .sort((a, b) => b.at - a.at);
}

/**
 * The heartbeat log plus each night window's last start from the library's own event log.
 * The library only keeps the latest call per window, but it predates the heartbeat, so a
 * build without the new extension still shows something. Duplicates are dropped.
 */
export function getAllHeartbeats(log = getHeartbeats()): Heartbeat[] {
  if (!isScreenTimeAvailable()) return log;
  // The two logs are written a moment apart in the same callback, so match within a minute.
  const logged = (h: Heartbeat) =>
    log.some((l) => l.activity === h.activity && l.callback === h.callback && Math.abs(l.at - h.at) < 60_000);
  const recovered: Heartbeat[] = windowStarts()
    .map(({ window, at }) => ({ activity: window, callback: 'intervalDidStart', at: +at, shielded: null }))
    .filter((h) => !logged(h));
  return [...log, ...recovered].sort((a, b) => b.at - a.at);
}

/** The nightly self-check on what's stored now, newest night first (`checkNights`). */
export function readNightChecks(now = new Date()): NightCheck[] {
  const log = getHeartbeats();
  const all = getAllHeartbeats(log);
  const recovered = all.filter((h) => !log.includes(h));
  return checkNights({
    armed: getArmedNight(),
    routine: getRoutine(now),
    change: getRoutineChange(now),
    heartbeats: all,
    coverageStart: heartbeatCoverage(log, recovered, HEARTBEAT_KEEP, now),
    zoneChangedAt: zoneChangedAt(now),
    paused: getEmergencyLog()
      .filter((use) => use.pauseNight)
      .map((use) => use.morningKey),
    pauses: getEmergencyLog().flatMap((use) => (use.pauseNight && use.resumesAt !== null ? [{ from: use.at, until: use.resumesAt }] : [])),
    lastPaidMorning: lastPaidMorning(),
    lapses: lapseGaps(),
    now,
  });
}

const ZONE_KEY = 'locturne.timeZone';

/**
 * When the phone's time zone (by name, so the clocks changing doesn't count) last changed,
 * as noticed on a read: a flight. Null when it hasn't since this was first recorded.
 */
function zoneChangedAt(now: Date): number | null {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const seen = sharedGet<{ zone: string; changedAt: number | null }>(ZONE_KEY);
  if (!seen) {
    sharedSet(ZONE_KEY, { zone, changedAt: null });
    return null;
  }
  if (seen.zone === zone) return seen.changedAt ?? null;
  sharedSet(ZONE_KEY, { zone, changedAt: now.getTime() });
  return now.getTime();
}
