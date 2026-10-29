'use no memo';
// Reads the rehearsal's App Group record during render, which the extensions change outside React.

import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, AppState, StyleSheet } from 'react-native';
import { Text } from '@/components/text';

import { Card, ControlRow, sym, ValueRow, type Symbol } from '@/components/grouped-list';
import * as haptic from '@/lib/haptics';
import type { WakeMethod } from '@/lib/routine';
import { getLastRehearsal, getRehearsal, type Rehearsal } from '@/lib/screen-time';
import { Nocturne } from '@/theme';

import { LAB_METHODS } from '../wake-lab/wake-lab';
import { endRehearsal } from '../wake-lab/wake-preview';
import { rehearse, resumeRehearsal } from './rehearsal';

/**
 * You → Rehearse a night (dev and preview builds): one row per wake-up method, each a whole night
 * in about 17 minutes on the real native path (rehearsal.ts). While one runs, where it's at; after,
 * what iOS and the extensions really did and when, against when they were due.
 */

const time = (ms: number) => new Date(ms).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' });
const clock = (ms: number) => new Date(ms).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

/** "3:31:04 PM, 4 s late": when it ran against when it was due. */
function against(at: number, due: number) {
  const s = Math.round((at - due) / 1000);
  if (Math.abs(s) < 2) return `${time(at)}, on time`;
  const span = Math.abs(s) < 120 ? `${Math.abs(s)} s` : `${Math.round(Math.abs(s) / 60)} min`;
  return `${time(at)}, ${span} ${s > 0 ? 'late' : 'early'}`;
}

const MORNING_BY: Record<NonNullable<Rehearsal['morningBy']>, string> = {
  iOS: 'iOS',
  late: 'first tap after',
  app: 'Locturne, iOS never did',
};

function titleOf(method: string) {
  return LAB_METHODS.find((m) => m.value === method)?.title ?? method;
}

/** Where a rehearsal under way is at. */
function statusOf(r: Rehearsal, now: number) {
  if (r.heldAt === undefined) {
    return now < r.start ? `Bedtime ${clock(r.start)}. Swipe Locturne away now.` : 'iOS hasn’t started the night yet.';
  }
  if (now < r.end) return `Asleep since ${clock(r.heldAt)}. Morning ${clock(r.end)}.`;
  return 'Morning. Win it on Home, or from I’m up on a shield.';
}

function Report({ r }: { r: Rehearsal }) {
  const won =
    r.wonAt === undefined
      ? `Ended unwon ${clock(r.endedAt ?? r.end)}`
      : `${time(r.wonAt)}, ${r.wonBy === 'shield' ? `from the shield${(r.steps ?? -1) >= 0 ? `, ${r.steps} steps` : ''}` : 'in Locturne'}`;
  return (
    <Card title={`Last rehearsal: ${titleOf(r.method)}`} footer={r.lastCheck ? `Last shield tap: ${r.lastCheck}.` : undefined}>
      <ControlRow icon={sym('moon.fill', 'bedtime')} title="Night">
        <Text style={styles.value}>{r.heldAt === undefined ? 'Never started' : against(r.heldAt, r.start)}</Text>
      </ControlRow>
      <ControlRow icon={sym('sunrise.fill', 'wb_twilight')} title="Morning">
        <Text style={styles.value}>
          {r.morningAt === undefined ? 'Never' : `${against(r.morningAt, r.end)} (${MORNING_BY[r.morningBy ?? 'iOS']})`}
        </Text>
      </ControlRow>
      <ControlRow icon={sym('checkmark.circle.fill', 'check_circle')} title="Won" last>
        <Text style={styles.value}>{won}</Text>
      </ControlRow>
    </Card>
  );
}

export function RehearsalSection({ headingStyle, icons }: { headingStyle: object; icons: Record<WakeMethod, Symbol> }) {
  const read = () => ({ current: getRehearsal(), last: getLastRehearsal(), now: Date.now() });
  const [{ current, last, now }, setFacts] = useState(read);
  const refresh = useCallback(() => setFacts(read()), []);
  useFocusEffect(refresh);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => state === 'active' && refresh());
    // The status moves on by the clock while one runs.
    const tick = setInterval(refresh, 5_000);
    return () => {
      sub.remove();
      clearInterval(tick);
    };
  }, [refresh]);

  const start = (method: WakeMethod) => {
    rehearse(method).then(
      (r) => {
        haptic.done();
        refresh();
        Alert.alert(
          'Swipe Locturne away',
          `Bedtime is ${clock(r.start)} and the morning ${clock(r.end)}. Close Locturne from the app switcher now, so iOS runs the night with it closed. Restart the phone in between to test that too.`,
        );
      },
      (error: unknown) => Alert.alert('Can’t rehearse', error instanceof Error ? error.message : String(error)),
    );
  };

  return (
    <>
      <Text style={headingStyle} accessibilityRole="header">
        Rehearse a night
      </Text>
      {current ? (
        <Card footer={statusOf(current, now)}>
          {now >= current.end && current.heldAt !== undefined ? (
            <ValueRow
              icon={sym('sunrise.fill', 'wb_twilight')}
              title="Back to the rehearsal morning"
              value=""
              onPress={() => {
                resumeRehearsal();
                router.navigate('/');
              }}
            />
          ) : (
            <ControlRow icon={sym('moon.zzz.fill', 'bedtime')} title={titleOf(current.method)}>
              <Text style={styles.value}>{`${clock(current.start)} to ${clock(current.end)}`}</Text>
            </ControlRow>
          )}
          <ValueRow
            icon={sym('xmark.circle', 'cancel')}
            title="End the rehearsal"
            value=""
            onPress={() => {
              haptic.tap();
              endRehearsal();
              refresh();
            }}
            last
          />
        </Card>
      ) : (
        <Card footer="A real 15-minute night from iOS, starting in a minute or two, on a copy of your bedtime apps. Swipe Locturne away, then wake them with the method: on Home, or from I’m up on a shield. Nothing is recorded and your routine doesn't change.">
          {LAB_METHODS.map((m, i) => (
            <ValueRow
              key={m.value}
              icon={icons[m.value]}
              title={m.title}
              value=""
              onPress={() => start(m.value)}
              last={i === LAB_METHODS.length - 1}
            />
          ))}
        </Card>
      )}
      {last && !current ? <Report r={last} /> : null}
    </>
  );
}

const styles = StyleSheet.create({
  value: { color: Nocturne.text2, fontSize: 15 },
});
