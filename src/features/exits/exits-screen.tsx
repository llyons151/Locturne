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
import { EMERGENCY_WAIT_SECONDS, heldPhase, pauseWording, type EmergencyPlan } from '@/lib/emergency';
import * as haptic from '@/lib/haptics';
import { currentProof, readLock, routineAt } from '@/lib/lock-controller';
import type { Phase } from '@/lib/lock-state';
import { getPassesLeft, getPassRefusal, previewPass, redeemPass, type PassRefusal } from '@/lib/passes';
import { toLockSettings } from '@/lib/routine';
import { isScreenTimeAvailable, isStoodDown, peekNap, selectionSize } from '@/lib/screen-time';
import { formatPreset } from '@/lib/text';
import { Gap, Nocturne, NUMBER_FONT, Space, Type } from '@/theme';

import { Confirm } from './confirm';
import { offBody, unheldBody } from './unheld-words';
import { Voice } from './voice';

/**
 * The way out (GAME_PLAN, "Humane exits"): a pass, two a month. There is no unlimited
 * emergency unlock (decided 2026-10-14) and no scanning a code instead of the morning's own
 * method (2026-10-15): a pass is the only way out early, at night as well as in the morning. It goes
 * through a short wait with "Go back to sleep" as the big button (NIGHT_PHONE_SCIENCE.md,
 * Principle 10: the delay plus a dismiss option is what worked), then the system's dialog.
 *
 * Loc is strict about the situation and never about the person: no streaks, no guilt, no
 * "are you sure you want to give up". The always-blocked list never wakes from here.
 */

/** `night`: the pass lifts the rest of a night or a Block now (`previewPass`), not a morning. */
type Stage = { kind: 'menu'; notice?: string } | { kind: 'wait'; night: boolean } | { kind: 'done'; night: boolean; until: number };

const timeOf = (ms: number) => {
  const d = new Date(ms);
  return formatPreset(d.getHours() * 60 + d.getMinutes());
};

const passesLabel = (n: number) => (n === 1 ? '1 pass' : `${n} passes`);

const NONE_LEFT = 'No passes left this month. They come back on the 1st.';

/** His opening line and the plain sentence under it, by phase. `left`: passes this month. */
function opener(phase: Phase, left: number): { line: string; body: string } {
  switch (phase) {
    case 'night':
      return {
        line: 'Why are we awake.',
        body: left > 0 ? `A pass wakes your apps for the rest of tonight and the morning. ${passesLabel(left)} left this month.` : NONE_LEFT,
      };
    case 'morning':
      return { line: 'Rough morning.', body: left > 0 ? "Use a pass. I won't make it weird." : `${NONE_LEFT} Up means up.` };
    // Only once today's morning really happened (`morningDoneToday`); otherwise `DAY_OPENER.notYet`.
    case 'day':
      return { line: "I'm awake. Technically.", body: 'Your morning is done. A pass can still end a Block now session.' };
    case 'off':
      return { line: 'Night off.', body: 'Nothing is locked tonight. A pass can still end a Block now session.' };
  }
}

/** His line for a night or morning by the clock with nothing asleep (`unheldBody` says why). */
const AWAKE_LINE = "I'm awake. Technically.";

const PASS_REFUSALS: Record<PassRefusal, string> = {
  notMorning: 'Passes work in the morning, while your apps wait for you to get up.',
  noneLeft: NONE_LEFT,
  alreadyUsed: 'This morning is already covered.',
  nothingAsleep: "Nothing is asleep that a pass can wake. The always-blocked list doesn't wake.",
};

/**
 * What a night or Block now pass wakes, in plain words. Never vague (VOICE.md, "Clear when it
 * matters"). `awake` is `awakeStatus` for the day after: tonight may be off, or nothing sleeps again.
 */
function describe(plan: EmergencyPlan, awake: string): string {
  const parts: string[] = [];
  if (plan.pauseNight && plan.resumesAt) {
    const { morning, resumes, weekday, ended, noApps } = pauseWording(new Date(plan.resumesAt));
    const when = resumes && (weekday ? `${timeOf(resumes.getTime())} on ${weekday}` : timeOf(resumes.getTime()));
    parts.push(
      when
        ? `Your bedtime apps wake for the rest of tonight and ${morning}. They go back to sleep at ${when} on their own.`
        : ended
          ? `Your bedtime apps wake for the rest of tonight and ${morning}. There’s no subscription, so nothing sleeps after that.`
          : noApps
            ? `Your bedtime apps wake for the rest of tonight and ${morning}. No bedtime apps are picked, so nothing sleeps after that.`
            : `Your bedtime apps wake for the rest of tonight and ${morning}. Every night is switched off, so they stay awake.`,
    );
  }
  else if (plan.unlockMorning) parts.push(`Your apps wake this morning. ${awake}`);
  if (plan.endBlockNow) parts.push('Your Block now session ends.');
  parts.push('The always-blocked list stays asleep.');
  return parts.join(' ');
}

const samePlan = (a: EmergencyPlan, b: EmergencyPlan) =>
  a.pauseNight === b.pauseNight && a.unlockMorning === b.unlockMorning && a.endBlockNow === b.endBlockNow && a.resumesAt === b.resumesAt;

export function ExitsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const lock = useLock();
  const [storedStage, setStage] = useState<Stage>({ kind: 'menu' });
  // The route can remain mounted overnight; a completed exit describes only that window.
  const stage: Stage = storedStage.kind === 'done' && lock.nextChange.getTime() !== storedStage.until ? { kind: 'menu' } : storedStage;
  const phase = lock.phase;
  const [storedLeft, setLeft] = useState(() => getPassesLeft());
  const [storedPlan, setPlan] = useState(() => previewPass());
  const left = stage.kind === 'menu' ? getPassesLeft() : storedLeft;
  // Keep the exact effect frozen while confirming; the menu always reflects the live lock.
  const plan = stage.kind === 'menu' ? previewPass() : storedPlan;
  const [wait, setWait] = useState(EMERGENCY_WAIT_SECONDS);
  const [confirming, setConfirming] = useState(false);

  const refresh = () => {
    setLeft(getPassesLeft());
    setPlan(previewPass());
  };

  const close = useCallback(() => (router.canGoBack() ? router.back() : router.replace('/')), [router]);

  // The wait counts down once a second; the button appears at zero.
  useEffect(() => {
    if (stage.kind !== 'wait' || wait <= 0) return;
    const id = setTimeout(() => setWait((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [stage.kind, wait]);

  const [endsNap, setEndsNap] = useState(false);
  const begin = () => {
    const refusal = getPassRefusal();
    if (refusal) return setStage({ kind: 'menu', notice: PASS_REFUSALS[refusal] });
    refresh();
    // A pass ends a running Block now too: say so.
    setEndsNap(peekNap() !== null);
    setWait(EMERGENCY_WAIT_SECONDS);
    setStage({ kind: 'wait', night: previewPass() !== null });
  };

  const unlock = (night: boolean) => {
    setConfirming(false);
    const current = previewPass();
    if (current && (!night || !plan || !samePlan(current, plan))) {
      // A confirmation left open across bedtime must not silently unlock more than it said.
      setPlan(current);
      setStage({ kind: 'wait', night: true });
      return;
    }
    const result = redeemPass();
    if (result.refusal) return setStage({ kind: 'menu', notice: PASS_REFUSALS[result.refusal] });
    const use = result.night;
    track('pass_used', {
      passes_left: getPassesLeft(),
      phase: use ? use.phase : 'morning',
      paused_night: use?.pauseNight ?? false,
      ended_block_now: use?.endBlockNow ?? false,
    });
    haptic.done();
    setStage({ kind: 'done', night: use !== null, until: readLock().nextChange.getTime() });
    // `plan` keeps describing what just happened; only the pass count moves.
    setLeft(getPassesLeft());
  };

  // A night or morning by the clock with nothing asleep to wake: no lock armed, already paused
  // tonight, an empty bedtime list, or after a lapse's last paid morning. No "Rough morning".
  const unheld = (phase === 'night' || phase === 'morning') && heldPhase(phase) !== phase ? phase : null;
  const heldMorning = phase === 'morning' && !unheld;


  // What the day holds once the morning is woken, as the wake and scan screens say it: tonight
  // may be off, or nothing sleeps again after a lapse's last morning. A pass ends a Block now.
  const awake = stage.kind === 'menu' ? '' : awakeStatus({ ...lock, blockNowUntil: null });

  const words = (() => {
    if (stage.kind === 'wait') {
      return stage.night
        ? { line: 'A pass. At this hour.', body: `${plan ? describe(plan, awake) : ''} You have ${passesLabel(left)} this month.` }
        : {
            line: 'A pass. Sure.',
            body: `It wakes your apps this morning, no walking. ${awake}${endsNap ? ' Your Block now session ends.' : ''} You have ${passesLabel(left)} this month.`,
          };
    }
    if (stage.kind === 'done') {
      return stage.night
        ? { line: "I'll allow it. This once. Maybe.", body: `${plan ? describe(plan, awake) : ''} ${passesLabel(left)} left this month.` }
        : {
            line: 'Fine. *Fine.*',
            body: `${awake}${endsNap ? ' Your Block now session ended.' : ''} ${passesLabel(left)} left this month.`,
          };
    }
    // The clock says night or morning, but nothing is asleep to wake: don't say bedtime wins.
    if (unheld) return { line: AWAKE_LINE, body: unheldBody(unheld, isStoodDown()) };
    if (phase === 'day') {
      // Before the day's first morning (00:33 ahead of a 01:00 bedtime, a night shift's 07:00,
      // an install's first day) nothing is done yet.
      const now = new Date();
      if (!morningDoneToday(now, toLockSettings(routineAt(now)), currentProof(now))) {
        return { ...opener('day', left), body: `${DAY_OPENER.notYet} A pass can still end a Block now session.` };
      }
    }
    if (phase === 'off') {
      // Only the bedtime apps are off: the always list and a Block now still sleep.
      const nap = peekNap();
      const alwaysSleeps = !isStoodDown() && (!isScreenTimeAvailable() || selectionSize('always') > 0);
      return { ...opener('off', left), body: offBody({ alwaysSleeps, napUntil: nap ? timeOf(nap.end) : null }) };
    }
    return opener(phase, left);
  })();

  // What the pass row says: how many, or that there's nothing for one to wake.
  const passValue = left === 0 ? 'None left' : heldMorning || plan ? `${left} left` : 'Nothing asleep';

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
              value={passValue}
              onPress={begin}
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
            <TextButton label="Use the pass" onPress={() => setConfirming(true)} />
          ) : (
            <Text style={styles.notice}>Take a second. It&apos;s still there after.</Text>
          )}
          <Confirm
            open={confirming}
            title="Use a pass?"
            message={stage.night ? (plan ? describe(plan, awake) : '') : `It wakes your apps this morning. ${awake}`}
            confirmLabel="Use the pass"
            cancelLabel="Go back to sleep"
            onConfirm={() => unlock(stage.night)}
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
