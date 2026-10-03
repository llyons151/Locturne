import Constants from 'expo-constants';

import { readHealth } from '@/hooks/use-health';
import { getAllHeartbeats } from '@/lib/heartbeat';
import { getProofs } from '@/lib/morning-proof';
import { formatMinutes } from '@/lib/night-plan';
import { getNotificationPermission, getScheduledNotifications, getTrialStart } from '@/lib/notifications';
import { getPendingRoutine, getRoutine, hasRoutine, type Routine } from '@/lib/routine';
import {
  armedWindowNames,
  getAccess,
  getArmedNight,
  isAnyShieldUp,
  isNightHeld,
  isScreenTimeAvailable,
} from '@/lib/screen-time';

/** One grouped-list section: a title and label/value rows. */
export type DiagnosticsSection = { title: string; rows: [string, string][]; footer?: string };

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const when = (date: Date | number | null) =>
  date === null
    ? 'unknown'
    : new Date(date).toLocaleString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

function describeRoutine(r: Routine): [string, string][] {
  return [
    ['Bedtime', formatMinutes(r.bedtime)],
    ['Morning start', formatMinutes(r.morningStart)],
    ['Nights (evenings)', r.activeNights.length ? r.activeNights.map((d) => WEEKDAYS[d]).join(' ') : 'none'],
    ['Wake-up', r.method],
    ['Step goal', String(r.stepGoal)],
  ];
}

/**
 * Everything a beta tester's report needs, read fresh. Native reads are wrapped so one
 * failing call shows as an error row instead of an empty screen.
 */
export async function readDiagnostics(now = new Date()): Promise<DiagnosticsSection[]> {
  const safe = <T,>(read: () => T, fallback: T): T => {
    try {
      return read();
    } catch {
      return fallback;
    }
  };
  const available = isScreenTimeAvailable();
  const health = readHealth(now);
  const armed = getArmedNight();

  const sections: DiagnosticsSection[] = [
    {
      title: 'Status',
      rows: [
        ['Level', health.level],
        ['Says', health.title],
        ['Detail', health.detail],
        ['Protection', health.protection],
        ['Access', available ? getAccess() : 'n/a'],
      ],
    },
    {
      title: 'Armed night',
      rows: armed
        ? [
            ['Times', `${formatMinutes(armed.bedtime)}–${formatMinutes(armed.morningStart)}`],
            ['Windows armed', String(armed.windows)],
            ['Windows iOS monitors', available ? String(safe(() => armedWindowNames().length, -1)) : 'n/a'],
            ['Armed at', when(Date.parse(armed.armedAt))],
            ['Night held', available && safe(isNightHeld, false) ? 'yes' : 'no'],
            ['Any shield up', available && safe(isAnyShieldUp, false) ? 'yes' : 'no'],
          ]
        : [['Armed', 'no']],
    },
    {
      title: 'Self-check',
      rows: health.nights.length
        ? health.nights.map((n) => [
            n.morningKey,
            n.firstStart ? `${n.verdict}, first window ${when(n.firstStart)}` : n.verdict,
          ])
        : [['Nights', 'none to check yet']],
      footer: 'onTime: a window ran within 5 min of bedtime. unknown: the log doesn’t reach back that far.',
    },
    {
      title: 'Extension heartbeats',
      rows: (() => {
        const beats = getAllHeartbeats().slice(0, 30);
        if (!beats.length) return [['Log', 'empty'] as [string, string]];
        return beats.map((h): [string, string] => [
          when(h.at),
          `${h.activity} ${h.callback}${h.shielded === null ? '' : h.shielded ? ' · shield up' : ' · no shield'}`,
        ]);
      })(),
      footer: 'Newest 30. Entries without a shield note come from the library’s own log.',
    },
    {
      title: 'Morning proofs',
      rows: (() => {
        const proofs = getProofs().slice(0, 10);
        if (!proofs.length) return [['Proofs', 'none'] as [string, string]];
        return proofs.map((p): [string, string] => [p.morningKey, `${p.kind} at ${when(p.at)}`]);
      })(),
    },
    {
      title: 'Routine',
      rows: [['Saved', hasRoutine() ? 'yes' : 'no (defaults)'], ...describeRoutine(getRoutine(now))],
    },
  ];

  const pending = getPendingRoutine(now);
  if (pending) {
    sections.push({
      title: 'Pending edit',
      rows: [['Applies from', when(pending.from)], ...describeRoutine(pending.routine)],
    });
  }

  const permission = await getNotificationPermission().catch(() => 'error');
  const scheduled = await getScheduledNotifications().catch(() => []);
  const trial = getTrialStart();
  sections.push({
    title: 'Notifications',
    rows: [
      ['Permission', permission],
      ['Trial start', trial ? when(trial) : 'none'],
      ...(scheduled.length
        ? scheduled.map((n): [string, string] => [when(n.at), `${n.title} (${n.id.replace('locturne.', '')})`])
        : [['Scheduled', 'none'] as [string, string]]),
    ],
  });

  sections.push({
    title: 'App',
    rows: [
      ['Version', Constants.expoConfig?.version ?? 'unknown'],
      ['Report made', when(now)],
      ['Time zone', Intl.DateTimeFormat().resolvedOptions().timeZone],
    ],
  });
  return sections;
}

/** The plain-text report testers paste into a message. */
export function formatReport(sections: DiagnosticsSection[]): string {
  return [
    'Locturne diagnostics',
    ...sections.map((s) => [`\n## ${s.title}`, ...s.rows.map(([k, v]) => `${k}: ${v}`)].join('\n')),
  ].join('\n');
}
