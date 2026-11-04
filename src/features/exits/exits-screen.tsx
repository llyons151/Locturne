'use no memo';
// Reads the App Group stores during render (routine, passes, limits…), which change outside
// React. The React Compiler would cache those reads from the first render (Home mounts under
// onboarding before a routine exists, and showed the defaults after), so it stays out here.

import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/text';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import { PrimaryButton, TextButton } from '@/components/buttons';
import { sym } from '@/components/grouped-list';
import { holdFill } from '@/features/nap/nap-screen';
import { useMoon } from '@/features/moons/moon-theme';
import { closeSleepSheet, SHEET_PADDING } from '@/features/nap/sleep-sheet';
import { useLock } from '@/hooks/use-lock';
import { awakeStatus } from '@/features/wake/awake-status';
import { DAY_OPENER, morningDoneToday } from '@/features/wake/morning-done';
import { track } from '@/lib/analytics';
import { heldPhase, pauseWording, type EmergencyPlan } from '@/lib/emergency';
import * as haptic from '@/lib/haptics';
import { currentProof, readLock, routineAt } from '@/lib/lock-controller';
import type { Phase } from '@/lib/lock-state';
import { getPassesLeft, getPassRefusal, passRefillDate, previewPass, redeemPass, type PassRefusal } from '@/lib/passes';
import { toLockSettings } from '@/lib/routine';
import { heldSchedules, isScreenTimeAvailable, isStoodDown, peekNap, selectionSize, type HeldSchedule } from '@/lib/screen-time';
import { formatPreset } from '@/lib/text';
import { Nocturne, NUMBER_FONT, Space, Type } from '@/theme';

import { HoldButton } from '../../../modules/hold-button';
import { offBody, unheldBody } from './unheld-words';
import { Voice } from './voice';

/**
 * The way out (GAME_PLAN, "Humane exits"): a pass, two a month. There is no unlimited
 * emergency unlock (decided 2026-10-14) and no scanning a code instead of the morning's own
 * method (2026-10-15): a pass is the only way out early, at night as well as in the morning. It's
 * held, not tapped, like the Sleep sheet's button (user 2026-11-02): the hold is the pause that the
 * old wait and dialog were (NIGHT_PHONE_SCIENCE.md, Principle 10), with "Never mind" under it.
 *
 * Loc is strict about the situation and never about the person: no streaks, no guilt, no
 * "are you sure you want to give up". The always-blocked list never wakes from here.
 *
 * Laid out in the Sleep sheet's floating card like Block now (user 2026-11-02): his line as a
 * small centred title, the count big in the middle, the hold, Never mind under it. Nothing under
 * the buttons: a pass that can't be used says why on the button itself, after a shake.
 */

/** `night`: the pass lifts the rest of a night or a Block now (`previewPass`), not a morning. */
type Stage = { kind: 'menu' } | { kind: 'done'; night: boolean; until: number };

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

/**
 * A schedule block a pass wakes, in plain words: "Your Work apps wake until 5 PM." Each block
 * after it sleeps as usual (user 2026-11-03).
 */
export function scheduleWords(schedules: HeldSchedule[]): string {
  return schedules
    .map((s) => `Your ${s.name.trim() || 'schedule'} apps wake until ${timeOf(s.until)}.`)
    .join(' ');
}

/** The day's last sentence: what a pass can still wake, a schedule under way named. */
function laterPass(schedules: HeldSchedule[]): string {
  if (schedules.length === 0) return 'A pass can still end a Block now session.';
  const names = schedules.map((s) => s.name.trim() || 'schedule').join(' and ');
  return `A pass can still wake your ${names} apps, or end a Block now session.`;
}

/** His line for a night or morning by the clock with nothing asleep (`unheldBody` says why). */
const AWAKE_LINE = "I'm awake. Technically.";

/** What the button turns into when a held pass can't be used: short, it's a button's label. */
const PASS_REFUSALS: Record<PassRefusal, string> = {
  notMorning: 'You’re already awake',
  noneLeft: 'No passes left',
  alreadyUsed: 'Already used today',
  nothingAsleep: 'You’re already awake',
};

/** The refused hold's shake: a few quick swings either way, settling. */
const SHAKE = [-10, 9, -7, 5, -3, 0];

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
  if (plan.schedules.length > 0) parts.push(scheduleWords(plan.schedules));
  parts.push('The always-blocked list stays asleep.');
  return parts.join(' ');
}

export function ExitsScreen() {
  const lock = useLock();
  const [storedStage, setStage] = useState<Stage>({ kind: 'menu' });
  // The route can remain mounted overnight; a completed exit describes only that window.
  const stage: Stage = storedStage.kind === 'done' && lock.nextChange.getTime() !== storedStage.until ? { kind: 'menu' } : storedStage;
  const phase = lock.phase;
  const [storedLeft, setLeft] = useState(() => getPassesLeft());
  const [storedPlan, setPlan] = useState(() => previewPass());
  const left = stage.kind === 'menu' ? getPassesLeft() : storedLeft;
  // Once used, `plan` keeps what the pass did; the menu always reflects the live lock.
  const plan = stage.kind === 'menu' ? previewPass() : storedPlan;
  const fill = holdFill(useMoon());
  // A held pass that couldn't be used: why, on the button (user 2026-11-02).
  const [refused, setRefused] = useState<PassRefusal | null>(null);
  const shake = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  const close = closeSleepSheet;

  const [endsNap, setEndsNap] = useState(false);
  // The schedule blocks a morning pass woke, for its words (a night one's are in `plan`).
  const [woke, setWoke] = useState<HeldSchedule[]>([]);
  const refuse = (why: PassRefusal) => {
    haptic.thud();
    shake.set(withSequence(...SHAKE.map((x) => withTiming(x, { duration: 55 }))));
    setRefused(why);
  };
  // A night or morning by the clock with nothing asleep to wake: no lock armed, already paused
  // tonight, an empty bedtime list, or after a lapse's last paid morning. No "Rough morning".
  const unheld = (phase === 'night' || phase === 'morning') && heldPhase(phase) !== phase ? phase : null;
  const heldMorning = phase === 'morning' && !unheld;
  // The hold reached the end: use the pass, or shake and say why it can't (nothing asleep, none left).
  const usePass = () => {
    if (left === 0) return refuse('noneLeft');
    if (!heldMorning && !plan) return refuse('nothingAsleep');
    const refusal = getPassRefusal();
    if (refusal) return refuse(refusal);
    // `plan` and the Block now line keep describing what just happened.
    setPlan(previewPass());
    setEndsNap(peekNap() !== null);
    const waking = heldSchedules();
    setWoke(waking);
    const result = redeemPass();
    if (result.refusal) return refuse(result.refusal);
    const use = result.night;
    track('pass_used', {
      passes_left: getPassesLeft(),
      phase: use ? use.phase : 'morning',
      paused_night: use?.pauseNight ?? false,
      ended_block_now: use?.endBlockNow ?? false,
      woke_schedules: waking.length,
    });
    haptic.done();
    setStage({ kind: 'done', night: use !== null, until: readLock().nextChange.getTime() });
    setLeft(getPassesLeft());
  };

  // What the day holds once the morning is woken, as the wake and scan screens say it: tonight
  // may be off, or nothing sleeps again after a lapse's last morning. A pass ends a Block now.
  const awake = stage.kind === 'menu' ? '' : awakeStatus({ ...lock, blockNowUntil: null });

  const words = (() => {
    if (stage.kind === 'done') {
      return stage.night
        ? { line: "I'll allow it. This once. Maybe.", body: `${plan ? describe(plan, awake) : ''} ${passesLabel(left)} left this month.` }
        : {
            line: 'Fine. *Fine.*',
            body: `${awake}${endsNap ? ' Your Block now session ended.' : ''}${woke.length > 0 ? ` ${scheduleWords(woke)}` : ''} ${passesLabel(left)} left this month.`,
          };
    }
    // The clock says night or morning, but nothing is asleep to wake: don't say bedtime wins.
    if (unheld) return { line: AWAKE_LINE, body: unheldBody(unheld, isStoodDown()) };
    if (phase === 'day') {
      // Before the day's first morning (00:33 ahead of a 01:00 bedtime, a night shift's 07:00,
      // an install's first day) nothing is done yet.
      const now = new Date();
      if (!morningDoneToday(now, toLockSettings(routineAt(now)), currentProof(now))) {
        return { ...opener('day', left), body: `${DAY_OPENER.notYet} ${laterPass(plan?.schedules ?? [])}` };
      }
    }
    if (phase === 'off') {
      // Only the bedtime apps are off: the always list and a Block now still sleep.
      const nap = peekNap();
      const alwaysSleeps = !isStoodDown() && (!isScreenTimeAvailable() || selectionSize('always') > 0);
      return { ...opener('off', left), body: offBody({ alwaysSleeps, napUntil: nap ? timeOf(nap.end) : null }) };
    }
    // Daytime: name a schedule under way, as it's what a pass would wake.
    if (phase === 'day') return { ...opener('day', left), body: `Your morning is done. ${laterPass(plan?.schedules ?? [])}` };
    return opener(phase, left);
  })();

  // Under the count: how many, or that there's nothing for one to wake.
  const passValue = left === 0 ? 'None left' : heldMorning || plan ? `${left} left` : 'Nothing asleep';
  // Under the count, only when they refill (user 2026-11-02): the You tab no longer explains passes.
  const passCaption = left === 0 || heldMorning || plan ? `Refills ${passRefillDate()}` : 'Nothing asleep for one to wake';

  return (
    <View style={styles.sheet}>
      <Animated.View key={`${stage.kind}-${words.line}`} entering={FadeIn.duration(300)} style={styles.head}>
        <Voice text={words.line} sheet />
        <Text style={styles.body}>{words.body}</Text>
      </Animated.View>

      {stage.kind === 'menu' ? (
        <>
          {/* The count where Block now has its length, with its line under it. */}
          <View style={styles.count} accessible accessibilityLabel={`Passes: ${passValue}`}>
            <Text style={styles.countValue} maxFontSizeMultiplier={1.2}>
              {left}
            </Text>
            <View style={styles.caption}>
              <SymbolView name={sym('ticket.fill', 'confirmation_number')} size={13} tintColor={Nocturne.text2} />
              <Text style={styles.captionText} numberOfLines={1}>
                {passCaption}
              </Text>
            </View>
          </View>
          {/* Held, like the Sleep sheet's button, in the worn moon's colours. Refused, it shakes and says why. */}
          <Animated.View style={shakeStyle}>
            <HoldButton
              label={refused ? PASS_REFUSALS[refused] : 'Use a pass'}
              symbol={refused ? undefined : 'ticket.fill'}
              duration={1200}
              disabled={refused !== null}
              color={Nocturne.cta}
              fillTopColor={fill.top}
              fillColor={fill.bottom}
              textColor={Nocturne.onCta}
              filledTextColor={Nocturne.text}
              onComplete={usePass}
              style={styles.hold}
            />
          </Animated.View>
          {/* Under the main button, like every secondary link (user 2026-10-15). */}
          <TextButton label="Never mind" onPress={close} />
        </>
      ) : null}

      {stage.kind === 'done' ? <PrimaryButton label="Done" onPress={close} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // Sized to its contents inside the card, padded like the Sleep sheet (nap-screen.tsx).
  sheet: { paddingHorizontal: SHEET_PADDING, paddingTop: Space.m, gap: Space.xl },
  head: { gap: Space.xs, alignItems: 'center' },
  body: { ...Type.secondary, color: Nocturne.text2, textAlign: 'center' },
  count: { alignItems: 'center', gap: Space.xs },
  countValue: { ...NUMBER_FONT, color: Nocturne.text, fontSize: 56, lineHeight: 62, textAlign: 'center', fontVariant: ['tabular-nums'] },
  caption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  captionText: { ...Type.caption, fontWeight: '500', color: Nocturne.text2 },
  hold: { height: 56 },
});
