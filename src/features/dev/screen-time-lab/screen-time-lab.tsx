import { router } from 'expo-router';
import { Pedometer } from 'expo-sensors';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton, TextButton } from '@/components/buttons';
import { ScreenTimePicker } from '@/components/screen-time-picker';
import { currentMorning, getLockState, type LockSettings } from '@/lib/lock-state';
import {
  getAccess,
  hasSelection,
  isAnyShieldUp,
  isScreenTimeAvailable,
  requestAccess,
  setShieldText,
  sleepApps,
  wakeApps,
} from '@/lib/screen-time';
import { Gap, Nocturne, Space, Type } from '@/theme';

/** Stand-in settings until real ones are stored. Only the morning start and goal matter here. */
const SPIKE: LockSettings = {
  bedtime: 23 * 60 + 30,
  morningStart: 7 * 60,
  stepGoal: 200,
  activeNights: [0, 1, 2, 3, 4, 5, 6],
  nightApps: ['night'],
  alwaysApps: [],
};

function time(date: Date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

/**
 * Device spike, step 1 (docs/TODO.md §3): prove Screen Time works on a real iPhone before
 * any more UI. Allow access, pick apps, shield them, unshield them, read the morning steps.
 * Reached from the You tab in development builds, or at /screen-time-lab.
 */
export function ScreenTimeLab() {
  const available = isScreenTimeAvailable();
  const [picking, setPicking] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);
  // Bumped after every action so the status rows re-read the native state.
  const [, setTick] = useState(0);

  function note(line: string) {
    setLog((prev) => [`${time(new Date())}  ${line}`, ...prev].slice(0, 30));
    setTick((t) => t + 1);
  }

  async function run(label: string, action: () => unknown) {
    try {
      const result = await action();
      note(result === undefined ? label : `${label}: ${String(result)}`);
    } catch (error) {
      note(`${label} failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async function readSteps() {
    const now = new Date();
    const morning = currentMorning(now, SPIKE);
    if (now < morning.start) return `before ${time(morning.start)}, nothing to count yet`;
    const { steps } = await Pedometer.getStepCountAsync(morning.start, now);
    const state = getLockState(now, SPIKE, { steps, unlockedMorning: null });
    return `${steps} steps since ${time(morning.start)} → ${state.phase}`;
  }

  if (!available) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.title}>Screen Time lab</Text>
        <Text style={styles.body}>
          Screen Time only exists on an iPhone. Open this in the development build on a real device.
        </Text>
        <TextButton label="Back" onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  const nightPicked = hasSelection('night');

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Screen Time lab</Text>

        <View style={styles.rows}>
          <Row label="Access" value={getAccess()} />
          <Row label="Night apps" value={picked ?? (nightPicked ? 'picked' : 'none')} />
          <Row label="Any shield up" value={isAnyShieldUp() ? 'yes' : 'no'} />
        </View>

        <View style={styles.actions}>
          <PrimaryButton label="1. Allow Screen Time" onPress={() => run('Access', requestAccess)} />
          <PrimaryButton label="2. Pick night apps" onPress={() => setPicking(true)} />
          <PrimaryButton
            label="3. Put them to sleep"
            disabled={!nightPicked}
            onPress={() =>
              run('Shielded night apps', () => {
                setShieldText({
                  title: 'Shh. I’m sleeping. So are they.',
                  subtitle: 'Locturne',
                  button: 'Fine',
                });
                sleepApps('night');
              })
            }
          />
          <PrimaryButton
            label="4. Wake them"
            disabled={!nightPicked}
            onPress={() => run('Unshielded night apps', () => wakeApps('night'))}
          />
          <PrimaryButton label="Read this morning’s steps" onPress={() => run('Steps', readSteps)} />
          <TextButton label="Refresh status" onPress={() => note('Refreshed')} />
          <TextButton label="Back" onPress={() => router.back()} />
        </View>

        <Text style={styles.label}>Log</Text>
        {log.length === 0 ? (
          <Text style={styles.logLine}>Nothing yet.</Text>
        ) : (
          log.map((line, i) => (
            <Text key={i} style={styles.logLine}>
              {line}
            </Text>
          ))
        )}
      </ScrollView>

      {picking && (
        <ScreenTimePicker
          list="night"
          onClose={() => {
            setPicking(false);
            note('Picker closed');
          }}
          onPicked={({ apps, categories }) => setPicked(`${apps} apps, ${categories} categories`)}
        />
      )}
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={Type.rowKey}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Nocturne.bg, paddingHorizontal: Gap.gutter },
  content: { paddingVertical: Space.xl, gap: Space.l },
  title: { color: Nocturne.text, ...Type.title },
  body: { color: Nocturne.text2, ...Type.body, marginTop: Space.m },
  rows: { gap: Space.s },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  rowValue: { color: Nocturne.text, ...Type.secondary },
  actions: { gap: Space.m },
  label: { ...Type.label, marginTop: Space.l },
  logLine: { color: Nocturne.text2, ...Type.caption, fontVariant: ['tabular-nums'] },
});
