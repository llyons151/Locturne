import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton, TextButton } from '@/components/buttons';
import { Section, sym, ValueRow } from '@/components/grouped-list';
import { track } from '@/lib/analytics';
import { EMERGENCY_WAIT_SECONDS, emergencyUnlock, previewEmergency, type EmergencyPlan } from '@/lib/emergency';
import * as haptic from '@/lib/haptics';
import { readLock } from '@/lib/lock-controller';
import type { Phase } from '@/lib/lock-state';
import { getPassesLeft, getPassRefusal, spendPass, type PassRefusal } from '@/lib/passes';
import { getScanCode } from '@/lib/scan';
import { formatPreset } from '@/lib/text';
import { Gap, Nocturne, NUMBER_FONT, Space, Type } from '@/theme';

import { Confirm } from './confirm';
import { Voice } from './voice';

/**
 * The way out (GAME_PLAN, "Humane exits"): a pass, the emergency unlock, and "I can't walk
 * this morning", which points to Scan your code. Every exit goes through the same short wait
 * with "Go back to sleep" as the big button (NIGHT_PHONE_SCIENCE.md, Principle 10: the
 * delay plus a dismiss option is what worked), then the system's confirmation dialog.
 *
 * Loc is strict about the situation and never about the person: no streaks, no guilt, no
 * "are you sure you want to give up". The always-blocked list never wakes from here.
 */

type Exit = 'pass' | 'emergency';

type Stage = { kind: 'menu'; notice?: string } | { kind: 'wait'; exit: Exit } | { kind: 'done'; exit: Exit };

const timeOf = (ms: number) => {
  const d = new Date(ms);
  return formatPreset(d.getHours() * 60 + d.getMinutes());
};

const passesLabel = (n: number) => (n === 1 ? '1 pass' : `${n} passes`);

/** His opening line and the plain sentence under it, by phase. */
const OPENERS: Record<Phase, { line: string; body: string }> = {
  night: {
    line: 'Why are we awake.',
    body: 'Passes wait for the morning, because bedtime wins. If something is actually wrong, the emergency unlock is right here.',
  },
  morning: {
    line: 'Rough morning.',
    body: "Use a pass, scan your code if walking is hard today, or unlock in an emergency. I won't make it weird.",
  },
  day: { line: "I'm awake. Technically.", body: 'Your morning is done. The emergency unlock can still end a Block now session.' },
  off: { line: 'Night off.', body: 'Nothing is locked tonight. The emergency unlock can still end a Block now session.' },
};

const PASS_REFUSALS: Record<PassRefusal, string> = {
  notMorning: 'Passes work in the morning, while your apps wait for you to get up.',
  noneLeft: 'No passes left this month. They come back on the 1st.',
  alreadyUsed: 'This morning is already covered.',
};

/** What an emergency unlock wakes, in plain words. Never vague (VOICE.md, "Clear when it matters"). */
function describe(plan: EmergencyPlan): string {
  const parts: string[] = [];
  if (plan.pauseNight && plan.resumesAt)
    parts.push(`Your bedtime apps wake for the rest of tonight and tomorrow morning. They go back to sleep at ${timeOf(plan.resumesAt)} on their own.`);
  else if (plan.unlockMorning) parts.push('Your apps wake until bedtime.');
  if (plan.endBlockNow) parts.push('Your Block now session ends.');
  parts.push('The always-blocked list stays asleep.');
  return parts.join(' ');
}

export function ExitsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [stage, setStage] = useState<Stage>({ kind: 'menu' });
  const [phase, setPhase] = useState<Phase>(() => readLock().phase);
  const [left, setLeft] = useState(() => getPassesLeft());
  const [plan, setPlan] = useState(() => previewEmergency());
  const [wait, setWait] = useState(EMERGENCY_WAIT_SECONDS);
  const [confirming, setConfirming] = useState(false);

  const refresh = () => {
    setPhase(readLock().phase);
    setLeft(getPassesLeft());
    setPlan(previewEmergency());
  };

  const close = useCallback(() => (router.canGoBack() ? router.back() : router.replace('/')), [router]);

  // The wait counts down once a second; the unlock button appears at zero.
  useEffect(() => {
    if (stage.kind !== 'wait' || wait <= 0) return;
    const id = setTimeout(() => setWait((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [stage.kind, wait]);

  const begin = (exit: Exit) => {
    if (exit === 'pass') {
      const refusal = getPassRefusal();
      if (refusal) return setStage({ kind: 'menu', notice: PASS_REFUSALS[refusal] });
    } else if (!previewEmergency()) {
      return setStage({
        kind: 'menu',
        notice: "Nothing is asleep that an emergency unlock can wake. The always-blocked list doesn't wake.",
      });
    }
    refresh();
    setWait(EMERGENCY_WAIT_SECONDS);
    setStage({ kind: 'wait', exit });
  };

  const unlock = (exit: Exit) => {
    setConfirming(false);
    if (exit === 'pass') {
      const refusal = spendPass();
      if (refusal) return setStage({ kind: 'menu', notice: PASS_REFUSALS[refusal] });
      track('pass_used', { passes_left: getPassesLeft() });
    } else {
      const use = emergencyUnlock();
      if (!use) return setStage({ kind: 'menu', notice: 'Nothing was asleep, so nothing changed.' });
      track('emergency_unlock', {
        phase: use.phase,
        paused_night: use.pauseNight,
        ended_block_now: use.endBlockNow,
        unlocked_morning: use.unlockMorning,
      });
    }
    haptic.done();
    setStage({ kind: 'done', exit });
    // `plan` keeps describing what just happened; only the pass count moves.
    setLeft(getPassesLeft());
  };

  const cantWalk = () => router.push(getScanCode() ? '/scan?mode=morning' : '/scan?mode=setup');

  const words = (() => {
    if (stage.kind === 'wait') {
      return stage.exit === 'pass'
        ? { line: 'A pass. Sure.', body: `It wakes your apps until bedtime, no walking. You have ${passesLabel(left)} this month.` }
        : { line: 'Is it an emergency.', body: plan ? describe(plan) : '' };
    }
    if (stage.kind === 'done') {
      return stage.exit === 'pass'
        ? { line: 'Fine. *Fine.*', body: `Your apps are awake until bedtime. ${passesLabel(left)} left this month.` }
        : { line: "I'll allow it. This once. Maybe.", body: plan ? describe(plan) : '' };
    }
    return OPENERS[phase];
  })();

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: Space.xl, paddingBottom: insets.bottom + Space.l }]}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View key={`${stage.kind}-${words.line}`} entering={FadeIn.duration(300)} style={styles.top}>
        <Voice text={words.line} />
        <Text style={styles.body}>{words.body}</Text>
      </Animated.View>

      <View style={styles.flex} />

      {stage.kind === 'menu' ? (
        <View style={styles.bottom}>
          <Section footer="Whatever happens here, the always-blocked list stays asleep.">
            <ValueRow
              icon={sym('ticket', 'confirmation_number')}
              title="Use a pass"
              value={phase === 'morning' ? `${left} left` : 'Mornings'}
              onPress={() => begin('pass')}
            />
            <ValueRow
              icon={sym('qrcode.viewfinder', 'qr_code_scanner')}
              title="I can't walk this morning"
              value="Scan"
              onPress={cantWalk}
            />
            <ValueRow
              icon={sym('exclamationmark.triangle', 'warning')}
              title="Emergency unlock"
              value={plan ? 'Always here' : 'Nothing asleep'}
              onPress={() => begin('emergency')}
              last
            />
          </Section>
          {stage.notice ? <Text style={styles.notice}>{stage.notice}</Text> : null}
          <PrimaryButton label="Go back to sleep" onPress={close} />
        </View>
      ) : null}

      {stage.kind === 'wait' ? (
        <View style={styles.bottom}>
          <Text
            style={styles.count}
            accessibilityLiveRegion="polite"
            accessibilityLabel={wait > 0 ? `${wait} seconds` : 'Ready'}
          >
            {wait > 0 ? `0:${String(wait).padStart(2, '0')}` : '0:00'}
          </Text>
          <PrimaryButton label="Go back to sleep" onPress={close} />
          {wait <= 0 ? (
            <TextButton label={stage.exit === 'pass' ? 'Use the pass' : 'Unlock anyway'} onPress={() => setConfirming(true)} />
          ) : (
            <Text style={styles.notice}>Take a second. It&apos;s still there after.</Text>
          )}
          <Confirm
            open={confirming}
            title={stage.exit === 'pass' ? 'Use a pass?' : 'Unlock now?'}
            message={stage.exit === 'pass' ? 'Your apps wake until bedtime.' : plan ? describe(plan) : ''}
            confirmLabel={stage.exit === 'pass' ? 'Use the pass' : 'Unlock'}
            cancelLabel="Go back to sleep"
            onConfirm={() => unlock(stage.exit)}
            onCancel={close}
            onDismiss={() => setConfirming(false)}
          />
        </View>
      ) : null}

      {stage.kind === 'done' ? (
        <View style={styles.bottom}>
          <PrimaryButton label="Done" onPress={close} />
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Nocturne.bg },
  content: { flexGrow: 1, paddingHorizontal: Gap.gutter },
  top: { gap: Space.l, marginTop: Space.l },
  body: { ...Type.body, color: Nocturne.text2 },
  flex: { flex: 1, minHeight: Space.xxl },
  bottom: { gap: Space.l, paddingBottom: Space.s },
  notice: { ...Type.caption, color: Nocturne.text3, textAlign: 'center' },
  count: { ...NUMBER_FONT, color: Nocturne.text, fontSize: 56, lineHeight: 64, textAlign: 'center', fontVariant: ['tabular-nums'] },
});
