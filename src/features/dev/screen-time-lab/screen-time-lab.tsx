import { router } from 'expo-router';
import { Pedometer } from 'expo-sensors';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/text';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton, TextButton } from '@/components/buttons';
import { ScreenTimePicker } from '@/components/screen-time-picker';
import { currentMorning, getLockState, type LockSettings } from '@/lib/lock-state';
import { formatMinutes, planNightWindows } from '@/lib/night-plan';
import {
  armNight,
  armedWindowNames,
  disarmNight,
  getAccess,
  getArmedNight,
  hasSelection,
  isAnyShieldUp,
  isScreenTimeAvailable,
  requestAccess,
  setShieldText,
  sleepApps,
  wakeApps,
  windowStarts,
} from '@/lib/screen-time';
import { Gap, Nocturne, Space, Type } from '@/theme';

const DAY = 24 * 60;

/** Stand-in settings until real ones are stored. Every night is on for the spike. */
function spikeSettings(bedtime: number, morningStart: number): LockSettings {
  return {
    bedtime,
    morningStart,
    stepGoal: 200,
    activeNights: [0, 1, 2, 3, 4, 5, 6],
    nightApps: ['night'],
    alwaysApps: [],
  };
}

function setLocShield() {
  setShieldText({ title: 'Shh. I’m sleeping. So are they.', subtitle: 'Locturne', button: 'Fine' });
}

function time(date: Date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

/**
 * Device spike (docs/TODO.md §3): prove Screen Time works on a real iPhone before any more
 * UI. Allow access, pick apps, shield and unshield them, arm the bedtime schedule so iOS
 * shields them with the app closed, and wake them with the morning step check.
 * Reached from the You tab in development builds, or at /screen-time-lab.
 */
export function ScreenTimeLab() {
  const available = isScreenTimeAvailable();
  const [picking, setPicking] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);
  // Bumped after every action so the status rows re-read the native state.
  const [, setTick] = useState(0);
  const armed = available ? getArmedNight() : null;
  const [bedtime, setBedtime] = useState(armed?.bedtime ?? 23 * 60 + 30);
  const [morningStart, setMorningStart] = useState(armed?.morningStart ?? 7 * 60);
  // Steps and phase follow what's armed, so a test night's morning works too.
  const settings = spikeSettings(armed?.bedtime ?? bedtime, armed?.morningStart ?? morningStart);

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

  async function morningState() {
    const now = new Date();
    const morning = currentMorning(now, settings);
    const steps = now < morning.start ? 0 : (await Pedometer.getStepCountAsync(morning.start, now)).steps;
    return { steps, morning, state: getLockState(now, settings, { steps, unlockedMorning: null }) };
  }

  async function readSteps() {
    const { steps, morning, state } = await morningState();
    return `${steps} steps since ${time(morning.start)} → ${state.phase}`;
  }

  /** The morning unlock: wake the night apps only once the rules say it's day. */
  async function morningCheck() {
    const { steps, state } = await morningState();
    if (state.phase === 'day') {
      wakeApps('night');
      return `${steps} steps → day, apps woken`;
    }
    if (state.phase === 'morning') return `${steps} steps, ${state.stepsRemaining} to go. Still asleep`;
    return `${state.phase}: steps don't count yet`;
  }

  /** Arms the night, and if it's already bedtime, puts the apps to sleep straight away. */
  async function arm(start: number, end: number, maxWindow?: number) {
    const windows = planNightWindows(start, end, maxWindow);
    if (windows.length === 0) throw new Error('night is shorter than 15 minutes');
    setLocShield();
    await armNight(windows, 'night', { bedtime: start, morningStart: end });
    const nowNight = getLockState(new Date(), spikeSettings(start, end), { steps: 0, unlockedMorning: null });
    if (nowNight.phase === 'night') sleepApps('night');
    const sizes = [...new Set(windows.map((w) => (w.end - w.start + DAY) % DAY))].join('/');
    return `${formatMinutes(start)}–${formatMinutes(end)}, ${windows.length} windows of ${sizes} min${
      nowNight.phase === 'night' ? ', already bedtime so asleep now' : ''
    }`;
  }

  function armTestNight() {
    const now = new Date();
    const start = (now.getHours() * 60 + now.getMinutes() + 2) % DAY;
    setBedtime(start);
    setMorningStart((start + 30) % DAY);
    return arm(start, (start + 30) % DAY, 15);
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
  const lastStart = windowStarts()[0];

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
                setLocShield();
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
        </View>

        <Text style={styles.label}>Bedtime schedule</Text>
        <View style={styles.rows}>
          <Row
            label="Armed"
            value={armed ? `${formatMinutes(armed.bedtime)}–${formatMinutes(armed.morningStart)}, ${armedWindowNames().length} windows` : 'no'}
          />
          <Row label="Last window start" value={lastStart ? `${lastStart.window} at ${time(lastStart.at)}` : 'none yet'} />
        </View>
        <TimeStepper label="Bedtime" minutes={bedtime} onChange={setBedtime} />
        <TimeStepper label="Morning start" minutes={morningStart} onChange={setMorningStart} />
        <View style={styles.actions}>
          <PrimaryButton
            label="5. Arm bedtime schedule"
            disabled={!nightPicked}
            onPress={() => run('Armed', () => arm(bedtime, morningStart))}
          />
          <PrimaryButton
            label="Arm test night (in 2 min, 30 min long)"
            disabled={!nightPicked}
            onPress={() => run('Armed test night', armTestNight)}
          />
          <PrimaryButton label="6. Morning check (wake at 200 steps)" onPress={() => run('Morning check', morningCheck)} />
          <TextButton label="Disarm schedule" onPress={() => run('Disarmed', disarmNight)} />
          <Text style={styles.hint}>
            A test night repeats every day at that time until you arm a real one or disarm. After
            it ends, the apps stay asleep until the morning check (or Wake).
          </Text>
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

/** Bedtime-style time control in 15-minute steps. */
function TimeStepper({ label, minutes, onChange }: { label: string; minutes: number; onChange: (m: number) => void }) {
  const step = (delta: number) => onChange((minutes + delta + DAY) % DAY);
  return (
    <View style={styles.row}>
      <Text style={Type.rowKey}>{label}</Text>
      <View style={styles.stepper}>
        <Pressable accessibilityRole="button" accessibilityLabel={`${label} 15 minutes earlier`} hitSlop={8} onPress={() => step(-15)}>
          <Text style={styles.stepperButton}>−</Text>
        </Pressable>
        <Text style={styles.stepperValue}>{formatMinutes(minutes)}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={`${label} 15 minutes later`} hitSlop={8} onPress={() => step(15)}>
          <Text style={styles.stepperButton}>+</Text>
        </Pressable>
      </View>
    </View>
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
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: Space.l },
  stepperButton: { color: Nocturne.text, fontSize: 24, fontWeight: '500', paddingHorizontal: Space.s },
  stepperValue: { color: Nocturne.text, ...Type.body, fontVariant: ['tabular-nums'], minWidth: 52, textAlign: 'center' },
  hint: { color: Nocturne.text3, ...Type.caption },
  rowValue: { color: Nocturne.text, ...Type.secondary },
  actions: { gap: Space.m },
  label: { ...Type.label, marginTop: Space.l },
  logLine: { color: Nocturne.text2, ...Type.caption, fontVariant: ['tabular-nums'] },
});
