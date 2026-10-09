'use no memo';
// Reads the App Group stores during render (routine, passes, limits…), which change outside
// React. The React Compiler would cache those reads from the first render (Home mounts under
// onboarding before a routine exists, and showed the defaults after), so it stays out here.

import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/text';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton, TextButton } from '@/components/buttons';
import { Section, sym, ValueRow } from '@/components/grouped-list';
import { useLock } from '@/hooks/use-lock';
import { awakeStatus } from '@/features/wake/awake-status';
import { DAY_OPENER, morningDoneToday } from '@/features/wake/morning-done';
import { track } from '@/lib/analytics';
import {
  EMERGENCY_WAIT_SECONDS,
  emergencyUnlock,
  heldPhase,
  pauseWording,
  previewEmergency,
  type EmergencyPlan,
} from '@/lib/emergency';
import * as haptic from '@/lib/haptics';
import { currentProof, readLock, routineAt } from '@/lib/lock-controller';
import type { Phase } from '@/lib/lock-state';
import { getPassesLeft, getPassRefusal, spendPass, type PassRefusal } from '@/lib/passes';
import { toLockSettings } from '@/lib/routine';
import { getScanCode } from '@/lib/scan';
import { isStoodDown, peekNap } from '@/lib/screen-time';
import { formatPreset } from '@/lib/text';
import { Gap, Nocturne, NUMBER_FONT, Space, Type } from '@/theme';

import { Confirm } from './confirm';
import { unheldBody, unheldNoCode } from './unheld-words';
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

type Stage = { kind: 'menu'; notice?: string } | { kind: 'wait'; exit: Exit } | { kind: 'done'; exit: Exit; until: number };

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
  // Only once today's morning really happened (`morningDoneToday`); otherwise `DAY_OPENER.notYet`.
  day: { line: "I'm awake. Technically.", body: 'Your morning is done. The emergency unlock can still end a Block now session.' },
  off: { line: 'Night off.', body: 'Nothing is locked tonight. The emergency unlock can still end a Block now session.' },
};

/** His line for a night or morning by the clock with nothing asleep (`unheldBody` says why). */
const AWAKE_LINE = "I'm awake. Technically.";

const PASS_REFUSALS: Record<PassRefusal, string> = {
  notMorning: 'Passes work in the morning, while your apps wait for you to get up.',
  noneLeft: 'No passes left this month. They come back on the 1st.',
  alreadyUsed: 'This morning is already covered.',
};

/**
 * What an emergency unlock wakes, in plain words. Never vague (VOICE.md, "Clear when it matters").
 * `awake` is `awakeStatus` for the day after: tonight may be off, or nothing sleeps again.
 */
function describe(plan: EmergencyPlan, awake: string): string {
  const parts: string[] = [];
  if (plan.pauseNight && plan.resumesAt) {
    const { morning, resumes, weekday } = pauseWording(new Date(plan.resumesAt));
    const when = resumes && (weekday ? `${timeOf(resumes.getTime())} on ${weekday}` : timeOf(resumes.getTime()));
    parts.push(
      when
        ? `Your bedtime apps wake for the rest of tonight and ${morning}. They go back to sleep at ${when} on their own.`
        : `Your bedtime apps wake for the rest of tonight and ${morning}. Every night is switched off, so they stay awake.`,
    );
  }
  else if (plan.unlockMorning) parts.push(`Your apps wake this morning. ${awake}`);
  if (plan.endBlockNow) parts.push('Your Block now session ends.');
  parts.push('The always-blocked list stays asleep.');
  return parts.join(' ');
}

export function ExitsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const lock = useLock();
  const [storedStage, setStage] = useState<Stage>({ kind: 'menu' });
  // The route can remain mounted overnight; a completed exit describes only that window.
  const stage: Stage = storedStage.kind === 'done' && lock.nextChange.getTime() !== storedStage.until ? { kind: 'menu' } : storedStage;
  const phase = lock.phase;
  const [storedLeft, setLeft] = useState(() => getPassesLeft());
  const [storedPlan, setPlan] = useState(() => previewEmergency());
  const left = stage.kind === 'menu' ? getPassesLeft() : storedLeft;
  // Keep the exact effect frozen while confirming; the menu always reflects the live lock.
  const plan = stage.kind === 'menu' ? previewEmergency() : storedPlan;
  const [wait, setWait] = useState(EMERGENCY_WAIT_SECONDS);
  const [confirming, setConfirming] = useState(false);

  const refresh = () => {
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

  const [endsNap, setEndsNap] = useState(false);
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
    // A pass ends a running Block now too (`spendPass`): say so, as the emergency wording does.
    setEndsNap(peekNap() !== null);
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
      const current = previewEmergency();
      if (current && (!plan || current.pauseNight !== plan.pauseNight ||
        current.unlockMorning !== plan.unlockMorning || current.endBlockNow !== plan.endBlockNow ||
        current.resumesAt !== plan.resumesAt)) {
        // A confirmation left open across bedtime must not silently unlock more than it said.
        setPlan(current);
        setStage({ kind: 'wait', exit: 'emergency' });
        return;
      }
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
    setStage({ kind: 'done', exit, until: readLock().nextChange.getTime() });
    // `plan` keeps describing what just happened; only the pass count moves.
    setLeft(getPassesLeft());
  };

  // A night or morning by the clock with nothing asleep to wake: no lock armed, already paused
  // tonight, or after a lapse's last paid morning. No pass, no "Rough morning".
  const unheld = (phase === 'night' || phase === 'morning') && heldPhase(phase) !== phase ? phase : null;
  const heldMorning = phase === 'morning' && !unheld;

  const cantWalk = () => {
    if (getScanCode()) return router.push('/scan?mode=morning');
    if (unheld) return setStage({ kind: 'menu', notice: unheldNoCode(unheld) });
    // A code can't be set up from bed (any barcode by the pillow would do), so say what can help.
    if (phase === 'night' || phase === 'morning') {
      return setStage({
        kind: 'menu',
        // Passes only work in the morning (`notMorning`), so at night only the unlock helps.
        notice:
          phase === 'night'
            ? left > 0
              ? 'No code yet, and it can’t be set up from bed. Passes start in the morning; the emergency unlock is here now.'
              : 'No code yet, and it can’t be set up from bed. The emergency unlock is here now.'
            : left > 0
              ? 'No code yet, and it can’t be set up from bed. Use a pass, or the emergency unlock. Set one up in the day for next time.'
              : 'No code yet, and it can’t be set up from bed. No passes left this month; the emergency unlock is here.',
      });
    }
    router.push('/scan?mode=setup');
  };

  // What the day holds once the morning is woken, as the wake and scan screens say it: tonight
  // may be off, or nothing sleeps again after a lapse's last morning. Both exits end a Block now.
  const awake = stage.kind === 'menu' ? '' : awakeStatus({ ...lock, blockNowUntil: null });

  const words = (() => {
    if (stage.kind === 'wait') {
      return stage.exit === 'pass'
        ? {
            line: 'A pass. Sure.',
            body: `It wakes your apps this morning, no walking. ${awake}${endsNap ? ' Your Block now session ends.' : ''} You have ${passesLabel(left)} this month.`,
          }
        : { line: 'Is it an emergency.', body: plan ? describe(plan, awake) : '' };
    }
    if (stage.kind === 'done') {
      return stage.exit === 'pass'
        ? {
            line: 'Fine. *Fine.*',
            body: `${awake}${endsNap ? ' Your Block now session ended.' : ''} ${passesLabel(left)} left this month.`,
          }
        : { line: "I'll allow it. This once. Maybe.", body: plan ? describe(plan, awake) : '' };
    }
    // The clock says night or morning, but nothing is asleep to wake: don't say bedtime wins.
    if (unheld) return { line: AWAKE_LINE, body: unheldBody(unheld, isStoodDown()) };
    // Only the ways out that exist: no pass with none left, no scan without a code.
    if (phase === 'morning' && getScanCode() && left === 0) {
      return { ...OPENERS.morning, body: "Scan your code if walking is hard today, or unlock in an emergency. I won't make it weird." };
    }
    if (phase === 'morning' && !getScanCode()) {
      return {
        ...OPENERS.morning,
        body: left > 0 ? "Use a pass, or unlock in an emergency. I won't make it weird." : "No passes left this month. The emergency unlock is still here. I won't make it weird.",
      };
    }
    if (phase === 'day') {
      // Before the day's first morning (00:33 ahead of a 01:00 bedtime, a night shift's 07:00,
      // an install's first day) nothing is done yet.
      const now = new Date();
      if (!morningDoneToday(now, toLockSettings(routineAt(now)), currentProof(now))) {
        return { ...OPENERS.day, body: `${DAY_OPENER.notYet} The emergency unlock can still end a Block now session.` };
      }
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
              value={heldMorning ? `${left} left` : 'Mornings'}
              onPress={() => begin('pass')}
            />
            <ValueRow
              icon={sym('qrcode.viewfinder', 'qr_code_scanner')}
              title="I can't walk this morning"
              value={getScanCode() ? 'Scan' : 'No code'}
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
            accessibilityLabel={wait > 0 ? `${wait} ${wait === 1 ? 'second' : 'seconds'}` : 'Ready'}
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
            message={stage.exit === 'pass' ? `It wakes your apps this morning. ${awake}` : plan ? describe(plan, awake) : ''}
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
